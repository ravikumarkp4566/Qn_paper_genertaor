// Text operations behind the LaTeX editor's toolbar and shortcuts. Each one
// works out a single replacement; `applyEdit` performs it through the browser's
// own editing so Ctrl+Z / Ctrl+Y keep working.

export interface TextEdit {
  from: number;
  to: number;
  insert: string;
  /** Selection to leave afterwards, usually around the placeholder to type over. */
  selectFrom: number;
  selectTo: number;
}

export interface Snippet {
  before: string;
  after?: string;
  /** Selected after inserting, so typing replaces it. Used when nothing is selected. */
  placeholder?: string;
  /** Put the snippet on lines of its own. */
  block?: boolean;
  /** Maths: wrapped in $...$ when the cursor is not already inside maths. */
  math?: boolean;
}

export function applyEdit(textarea: HTMLTextAreaElement, edit: TextEdit): void {
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(edit.from, edit.to);
  const unchanged = edit.from === edit.to && edit.insert === "";
  // execCommand is deprecated but is still the only way to edit a textarea
  // without wiping its undo history; every current browser supports it.
  const done = unchanged || document.execCommand("insertText", false, edit.insert);
  if (!done) {
    textarea.setRangeText(edit.insert, edit.from, edit.to, "end");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
  textarea.setSelectionRange(edit.selectFrom, edit.selectTo);
}

function lineStartOf(value: string, position: number): number {
  return value.lastIndexOf("\n", position - 1) + 1;
}

function lineEndOf(value: string, position: number): number {
  const end = value.indexOf("\n", position);
  return end === -1 ? value.length : end;
}

export function snippetEdit(value: string, start: number, end: number, snippet: Snippet): TextEdit {
  const selected = value.slice(start, end);
  const body = selected || snippet.placeholder || "";
  let before = snippet.before;
  let after = snippet.after ?? "";

  if (snippet.math && !isInsideMath(value, start)) {
    before = `$${before}`;
    after = `${after}$`;
  }
  if (snippet.block) {
    if (value.slice(lineStartOf(value, start), start).trim()) before = `\n${before}`;
    if (value.slice(end, lineEndOf(value, end)).trim()) after = `${after}\n`;
  }

  const selectFrom = start + before.length;
  return { from: start, to: end, insert: before + body + after, selectFrom, selectTo: selectFrom + body.length };
}

/** Ctrl+/ : comment out the selected lines with %, or uncomment them if they all are. */
export function toggleCommentEdit(value: string, start: number, end: number): TextEdit {
  const from = lineStartOf(value, start);
  // A selection ending at the start of a line does not include that line.
  const to = lineEndOf(value, end > start && value[end - 1] === "\n" ? end - 1 : end);
  const lines = value.slice(from, to).split("\n");
  const commented = lines.filter((line) => line.trim()).every((line) => /^\s*%/.test(line));
  const insert = lines
    .map((line) => {
      if (commented) return line.replace(/^(\s*)% ?/, "$1");
      return line.trim() ? line.replace(/^(\s*)/, "$1% ") : line;
    })
    .join("\n");
  return { from, to, insert, selectFrom: from, selectTo: from + insert.length };
}

const INDENT = "  ";

/** Tab / Shift+Tab: indent or outdent. Without a multi-line selection, Tab types two spaces. */
export function indentEdit(value: string, start: number, end: number, outdent: boolean): TextEdit {
  const multiLine = value.slice(start, end).includes("\n");
  if (!outdent && !multiLine) {
    return { from: start, to: end, insert: INDENT, selectFrom: start + INDENT.length, selectTo: start + INDENT.length };
  }
  const from = lineStartOf(value, start);
  const to = lineEndOf(value, end > start && value[end - 1] === "\n" ? end - 1 : end);
  const insert = value
    .slice(from, to)
    .split("\n")
    .map((line) => (outdent ? line.replace(/^ {1,2}|^\t/, "") : line.trim() ? INDENT + line : line))
    .join("\n");
  if (!multiLine) {
    // Outdenting one line keeps the cursor where it was in the text.
    const removed = to - from - insert.length;
    const caret = Math.max(from, start - removed);
    return { from, to, insert, selectFrom: caret, selectTo: caret };
  }
  return { from, to, insert, selectFrom: from, selectTo: from + insert.length };
}

// ---------------------------------------------------------------------------
// Syntax colouring
// ---------------------------------------------------------------------------

export type TokenKind = "text" | "command" | "comment" | "math" | "brace";

export interface Token {
  start: number;
  end: number;
  kind: TokenKind;
}

// Order matters: an escaped "\%" or "\$" is a command, not a comment or maths.
const TOKEN_PATTERN = new RegExp(
  [
    String.raw`(\\(?:[a-zA-Z@]+\*?|[^a-zA-Z@]))`, // 1 command or escape
    String.raw`(%[^\n]*)`, // 2 comment
    String.raw`(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\\\n]|\n(?![ \t]*\n))*\$)`, // 3 maths
    String.raw`([{}\[\]])`, // 4 brace
  ].join("|"),
  "g"
);

export function tokenizeLatex(source: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(source))) {
    if (match[0] === "") {
      TOKEN_PATTERN.lastIndex++;
      continue;
    }
    // "\[" opens display maths rather than being a plain command.
    if (match[1] === "\\[" || match[1] === "\\(") {
      const close = source.indexOf(match[1] === "\\[" ? "\\]" : "\\)", match.index + 2);
      if (close !== -1) {
        if (match.index > last) tokens.push({ start: last, end: match.index, kind: "text" });
        tokens.push({ start: match.index, end: close + 2, kind: "math" });
        last = close + 2;
        TOKEN_PATTERN.lastIndex = last;
        continue;
      }
    }
    const kind: TokenKind = match[1] ? "command" : match[2] ? "comment" : match[3] ? "math" : "brace";
    if (match.index > last) tokens.push({ start: last, end: match.index, kind: "text" });
    tokens.push({ start: match.index, end: match.index + match[0].length, kind });
    last = match.index + match[0].length;
  }
  if (last < source.length) tokens.push({ start: last, end: source.length, kind: "text" });
  return tokens;
}

/** True when the position sits inside $...$, \[...\] or a maths environment. */
export function isInsideMath(value: string, position: number): boolean {
  const inToken = tokenizeLatex(value).some(
    (token) => token.kind === "math" && position > token.start && position < token.end
  );
  if (inToken) return true;
  const before = value.slice(0, position);
  const environments = /\\(begin|end)\{(equation|align|gather|multline|eqnarray|displaymath)\*?\}/g;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = environments.exec(before))) depth += match[1] === "begin" ? 1 : -1;
  return depth > 0;
}
