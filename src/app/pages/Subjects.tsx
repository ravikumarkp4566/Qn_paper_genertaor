import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Database,
  Layers,
  Sparkles,
  X,
  Search,
} from "lucide-react";
import {
  getSubjects,
  saveSubject,
  updateSubject,
  deleteSubject,
  Subject,
} from "../services/storage/subjectStorage";
import { getQuestions } from "../services/storage/questionStorage";

export function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form fields
  const [subjectName, setSubjectName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [semester, setSemester] = useState("Semester 3");
  const [numberOfUnits, setNumberOfUnits] = useState(5);
  const [description, setDescription] = useState("");

  const refreshList = () => {
    setSubjects(getSubjects());
  };

  useEffect(() => {
    refreshList();
  }, []);

  const openAddModal = () => {
    setEditingSubject(null);
    setSubjectName("");
    setCourseCode("");
    setSemester("Semester 3");
    setNumberOfUnits(5);
    setDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setSubjectName(sub.subjectName);
    setCourseCode(sub.courseCode);
    setSemester(sub.semester);
    setNumberOfUnits(sub.numberOfUnits || 5);
    setDescription(sub.description || "");
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !courseCode.trim()) return;

    if (editingSubject) {
      updateSubject(editingSubject.subjectId, {
        subjectName: subjectName.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        semester: semester.trim(),
        numberOfUnits: Number(numberOfUnits),
        description: description.trim(),
      });
    } else {
      saveSubject({
        subjectId: courseCode.trim().toUpperCase(),
        subjectName: subjectName.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        semester: semester.trim(),
        numberOfUnits: Number(numberOfUnits),
        description: description.trim(),
      });
    }

    setIsModalOpen(false);
    refreshList();
  };

  const handleDelete = (subjectId: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} (${subjectId})?`)) {
      deleteSubject(subjectId);
      refreshList();
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.subjectName.toLowerCase().includes(q) ||
      s.courseCode.toLowerCase().includes(q) ||
      s.semester.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Curriculum Subjects
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your courses, unit configurations, and linked question repositories.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subjects by name, code, or semester..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Showing {filteredSubjects.length} of {subjects.length} subjects
        </p>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSubjects.map((sub) => {
          const qCount = getQuestions(sub.subjectId).length;

          return (
            <div
              key={sub.subjectId}
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-mono text-xs font-semibold tracking-wide">
                    {sub.courseCode}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(sub)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                      title="Edit Subject"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.subjectId, sub.subjectName)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-1">
                  {sub.subjectName}
                </h3>

                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 min-h-[32px]">
                  {sub.description || "Comprehensive syllabus modules and academic evaluation framework."}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sub.semester}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sub.numberOfUnits} Units</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  to={`/question-bank?subjectId=${sub.subjectId}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{qCount} Questions</span>
                </Link>

                <Link
                  to={`/generate?subjectId=${sub.subjectId}`}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Generate</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800">No subjects found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {search
              ? "No subjects matched your search term. Try adjusting your query."
              : "Get started by adding your first academic course."}
          </p>
          {!search && (
            <button
              onClick={openAddModal}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              + Add First Subject
            </button>
          )}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-base">
                {editingSubject ? "Edit Subject" : "Add New Subject"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Course Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS201"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={`Semester ${s}`}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Number of Units
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={numberOfUnits}
                  onChange={(e) => setNumberOfUnits(parseInt(e.target.value) || 5)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Default standard university syllabus is 5 units.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description / Syllabus Scope (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief overview of course modules..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  {editingSubject ? "Save Changes" : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
