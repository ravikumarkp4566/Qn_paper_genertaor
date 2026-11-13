import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  Bold, ChevronDown, Code, ImagePlus, Italic, List, ListOrdered, MessageSquareOff, Redo2, Table, Underline, Undo2,
} from "lucide-react";
import type { Snippet } from "./editorCommands";

export type ToolbarCommand = "undo" | "redo" | "comment" | "image";

interface LatexToolbarProps {
  onSnippet: (snippet: Snippet) => void;
  onCommand: (command: ToolbarCommand) => void;
}

const MARKS: Snippet = { before: " \\hfill \\textbf{[", placeholder: "10", after: "]}" };

export const BOLD: Snippet = { before: "\\textbf{", placeholder: "bold text", after: "}" };
export const ITALIC: Snippet = { before: "\\textit{", placeholder: "italic text", after: "}" };
export const UNDERLINE: Snippet = { before: "\\underline{", placeholder: "underlined text", after: "}" };

const QUESTION: Snippet = {
  block: true,
  before: "\\item\n\\begin{enumerate}\n  \\item ",
  placeholder: "Question text",
  after: " \\hfill \\textbf{[10]}\n  \\item Second part \\hfill \\textbf{[10]}\n\\end{enumerate}",
};
const PART: Snippet = { block: true, before: "\\item ", placeholder: "Question text", after: " \\hfill \\textbf{[5]}" };
const OR_LINE: Snippet = { block: true, before: "\\begin{center} \\textbf{", placeholder: "OR", after: "} \\end{center}" };

const TABLE: Snippet = {
  block: true,
  before: "\\begin{center}\n\\begin{tabular}{|c|c|c|}\n  \\hline\n  ",
  placeholder: "Heading 1",
  after: " & Heading 2 & Heading 3 \\\\ \\hline\n  a & b & c \\\\ \\hline\n  d & e & f \\\\ \\hline\n\\end{tabular}\n\\end{center}",
};

const MATH_BUTTONS: { label: ReactNode; title: string; snippet: Snippet }[] = [
  { label: "$x$", title: "Inline equation", snippet: { before: "$", placeholder: "x^2 + y^2", after: "$" } },
  { label: "[x]", title: "Equation on its own line", snippet: { block: true, before: "\\[\n  ", placeholder: "E = mc^2", after: "\n\\]" } },
  { label: "a⁄b", title: "Fraction", snippet: { math: true, before: "\\frac{", placeholder: "a", after: "}{b}" } },
  { label: "√x", title: "Square root", snippet: { math: true, before: "\\sqrt{", placeholder: "x", after: "}" } },
  { label: "xⁿ", title: "Power / superscript", snippet: { math: true, before: "^{", placeholder: "n", after: "}" } },
  { label: "xₙ", title: "Subscript", snippet: { math: true, before: "_{", placeholder: "n", after: "}" } },
  { label: "∑", title: "Sum", snippet: { math: true, before: "\\sum_{i=1}^{n} ", placeholder: "a_i" } },
  { label: "∫", title: "Integral", snippet: { math: true, before: "\\int_{a}^{b} ", placeholder: "f(x)", after: " \\, dx" } },
  { label: "lim", title: "Limit", snippet: { math: true, before: "\\lim_{x \\to ", placeholder: "0", after: "} " } },
  {
    label: "[⋮]",
    title: "Matrix",
    snippet: { math: true, before: "\\begin{bmatrix} ", placeholder: "a & b \\\\ c & d", after: " \\end{bmatrix}" },
  },
];

const MORE_ITEMS: { label: string; snippet: Snippet }[] = [
  { label: "Unit heading", snippet: { block: true, before: "\\begin{center}\n\\textbf{Unit - ", placeholder: "II", after: "}\n\\end{center}" } },
  { label: "Section heading", snippet: { block: true, before: "\\section*{", placeholder: "Part A", after: "}" } },
  { label: "Centred text", snippet: { block: true, before: "\\begin{center}\n", placeholder: "Centred text", after: "\n\\end{center}" } },
  { label: "Multiple choice options", snippet: { block: true, before: "\\begin{enumerate}[label=(\\alph*)]\n  \\item ", placeholder: "Option one", after: "\n  \\item Option two\n  \\item Option three\n  \\item Option four\n\\end{enumerate}" } },
  { label: "Aligned equations", snippet: { block: true, before: "\\begin{align*}\n  ", placeholder: "a &= b + c", after: " \\\\\n  d &= e + f\n\\end{align*}" } },
  { label: "Cases (piecewise)", snippet: { math: true, before: "f(x) = \\begin{cases} ", placeholder: "x", after: " & x \\ge 0 \\\\ -x & x < 0 \\end{cases}" } },
  { label: "Derivative d/dx", snippet: { math: true, before: "\\frac{d", placeholder: "y", after: "}{dx}" } },
  { label: "Partial derivative", snippet: { math: true, before: "\\frac{\\partial ", placeholder: "f", after: "}{\\partial x}" } },
  { label: "Vector", snippet: { math: true, before: "\\vec{", placeholder: "v", after: "}" } },
  { label: "Code listing", snippet: { block: true, before: "\\begin{verbatim}\n", placeholder: "printf(\"Hello\");", after: "\n\\end{verbatim}" } },
  { label: "Blank space", snippet: { block: true, before: "\\vspace{", placeholder: "1cm", after: "}" } },
  { label: "Horizontal line", snippet: { block: true, before: "\\hrule" } },
  { label: "Page break", snippet: { block: true, before: "\\newpage" } },
];

const SYMBOL_GROUPS: { name: string; symbols: [glyph: string, tex: string][] }[] = [
  {
    name: "Greek",
    symbols: [
      ["α", "\\alpha"], ["β", "\\beta"], ["γ", "\\gamma"], ["δ", "\\delta"], ["ε", "\\epsilon"], ["ζ", "\\zeta"],
      ["η", "\\eta"], ["θ", "\\theta"], ["λ", "\\lambda"], ["μ", "\\mu"], ["ν", "\\nu"], ["ξ", "\\xi"],
      ["π", "\\pi"], ["ρ", "\\rho"], ["σ", "\\sigma"], ["τ", "\\tau"], ["φ", "\\phi"], ["χ", "\\chi"],
      ["ψ", "\\psi"], ["ω", "\\omega"], ["Γ", "\\Gamma"], ["Δ", "\\Delta"], ["Θ", "\\Theta"], ["Λ", "\\Lambda"],
      ["Π", "\\Pi"], ["Σ", "\\Sigma"], ["Φ", "\\Phi"], ["Ψ", "\\Psi"], ["Ω", "\\Omega"],
    ],
  },
  {
    name: "Relations",
    symbols: [
      ["≤", "\\le"], ["≥", "\\ge"], ["≠", "\\neq"], ["≈", "\\approx"], ["≡", "\\equiv"], ["∝", "\\propto"],
      ["∼", "\\sim"], ["≪", "\\ll"], ["≫", "\\gg"], ["∈", "\\in"], ["∉", "\\notin"], ["⊂", "\\subset"],
      ["⊆", "\\subseteq"], ["∪", "\\cup"], ["∩", "\\cap"], ["∅", "\\emptyset"],
    ],
  },
  {
    name: "Operators",
    symbols: [
      ["±", "\\pm"], ["×", "\\times"], ["÷", "\\div"], ["·", "\\cdot"], ["∞", "\\infty"], ["∂", "\\partial"],
      ["∇", "\\nabla"], ["∏", "\\prod"], ["∮", "\\oint"], ["°", "^\\circ"], ["′", "'"], ["…", "\\ldots"],
    ],
  },
  {
    name: "Arrows & logic",
    symbols: [
      ["→", "\\rightarrow"], ["←", "\\leftarrow"], ["↔", "\\leftrightarrow"], ["⇒", "\\Rightarrow"],
      ["⇔", "\\Leftrightarrow"], ["↦", "\\mapsto"], ["∀", "\\forall"], ["∃", "\\exists"], ["¬", "\\neg"],
      ["∧", "\\land"], ["∨", "\\lor"], ["ℝ", "\\mathbb{R}"], ["ℕ", "\\mathbb{N}"], ["ℤ", "\\mathbb{Z}"],
    ],
  },
];

const BUTTON = "inline-flex h-7 min-w-7 shrink-0 cursor-pointer items-center justify-center gap-1 rounded px-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-indigo-700 hover:shadow-2xs";

/** Keeps the editor's selection when a toolbar button is pressed. */
const keepSelection = (event: MouseEvent) => event.preventDefault();

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />;
}

function ToolButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} onMouseDown={keepSelection} onClick={onClick} className={BUTTON}>
      {children}
    </button>
  );
}

/** A button that opens a panel below it; closes on outside click or Escape. */
function Popover({ label, title, children }: { label: ReactNode; title: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        title={title}
        aria-expanded={open}
        onMouseDown={keepSelection}
        onClick={() => setOpen((value) => !value)}
        className={`${BUTTON} ${open ? "bg-white text-indigo-700 shadow-2xs" : ""}`}
      >
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Overleaf-style editing toolbar: formatting, maths, question structure, symbols. */
export function LatexToolbar({ onSnippet, onCommand }: LatexToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="LaTeX editing tools"
      className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1"
    >
      <ToolButton title="Undo (Ctrl+Z)" onClick={() => onCommand("undo")}>
        <Undo2 className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton title="Redo (Ctrl+Y)" onClick={() => onCommand("redo")}>
        <Redo2 className="h-3.5 w-3.5" />
      </ToolButton>
      <Divider />

      <ToolButton title="Bold (Ctrl+B)" onClick={() => onSnippet(BOLD)}>
        <Bold className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton title="Italic (Ctrl+I)" onClick={() => onSnippet(ITALIC)}>
        <Italic className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton title="Underline (Ctrl+U)" onClick={() => onSnippet(UNDERLINE)}>
        <Underline className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton title="Monospace / code" onClick={() => onSnippet({ before: "\\texttt{", placeholder: "code", after: "}" })}>
        <Code className="h-3.5 w-3.5" />
      </ToolButton>
      <Divider />

      <ToolButton title="New question with two parts" onClick={() => onSnippet(QUESTION)}>
        <span>+ Question</span>
      </ToolButton>
      <ToolButton title="New sub-part (a), (b)…" onClick={() => onSnippet(PART)}>
        <span>+ Part</span>
      </ToolButton>
      <ToolButton title="Marks on the right, e.g. [10]" onClick={() => onSnippet(MARKS)}>
        <span>[M]</span>
      </ToolButton>
      <ToolButton title="OR between two questions" onClick={() => onSnippet(OR_LINE)}>
        <span>OR</span>
      </ToolButton>
      <ToolButton
        title="Numbered list"
        onClick={() => onSnippet({ block: true, before: "\\begin{enumerate}\n  \\item ", placeholder: "First", after: "\n  \\item Second\n\\end{enumerate}" })}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        title="Bulleted list"
        onClick={() => onSnippet({ block: true, before: "\\begin{itemize}\n  \\item ", placeholder: "First", after: "\n  \\item Second\n\\end{itemize}" })}
      >
        <List className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton title="Table" onClick={() => onSnippet(TABLE)}>
        <Table className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton title="Insert image" onClick={() => onCommand("image")}>
        <ImagePlus className="h-3.5 w-3.5" />
      </ToolButton>
      <Divider />

      {MATH_BUTTONS.map((button) => (
        <ToolButton key={button.title} title={button.title} onClick={() => onSnippet(button.snippet)}>
          <span className="font-serif text-[13px] font-normal">{button.label}</span>
        </ToolButton>
      ))}
      <Divider />

      <Popover label={<span className="font-serif text-[13px] font-normal">Ω</span>} title="Symbols">
        {(close) => (
          <div className="w-72 space-y-2">
            {SYMBOL_GROUPS.map((group) => (
              <div key={group.name}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{group.name}</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.symbols.map(([glyph, tex]) => (
                    <button
                      key={tex}
                      type="button"
                      title={tex}
                      onMouseDown={keepSelection}
                      onClick={() => {
                        onSnippet({ math: true, before: tex.startsWith("\\") && /[a-zA-Z]$/.test(tex) ? `${tex} ` : tex });
                        close();
                      }}
                      className="flex h-7 cursor-pointer items-center justify-center rounded font-serif text-[15px] text-slate-800 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {glyph}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Popover>

      <Popover label={<span>More</span>} title="More things to insert">
        {(close) => (
          <div className="flex w-56 flex-col">
            {MORE_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                onMouseDown={keepSelection}
                onClick={() => {
                  onSnippet(item.snippet);
                  close();
                }}
                className="cursor-pointer rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </Popover>

      <ToolButton title="Comment / uncomment lines (Ctrl+/)" onClick={() => onCommand("comment")}>
        <MessageSquareOff className="h-3.5 w-3.5" />
      </ToolButton>
    </div>
  );
}
