import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import * as XLSX from "xlsx";
import {
  Search,
  Plus,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BLOOM_LEVELS,
  COURSE_OUTCOMES,
  PROGRAM_OUTCOMES,
  PROGRAM_SPECIFIC_OUTCOMES,
  DIFFICULTY_LEVELS,
  COMMON_MARKS,
} from "../config/academicOptions";
import {
  getQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
  Question,
} from "../services/storage/questionStorage";
import { getSubjects, Subject } from "../services/storage/subjectStorage";

export function QuestionBank() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSubjectId = searchParams.get("subjectId");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnit, setFilterUnit] = useState<string>("All");
  const [filterMarks, setFilterMarks] = useState<string>("All");
  const [filterBL, setFilterBL] = useState<string>("All");
  const [filterCO, setFilterCO] = useState<string>("All");
  const [filterPO, setFilterPO] = useState<string>("All");
  const [filterPSO, setFilterPSO] = useState<string>("All");

  // Add / Edit Modal state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form Fields
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formUnit, setFormUnit] = useState<number>(1);
  const [formText, setFormText] = useState("");
  const [formMarks, setFormMarks] = useState<number>(10);
  const [formBL, setFormBL] = useState<string>("BL2");
  const [formCO, setFormCO] = useState<string>("CO1");
  const [formPO, setFormPO] = useState<string>("PO1");
  const [formPSO, setFormPSO] = useState<string>("PSO1");
  const [formDifficulty, setFormDifficulty] = useState<string>("Medium");

  // Excel Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<{
    validRows: any[];
    invalidRows: { row: number; data: any; errors: string[] }[];
  }>({ validRows: [], invalidRows: [] });
  const [importFileName, setImportFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load subjects
  useEffect(() => {
    const loadedSubs = getSubjects();
    setSubjects(loadedSubs);

    if (loadedSubs.length > 0) {
      if (urlSubjectId && loadedSubs.some((s) => s.subjectId === urlSubjectId)) {
        setSelectedSubjectId(urlSubjectId);
      } else {
        setSelectedSubjectId(loadedSubs[0].subjectId);
      }
    }
  }, [urlSubjectId]);

  // Load questions for selected subject
  const refreshQuestions = () => {
    if (selectedSubjectId) {
      setQuestions(getQuestions(selectedSubjectId));
    }
  };

  useEffect(() => {
    refreshQuestions();
  }, [selectedSubjectId]);

  const activeSubject = subjects.find(
    (s) => s.subjectId.toLowerCase() === selectedSubjectId.toLowerCase()
  );

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesText = q.text ? q.text.toLowerCase().includes(query) : false;
        const matchesId = q.id ? q.id.toLowerCase().includes(query) : false;
        if (!matchesText && !matchesId) return false;
      }
      if (filterUnit !== "All" && q.unit !== Number(filterUnit)) return false;
      if (filterMarks !== "All" && q.marks !== Number(filterMarks)) return false;
      if (filterBL !== "All" && q.bloomLevel !== filterBL) return false;
      if (filterCO !== "All" && q.co !== filterCO) return false;
      if (filterPO !== "All" && (!q.po || !q.po.includes(filterPO))) return false;
      if (filterPSO !== "All" && (!q.pso || !q.pso.includes(filterPSO))) return false;
      return true;
    });
  }, [questions, searchTerm, filterUnit, filterMarks, filterBL, filterCO, filterPO, filterPSO]);

  // Pagination State - 10 questions per page
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterUnit, filterMarks, filterBL, filterCO, filterPO, filterPSO]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredQuestions.slice(start, start + PAGE_SIZE);
  }, [filteredQuestions, currentPage]);

  // Open Add Question
  const handleOpenAdd = () => {
    setEditingQuestion(null);
    setFormSubjectId(selectedSubjectId);
    setFormUnit(1);
    setFormText("");
    setFormMarks(10);
    setFormBL("BL2");
    setFormCO("CO1");
    setFormPO("PO1");
    setFormPSO("PSO1");
    setFormDifficulty("Medium");
    setIsQuestionModalOpen(true);
  };

  // Open Edit Question
  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setFormSubjectId(q.subjectId);
    setFormUnit(q.unit);
    setFormText(q.text);
    setFormMarks(q.marks);
    setFormBL(q.bloomLevel);
    setFormCO(q.co);
    setFormPO(q.po);
    setFormPSO(q.pso);
    setFormDifficulty(q.difficulty || "Medium");
    setIsQuestionModalOpen(true);
  };

  // Save question
  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) return;

    if (editingQuestion) {
      updateQuestion(editingQuestion.id, {
        subjectId: formSubjectId,
        unit: Number(formUnit),
        text: formText.trim(),
        marks: Number(formMarks),
        bloomLevel: formBL,
        co: formCO,
        po: formPO,
        pso: formPSO,
        difficulty: formDifficulty,
      });
    } else {
      addQuestion({
        subjectId: formSubjectId,
        unit: Number(formUnit),
        text: formText.trim(),
        marks: Number(formMarks),
        bloomLevel: formBL,
        co: formCO,
        po: formPO,
        pso: formPSO,
        difficulty: formDifficulty,
      });
    }

    setIsQuestionModalOpen(false);
    refreshQuestions();
  };

  // Delete question
  const handleDeleteQuestion = (id: string) => {
    if (confirm(`Delete question ${id}? This cannot be undone.`)) {
      deleteQuestion(id);
      refreshQuestions();
    }
  };

  // Excel file parsing and validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const valid: any[] = [];
        const invalid: { row: number; data: any; errors: string[] }[] = [];

        rawJson.forEach((row, index) => {
          const rowNum = index + 2; // header is row 1
          const errors: string[] = [];

          // Standardize keys (case insensitive lookup)
          const findKey = (name: string) => {
            const found = Object.keys(row).find(
              (k) => k.trim().toLowerCase() === name.toLowerCase()
            );
            return found ? String(row[found]).trim() : "";
          };

          const text = findKey("Question") || findKey("Question Text") || findKey("Text");
          const unitRaw = findKey("Unit");
          const marksRaw = findKey("Marks");
          let bl = findKey("BL") || findKey("Bloom Level") || findKey("Blooms Level");
          let co = findKey("CO") || findKey("Course Outcome");
          let po = findKey("PO") || findKey("Program Outcome");
          let pso = findKey("PSO") || findKey("Program Specific Outcome");
          const difficulty = findKey("Difficulty") || "Medium";

          if (!text) errors.push("Missing question text");

          const unitNum = parseInt(unitRaw, 10);
          if (isNaN(unitNum) || unitNum < 1 || unitNum > (activeSubject?.numberOfUnits || 5)) {
            errors.push(`Invalid unit (must be 1-${activeSubject?.numberOfUnits || 5})`);
          }

          const marksNum = parseInt(marksRaw, 10);
          if (isNaN(marksNum) || marksNum <= 0) {
            errors.push("Invalid marks (must be a positive number)");
          }

          // Normalize BL
          if (bl && !bl.toUpperCase().startsWith("BL")) {
            bl = `BL${bl}`;
          }
          if (!bl || !BLOOM_LEVELS.some((b) => b.value === bl.toUpperCase())) {
            errors.push(`Invalid Bloom's Level (choose from BL1-BL6)`);
          }

          // Normalize CO
          if (co && !co.toUpperCase().startsWith("CO")) {
            co = `CO${co}`;
          }
          if (!co || !COURSE_OUTCOMES.includes(co.toUpperCase() as any)) {
            errors.push(`Invalid CO (choose from CO1-CO5)`);
          }

          // Normalize PO
          if (po && !po.toUpperCase().startsWith("PO")) {
            po = `PO${po}`;
          }
          if (!po || !PROGRAM_OUTCOMES.includes(po.toUpperCase() as any)) {
            errors.push(`Invalid PO (choose from PO1-PO12)`);
          }

          // Normalize PSO
          if (pso && !pso.toUpperCase().startsWith("PSO")) {
            pso = `PSO${pso}`;
          }
          if (!pso || !PROGRAM_SPECIFIC_OUTCOMES.includes(pso.toUpperCase() as any)) {
            errors.push(`Invalid PSO (choose from PSO1-PSO3)`);
          }

          if (errors.length > 0) {
            invalid.push({ row: rowNum, data: row, errors });
          } else {
            valid.push({
              subjectId: selectedSubjectId,
              text,
              unit: unitNum,
              marks: marksNum,
              bloomLevel: bl.toUpperCase(),
              co: co.toUpperCase(),
              po: po.toUpperCase(),
              pso: pso.toUpperCase(),
              difficulty: difficulty || "Medium",
            });
          }
        });

        setImportRows({ validRows: valid, invalidRows: invalid });
      } catch (err) {
        alert("Failed to parse file. Please upload a valid Excel (.xlsx) or CSV file.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    if (importRows.validRows.length === 0) return;
    importQuestions(importRows.validRows);
    setIsImportModalOpen(false);
    setImportRows({ validRows: [], invalidRows: [] });
    setImportFileName("");
    refreshQuestions();
  };

  const downloadSampleTemplate = () => {
    const templateData = [
      {
        Question: "Explain stack operations with suitable diagram and algorithms.",
        Unit: 1,
        Marks: 10,
        BL: "BL2",
        CO: "CO1",
        PO: "PO1",
        PSO: "PSO1",
        Difficulty: "Medium",
      },
      {
        Question: "Convert the following infix expression to postfix using stack: (A+B)*C.",
        Unit: 1,
        Marks: 8,
        BL: "BL3",
        CO: "CO1",
        PO: "PO2",
        PSO: "PSO1",
        Difficulty: "Medium",
      },
      {
        Question: "Differentiate singly linked list and doubly linked list with diagrams.",
        Unit: 2,
        Marks: 6,
        BL: "BL2",
        CO: "CO2",
        PO: "PO1",
        PSO: "PSO1",
        Difficulty: "Easy",
      },
      {
        Question: "Construct an AVL Tree with given elements and show tree rotations.",
        Unit: 3,
        Marks: 10,
        BL: "BL4",
        CO: "CO3",
        PO: "PO2",
        PSO: "PSO2",
        Difficulty: "Hard",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QuestionBankTemplate");
    XLSX.writeFile(wb, "QPGen_Question_Bank_Template.xlsx");
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Question Bank
            </h1>
            {activeSubject && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold font-mono">
                {activeSubject.courseCode}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Curate, organize, and filter syllabus questions mapped with Outcome-Based Education (OBE) criteria.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              setImportRows({ validRows: [], invalidRows: [] });
              setImportFileName("");
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Subject Selection Tabs / Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Select Course:
          </span>
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setSearchParams({ subjectId: e.target.value });
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          >
            {subjects.map((sub) => (
              <option key={sub.subjectId} value={sub.subjectId}>
                {sub.courseCode} - {sub.subjectName}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total in repository: <strong className="text-slate-800">{questions.length}</strong> questions
        </div>
      </div>

      {/* Filter and Search Bar (Dense CSES / Academic Spreadsheet Style) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search question text or question ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {/* Unit */}
            <div>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">Unit: All</option>
                {Array.from(
                  { length: activeSubject?.numberOfUnits || 5 },
                  (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Unit {i + 1}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Marks */}
            <div>
              <select
                value={filterMarks}
                onChange={(e) => setFilterMarks(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">Marks: All</option>
                {COMMON_MARKS.map((m) => (
                  <option key={m} value={m}>
                    {m} Marks
                  </option>
                ))}
              </select>
            </div>

            {/* BL */}
            <div>
              <select
                value={filterBL}
                onChange={(e) => setFilterBL(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">BL: All</option>
                {BLOOM_LEVELS.map((bl) => (
                  <option key={bl.value} value={bl.value}>
                    {bl.label} ({bl.name})
                  </option>
                ))}
              </select>
            </div>

            {/* CO */}
            <div>
              <select
                value={filterCO}
                onChange={(e) => setFilterCO(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">CO: All</option>
                {COURSE_OUTCOMES.map((co) => (
                  <option key={co} value={co}>
                    {co}
                  </option>
                ))}
              </select>
            </div>

            {/* PO */}
            <div>
              <select
                value={filterPO}
                onChange={(e) => setFilterPO(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">PO: All</option>
                {PROGRAM_OUTCOMES.map((po) => (
                  <option key={po} value={po}>
                    {po}
                  </option>
                ))}
              </select>
            </div>

            {/* PSO */}
            <div>
              <select
                value={filterPSO}
                onChange={(e) => setFilterPSO(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">PSO: All</option>
                {PROGRAM_SPECIFIC_OUTCOMES.map((pso) => (
                  <option key={pso} value={pso}>
                    {pso}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Matched <strong>{filteredQuestions.length}</strong> of {questions.length} questions
          </span>
          {(filterUnit !== "All" ||
            filterMarks !== "All" ||
            filterBL !== "All" ||
            filterCO !== "All" ||
            filterPO !== "All" ||
            filterPSO !== "All" ||
            searchTerm) && (
            <button
              onClick={() => {
                setFilterUnit("All");
                setFilterMarks("All");
                setFilterBL("All");
                setFilterCO("All");
                setFilterPO("All");
                setFilterPSO("All");
                setSearchTerm("");
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Dense CSES/Academic Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 w-16">ID</th>
                <th className="py-2.5 px-3 min-w-[280px]">Question Statement</th>
                <th className="py-2.5 px-2.5 w-16 text-center">Unit</th>
                <th className="py-2.5 px-2.5 w-16 text-center">Marks</th>
                <th className="py-2.5 px-2 w-16 text-center">BL</th>
                <th className="py-2.5 px-2 w-16 text-center">CO</th>
                <th className="py-2.5 px-2 w-16 text-center">PO</th>
                <th className="py-2.5 px-2 w-16 text-center">PSO</th>
                <th className="py-2.5 px-2 w-20 text-center">Difficulty</th>
                <th className="py-2.5 px-3 w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <p className="font-medium text-slate-700">No questions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try resetting your filters or add a question to this subject.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedQuestions.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50/80 transition-colors group align-middle"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-600 text-[11px]">
                      {q.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 text-xs font-normal leading-relaxed">
                      {q.text}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-slate-700 font-medium">
                      U{q.unit}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-bold text-indigo-700">
                      {q.marks}M
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                        {q.bloomLevel}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-700 font-semibold">
                      {q.co}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600 text-[11px]">
                      {q.po}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600 text-[11px]">
                      {q.pso}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          q.difficulty === "Easy"
                            ? "bg-emerald-50 text-emerald-700"
                            : q.difficulty === "Hard"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {q.difficulty || "Medium"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(q)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="Edit Question"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - 10 questions per page */}
        {filteredQuestions.length > 0 && (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Showing{" "}
              <strong className="text-slate-800">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-800">
                {Math.min(currentPage * PAGE_SIZE, filteredQuestions.length)}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-800">
                {filteredQuestions.length}
              </strong>{" "}
              questions (10 per page)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-7 h-7 px-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-base">
                {editingQuestion ? `Edit Question (${editingQuestion.id})` : "Add Question"}
              </h2>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Subject Course
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.subjectId} value={s.subjectId}>
                        {s.courseCode} - {s.subjectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Unit
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {Array.from(
                      { length: activeSubject?.numberOfUnits || 5 },
                      (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Unit {i + 1}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Question Statement <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type the full exam question statement here..."
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all leading-relaxed"
                />
              </div>

              {/* OBE Criteria Grid */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-3">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Academic & OBE Mapping
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Marks
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={formMarks}
                      onChange={(e) => setFormMarks(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bloom Level
                    </label>
                    <select
                      value={formBL}
                      onChange={(e) => setFormBL(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      {BLOOM_LEVELS.map((bl) => (
                        <option key={bl.value} value={bl.value}>
                          {bl.value} ({bl.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Course Outcome
                    </label>
                    <select
                      value={formCO}
                      onChange={(e) => setFormCO(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      {COURSE_OUTCOMES.map((co) => (
                        <option key={co} value={co}>
                          {co}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Program Outcome
                    </label>
                    <select
                      value={formPO}
                      onChange={(e) => setFormPO(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      {PROGRAM_OUTCOMES.map((po) => (
                        <option key={po} value={po}>
                          {po}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prog. Spec. (PSO)
                    </label>
                    <select
                      value={formPSO}
                      onChange={(e) => setFormPSO(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      {PROGRAM_SPECIFIC_OUTCOMES.map((pso) => (
                        <option key={pso} value={pso}>
                          {pso}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    className="w-full max-w-xs px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {DIFFICULTY_LEVELS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  {editingQuestion ? "Save Question" : "Add to Question Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal with Validation Preview */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-900 text-base">
                  Import Questions via Excel / CSV
                </h2>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Selected Subject: <span className="text-indigo-600 font-mono">{activeSubject?.courseCode}</span> - {activeSubject?.subjectName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Excel columns required: <strong>Question, Unit, Marks, BL, CO, PO, PSO, Difficulty</strong>
                  </p>
                </div>
                <button
                  onClick={downloadSampleTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-md text-xs font-medium text-slate-700 transition-colors shadow-2xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  {importFileName ? importFileName : "Upload your Excel spreadsheet (.xlsx, .xls) or CSV file"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click to browse your local file system
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excelFileInput"
                />
                <label
                  htmlFor="excelFileInput"
                  className="mt-3 inline-block px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-medium cursor-pointer transition-colors"
                >
                  Browse File
                </label>
              </div>

              {/* Pre-Import Validation Status */}
              {(importRows.validRows.length > 0 || importRows.invalidRows.length > 0) && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Validation Summary
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-800">
                          {importRows.validRows.length} Valid Questions
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          Ready to be added to question bank
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-rose-800">
                          {importRows.invalidRows.length} Invalid Rows
                        </p>
                        <p className="text-[11px] text-rose-700">
                          {importRows.invalidRows.length > 0
                            ? "Will be skipped until fixed"
                            : "No issues detected"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Invalid Rows Listing */}
                  {importRows.invalidRows.length > 0 && (
                    <div className="border border-rose-200 rounded-lg p-3 bg-rose-50/50 space-y-2 max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-rose-800">
                        Row Errors Detail:
                      </p>
                      {importRows.invalidRows.map((inv, idx) => (
                        <div key={idx} className="text-xs text-rose-700 space-y-0.5">
                          <strong>Row {inv.row}:</strong> {inv.errors.join("; ")}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50">
              <span className="text-xs text-slate-500">
                {importRows.validRows.length} question(s) will be imported
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importRows.validRows.length === 0}
                  onClick={handleConfirmImport}
                  className="px-4 py-2 bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  Import {importRows.validRows.length} Valid Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
