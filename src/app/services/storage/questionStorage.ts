// The question bank, stored in the database (collection "questions").
// Reads come from the copy loaded at sign-in; each change is sent to the server.

import { api, saveInBackground } from "../api";
import { cache } from "../dataStore";

export interface Question {
  id: string;
  subjectId: string;
  /** May contain LaTeX when format is "latex". */
  text: string;
  format?: "text" | "latex";
  unit: number;
  marks: number;
  bloomLevel: string;
  co: string;
  po: string;
  pso: string;
  options?: string[];
  correctOption?: number;
  difficulty?: "Easy" | "Medium" | "Hard" | string;
  createdAt?: string;
  updatedAt?: string;
}

type NewQuestion = Omit<Question, "id" | "createdAt" | "updatedAt"> & { id?: string };

const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function newQuestionId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;
}

/** Without a subject, a question goes to the college's first subject. */
function subjectFor(question: NewQuestion): string {
  return question.subjectId?.trim() || cache.subjects[0]?.subjectId || "";
}

function send(question: Question): void {
  const { id, createdAt, updatedAt, ...body } = question;
  saveInBackground(api(`/questions/${encodeURIComponent(id)}`, { method: "PUT", body }), "the question");
}

export function getQuestions(subjectId?: string): Question[] {
  if (!subjectId) return cache.questions;
  return cache.questions.filter((q) => sameId(q.subjectId, subjectId));
}

export function getQuestionById(id: string): Question | undefined {
  return cache.questions.find((q) => sameId(q.id, id));
}

export function addQuestion(q: NewQuestion): Question {
  const now = new Date().toISOString();
  const question: Question = {
    ...q,
    id: q.id?.trim() || newQuestionId("Q"),
    subjectId: subjectFor(q),
    unit: Number(q.unit),
    marks: Number(q.marks),
    createdAt: now,
    updatedAt: now,
  };
  cache.questions = [...cache.questions, question];
  send(question);
  return question;
}

export function updateQuestion(id: string, updates: Partial<Question>): Question | null {
  const index = cache.questions.findIndex((q) => sameId(q.id, id));
  if (index === -1) return null;
  const current = cache.questions[index];
  const question: Question = {
    ...current,
    ...updates,
    id: current.id,
    unit: updates.unit !== undefined ? Number(updates.unit) : current.unit,
    marks: updates.marks !== undefined ? Number(updates.marks) : current.marks,
    updatedAt: new Date().toISOString(),
  };
  cache.questions = cache.questions.map((q, i) => (i === index ? question : q));
  send(question);
  return question;
}

export function deleteQuestion(id: string): boolean {
  const question = getQuestionById(id);
  if (!question) return false;
  cache.questions = cache.questions.filter((q) => q !== question);
  saveInBackground(api(`/questions/${encodeURIComponent(question.id)}`, { method: "DELETE" }), "the deletion");
  return true;
}

export function importQuestions(newQuestions: NewQuestion[]): { addedCount: number } {
  const now = new Date().toISOString();
  const added: Question[] = newQuestions.map((q) => ({
    ...q,
    id: q.id?.trim() || newQuestionId("IMP"),
    subjectId: subjectFor(q),
    unit: Number(q.unit),
    marks: Number(q.marks),
    createdAt: now,
    updatedAt: now,
  }));
  const addedIds = new Set(added.map((q) => q.id.toLowerCase()));
  cache.questions = [...cache.questions.filter((q) => !addedIds.has(q.id.toLowerCase())), ...added];
  const body = added.map(({ createdAt, updatedAt, ...rest }) => rest);
  saveInBackground(api("/questions/import", { method: "POST", body }), "the imported questions");
  return { addedCount: added.length };
}
