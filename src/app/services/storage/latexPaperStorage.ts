// Papers written in the LaTeX editor, stored in the database (collection
// "latexpapers"); their images are stored by the server in GridFS.

import { parseLatex, type PaperMeta } from "../../latex/parser";
import { instituteCommands } from "../../latex/sampleSource";
import { api, apiBlob } from "../api";
import { cache } from "../dataStore";

export interface LatexPaperRecord {
  id: string;
  /** Exam title line, e.g. "Even Semester B.E. Examinations, June 2026". */
  title: string;
  subjectName: string;
  courseCode: string;
  semester: string;
  totalMarks: number;
  /** Minutes. */
  duration: number;
  date: string;
  showHeader: boolean;
  instructions: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredImage {
  name: string;
  blob: Blob;
}

const paperPath = (id: string) => `/latex-papers/${encodeURIComponent(id)}`;
const imagePath = (paperId: string, name: string) => `${paperPath(paperId)}/images/${encodeURIComponent(name)}`;

export function newLatexPaperId(): string {
  return `LTX-${Date.now().toString(36).toUpperCase()}`;
}

export function getLatexPapers(): LatexPaperRecord[] {
  return cache.latexPapers;
}

export function getLatexPaperById(id: string): LatexPaperRecord | undefined {
  return cache.latexPapers.find((paper) => paper.id === id);
}

/** Creates or replaces a paper. Resolves once the server has it; rejects if it could not save. */
export async function saveLatexPaper(paper: Omit<LatexPaperRecord, "createdAt" | "updatedAt">): Promise<LatexPaperRecord> {
  const { id, ...body } = paper;
  const saved = await api<LatexPaperRecord>(paperPath(id), { method: "PUT", body });
  const others = cache.latexPapers.filter((existing) => existing.id !== id);
  cache.latexPapers = [saved, ...others];
  return saved;
}

export function hasHeaderCommands(meta: PaperMeta): boolean {
  return Boolean(
    meta.institute || meta.affiliation || meta.logo || meta.examTitle || meta.subject || meta.courseCode ||
      meta.semester || meta.maxMarks || meta.duration || meta.examDate || meta.notes.length
  );
}

/**
 * Papers saved before the header moved into the LaTeX kept its details in
 * separate fields. Write those out as commands so nothing is lost on reopening.
 */
export function sourceWithHeaderCommands(record: LatexPaperRecord): string {
  if (hasHeaderCommands(parseLatex(record.source).meta)) return record.source;
  const escape = (text: string) => text.replace(/([%&#_$])/g, "\\$1");
  const lines = [
    record.title && `\\examtitle{${escape(record.title)}}`,
    record.subjectName && `\\subject{${escape(record.subjectName)}}`,
    record.courseCode && `\\coursecode{${escape(record.courseCode)}}`,
    record.semester && `\\semester{${escape(record.semester)}}`,
    record.date && `\\examdate{${escape(record.date)}}`,
    record.duration ? `\\duration{${record.duration}}` : "",
    record.totalMarks ? `\\maxmarks{${record.totalMarks}}` : "",
    ...(record.instructions ?? []).map((line) => `\\note{${escape(line)}}`),
    record.showHeader ? "" : "\\noheader",
  ].filter(Boolean);
  return `${instituteCommands()}${lines.join("\n")}\n\n${record.source}`;
}

/** Deletes the paper and its images. */
export async function deleteLatexPaper(id: string): Promise<void> {
  await api(paperPath(id), { method: "DELETE" });
  cache.latexPapers = cache.latexPapers.filter((paper) => paper.id !== id);
}

// ---------------------------------------------------------------------------
// Images. They are stored per paper id, even before the paper is first saved.
// ---------------------------------------------------------------------------

export async function putImage(paperId: string, name: string, blob: Blob): Promise<void> {
  await api(imagePath(paperId, name), { method: "PUT", file: blob });
}

export async function deleteImage(paperId: string, name: string): Promise<void> {
  await api(imagePath(paperId, name), { method: "DELETE" });
}

export async function listImages(paperId: string): Promise<StoredImage[]> {
  const files = await api<{ name: string }[]>(`${paperPath(paperId)}/images`);
  return Promise.all(files.map(async (file) => ({ name: file.name, blob: await apiBlob(imagePath(paperId, file.name)) })));
}

/** Removes the images of a paper that was never saved. */
export async function deleteImagesForPaper(paperId: string): Promise<void> {
  const files = await api<{ name: string }[]>(`${paperPath(paperId)}/images`);
  await Promise.all(files.map((file) => deleteImage(paperId, file.name)));
}
