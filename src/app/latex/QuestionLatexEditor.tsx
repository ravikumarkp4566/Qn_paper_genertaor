import { useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { LatexToolbar, BOLD, ITALIC, UNDERLINE, type ToolbarCommand } from "./LatexToolbar";
import { LatexRenderer } from "./LatexRenderer";
import { parseLatex } from "./parser";
import { applyEdit, indentEdit, snippetEdit, toggleCommentEdit, type Snippet } from "./editorCommands";
import { deleteQuestionImage, putQuestionImage, useQuestionImageUrls } from "../services/questionImages";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export { plainTextToLatex } from "./text";

function safeImageName(fileName: string, taken: string[]): string {
  const clean = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image.png";
  const dot = clean.lastIndexOf(".");
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  const extension = dot > 0 ? clean.slice(dot) : ".png";
  const lower = taken.map((name) => name.toLowerCase());
  let candidate = `${stem}${extension}`;
  for (let n = 2; lower.includes(candidate.toLowerCase()); n++) candidate = `${stem}-${n}${extension}`;
  return candidate;
}

interface QuestionLatexEditorProps {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
  images: string[];
  onImagesChange: (images: string[]) => void;
}

/**
 * The question statement editor: LaTeX with the paper editor's toolbar,
 * images stored with the question, and a live preview of how it will print.
 */
export function QuestionLatexEditor({ questionId, value, onChange, images, onImagesChange }: QuestionLatexEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageUrls = useQuestionImageUrls(questionId, images);
  const parsed = useMemo(() => parseLatex(value), [value]);

  const runSnippet = (snippet: Snippet) => {
    const textarea = textareaRef.current;
    if (textarea) applyEdit(textarea, snippetEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd, snippet));
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    applyEdit(textarea, { from: start, to: end, insert: text, selectFrom: start + text.length, selectTo: start + text.length });
  };

  const addImages = async (files: File[]) => {
    const accepted = files.filter((file) => file.type.startsWith("image/"));
    if (!accepted.length) return;
    if (accepted.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setError("Images must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    setError(null);
    const added: string[] = [];
    try {
      for (const file of accepted) {
        const name = safeImageName(file.name || "pasted.png", [...images, ...added]);
        await putQuestionImage(questionId, name, file);
        added.push(name);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload the image.");
    } finally {
      setUploading(false);
    }
    if (!added.length) return;
    onImagesChange([...images, ...added]);
    // Blank lines keep each image on its own line instead of inside a sentence.
    insertAtCursor(added.map((name) => `\n\n\\includegraphics[width=0.4\\textwidth]{${name}}\n\n`).join(""));
  };

  const removeImage = async (name: string) => {
    if (!confirm(`Remove the image "${name}" from this question?`)) return;
    try {
      await deleteQuestionImage(questionId, name);
      onImagesChange(images.filter((image) => image !== name));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove the image.");
    }
  };

  const onCommand = (command: ToolbarCommand) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (command === "image") fileInputRef.current?.click();
    else if (command === "comment") applyEdit(textarea, toggleCommentEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd));
    else {
      textarea.focus();
      document.execCommand(command);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const ctrl = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (ctrl && !event.shiftKey && !event.altKey && (key === "b" || key === "i" || key === "u")) {
      event.preventDefault();
      runSnippet(key === "b" ? BOLD : key === "i" ? ITALIC : UNDERLINE);
    } else if (event.key === "Tab" && !ctrl && !event.altKey) {
      event.preventDefault();
      applyEdit(textarea, indentEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd, event.shiftKey));
    }
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
        <LatexToolbar onSnippet={runSnippet} onCommand={onCommand} compact />
        <textarea
          ref={textareaRef}
          rows={5}
          required
          value={value}
          spellCheck={false}
          aria-label="Question statement (LaTeX)"
          placeholder="Type the question. Use the toolbar for equations, e.g. Evaluate $\int_0^1 x^2\,dx$"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
            if (!files.length) return;
            event.preventDefault();
            void addImages(files);
          }}
          className="block w-full resize-y bg-white px-3.5 py-2.5 font-mono text-xs leading-relaxed text-slate-900 focus:outline-none"
        />
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

      {(images.length > 0 || uploading) && (
        <div className="flex flex-wrap items-center gap-2">
          {images.map((name) => (
            <div key={name} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 py-1 pl-1 pr-1.5">
              {imageUrls[name] ? (
                <img src={imageUrls[name]} alt={name} className="h-8 w-10 rounded object-contain" />
              ) : (
                <span className="h-8 w-10 rounded bg-slate-200" />
              )}
              <button
                type="button"
                title="Insert at the cursor"
                onClick={() => insertAtCursor(`\\includegraphics[width=0.4\\textwidth]{${name}}`)}
                className="max-w-32 cursor-pointer truncate font-mono text-[10px] text-slate-700 hover:text-indigo-700"
              >
                {name}
              </button>
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => void removeImage(name)}
                className="cursor-pointer rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {uploading && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
            </span>
          )}
        </div>
      )}
      {error && <p className="text-[11px] font-medium text-rose-600">{error}</p>}

      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
        <p className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Preview</span>
          {parsed.unsupported.length > 0 && (
            <span className="normal-case tracking-normal text-amber-700">Unsupported: {parsed.unsupported.join(", ")}</span>
          )}
        </p>
        {value.trim() ? (
          <LatexRenderer
            blocks={parsed.blocks}
            macros={parsed.macros}
            images={imageUrls}
            className="space-y-2 font-['Times_New_Roman',Times,serif] text-[15px] leading-relaxed text-slate-950 [&_img]:max-h-56"
          />
        ) : (
          <p className="text-xs text-slate-400">The question will appear here as it prints.</p>
        )}
      </div>
      <p className="flex items-center gap-1 text-[11px] text-slate-400">
        <ImagePlus className="h-3 w-3" /> Paste or upload images; they are saved with this question and go into papers with it.
      </p>
    </div>
  );
}
