export type AssessmentKind = "SEE" | "TEST" | "QUIZ";

export type AssessmentPolicy = {
  kind: AssessmentKind;
  label: string;
  totalMarks: number;
  duration: number;
  hasChoice: boolean;
  questionCount: number;
  questionType: "descriptive" | "mcq";
  allowedQuestionMarks: number[];
};

export const DEFAULT_ASSESSMENT_POLICIES: AssessmentPolicy[] = [
  {
    kind: "SEE",
    label: "Semester End Exam",
    totalMarks: 100,
    duration: 180,
    hasChoice: true,
    questionCount: 10,
    questionType: "descriptive",
    allowedQuestionMarks: [4, 6, 8, 10],
  },
  {
    kind: "TEST",
    label: "Class Test",
    totalMarks: 50,
    duration: 60,
    hasChoice: false,
    questionCount: 2,
    questionType: "descriptive",
    allowedQuestionMarks: [5, 10],
  },
  {
    kind: "QUIZ",
    label: "Quiz",
    totalMarks: 20,
    duration: 30,
    hasChoice: false,
    questionCount: 20,
    questionType: "mcq",
    allowedQuestionMarks: [1, 2, 3, 4],
  },
];

const STORAGE_KEY = "qpgen_assessment_policies_v1";

export function getAssessmentPolicies(): AssessmentPolicy[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_ASSESSMENT_POLICIES;
    const parsed = JSON.parse(stored) as AssessmentPolicy[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ASSESSMENT_POLICIES;
  } catch {
    return DEFAULT_ASSESSMENT_POLICIES;
  }
}

export function saveAssessmentPolicies(policies: AssessmentPolicy[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
}

export function getAssessmentPolicy(kind: AssessmentKind): AssessmentPolicy {
  return getAssessmentPolicies().find((policy) => policy.kind === kind)
    ?? DEFAULT_ASSESSMENT_POLICIES.find((policy) => policy.kind === kind)!;
}
