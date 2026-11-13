// LaTeX maths -> Word's own equation format (OMML), so equations in the
// exported .docx open in Word's equation editor instead of being pictures.
// Route: KaTeX turns the LaTeX into MathML; this file walks the MathML.

import katex from "katex";

const MATH_FONT = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr>';

/** Big operators that take limits and an operand, like \sum and \int. */
const NARY = new Set(["∑", "∏", "∐", "∫", "∬", "∭", "∮", "∯", "∰", "⋃", "⋂", "⋁", "⋀", "⨁", "⨂"]);

/** Where an n-ary operand ends: at a relation or punctuation on the same level. */
const OPERAND_STOP = new Set(["=", "≠", "<", ">", "≤", "≥", "≈", "≡", "∼", "→", "⇒", "⇔", ",", ";", "∣"]);

/** Fences that can only open a \left ... \right pair; "|" and "." can do either. */
const OPENING_FENCES = new Set(["(", "[", "{", "⟨", "⌊", "⌈"]);

/** \hat, \vec and friends: the accent character KaTeX prints -> Word's combining accent. */
const ACCENTS: Record<string, string> = {
  "^": "̂", "ˆ": "̂", "~": "̃", "˜": "̃", "→": "⃗", "⃗": "⃗",
  "˙": "̇", "¨": "̈", "ˇ": "̌", "˘": "̆", "´": "́", "`": "̀",
};
/** Characters that mean an overline (\bar, \overline). */
const BARS = new Set(["ˉ", "¯", "‾", "―", "_"]);

const SCRIPTS: Record<string, string> = {
  "double-struck": "double-struck",
  fraktur: "fraktur",
  script: "script",
  "bold-script": "script",
  "sans-serif": "sans-serif",
  monospace: "monospace",
};

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function run(text: string, options: { plain?: boolean; bold?: boolean; script?: string } = {}): string {
  if (!text) return "";
  const props: string[] = [];
  if (options.script) props.push(`<m:scr m:val="${options.script}"/>`);
  if (options.bold && options.plain) props.push('<m:sty m:val="b"/>');
  else if (options.bold) props.push('<m:sty m:val="bi"/>');
  else if (options.plain) props.push('<m:sty m:val="p"/>');
  const rPr = props.length ? `<m:rPr>${props.join("")}</m:rPr>` : "";
  return `<m:r>${rPr}${MATH_FONT}<m:t xml:space="preserve">${escapeXml(text)}</m:t></m:r>`;
}

const wrap = (tag: string, inner: string) => `<m:${tag}>${inner}</m:${tag}>`;
const elementChildren = (node: Element) => Array.from(node.children);

function textOf(node: Element): string {
  return (node.textContent ?? "").trim();
}

/** The operator character of an element, if it is (or wraps) a single <mo>. */
function operatorOf(node: Element | undefined): string | null {
  if (!node) return null;
  if (node.localName === "mo") return textOf(node);
  if ((node.localName === "mrow" || node.localName === "mstyle") && node.children.length === 1) {
    return operatorOf(node.children[0]);
  }
  return null;
}

function convertToken(node: Element): string {
  const text = node.textContent ?? "";
  const variant = node.getAttribute("mathvariant") ?? "";
  const script = SCRIPTS[variant];
  const bold = variant.includes("bold");
  switch (node.localName) {
    case "mi":
      // Single letters are italic in maths; names like "sin" and "lim" are upright.
      return run(text, { plain: variant === "normal" || [...text].length > 1, bold, script });
    case "mtext":
      return run(text, { plain: true, bold, script });
    default:
      return run(text, { plain: true, bold, script });
  }
}

function convertNary(op: string, lower: string | null, upper: string | null, operand: string): string {
  const props = [
    `<m:chr m:val="${escapeXml(op)}"/>`,
    // Integrals keep their limits at the side, as in LaTeX; sums put them above and below.
    `<m:limLoc m:val="${op.startsWith("∫") || op.startsWith("∮") ? "subSup" : "undOvr"}"/>`,
    lower === null ? '<m:subHide m:val="1"/>' : "",
    upper === null ? '<m:supHide m:val="1"/>' : "",
  ].join("");
  return `<m:nary><m:naryPr>${props}</m:naryPr>${wrap("sub", lower ?? "")}${wrap("sup", upper ?? "")}${wrap("e", operand)}</m:nary>`;
}

/** The parts of a sub/superscript or under/over element whose base is a big operator. */
function naryParts(node: Element): { op: string; lower: string | null; upper: string | null } | null {
  const [base, first, second] = elementChildren(node);
  const op = operatorOf(base);
  if (!op || !NARY.has(op)) return null;
  switch (node.localName) {
    case "msub":
    case "munder":
      return { op, lower: convert(first), upper: null };
    case "msup":
    case "mover":
      return { op, lower: null, upper: convert(first) };
    case "msubsup":
    case "munderover":
      return { op, lower: convert(first), upper: convert(second) };
    default:
      return null;
  }
}

/**
 * A row of items. Two things need the whole row rather than one item:
 * stretchy brackets (\left( ... \right)) become one Word delimiter, and a big
 * operator takes the items after it as its operand.
 */
function convertRow(nodes: Element[]): string {
  let out = "";
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.localName === "mo" && node.getAttribute("fence") === "true") {
      const open = textOf(node);
      // Find the matching \right, skipping over nested \left ... \right pairs.
      let depth = 0;
      let close = -1;
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].localName !== "mo" || nodes[j].getAttribute("fence") !== "true") continue;
        if (OPENING_FENCES.has(textOf(nodes[j]))) depth++;
        else if (depth === 0) {
          close = j;
          break;
        } else depth--;
      }
      // KaTeX leaves out an invisible \right. (as in cases): the bracket then covers the rest of the row.
      if (close === -1 && OPENING_FENCES.has(open)) {
        const props = `<m:dPr><m:begChr m:val="${escapeXml(open)}"/><m:endChr m:val=""/></m:dPr>`;
        out += `<m:d>${props}${wrap("e", convertRow(nodes.slice(i + 1)))}</m:d>`;
        break;
      }
      if (close !== -1) {
        const end = textOf(nodes[close]);
        const props = `<m:dPr><m:begChr m:val="${escapeXml(open)}"/><m:endChr m:val="${escapeXml(end)}"/></m:dPr>`;
        out += `<m:d>${props}${wrap("e", convertRow(nodes.slice(i + 1, close)))}</m:d>`;
        i = close;
        continue;
      }
    }

    const directOp = operatorOf(node);
    const nary =
      directOp && NARY.has(directOp)
        ? { op: directOp, lower: null, upper: null }
        : ["msub", "msup", "msubsup", "munder", "mover", "munderover"].includes(node.localName)
          ? naryParts(node)
          : null;
    if (nary) {
      let end = i + 1;
      while (end < nodes.length && !OPERAND_STOP.has(operatorOf(nodes[end]) ?? "")) end++;
      out += convertNary(nary.op, nary.lower, nary.upper, convertRow(nodes.slice(i + 1, end)));
      i = end - 1;
      continue;
    }

    out += convert(node);
  }
  return out;
}

function convertTable(node: Element): string {
  const rows = elementChildren(node).filter((row) => row.localName === "mtr" || row.localName === "mlabeledtr");
  const cells = rows.map((row) => elementChildren(row).filter((cell) => cell.localName === "mtd"));
  const aligns = (node.getAttribute("columnalign") ?? "").split(/\s+/);

  // aligned / align*: alternating right-left columns are equations, not a matrix.
  const isEquationArray = aligns.length > 1 && aligns[0] === "right" && aligns[1] === "left";
  if (isEquationArray) {
    const lines = cells.map((row) => wrap("e", row.map((cell) => convertRow(elementChildren(cell))).join("")));
    return `<m:eqArr>${lines.join("")}</m:eqArr>`;
  }

  const columns = Math.max(1, ...cells.map((row) => row.length));
  const columnAlign = aligns[0] === "left" ? "left" : aligns[0] === "right" ? "right" : "center";
  const mPr = `<m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="${columns}"/><m:mcJc m:val="${columnAlign}"/></m:mcPr></m:mc></m:mcs></m:mPr>`;
  const body = cells
    .map((row) => {
      const filled = [...row.map((cell) => convertRow(elementChildren(cell)))];
      while (filled.length < columns) filled.push("");
      return wrap("mr", filled.map((cell) => wrap("e", cell)).join(""));
    })
    .join("");
  return `<m:m>${mPr}${body}</m:m>`;
}

function convert(node: Element | undefined): string {
  if (!node) return "";
  const kids = elementChildren(node);
  switch (node.localName) {
    case "math":
    case "mrow":
    case "mstyle":
    case "mpadded":
    case "semantics":
      return convertRow(kids.filter((kid) => kid.localName !== "annotation" && kid.localName !== "annotation-xml"));
    case "annotation":
    case "annotation-xml":
    case "mphantom":
      return "";
    case "mi":
    case "mn":
    case "mo":
    case "mtext":
    case "ms":
      return convertToken(node);
    case "mspace": {
      const width = parseFloat(node.getAttribute("width") ?? "0");
      return width >= 0.5 ? run(" ", { plain: true }) : width > 0.15 ? run(" ", { plain: true }) : "";
    }
    case "mfrac": {
      const noBar = node.getAttribute("linethickness") === "0px" || node.getAttribute("linethickness") === "0";
      const fPr = noBar ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : "";
      return `<m:f>${fPr}${wrap("num", convert(kids[0]))}${wrap("den", convert(kids[1]))}</m:f>`;
    }
    case "msqrt":
      return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/>${wrap("e", convertRow(kids))}</m:rad>`;
    case "mroot":
      return `<m:rad>${wrap("deg", convert(kids[1]))}${wrap("e", convert(kids[0]))}</m:rad>`;
    case "msup":
      return `<m:sSup>${wrap("e", convert(kids[0]))}${wrap("sup", convert(kids[1]))}</m:sSup>`;
    case "msub":
      return `<m:sSub>${wrap("e", convert(kids[0]))}${wrap("sub", convert(kids[1]))}</m:sSub>`;
    case "msubsup":
      return `<m:sSubSup>${wrap("e", convert(kids[0]))}${wrap("sub", convert(kids[1]))}${wrap("sup", convert(kids[2]))}</m:sSubSup>`;
    case "mover": {
      const mark = textOf(kids[1] ?? node);
      if (node.getAttribute("accent") === "true" || kids[1]?.getAttribute("accent") === "true") {
        if (BARS.has(mark)) return `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr>${wrap("e", convert(kids[0]))}</m:bar>`;
        const accent = ACCENTS[mark] ?? mark;
        return `<m:acc><m:accPr><m:chr m:val="${escapeXml(accent)}"/></m:accPr>${wrap("e", convert(kids[0]))}</m:acc>`;
      }
      return `<m:limUpp>${wrap("e", convert(kids[0]))}${wrap("lim", convert(kids[1]))}</m:limUpp>`;
    }
    case "munder": {
      const mark = textOf(kids[1] ?? node);
      if (BARS.has(mark)) return `<m:bar><m:barPr><m:pos m:val="bot"/></m:barPr>${wrap("e", convert(kids[0]))}</m:bar>`;
      return `<m:limLow>${wrap("e", convert(kids[0]))}${wrap("lim", convert(kids[1]))}</m:limLow>`;
    }
    case "munderover":
      return `<m:limUpp>${wrap("e", `<m:limLow>${wrap("e", convert(kids[0]))}${wrap("lim", convert(kids[1]))}</m:limLow>`)}${wrap("lim", convert(kids[2]))}</m:limUpp>`;
    case "mtable":
      return convertTable(node);
    case "menclose":
      return `<m:borderBox>${wrap("e", convertRow(kids))}</m:borderBox>`;
    default:
      return convertRow(kids);
  }
}

/**
 * OMML for a LaTeX formula: `<m:oMath>` for inline maths, wrapped in
 * `<m:oMathPara>` for display maths. Returns null if KaTeX cannot read it.
 */
export function latexToOmml(tex: string, display: boolean, macros: Record<string, string> = {}): string | null {
  let html: string;
  try {
    html = katex.renderToString(tex, { output: "mathml", throwOnError: true, strict: "ignore", macros: { ...macros } });
  } catch {
    return null;
  }
  const math = new DOMParser().parseFromString(html, "text/html").querySelector("math");
  if (!math) return null;
  const body = convert(math);
  if (!body) return null;
  const oMath = `<m:oMath>${body}</m:oMath>`;
  return display ? `<m:oMathPara><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr>${oMath}</m:oMathPara>` : oMath;
}
