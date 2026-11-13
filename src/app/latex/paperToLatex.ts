// Turns a paper built in Generate Paper into LaTeX for the LaTeX editor:
// header commands, units, numbered questions with (a)/(b) parts, OR choices,
// and each part's marks/BL/CO/PO/PSO columns. Questions keep their own LaTeX;
// plain-text questions are escaped. Their images are listed so the caller can
// copy them into the paper under names that cannot clash.

import { instituteCommands } from "./sampleSource";
import { plainTextToLatex } from "./text";

export interface GeneratedPart {
  text: string;
  format?: "text" | "latex";
  questionId?: string;
  images?: string[];
  options?: string[];
  marks: number;
  bloomsLevel: string;
  co: string;
  po: string;
  pso: string;
}

export interface GeneratedQuestion {
  number: number;
  parts: GeneratedPart[];
  orQuestion?: { number: number; parts: GeneratedPart[] };
}

export interface GeneratedPaper {
  examTitle: string;
  subjectName: string;
  courseCode: string;
  semester: string;
  examDate: string;
  /** Minutes. */
  duration: number;
  totalMarks: number;
  instructions: string[];
  units: { unitNumber: number; questions: GeneratedQuestion[] }[];
}

/** An image to copy from a question into the paper, renamed to `as`. */
export interface ImageCopy {
  questionId: string;
  name: string;
  as: string;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const escapeArg = (text: string) => plainTextToLatex(String(text ?? "").trim());
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.trim() ? pad + line : line))
    .join("\n");
}

function partBody(part: GeneratedPart, copies: ImageCopy[]): string {
  let body = part.format === "latex" ? part.text.trim() : plainTextToLatex(part.text.trim());

  // Give each image a paper-wide unique name and point the text at it.
  if (part.questionId) {
    for (const name of part.images ?? []) {
      const pattern = new RegExp(`(\\\\includegraphics(?:\\[[^\\]]*\\])?\\{)${escapeRegExp(name)}(\\})`, "g");
      if (!pattern.test(body)) continue;
      const as = `${part.questionId}-${name}`.replace(/[^\w.-]+/g, "-");
      body = body.replace(pattern, `$1${as}$2`);
      copies.push({ questionId: part.questionId, name, as });
    }
  }

  if (part.options?.length) {
    const options = part.options.map((option) => `  \\item ${escapeArg(option)}`).join("\n");
    body += `\n\\begin{enumerate}[label=(\\alph*)]\n${options}\n\\end{enumerate}`;
  }

  const qinfo = `\\qinfo{${part.marks}}{${escapeArg(part.bloomsLevel)}}{${escapeArg(part.co)}}{${escapeArg(part.po)}}{${escapeArg(part.pso)}}`;
  // The columns go first so they stay on the first line whatever the question contains.
  return `${qinfo} ${body}`;
}

function questionItem(number: number, parts: GeneratedPart[], copies: ImageCopy[]): string {
  if (parts.length === 1) return `\\item[${number}.] ${indent(partBody(parts[0], copies), 2).trimStart()}`;
  const items = parts.map((part) => `  \\item ${indent(partBody(part, copies), 4).trimStart()}`).join("\n");
  return `\\item[${number}.]\n\\begin{enumerate}\n${items}\n\\end{enumerate}`;
}

export function paperToLatex(paper: GeneratedPaper): { source: string; images: ImageCopy[] } {
  const copies: ImageCopy[] = [];
  const header = [
    instituteCommands().trimEnd(),
    paper.examTitle && `\\examtitle{${escapeArg(paper.examTitle)}}`,
    paper.subjectName && `\\subject{${escapeArg(paper.subjectName)}}`,
    paper.courseCode && `\\coursecode{${escapeArg(paper.courseCode)}}`,
    paper.semester && `\\semester{${escapeArg(paper.semester)}}`,
    paper.examDate && `\\examdate{${escapeArg(paper.examDate)}}`,
    paper.duration ? `\\duration{${paper.duration}}` : "",
    paper.totalMarks ? `\\maxmarks{${paper.totalMarks}}` : "",
    ...paper.instructions.filter((line) => line.trim()).map((line) => `\\note{${escapeArg(line)}}`),
  ].filter(Boolean);

  const units = paper.units.map((unit) => {
    const questions = unit.questions.map((question) => {
      const main = indent(questionItem(question.number, question.parts, copies), 2);
      if (!question.orQuestion) return main;
      const or = indent(questionItem(question.orQuestion.number, question.orQuestion.parts, copies), 2);
      return `${main}\n\n  \\begin{center} \\textbf{OR} \\end{center}\n\n${or}`;
    });
    return [
      `\\begin{center}\n\\textbf{Unit - ${ROMAN[unit.unitNumber - 1] ?? unit.unitNumber}}\n\\end{center}`,
      `\\begin{enumerate}\n${questions.join("\n\n")}\n\\end{enumerate}`,
    ].join("\n\n");
  });

  const source = `${header.join("\n")}\n\n\\qinfoheader\n\n${units.join("\n\n")}\n`;
  return { source, images: copies };
}
