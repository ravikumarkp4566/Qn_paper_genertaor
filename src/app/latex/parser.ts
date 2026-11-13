// Parses the subset of LaTeX that question papers use into a small block tree.
// The same tree drives the on-screen preview and (later) the DOCX export, so
// nothing here may depend on the DOM.

export type Align = "left" | "center" | "right";

export type InlineStyle = "bold" | "italic" | "underline" | "mono" | "smallcaps" | "sup" | "sub";

export type Inline =
  | { type: "text"; text: string }
  | { type: "math"; tex: string }
  | { type: "style"; style: InlineStyle; children: Inline[] }
  | { type: "break" }
  | { type: "hfill" }
  | { type: "image"; name: string; width?: string; height?: string }
  /** \qinfo{M}{BL}{CO}{PO}{PSO}: the right-hand columns of a question line. */
  | { type: "qinfo"; cells: string[] }
  | { type: "unknown"; raw: string };

/** Column titles for \qinfo, printed by \qinfoheader. */
export const QINFO_COLUMNS = ["M", "BL", "CO", "PO", "PSO"];

/** Where a piece of the paper came from: [start, end) offsets into the LaTeX source. */
export type SourceRange = [start: number, end: number];

export interface ListItem {
  range?: SourceRange;
  label: string;
  marks?: string;
  correct?: boolean;
  blocks: Block[];
}

export interface TableCell {
  inlines: Inline[];
  colSpan?: number;
  align?: Align;
}

type BlockBody =
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "heading"; level: 1 | 2 | 3; inlines: Inline[] }
  | { type: "math"; tex: string }
  | { type: "list"; ordered: boolean; inline?: boolean; items: ListItem[] }
  | { type: "table"; rows: TableCell[][]; aligns: Align[]; bordered: boolean }
  | { type: "align"; align: Align; blocks: Block[] }
  | { type: "code"; text: string }
  | { type: "rule" }
  | { type: "space" }
  | { type: "pagebreak" }
  | { type: "qinfoheader" }
  | { type: "unknown"; raw: string; reason: string };

export type Block = BlockBody & { range?: SourceRange };

/** A paper detail written in the LaTeX, e.g. `\subject{Data Structures}`. */
export interface MetaValue {
  text: string;
  range: SourceRange;
}

/** The institute header's details. They live in the LaTeX, like everything else on the paper. */
export interface PaperMeta {
  institute?: MetaValue;
  affiliation?: MetaValue;
  /** Name of an uploaded image, or "sit-logo" for the built-in one. */
  logo?: MetaValue;
  /** Label of the roll-number boxes: "USN", "Reg. No." and so on. */
  usnLabel?: MetaValue;
  usnPrefix?: MetaValue;
  usnBoxes?: MetaValue;
  examTitle?: MetaValue;
  subject?: MetaValue;
  courseCode?: MetaValue;
  semester?: MetaValue;
  maxMarks?: MetaValue;
  duration?: MetaValue;
  examDate?: MetaValue;
  notes: MetaValue[];
  /** False when the LaTeX says `\noheader`. */
  showHeader: boolean;
  /** False when the LaTeX says `\nousn`. */
  showUsn: boolean;
}

export interface ParsedLatex {
  meta: PaperMeta;
  blocks: Block[];
  /** User macros in the shape KaTeX expects: { "\\R": "\\mathbb{R}" } */
  macros: Record<string, string>;
  /** Commands and environments that were not understood, de-duplicated. */
  unsupported: string[];
}

interface Macro {
  body: string;
  nargs: number;
}

interface Ctx {
  macros: Map<string, Macro>;
  unsupported: Set<string>;
  expansionDepth: number;
}

// ---------------------------------------------------------------------------
// Low-level scanning helpers
// ---------------------------------------------------------------------------

const VERBATIM_ENVS = ["verbatim", "lstlisting", "minted"];

function stripComments(src: string): string {
  const verbatim = new RegExp(
    `(\\\\begin\\{(${VERBATIM_ENVS.join("|")})\\}[\\s\\S]*?\\\\end\\{\\2\\})`,
    "g"
  );
  // split() with two capture groups yields [text, block, envName, text, ...]
  const parts = src.split(verbatim);
  let out = "";
  for (let k = 0; k < parts.length; k += 3) {
    // Comments become spaces of the same length so that offsets into the
    // cleaned text are also offsets into what the teacher typed.
    out += parts[k]
      // A line holding only a comment disappears together with its line break.
      .replace(/^[ \t]*%.*(\n|$)/gm, (line) => " ".repeat(line.length))
      .replace(/(^|[^\\])(%.*)$/gm, (_, before: string, comment: string) => before + " ".repeat(comment.length));
    if (k + 1 < parts.length) out += parts[k + 1];
  }
  return out;
}

function skipSpaces(s: string, i: number): number {
  while (i < s.length && /[ \t\r\n]/.test(s[i])) i++;
  return i;
}

function skipInlineSpaces(s: string, i: number): number {
  while (i < s.length && (s[i] === " " || s[i] === "\t")) i++;
  return i;
}

/** Reads a balanced {...} group starting at s[i] === "{". */
function readGroup(s: string, i: number): { content: string; end: number } | null {
  if (s[i] !== "{") return null;
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return { content: s.slice(i + 1, j), end: j + 1 };
    }
  }
  return null;
}

/** Reads a [...] optional argument starting at s[i] === "[". */
function readOptional(s: string, i: number): { content: string; end: number } | null {
  if (s[i] !== "[") return null;
  let braces = 0;
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "{") braces++;
    else if (c === "}") braces--;
    else if (c === "]" && braces === 0) return { content: s.slice(i + 1, j), end: j + 1 };
    else if (c === "\n" && s[j + 1] === "\n") return null;
  }
  return null;
}

/** Reads an argument that may be written as {..} or as a single token. */
function readArg(s: string, i: number): { content: string; end: number } | null {
  const j = skipSpaces(s, i);
  const group = readGroup(s, j);
  if (group) return group;
  if (j >= s.length) return null;
  if (s[j] === "\\") {
    const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(j));
    if (m) return { content: m[0], end: j + m[0].length };
  }
  return { content: s[j], end: j + 1 };
}

function envNameAt(s: string, i: number, kind: "begin" | "end"): { name: string; end: number } | null {
  const m = new RegExp(`^\\\\${kind}\\s*\\{([^}]*)\\}`).exec(s.slice(i, i + 80));
  return m ? { name: m[1].trim(), end: i + m[0].length } : null;
}

/** Finds the \end{name} matching a \begin{name} whose body starts at `from`. */
function findEnvEnd(s: string, from: number, name: string): { start: number; after: number } | null {
  if (VERBATIM_ENVS.includes(name)) {
    const closing = `\\end{${name}}`;
    const at = s.indexOf(closing, from);
    return at === -1 ? null : { start: at, after: at + closing.length };
  }
  let depth = 1;
  let i = from;
  while (i < s.length) {
    const at = s.indexOf("\\", i);
    if (at === -1) return null;
    const begin = envNameAt(s, at, "begin");
    if (begin) {
      if (begin.name === name) depth++;
      i = begin.end;
      continue;
    }
    const end = envNameAt(s, at, "end");
    if (end) {
      if (end.name === name) {
        depth--;
        if (depth === 0) return { start: at, after: end.end };
      }
      i = end.end;
      continue;
    }
    i = at + 2;
  }
  return null;
}

/** Index of the closing unescaped `$` for inline math opened at s[i] === "$". */
function findInlineMathEnd(s: string, i: number): number {
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === "\\") {
      j++;
      continue;
    }
    if (s[j] === "$") return j;
  }
  return -1;
}

/**
 * Splits on a separator that sits outside braces, math and nested
 * environments: "row" splits on `\\`, "cell" splits on `&`.
 */
function splitTopLevel(s: string, kind: "row" | "cell"): string[] {
  const parts: string[] = [];
  let buf = "";
  let braces = 0;
  let envs = 0;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      const begin = envNameAt(s, i, "begin");
      if (begin) {
        envs++;
        buf += s.slice(i, begin.end);
        i = begin.end;
        continue;
      }
      const end = envNameAt(s, i, "end");
      if (end) {
        envs--;
        buf += s.slice(i, end.end);
        i = end.end;
        continue;
      }
      if (s[i + 1] === "\\" && kind === "row" && braces === 0 && envs === 0) {
        parts.push(buf);
        buf = "";
        i += 2;
        if (s[i] === "*") i++;
        const opt = readOptional(s, skipInlineSpaces(s, i));
        if (opt) i = opt.end;
        continue;
      }
      buf += s.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (c === "$") {
      const close = findInlineMathEnd(s, i);
      if (close !== -1) {
        buf += s.slice(i, close + 1);
        i = close + 1;
        continue;
      }
    }
    if (c === "{") braces++;
    else if (c === "}") braces--;
    else if (c === "&" && kind === "cell" && braces === 0 && envs === 0) {
      parts.push(buf);
      buf = "";
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  parts.push(buf);
  return parts;
}

// ---------------------------------------------------------------------------
// Lengths, labels, macros
// ---------------------------------------------------------------------------

const CM_PX = 37.8;
const UNIT_PX: Record<string, number> = { cm: CM_PX, mm: CM_PX / 10, in: 96, pt: 96 / 72.27, px: 1, em: 16, ex: 8 };

/** Turns a LaTeX length ("0.5\textwidth", "4cm") into a CSS length. */
export function latexLengthToCss(value: string): string | undefined {
  const v = value.trim();
  const rel = /^([\d.]*)\s*\\(textwidth|linewidth|columnwidth|hsize|paperwidth)$/.exec(v);
  if (rel) {
    const factor = rel[1] === "" ? 1 : parseFloat(rel[1]);
    return Number.isFinite(factor) ? `${Math.min(100, Math.round(factor * 1000) / 10)}%` : undefined;
  }
  const abs = /^([\d.]+)\s*(cm|mm|in|pt|px|em|ex)$/.exec(v);
  if (abs) return `${Math.round(parseFloat(abs[1]) * UNIT_PX[abs[2]])}px`;
  return undefined;
}

function toRoman(n: number): string {
  const table: [number, string][] = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
    [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let out = "";
  let rest = n;
  for (const [value, numeral] of table) {
    while (rest >= value) {
      out += numeral;
      rest -= value;
    }
  }
  return out;
}

function toAlpha(n: number): string {
  let out = "";
  let rest = n;
  while (rest > 0) {
    rest--;
    out = String.fromCharCode(97 + (rest % 26)) + out;
    rest = Math.floor(rest / 26);
  }
  return out;
}

type Counter = "arabic" | "alph" | "Alph" | "roman" | "Roman";

function formatCounter(n: number, counter: Counter): string {
  switch (counter) {
    case "alph": return toAlpha(n);
    case "Alph": return toAlpha(n).toUpperCase();
    case "roman": return toRoman(n);
    case "Roman": return toRoman(n).toUpperCase();
    default: return String(n);
  }
}

/** A label template uses "#" where the counter goes, e.g. "(#)" or "#.". */
interface LabelFormat {
  counter: Counter;
  template: string;
}

const DEFAULT_ENUM_FORMATS: LabelFormat[] = [
  { counter: "arabic", template: "#." },
  { counter: "alph", template: "(#)" },
  { counter: "roman", template: "#." },
  { counter: "Alph", template: "#." },
];

const BULLETS = ["•", "–", "∗", "·"];

/** Reads enumitem (`label=(\alph*)`) and enumerate (`(a)`) style options. */
function parseLabelOption(option: string): LabelFormat | null {
  const keyed = /label\s*=\s*(\{[^}]*\}|[^,]*)/.exec(option);
  let spec = keyed ? keyed[1].trim().replace(/^\{|\}$/g, "") : option.includes("=") ? "" : option.trim();
  if (!spec) return null;
  spec = spec.replace(/\\(textbf|textit|emph|bfseries|itshape)\b\s*/g, "").replace(/[{}]/g, "");

  const command = /\\(arabic|alph|Alph|roman|Roman)\s*\*?/.exec(spec);
  if (command) {
    return { counter: command[1] as Counter, template: spec.replace(command[0], "#") };
  }
  const shorthand = /[1aAiI]/.exec(spec);
  if (!shorthand) return null;
  const counters: Record<string, Counter> = { "1": "arabic", a: "alph", A: "Alph", i: "roman", I: "Roman" };
  return { counter: counters[shorthand[0]], template: spec.replace(shorthand[0], "#") };
}

function consumeMacroDefinition(s: string, start: number, name: string, ctx: Ctx): number {
  let i = skipSpaces(s, start);
  if (name === "def") {
    const m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
    if (!m) return start;
    i += m[0].length;
    const body = readGroup(s, skipSpaces(s, i));
    if (!body) return start;
    ctx.macros.set(m[1], { body: body.content, nargs: 0 });
    return body.end;
  }
  if (s[i] === "*") i = skipSpaces(s, i + 1);
  let macroName: string | null = null;
  const braced = readGroup(s, i);
  if (braced) {
    macroName = braced.content.trim().replace(/^\\/, "");
    i = braced.end;
  } else {
    const m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
    if (!m) return start;
    macroName = m[1];
    i += m[0].length;
  }
  let nargs = 0;
  let opt = readOptional(s, skipSpaces(s, i));
  if (opt) {
    nargs = parseInt(opt.content, 10) || 0;
    i = opt.end;
    // A second optional argument is a default value; it is not supported.
    opt = readOptional(s, skipSpaces(s, i));
    if (opt) i = opt.end;
  }
  const body = readGroup(s, skipSpaces(s, i));
  if (!body) return start;
  ctx.macros.set(macroName, { body: body.content, nargs });
  return body.end;
}

// ---------------------------------------------------------------------------
// Inline parsing
// ---------------------------------------------------------------------------

const STYLE_COMMANDS: Record<string, InlineStyle | "plain"> = {
  textbf: "bold", textit: "italic", emph: "italic", textsl: "italic", underline: "underline",
  uline: "underline", texttt: "mono", textsc: "smallcaps", textsuperscript: "sup",
  textsubscript: "sub", textrm: "plain", textsf: "plain", textnormal: "plain", mbox: "plain",
  text: "plain", fbox: "plain", makebox: "plain", textup: "plain",
};

/** Declarations such as `\bfseries` style everything up to the end of the group. */
const STYLE_DECLARATIONS: Record<string, InlineStyle> = {
  bf: "bold", bfseries: "bold", it: "italic", itshape: "italic", em: "italic", sl: "italic",
  slshape: "italic", tt: "mono", ttfamily: "mono", sc: "smallcaps", scshape: "smallcaps",
};

/** Commands that are dropped, with the number of {..} arguments to drop too. */
const IGNORED_COMMANDS: Record<string, number> = {
  noindent: 0, indent: 0, centering: 0, raggedright: 0, raggedleft: 0, normalfont: 0, protect: 0,
  nopagebreak: 0, vfill: 0, hline: 0, toprule: 0, midrule: 0, bottomrule: 0, maketitle: 0,
  tiny: 0, scriptsize: 0, footnotesize: 0, small: 0, normalsize: 0, large: 0, Large: 0,
  LARGE: 0, huge: 0, Huge: 0, rmfamily: 0, sffamily: 0, mdseries: 0, upshape: 0, sloppy: 0,
  displaystyle: 0, relax: 0, null: 0, strut: 0, allowbreak: 0, par: 0, item: 0, fill: 0,
  label: 1, vspace: 1, pagestyle: 1, thispagestyle: 1, color: 1, phantom: 1, hphantom: 1,
  vphantom: 1, cline: 1, pagenumbering: 1, usepackage: 1, documentclass: 1, input: 1,
  include: 1, bibliographystyle: 1, graphicspath: 1, geometry: 1, title: 1, author: 1,
  date: 1, pointsinmargin: 0, pointsinrightmargin: 0, bracketedpoints: 0, printanswers: 0,
  noprintanswers: 0, addpoints: 0, firstpageheader: 3, runningheader: 3, firstpagefooter: 3,
  runningfooter: 3, setlength: 2, addtolength: 2, setcounter: 2, addtocounter: 2,
  renewcommand: 2, pointname: 1, marksnotpoints: 0, qformat: 1, hypersetup: 1,
  // Paper details: read separately by parseMeta, so they print nothing in the body.
  examtitle: 1, subject: 1, coursecode: 1, semester: 1, maxmarks: 1, duration: 1,
  examdate: 1, note: 1, noheader: 0, institute: 1, affiliation: 1, logo: 1, usnlabel: 1,
  usnprefix: 1, usnboxes: 1, nousn: 0,
};

const SYMBOLS: Record<string, string> = {
  ldots: "…", dots: "…", textbackslash: "\\", textdegree: "°", S: "§", P: "¶", pounds: "£",
  copyright: "©", textbullet: "•", textendash: "–", textemdash: "—", LaTeX: "LaTeX",
  TeX: "TeX", textasciitilde: "~", textasciicircum: "^", textless: "<", textgreater: ">",
  textbar: "|", quad: " ", qquad: "  ", enspace: " ", thinspace: " ",
  textquoteleft: "‘", textquoteright: "’", textquotedblleft: "“", textquotedblright: "”",
  textrupee: "₹", texttimes: "×", degree: "°", slash: "/",
};

function substituteArgs(body: string, args: string[]): string {
  return body.replace(/#(\d)/g, (_, n) => args[parseInt(n, 10) - 1] ?? "");
}

function parseImageOptions(option: string): { width?: string; height?: string } {
  const result: { width?: string; height?: string } = {};
  for (const part of option.split(",")) {
    const [key, value] = part.split("=").map((x) => x.trim());
    if (!value) continue;
    if (key === "width") result.width = latexLengthToCss(value);
    else if (key === "height") result.height = latexLengthToCss(value);
    else if (key === "scale") {
      const factor = parseFloat(value);
      if (Number.isFinite(factor) && factor > 0 && factor <= 1) result.width = `${Math.round(factor * 100)}%`;
    }
  }
  return result;
}

function parseInlines(s: string, ctx: Ctx): Inline[] {
  const out: Inline[] = [];
  let buf = "";

  const flush = () => {
    if (!buf) return;
    const text = buf.replace(/[ \t\r\n]+/g, " ");
    const last = out[out.length - 1];
    if (last && last.type === "text") last.text += text;
    else out.push({ type: "text", text });
    buf = "";
  };
  const push = (inline: Inline) => {
    flush();
    out.push(inline);
  };

  let i = 0;
  while (i < s.length) {
    const c = s[i];

    if (c === "$") {
      const close = findInlineMathEnd(s, i);
      if (close === -1) {
        buf += "$";
        i++;
      } else {
        push({ type: "math", tex: s.slice(i + 1, close).trim() });
        i = close + 1;
      }
      continue;
    }

    if (c === "{") {
      const group = readGroup(s, i);
      if (!group) {
        i++;
        continue;
      }
      flush();
      for (const inline of parseInlines(group.content, ctx)) out.push(inline);
      i = group.end;
      continue;
    }

    if (c === "}") {
      i++;
      continue;
    }
    if (c === "~") {
      buf += " ";
      i++;
      continue;
    }
    if (c === "`") {
      const double = s[i + 1] === "`";
      buf += double ? "“" : "‘";
      i += double ? 2 : 1;
      continue;
    }
    if (c === "'" && s[i + 1] === "'") {
      buf += "”";
      i += 2;
      continue;
    }
    if (c === "-" && s[i + 1] === "-") {
      const triple = s[i + 2] === "-";
      buf += triple ? "—" : "–";
      i += triple ? 3 : 2;
      continue;
    }

    if (c !== "\\") {
      buf += c;
      i++;
      continue;
    }

    // --- Backslash sequences ---
    const next = s[i + 1];
    if (next === undefined) {
      i++;
      continue;
    }
    if (next === "(") {
      const close = s.indexOf("\\)", i + 2);
      if (close === -1) {
        i += 2;
        continue;
      }
      push({ type: "math", tex: s.slice(i + 2, close).trim() });
      i = close + 2;
      continue;
    }
    if (next === "\\") {
      i += 2;
      if (s[i] === "*") i++;
      const opt = readOptional(s, skipInlineSpaces(s, i));
      if (opt) i = opt.end;
      push({ type: "break" });
      continue;
    }
    if ("%&_#${}".includes(next)) {
      buf += next;
      i += 2;
      continue;
    }
    if (next === " " || next === "," || next === ";" || next === ":" || next === "\n") {
      buf += " ";
      i += 2;
      continue;
    }
    if (!/[a-zA-Z]/.test(next)) {
      // \! \/ \- and friends carry no visible text.
      i += 2;
      continue;
    }

    const nameMatch = /^[a-zA-Z]+/.exec(s.slice(i + 1))!;
    const name = nameMatch[0];
    let j = i + 1 + name.length;
    const starred = s[j] === "*";
    if (starred) j++;

    if (name in STYLE_COMMANDS) {
      const arg = readArg(s, j);
      if (arg) {
        const children = parseInlines(arg.content, ctx);
        const style = STYLE_COMMANDS[name];
        if (style === "plain") {
          flush();
          out.push(...children);
        } else {
          push({ type: "style", style, children });
        }
        i = arg.end;
      } else {
        i = j;
      }
      continue;
    }

    if (name in STYLE_DECLARATIONS) {
      const children = parseInlines(s.slice(skipSpaces(s, j)), ctx);
      push({ type: "style", style: STYLE_DECLARATIONS[name], children });
      i = s.length;
      continue;
    }

    if (name === "hfill" || name === "dotfill" || name === "hrulefill") {
      push({ type: "hfill" });
      i = skipSpaces(s, j);
      continue;
    }

    if (name === "hspace") {
      const arg = readArg(s, j);
      if (arg && /\\fill|\\stretch/.test(arg.content)) push({ type: "hfill" });
      else buf += " ";
      i = arg ? arg.end : j;
      continue;
    }

    if (name === "newline" || name === "linebreak") {
      push({ type: "break" });
      i = skipSpaces(s, j);
      continue;
    }

    if (name in SYMBOLS) {
      buf += SYMBOLS[name];
      // `\LaTeX{}` and `\ldots{}` use an empty group to end the command.
      // Word-like symbols keep the space after them, which is what authors expect.
      if (s.startsWith("{}", j)) i = j + 2;
      else if (/[a-zA-Z]/.test(SYMBOLS[name].slice(-1))) i = j;
      else i = skipInlineSpaces(s, j);
      continue;
    }

    if (name === "includegraphics") {
      let k = skipInlineSpaces(s, j);
      const opt = readOptional(s, k);
      if (opt) k = opt.end;
      const arg = readGroup(s, skipInlineSpaces(s, k));
      if (arg) {
        push({ type: "image", name: arg.content.trim(), ...(opt ? parseImageOptions(opt.content) : {}) });
        i = arg.end;
      } else {
        i = k;
      }
      continue;
    }

    if (name === "qinfo") {
      const cells: string[] = [];
      let k = j;
      for (let n = 0; n < QINFO_COLUMNS.length; n++) {
        const arg = readGroup(s, skipSpaces(s, k));
        if (!arg) break;
        cells.push(inlinesToPlainText(parseInlines(arg.content, ctx)).trim());
        k = arg.end;
      }
      push({ type: "qinfo", cells });
      i = k;
      continue;
    }

    if (name === "marks" || name === "hfillmarks") {
      const arg = readArg(s, j);
      if (arg) {
        push({ type: "hfill" });
        push({ type: "style", style: "bold", children: [{ type: "text", text: `[${arg.content.trim()}]` }] });
        i = arg.end;
      } else {
        i = j;
      }
      continue;
    }

    if (name === "verb") {
      const delimiter = s[j];
      const close = delimiter ? s.indexOf(delimiter, j + 1) : -1;
      if (close !== -1) {
        push({ type: "style", style: "mono", children: [{ type: "text", text: s.slice(j + 1, close) }] });
        i = close + 1;
      } else {
        i = j;
      }
      continue;
    }

    if (name === "textcolor" || name === "colorbox") {
      const color = readArg(s, j);
      const body = color ? readArg(s, color.end) : null;
      if (body) {
        flush();
        out.push(...parseInlines(body.content, ctx));
        i = body.end;
      } else {
        i = color ? color.end : j;
      }
      continue;
    }

    if (name === "footnote") {
      const arg = readArg(s, j);
      if (arg) {
        buf += " (";
        flush();
        out.push(...parseInlines(arg.content, ctx));
        buf += ")";
        i = arg.end;
      } else {
        i = j;
      }
      continue;
    }

    if (name === "today") {
      buf += new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      i = j;
      continue;
    }

    if (name === "newcommand" || name === "renewcommand" || name === "providecommand" || name === "def") {
      const after = consumeMacroDefinition(s, j, name, ctx);
      i = after === j ? j : after;
      continue;
    }

    if (name in IGNORED_COMMANDS) {
      const argCount = IGNORED_COMMANDS[name];
      if (argCount === 0) {
        // No optional argument here: "\noindent [5 marks]" must keep its text.
        i = skipInlineSpaces(s, j);
        continue;
      }
      let k = j;
      const opt = readOptional(s, skipInlineSpaces(s, k));
      if (opt) k = opt.end;
      for (let n = 0; n < argCount; n++) {
        const arg = readGroup(s, skipSpaces(s, k));
        if (!arg) break;
        k = arg.end;
      }
      i = k;
      continue;
    }

    const macro = ctx.macros.get(name);
    if (macro && ctx.expansionDepth < 20) {
      let k = j;
      const args: string[] = [];
      for (let n = 0; n < macro.nargs; n++) {
        const arg = readArg(s, k);
        if (!arg) break;
        args.push(arg.content);
        k = arg.end;
      }
      if (macro.nargs === 0 && s.startsWith("{}", k)) k += 2;
      else if (macro.nargs === 0) k = skipInlineSpaces(s, k);
      ctx.expansionDepth++;
      flush();
      out.push(...parseInlines(substituteArgs(macro.body, args), ctx));
      ctx.expansionDepth--;
      i = k;
      continue;
    }

    ctx.unsupported.add(`\\${name}`);
    push({ type: "unknown", raw: `\\${name}${starred ? "*" : ""}` });
    i = j;
  }

  flush();
  return trimInlines(out);
}

function trimInlines(inlines: Inline[]): Inline[] {
  const result = inlines.filter((x) => !(x.type === "text" && x.text === ""));
  const first = result[0];
  if (first && first.type === "text") first.text = first.text.replace(/^ +/, "");
  const last = result[result.length - 1];
  if (last && last.type === "text") last.text = last.text.replace(/ +$/, "");
  while (result.length && result[result.length - 1].type === "break") result.pop();
  return result.filter((x) => !(x.type === "text" && x.text === ""));
}

function hasContent(inlines: Inline[]): boolean {
  return inlines.some((x) => x.type !== "text" || x.text.trim() !== "");
}

// ---------------------------------------------------------------------------
// Block parsing
// ---------------------------------------------------------------------------

const MATH_ENVS = new Set([
  "equation", "equation*", "align", "align*", "gather", "gather*", "alignat", "alignat*",
  "multline", "multline*", "eqnarray", "eqnarray*", "displaymath", "flalign", "flalign*", "math",
]);

/** Environments that only group content; their body is parsed as normal blocks. */
const TRANSPARENT_ENVS = new Set([
  "document", "table", "table*", "figure", "figure*", "minipage", "quote", "quotation",
  "samepage", "solution", "abstract", "multicols", "titlepage", "wrapfigure", "flushleft",
]);

interface ListEnv {
  ordered: boolean;
  itemCommands: string[];
  defaultFormat?: LabelFormat;
  inline?: boolean;
}

const LIST_ENVS: Record<string, ListEnv> = {
  enumerate: { ordered: true, itemCommands: ["item"] },
  itemize: { ordered: false, itemCommands: ["item"] },
  description: { ordered: false, itemCommands: ["item"] },
  // The `exam` document class.
  questions: { ordered: true, itemCommands: ["question", "titledquestion"], defaultFormat: { counter: "arabic", template: "#." } },
  parts: { ordered: true, itemCommands: ["part"], defaultFormat: { counter: "alph", template: "(#)" } },
  subparts: { ordered: true, itemCommands: ["subpart"], defaultFormat: { counter: "roman", template: "#." } },
  subsubparts: { ordered: true, itemCommands: ["subsubpart"], defaultFormat: { counter: "Alph", template: "#." } },
  choices: { ordered: true, itemCommands: ["choice", "CorrectChoice", "correctchoice"], defaultFormat: { counter: "Alph", template: "#." } },
  checkboxes: { ordered: true, itemCommands: ["choice", "CorrectChoice", "correctchoice"], defaultFormat: { counter: "Alph", template: "#." } },
  oneparchoices: { ordered: true, inline: true, itemCommands: ["choice", "CorrectChoice", "correctchoice"], defaultFormat: { counter: "Alph", template: "#." } },
  oneparcheckboxes: { ordered: true, inline: true, itemCommands: ["choice", "CorrectChoice", "correctchoice"], defaultFormat: { counter: "Alph", template: "#." } },
};

function mathEnvToTex(name: string, inner: string): string {
  const body = inner
    .replace(/\\label\s*\{[^}]*\}/g, "")
    .replace(/\\(nonumber|notag)(?![a-zA-Z])/g, "")
    .trim();
  const base = name.replace(/\*$/, "");
  switch (base) {
    case "equation":
    case "displaymath":
    case "math":
      return body;
    case "eqnarray":
      return `\\begin{array}{rcl}${body}\\end{array}`;
    case "multline":
      return `\\begin{gathered}${body}\\end{gathered}`;
    case "flalign":
      return `\\begin{aligned}${body}\\end{aligned}`;
    case "align":
      return `\\begin{aligned}${body}\\end{aligned}`;
    case "gather":
      return `\\begin{gathered}${body}\\end{gathered}`;
    case "alignat": {
      const arg = readGroup(body, skipSpaces(body, 0));
      const rest = arg ? body.slice(arg.end) : body;
      return `\\begin{aligned}${rest}\\end{aligned}`;
    }
    default:
      return body;
  }
}

function parseColumnSpec(spec: string): { aligns: Align[]; bordered: boolean } {
  const aligns: Align[] = [];
  let bordered = false;
  let i = 0;
  while (i < spec.length) {
    const c = spec[i];
    if (c === "|") bordered = true;
    else if (c === "l" || c === "X") aligns.push("left");
    else if (c === "c") aligns.push("center");
    else if (c === "r") aligns.push("right");
    else if (c === "p" || c === "m" || c === "b") {
      aligns.push("left");
      const width = readGroup(spec, skipSpaces(spec, i + 1));
      if (width) {
        i = width.end;
        continue;
      }
    } else if (c === "@" || c === ">" || c === "<" || c === "!") {
      const group = readGroup(spec, skipSpaces(spec, i + 1));
      if (group) {
        i = group.end;
        continue;
      }
    }
    i++;
  }
  return { aligns, bordered };
}

function parseTable(name: string, inner: string, ctx: Ctx): Block {
  let i = skipSpaces(inner, 0);
  if (name !== "tabular" && name !== "array") {
    // tabular* and tabularx take a width before the column spec.
    const width = readGroup(inner, i);
    if (width) i = skipSpaces(inner, width.end);
  }
  const position = readOptional(inner, i);
  if (position) i = skipSpaces(inner, position.end);
  const specGroup = readGroup(inner, i);
  if (!specGroup) return { type: "unknown", raw: `\\begin{${name}}${inner}\\end{${name}}`, reason: "Table has no column list" };

  const { aligns, bordered: specBordered } = parseColumnSpec(specGroup.content);
  let bordered = specBordered;
  const rows: TableCell[][] = [];

  for (const rawRow of splitTopLevel(inner.slice(specGroup.end), "row")) {
    if (/\\(hline|toprule|midrule|bottomrule|cline)\b/.test(rawRow)) bordered = true;
    const rowText = rawRow
      .replace(/\\(hline|toprule|midrule|bottomrule)\b/g, "")
      .replace(/\\cline\s*\{[^}]*\}/g, "");
    if (!rowText.trim()) continue;

    const cells: TableCell[] = splitTopLevel(rowText, "cell").map((rawCell) => {
      const cell = rawCell.trim();
      const multi = /^\\multicolumn\s*/.exec(cell);
      if (multi) {
        const span = readGroup(cell, multi[0].length);
        const spec = span ? readGroup(cell, skipSpaces(cell, span.end)) : null;
        const body = spec ? readGroup(cell, skipSpaces(cell, spec.end)) : null;
        if (span && spec && body) {
          return {
            inlines: parseInlines(body.content, ctx),
            colSpan: Math.max(1, parseInt(span.content, 10) || 1),
            align: parseColumnSpec(spec.content).aligns[0],
          };
        }
      }
      return { inlines: parseInlines(cell, ctx) };
    });
    rows.push(cells);
  }

  return { type: "table", rows, aligns, bordered };
}

function parseList(name: string, inner: string, ctx: Ctx, depth: number, base: number): Block {
  const env = LIST_ENVS[name];
  let body = inner;
  let format: LabelFormat | undefined = env.defaultFormat;

  const option = readOptional(body, skipInlineSpaces(body, 0));
  let bodyBase = base;
  if (option) {
    body = body.slice(option.end);
    bodyBase += option.end;
    format = parseLabelOption(option.content) ?? format;
  }
  if (env.ordered && !format) format = DEFAULT_ENUM_FORMATS[Math.min(depth, DEFAULT_ENUM_FORMATS.length - 1)];

  // Find each item command that belongs to this list, not to a nested one.
  const itemPattern = new RegExp(`^\\\\(${env.itemCommands.join("|")})(?![a-zA-Z])`);
  const starts: { at: number; contentFrom: number; command: string }[] = [];
  let envDepth = 0;
  let i = 0;
  while (i < body.length) {
    const at = body.indexOf("\\", i);
    if (at === -1) break;
    const begin = envNameAt(body, at, "begin");
    if (begin) {
      const end = VERBATIM_ENVS.includes(begin.name) ? findEnvEnd(body, begin.end, begin.name) : null;
      if (end) {
        i = end.after;
      } else {
        envDepth++;
        i = begin.end;
      }
      continue;
    }
    const end = envNameAt(body, at, "end");
    if (end) {
      envDepth--;
      i = end.end;
      continue;
    }
    const item = envDepth === 0 ? itemPattern.exec(body.slice(at, at + 24)) : null;
    if (item) {
      starts.push({ at, contentFrom: at + item[0].length, command: item[1] });
      i = at + item[0].length;
      continue;
    }
    i = at + 2;
  }

  const items: ListItem[] = [];
  let counter = 0;
  starts.forEach((start, index) => {
    const itemEnd = index + 1 < starts.length ? starts[index + 1].at : body.length;
    let content = body.slice(start.contentFrom, itemEnd);
    let contentBase = bodyBase + start.contentFrom;
    let label: string;
    let marks: string | undefined;

    const opt = readOptional(content, skipInlineSpaces(content, 0));
    if (opt) {
      content = content.slice(opt.end);
      contentBase += opt.end;
    }

    if (start.command === "item") {
      if (opt) {
        label = inlinesToPlainText(parseInlines(opt.content, ctx));
      } else if (env.ordered) {
        counter++;
        label = format!.template.replace("#", formatCounter(counter, format!.counter));
      } else {
        label = name === "description" ? "" : BULLETS[Math.min(depth, BULLETS.length - 1)];
      }
    } else {
      // exam class: the optional argument is the marks for the question.
      counter++;
      label = format!.template.replace("#", formatCounter(counter, format!.counter));
      if (opt && !start.command.toLowerCase().includes("choice")) marks = opt.content.trim();
      if (start.command === "titledquestion") {
        const title = readGroup(content, skipInlineSpaces(content, 0));
        if (title) content = `\\textbf{${title.content}} ${content.slice(title.end)}`;
      }
    }

    items.push({
      range: [bodyBase + start.at, bodyBase + start.at + body.slice(start.at, itemEnd).trimEnd().length],
      label,
      marks,
      correct: start.command.toLowerCase() === "correctchoice" || undefined,
      blocks: parseBlocks(content, ctx, depth + 1, contentBase),
    });
  });

  return { type: "list", ordered: env.ordered, inline: env.inline, items };
}

export function inlinesToPlainText(inlines: Inline[]): string {
  return inlines
    .map((x) => {
      switch (x.type) {
        case "text": return x.text;
        case "math": return x.tex;
        case "style": return inlinesToPlainText(x.children);
        case "break": return " ";
        default: return "";
      }
    })
    .join("");
}

/** `base` is where `s` starts in the full source, so blocks can report their position. */
function parseBlocks(s: string, ctx: Ctx, depth: number, base: number): Block[] {
  const out: Block[] = [];
  let buf = "";
  let i = 0;
  // Where the text collected in `buf` began; -1 while nothing is being collected.
  let segStart = -1;

  const emit = (block: Block, from: number, to: number) => {
    let start = from;
    let end = to;
    while (start < end && /\s/.test(s[start])) start++;
    while (end > start && /\s/.test(s[end - 1])) end--;
    block.range = [base + start, base + end];
    out.push(block);
  };

  const flush = () => {
    const text = buf;
    const from = segStart;
    buf = "";
    segStart = -1;
    if (!text.trim()) return;
    const inlines = parseInlines(text, ctx);
    if (hasContent(inlines)) emit({ type: "paragraph", inlines }, from, i);
  };

  while (i < s.length) {
    if (segStart === -1) segStart = i;
    const c = s[i];

    if (c === "\n") {
      const blank = /^\n[ \t]*\n\s*/.exec(s.slice(i));
      if (blank) {
        flush();
        i += blank[0].length;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    if (c === "$") {
      if (s[i + 1] === "$") {
        const close = s.indexOf("$$", i + 2);
        if (close !== -1) {
          flush();
          emit({ type: "math", tex: s.slice(i + 2, close).trim() }, i, close + 2);
          i = close + 2;
          continue;
        }
      }
      // Keep inline math in one piece so its contents are never read as blocks.
      const close = findInlineMathEnd(s, i);
      if (close !== -1) {
        buf += s.slice(i, close + 1);
        i = close + 1;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    if (c !== "\\") {
      buf += c;
      i++;
      continue;
    }

    if (s[i + 1] === "[") {
      const close = s.indexOf("\\]", i + 2);
      if (close !== -1) {
        flush();
        emit({ type: "math", tex: s.slice(i + 2, close).trim() }, i, close + 2);
        i = close + 2;
        continue;
      }
    }

    if (s[i + 1] === "(") {
      const close = s.indexOf("\\)", i + 2);
      if (close !== -1) {
        buf += s.slice(i, close + 2);
        i = close + 2;
        continue;
      }
    }

    const begin = envNameAt(s, i, "begin");
    if (begin) {
      const end = findEnvEnd(s, begin.end, begin.name);
      if (!end) {
        flush();
        ctx.unsupported.add(`\\begin{${begin.name}} without \\end{${begin.name}}`);
        emit({ type: "unknown", raw: s.slice(i), reason: `\\begin{${begin.name}} is never closed` }, i, s.length);
        return out;
      }
      const inner = s.slice(begin.end, end.start);
      const name = begin.name;
      flush();

      if (MATH_ENVS.has(name)) {
        emit({ type: "math", tex: mathEnvToTex(name, inner) }, i, end.after);
      } else if (name in LIST_ENVS) {
        emit(parseList(name, inner, ctx, depth, base + begin.end), i, end.after);
      } else if (name === "center" || name === "flushright") {
        emit(
          { type: "align", align: name === "center" ? "center" : "right", blocks: parseBlocks(inner, ctx, depth, base + begin.end) },
          i,
          end.after
        );
      } else if (name === "tabular" || name === "tabular*" || name === "tabularx" || name === "array") {
        emit(parseTable(name, inner, ctx), i, end.after);
      } else if (VERBATIM_ENVS.includes(name)) {
        emit({ type: "code", text: inner.replace(/^\[[^\]\n]*\]/, "").replace(/^\r?\n/, "").replace(/\s+$/, "") }, i, end.after);
      } else if (TRANSPARENT_ENVS.has(name)) {
        let body = inner;
        let bodyBase = base + begin.end;
        // Drop placement options and width arguments such as [h] or {0.5\textwidth}.
        for (;;) {
          const at = skipInlineSpaces(body, 0);
          const opt = readOptional(body, at) ?? (name === "minipage" || name === "multicols" || name === "wrapfigure" ? readGroup(body, at) : null);
          if (!opt) break;
          body = body.slice(opt.end);
          bodyBase += opt.end;
        }
        out.push(...parseBlocks(body, ctx, depth, bodyBase));
      } else {
        ctx.unsupported.add(`\\begin{${name}}`);
        emit({ type: "unknown", raw: s.slice(i, end.after), reason: `The "${name}" environment is not supported` }, i, end.after);
      }
      i = end.after;
      continue;
    }

    const command = /^\\([a-zA-Z]+)(\*?)/.exec(s.slice(i, i + 40));
    if (!command) {
      // Escapes like \\ \% \& stay with the paragraph, as one unit.
      buf += s.slice(i, i + 2);
      i += 2;
      continue;
    }
    const name = command[1];
    const afterName = i + command[0].length;

    if (name === "section" || name === "subsection" || name === "subsubsection" || name === "paragraph") {
      let k = skipInlineSpaces(s, afterName);
      const opt = readOptional(s, k);
      if (opt) k = opt.end;
      const title = readGroup(s, skipInlineSpaces(s, k));
      if (title) {
        flush();
        const level = name === "section" ? 1 : name === "subsection" ? 2 : 3;
        emit({ type: "heading", level, inlines: parseInlines(title.content, ctx) }, i, title.end);
        i = title.end;
        continue;
      }
    }

    if (name === "caption") {
      const title = readGroup(s, skipInlineSpaces(s, afterName));
      if (title) {
        flush();
        emit(
          {
            type: "align",
            align: "center",
            blocks: [{ type: "paragraph", inlines: [{ type: "style", style: "italic", children: parseInlines(title.content, ctx) }] }],
          },
          i,
          title.end
        );
        i = title.end;
        continue;
      }
    }

    if (name === "newcommand" || name === "renewcommand" || name === "providecommand" || name === "def") {
      const after = consumeMacroDefinition(s, afterName, name, ctx);
      if (after !== afterName) {
        i = after;
        continue;
      }
    }

    if (name === "hrule" || (name === "hrulefill" && !buf.trim())) {
      flush();
      emit({ type: "rule" }, i, afterName);
      i = afterName;
      continue;
    }

    if (name === "rule") {
      const width = readGroup(s, skipInlineSpaces(s, afterName));
      const height = width ? readGroup(s, skipInlineSpaces(s, width.end)) : null;
      if (width && height) {
        if (/\\(textwidth|linewidth)/.test(width.content)) {
          flush();
          emit({ type: "rule" }, i, height.end);
        }
        i = height.end;
        continue;
      }
    }

    if (name === "bigskip" || name === "medskip" || name === "smallskip" || name === "vspace") {
      flush();
      let k = afterName;
      if (name === "vspace") {
        const amount = readGroup(s, skipInlineSpaces(s, k));
        if (amount) k = amount.end;
      }
      emit({ type: "space" }, i, k);
      i = k;
      continue;
    }

    if (name === "qinfoheader") {
      flush();
      emit({ type: "qinfoheader" }, i, afterName);
      i = afterName;
      continue;
    }

    if (name === "newpage" || name === "clearpage" || name === "pagebreak") {
      flush();
      emit({ type: "pagebreak" }, i, afterName);
      i = afterName;
      continue;
    }

    if (name === "par") {
      flush();
      i = afterName;
      continue;
    }

    buf += command[0];
    i = afterName;
  }

  flush();
  return out;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const META_COMMANDS: Record<string, Exclude<keyof PaperMeta, "notes" | "showHeader" | "showUsn">> = {
  institute: "institute",
  affiliation: "affiliation",
  logo: "logo",
  usnlabel: "usnLabel",
  usnprefix: "usnPrefix",
  usnboxes: "usnBoxes",
  examtitle: "examTitle",
  subject: "subject",
  coursecode: "courseCode",
  semester: "semester",
  maxmarks: "maxMarks",
  duration: "duration",
  examdate: "examDate",
};

/** Collects the paper-detail commands from anywhere in the source, preamble included. */
function parseMeta(clean: string, ctx: Ctx): PaperMeta {
  const meta: PaperMeta = {
    notes: [],
    showHeader: !/\\noheader(?![a-zA-Z])/.test(clean),
    showUsn: !/\\nousn(?![a-zA-Z])/.test(clean),
  };
  const command = new RegExp(`\\\\(${Object.keys(META_COMMANDS).join("|")}|note)(?![a-zA-Z])`, "g");
  let match: RegExpExecArray | null;
  while ((match = command.exec(clean))) {
    const group = readGroup(clean, skipInlineSpaces(clean, match.index + match[0].length));
    if (!group) continue;
    const value: MetaValue = {
      text: inlinesToPlainText(parseInlines(group.content, ctx)).trim(),
      range: [match.index, group.end],
    };
    if (match[1] === "note") meta.notes.push(value);
    else meta[META_COMMANDS[match[1]]] = value;
    command.lastIndex = group.end;
  }
  return meta;
}

/** Turns "180", "3 Hours" or "1 hr 30 min" into minutes; 0 when it cannot be read. */
export function durationToMinutes(text: string): number {
  const value = text.trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(value)) return Math.round(parseFloat(value));
  const hours = /(\d+(?:\.\d+)?)\s*h/.exec(value);
  const minutes = /(\d+)\s*m/.exec(value);
  return Math.round((hours ? parseFloat(hours[1]) * 60 : 0) + (minutes ? parseInt(minutes[1], 10) : 0));
}

/** The paper detail whose command contains the given source offset, if any. */
export function findMetaRange(meta: PaperMeta, offset: number): SourceRange | null {
  const values = [
    meta.institute, meta.affiliation, meta.logo, meta.usnLabel, meta.usnPrefix, meta.usnBoxes, meta.examTitle,
    meta.subject, meta.courseCode, meta.semester, meta.maxMarks, meta.duration, meta.examDate, ...meta.notes,
  ];
  const hit = values.find((value) => value && offset >= value.range[0] && offset <= value.range[1]);
  return hit ? hit.range : null;
}

export function parseLatex(source: string): ParsedLatex {
  const ctx: Ctx = { macros: new Map(), unsupported: new Set(), expansionDepth: 0 };
  // "\r\n" becomes " \n" (same length) so offsets still match the original text.
  const clean = stripComments(source.replace(/\r\n/g, " \n"));

  let body = clean;
  let bodyBase = 0;
  const docStart = clean.indexOf("\\begin{document}");
  if (docStart !== -1) {
    // The preamble only matters for the macros it defines.
    const preamble = clean.slice(0, docStart);
    const definition = /\\(newcommand|renewcommand|providecommand|def)(?![a-zA-Z])/g;
    let match: RegExpExecArray | null;
    while ((match = definition.exec(preamble))) {
      consumeMacroDefinition(preamble, match.index + match[0].length, match[1], ctx);
    }
    const docEnd = clean.lastIndexOf("\\end{document}");
    bodyBase = docStart + "\\begin{document}".length;
    body = clean.slice(bodyBase, docEnd === -1 ? undefined : docEnd);
  }

  const blocks = parseBlocks(body, ctx, 0, bodyBase);
  const meta = parseMeta(clean, ctx);

  const macros: Record<string, string> = {};
  ctx.macros.forEach((macro, name) => {
    macros[`\\${name}`] = macro.body;
  });

  return { meta, blocks, macros, unsupported: Array.from(ctx.unsupported) };
}

/** The smallest block or list item whose LaTeX contains the given source offset. */
export function findSourceRange(blocks: Block[], offset: number): SourceRange | null {
  for (const block of blocks) {
    if (!block.range || offset < block.range[0] || offset > block.range[1]) continue;
    if (block.type === "align") return findSourceRange(block.blocks, offset) ?? block.range;
    if (block.type === "list") {
      for (const item of block.items) {
        if (!item.range || offset < item.range[0] || offset > item.range[1]) continue;
        return findSourceRange(item.blocks, offset) ?? item.range;
      }
    }
    return block.range;
  }
  return null;
}
