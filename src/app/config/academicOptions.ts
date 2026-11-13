// Option lists for the question bank and paper forms (Bloom levels, COs, POs...).
// They live in the database (settings: "academicOptions") and are filled in
// after sign-in by setAcademicOptions; until then the lists are empty.
// `export let` keeps importers in sync: they always see the current list.

export interface BloomLevelOption {
  value: string;
  label: string;
  name: string;
}

export interface ExamTypeOption {
  value: string;
  label: string;
}

export interface AcademicOptions {
  BLOOM_LEVELS?: BloomLevelOption[];
  COURSE_OUTCOMES?: string[];
  PROGRAM_OUTCOMES?: string[];
  PROGRAM_SPECIFIC_OUTCOMES?: string[];
  DIFFICULTY_LEVELS?: string[];
  EXAM_TYPES?: ExamTypeOption[];
  COMMON_MARKS?: number[];
}

export let BLOOM_LEVELS: BloomLevelOption[] = [];
export let COURSE_OUTCOMES: string[] = [];
export let PROGRAM_OUTCOMES: string[] = [];
export let PROGRAM_SPECIFIC_OUTCOMES: string[] = [];
export let DIFFICULTY_LEVELS: string[] = [];
export let EXAM_TYPES: ExamTypeOption[] = [];
export let COMMON_MARKS: number[] = [];

export function setAcademicOptions(options: AcademicOptions): void {
  BLOOM_LEVELS = options.BLOOM_LEVELS ?? [];
  COURSE_OUTCOMES = options.COURSE_OUTCOMES ?? [];
  PROGRAM_OUTCOMES = options.PROGRAM_OUTCOMES ?? [];
  PROGRAM_SPECIFIC_OUTCOMES = options.PROGRAM_SPECIFIC_OUTCOMES ?? [];
  DIFFICULTY_LEVELS = options.DIFFICULTY_LEVELS ?? [];
  EXAM_TYPES = options.EXAM_TYPES ?? [];
  COMMON_MARKS = options.COMMON_MARKS ?? [];
}
