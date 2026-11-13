import { useState, useEffect } from "react";
import { collegeHeader } from "../services/dataStore";
import { Link } from "react-router";
import { Eye, Download, Trash2, Clock, Search, FileText, Sparkles, Sigma, Pencil } from "lucide-react";
import { getPapers, deletePaper, PaperRecord } from "../services/storage/paperStorage";
import {
  getLatexPapers,
  deleteLatexPaper,
  listImages,
  sourceWithHeaderCommands,
  LatexPaperRecord,
} from "../services/storage/latexPaperStorage";
import { downloadLatexDocx } from "../latex/docxExport";
import { generateQuestionPaperDOCX, generateSamplePaper } from "../utils/docxGenerator";

export function History() {
  const [papers, setPapers] = useState<PaperRecord[]>([]);
  const [latexPapers, setLatexPapers] = useState<LatexPaperRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");

  const refreshList = () => {
    setPapers(getPapers());
    setLatexPapers(getLatexPapers());
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete this paper record: "${title}"?`)) {
      deletePaper(id);
      refreshList();
    }
  };

  const handleDownloadLatexDocx = async (paper: LatexPaperRecord) => {
    try {
      const stored = await listImages(paper.id);
      await downloadLatexDocx(
        sourceWithHeaderCommands(paper),
        Object.fromEntries(stored.map((image) => [image.name, image.blob]))
      );
    } catch {
      alert("Could not create the Word file for this paper.");
    }
  };

  const handleDeleteLatex = async (paper: LatexPaperRecord) => {
    if (!confirm(`Delete the LaTeX paper "${paper.subjectName}" and its images? This cannot be undone.`)) return;
    await deleteLatexPaper(paper.id);
    refreshList();
  };

  const handleDownloadDOCX = (paper: PaperRecord) => {
    if (paper.units && paper.units.length > 0) {
      const mappedUnits: any[] = paper.units.map((u) => ({
        unitNumber: u.unitNumber,
        name: u.name,
        content: u.questions.map((q) => {
          if (q.hasOr && q.orQuestion) {
            return {
              questions: [
                { number: q.number, parts: q.parts },
                { number: q.orQuestion.number, parts: q.orQuestion.parts },
              ],
            };
          }
          return { number: q.number, parts: q.parts };
        }),
      }));

      generateQuestionPaperDOCX({
        universityName: paper.universityName || collegeHeader().institute,
        affiliationSubtext: paper.affiliationSubtext || collegeHeader().affiliation,
        examTitle: paper.title || "Supplementary Semester B.E. Information Sc. and Engg. Examinations, Aug-Sept. 2025",
        program: paper.degreeName || "B.E.",
        departmentName: paper.departmentName || "Information Sc. and Engg.",
        subjectName: paper.subjectName,
        subjectCode: paper.courseCode,
        date: paper.date || "Aug-Sept. 2025",
        time: `${Math.floor((paper.duration || 180) / 60)} Hours`,
        maxMarks: `${paper.totalMarks || 100}`,
        usnPrefix: paper.usnPrefix || collegeHeader().usnPrefix,
        mobilePhonesProhibited: paper.mobilePhonesProhibited,
        instructions: paper.instructions || [
          "Revealing of Identity in any form in the answer book will be treated as malpractice.",
          "Answer any five questions choosing one full question from each unit.",
        ],
        units: mappedUnits,
      });
    } else {
      generateSamplePaper();
    }
  };

  const filteredPapers = papers.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.subjectName.toLowerCase().includes(q) ||
      p.courseCode.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterType !== "All" && p.examType !== filterType) return false;
    return true;
  });

  const filteredLatexPapers = latexPapers.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.subjectName.toLowerCase().includes(q) ||
      p.courseCode.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Paper History & Archive
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access, preview, and download previously generated examination papers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to="/latex-paper"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:border-indigo-300 hover:text-indigo-600 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Sigma className="w-4 h-4" />
            <span>LaTeX Paper</span>
          </Link>
          <Link
            to="/generate"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>New Paper</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by subject, code, or paper title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Exam:</span>
          <span className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-200 rounded-md font-semibold text-slate-800">
            Semester End Examinations (SEE)
          </span>
        </div>
      </div>

      {/* Dense CSES / Modern Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Subject & Code</th>
                <th className="py-3 px-3 text-center">Exam Type</th>
                <th className="py-3 px-3 text-center">Date</th>
                <th className="py-3 px-3 text-center">Max Marks</th>
                <th className="py-3 px-3 text-center">Duration</th>
                <th className="py-3 px-3 text-center">Questions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLatexPapers.map((paper) => (
                <tr key={paper.id} className="hover:bg-slate-50/80 transition-colors group align-middle">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                        <Sigma className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">{paper.subjectName}</p>
                        <span className="font-mono text-[11px] text-slate-500">
                          {[paper.courseCode, paper.semester].filter(Boolean).join(" • ") || paper.title}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold text-[11px]">
                      LaTeX
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">
                    {paper.date || new Date(paper.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-indigo-700">{paper.totalMarks} Marks</span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">{paper.duration} min</td>
                  <td className="py-3 px-3 text-center text-slate-400">—</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/latex-paper/${paper.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded transition-colors shadow-2xs"
                        title="View and edit this LaTeX paper"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>View / Edit</span>
                      </Link>
                      <button
                        onClick={() => void handleDownloadLatexDocx(paper)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                        title="Download Word Document (.docx)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>DOCX</span>
                      </button>
                      <button
                        onClick={() => handleDeleteLatex(paper)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Paper"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPapers.length === 0 && filteredLatexPapers.length > 0 ? null : filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No question papers found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search
                        ? "Try clearing your search filters."
                        : "Papers you build in Generate Paper will be saved here."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPapers.map((paper) => {
                  const questionsCount =
                    paper.requirements?.length ||
                    paper.units?.reduce(
                      (acc, u) =>
                        acc +
                        u.questions.reduce(
                          (qAcc, q) =>
                            qAcc + (q.hasOr && q.orQuestion ? 2 : 1),
                          0
                        ),
                      0
                    ) ||
                    10;

                  return (
                    <tr
                      key={paper.id}
                      className="hover:bg-slate-50/80 transition-colors group align-middle"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-xs">
                              {paper.subjectName}
                            </p>
                            <span className="font-mono text-[11px] text-slate-500">
                              {paper.courseCode} • {paper.semester || "Semester 3"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {paper.examType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {paper.date || "Recent"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-indigo-700">
                          {paper.totalMarks} Marks
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {paper.duration} min
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium text-[11px]">
                          {questionsCount} Qs
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/preview/${paper.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded transition-colors shadow-2xs"
                            title="View / Preview Paper"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Link>

                          <button
                            onClick={() => handleDownloadDOCX(paper)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                            title="Download Word Document (.docx)"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>DOCX</span>
                          </button>

                          <button
                            onClick={() => handleDelete(paper.id, paper.title)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Paper"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
