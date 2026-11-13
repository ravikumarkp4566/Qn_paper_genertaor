import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Readable } from "node:stream";
import { collegeOf, publicUser, requireAuth, requireRole, signToken } from "./auth.js";
import { fileBucket } from "./db.js";
import { AssessmentPolicy, College, LatexPaper, Paper, Question, Setting, Subject, User } from "./models.js";

export const api = express.Router();

/** Express 5 forwards rejected promises to the error handler, so handlers can be async. */
const notFound = (res, what) => res.status(404).json({ error: `${what} not found` });

/** Removes fields a client must never set directly. */
function clean(body) {
  const { _id, college, createdBy, createdAt, updatedAt, __v, ...rest } = body ?? {};
  return rest;
}

const withId = (doc, key) => {
  if (!doc) return doc;
  const { _id, __v, college, createdBy, ...rest } = doc.toObject ? doc.toObject() : doc;
  return { ...rest, id: rest[key] };
};

// ---------------------------------------------------------------------------
// Health and auth
// ---------------------------------------------------------------------------

api.get("/health", (req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

api.post("/auth/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const user = await User.findOne({ email, active: true }).select("+passwordHash").populate("college", "name");
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: "The email or password is incorrect. Please try again." });
  res.json({ token: signToken(user), user: publicUser(user) });
});

/** College logos are public (they print on every paper), so <img> tags can load them directly. */
api.get("/colleges/:id/logo", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, "Logo");
  const college = await College.findById(req.params.id);
  const fileId = college?.header?.logoFileId;
  const [file] = fileId ? await fileBucket().find({ _id: fileId }).toArray() : [];
  if (!file) return notFound(res, "Logo");
  res.type(file.metadata?.contentType ?? "application/octet-stream");
  res.set("Cache-Control", "public, max-age=3600");
  fileBucket().openDownloadStream(fileId).pipe(res);
});

api.use(requireAuth);

api.get("/auth/me", (req, res) => res.json({ user: publicUser(req.user) }));

// ---------------------------------------------------------------------------
// College header (what prints at the top of papers)
// ---------------------------------------------------------------------------

api.get("/college", async (req, res) => {
  const college = await College.findById(collegeOf(req));
  if (!college) return notFound(res, "College");
  res.json({ id: String(college._id), name: college.name, header: { ...college.header?.toObject?.(), hasLogo: Boolean(college.header?.logoFileId) } });
});

api.get("/college/logo", async (req, res) => {
  const college = await College.findById(collegeOf(req));
  const fileId = college?.header?.logoFileId;
  if (!fileId) return notFound(res, "Logo");
  const [file] = await fileBucket().find({ _id: fileId }).toArray();
  if (!file) return notFound(res, "Logo");
  res.type(file.metadata?.contentType ?? "application/octet-stream");
  fileBucket().openDownloadStream(fileId).pipe(res);
});

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

api.get("/subjects", async (req, res) => {
  const subjects = await Subject.find({ college: collegeOf(req) }).sort({ subjectName: 1 });
  res.json(subjects.map((s) => withId(s, "subjectId")));
});

api.put("/subjects/:subjectId", async (req, res) => {
  const college = collegeOf(req);
  const subject = await Subject.findOneAndUpdate(
    { college, subjectId: req.params.subjectId },
    { $set: { ...clean(req.body), subjectId: req.params.subjectId, college } },
    { upsert: true, new: true, runValidators: true }
  );
  res.json(withId(subject, "subjectId"));
});

api.delete("/subjects/:subjectId", async (req, res) => {
  const college = collegeOf(req);
  const result = await Subject.deleteOne({ college, subjectId: req.params.subjectId });
  if (!result.deletedCount) return notFound(res, "Subject");
  await Question.deleteMany({ college, subjectId: req.params.subjectId });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Files (GridFS): question images and LaTeX paper images
// ---------------------------------------------------------------------------

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const imageKey = (college, paperId, name) => `latex/${college}/${paperId}/${name}`;
const questionImageKey = (college, questionId, name) => `questions/${college}/${questionId}/${name}`;
const rawImage = express.raw({ type: "image/*", limit: MAX_IMAGE_BYTES });

async function deleteFiles(filter) {
  const bucket = fileBucket();
  for (const file of await bucket.find(filter).toArray()) await bucket.delete(file._id);
}

async function latestFile(filename) {
  const [file] = await fileBucket().find({ filename }).sort({ uploadDate: -1 }).limit(1).toArray();
  return file ?? null;
}

/** Replaces the file stored under `filename` with `source` (a Buffer or readable stream). */
async function storeFile(filename, metadata, source) {
  await deleteFiles({ filename });
  const upload = fileBucket().openUploadStream(filename, { metadata });
  const input = Buffer.isBuffer(source) ? Readable.from(source) : source;
  await new Promise((resolve, reject) => input.pipe(upload).on("finish", resolve).on("error", reject));
}

function sendFile(res, file) {
  res.type(file.metadata?.contentType ?? "application/octet-stream");
  res.set("Cache-Control", "private, max-age=300");
  fileBucket().openDownloadStream(file._id).pipe(res);
}

/** Image names become file names; keep them simple and safe. */
const validImageName = (name) => /^[\w.-]{1,120}$/.test(name);

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

api.get("/questions", async (req, res) => {
  const filter = { college: collegeOf(req) };
  if (req.query.subjectId) filter.subjectId = req.query.subjectId;
  const questions = await Question.find(filter).sort({ unit: 1, questionId: 1 });
  res.json(questions.map((q) => withId(q, "questionId")));
});

api.put("/questions/:questionId", async (req, res) => {
  const college = collegeOf(req);
  const question = await Question.findOneAndUpdate(
    { college, questionId: req.params.questionId },
    { $set: { ...clean(req.body), questionId: req.params.questionId, college } },
    { upsert: true, new: true, runValidators: true }
  );
  res.json(withId(question, "questionId"));
});

/** Bulk import (the Excel template): body is an array of questions with an `id` each. */
api.post("/questions/import", async (req, res) => {
  const college = collegeOf(req);
  const rows = Array.isArray(req.body) ? req.body : [];
  if (!rows.length) return res.status(400).json({ error: "Send an array of questions" });
  const result = await Question.bulkWrite(
    rows.map(({ id, ...row }) => ({
      updateOne: {
        filter: { college, questionId: String(id) },
        update: { $set: { ...clean(row), questionId: String(id), college } },
        upsert: true,
      },
    }))
  );
  res.json({ inserted: result.upsertedCount, updated: result.modifiedCount });
});

api.delete("/questions/:questionId", async (req, res) => {
  const college = collegeOf(req);
  const result = await Question.deleteOne({ college, questionId: req.params.questionId });
  if (!result.deletedCount) return notFound(res, "Question");
  await deleteFiles({ "metadata.kind": "question-image", "metadata.college": String(college), "metadata.questionId": req.params.questionId });
  res.status(204).end();
});

// Images belong to a question and travel with it into papers. They can be
// uploaded before the question is first saved (the form knows its id).
api.get("/questions/:questionId/images/:name", async (req, res) => {
  const file = await latestFile(questionImageKey(collegeOf(req), req.params.questionId, req.params.name));
  if (!file) return notFound(res, "Image");
  sendFile(res, file);
});

api.put("/questions/:questionId/images/:name", rawImage, async (req, res) => {
  const { questionId, name } = req.params;
  if (!validImageName(name)) return res.status(400).json({ error: "Use letters, digits, dots, dashes or underscores in image names" });
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "Send the image bytes with an image/* content type" });
  const college = String(collegeOf(req));
  await storeFile(questionImageKey(college, questionId, name), { kind: "question-image", college, questionId, name, contentType: req.get("content-type") }, req.body);
  await Question.updateOne({ college, questionId }, { $addToSet: { images: name } });
  res.status(201).json({ name, size: req.body.length });
});

api.delete("/questions/:questionId/images/:name", async (req, res) => {
  const college = collegeOf(req);
  await deleteFiles({ filename: questionImageKey(college, req.params.questionId, req.params.name) });
  await Question.updateOne({ college, questionId: req.params.questionId }, { $pull: { images: req.params.name } });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Generated papers
// ---------------------------------------------------------------------------

api.get("/papers", async (req, res) => {
  const papers = await Paper.find({ college: collegeOf(req) }).sort({ updatedAt: -1 });
  res.json(papers.map((p) => withId(p, "paperId")));
});

api.get("/papers/:paperId", async (req, res) => {
  const paper = await Paper.findOne({ college: collegeOf(req), paperId: req.params.paperId });
  if (!paper) return notFound(res, "Paper");
  res.json(withId(paper, "paperId"));
});

api.put("/papers/:paperId", async (req, res) => {
  const college = collegeOf(req);
  const paper = await Paper.findOneAndUpdate(
    { college, paperId: req.params.paperId },
    { $set: { ...clean(req.body), paperId: req.params.paperId, college }, $setOnInsert: { createdBy: req.user._id } },
    { upsert: true, new: true }
  );
  res.json(withId(paper, "paperId"));
});

api.delete("/papers/:paperId", async (req, res) => {
  const result = await Paper.deleteOne({ college: collegeOf(req), paperId: req.params.paperId });
  if (!result.deletedCount) return notFound(res, "Paper");
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// LaTeX papers and their images
// ---------------------------------------------------------------------------

api.get("/latex-papers", async (req, res) => {
  const papers = await LatexPaper.find({ college: collegeOf(req) }).sort({ updatedAt: -1 });
  res.json(papers.map((p) => withId(p, "paperId")));
});

api.get("/latex-papers/:paperId", async (req, res) => {
  const paper = await LatexPaper.findOne({ college: collegeOf(req), paperId: req.params.paperId });
  if (!paper) return notFound(res, "LaTeX paper");
  res.json(withId(paper, "paperId"));
});

api.put("/latex-papers/:paperId", async (req, res) => {
  const college = collegeOf(req);
  if (typeof req.body?.source !== "string") return res.status(400).json({ error: "source is required" });
  const paper = await LatexPaper.findOneAndUpdate(
    { college, paperId: req.params.paperId },
    { $set: { ...clean(req.body), paperId: req.params.paperId, college }, $setOnInsert: { createdBy: req.user._id } },
    { upsert: true, new: true, runValidators: true }
  );
  res.json(withId(paper, "paperId"));
});

api.delete("/latex-papers/:paperId", async (req, res) => {
  const college = collegeOf(req);
  const result = await LatexPaper.deleteOne({ college, paperId: req.params.paperId });
  if (!result.deletedCount) return notFound(res, "LaTeX paper");
  await deleteFiles({ "metadata.kind": "latex-image", "metadata.college": String(college), "metadata.paperId": req.params.paperId });
  res.status(204).end();
});

api.get("/latex-papers/:paperId/images", async (req, res) => {
  const files = await fileBucket()
    .find({ "metadata.kind": "latex-image", "metadata.college": String(collegeOf(req)), "metadata.paperId": req.params.paperId })
    .toArray();
  res.json(files.map((file) => ({ name: file.metadata.name, size: file.length, contentType: file.metadata.contentType })));
});

api.get("/latex-papers/:paperId/images/:name", async (req, res) => {
  const filename = imageKey(collegeOf(req), req.params.paperId, req.params.name);
  const [file] = await fileBucket().find({ filename }).sort({ uploadDate: -1 }).limit(1).toArray();
  if (!file) return notFound(res, "Image");
  res.type(file.metadata?.contentType ?? "application/octet-stream");
  fileBucket().openDownloadStream(file._id).pipe(res);
});

/**
 * Copies a question's image into a paper, on the server. Generate Paper uses
 * this so a paper keeps its images even if the question is later changed.
 */
api.post("/latex-papers/:paperId/images/from-question", async (req, res) => {
  const college = String(collegeOf(req));
  const { questionId, name, as } = req.body ?? {};
  if (!questionId || !name || !validImageName(String(as ?? ""))) return res.status(400).json({ error: "questionId, name and a valid target name (as) are required" });
  const file = await latestFile(questionImageKey(college, questionId, name));
  if (!file) return notFound(res, "Question image");
  await storeFile(
    imageKey(college, req.params.paperId, as),
    { kind: "latex-image", college, paperId: req.params.paperId, name: as, contentType: file.metadata?.contentType },
    fileBucket().openDownloadStream(file._id)
  );
  res.status(201).json({ name: as });
});

api.put(
  "/latex-papers/:paperId/images/:name",
  express.raw({ type: "image/*", limit: MAX_IMAGE_BYTES }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "Send the image bytes with an image/* content type" });
    const college = String(collegeOf(req));
    const { paperId, name } = req.params;
    const filename = imageKey(college, paperId, name);
    await deleteFiles({ filename });
    const upload = fileBucket().openUploadStream(filename, {
      metadata: { kind: "latex-image", college, paperId, name, contentType: req.get("content-type") },
    });
    await new Promise((resolve, reject) => Readable.from(req.body).pipe(upload).on("finish", resolve).on("error", reject));
    res.status(201).json({ name, size: req.body.length });
  }
);

api.delete("/latex-papers/:paperId/images/:name", async (req, res) => {
  await deleteFiles({ filename: imageKey(collegeOf(req), req.params.paperId, req.params.name) });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** The college's own rules where it has them, else the platform defaults. */
api.get("/assessment-policies", async (req, res) => {
  const college = collegeOf(req);
  const [defaults, own] = await Promise.all([
    AssessmentPolicy.find({ college: null }),
    college ? AssessmentPolicy.find({ college }) : [],
  ]);
  const byKind = new Map(defaults.map((p) => [p.kind, p]));
  for (const policy of own) byKind.set(policy.kind, policy);
  res.json([...byKind.values()].map((p) => withId(p, "kind")));
});

api.put("/assessment-policies/:kind", async (req, res) => {
  const college = req.user.role === "platform_admin" && !req.query.college ? null : collegeOf(req);
  const policy = await AssessmentPolicy.findOneAndUpdate(
    { college, kind: req.params.kind },
    { $set: { ...clean(req.body), kind: req.params.kind, college } },
    { upsert: true, new: true, runValidators: true }
  );
  res.json(withId(policy, "kind"));
});

api.get("/options", async (req, res) => {
  const setting = await Setting.findOne({ key: "academicOptions" });
  res.json(setting?.value ?? {});
});

// ---------------------------------------------------------------------------
// Platform admin
// ---------------------------------------------------------------------------

api.get("/admin/overview", requireRole("platform_admin"), async (req, res) => {
  const colleges = await College.find().sort({ name: 1 });
  const [users, papers, latexPapers] = await Promise.all([
    User.aggregate([{ $group: { _id: "$college", count: { $sum: 1 } } }]),
    Paper.aggregate([{ $group: { _id: "$college", count: { $sum: 1 } } }]),
    LatexPaper.aggregate([{ $group: { _id: "$college", count: { $sum: 1 } } }]),
  ]);
  const countFor = (rows, id) => rows.find((row) => String(row._id) === String(id))?.count ?? 0;
  res.json({
    totals: {
      colleges: colleges.length,
      users: users.reduce((sum, row) => sum + row.count, 0),
      papers: papers.reduce((sum, row) => sum + row.count, 0) + latexPapers.reduce((sum, row) => sum + row.count, 0),
    },
    tenants: colleges.map((college) => ({
      id: String(college._id),
      name: college.name,
      plan: college.plan,
      status: college.status,
      users: countFor(users, college._id),
      papers: countFor(papers, college._id) + countFor(latexPapers, college._id),
    })),
  });
});
