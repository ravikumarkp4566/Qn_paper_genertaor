// Generated papers, stored in the database (collection "papers").
// Reads come from the copy loaded at sign-in; each change is sent to the server.

import type { Question } from "./questionStorage";
import { api, saveInBackground } from "../api";
import { cache } from "../dataStore";

export interface PaperRequirement {
  id: string;
  questionNumber: number;
  subPartLabel?: string;
  unit?: number | "Any";
  marks?: number | "Any";
  bloomLevel?: string | "Any";
  co?: string | "Any";
  po?: string | "Any";
  pso?: string | "Any";
  selectedQuestionId?: string | null;
  selectedQuestion?: Question | null;
}

export interface PaperPart {
  text: string;
  /** Set when the part came from the question bank, so its LaTeX and images can follow it. */
  questionId?: string;
  format?: "text" | "latex";
  images?: string[];
  marks: number;
  options?: string[];
  correctOption?: number;
  bloomsLevel: string;
  co: string;
  po: string;
  pso: string;
}

export interface PaperUnitQuestion {
  number: number;
  parts: PaperPart[];
  hasOr?: boolean;
  orQuestion?: {
    number: number;
    parts: PaperPart[];
  };
}

export interface PaperUnit {
  unitNumber: number;
  name: string;
  questions: PaperUnitQuestion[];
}

export interface PaperRecord {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  courseCode: string;
  semester: string;
  examType: "SEE" | "TEST" | "QUIZ" | "CUSTOM" | string;
  assessmentKind?: "SEE" | "TEST" | "QUIZ";
  assessmentVariant?: string;
  hasChoice?: boolean;
  questionType?: "descriptive" | "mcq";
  totalMarks: number;
  duration: number;
  date: string;
  universityName?: string;
  affiliationSubtext?: string;
  usnPrefix?: string;
  departmentName?: string;
  degreeName?: string;
  maxMarksPerUnit?: number;
  mobilePhonesProhibited?: boolean;
  instructions?: string[];
  requirements: PaperRequirement[];
  units: PaperUnit[];
  createdAt: string;
  updatedAt?: string;
}

const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function getPapers(): PaperRecord[] {
  return cache.papers;
}

export function getPaperById(id: string): PaperRecord | undefined {
  return cache.papers.find((p) => sameId(p.id, id));
}

export function savePaper(paper: Omit<PaperRecord, "id" | "createdAt"> & { id?: string }): PaperRecord {
  const id = paper.id?.trim() || `PAP-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();
  const existing = getPaperById(id);
  const saved: PaperRecord = { ...existing, ...paper, id, createdAt: existing?.createdAt ?? now, updatedAt: now };
  cache.papers = existing ? cache.papers.map((p) => (p === existing ? saved : p)) : [saved, ...cache.papers];

  const { id: _id, createdAt, updatedAt, ...body } = saved;
  saveInBackground(api(`/papers/${encodeURIComponent(id)}`, { method: "PUT", body }), "the paper");
  return saved;
}

export function deletePaper(id: string): boolean {
  const existing = getPaperById(id);
  if (!existing) return false;
  cache.papers = cache.papers.filter((p) => p !== existing);
  saveInBackground(api(`/papers/${encodeURIComponent(existing.id)}`, { method: "DELETE" }), "the deletion");
  return true;
}
