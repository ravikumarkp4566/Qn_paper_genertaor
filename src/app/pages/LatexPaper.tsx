import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type React from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  AlertTriangle, ArrowLeft, Check, CodeXml, Columns2, FileText, Heading, Maximize2, Minimize2,
  Save, Trash2,
} from "lucide-react";
import { durationToMinutes, findMetaRange, findSourceRange, parseLatex, type PaperMeta, type SourceRange } from "../latex/parser";
import { LatexRenderer } from "../latex/LatexRenderer";
import { BOLD, ITALIC, LatexToolbar, UNDERLINE, type ToolbarCommand } from "../latex/LatexToolbar";
import {
  applyEdit, indentEdit, snippetEdit, toggleCommentEdit, tokenizeLatex, type Snippet, type TokenKind,
} from "../latex/editorCommands";
import { PaperSheetHeader } from "../latex/PaperSheetHeader";
import { HEADER_COMMANDS_TEMPLATE, INSTITUTE_COMMANDS_TEMPLATE, SAMPLE_LATEX_SOURCE } from "../latex/sampleSource";
import {
  deleteImage,
  deleteImagesForPaper,
  getLatexPaperById,
  listImages,
  newLatexPaperId,
  putImage,
  saveLatexPaper,
  type LatexPaperRecord,
} from "../services/storage/latexPaperStorage";

interface EditorImage {
  name: string;
  url: string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ViewMode = "editor" | "split" | "paper";
const VIEW_MODES: { mode: ViewMode; label: string; icon: typeof CodeXml }[] = [
  { mode: "editor", label: "LaTeX only", icon: CodeXml },
  { mode: "split", label: "Side by side", icon: Columns2 },
  { mode: "paper", label: "Paper only", icon: FileText },
];

/** Text metrics shared by the editor and the highlight layer behind it; they must match exactly. */
const EDITOR_TEXT_CLASS =
  "absolute inset-0 h-full w-full overflow-y-scroll whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed";

const TOKEN_CLASS: Record<TokenKind, string> = {
  text: "text-slate-900",
  command: "text-indigo-700",
  comment: "text-slate-400",
  math: "text-emerald-700",
  brace: "text-slate-500",
};

/**
 * The visible text of the editor: the source with LaTeX colouring, plus the
 * range found from a click on the paper marked in yellow. The textarea on top
 * of it is transparent and only provides the caret, selection and typing.
 */
function HighlightedSource({
  source,
  mark,
  markRef,
}: {
  source: string;
  mark: SourceRange | null;
  markRef: React.RefObject<HTMLElement | null>;
}) {
  const tokens = useMemo(() => tokenizeLatex(source), [source]);
  const pieces: React.ReactNode[] = [];
  let markAttached = false;
  tokens.forEach((token, index) => {
    // Split each token where the yellow mark starts and ends.
    const cuts = [token.start, token.end];
    if (mark) for (const edge of mark) if (edge > token.start && edge < token.end) cuts.push(edge);
    cuts.sort((a, b) => a - b);
    for (let k = 0; k < cuts.length - 1; k++) {
      const from = cuts[k];
      const to = cuts[k + 1];
      const text = source.slice(from, to);
      const marked = mark !== null && from >= mark[0] && to <= mark[1];
      const key = `${index}-${k}`;
      if (!marked) {
        pieces.push(
          token.kind === "text" ? text : (
            <span key={key} className={TOKEN_CLASS[token.kind]}>
              {text}
            </span>
          )
        );
        continue;
      }
      pieces.push(
        <mark
          key={key}
          ref={markAttached ? undefined : (markRef as React.RefObject<HTMLElement>)}
          className={`rounded-sm bg-amber-200 ${TOKEN_CLASS[token.kind]}`}
        >
          {text}
        </mark>
      );
      markAttached = true;
    }
  });
  return <>{pieces}</>;
}

const TOOLBAR_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600";

const SPLIT_KEY = "qpgen_latex_editor_split";
const clampSplit = (ratio: number) => Math.min(0.8, Math.max(0.2, ratio));

function readStoredSplit(): number {
  try {
    const stored = parseFloat(localStorage.getItem(SPLIT_KEY) || "");
    return Number.isFinite(stored) ? clampSplit(stored) : 0.5;
  } catch {
    return 0.5;
  }
}

function hasHeaderCommands(meta: PaperMeta): boolean {
  return Boolean(
    meta.institute || meta.affiliation || meta.logo || meta.examTitle || meta.subject || meta.courseCode ||
      meta.semester || meta.maxMarks || meta.duration || meta.examDate || meta.notes.length
  );
}

/**
 * Papers saved before the details moved into the LaTeX kept them in separate
 * fields. Write those fields out as commands so nothing is lost on reopening.
 */
function sourceWithHeaderCommands(record: LatexPaperRecord): string {
  if (hasHeaderCommands(parseLatex(record.source).meta)) return record.source;
  const escape = (text: string) => text.replace(/([%&#_$])/g, "\\$1");
  const lines = [
    record.title && `\\examtitle{${escape(record.title)}}`,
    record.subjectName && `\\subject{${escape(record.subjectName)}}`,
    record.courseCode && `\\coursecode{${escape(record.courseCode)}}`,
    record.semester && `\\semester{${escape(record.semester)}}`,
    record.date && `\\examdate{${escape(record.date)}}`,
    record.duration ? `\\duration{${record.duration}}` : "",
    record.totalMarks ? `\\maxmarks{${record.totalMarks}}` : "",
    ...record.instructions.map((line) => `\\note{${escape(line)}}`),
    record.showHeader ? "" : "\\noheader",
  ].filter(Boolean);
  // Those papers were always printed with this institute's header.
  return `${INSTITUTE_COMMANDS_TEMPLATE}${lines.join("\n")}\n\n${record.source}`;
}

function uniqueImageName(fileName: string, taken: string[]): string {
  const clean = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image.png";
  const dot = clean.lastIndexOf(".");
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  const extension = dot > 0 ? clean.slice(dot) : ".png";
  const lower = taken.map((name) => name.toLowerCase());
  let candidate = `${stem}${extension}`;
  for (let n = 2; lower.includes(candidate.toLowerCase()); n++) candidate = `${stem}-${n}${extension}`;
  return candidate;
}

export function LatexPaper() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const [paperId, setPaperId] = useState(() => routeId ?? newLatexPaperId());
  const [source, setSource] = useState(SAMPLE_LATEX_SOURCE);
  const [images, setImages] = useState<EditorImage[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const [view, setView] = useState<ViewMode>("split");
  const [split, setSplit] = useState(readStoredSplit);
  const [fullscreen, setFullscreen] = useState(false);
  // Two-way sync, as in Overleaf: `caret` picks the paper element to highlight,
  // `mark` is the LaTeX highlighted after a click or selection on the paper.
  const [caret, setCaret] = useState<number | null>(null);
  const [mark, setMark] = useState<SourceRange | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const panesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggingRef = useRef(false);
  const imagesRef = useRef<EditorImage[]>([]);
  const savedRef = useRef(false);
  const paperIdRef = useRef(paperId);
  imagesRef.current = images;
  paperIdRef.current = paperId;

  // Load a saved paper, or start a fresh one, whenever the route changes.
  useEffect(() => {
    let cancelled = false;
    let targetId = routeId ?? paperIdRef.current;

    if (!routeId && savedRef.current) {
      // "LaTeX Paper" was opened again while a saved paper was on screen: start a new one.
      targetId = newLatexPaperId();
      paperIdRef.current = targetId;
      savedRef.current = false;
      setPaperId(targetId);
      setSource(SAMPLE_LATEX_SOURCE);
      setDirty(false);
      setMessage(null);
      setMark(null);
      setCaret(null);
    }

    if (routeId) {
      // Saving a new paper moves to its own URL; the editor already holds it.
      const alreadyOpen = routeId === paperIdRef.current && savedRef.current;
      if (!alreadyOpen) {
        const record = getLatexPaperById(routeId);
        if (!record) {
          setNotFound(true);
          return;
        }
        setNotFound(false);
        setPaperId(record.id);
        setSource(sourceWithHeaderCommands(record));
        setDirty(false);
        setMark(null);
        setCaret(null);
        savedRef.current = true;
      }
    }

    listImages(targetId)
      .then((stored) => {
        if (cancelled) return;
        imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
        setImages(stored.map((image) => ({ name: image.name, url: URL.createObjectURL(image.blob) })));
      })
      .catch(() => {
        if (!cancelled) setMessage({ kind: "error", text: "Could not load this paper's images from browser storage." });
      });

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  // Leaving a paper that was never saved: its uploaded images have no owner.
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
      if (!savedRef.current) void deleteImagesForPaper(paperIdRef.current).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const deferredSource = useDeferredValue(source);
  const parsed = useMemo(() => parseLatex(deferredSource), [deferredSource]);
  const imageUrls = useMemo(() => Object.fromEntries(images.map((image) => [image.name, image.url])), [images]);

  const activeRange = useMemo(
    () => (caret === null ? null : findMetaRange(parsed.meta, caret) ?? findSourceRange(parsed.blocks, caret)),
    [parsed, caret]
  );
  const activeKey = activeRange ? `${activeRange[0]}:${activeRange[1]}` : null;

  // Highlight the paper element that the cursor's LaTeX produced.
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    paper.querySelectorAll("[data-active]").forEach((element) => element.removeAttribute("data-active"));
    if (!activeKey) return;
    const target = paper.querySelector<HTMLElement>(`[data-src="${activeKey}"]`);
    if (!target) return;
    target.setAttribute("data-active", "true");
    const box = paper.getBoundingClientRect();
    const at = target.getBoundingClientRect();
    if (at.top < box.top || at.bottom > box.bottom) {
      paper.scrollTo({ top: paper.scrollTop + at.top - box.top - box.height / 3, behavior: "smooth" });
    }
  }, [activeKey, parsed]);

  // Bring the highlighted LaTeX into view.
  useEffect(() => {
    const textarea = textareaRef.current;
    const marked = markRef.current;
    if (!mark || !textarea || !marked) return;
    const top = marked.offsetTop;
    if (top < textarea.scrollTop + 16 || top > textarea.scrollTop + textarea.clientHeight - 48) {
      textarea.scrollTop = Math.max(0, top - textarea.clientHeight / 3);
    }
    if (backdropRef.current) backdropRef.current.scrollTop = textarea.scrollTop;
  }, [mark]);

  /** Clicking or selecting on the paper finds the LaTeX behind it. */
  const syncFromPaper = (event: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    const selectedText = selection && !selection.isCollapsed ? selection.toString() : "";
    const anchor = selectedText ? selection!.anchorNode : null;
    const origin = anchor ? (anchor instanceof Element ? anchor : anchor.parentElement) : (event.target as Element);

    const key = origin?.closest<HTMLElement>("[data-src]")?.dataset.src;
    if (!key) return;
    const [start, end] = key.split(":").map(Number);
    let range: SourceRange = [start, end];

    // If the selected words appear as-is in that LaTeX, highlight just those words.
    const needle = selectedText.trim();
    if (needle && !needle.includes("\n")) {
      const at = deferredSource.slice(start, end).indexOf(needle);
      if (at !== -1) range = [start + at, start + at + needle.length];
    }

    setMark(range);
    setCaret(start);
    if (view === "paper") setView("split");

    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.setSelectionRange(range[0], range[0]);
    // After a plain click the cursor moves to the LaTeX, ready to type. After a
    // selection the focus stays on the paper so the selection is not lost.
    if (!selectedText) textarea.focus({ preventScroll: true });
  };

  // Every toolbar action and image insert goes through the browser's own
  // editing (applyEdit), so Ctrl+Z undoes it like typing.
  const insertAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const caretAfter = start + text.length;
    applyEdit(textarea, { from: start, to: end, insert: text, selectFrom: caretAfter, selectTo: caretAfter });
  }, []);

  const runSnippet = useCallback(
    (snippet: Snippet) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (view === "paper") setView("split");
      applyEdit(textarea, snippetEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd, snippet));
    },
    [view]
  );

  const runCommand = (command: ToolbarCommand) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (command === "image") {
      fileInputRef.current?.click();
      return;
    }
    if (command === "comment") {
      applyEdit(textarea, toggleCommentEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd));
      return;
    }
    textarea.focus();
    document.execCommand(command);
  };

  const onEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = textarea;
    const ctrl = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (ctrl && !event.shiftKey && !event.altKey && (key === "b" || key === "i" || key === "u")) {
      event.preventDefault();
      runSnippet(key === "b" ? BOLD : key === "i" ? ITALIC : UNDERLINE);
    } else if (ctrl && key === "/") {
      event.preventDefault();
      applyEdit(textarea, toggleCommentEdit(value, start, end));
    } else if (event.key === "Tab" && !ctrl && !event.altKey) {
      event.preventDefault();
      applyEdit(textarea, indentEdit(value, start, end, event.shiftKey));
    }
  };

  const insertHeaderCommands = () => {
    setSource((current) => `${HEADER_COMMANDS_TEMPLATE}\n${current}`);
    setDirty(true);
    setMark([0, HEADER_COMMANDS_TEMPLATE.length]);
    setCaret(0);
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  };

  const addImages = useCallback(
    async (files: File[]) => {
      const accepted = files.filter((file) => file.type.startsWith("image/"));
      if (accepted.length === 0) return;
      const tooLarge = accepted.find((file) => file.size > MAX_IMAGE_BYTES);
      if (tooLarge) {
        setMessage({ kind: "error", text: `"${tooLarge.name}" is larger than 5 MB. Use a smaller image.` });
        return;
      }
      const added: EditorImage[] = [];
      try {
        for (const file of accepted) {
          const taken = [...imagesRef.current, ...added].map((image) => image.name);
          const name = uniqueImageName(file.name || "pasted.png", taken);
          await putImage(paperIdRef.current, name, file);
          added.push({ name, url: URL.createObjectURL(file) });
        }
      } catch {
        setMessage({ kind: "error", text: "The browser could not store that image." });
      }
      if (added.length === 0) return;
      setImages((current) => [...current, ...added]);
      insertAtCursor(added.map((image) => `\\includegraphics[width=0.5\\textwidth]{${image.name}}`).join("\n"));
      setMessage(null);
    },
    [insertAtCursor]
  );

  const removeImage = async (name: string) => {
    const usedInText = source.includes(`{${name}}`);
    const question = usedInText
      ? `"${name}" is used in the paper. Delete the image anyway?`
      : `Delete the image "${name}"?`;
    if (!confirm(question)) return;
    try {
      await deleteImage(paperId, name);
    } catch {
      setMessage({ kind: "error", text: "The browser could not delete that image." });
      return;
    }
    setImages((current) => {
      current.filter((image) => image.name === name).forEach((image) => URL.revokeObjectURL(image.url));
      return current.filter((image) => image.name !== name);
    });
  };

  const save = useCallback(() => {
    // History lists papers by these details, so copy them out of the LaTeX.
    const { meta } = parseLatex(source);
    try {
      saveLatexPaper({
        id: paperId,
        title: meta.examTitle?.text ?? "",
        subjectName: meta.subject?.text || "Untitled LaTeX paper",
        courseCode: meta.courseCode?.text ?? "",
        semester: meta.semester?.text ?? "",
        totalMarks: parseInt(meta.maxMarks?.text ?? "", 10) || 0,
        duration: durationToMinutes(meta.duration?.text ?? ""),
        date: meta.examDate?.text ?? "",
        showHeader: meta.showHeader,
        instructions: meta.notes.map((note) => note.text),
        source,
      });
    } catch {
      setMessage({ kind: "error", text: "Could not save: browser storage is full or blocked." });
      return;
    }
    savedRef.current = true;
    setDirty(false);
    setMessage({ kind: "ok", text: "Saved to History" });
    if (routeId !== paperId) navigate(`/latex-paper/${paperId}`, { replace: true });
  }, [navigate, paperId, routeId, source]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      } else if (event.key === "Escape") {
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  const updateSplit = (ratio: number) => {
    const next = clampSplit(ratio);
    setSplit(next);
    try {
      localStorage.setItem(SPLIT_KEY, String(next));
    } catch {
      // The divider still works for this visit; it just is not remembered.
    }
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-sm font-semibold text-slate-800">This LaTeX paper no longer exists.</p>
        <Link to="/history" className="mt-3 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          Back to History
        </Link>
      </div>
    );
  }

  const { meta } = parsed;
  const summary = [meta.subject?.text, meta.courseCode?.text].filter(Boolean).join(" • ");

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[60] flex flex-col gap-3 bg-slate-50 p-3"
          : "flex flex-col gap-3 p-4 lg:h-full lg:px-5 lg:py-3"
      }
    >
      {/* Title bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/history"
            title="Back to History"
            aria-label="Back to History"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="shrink-0 text-lg font-bold tracking-tight text-slate-900">LaTeX Paper</h1>
          {summary && <span className="hidden truncate text-sm text-slate-500 sm:inline">{summary}</span>}
        </div>

        <div className="flex items-center gap-3">
          {message ? (
            <span
              role="status"
              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                message.kind === "ok" ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {message.kind === "ok" ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {message.text}
            </span>
          ) : (
            dirty && <span className="text-xs font-medium text-slate-500">Unsaved changes</span>
          )}
          <div className="hidden rounded-lg border border-slate-200 bg-white p-0.5 lg:flex" role="group" aria-label="Layout">
            {VIEW_MODES.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={`cursor-pointer rounded-md p-1.5 ${
                  view === mode ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <button
            type="button"
            title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            onClick={() => setFullscreen((on) => !on)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all hover:bg-indigo-700"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Small screens show one pane at a time */}
      <div className="flex rounded-lg border border-slate-200 bg-white p-1 lg:hidden">
        {(["edit", "preview"] as const).map((pane) => (
          <button
            key={pane}
            type="button"
            onClick={() => setMobilePane(pane)}
            className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-semibold ${
              mobilePane === pane ? "bg-indigo-600 text-white" : "text-slate-600"
            }`}
          >
            {pane === "edit" ? "LaTeX" : "Question paper"}
          </button>
        ))}
      </div>

      <div
        ref={panesRef}
        style={{ "--split": `${split * 100}%` } as CSSProperties}
        className="flex min-h-0 flex-col gap-4 lg:flex-1 lg:flex-row lg:gap-0"
      >
        {/* Editor */}
        <section
          className={`${mobilePane === "edit" ? "flex" : "hidden"} min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs lg:min-h-0 ${
            view === "paper" ? "lg:hidden" : "lg:flex"
          } ${view === "split" ? "lg:w-[var(--split)] lg:shrink-0" : "lg:flex-1"}`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">LaTeX source</span>
            <div className="flex items-center gap-2">
              {!hasHeaderCommands(meta) && (
                <button
                  type="button"
                  title="Add \subject, \maxmarks and the other header commands at the top"
                  onClick={insertHeaderCommands}
                  className={TOOLBAR_BUTTON_CLASS}
                >
                  <Heading className="h-3.5 w-3.5" />
                  <span>Insert header</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                void addImages(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </div>

          <LatexToolbar onSnippet={runSnippet} onCommand={runCommand} />

          <div className="relative h-[60vh] flex-1 bg-white lg:h-auto lg:min-h-0">
            {/* Coloured text layer; the textarea above it is transparent. */}
            <div ref={backdropRef} aria-hidden="true" className={`${EDITOR_TEXT_CLASS} pointer-events-none`}>
              <HighlightedSource source={source} mark={mark} markRef={markRef} />
              {"\n"}
            </div>
            <textarea
              ref={textareaRef}
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setDirty(true);
                setMessage(null);
                setMark(null);
                setCaret(event.target.selectionStart);
              }}
              onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
              onKeyDown={onEditorKeyDown}
              onPointerDown={() => setMark(null)}
              onScroll={(event) => {
                if (backdropRef.current) backdropRef.current.scrollTop = event.currentTarget.scrollTop;
              }}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
                if (files.length === 0) return;
                event.preventDefault();
                void addImages(files);
              }}
              spellCheck={false}
              aria-label="LaTeX source"
              placeholder="Paste your LaTeX question paper here…"
              className={`${EDITOR_TEXT_CLASS} resize-none bg-transparent text-transparent caret-slate-900 selection:bg-indigo-300/40 placeholder:text-slate-400 focus:outline-none`}
            />
          </div>

          {images.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Images in this paper
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image) => (
                  <div key={image.name} className="w-28 shrink-0 rounded-lg border border-slate-200 bg-white p-1.5">
                    <button
                      type="button"
                      title="Insert this image at the cursor"
                      onClick={() => insertAtCursor(`\\includegraphics[width=0.5\\textwidth]{${image.name}}`)}
                      className="block h-16 w-full cursor-pointer overflow-hidden rounded bg-slate-100"
                    >
                      <img src={image.url} alt={image.name} className="h-full w-full object-contain" />
                    </button>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-600" title={image.name}>
                        {image.name}
                      </span>
                      <button
                        type="button"
                        title={`Delete ${image.name}`}
                        aria-label={`Delete ${image.name}`}
                        onClick={() => void removeImage(image.name)}
                        className="cursor-pointer rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {view === "split" && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the editor and the paper"
            aria-valuenow={Math.round(split * 100)}
            aria-valuemin={20}
            aria-valuemax={80}
            tabIndex={0}
            title="Drag to resize. Double-click to reset."
            onPointerDown={(event) => {
              draggingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const box = panesRef.current?.getBoundingClientRect();
              if (!draggingRef.current || !box) return;
              updateSplit((event.clientX - box.left) / box.width);
            }}
            onPointerUp={() => {
              draggingRef.current = false;
            }}
            onPointerCancel={() => {
              draggingRef.current = false;
            }}
            onDoubleClick={() => updateSplit(0.5)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") updateSplit(split - 0.03);
              if (event.key === "ArrowRight") updateSplit(split + 0.03);
            }}
            className="group hidden w-4 shrink-0 cursor-col-resize touch-none items-center justify-center focus:outline-none lg:flex"
          >
            <span className="h-12 w-1 rounded-full bg-slate-300 transition-colors group-hover:bg-indigo-500 group-focus-visible:bg-indigo-500" />
          </div>
        )}

        {/* Preview */}
        <section
          className={`${mobilePane === "preview" ? "flex" : "hidden"} min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100 shadow-2xs lg:min-h-0 lg:flex-1 ${
            view === "editor" ? "lg:hidden" : "lg:flex"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Question paper
              <span className="ml-2 hidden font-normal normal-case tracking-normal text-slate-400 xl:inline">
                Click or select anything to find its LaTeX
              </span>
            </span>
            {parsed.unsupported.length > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
                title={parsed.unsupported.join(", ")}
              >
                <AlertTriangle className="h-3 w-3" />
                {parsed.unsupported.length} unsupported {parsed.unsupported.length === 1 ? "command" : "commands"}
              </span>
            )}
          </div>

          <div ref={paperRef} onMouseUp={syncFromPaper} className="relative min-h-0 flex-1 overflow-auto p-3 sm:p-4">
            <div className="mx-auto max-w-[820px] bg-white shadow-md ring-1 ring-slate-200">
              {meta.showHeader && <PaperSheetHeader meta={meta} images={imageUrls} />}
              <div className="p-6 sm:p-8">
                {parsed.blocks.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">The paper is empty. Paste LaTeX to see it here.</p>
                ) : (
                  <LatexRenderer blocks={parsed.blocks} macros={parsed.macros} images={imageUrls} />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
