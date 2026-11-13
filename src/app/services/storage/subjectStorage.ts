// Subjects, stored in the database (collection "subjects").
// Reads come from the copy loaded at sign-in; each change is sent to the server.

import { api, saveInBackground } from "../api";
import { cache } from "../dataStore";

export interface Subject {
  subjectId: string;
  subjectName: string;
  courseCode: string;
  semester: string;
  numberOfUnits: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function send(subject: Subject): void {
  const { createdAt, updatedAt, ...body } = subject;
  saveInBackground(api(`/subjects/${encodeURIComponent(subject.subjectId)}`, { method: "PUT", body }), "the subject");
}

export function getSubjects(): Subject[] {
  return cache.subjects;
}

export function getSubjectById(subjectId: string): Subject | undefined {
  return cache.subjects.find((s) => sameId(s.subjectId, subjectId) || sameId(s.courseCode ?? "", subjectId));
}

export function saveSubject(subject: Omit<Subject, "createdAt" | "updatedAt">): Subject {
  const now = new Date().toISOString();
  const saved: Subject = {
    ...subject,
    subjectId: subject.subjectId.trim() || subject.courseCode.trim(),
    updatedAt: now,
  };
  const existing = cache.subjects.find((s) => sameId(s.subjectId, saved.subjectId));
  saved.createdAt = existing?.createdAt ?? now;
  cache.subjects = existing
    ? cache.subjects.map((s) => (s === existing ? { ...existing, ...saved } : s))
    : [...cache.subjects, saved];
  send(saved);
  return saved;
}

export function updateSubject(subjectId: string, updates: Partial<Subject>): Subject | null {
  const existing = cache.subjects.find((s) => sameId(s.subjectId, subjectId));
  if (!existing) return null;
  const updated: Subject = { ...existing, ...updates, subjectId: existing.subjectId, updatedAt: new Date().toISOString() };
  cache.subjects = cache.subjects.map((s) => (s === existing ? updated : s));
  send(updated);
  return updated;
}

/** Deleting a subject also deletes its questions, on the server and here. */
export function deleteSubject(subjectId: string): boolean {
  const existing = cache.subjects.find((s) => sameId(s.subjectId, subjectId));
  if (!existing) return false;
  cache.subjects = cache.subjects.filter((s) => s !== existing);
  cache.questions = cache.questions.filter((q) => !sameId(q.subjectId, existing.subjectId));
  saveInBackground(api(`/subjects/${encodeURIComponent(existing.subjectId)}`, { method: "DELETE" }), "the deletion");
  return true;
}
