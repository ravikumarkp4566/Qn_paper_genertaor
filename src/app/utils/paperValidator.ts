import { PaperRequirement } from "../services/storage/paperStorage";

export interface ValidationItem {
  key: string;
  label: string;
  passed: boolean;
  message: string;
}

export interface PaperValidationResult {
  isValid: boolean;
  items: ValidationItem[];
  totalMarksCalculated: number;
  totalMarksTarget: number;
  errorMessages: string[];
}

export function validatePaperRequirements(
  subjectId: string,
  targetMarks: number,
  requirements: PaperRequirement[]
): PaperValidationResult {
  const items: ValidationItem[] = [];
  const errorMessages: string[] = [];

  // 1. Check if requirements exist
  const hasRequirements = requirements.length > 0;
  if (!hasRequirements) {
    items.push({
      key: "no_requirements",
      label: "Question Requirements",
      passed: false,
      message: "No question requirements have been configured yet.",
    });
    return {
      isValid: false,
      items,
      totalMarksCalculated: 0,
      totalMarksTarget: targetMarks,
      errorMessages: ["Please add at least one question requirement."],
    };
  }

  // 2. Check for missing questions (slots without a selected question)
  const unassignedSlots = requirements.filter((r) => !r.selectedQuestion);
  const allSelected = unassignedSlots.length === 0;
  items.push({
    key: "all_selected",
    label: "Question Selection",
    passed: allSelected,
    message: allSelected
      ? "All questions have been selected"
      : `${unassignedSlots.length} slot(s) missing selected questions (Q${unassignedSlots
          .map((r) => r.questionNumber)
          .join(", Q")})`,
  });
  if (!allSelected) {
    unassignedSlots.forEach((r) => {
      errorMessages.push(`Question ${r.questionNumber} has no selected question.`);
    });
  }

  // 3. Check total marks
  const totalCalculated = requirements.reduce(
    (acc, r) => acc + (r.selectedQuestion?.marks || 0),
    0
  );
  const marksMatch = totalCalculated === targetMarks;
  items.push({
    key: "total_marks",
    label: "Total Marks",
    passed: marksMatch,
    message: marksMatch
      ? `Total marks = ${targetMarks}`
      : `Total marks = ${totalCalculated} / ${targetMarks} (Variance: ${
          totalCalculated - targetMarks > 0 ? "+" : ""
        }${totalCalculated - targetMarks})`,
  });
  if (!marksMatch) {
    errorMessages.push(
      `Paper total marks (${totalCalculated}) does not match required ${targetMarks} marks.`
    );
  }

  // 4. Missing Bloom's Level
  const missingBL = requirements.filter(
    (r) => r.selectedQuestion && !r.selectedQuestion.bloomLevel
  );
  const allBL = missingBL.length === 0;
  items.push({
    key: "bloom_levels",
    label: "Bloom's Taxonomy Levels",
    passed: allBL,
    message: allBL
      ? "All questions have Bloom's Level (BL)"
      : `${missingBL.length} question(s) missing Bloom's Level`,
  });
  if (!allBL) {
    missingBL.forEach((r) => {
      errorMessages.push(`Q${r.questionNumber} is missing Bloom's Level (BL).`);
    });
  }

  // 5. Missing CO
  const missingCO = requirements.filter(
    (r) => r.selectedQuestion && !r.selectedQuestion.co
  );
  const allCO = missingCO.length === 0;
  items.push({
    key: "course_outcomes",
    label: "Course Outcomes (CO)",
    passed: allCO,
    message: allCO
      ? "All questions have Course Outcomes (CO)"
      : `${missingCO.length} question(s) missing CO`,
  });
  if (!allCO) {
    missingCO.forEach((r) => {
      errorMessages.push(`Q${r.questionNumber} is missing Course Outcome (CO).`);
    });
  }

  // 6. Missing PO
  const missingPO = requirements.filter(
    (r) => r.selectedQuestion && !r.selectedQuestion.po
  );
  const allPO = missingPO.length === 0;
  items.push({
    key: "program_outcomes",
    label: "Program Outcomes (PO)",
    passed: allPO,
    message: allPO
      ? "All questions have Program Outcomes (PO)"
      : `${missingPO.length} question(s) missing PO`,
  });
  if (!allPO) {
    missingPO.forEach((r) => {
      errorMessages.push(`Q${r.questionNumber} is missing Program Outcome (PO).`);
    });
  }

  // 7. Missing PSO
  const missingPSO = requirements.filter(
    (r) => r.selectedQuestion && !r.selectedQuestion.pso
  );
  const allPSO = missingPSO.length === 0;
  items.push({
    key: "program_specific_outcomes",
    label: "Program Specific Outcomes (PSO)",
    passed: allPSO,
    message: allPSO
      ? "All questions have Program Specific Outcomes (PSO)"
      : `${missingPSO.length} question(s) missing PSO`,
  });
  if (!allPSO) {
    missingPSO.forEach((r) => {
      errorMessages.push(`Q${r.questionNumber} is missing Program Specific Outcome (PSO).`);
    });
  }

  // 8. Duplicate questions check
  const questionIds = requirements
    .map((r) => r.selectedQuestion?.id)
    .filter(Boolean) as string[];
  const duplicates = questionIds.filter(
    (id, index) => questionIds.indexOf(id) !== index
  );
  const noDuplicates = duplicates.length === 0;
  items.push({
    key: "duplicate_questions",
    label: "Duplicate Question Check",
    passed: noDuplicates,
    message: noDuplicates
      ? "No duplicate questions detected"
      : `Duplicate question detected (${Array.from(new Set(duplicates)).join(", ")})`,
  });
  if (!noDuplicates) {
    errorMessages.push(
      `Duplicate questions found in the paper: ${Array.from(new Set(duplicates)).join(", ")}`
    );
  }

  // 9. Subject matching check
  const wrongSubject = requirements.filter(
    (r) =>
      r.selectedQuestion &&
      r.selectedQuestion.subjectId.toLowerCase() !== subjectId.toLowerCase()
  );
  const subjectValid = wrongSubject.length === 0;
  items.push({
    key: "subject_matching",
    label: "Subject Scope Integrity",
    passed: subjectValid,
    message: subjectValid
      ? "All questions belong to the selected subject"
      : `${wrongSubject.length} question(s) belong to a different subject`,
  });
  if (!subjectValid) {
    errorMessages.push(`Some questions do not match the selected subject (${subjectId}).`);
  }

  const isValid = items.every((i) => i.passed);

  return {
    isValid,
    items,
    totalMarksCalculated: totalCalculated,
    totalMarksTarget: targetMarks,
    errorMessages,
  };
}
