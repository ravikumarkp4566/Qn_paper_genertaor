import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  FileText,
  BookOpen,
  Database,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";
import { getPapers, PaperRecord } from "../services/storage/paperStorage";
import { getSubjects, Subject } from "../services/storage/subjectStorage";
import { getQuestions } from "../services/storage/questionStorage";

export function Dashboard() {
  const [papers, setPapers] = useState<PaperRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  useEffect(() => {
    const loadedPapers = getPapers();
    const loadedSubjects = getSubjects();
    const allQuestions = getQuestions();

    setPapers(loadedPapers);
    setSubjects(loadedSubjects);
    setTotalQuestions(allQuestions.length);
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Faculty Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, Dr. Faculty. Manage subjects, question banks, and build outcome-based exam papers.
          </p>
        </div>
        <div>
          <Link
            to="/generate"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Paper</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Papers
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-1.5">{papers.length}</p>
            <p className="text-xs text-slate-400 mt-1">Generated & archived</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Subjects
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-1.5">{subjects.length}</p>
            <p className="text-xs text-slate-400 mt-1">Active curriculum courses</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Questions
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-1.5">{totalQuestions}</p>
            <p className="text-xs text-slate-400 mt-1">In question banks with BL/CO/PO</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Papers */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h2 className="font-semibold text-slate-900 text-base">Recent Papers</h2>
            </div>
            <Link
              to="/history"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {papers.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No papers generated yet. Click "Generate Paper" to start.
              </div>
            ) : (
              papers.slice(0, 4).map((paper) => (
                <div
                  key={paper.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {paper.subjectName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {paper.courseCode}
                      </span>
                      <span>•</span>
                      <span>{paper.examType}</span>
                      <span>•</span>
                      <span>{paper.date || "Recent"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md">
                      {paper.totalMarks} Marks
                    </span>
                    <Link
                      to={`/preview/${paper.id}`}
                      className="text-xs font-medium text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded px-2.5 py-1 transition-colors"
                    >
                      Preview
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My Subjects */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600" />
              <h2 className="font-semibold text-slate-900 text-base">My Subjects</h2>
            </div>
            <Link
              to="/subjects"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Manage Subjects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {subjects.slice(0, 4).map((sub) => {
              const qCount = getQuestions(sub.subjectId).length;
              return (
                <div
                  key={sub.subjectId}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {sub.subjectName}
                      </p>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {sub.courseCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>{sub.semester}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {sub.numberOfUnits} Units
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/question-bank?subjectId=${sub.subjectId}`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-colors"
                    >
                      {qCount} Questions
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
