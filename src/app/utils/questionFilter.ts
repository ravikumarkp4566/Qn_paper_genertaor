import { Question } from "../services/storage/questionStorage";

export interface QuestionFilterCriteria {
  subjectId: string;
  unit?: number | "Any" | string;
  marks?: number | "Any" | string;
  bloomLevel?: string | "Any";
  co?: string | "Any";
  po?: string | "Any";
  pso?: string | "Any";
  difficulty?: string | "Any";
  search?: string;
  excludeQuestionIds?: string[];
  allowDuplicates?: boolean;
}

export function filterQuestions(
  allQuestions: Question[],
  criteria: QuestionFilterCriteria
): Question[] {
  return allQuestions.filter((q) => {
    // 1. Subject match (mandatory)
    if (
      criteria.subjectId &&
      q.subjectId.toLowerCase() !== criteria.subjectId.toLowerCase()
    ) {
      return false;
    }

    // 2. Exclude already selected questions (unless allowDuplicates is true)
    if (
      !criteria.allowDuplicates &&
      criteria.excludeQuestionIds &&
      criteria.excludeQuestionIds.includes(q.id)
    ) {
      return false;
    }

    // 3. Search query
    if (criteria.search && criteria.search.trim() !== "") {
      const searchLower = criteria.search.toLowerCase();
      const textMatch = q.text.toLowerCase().includes(searchLower);
      const idMatch = q.id.toLowerCase().includes(searchLower);
      if (!textMatch && !idMatch) return false;
    }

    // 4. Unit filter (ignore if Any or undefined)
    if (
      criteria.unit !== undefined &&
      criteria.unit !== "Any" &&
      criteria.unit !== ""
    ) {
      if (Number(q.unit) !== Number(criteria.unit)) {
        return false;
      }
    }

    // 5. Marks filter (ignore if Any or undefined)
    if (
      criteria.marks !== undefined &&
      criteria.marks !== "Any" &&
      criteria.marks !== ""
    ) {
      if (Number(q.marks) !== Number(criteria.marks)) {
        return false;
      }
    }

    // 6. Bloom's Level filter (ignore if Any or undefined)
    if (
      criteria.bloomLevel !== undefined &&
      criteria.bloomLevel !== "Any" &&
      criteria.bloomLevel !== ""
    ) {
      if (
        q.bloomLevel.toUpperCase() !== criteria.bloomLevel.toUpperCase()
      ) {
        return false;
      }
    }

    // 7. CO filter (ignore if Any or undefined)
    if (
      criteria.co !== undefined &&
      criteria.co !== "Any" &&
      criteria.co !== ""
    ) {
      if (q.co.toUpperCase() !== criteria.co.toUpperCase()) {
        return false;
      }
    }

    // 8. PO filter (ignore if Any or undefined)
    if (
      criteria.po !== undefined &&
      criteria.po !== "Any" &&
      criteria.po !== ""
    ) {
      const qPos = q.po.split(",").map((p) => p.trim().toUpperCase());
      if (!qPos.includes(criteria.po.toUpperCase())) {
        return false;
      }
    }

    // 9. PSO filter (ignore if Any or undefined)
    if (
      criteria.pso !== undefined &&
      criteria.pso !== "Any" &&
      criteria.pso !== ""
    ) {
      const qPsos = q.pso.split(",").map((p) => p.trim().toUpperCase());
      if (!qPsos.includes(criteria.pso.toUpperCase())) {
        return false;
      }
    }

    // 10. Difficulty filter (ignore if Any or undefined)
    if (
      criteria.difficulty !== undefined &&
      criteria.difficulty !== "Any" &&
      criteria.difficulty !== ""
    ) {
      if (
        (q.difficulty || "").toLowerCase() !==
        criteria.difficulty.toLowerCase()
      ) {
        return false;
      }
    }

    return true;
  });
}
