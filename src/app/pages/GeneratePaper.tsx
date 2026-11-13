import { useState, useEffect, useMemo } from "react";
import { collegeHeader } from "../services/dataStore";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  X,
  Layers,
  Sparkles,
  RotateCcw,
  Pencil,
  Edit3,
  Settings,
  BookOpen,
  Lock,
} from "lucide-react";
import {
  BLOOM_LEVELS,
  COURSE_OUTCOMES,
  PROGRAM_OUTCOMES,
  PROGRAM_SPECIFIC_OUTCOMES,
} from "../config/academicOptions";
import { getSubjects, Subject } from "../services/storage/subjectStorage";
import { getQuestions, Question } from "../services/storage/questionStorage";
import { createLatexPaperFromGenerated } from "../services/storage/latexPaperStorage";
import { QuestionText } from "../latex/QuestionText";
import {
  savePaper,
  PaperRecord,
  PaperUnit,
} from "../services/storage/paperStorage";
import {
  AssessmentKind,
  getAssessmentPolicy,
} from "../services/assessmentPolicy";

export interface SubPartItem {
  id: string;
  label: string; // 'a', 'b', 'c', 'd'
  marks: number | string;
  bloomLevel: string;
  co: string;
  po: string;
  pso: string;
  selectedQuestion: Question | null;
  userModifiedCriteria?: boolean;
}

export interface UnitExamConfig {
  unitNumber: number;
  question1Number: number; // 1, 3, 5, 7, 9
  question2Number: number; // 2, 4, 6, 8, 10
  question1Parts: SubPartItem[];
  question2Parts: SubPartItem[];
}

export function GeneratePaper() {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stage, setStage] = useState<"config" | "builder" | "review" | "validate">("config");

  // Step 1: Initial Configuration & Official Header Fields
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("DS-S3IS01");
  const [subjectName, setSubjectName] = useState<string>(
    "Data Structures / Data Structures and Applications"
  );
  const [courseCode, setCourseCode] = useState<string>("S3IS01/3RIS02");
  const [semester, setSemester] = useState<string>("III Semester");
  const [degreeName, setDegreeName] = useState<string>("B.E.");
  const [departmentName, setDepartmentName] = useState<string>(
    "Information Sc. and Engg."
  );
  const [examSession, setExamSession] = useState<string>("Aug-Sept. 2025");
  const [examTerm, setExamTerm] = useState<string>("Supplementary Semester");
  const [examType, setExamType] = useState<string>("SEE");
  const [assessmentKind, setAssessmentKind] = useState<AssessmentKind>("SEE");
  const [testNumber, setTestNumber] = useState<1 | 2>(1);
  const [examTitle, setExamTitle] = useState<string>(
    "Supplementary Semester B.E. Information Sc. and Engg. Examinations, Aug-Sept. 2025"
  );
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [maxMarksPerUnit, setMaxMarksPerUnit] = useState<number>(20);
  const [duration, setDuration] = useState<number>(180);
  const [universityName, setUniversityName] = useState<string>(
    collegeHeader().institute
  );
  const [affiliationSubtext, setAffiliationSubtext] = useState<string>(
    collegeHeader().affiliation
  );
  const [usnPrefix, setUsnPrefix] = useState<string>(() => collegeHeader().usnPrefix);
  const [mobilePhonesProhibited, setMobilePhonesProhibited] = useState<boolean>(true);
  const [instruction1, setInstruction1] = useState<string>(
    "Revealing of Identity in any form in the answer book will be treated as malpractice."
  );
  const [instruction2, setInstruction2] = useState<string>(
    "Answer any five questions choosing one full question from each unit."
  );

  const assessmentPolicy = getAssessmentPolicy(assessmentKind);

  const handleAssessmentKindChange = (kind: AssessmentKind) => {
    const policy = getAssessmentPolicy(kind);
    setAssessmentKind(kind);
    setExamType(kind);
    setTotalMarks(policy.totalMarks);
    setDuration(policy.duration);
    setMaxMarksPerUnit(kind === "SEE" ? 20 : kind === "TEST" ? 10 : 4);
    initUnitsConfig(kind === "SEE" ? 20 : kind === "TEST" ? 10 : 4);
  };

  // Active unit tab in builder: 1 to 5 (or 0 for All)
  const [activeUnitTab, setActiveUnitTab] = useState<number>(1);

  // Step 2: 5-Unit Structure (1 OR 2, 3 OR 4, 5 OR 6, 7 OR 8, 9 OR 10)
  const [unitsConfig, setUnitsConfig] = useState<UnitExamConfig[]>([]);

  // Selection Modal state
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [activePickerTarget, setActivePickerTarget] = useState<{
    unitNumber: number;
    questionNumber: number;
    partId: string;
  } | null>(null);
  const [pickerMode, setPickerMode] = useState<"filtered" | "all">("filtered");
  const [pickerSearch, setPickerSearch] = useState<string>("");

  // Cached question bank for the subject
  const allQuestions = useMemo(() => getQuestions(selectedSubjectId), [selectedSubjectId]);

  // Load subject and initialize default configuration
  useEffect(() => {
    const loadedSubs = getSubjects();
    setSubjects(loadedSubs);
    if (loadedSubs.length > 0) {
      const match = loadedSubs.find((s) => s.subjectId === selectedSubjectId) || loadedSubs[0];
      setSelectedSubjectId(match.subjectId);
      setSubjectName(match.subjectName);
      setCourseCode(match.courseCode);
      if (match.semester) setSemester(match.semester);
    }
    initUnitsConfig(20);
  }, []);

  const handleSubjectChange = (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    const sub = subjects.find((s) => s.subjectId === newSubjectId);
    if (sub) {
      setSubjectName(sub.subjectName);
      setCourseCode(sub.courseCode);
      if (sub.semester) setSemester(sub.semester);
      // Reset subpart question selections if course changes
      setUnitsConfig((prev) =>
        prev.map((u) => ({
          ...u,
          question1Parts: u.question1Parts.map((p) => ({ ...p, selectedQuestion: null })),
          question2Parts: u.question2Parts.map((p) => ({ ...p, selectedQuestion: null })),
        }))
      );
    }
  };

  const activeSubject = useMemo(
    () => subjects.find((s) => s.subjectId === selectedSubjectId) || subjects[0],
    [subjects, selectedSubjectId]
  );

  // Initialize standard 5-Unit structure matching the university SEE exam template
  // Initially ALL selected questions are null (empty state) so faculty builds from scratch
  const initUnitsConfig = (unitMax: number = maxMarksPerUnit) => {
    const initial: UnitExamConfig[] = [1, 2, 3, 4, 5].map((uNum) => {
      const q1Num = (uNum - 1) * 2 + 1;
      const q2Num = q1Num + 1;

      // Determine default subparts that sum to unitMax
      let partsMarks: number[] = [];
      if (unitMax === 20) {
        partsMarks = uNum === 4 ? [10, 10] : [8, 6, 6];
      } else if (unitMax === 10) {
        partsMarks = [5, 5];
      } else if (unitMax === 15) {
        partsMarks = [8, 7];
      } else {
        const half = Math.floor(unitMax / 2);
        partsMarks = half > 0 && unitMax - half > 0 ? [unitMax - half, half] : [unitMax];
      }

      const createParts = (qNum: number): SubPartItem[] =>
        partsMarks.map((m, idx) => {
          const char = String.fromCharCode(97 + idx);
          return {
            id: `u${uNum}-q${qNum}-${char}`,
            label: char,
            marks: m,
            bloomLevel: uNum === 4 ? "BL3" : idx === 0 ? "BL3" : "BL2",
            co: `CO${uNum}`,
            po: idx === 0 ? "PO2" : "PO1",
            pso: "PSO1",
            selectedQuestion: null,
            userModifiedCriteria: false,
          };
        });

      return {
        unitNumber: uNum,
        question1Number: q1Num,
        question2Number: q2Num,
        question1Parts: createParts(q1Num),
        question2Parts: createParts(q2Num),
      };
    });

    setUnitsConfig(initial);
  };

  const handleTotalMarksChange = (val: number) => {
    if (assessmentKind !== "SEE") return;
    setTotalMarks(val);
    const suggestedUnitMax = Math.round(val / 5) || 20;
    setMaxMarksPerUnit(suggestedUnitMax);
    initUnitsConfig(suggestedUnitMax);
  };

  const handleMaxMarksPerUnitChange = (val: number) => {
    if (assessmentKind === "QUIZ") val = Math.min(4, Math.max(1, val));
    if (assessmentKind === "TEST") val = Math.min(10, Math.max(1, val));
    setMaxMarksPerUnit(val);
    initUnitsConfig(val);
  };

  const handleStartBuilder = (e: React.FormEvent) => {
    e.preventDefault();
    if (unitsConfig.length === 0) {
      initUnitsConfig(maxMarksPerUnit);
    }
    setStage("builder");
  };

  // Update criteria of a sub-part slot with dynamic real-time synchronization and max 20M enforcement
  const handleUpdatePartCriteria = (
    unitNum: number,
    questionNum: number,
    partId: string,
    field: keyof SubPartItem,
    value: any
  ) => {
    const unit = unitsConfig.find((u) => u.unitNumber === unitNum);
    if (!unit) return;

    const isQ1 = questionNum === unit.question1Number;
    const targetParts = isQ1 ? unit.question1Parts : unit.question2Parts;
    const currentPart = targetParts.find((p) => p.id === partId);
    if (!currentPart) return;

    // 1. Max unit marks limit check when updating marks
    if (field === "marks" && typeof value === "number") {
      const otherMarks = targetParts
        .filter((p) => p.id !== partId)
        .reduce(
          (acc, p) =>
            acc +
            (p.selectedQuestion?.marks ||
              (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
          0
        );
      if (otherMarks + value > maxMarksPerUnit) {
        alert(
          `Cannot set ${value} Marks: Total for Question ${questionNum} would become ${
            otherMarks + value
          }M, exceeding the ${maxMarksPerUnit} Marks unit limit. Maximum allowed for this part is ${
            maxMarksPerUnit - otherMarks
          }M.`
        );
        return;
      }
    }

    const otherMarks = targetParts
      .filter((p) => p.id !== partId)
      .reduce(
        (acc, p) =>
          acc +
          (p.selectedQuestion?.marks ||
            (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
        0
      );
    // 2. Whenever faculty changes any filter criteria on this slot,
    // disturb (unassign) the selected question so it never has mismatched or mutated marks!
    // Marks are strictly preserved and taken ONLY from the question bank.
    const updatedPart: SubPartItem = {
      ...currentPart,
      [field]: value,
      selectedQuestion: null, // Disturb the selected question
      userModifiedCriteria: true, // Faculty explicitly changed criteria on this slot
    };

    setUnitsConfig((prev) =>
      prev.map((u) => {
        if (u.unitNumber !== unitNum) return u;
        const isQ1Target = questionNum === u.question1Number;
        const parts = isQ1Target ? u.question1Parts : u.question2Parts;
        const updated = parts.map((p) => (p.id === partId ? updatedPart : p));
        return isQ1Target
          ? { ...u, question1Parts: updated }
          : { ...u, question2Parts: updated };
      })
    );
  };

  // Dynamically update question text directly in a slot
  const handleUpdateQuestionText = (
    unitNum: number,
    questionNum: number,
    partId: string,
    newText: string
  ) => {
    setUnitsConfig((prev) =>
      prev.map((u) => {
        if (u.unitNumber !== unitNum) return u;
        const isQ1 = questionNum === u.question1Number;
        const parts = isQ1 ? u.question1Parts : u.question2Parts;
        const updated = parts.map((p) => {
          if (p.id !== partId) return p;
          if (p.selectedQuestion) {
            return {
              ...p,
              selectedQuestion: {
                ...p.selectedQuestion,
                text: newText,
              },
            };
          } else {
            const customQ: Question = {
              id: `CUSTOM-U${u.unitNumber}-Q${questionNum}-${p.label.toUpperCase()}`,
              subjectId: selectedSubjectId || "DS-S3IS01",
              text: newText,
              unit: u.unitNumber,
              marks: typeof p.marks === "number" ? p.marks : Number(p.marks) || 6,
              bloomLevel: p.bloomLevel === "Any" ? "BL2" : p.bloomLevel,
              co: p.co === "Any" ? `CO${u.unitNumber}` : p.co,
              po: p.po === "Any" ? "PO1" : p.po,
              pso: p.pso === "Any" ? "PSO1" : p.pso,
            };
            return {
              ...p,
              selectedQuestion: customQ,
            };
          }
        });
        return isQ1
          ? { ...u, question1Parts: updated }
          : { ...u, question2Parts: updated };
      })
    );
  };

  // Directly select a question from the inline dropdown
  const handleSelectDirectly = (
    unitNum: number,
    questionNum: number,
    partId: string,
    q: Question
  ) => {
    if (selectedQuestionIds.includes(q.id)) {
      alert("This question is already selected in this paper. Please choose a different question.");
      return;
    }

    const unit = unitsConfig.find((u) => u.unitNumber === unitNum);
    if (unit) {
      const isQ1 = questionNum === unit.question1Number;
      const parts = isQ1 ? unit.question1Parts : unit.question2Parts;
      const otherMarks = parts
        .filter((p) => p.id !== partId)
        .reduce(
          (acc, p) =>
            acc +
            (p.selectedQuestion?.marks ||
              (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
          0
        );

      if (otherMarks + q.marks > maxMarksPerUnit) {
        alert(
          `Cannot assign Question ${q.id} (${q.marks} Marks): Total for Question ${questionNum} would become ${
            otherMarks + q.marks
          }M, exceeding the ${maxMarksPerUnit} Marks unit limit (Maximum allowed for this slot is ${
            maxMarksPerUnit - otherMarks
          }M).`
        );
        return;
      }
    }

    setUnitsConfig((prev) =>
      prev.map((u) => {
        if (u.unitNumber !== unitNum) return u;
        const isQ1 = questionNum === u.question1Number;
        const parts = isQ1 ? u.question1Parts : u.question2Parts;
        const updated = parts.map((p) =>
          p.id === partId
            ? {
                ...p,
                selectedQuestion: q,
                marks: q.marks,
                bloomLevel: q.bloomLevel,
                co: q.co,
                po: q.po,
                pso: q.pso,
                userModifiedCriteria: false,
              }
            : p
        );
        return isQ1
          ? { ...u, question1Parts: updated }
          : { ...u, question2Parts: updated };
      })
    );
  };

  // Add new sub-part (e.g. 'd') to a question
  const handleAddSubPart = (unitNum: number, questionNum: number) => {
    const unit = unitsConfig.find((u) => u.unitNumber === unitNum);
    if (unit) {
      const isQ1 = questionNum === unit.question1Number;
      const parts = isQ1 ? unit.question1Parts : unit.question2Parts;
      const currentMarks = parts.reduce(
        (acc, p) =>
          acc +
          (p.selectedQuestion?.marks ||
            (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
        0
      );
      if (currentMarks >= maxMarksPerUnit) {
        alert(
          `Question ${questionNum} is already at ${currentMarks}/${maxMarksPerUnit} Marks. Please reduce marks of existing sub-parts before adding another sub-part.`
        );
        return;
      }
    }

    setUnitsConfig((prev) =>
      prev.map((u) => {
        if (u.unitNumber !== unitNum) return u;
        const isQ1 = questionNum === u.question1Number;
        const parts = isQ1 ? u.question1Parts : u.question2Parts;
        const currentMarks = parts.reduce(
          (acc, p) =>
            acc +
            (p.selectedQuestion?.marks ||
              (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
          0
        );
        const remainingBudget = Math.max(0, maxMarksPerUnit - currentMarks);
        const newPartMarks = Math.min(6, remainingBudget) || 4;
        const nextChar = String.fromCharCode(97 + parts.length);
        const newPart: SubPartItem = {
          id: `u${unitNum}-q${questionNum}-${nextChar}-${Date.now()}`,
          label: nextChar,
          marks: newPartMarks,
          bloomLevel: "BL2",
          co: `CO${unitNum}`,
          po: "PO1",
          pso: "PSO1",
          selectedQuestion: null,
        };
        const updated = [...parts, newPart];
        return isQ1
          ? { ...u, question1Parts: updated }
          : { ...u, question2Parts: updated };
      })
    );
  };

  // Remove a sub-part
  const handleRemoveSubPart = (unitNum: number, questionNum: number, partId: string) => {
    setUnitsConfig((prev) =>
      prev.map((u) => {
        if (u.unitNumber !== unitNum) return u;
        const isQ1 = questionNum === u.question1Number;
        const parts = isQ1 ? u.question1Parts : u.question2Parts;
        const filtered = parts
          .filter((p) => p.id !== partId)
          .map((p, idx) => ({ ...p, label: String.fromCharCode(97 + idx) }));
        return isQ1
          ? { ...u, question1Parts: filtered }
          : { ...u, question2Parts: filtered };
      })
    );
  };

  // Open Question Picker Modal
  const handleOpenPicker = (
    unitNum: number,
    questionNum: number,
    partId: string,
    mode: "filtered" | "all"
  ) => {
    setActivePickerTarget({ unitNumber: unitNum, questionNumber: questionNum, partId });
    setPickerMode(mode);
    setPickerSearch("");
    setIsPickerOpen(true);
  };

  // Select question for slot from modal
  const handleSelectQuestionForSlot = (q: Question) => {
    if (!activePickerTarget) return;
    const { unitNumber, questionNumber, partId } = activePickerTarget;
    handleSelectDirectly(unitNumber, questionNumber, partId, q);
    setIsPickerOpen(false);
    setActivePickerTarget(null);
  };

  // Clear selected question in a slot
  const handleClearSlotQuestion = (unitNum: number, questionNum: number, partId: string) => {
    setUnitsConfig((prev) =>
      prev.map((u) => {
        if (u.unitNumber !== unitNum) return u;
        const isQ1 = questionNum === u.question1Number;
        const parts = isQ1 ? u.question1Parts : u.question2Parts;
        const updated = parts.map((p) =>
          p.id === partId ? { ...p, selectedQuestion: null } : p
        );
        return isQ1
          ? { ...u, question1Parts: updated }
          : { ...u, question2Parts: updated };
      })
    );
  };

  // Clear all selected questions across all units
  const handleClearAllQuestions = () => {
    setUnitsConfig((prev) =>
      prev.map((u) => ({
        ...u,
        question1Parts: u.question1Parts.map((p) => ({ ...p, selectedQuestion: null })),
        question2Parts: u.question2Parts.map((p) => ({ ...p, selectedQuestion: null })),
      }))
    );
  };

  // Clear selections for a single question
  const handleClearSingleQuestion = (unitNum: number, questionNum: number) => {
    setUnitsConfig((prev) =>
      prev.map((u) => {
        if (u.unitNumber !== unitNum) return u;
        const isQ1 = questionNum === u.question1Number;
        return isQ1
          ? { ...u, question1Parts: u.question1Parts.map((p) => ({ ...p, selectedQuestion: null })) }
          : { ...u, question2Parts: u.question2Parts.map((p) => ({ ...p, selectedQuestion: null })) };
      })
    );
  };

  // Auto-fill empty slots using matching questions from bank (strictly capped at maxMarksPerUnit per question)
  const handleAutoFillMatching = () => {
    const usedIds = new Set<string>();
    unitsConfig.forEach((u) => {
      u.question1Parts.forEach((p) => p.selectedQuestion && usedIds.add(p.selectedQuestion.id));
      u.question2Parts.forEach((p) => p.selectedQuestion && usedIds.add(p.selectedQuestion.id));
    });

    setUnitsConfig((prev) =>
      prev.map((u) => {
        const fillParts = (parts: SubPartItem[]) => {
          let runningMarks = parts.reduce(
            (acc, p) => acc + (p.selectedQuestion?.marks || 0),
            0
          );

          return parts.map((part) => {
            if (part.selectedQuestion) return part;
            const remainingBudget = Math.max(0, maxMarksPerUnit - runningMarks);
            if (remainingBudget <= 0) return part;

            // Strategy 1: Strict match (Unit, Marks, Bloom Level, CO)
            let match = allQuestions.find((q) => {
              if (usedIds.has(q.id)) return false;
              if (q.unit !== u.unitNumber) return false;
              if (q.marks > remainingBudget) return false;
              if (part.marks !== "Any" && q.marks !== Number(part.marks)) return false;
              if (part.bloomLevel !== "Any" && q.bloomLevel.toUpperCase() !== part.bloomLevel.toUpperCase()) return false;
              if (part.co !== "Any" && q.co.toUpperCase() !== part.co.toUpperCase()) return false;
              return true;
            });

            // Strategy 2: Relaxed Bloom Level (Match Unit, Marks, CO)
            if (!match) {
              match = allQuestions.find((q) => {
                if (usedIds.has(q.id)) return false;
                if (q.unit !== u.unitNumber) return false;
                if (q.marks > remainingBudget) return false;
                if (part.marks !== "Any" && q.marks !== Number(part.marks)) return false;
                if (part.co !== "Any" && q.co.toUpperCase() !== part.co.toUpperCase()) return false;
                return true;
              });
            }

            // Strategy 3: Relaxed Bloom Level & CO (Match Unit, Marks)
            if (!match) {
              match = allQuestions.find((q) => {
                if (usedIds.has(q.id)) return false;
                if (q.unit !== u.unitNumber) return false;
                if (q.marks > remainingBudget) return false;
                if (part.marks !== "Any" && q.marks !== Number(part.marks)) return false;
                return true;
              });
            }

            // Strategy 4: Any available question for this unit within remaining budget
            if (!match) {
              match = allQuestions.find((q) => {
                if (usedIds.has(q.id)) return false;
                if (q.unit !== u.unitNumber) return false;
                if (q.marks > remainingBudget) return false;
                return true;
              });
            }

            if (!match) {
              match = {
                id: `AI-${selectedSubjectId}-U${u.unitNumber}-${part.id}`,
                subjectId: selectedSubjectId,
                text: assessmentKind === "QUIZ"
                  ? `Which statement best describes a core concept from ${subjectName}, Unit ${u.unitNumber}?`
                  : `Explain and apply an important concept from ${subjectName}, Unit ${u.unitNumber}, with a suitable example.`,
                unit: u.unitNumber,
                marks: Math.min(
                  remainingBudget,
                  typeof part.marks === "number" ? part.marks : Number(part.marks) || 1,
                ),
                bloomLevel: part.bloomLevel === "Any" ? "BL2" : part.bloomLevel,
                co: part.co === "Any" ? `CO${u.unitNumber}` : part.co,
                po: part.po === "Any" ? "PO1" : part.po,
                pso: part.pso === "Any" ? "PSO1" : part.pso,
                ...(assessmentKind === "QUIZ"
                  ? {
                      options: ["Concept A", "Concept B", "Concept C", "Concept D"],
                      correctOption: 0,
                    }
                  : {}),
              };
            }

            if (match) {
              usedIds.add(match.id);
              runningMarks += match.marks;
              return {
                ...part,
                selectedQuestion: match,
                marks: match.marks,
                bloomLevel: match.bloomLevel,
                co: match.co,
                po: match.po,
                pso: match.pso,
                userModifiedCriteria: false,
              };
            }
            return part;
          });
        };

        return {
          ...u,
          question1Parts: fillParts(u.question1Parts),
          question2Parts: fillParts(u.question2Parts),
        };
      })
    );
  };

  // Get current active part being picked in modal
  const activePartItem = useMemo(() => {
    if (!activePickerTarget) return null;
    const { unitNumber, questionNumber, partId } = activePickerTarget;
    const unit = unitsConfig.find((u) => u.unitNumber === unitNumber);
    if (!unit) return null;
    const parts =
      questionNumber === unit.question1Number ? unit.question1Parts : unit.question2Parts;
    return parts.find((p) => p.id === partId) || null;
  }, [unitsConfig, activePickerTarget]);

  // List of all currently selected question IDs in the entire paper
  const selectedQuestionIds = useMemo(() => {
    const ids: string[] = [];
    unitsConfig.forEach((u) => {
      u.question1Parts.forEach((p) => {
        if (p.selectedQuestion && p.id !== activePickerTarget?.partId) {
          ids.push(p.selectedQuestion.id);
        }
      });
      u.question2Parts.forEach((p) => {
        if (p.selectedQuestion && p.id !== activePickerTarget?.partId) {
          ids.push(p.selectedQuestion.id);
        }
      });
    });
    return ids;
  }, [unitsConfig, activePickerTarget]);

  // Maximum marks permitted for the slot being edited in the modal (capped at maxMarksPerUnit per question)
  const maxMarksForModal = useMemo(() => {
    if (!activePickerTarget || !activePartItem) return maxMarksPerUnit;
    const { unitNumber, questionNumber, partId } = activePickerTarget;
    const unit = unitsConfig.find((u) => u.unitNumber === unitNumber);
    if (!unit) return maxMarksPerUnit;
    const parts =
      questionNumber === unit.question1Number ? unit.question1Parts : unit.question2Parts;
    const otherMarks = parts
      .filter((p) => p.id !== partId)
      .reduce(
        (acc, p) =>
          acc +
          (p.selectedQuestion?.marks ||
            (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
        0
      );
    return Math.max(0, maxMarksPerUnit - otherMarks);
  }, [unitsConfig, activePickerTarget, activePartItem, maxMarksPerUnit]);

  // Questions in modal filtered against slot criteria
  const availableQuestions = useMemo(() => {
    if (!activePickerTarget || !activePartItem) return allQuestions;

    const unitNum = activePickerTarget.unitNumber;

    if (pickerMode === "all") {
      return allQuestions.filter((q) => {
        if (q.unit !== unitNum) return false;
        if (selectedQuestionIds.includes(q.id)) return false;
        if (q.marks > maxMarksForModal) return false;
        if (pickerSearch) {
          const s = pickerSearch.toLowerCase();
          return q.text.toLowerCase().includes(s) || q.id.toLowerCase().includes(s);
        }
        return true;
      });
    }

    // Filtered mode
    return allQuestions.filter((q) => {
      if (q.unit !== unitNum) return false;
      if (selectedQuestionIds.includes(q.id)) return false;
      // Do not allow questions exceeding max marks allowed for this question slot
      if (q.marks > maxMarksForModal) return false;
      if (activePartItem.marks !== "Any" && q.marks !== Number(activePartItem.marks)) {
        return false;
      }
      if (
        activePartItem.bloomLevel !== "Any" &&
        q.bloomLevel.toUpperCase() !== activePartItem.bloomLevel.toUpperCase()
      ) {
        return false;
      }
      if (
        activePartItem.co !== "Any" &&
        q.co.toUpperCase() !== activePartItem.co.toUpperCase()
      ) {
        return false;
      }
      if (
        activePartItem.po !== "Any" &&
        (!q.po || !q.po.toUpperCase().includes(activePartItem.po.toUpperCase()))
      ) {
        return false;
      }
      if (
        activePartItem.pso !== "Any" &&
        (!q.pso || !q.pso.toUpperCase().includes(activePartItem.pso.toUpperCase()))
      ) {
        return false;
      }
      if (pickerSearch) {
        const s = pickerSearch.toLowerCase();
        return q.text.toLowerCase().includes(s) || q.id.toLowerCase().includes(s);
      }
      return true;
    });
  }, [activePickerTarget, activePartItem, pickerMode, pickerSearch, allQuestions, selectedQuestionIds, maxMarksForModal]);

  // Paper statistics
  const paperStats = useMemo(() => {
    let totalSubParts = 0;
    let assignedSubParts = 0;

    unitsConfig.forEach((u) => {
      u.question1Parts.forEach((p) => {
        totalSubParts += 1;
        if (p.selectedQuestion) assignedSubParts += 1;
      });
      if (assessmentPolicy.hasChoice) {
        u.question2Parts.forEach((p) => {
          totalSubParts += 1;
          if (p.selectedQuestion) assignedSubParts += 1;
        });
      }
    });

    return {
      totalSubParts,
      assignedSubParts,
      percentage: totalSubParts > 0 ? Math.round((assignedSubParts / totalSubParts) * 100) : 0,
    };
  }, [unitsConfig, assessmentPolicy.hasChoice]);

  // Convert builder state to PaperUnit format for Preview & DOCX
  const buildPaperUnits = (): PaperUnit[] => {
    return unitsConfig.map((u) => {
      const q1Parts = u.question1Parts.map((p) => ({
        text: p.selectedQuestion?.text || `[Question for (${p.label}) - ${p.marks}M, ${p.bloomLevel}, ${p.co}]`,
        questionId: p.selectedQuestion?.id,
        format: p.selectedQuestion?.format,
        images: p.selectedQuestion?.images,
        marks: p.selectedQuestion?.marks || (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0),
        options: p.selectedQuestion?.options,
        correctOption: p.selectedQuestion?.correctOption,
        bloomsLevel: p.selectedQuestion?.bloomLevel || (p.bloomLevel === "Any" ? "BL2" : p.bloomLevel),
        co: p.selectedQuestion?.co || (p.co === "Any" ? `CO${u.unitNumber}` : p.co),
        po: p.selectedQuestion?.po || (p.po === "Any" ? "PO1" : p.po),
        pso: p.selectedQuestion?.pso || (p.pso === "Any" ? "PSO1" : p.pso),
      }));

      const q2Parts = u.question2Parts.map((p) => ({
        text: p.selectedQuestion?.text || `[Question for (${p.label}) - ${p.marks}M, ${p.bloomLevel}, ${p.co}]`,
        questionId: p.selectedQuestion?.id,
        format: p.selectedQuestion?.format,
        images: p.selectedQuestion?.images,
        marks: p.selectedQuestion?.marks || (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0),
        options: p.selectedQuestion?.options,
        correctOption: p.selectedQuestion?.correctOption,
        bloomsLevel: p.selectedQuestion?.bloomLevel || (p.bloomLevel === "Any" ? "BL2" : p.bloomLevel),
        co: p.selectedQuestion?.co || (p.co === "Any" ? `CO${u.unitNumber}` : p.co),
        po: p.selectedQuestion?.po || (p.po === "Any" ? "PO1" : p.po),
        pso: p.selectedQuestion?.pso || (p.pso === "Any" ? "PSO1" : p.pso),
      }));

      return {
        unitNumber: u.unitNumber,
        name: "",
        questions: [
          {
            number: u.question1Number,
            parts: q1Parts,
            hasOr: assessmentPolicy.hasChoice,
            ...(assessmentPolicy.hasChoice ? { orQuestion: {
              number: u.question2Number,
              parts: q2Parts,
            } } : {}),
          },
        ],
      };
    });
  };

  // Validation issues calculation
  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    unitsConfig.forEach((u) => {
      const q1Marks = u.question1Parts.reduce(
        (acc, p) =>
          acc +
          (p.selectedQuestion?.marks ||
            (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
        0
      );
      const q2Marks = u.question2Parts.reduce(
        (acc, p) =>
          acc +
          (p.selectedQuestion?.marks ||
            (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
        0
      );
      const unselectedQ1 = u.question1Parts.filter((p) => !p.selectedQuestion).length;
      const unselectedQ2 = u.question2Parts.filter((p) => !p.selectedQuestion).length;

      if (unselectedQ1 > 0) {
        issues.push(`Unit ${u.unitNumber} (Question ${u.question1Number}) has ${unselectedQ1} unassigned sub-part${unselectedQ1 > 1 ? "s" : ""}.`);
      }
      if (assessmentPolicy.hasChoice && unselectedQ2 > 0) {
        issues.push(`Unit ${u.unitNumber} (Question ${u.question2Number}) has ${unselectedQ2} unassigned sub-part${unselectedQ2 > 1 ? "s" : ""}.`);
      }
      if (q1Marks > maxMarksPerUnit) {
        issues.push(`Unit ${u.unitNumber} (Question ${u.question1Number}) EXCEEDS the ${maxMarksPerUnit} Marks limit with ${q1Marks}/${maxMarksPerUnit} marks.`);
      } else if (q1Marks !== maxMarksPerUnit) {
        issues.push(`Unit ${u.unitNumber} (Question ${u.question1Number}) has ${q1Marks}/${maxMarksPerUnit} marks assigned.`);
      }
      if (assessmentPolicy.hasChoice && q2Marks > maxMarksPerUnit) {
        issues.push(`Unit ${u.unitNumber} (Question ${u.question2Number}) EXCEEDS the ${maxMarksPerUnit} Marks limit with ${q2Marks}/${maxMarksPerUnit} marks.`);
      } else if (assessmentPolicy.hasChoice && q2Marks !== maxMarksPerUnit) {
        issues.push(`Unit ${u.unitNumber} (Question ${u.question2Number}) has ${q2Marks}/${maxMarksPerUnit} marks assigned.`);
      }
    });
    return issues;
  }, [unitsConfig, maxMarksPerUnit, assessmentPolicy.hasChoice]);

  const [creatingPaper, setCreatingPaper] = useState(false);

  // Finalize Paper and Open Preview
  const handleFinalizeAndPreview = () => {
    // Strict threshold check: ensure no question exceeds maxMarksPerUnit
    for (const u of unitsConfig) {
      const q1Marks = u.question1Parts.reduce(
        (acc, p) =>
          acc +
          (p.selectedQuestion?.marks ||
            (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
        0
      );
      const q2Marks = u.question2Parts.reduce(
        (acc, p) =>
          acc +
          (p.selectedQuestion?.marks ||
            (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
        0
      );
      if (q1Marks > maxMarksPerUnit) {
        alert(
          `Cannot proceed: Unit ${u.unitNumber} Question ${u.question1Number} has ${q1Marks} Marks, exceeding the ${maxMarksPerUnit} Marks threshold. Please adjust sub-parts so the total does not exceed ${maxMarksPerUnit} Marks.`
        );
        return;
      }
      if (assessmentPolicy.hasChoice && q2Marks > maxMarksPerUnit) {
        alert(
          `Cannot proceed: Unit ${u.unitNumber} Question ${u.question2Number} has ${q2Marks} Marks, exceeding the ${maxMarksPerUnit} Marks threshold. Please adjust sub-parts so the total does not exceed ${maxMarksPerUnit} Marks.`
        );
        return;
      }
    }

    const paperUnits = buildPaperUnits();
    const newPaper: Omit<PaperRecord, "id" | "createdAt"> = {
      title: examTitle || `${assessmentPolicy.label} ${testNumber}`,
      subjectId: selectedSubjectId || "DS-S3IS01",
      subjectName: subjectName || "Data Structures / Data Structures and Applications",
      courseCode: courseCode || "S3IS01/3RIS02",
      semester: semester || "III Semester",
      examType: examType || "SEE",
      assessmentKind,
      assessmentVariant: assessmentKind === "TEST" ? `Test ${testNumber}` : undefined,
      hasChoice: assessmentPolicy.hasChoice,
      questionType: assessmentPolicy.questionType,
      totalMarks: totalMarks,
      duration: duration,
      date: examSession || "Aug-Sept. 2025",
      universityName: universityName || collegeHeader().institute,
      affiliationSubtext: affiliationSubtext || collegeHeader().affiliation,
      usnPrefix: usnPrefix || collegeHeader().usnPrefix,
      departmentName: departmentName || "Information Sc. and Engg.",
      degreeName: degreeName || "B.E.",
      maxMarksPerUnit: maxMarksPerUnit,
      mobilePhonesProhibited: mobilePhonesProhibited,
      instructions: [
        instruction1 || "Revealing of Identity in any form in the answer book will be treated as malpractice.",
        instruction2 || `Answer any five questions choosing one full question from each unit.`,
      ],
      requirements: [],
      units: paperUnits,
    };

    // The paper opens in the LaTeX editor for any last changes, with its questions' images.
    setCreatingPaper(true);
    createLatexPaperFromGenerated({
      examTitle: newPaper.title,
      subjectName: newPaper.subjectName,
      courseCode: newPaper.courseCode,
      semester: newPaper.semester,
      examDate: newPaper.date,
      duration: newPaper.duration,
      totalMarks: newPaper.totalMarks,
      instructions: newPaper.instructions ?? [],
      units: newPaper.units.map((unit) => ({
        unitNumber: unit.unitNumber,
        questions: unit.questions.map((question) => ({
          number: question.number,
          parts: question.parts,
          orQuestion: question.hasOr ? question.orQuestion : undefined,
        })),
      })),
    })
      .then((id) => navigate(`/latex-paper/${id}`))
      .catch((error: unknown) => alert(`Could not create the paper: ${error instanceof Error ? error.message : "server error"}`))
      .finally(() => setCreatingPaper(false));
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Semester End Exam (SEE) Builder
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build university exam papers following the <strong>1 OR 2, 3 OR 4, 5 OR 6, 7 OR 8, 9 OR 10</strong> standard format.
          </p>
        </div>

        {/* Stage Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setStage("config")}
            className={`px-3 py-1.5 rounded-md transition-all shrink-0 cursor-pointer ${
              stage === "config" ? "bg-white text-indigo-700 shadow-2xs" : "hover:text-slate-900"
            }`}
          >
            1. Exam Setup
          </button>
          <span className="text-slate-300">/</span>
          <button
            onClick={() => {
              if (unitsConfig.length === 0) initUnitsConfig();
              setStage("builder");
            }}
            className={`px-3 py-1.5 rounded-md transition-all shrink-0 cursor-pointer ${
              stage === "builder" ? "bg-white text-indigo-700 shadow-2xs" : "hover:text-slate-900"
            }`}
          >
            2. Unit & Question Builder
          </button>
          <span className="text-slate-300">/</span>
          <button
            onClick={() => setStage("review")}
            className={`px-3 py-1.5 rounded-md transition-all shrink-0 cursor-pointer ${
              stage === "review" ? "bg-white text-indigo-700 shadow-2xs" : "hover:text-slate-900"
            }`}
          >
            3. Review
          </button>
          <span className="text-slate-300">/</span>
          <button
            onClick={() => setStage("validate")}
            className={`px-3 py-1.5 rounded-md transition-all shrink-0 cursor-pointer ${
              stage === "validate" ? "bg-white text-indigo-700 shadow-2xs" : "hover:text-slate-900"
            }`}
          >
            4. Validate
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* STAGE 1: CONFIGURATION */}
      {/* ========================================================= */}
      {stage === "config" && (
        <form
          onSubmit={handleStartBuilder}
          className="space-y-6 max-w-4xl mx-auto"
        >
          {/* Main Setup Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 md:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-900">
                  Examination & Course Setup
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set academic session, course information, and evaluation marks ceiling. Official university header and instructions will be formatted automatically on the generated paper.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>{assessmentPolicy.hasChoice ? "Choice format" : "No-choice format"}</span>
              </span>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-800">Assessment type</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(["SEE", "TEST", "QUIZ"] as AssessmentKind[]).map((kind) => {
                  const policy = getAssessmentPolicy(kind);
                  return (
                    <button key={kind} type="button" onClick={() => handleAssessmentKindChange(kind)}
                      className={`rounded-lg border px-3 py-3 text-left ${assessmentKind === kind ? "border-indigo-600 bg-white shadow-sm" : "border-indigo-100 bg-white/60"}`}>
                      <span className="block text-sm font-semibold">{policy.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{policy.totalMarks} marks · {policy.hasChoice ? "choice allowed" : "no choice"} · {policy.questionType === "mcq" ? "MCQ" : "descriptive"}</span>
                    </button>
                  );
                })}
              </div>
              {assessmentKind === "TEST" && (
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="font-medium text-slate-700">Test paper</span>
                  {[1, 2].map((number) => <button key={number} type="button" onClick={() => setTestNumber(number as 1 | 2)} className={`rounded-md px-3 py-1.5 ${testNumber === number ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`}>Test {number}</button>)}
                </div>
              )}
            </div>

            {/* Section 1: Examination Session & Academic Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Examination Session & Academic Info
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Degree / Program
                  </label>
                  <input
                    type="text"
                    value={degreeName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDegreeName(val);
                      setExamTitle(`${examTerm} ${val} ${departmentName} Examinations, ${examSession}`.trim());
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    placeholder="e.g. B.E."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={departmentName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDepartmentName(val);
                      setExamTitle(`${examTerm} ${degreeName} ${val} Examinations, ${examSession}`.trim());
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    placeholder="e.g. Information Sc. and Engg."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    placeholder="e.g. III Semester"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exam Term / Session
                  </label>
                  <input
                    type="text"
                    value={examSession}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExamSession(val);
                      setExamTitle(`${examTerm} ${degreeName} ${departmentName} Examinations, ${val}`.trim());
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    placeholder="e.g. Aug-Sept. 2025"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Complete Exam Title (As printed on question paper)
                    </label>
                    <button
                      type="button"
                      onClick={() => setExamTitle(`${examTerm} ${degreeName} ${departmentName} Examinations, ${examSession}`.trim())}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      ↻ Reset to Composed Title
                    </button>
                  </div>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                    placeholder="e.g. Supplementary Semester B.E. Information Sc. and Engg. Examinations, Aug-Sept. 2025"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Course Information (Dropdown only - non-editable) */}
            <div className="space-y-3.5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Course / Subject Selection (Locked to Course Master)
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <Lock className="w-3 h-3 text-emerald-600" /> Locked to Syllabus Bank
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Course / Subject <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 shadow-2xs cursor-pointer"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.subjectId} value={sub.subjectId}>
                        {sub.courseCode} - {sub.subjectName} {sub.semester ? `(${sub.semester})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Locked Non-Editable Displays for Subject Name and Course Code */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Course / Subject Title (Printed in bold center of Question Paper)
                  </label>
                  <div className="px-3.5 py-2.5 text-sm bg-slate-50/80 border border-slate-200 rounded-lg font-bold text-slate-900 select-none flex items-center justify-between shadow-2xs">
                    <span className="truncate mr-2">{subjectName}</span>
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded shrink-0">
                      Non-editable
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Course Code (Box on top right)
                  </label>
                  <div className="px-3.5 py-2.5 text-sm bg-slate-50/80 border border-slate-200 rounded-lg font-mono font-bold text-indigo-700 uppercase select-none flex items-center justify-between shadow-2xs">
                    <span>{courseCode}</span>
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
                      Locked
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Marks, Ceilings & Duration */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Marks Allocation & Strict Unit Ceiling
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Marks */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Total Paper Marks
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">Max Marks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={assessmentKind === "SEE" ? 10 : assessmentPolicy.totalMarks}
                      max={assessmentKind === "SEE" ? 200 : assessmentPolicy.totalMarks}
                      step={5}
                      value={assessmentKind === "SEE" ? totalMarks : assessmentPolicy.totalMarks}
                      onChange={(e) => handleTotalMarksChange(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-500">Marks</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {(assessmentKind === "SEE" ? [100, 50, 75] : [assessmentPolicy.totalMarks]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleTotalMarksChange(preset)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          totalMarks === preset
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {preset}M
                      </button>
                    ))}
                  </div>
                </div>

                {/* Each Unit Max Marks */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Each Unit Max Marks
                    </label>
                    <span className="text-[11px] text-indigo-600 font-bold font-mono">Strict Ceiling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={assessmentKind === "QUIZ" ? 1 : 5}
                      max={assessmentKind === "QUIZ" ? 4 : assessmentKind === "TEST" ? 10 : 50}
                      step={1}
                      value={assessmentKind === "SEE" ? maxMarksPerUnit : assessmentKind === "TEST" ? 10 : 4}
                      onChange={(e) => handleMaxMarksPerUnitChange(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-500">M / Unit</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {(assessmentKind === "SEE" ? [20, 10, 15] : [assessmentKind === "TEST" ? 10 : 4]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleMaxMarksPerUnitChange(preset)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          maxMarksPerUnit === preset
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {preset}M
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Exam Duration
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">Time Allowed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={30}
                      max={300}
                      step={15}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value) || 180)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-500 shrink-0">Mins</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Equals <strong>{(duration / 60).toFixed(1)} Hours</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <span>Proceed to 5-Unit Builder (1 OR 2, 3 OR 4...)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* STAGE 2: 5-UNIT PAPER BUILDER (1 OR 2, 3 OR 4...) */}
      {/* ========================================================= */}
      {stage === "builder" && (
        <div className="space-y-6">
          {/* Builder Sticky Bar with Live Status */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 sticky top-4 z-20">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 text-base">
                  {subjectName} ({courseCode})
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-bold">
                  {degreeName} • {semester}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                  {paperStats.assignedSubParts} / {paperStats.totalSubParts} Selected ({paperStats.percentage}%)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                5 Units • Choice pattern (1 OR 2, 3 OR 4, 5 OR 6, 7 OR 8, 9 OR 10) • {maxMarksPerUnit} Marks per Unit
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleClearAllQuestions}
                className="px-3 py-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                title="Reset all question slots back to empty"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All Selections</span>
              </button>

              <button
                type="button"
                onClick={handleAutoFillMatching}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                title="Auto-fill empty slots using matching questions from bank"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Assign Questions</span>
              </button>

              <button
                type="button"
                onClick={() => setStage("review")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <span>Review Paper</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Unit Tabs Bar (Unit - I, Unit - II, Unit - III, Unit - IV, Unit - V, All) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
            {[1, 2, 3, 4, 5].map((uNum) => {
              const roman = ["I", "II", "III", "IV", "V"][uNum - 1];
              const q1 = (uNum - 1) * 2 + 1;
              const q2 = q1 + 1;
              const isActive = activeUnitTab === uNum;
              const unit = unitsConfig.find((u) => u.unitNumber === uNum);
              const q1Selected = unit?.question1Parts.reduce((acc, p) => acc + (p.selectedQuestion?.marks || 0), 0) || 0;
              const q2Selected = unit?.question2Parts.reduce((acc, p) => acc + (p.selectedQuestion?.marks || 0), 0) || 0;
              const isComplete = q1Selected === maxMarksPerUnit && q2Selected === maxMarksPerUnit;

              return (
                <button
                  key={uNum}
                  onClick={() => setActiveUnitTab(uNum)}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Layers className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>Unit - {roman}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isActive ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Q{q1} OR Q{q2}
                  </span>
                  {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}

            <button
              onClick={() => setActiveUnitTab(0)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeUnitTab === 0
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              View All Units
            </button>
          </div>

          {/* Units Container */}
          <div className="space-y-8">
            {unitsConfig
              .filter((u) => activeUnitTab === 0 || u.unitNumber === activeUnitTab)
              .map((unit) => {
                const roman = ["I", "II", "III", "IV", "V"][unit.unitNumber - 1];
                const q1SelectedMarks = unit.question1Parts.reduce(
                  (acc, p) =>
                    acc +
                    (p.selectedQuestion?.marks ||
                      (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
                  0
                );
                const q2SelectedMarks = unit.question2Parts.reduce(
                  (acc, p) =>
                    acc +
                    (p.selectedQuestion?.marks ||
                      (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
                  0
                );

                const q1OtherMarksForPart = (partId: string) =>
                  unit.question1Parts
                    .filter((p) => p.id !== partId)
                    .reduce(
                      (acc, p) =>
                        acc +
                        (p.selectedQuestion?.marks ||
                          (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
                      0
                    );

                const q2OtherMarksForPart = (partId: string) =>
                  unit.question2Parts
                    .filter((p) => p.id !== partId)
                    .reduce(
                      (acc, p) =>
                        acc +
                        (p.selectedQuestion?.marks ||
                          (typeof p.marks === "number" ? p.marks : Number(p.marks) || 0)),
                      0
                    );

                return (
                  <div
                    key={unit.unitNumber}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    {/* Unit Header */}
                    <div className="bg-slate-100/90 px-5 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
                          U{unit.unitNumber}
                        </span>
                        <div>
                          <h2 className="text-base font-bold text-slate-900">
                            Unit - {roman}
                          </h2>
                          <p className="text-xs text-slate-500">
                            Answer Question {unit.question1Number} OR Question {unit.question2Number} ({maxMarksPerUnit} Marks each)
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 ${
                            q1SelectedMarks === maxMarksPerUnit
                              ? "bg-emerald-100 text-emerald-800"
                              : q1SelectedMarks > maxMarksPerUnit
                              ? "bg-rose-100 text-rose-800 border border-rose-300 font-bold"
                              : q1SelectedMarks > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {q1SelectedMarks === maxMarksPerUnit && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {q1SelectedMarks > maxMarksPerUnit && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                          <span>Q{unit.question1Number}: {q1SelectedMarks}/{maxMarksPerUnit}M</span>
                        </span>

                        <span className="text-slate-400 font-bold">OR</span>

                        <span
                          className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 ${
                            q2SelectedMarks === maxMarksPerUnit
                              ? "bg-emerald-100 text-emerald-800"
                              : q2SelectedMarks > maxMarksPerUnit
                              ? "bg-rose-100 text-rose-800 border border-rose-300 font-bold"
                              : q2SelectedMarks > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {q2SelectedMarks === maxMarksPerUnit && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {q2SelectedMarks > maxMarksPerUnit && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                          <span>Q{unit.question2Number}: {q2SelectedMarks}/{maxMarksPerUnit}M</span>
                        </span>
                      </div>
                    </div>

                    {/* Exceeds maxMarksPerUnit Threshold Warning Banner */}
                    {(q1SelectedMarks > maxMarksPerUnit || q2SelectedMarks > maxMarksPerUnit) && (
                      <div className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 text-xs text-rose-800 flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          <strong>Marks Threshold Exceeded:</strong> One or more questions in Unit {unit.unitNumber} exceed {maxMarksPerUnit} Marks. Total marks for each question must not exceed {maxMarksPerUnit} Marks.
                        </span>
                      </div>
                    )}

                    <div className="p-4 sm:p-6 space-y-6">
                      {/* ========================================= */}
                      {/* QUESTION 1 (e.g. Q1, Q3, Q5, Q7, Q9) */}
                      {/* ========================================= */}
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 font-mono">
                              Question {unit.question1Number}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              (Sub-parts: {unit.question1Parts.map((p) => p.label).join(", ")})
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                q1SelectedMarks === maxMarksPerUnit
                                  ? "bg-emerald-100 text-emerald-800"
                                  : q1SelectedMarks > maxMarksPerUnit
                                  ? "bg-rose-100 text-rose-800 font-bold border border-rose-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {q1SelectedMarks}/{maxMarksPerUnit} Marks {q1SelectedMarks > maxMarksPerUnit ? `(Exceeds ${maxMarksPerUnit}M limit!)` : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {unit.question1Parts.some((p) => p.selectedQuestion) && (
                              <button
                                type="button"
                                onClick={() => handleClearSingleQuestion(unit.unitNumber, unit.question1Number)}
                                className="text-[11px] text-slate-500 hover:text-rose-600 px-2 py-0.5 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                Clear Q{unit.question1Number}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={q1SelectedMarks >= maxMarksPerUnit}
                              onClick={() => handleAddSubPart(unit.unitNumber, unit.question1Number)}
                              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                                q1SelectedMarks >= maxMarksPerUnit
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                  : "text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
                              }`}
                              title={
                                q1SelectedMarks >= maxMarksPerUnit
                                  ? `Cannot add sub-part: Question ${unit.question1Number} has reached the maximum ${maxMarksPerUnit} Marks threshold.`
                                  : "Add another sub-part"
                              }
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Sub-part</span>
                            </button>
                          </div>
                        </div>

                        {/* Sub-parts List for Q1 */}
                        <div className="space-y-3">
                          {unit.question1Parts.map((part) => {
                            const maxMarksAllowed = Math.max(0, maxMarksPerUnit - q1OtherMarksForPart(part.id));
                            return (
                              <SubPartCard
                                key={part.id}
                                unitNum={unit.unitNumber}
                                questionNum={unit.question1Number}
                                part={part}
                                allQuestions={allQuestions}
                                selectedQuestionIds={selectedQuestionIds}
                                maxMarksAllowed={maxMarksAllowed}
                                onUpdate={(field, val) =>
                                  handleUpdatePartCriteria(
                                    unit.unitNumber,
                                    unit.question1Number,
                                    part.id,
                                    field,
                                    val
                                  )
                                }
                                onUpdateText={(newText) =>
                                  handleUpdateQuestionText(
                                    unit.unitNumber,
                                    unit.question1Number,
                                    part.id,
                                    newText
                                  )
                                }
                                onRemove={() =>
                                  handleRemoveSubPart(
                                    unit.unitNumber,
                                    unit.question1Number,
                                    part.id
                                  )
                                }
                                onOpenPicker={(mode) =>
                                  handleOpenPicker(
                                    unit.unitNumber,
                                    unit.question1Number,
                                    part.id,
                                    mode
                                  )
                                }
                                onSelectDirectly={(q) =>
                                  handleSelectDirectly(
                                    unit.unitNumber,
                                    unit.question1Number,
                                    part.id,
                                    q
                                  )
                                }
                                onClearQuestion={() =>
                                  handleClearSlotQuestion(
                                    unit.unitNumber,
                                    unit.question1Number,
                                    part.id
                                  )
                                }
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* ========================================= */}
                      {/* "OR" SEPARATOR */}
                      {/* ========================================= */}
                      <div className={`relative py-2 flex items-center justify-center ${assessmentPolicy.hasChoice ? "" : "hidden"}`}>
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t-2 border-dashed border-slate-200"></div>
                        </div>
                        <span className="relative px-4 bg-white text-sm font-extrabold text-indigo-600 uppercase tracking-widest border border-indigo-200 rounded-full py-0.5 shadow-2xs">
                          OR
                        </span>
                      </div>

                      {/* ========================================= */}
                      {/* QUESTION 2 (e.g. Q2, Q4, Q6, Q8, Q10) */}
                      {/* ========================================= */}
                      <div className={`space-y-4 ${assessmentPolicy.hasChoice ? "" : "hidden"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 font-mono">
                              Question {unit.question2Number}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              (Sub-parts: {unit.question2Parts.map((p) => p.label).join(", ")})
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                q2SelectedMarks === maxMarksPerUnit
                                  ? "bg-emerald-100 text-emerald-800"
                                  : q2SelectedMarks > maxMarksPerUnit
                                  ? "bg-rose-100 text-rose-800 font-bold border border-rose-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {q2SelectedMarks}/{maxMarksPerUnit} Marks {q2SelectedMarks > maxMarksPerUnit ? `(Exceeds ${maxMarksPerUnit}M limit!)` : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {unit.question2Parts.some((p) => p.selectedQuestion) && (
                              <button
                                type="button"
                                onClick={() => handleClearSingleQuestion(unit.unitNumber, unit.question2Number)}
                                className="text-[11px] text-slate-500 hover:text-rose-600 px-2 py-0.5 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                Clear Q{unit.question2Number}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={q2SelectedMarks >= maxMarksPerUnit}
                              onClick={() => handleAddSubPart(unit.unitNumber, unit.question2Number)}
                              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                                q2SelectedMarks >= maxMarksPerUnit
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                  : "text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
                              }`}
                              title={
                                q2SelectedMarks >= maxMarksPerUnit
                                  ? `Cannot add sub-part: Question ${unit.question2Number} has reached the maximum ${maxMarksPerUnit} Marks threshold.`
                                  : "Add another sub-part"
                              }
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Sub-part</span>
                            </button>
                          </div>
                        </div>

                        {/* Sub-parts List for Q2 */}
                        <div className="space-y-3">
                          {unit.question2Parts.map((part) => {
                            const maxMarksAllowed = Math.max(0, maxMarksPerUnit - q2OtherMarksForPart(part.id));
                            return (
                              <SubPartCard
                                key={part.id}
                                unitNum={unit.unitNumber}
                                questionNum={unit.question2Number}
                                part={part}
                                allQuestions={allQuestions}
                                selectedQuestionIds={selectedQuestionIds}
                                maxMarksAllowed={maxMarksAllowed}
                                onUpdate={(field, val) =>
                                  handleUpdatePartCriteria(
                                    unit.unitNumber,
                                    unit.question2Number,
                                    part.id,
                                    field,
                                    val
                                  )
                                }
                                onUpdateText={(newText) =>
                                  handleUpdateQuestionText(
                                    unit.unitNumber,
                                    unit.question2Number,
                                    part.id,
                                    newText
                                  )
                                }
                                onRemove={() =>
                                  handleRemoveSubPart(
                                    unit.unitNumber,
                                    unit.question2Number,
                                    part.id
                                  )
                                }
                                onOpenPicker={(mode) =>
                                  handleOpenPicker(
                                    unit.unitNumber,
                                    unit.question2Number,
                                    part.id,
                                    mode
                                  )
                                }
                                onSelectDirectly={(q) =>
                                  handleSelectDirectly(
                                    unit.unitNumber,
                                    unit.question2Number,
                                    part.id,
                                    q
                                  )
                                }
                                onClearQuestion={() =>
                                  handleClearSlotQuestion(
                                    unit.unitNumber,
                                    unit.question2Number,
                                    part.id
                                  )
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStage("config")}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Setup</span>
            </button>

            <button
              onClick={() => setStage("review")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <span>Review Complete Paper</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STAGE 3: REVIEW STAGE */}
      {/* ========================================================= */}
      {stage === "review" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Review Semester End Exam Paper
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  5 Units • Choice pattern (1 OR 2, 3 OR 4, 5 OR 6, 7 OR 8, 9 OR 10) • {paperStats.assignedSubParts}/{paperStats.totalSubParts} Sub-parts Chosen
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStage("builder")}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Edit in Builder
                </button>
                <button
                  onClick={() => setStage("validate")}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
                >
                  Validate Paper →
                </button>
              </div>
            </div>

            {/* Structured Units Review */}
            <div className="space-y-6">
              {unitsConfig.map((u) => {
                const roman = ["I", "II", "III", "IV", "V"][u.unitNumber - 1];
                const q1Marks = u.question1Parts.reduce((acc, p) => acc + (p.selectedQuestion?.marks || 0), 0);
                const q2Marks = u.question2Parts.reduce((acc, p) => acc + (p.selectedQuestion?.marks || 0), 0);

                return (
                  <div key={u.unitNumber} className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/40">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="font-bold text-sm text-slate-900">
                        Unit - {roman}
                      </span>
                      <span className="text-xs text-indigo-600 font-semibold">
                        Q{u.question1Number} ({q1Marks}M) OR Q{u.question2Number} ({q2Marks}M)
                      </span>
                    </div>

                    {/* Question 1 */}
                    <div className="space-y-2">
                      <span className="font-mono font-bold text-xs text-slate-800">
                        Question {u.question1Number}:
                      </span>
                      {u.question1Parts.map((p) => (
                        <div key={p.id} className="text-xs pl-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 last:border-b-0 pb-1.5">
                          <div className="flex-1">
                            <span className="font-bold text-slate-700 mr-2">{p.label})</span>
                            {p.selectedQuestion ? (
                              <span className="text-slate-800"><QuestionText question={p.selectedQuestion} /></span>
                            ) : (
                              <span className="text-amber-600 italic">
                                [No question selected - Planned criteria: {p.marks}M, {p.bloomLevel}, {p.co}]
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
                            <span className="font-bold text-indigo-700">{p.selectedQuestion?.marks || p.marks}M</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-blue-700">{p.selectedQuestion?.bloomLevel || p.bloomLevel}</span>
                            <span className="text-slate-400">•</span>
                            <span>{p.selectedQuestion?.co || p.co}</span>
                            <span className="text-slate-400">•</span>
                            <span>{p.selectedQuestion?.po || p.po}</span>
                            <span className="text-slate-400">•</span>
                            <span>{p.selectedQuestion?.pso || p.pso}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-center font-bold text-xs text-indigo-600 py-1">
                      --- OR ---
                    </div>

                    {/* Question 2 */}
                    <div className="space-y-2">
                      <span className="font-mono font-bold text-xs text-slate-800">
                        Question {u.question2Number}:
                      </span>
                      {u.question2Parts.map((p) => (
                        <div key={p.id} className="text-xs pl-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 last:border-b-0 pb-1.5">
                          <div className="flex-1">
                            <span className="font-bold text-slate-700 mr-2">{p.label})</span>
                            {p.selectedQuestion ? (
                              <span className="text-slate-800"><QuestionText question={p.selectedQuestion} /></span>
                            ) : (
                              <span className="text-amber-600 italic">
                                [No question selected - Planned criteria: {p.marks}M, {p.bloomLevel}, {p.co}]
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
                            <span className="font-bold text-indigo-700">{p.selectedQuestion?.marks || p.marks}M</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-blue-700">{p.selectedQuestion?.bloomLevel || p.bloomLevel}</span>
                            <span className="text-slate-400">•</span>
                            <span>{p.selectedQuestion?.co || p.co}</span>
                            <span className="text-slate-400">•</span>
                            <span>{p.selectedQuestion?.po || p.po}</span>
                            <span className="text-slate-400">•</span>
                            <span>{p.selectedQuestion?.pso || p.pso}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStage("builder")}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Builder</span>
            </button>

            <button
              onClick={() => setStage("validate")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <span>Proceed to Validation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STAGE 4: VALIDATION STAGE */}
      {/* ========================================================= */}
      {stage === "validate" && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 md:p-8 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  SEE Paper Validation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifying {totalMarks} marks total, {maxMarksPerUnit} marks/unit, and complete OBE mapping.
                </p>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  validationIssues.length === 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {validationIssues.length === 0 ? "Validation Passed" : "Needs Review"}
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Format: 1 OR 2, 3 OR 4, 5 OR 6, 7 OR 8, 9 OR 10
                </span>
                <span>5 Units Covered</span>
              </div>

              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  validationIssues.length === 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                <span className="font-semibold flex items-center gap-2">
                  {validationIssues.length === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  Question Selections Status
                </span>
                <span>
                  {paperStats.assignedSubParts}/{paperStats.totalSubParts} Sub-parts Chosen ({paperStats.percentage}%)
                </span>
              </div>

              {validationIssues.length > 0 && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5">
                  <span className="font-bold text-amber-900 text-xs block">
                    Outstanding Items:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                    {validationIssues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  OBE Attributes: All criteria mapped (BL, CO, PO, PSO)
                </span>
                <span>Complete Mapping</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setStage("builder")}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Adjust in Builder</span>
              </button>

              <button
                onClick={handleFinalizeAndPreview}
                disabled={creatingPaper}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer disabled:cursor-wait disabled:opacity-70"
              >
                <Eye className="w-4 h-4" />
                <span>{creatingPaper ? "Creating paper…" : "Open in LaTeX editor & export DOCX"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* QUESTION PICKER MODAL */}
      {/* ========================================================= */}
      {isPickerOpen && activePickerTarget && activePartItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Select Question for Q{activePickerTarget.questionNumber} ({activePartItem.label})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filtering for Unit {activePickerTarget.unitNumber} • {activePartItem.marks} Marks • {activePartItem.bloomLevel} • {activePartItem.co} • {activePartItem.po} • {activePartItem.pso}
                </p>
              </div>

              <button
                onClick={() => setIsPickerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Toggle & Search Bar inside Modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setPickerMode("filtered")}
                    className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      pickerMode === "filtered"
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Matching Criteria ({availableQuestions.length})
                  </button>
                  <button
                    onClick={() => setPickerMode("all")}
                    className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      pickerMode === "all"
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Browse All Unit {activePickerTarget.unitNumber} Questions
                  </button>
                </div>

                <span className="text-xs text-slate-500">
                  Found <strong>{availableQuestions.length}</strong> questions
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions within results..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="p-4 overflow-y-auto divide-y divide-slate-100 space-y-3">
              {availableQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <p className="font-semibold text-slate-700">No questions match exact criteria</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Click "Browse All Unit {activePickerTarget.unitNumber} Questions" to view and select any available question for this unit.
                  </p>
                  <button
                    onClick={() => setPickerMode("all")}
                    className="mt-3 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Browse All Unit {activePickerTarget.unitNumber} Questions
                  </button>
                </div>
              ) : (
                availableQuestions.map((q) => {
                  const isAlreadySelected = selectedQuestionIds.includes(q.id);
                  const exceedsBudget = q.marks > maxMarksForModal;

                  return (
                    <div
                      key={q.id}
                      className={`pt-3 first:pt-0 pb-3 flex items-start justify-between gap-4 group ${
                        exceedsBudget ? "opacity-60" : ""
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-500 text-[11px]">
                            {q.id}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                            {q.marks} Marks
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
                            {q.bloomLevel}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {q.co} · {q.po} · {q.pso}
                          </span>
                          {isAlreadySelected && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold">
                              Used in Paper
                            </span>
                          )}
                          {exceedsBudget && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
                              Exceeds 20M limit (max {maxMarksForModal}M)
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-800 leading-relaxed font-normal">
                          <QuestionText question={q} />
                        </div>
                      </div>

                      <div className="shrink-0 pt-1">
                        {isAlreadySelected ? (
                          <button
                            disabled
                            className="px-3.5 py-1.5 bg-slate-100 text-slate-400 rounded-md text-xs font-semibold cursor-not-allowed border border-slate-200"
                            title="This question is already selected in another slot in this unit or paper"
                          >
                            Already Selected
                          </button>
                        ) : exceedsBudget ? (
                          <button
                            disabled
                            className="px-3.5 py-1.5 bg-rose-50 text-rose-400 rounded-md text-xs font-semibold cursor-not-allowed border border-rose-200"
                            title={`Cannot select: Question has ${q.marks}M which exceeds the remaining allowance of ${maxMarksForModal}M for Question ${activePickerTarget.questionNumber}.`}
                          >
                            Exceeds 20M
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSelectQuestionForSlot(q)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={() => setIsPickerOpen(false)}
                className="px-4 py-1.5 border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-part Card Component with inline field selectors and dynamic real-time filtering
function SubPartCard({
  unitNum,
  questionNum,
  part,
  allQuestions,
  selectedQuestionIds,
  maxMarksAllowed,
  onUpdate,
  onUpdateText,
  onRemove,
  onOpenPicker,
  onSelectDirectly,
  onClearQuestion,
}: {
  unitNum: number;
  questionNum: number;
  part: SubPartItem;
  allQuestions: Question[];
  selectedQuestionIds: string[];
  maxMarksAllowed: number;
  onUpdate: (field: keyof SubPartItem, val: any) => void;
  onUpdateText: (newText: string) => void;
  onRemove: () => void;
  onOpenPicker: (mode: "filtered" | "all") => void;
  onSelectDirectly: (q: Question) => void;
  onClearQuestion: () => void;
}) {
  // Inline question text editing state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>(part.selectedQuestion?.text || "");

  // Synchronize edit text whenever selectedQuestion changes
  useEffect(() => {
    setEditText(part.selectedQuestion?.text || "");
    if (!part.selectedQuestion) {
      setIsEditing(false);
    }
  }, [part.selectedQuestion?.id, part.selectedQuestion?.text]);

  // Dynamically synchronized display attributes
  const displayMarks = part.selectedQuestion ? part.selectedQuestion.marks : part.marks;
  const displayBL = part.selectedQuestion ? part.selectedQuestion.bloomLevel : part.bloomLevel;
  const displayCO = part.selectedQuestion ? part.selectedQuestion.co : part.co;
  const displayPO = part.selectedQuestion ? part.selectedQuestion.po : part.po;
  const displayPSO = part.selectedQuestion ? part.selectedQuestion.pso : part.pso;

  // Exclude questions already selected in any other slot in this unit or paper
  const otherSelectedIds = useMemo(() => {
    return selectedQuestionIds.filter((id) => id !== part.selectedQuestion?.id);
  }, [selectedQuestionIds, part.selectedQuestion]);

  // Dynamically compute questions matching this sub-part's current criteria in real time
  const matchingQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (q.unit !== unitNum) return false;
      // Do not allow selecting questions already chosen in another question or OR question in this unit or paper
      if (otherSelectedIds.includes(q.id)) return false;
      // Filter out any question whose marks exceed the remaining threshold budget for this question
      if (q.marks > maxMarksAllowed && q.id !== part.selectedQuestion?.id) return false;
      if (displayMarks !== "Any" && q.marks !== Number(displayMarks)) return false;
      if (
        displayBL !== "Any" &&
        q.bloomLevel.toUpperCase() !== String(displayBL).toUpperCase()
      ) {
        return false;
      }
      if (displayCO !== "Any" && q.co.toUpperCase() !== String(displayCO).toUpperCase()) {
        return false;
      }
      if (
        displayPO !== "Any" &&
        (!q.po || !q.po.toUpperCase().includes(String(displayPO).toUpperCase()))
      ) {
        return false;
      }
      if (
        displayPSO !== "Any" &&
        (!q.pso || !q.pso.toUpperCase().includes(String(displayPSO).toUpperCase()))
      ) {
        return false;
      }
      return true;
    });
  }, [allQuestions, unitNum, otherSelectedIds, maxMarksAllowed, part.selectedQuestion, displayMarks, displayBL, displayCO, displayPO, displayPSO]);

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl border transition-all text-xs ${
        part.selectedQuestion
          ? "border-emerald-300 bg-emerald-50/25 shadow-xs"
          : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
      }`}
    >
      {/* Row 1: Criteria Selectors (Marks, BL, CO, PO, PSO) & Match Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-part label */}
          <span className="font-bold text-slate-900 font-mono text-sm w-5">
            {part.label})
          </span>

          {/* Marks */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500">M:</span>
            <select
              value={displayMarks}
              onChange={(e) =>
                onUpdate(
                  "marks",
                  e.target.value === "Any" ? "Any" : Number(e.target.value)
                )
              }
              className="px-2 py-1 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded font-bold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Any">Any M</option>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 20].map((m) => {
                const disabled = m > maxMarksAllowed && m !== displayMarks;
                return (
                  <option key={m} value={m} disabled={disabled}>
                    {m}M{disabled ? ` (max ${maxMarksAllowed}M)` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Bloom's Level */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500">BL:</span>
            <select
              value={displayBL}
              onChange={(e) => onUpdate("bloomLevel", e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded font-semibold text-blue-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Any">Any BL</option>
              {BLOOM_LEVELS.map((bl) => (
                <option key={bl.value} value={bl.value}>
                  {bl.value}
                </option>
              ))}
            </select>
          </div>

          {/* CO */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500">CO:</span>
            <select
              value={displayCO}
              onChange={(e) => onUpdate("co", e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Any">Any CO</option>
              {COURSE_OUTCOMES.map((co) => (
                <option key={co} value={co}>
                  {co}
                </option>
              ))}
            </select>
          </div>

          {/* PO */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500">PO:</span>
            <select
              value={displayPO}
              onChange={(e) => onUpdate("po", e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Any">Any PO</option>
              {PROGRAM_OUTCOMES.map((po) => (
                <option key={po} value={po}>
                  {po}
                </option>
              ))}
            </select>
          </div>

          {/* PSO */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500">PSO:</span>
            <select
              value={displayPSO}
              onChange={(e) => onUpdate("pso", e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Any">Any PSO</option>
              {PROGRAM_SPECIFIC_OUTCOMES.map((pso) => (
                <option key={pso} value={pso}>
                  {pso}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic real-time status / match badge */}
          {part.selectedQuestion ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Assigned: {part.selectedQuestion.id} ({displayMarks}M)</span>
            </span>
          ) : maxMarksAllowed <= 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              <span>0M budget remaining</span>
            </span>
          ) : matchingQuestions.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-indigo-600" />
              <span>{matchingQuestions.length} match{matchingQuestions.length > 1 ? "es" : ""} in bank</span>
            </span>
          ) : part.userModifiedCriteria ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>0 matches in bank</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
              Not assigned
            </span>
          )}
        </div>

        {/* Delete sub-part button */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors ml-auto cursor-pointer"
          title="Remove sub-part"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2: Selected Question Details OR Empty State with Fast Select Dropdown */}
      {!part.selectedQuestion ? (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Fast select dropdown */}
            <div className="flex-1 relative">
              <select
                value=""
                onChange={(e) => {
                  const q = matchingQuestions.find((mq) => mq.id === e.target.value);
                  if (q) onSelectDirectly(q);
                }}
                disabled={maxMarksAllowed <= 0 || matchingQuestions.length === 0}
                className="w-full text-xs bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-lg py-1.5 px-3 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="" disabled>
                  {maxMarksAllowed <= 0
                    ? `-- Limit reached for this question (0M remaining) --`
                    : matchingQuestions.length > 0
                    ? `-- Quick Select (${matchingQuestions.length} matching question${matchingQuestions.length > 1 ? "s" : ""} in bank) --`
                    : part.userModifiedCriteria
                    ? `-- No questions in Question Bank match these criteria (0 found) --`
                    : `-- Select a question for this slot --`}
                </option>
                {matchingQuestions.map((q) => (
                  <option key={q.id} value={q.id}>
                    [{q.id}] {q.marks}M · {q.bloomLevel} · {q.co} · {q.text.slice(0, 65)}{q.text.length > 65 ? "..." : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Button to open full browse modal */}
              <button
                type="button"
                onClick={() => onOpenPicker(matchingQuestions.length > 0 ? "filtered" : "all")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Browse Bank ({matchingQuestions.length})</span>
              </button>

              {/* Button to write custom question */}
              <button
                type="button"
                onClick={() => {
                  const defaultText = `State and explain the fundamental concepts related to question (${part.label}).`;
                  onUpdateText(defaultText);
                  setIsEditing(true);
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Write a custom question directly in this slot"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Write Custom</span>
              </button>
            </div>
          </div>

          {/* No matches alert box - ONLY shown if faculty explicitly changed filters on this slot */}
          {part.userModifiedCriteria && matchingQuestions.length === 0 && maxMarksAllowed > 0 && (
            <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>No matches in Question Bank:</strong> There are 0 questions for Unit {unitNum} matching criteria (<strong>{displayMarks !== "Any" ? `${displayMarks}M` : "Any M"}</strong>, <strong>{displayBL}</strong>, <strong>{displayCO}</strong>). Marks are taken strictly from the question bank. Please adjust your filter criteria or browse all questions for this unit.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenPicker("all")}
                className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded font-semibold text-[11px] transition-colors shrink-0 cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                Browse All Unit {unitNum}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2.5 pt-2.5 border-t border-emerald-200/80 bg-white/90 p-3 rounded-lg border border-emerald-200 flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-2xs">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {part.selectedQuestion.id}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                {displayMarks} Marks
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">
                {displayBL}
              </span>
              <span className="text-[11px] text-slate-600 font-medium">
                {displayCO} · {displayPO} · {displayPSO}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-2 mt-1">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full text-xs p-2.5 border border-indigo-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-normal leading-relaxed text-slate-800 bg-white shadow-2xs"
                  rows={3}
                  placeholder="Enter or edit question text..."
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditText(part.selectedQuestion?.text || "");
                      setIsEditing(false);
                    }}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateText(editText);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium cursor-pointer shadow-2xs"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <p
                onClick={() => setIsEditing(true)}
                className="text-xs text-slate-800 leading-relaxed font-normal hover:bg-slate-50 p-1 rounded transition-colors cursor-text group flex items-start justify-between"
                title="Click to edit question text directly"
              >
                <span><QuestionText question={part.selectedQuestion} /></span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-2 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
              title="Edit question text directly"
            >
              <Pencil className="w-3 h-3" />
              <span>{isEditing ? "Editing" : "Edit"}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenPicker("filtered")}
              className="px-2.5 py-1 text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              Change
            </button>
            <button
              type="button"
              onClick={onClearQuestion}
              className="px-2 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
              title="Clear question"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
