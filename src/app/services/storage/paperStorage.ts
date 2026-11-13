import { Question } from "./questionStorage";

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

const STORAGE_KEY = "qpgen_saved_papers_v2";

export const INITIAL_PAPERS: PaperRecord[] = [
  {
    id: "PAP-DS-01",
    title: "Even Semester B.E. Examinations - Data Structures",
    subjectId: "DS-S3IS01",
    subjectName: "Data Structures",
    courseCode: "DS-S3IS01",
    semester: "Semester 3",
    examType: "SEE",
    totalMarks: 100,
    duration: 180,
    date: "June/July 2025",
    universityName: "Siddaganga Institute of Technology, Tumakuru-572 103",
    instructions: [
      "Revealing of Identity in any form in the answer book will be treated as malpractice.",
      "Answer any five questions choosing one full question from each unit."
    ],
    requirements: [],
    units: [
      {
        unitNumber: 1,
        name: "",
        questions: [
          {
            number: 1,
            hasOr: true,
            parts: [
              {
                text: "Define a structure “Faculty” with the following fields: faculty name, department name, designation, year of service. Write a C program using this structure to read details of n faculty members and print details of those with >20 years experience and belonging to ISE department.",
                marks: 8,
                bloomsLevel: "BL3",
                co: "CO1",
                po: "PO2",
                pso: "PSO1"
              },
              {
                text: "Explain with general syntax and example, the following file functions: fopen(), getc(), fprintf(), fseek().",
                marks: 6,
                bloomsLevel: "BL2",
                co: "CO1",
                po: "PO1",
                pso: "PSO1"
              },
              {
                text: "Read n integers at the command line and store them in a file. Compute the sum and average of all the integers and store the result at the end of the same file.",
                marks: 6,
                bloomsLevel: "BL2",
                co: "CO1",
                po: "PO1",
                pso: "PSO1"
              }
            ],
            orQuestion: {
              number: 2,
              parts: [
                {
                  text: "Consider two files LIST1 and LIST2 containing integer elements. Write a C program to produce third file MERGE to concat two lists. Display the contents of all three files.",
                  marks: 8,
                  bloomsLevel: "BL3",
                  co: "CO1",
                  po: "PO2",
                  pso: "PSO1"
                },
                {
                  text: "Write a C program to read two integer arrays and check whether they are identical or not using pointers.",
                  marks: 6,
                  bloomsLevel: "BL2",
                  co: "CO1",
                  po: "PO2",
                  pso: "PSO1"
                },
                {
                  text: "Explain the methods by which the values of a structure can be transferred from one function to another along with advantages and disadvantages of each method.",
                  marks: 6,
                  bloomsLevel: "BL1",
                  co: "CO1",
                  po: "PO1",
                  pso: "PSO1"
                }
              ]
            }
          }
        ]
      },
      {
        unitNumber: 2,
        name: "",
        questions: [
          {
            number: 3,
            hasOr: true,
            parts: [
              {
                text: "Write C functions to perform operations on Stack: Push character onto Stack; Pop character from stack; Transfer contents of Stack1 to Stack2 maintaining element order.",
                marks: 8,
                bloomsLevel: "BL3",
                co: "CO2",
                po: "PO2",
                pso: "PSO1"
              },
              {
                text: "How circular queue is different from a linear queue? Write a C program to implement circular queue of integers using static memory allocation.",
                marks: 8,
                bloomsLevel: "BL2",
                co: "CO2",
                po: "PO2",
                pso: "PSO1"
              },
              {
                text: "Write a C program to compute sum of the series 1 + x + x² + x³ + … + xⁿ with the help of recursive functions.",
                marks: 4,
                bloomsLevel: "BL3",
                co: "CO2",
                po: "PO2",
                pso: "PSO1"
              }
            ],
            orQuestion: {
              number: 4,
              parts: [
                {
                  text: "Consider a producer-consumer problem: buffer of size n. Consumer consumes in order produced. Mention data structure and develop C program.",
                  marks: 8,
                  bloomsLevel: "BL3",
                  co: "CO2",
                  po: "PO2",
                  pso: "PSO1"
                },
                {
                  text: "Develop a C recursive program to compute the sum of first n natural numbers.",
                  marks: 6,
                  bloomsLevel: "BL2",
                  co: "CO2",
                  po: "PO1",
                  pso: "PSO1"
                },
                {
                  text: "Convert the following infix expressions to equivalent prefix and postfix expressions: (A+(B-C)*D)+E/F; P^(Q+R)–S/T*(U+W).",
                  marks: 6,
                  bloomsLevel: "BL2",
                  co: "CO2",
                  po: "PO1",
                  pso: "PSO1"
                }
              ]
            }
          }
        ]
      }
    ],
    createdAt: "2026-04-05T10:00:00.000Z",
  }
];

function loadFromStorage(): PaperRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PAPERS));
      return INITIAL_PAPERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PAPERS));
      return INITIAL_PAPERS;
    }
    const filtered = parsed.filter(
      (p) => p.subjectId === "DS-S3IS01" || p.courseCode === "DS-S3IS01"
    );
    if (filtered.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PAPERS));
      return INITIAL_PAPERS;
    }
    return filtered;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PAPERS));
    return INITIAL_PAPERS;
  }
}

function persistToStorage(papers: PaperRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(papers));
}

export function getPapers(): PaperRecord[] {
  return loadFromStorage();
}

export function getPaperById(id: string): PaperRecord | undefined {
  const all = loadFromStorage();
  return all.find((p) => p.id.toLowerCase() === id.toLowerCase());
}

export function savePaper(paper: Omit<PaperRecord, "id" | "createdAt"> & { id?: string }): PaperRecord {
  const all = loadFromStorage();
  const nextId = paper.id?.trim() || `PAP-DS-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  const newPaper: PaperRecord = {
    ...paper,
    id: nextId,
    subjectId: "DS-S3IS01",
    courseCode: "DS-S3IS01",
    subjectName: "Data Structures",
    createdAt: now,
    updatedAt: now,
  };

  const existingIdx = all.findIndex((p) => p.id.toLowerCase() === nextId.toLowerCase());
  if (existingIdx >= 0) {
    all[existingIdx] = { ...all[existingIdx], ...newPaper, updatedAt: now };
  } else {
    all.unshift(newPaper);
  }

  persistToStorage(all);
  return newPaper;
}

export function deletePaper(id: string): boolean {
  const all = loadFromStorage();
  const filtered = all.filter((p) => p.id.toLowerCase() !== id.toLowerCase());
  if (filtered.length === all.length) return false;
  persistToStorage(filtered);
  return true;
}
