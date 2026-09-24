export interface BloomLevelOption {
  value: string;
  label: string;
  name: string;
}

export const BLOOM_LEVELS: BloomLevelOption[] = [
  { value: "BL1", label: "BL1", name: "Remember" },
  { value: "BL2", label: "BL2", name: "Understand" },
  { value: "BL3", label: "BL3", name: "Apply" },
  { value: "BL4", label: "BL4", name: "Analyze" },
  { value: "BL5", label: "BL5", name: "Evaluate" },
  { value: "BL6", label: "BL6", name: "Create" },
];

export const COURSE_OUTCOMES = [
  "CO1",
  "CO2",
  "CO3",
  "CO4",
  "CO5",
] as const;

export const PROGRAM_OUTCOMES = [
  "PO1",
  "PO2",
  "PO3",
  "PO4",
  "PO5",
  "PO6",
  "PO7",
  "PO8",
  "PO9",
  "PO10",
  "PO11",
  "PO12",
] as const;

export const PROGRAM_SPECIFIC_OUTCOMES = [
  "PSO1",
  "PSO2",
  "PSO3",
] as const;

export const DIFFICULTY_LEVELS = [
  "Easy",
  "Medium",
  "Hard",
] as const;

export const EXAM_TYPES = [
  { value: "SEE", label: "Semester End Examinations (SEE)" },
] as const;

export const COMMON_MARKS = [2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20] as const;
