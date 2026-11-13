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

const STORAGE_KEY = "qpgen_subjects_v2";

export const INITIAL_SUBJECTS: Subject[] = [
  {
    subjectId: "DS-S3IS01",
    subjectName: "Data Structures / Data Structures and Applications",
    courseCode: "S3IS01/3RIS02",
    semester: "III Semester",
    numberOfUnits: 5,
    description: "Structures, file functions, stacks, queues, linked lists, and tree data structures.",
    createdAt: new Date().toISOString(),
  },
];

function loadFromStorage(): Subject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SUBJECTS));
      return INITIAL_SUBJECTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SUBJECTS));
      return INITIAL_SUBJECTS;
    }
    // Ensure the subject is preserved with official name and course code
    const updated = parsed.map((s) => {
      if (s.subjectId === "DS-S3IS01") {
        return {
          ...s,
          subjectName: "Data Structures / Data Structures and Applications",
          courseCode: "S3IS01/3RIS02",
          semester: s.semester || "III Semester",
        };
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SUBJECTS));
    return INITIAL_SUBJECTS;
  }
}

function persistToStorage(subjects: Subject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
}

export function getSubjects(): Subject[] {
  return loadFromStorage();
}

export function getSubjectById(subjectId: string): Subject | undefined {
  const list = loadFromStorage();
  return list.find(
    (s) =>
      s.subjectId.toLowerCase() === subjectId.toLowerCase() ||
      s.courseCode.toLowerCase() === subjectId.toLowerCase()
  );
}

export function saveSubject(subject: Omit<Subject, "createdAt" | "updatedAt">): Subject {
  const list = loadFromStorage();
  const now = new Date().toISOString();
  const newSubject: Subject = {
    ...subject,
    subjectId: subject.subjectId.trim() || subject.courseCode.trim(),
    createdAt: now,
    updatedAt: now,
  };

  const existingIdx = list.findIndex(
    (s) => s.subjectId.toLowerCase() === newSubject.subjectId.toLowerCase()
  );

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...newSubject, updatedAt: now };
  } else {
    list.push(newSubject);
  }

  persistToStorage(list);
  return newSubject;
}

export function updateSubject(subjectId: string, updates: Partial<Subject>): Subject | null {
  const list = loadFromStorage();
  const idx = list.findIndex((s) => s.subjectId.toLowerCase() === subjectId.toLowerCase());
  if (idx === -1) return null;

  list[idx] = {
    ...list[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  persistToStorage(list);
  return list[idx];
}

export function deleteSubject(subjectId: string): boolean {
  const list = loadFromStorage();
  const filtered = list.filter((s) => s.subjectId.toLowerCase() !== subjectId.toLowerCase());
  if (filtered.length === list.length) return false;
  persistToStorage(filtered);
  return true;
}
