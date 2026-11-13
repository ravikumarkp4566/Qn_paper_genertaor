// Moves the data that used to be hardcoded in the web app into MongoDB.
//   npm run seed         adds anything missing and updates what is there (safe to repeat)
//   npm run seed:reset   empties these collections first, then seeds
//
// The JSON files in seed/data were extracted once from the web app's source.

import "dotenv/config";
import { readFileSync } from "node:fs";
import { Readable } from "node:stream";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDb, fileBucket } from "../src/db.js";
import { AssessmentPolicy, College, LatexPaper, Paper, Question, Setting, Subject, User } from "../src/models.js";

const read = (name) => JSON.parse(readFileSync(new URL(`./data/${name}.json`, import.meta.url), "utf8"));

const SIT = {
  name: "Siddaganga Institute of Technology",
  slug: "sit",
  plan: "Enterprise",
  status: "Healthy",
  header: {
    institute: "Siddaganga Institute of Technology, Tumakuru-572 103",
    affiliation: "(An Autonomous Institution affiliated to VTU, Belagavi, Approved by AICTE, New Delhi)",
    usnLabel: "USN",
    usnPrefix: "1SI",
    usnBoxes: 10,
  },
};

// The demo accounts shown on the login page. Passwords are stored only as hashes.
const DEMO_USERS = [
  { name: "Dr. Ananya Rao", email: "faculty@qpgen.io", password: "Faculty@123", role: "faculty", college: "sit" },
  { name: "Platform Administrator", email: "admin@qpgen.io", password: "Admin@123", role: "platform_admin", college: null },
];

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function upsert(Model, filter, values) {
  return Model.findOneAndUpdate(filter, { $set: values }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function uploadLogo(college) {
  if (college.header?.logoFileId) return;
  const bytes = readFileSync(new URL("../../public/sit-logo.jpg", import.meta.url));
  const upload = fileBucket().openUploadStream(`colleges/${college.slug}/logo.jpg`, {
    metadata: { kind: "logo", college: college._id, contentType: "image/jpeg" },
  });
  await new Promise((resolve, reject) => Readable.from(bytes).pipe(upload).on("finish", resolve).on("error", reject));
  college.header.logoFileId = upload.id;
  await college.save();
}

async function main() {
  await connectDb();
  const db = mongoose.connection.db;
  console.log(`Connected to database "${db.databaseName}"`);

  if (process.argv.includes("--reset")) {
    for (const Model of [College, User, Subject, Question, Paper, LatexPaper, AssessmentPolicy, Setting]) {
      await Model.deleteMany({});
    }
    await fileBucket().drop().catch(() => undefined);
    console.log("Emptied the collections");
  }

  // Colleges: SIT, whose papers the app was built around, plus the sample tenants from the admin page.
  const sit = await upsert(College, { slug: SIT.slug }, SIT);
  await uploadLogo(sit);
  for (const tenant of read("tenants")) {
    await upsert(College, { slug: slugify(tenant.name) }, { name: tenant.name, slug: slugify(tenant.name), plan: tenant.plan, status: tenant.status });
  }
  const collegeBySlug = { sit };

  for (const user of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await upsert(User, { email: user.email }, {
      name: user.name,
      email: user.email,
      passwordHash,
      role: user.role,
      college: user.college ? collegeBySlug[user.college]._id : null,
    });
  }

  for (const subject of read("subjects")) {
    await upsert(Subject, { college: sit._id, subjectId: subject.subjectId }, { ...subject, college: sit._id });
  }

  const questions = read("questions");
  await Question.bulkWrite(
    questions.map(({ id, ...question }) => ({
      updateOne: {
        filter: { college: sit._id, questionId: id },
        update: { $set: { ...question, questionId: id, college: sit._id, format: "text" } },
        upsert: true,
      },
    }))
  );

  for (const { id, createdAt, updatedAt, ...paper } of read("papers")) {
    await upsert(Paper, { college: sit._id, paperId: id }, { ...paper, paperId: id, college: sit._id });
  }

  for (const policy of read("assessmentPolicies")) {
    await upsert(AssessmentPolicy, { college: null, kind: policy.kind }, { ...policy, college: null });
  }

  await upsert(Setting, { key: "academicOptions" }, { key: "academicOptions", value: read("academicOptions") });

  const counts = {
    colleges: await College.countDocuments(),
    users: await User.countDocuments(),
    subjects: await Subject.countDocuments(),
    questions: await Question.countDocuments(),
    papers: await Paper.countDocuments(),
    assessmentPolicies: await AssessmentPolicy.countDocuments(),
    settings: await Setting.countDocuments(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
