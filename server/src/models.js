// MongoDB collections. Text fields hold LaTeX as-is: it is plain UTF-8 text to
// the database, and the web app renders it.

import mongoose from "mongoose";

const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const timestamps = { timestamps: true };

/** What a college prints at the top of its papers. */
const headerSchema = new Schema(
  {
    institute: String,
    affiliation: String,
    usnLabel: { type: String, default: "USN" },
    usnPrefix: String,
    usnBoxes: { type: Number, default: 10 },
    /** GridFS file id of the logo, if one is uploaded. */
    logoFileId: ObjectId,
  },
  { _id: false }
);

export const College = model(
  "College",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
      plan: { type: String, default: "Starter" },
      status: { type: String, enum: ["Healthy", "Review"], default: "Healthy" },
      header: { type: headerSchema, default: () => ({}) },
    },
    timestamps
  )
);

export const User = model(
  "User",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true, select: false },
      role: { type: String, enum: ["faculty", "platform_admin"], default: "faculty" },
      college: { type: ObjectId, ref: "College" },
      active: { type: Boolean, default: true },
    },
    timestamps
  )
);

export const Subject = model(
  "Subject",
  new Schema(
    {
      college: { type: ObjectId, ref: "College", required: true, index: true },
      /** The app's own id for the subject, e.g. "DS-S3IS01". Unique within a college. */
      subjectId: { type: String, required: true, trim: true },
      subjectName: { type: String, required: true, trim: true },
      courseCode: { type: String, trim: true },
      semester: String,
      numberOfUnits: { type: Number, default: 5 },
      description: String,
    },
    timestamps
  ).index({ college: 1, subjectId: 1 }, { unique: true })
);

export const Question = model(
  "Question",
  new Schema(
    {
      college: { type: ObjectId, ref: "College", required: true },
      /** The app's own id, e.g. "DS-2024-001". Unique within a college. */
      questionId: { type: String, required: true, trim: true },
      subjectId: { type: String, required: true, index: true },
      /** Question text. May contain LaTeX ($x^2$, \frac{a}{b}) when format is "latex". */
      text: { type: String, required: true },
      format: { type: String, enum: ["text", "latex"], default: "text" },
      unit: Number,
      marks: Number,
      bloomLevel: String,
      co: String,
      po: String,
      pso: String,
      options: [String],
      correctOption: Number,
      difficulty: String,
    },
    timestamps
  ).index({ college: 1, questionId: 1 }, { unique: true })
);

/** Papers built in Generate Paper. Units and requirements keep the app's own nested shape. */
export const Paper = model(
  "Paper",
  new Schema(
    {
      college: { type: ObjectId, ref: "College", required: true, index: true },
      createdBy: { type: ObjectId, ref: "User" },
      paperId: { type: String, required: true },
      title: String,
      subjectId: String,
      subjectName: String,
      courseCode: String,
      semester: String,
      examType: String,
      assessmentKind: String,
      assessmentVariant: String,
      hasChoice: Boolean,
      questionType: String,
      totalMarks: Number,
      duration: Number,
      date: String,
      universityName: String,
      affiliationSubtext: String,
      usnPrefix: String,
      departmentName: String,
      degreeName: String,
      maxMarksPerUnit: Number,
      mobilePhonesProhibited: Boolean,
      instructions: [String],
      requirements: { type: Schema.Types.Mixed, default: [] },
      units: { type: Schema.Types.Mixed, default: [] },
    },
    timestamps
  ).index({ college: 1, paperId: 1 }, { unique: true })
);

/**
 * Papers written in the LaTeX editor. `source` is the whole paper; the other
 * fields are copied out of its header commands so lists can show them.
 */
export const LatexPaper = model(
  "LatexPaper",
  new Schema(
    {
      college: { type: ObjectId, ref: "College", required: true, index: true },
      createdBy: { type: ObjectId, ref: "User" },
      paperId: { type: String, required: true },
      source: { type: String, required: true },
      title: String,
      subjectName: String,
      courseCode: String,
      semester: String,
      totalMarks: Number,
      duration: Number,
      date: String,
      showHeader: { type: Boolean, default: true },
      instructions: [String],
    },
    timestamps
  ).index({ college: 1, paperId: 1 }, { unique: true })
);

/** SEE / Test / Quiz rules. `college: null` is the platform default. */
export const AssessmentPolicy = model(
  "AssessmentPolicy",
  new Schema(
    {
      college: { type: ObjectId, ref: "College", default: null },
      kind: { type: String, enum: ["SEE", "TEST", "QUIZ"], required: true },
      label: String,
      totalMarks: Number,
      duration: Number,
      hasChoice: Boolean,
      questionCount: Number,
      questionType: { type: String, enum: ["descriptive", "mcq"] },
      allowedQuestionMarks: [Number],
    },
    timestamps
  ).index({ college: 1, kind: 1 }, { unique: true })
);

/** Small named settings, e.g. "academicOptions" (Bloom levels, COs, POs...). */
export const Setting = model(
  "Setting",
  new Schema({ key: { type: String, required: true, unique: true }, value: Schema.Types.Mixed }, timestamps)
);
