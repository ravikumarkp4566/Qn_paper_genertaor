// Exports a LaTeX paper as an editable Word document. Text, lists and tables
// become ordinary Word paragraphs and tables, and equations become Word
// equations (see omml.ts), so teachers can keep editing the file in Word.

import {
  AlignmentType,
  BorderStyle,
  Document,
  HighlightColor,
  ImageRun,
  ImportedXmlComponent,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Tab,
  TabStopType,
  Table,
  TableBorders,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type ParagraphChild,
} from "docx";
import { saveAs } from "file-saver";
import { SIT_LOGO_DATA_URL } from "../assets/sitLogo";
import { latexToOmml } from "./omml";
import { cache } from "../services/dataStore";
import { parseLatex, QINFO_COLUMNS, type Align, type Block, type Inline, type ListItem, type PaperMeta, type TableCell as LatexCell } from "./parser";

// A4 with 0.7 inch margins. Word measures in twips (1/20 pt); 15 twips = 1 px.
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN = 1000;
const TEXT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const TEXT_WIDTH_PX = Math.floor(TEXT_WIDTH / 15);
/** How far each list level moves in. */
const LIST_STEP = 520;

const FONT = "Times New Roman";
const MONO_FONT = "Courier New";

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const CELL_NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const CELL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };

const RIGHT_TAB = { type: TabStopType.RIGHT, position: TEXT_WIDTH };

const ALIGNMENT = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
} as const;

type BodyItem = Paragraph | Table;

interface LoadedImage {
  data: Uint8Array;
  type: "png" | "jpg" | "gif" | "bmp";
  width: number;
  height: number;
}

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  mono?: boolean;
  smallCaps?: boolean;
  superScript?: boolean;
  subScript?: boolean;
  size?: number;
}

interface Label {
  text: string;
  /** Where the label starts, in twips from the margin. */
  at: number;
}

/** Layout of the block being written: its indent, alignment and any list labels still to print. */
interface Env {
  indent: number;
  align?: Align;
  labels: Label[];
  /** Marks from the exam class (\question[10]) to print at the right of the first line. */
  marks?: string;
}

interface Context {
  macros: Record<string, string>;
  images: Map<string, LoadedImage>;
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

async function loadImage(blob: Blob): Promise<LoadedImage | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;
    const native: Record<string, LoadedImage["type"]> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/gif": "gif",
      "image/bmp": "bmp",
    };
    let type = native[blob.type];
    let data: Blob = blob;
    if (!type) {
      // Word cannot embed WebP, SVG and the like directly, so turn them into PNG.
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
      data = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((png) => (png ? resolve(png) : reject(new Error("PNG conversion failed"))), "image/png")
      );
      type = "png";
    }
    bitmap.close();
    return { data: new Uint8Array(await data.arrayBuffer()), type, width, height };
  } catch {
    return null;
  }
}

/** Same matching as the preview: the extension may be left out in \includegraphics. */
function findImage<T>(name: string, images: Map<string, T>): T | undefined {
  const wanted = name.split(/[\\/]/).pop()!.toLowerCase();
  const stem = (file: string) => file.toLowerCase().replace(/\.[a-z0-9]+$/, "");
  for (const [file, value] of images) {
    if (file.toLowerCase() === wanted || stem(file) === wanted || stem(file) === stem(wanted)) return value;
  }
  return undefined;
}

/** Turns "40%" or "300px" from the parser into a pixel width on the page. */
function cssToPx(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const number = parseFloat(value);
  if (!Number.isFinite(number)) return undefined;
  return value.endsWith("%") ? (TEXT_WIDTH_PX * number) / 100 : number;
}

function imageRun(image: LoadedImage, width?: string, height?: string): ImageRun {
  let w = cssToPx(width);
  let h = cssToPx(height);
  if (w && !h) h = (w * image.height) / image.width;
  else if (h && !w) w = (h * image.width) / image.height;
  else if (!w || !h) {
    w = image.width;
    h = image.height;
  }
  if (w > TEXT_WIDTH_PX) {
    h = (h * TEXT_WIDTH_PX) / w;
    w = TEXT_WIDTH_PX;
  }
  return new ImageRun({ type: image.type, data: image.data, transformation: { width: Math.round(w), height: Math.round(h) } });
}

// ---------------------------------------------------------------------------
// Inline content
// ---------------------------------------------------------------------------

function mathComponent(tex: string, display: boolean, ctx: Context): ParagraphChild {
  const xml = latexToOmml(tex, display, ctx.macros);
  if (!xml) return new TextRun({ text: tex, italics: true, highlight: HighlightColor.YELLOW });
  // fromXmlString wraps the parsed XML in a nameless root; the equation is its first child.
  const parsed = ImportedXmlComponent.fromXmlString(xml) as unknown as { root: unknown[] };
  return parsed.root[0] as ParagraphChild;
}

function textRun(text: string, style: RunStyle): TextRun {
  return new TextRun({
    text,
    bold: style.bold,
    italics: style.italics,
    underline: style.underline ? {} : undefined,
    font: style.mono ? MONO_FONT : undefined,
    smallCaps: style.smallCaps,
    superScript: style.superScript,
    subScript: style.subScript,
    size: style.size,
  });
}

function inlineChildren(inlines: Inline[], ctx: Context, style: RunStyle = {}): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  for (const inline of inlines) {
    switch (inline.type) {
      case "text":
        out.push(textRun(inline.text, style));
        break;
      case "math":
        out.push(mathComponent(inline.tex, false, ctx));
        break;
      case "style": {
        const next: RunStyle = { ...style };
        if (inline.style === "bold") next.bold = true;
        else if (inline.style === "italic") next.italics = true;
        else if (inline.style === "underline") next.underline = true;
        else if (inline.style === "mono") next.mono = true;
        else if (inline.style === "smallcaps") next.smallCaps = true;
        else if (inline.style === "sup") next.superScript = true;
        else if (inline.style === "sub") next.subScript = true;
        out.push(...inlineChildren(inline.children, ctx, next));
        break;
      }
      case "break":
        out.push(new TextRun({ break: 1 }));
        break;
      case "hfill":
        out.push(new TextRun({ children: [new Tab()] }));
        break;
      case "image": {
        const image = findImage(inline.name, ctx.images);
        out.push(
          image
            ? imageRun(image, inline.width, inline.height)
            : new TextRun({ text: `[Image ${inline.name} not uploaded]`, highlight: HighlightColor.YELLOW })
        );
        break;
      }
      case "unknown":
        out.push(new TextRun({ text: inline.raw, font: MONO_FONT, highlight: HighlightColor.YELLOW }));
        break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

// The marks/BL/CO/PO/PSO columns (\qinfo) sit at the right edge, one centre tab each.
const QINFO_COLUMN_WIDTH = 560;
const QINFO_WIDTH = QINFO_COLUMNS.length * QINFO_COLUMN_WIDTH;
const QINFO_TABS = QINFO_COLUMNS.map((_, index) => ({
  type: TabStopType.CENTER,
  position: TEXT_WIDTH - QINFO_WIDTH + Math.round((index + 0.5) * QINFO_COLUMN_WIDTH),
}));

function qinfoRuns(cells: string[], header = false): ParagraphChild[] {
  return QINFO_COLUMNS.flatMap((_, index) => [
    new TextRun({ children: [new Tab()] }),
    new TextRun({ text: cells[index] ?? "", bold: header || index === 0, size: 20 }),
  ]);
}

/** A paragraph in the current layout. Pending list labels and marks go on its first line. */
function paragraph(
  children: ParagraphChild[],
  env: Env,
  options: { spacingAfter?: number; qinfo?: string[] } = {}
): Paragraph {
  const labels = env.labels.splice(0);
  const marks = env.marks;
  env.marks = undefined;
  const content = [...children];
  if (marks) content.push(new TextRun({ children: [new Tab()] }), new TextRun({ text: `[${marks}]`, bold: true }));
  // Text wraps before the columns; the columns are reached with tabs past the right indent.
  if (options.qinfo) content.push(...qinfoRuns(options.qinfo));
  const right = options.qinfo ? QINFO_WIDTH + 120 : undefined;
  const endTabs = options.qinfo ? QINFO_TABS : [RIGHT_TAB];

  const spacing = { after: options.spacingAfter ?? 80 };
  const alignment = env.align ? ALIGNMENT[env.align] : undefined;
  if (labels.length === 0) {
    return new Paragraph({
      children: content,
      indent: env.indent || right ? { left: env.indent, right } : undefined,
      alignment,
      tabStops: endTabs,
      spacing,
    });
  }
  // Labels hang to the left of the text: "1.  (a)  Solve ..." with each label on its own tab stop.
  const labelRuns: ParagraphChild[] = labels.flatMap((label) => [new TextRun(label.text), new TextRun({ children: [new Tab()] })]);
  const stops = [...labels.slice(1).map((label) => label.at), env.indent].map((position) => ({ type: TabStopType.LEFT, position }));
  return new Paragraph({
    children: [...labelRuns, ...content],
    indent: { left: env.indent, hanging: env.indent - labels[0].at, right },
    tabStops: [...stops, ...endTabs],
    alignment,
    spacing,
  });
}

/** Prints labels that have no text line of their own to sit on, e.g. before a table. */
function flushLabels(env: Env, out: BodyItem[]) {
  if (env.labels.length || env.marks) out.push(paragraph([], env));
}

function estimateColumnWidths(rows: LatexCell[][], available: number): number[] {
  const columns = Math.max(1, ...rows.map((cells) => cells.reduce((sum, cell) => sum + (cell.colSpan ?? 1), 0)));
  const longest = Array<number>(columns).fill(1);
  for (const cells of rows) {
    let column = 0;
    for (const cell of cells) {
      if ((cell.colSpan ?? 1) === 1) {
        const length = cell.inlines.reduce((sum, x) => sum + (x.type === "text" ? x.text.length : x.type === "math" ? x.tex.length / 2 : 4), 0);
        longest[column] = Math.max(longest[column], length);
      }
      column += cell.colSpan ?? 1;
    }
  }
  const widths = longest.map((length) => Math.min(4000, Math.max(700, length * 130 + 300)));
  const total = widths.reduce((a, b) => a + b, 0);
  return total > available ? widths.map((width) => Math.floor((width * available) / total)) : widths;
}

function table(block: Extract<Block, { type: "table" }>, env: Env, ctx: Context): Table {
  const widths = estimateColumnWidths(block.rows, TEXT_WIDTH - env.indent);
  const rows = block.rows.map((cells) => {
    let column = 0;
    return new TableRow({
      children: cells.map((cell) => {
        const span = cell.colSpan ?? 1;
        const width = widths.slice(column, column + span).reduce((a, b) => a + b, 0);
        const align = cell.align ?? block.aligns[column] ?? "left";
        column += span;
        return new TableCell({
          columnSpan: span > 1 ? span : undefined,
          width: { size: width, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: block.bordered ? CELL_BORDERS : CELL_NO_BORDERS,
          margins: { left: 80, right: 80, top: 40, bottom: 40 },
          children: [new Paragraph({ children: inlineChildren(cell.inlines, ctx), alignment: ALIGNMENT[align] })],
        });
      }),
    });
  });
  return new Table({
    rows,
    columnWidths: widths,
    borders: TableBorders.NONE,
    alignment: env.align === "center" ? AlignmentType.CENTER : env.align === "right" ? AlignmentType.RIGHT : undefined,
    indent: env.indent && env.align !== "center" ? { size: env.indent, type: WidthType.DXA } : undefined,
  });
}

function listItems(block: Extract<Block, { type: "list" }>, env: Env, ctx: Context, depth: number, out: BodyItem[]) {
  // Labels of an outer item whose text starts with this list ("1." before "(a)").
  const inherited = env.labels.splice(0);
  const labelAt = env.indent;
  const contentAt = env.indent + LIST_STEP;

  if (block.inline) {
    // Multiple-choice options on one line: "A. 21    B. 23    C. 27".
    const children: ParagraphChild[] = [];
    block.items.forEach((item, index) => {
      if (index > 0) children.push(new TextRun("      "));
      children.push(new TextRun(`${item.label} `));
      const first = item.blocks.find((b) => b.type === "paragraph");
      if (first && first.type === "paragraph") children.push(...inlineChildren(first.inlines, ctx));
    });
    out.push(paragraph(children, { ...env, labels: inherited }));
    return;
  }

  block.items.forEach((item: ListItem, index) => {
    const itemEnv: Env = {
      indent: item.label ? contentAt : env.indent,
      align: env.align,
      labels: [...(index === 0 ? inherited : []), ...(item.label ? [{ text: item.label, at: labelAt }] : [])],
      marks: item.marks,
    };
    blocks(item.blocks, itemEnv, ctx, depth + 1, out);
    flushLabels(itemEnv, out);
  });
}

function blocks(list: Block[], env: Env, ctx: Context, depth: number, out: BodyItem[]) {
  for (const block of list) {
    switch (block.type) {
      case "paragraph": {
        const qinfo = block.inlines.find((x): x is Extract<Inline, { type: "qinfo" }> => x.type === "qinfo");
        const text = qinfo ? block.inlines.filter((x) => x !== qinfo && x.type !== "hfill") : block.inlines;
        out.push(paragraph(inlineChildren(text, ctx), env, { qinfo: qinfo?.cells }));
        break;
      }
      case "qinfoheader":
        out.push(
          new Paragraph({
            children: qinfoRuns(QINFO_COLUMNS, true),
            tabStops: QINFO_TABS,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
            spacing: { after: 120 },
          })
        );
        break;
      case "heading": {
        const size = block.level === 1 ? 28 : block.level === 2 ? 26 : 24;
        out.push(paragraph(inlineChildren(block.inlines, ctx, { bold: true, size }), env, { spacingAfter: 120 }));
        break;
      }
      case "math":
        flushLabels(env, out);
        out.push(new Paragraph({ children: [mathComponent(block.tex, true, ctx)], indent: env.indent ? { left: env.indent } : undefined, spacing: { before: 60, after: 120 } }));
        break;
      case "list":
        listItems(block, env, ctx, depth, out);
        break;
      case "table":
        flushLabels(env, out);
        out.push(table(block, env, ctx));
        out.push(new Paragraph({ spacing: { after: 60 } }));
        break;
      case "align": {
        // Shares the label list, so labels printed inside count as printed here too.
        const inner: Env = { ...env, align: block.align };
        blocks(block.blocks, inner, ctx, depth, out);
        env.marks = inner.marks;
        break;
      }
      case "code":
        flushLabels(env, out);
        block.text.split("\n").forEach((line) =>
          out.push(
            new Paragraph({
              children: [new TextRun({ text: line || " ", font: MONO_FONT, size: 20 })],
              indent: { left: env.indent + 200 },
              shading: { type: ShadingType.CLEAR, color: "auto", fill: "F1F5F9" },
              spacing: { after: 0 },
            })
          )
        );
        out.push(new Paragraph({ spacing: { after: 60 } }));
        break;
      case "rule":
        out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } } }));
        break;
      case "space":
        out.push(new Paragraph({}));
        break;
      case "pagebreak":
        out.push(new Paragraph({ children: [new PageBreak()] }));
        break;
      case "unknown":
        out.push(paragraph([new TextRun({ text: block.raw, font: MONO_FONT, size: 18, highlight: HighlightColor.YELLOW })], env));
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function formatDuration(text: string): string {
  if (!/^\d+$/.test(text.trim())) return text;
  const hours = parseInt(text, 10) / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ${hours === 1 ? "Hour" : "Hours"}`;
}

function cell(children: (Paragraph | Table)[], width: number, borders = CELL_NO_BORDERS, align = VerticalAlign.CENTER): TableCell {
  return new TableCell({ children, width: { size: width, type: WidthType.DXA }, borders, verticalAlign: align });
}

function header(meta: PaperMeta, logo: LoadedImage | null): BodyItem[] {
  const out: BodyItem[] = [];

  if (meta.showUsn || meta.courseCode) {
    const boxCount = Math.min(20, Math.max(1, parseInt(meta.usnBoxes?.text ?? "", 10) || 10));
    const prefix = meta.usnPrefix?.text ?? "";
    const labelWidth = 900;
    const boxWidth = 330;
    const codeWidth = 2600;
    const cells: TableCell[] = [];
    const widths: number[] = [];
    if (meta.showUsn) {
      cells.push(cell([new Paragraph({ children: [new TextRun({ text: meta.usnLabel?.text ?? "USN", bold: true })] })], labelWidth));
      widths.push(labelWidth);
      for (let i = 0; i < boxCount; i++) {
        cells.push(cell([new Paragraph({ children: [new TextRun({ text: prefix[i] ?? "", bold: true, font: MONO_FONT })], alignment: AlignmentType.CENTER })], boxWidth, CELL_BORDERS));
        widths.push(boxWidth);
      }
    }
    const spacer = Math.max(200, TEXT_WIDTH - widths.reduce((a, b) => a + b, 0) - codeWidth);
    cells.push(cell([new Paragraph({})], spacer));
    widths.push(spacer);
    cells.push(cell([new Paragraph({ children: [new TextRun({ text: meta.courseCode?.text ?? "", bold: true, size: 26 })], alignment: AlignmentType.RIGHT })], codeWidth));
    widths.push(codeWidth);
    out.push(new Table({ rows: [new TableRow({ children: cells })], columnWidths: widths, borders: TableBorders.NONE }));
    out.push(new Paragraph({ spacing: { after: 60 } }));
  }

  const nameLines: Paragraph[] = [];
  if (meta.institute) {
    nameLines.push(new Paragraph({ children: [new TextRun({ text: meta.institute.text, bold: true, size: 30 })], alignment: AlignmentType.CENTER }));
  }
  if (meta.affiliation) {
    nameLines.push(new Paragraph({ children: [new TextRun({ text: meta.affiliation.text, italics: true, size: 18 })], alignment: AlignmentType.CENTER }));
  }
  if (logo) {
    // Logo on the left of the institute name, as on the printed paper.
    const logoWidth = 1500;
    const logoPx = 64;
    const logoCell = cell(
      [new Paragraph({ children: [new ImageRun({ type: logo.type, data: logo.data, transformation: { width: logoPx, height: Math.round((logoPx * logo.height) / logo.width) } })], alignment: AlignmentType.CENTER })],
      logoWidth
    );
    const textCell = cell(nameLines.length ? nameLines : [new Paragraph({})], TEXT_WIDTH - logoWidth);
    out.push(new Table({ rows: [new TableRow({ children: [logoCell, textCell] })], columnWidths: [logoWidth, TEXT_WIDTH - logoWidth], borders: TableBorders.NONE }));
  } else {
    out.push(...nameLines);
  }

  const title = [meta.examTitle?.text, meta.examDate?.text].filter(Boolean).join(", ");
  if (title) {
    out.push(new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 26 })], alignment: AlignmentType.CENTER, spacing: { before: 160 } }));
  }
  if (meta.subject) {
    out.push(new Paragraph({ children: [new TextRun({ text: meta.subject.text, bold: true, size: 32 })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } }));
  }
  if (meta.duration || meta.maxMarks) {
    out.push(
      new Paragraph({
        children: [
          new TextRun({ text: meta.duration ? `Time: ${formatDuration(meta.duration.text)}` : "", bold: true }),
          new TextRun({ children: [new Tab()] }),
          new TextRun({ text: meta.maxMarks ? `Max. Marks: ${meta.maxMarks.text}` : "", bold: true }),
        ],
        tabStops: [RIGHT_TAB],
        spacing: { before: 120, after: 60 },
      })
    );
  }
  meta.notes.forEach((note, index) => {
    out.push(
      new Paragraph({
        children: [
          new TextRun({ text: index === 0 ? "Note :" : "", bold: true, size: 20 }),
          new TextRun({ children: [new Tab()] }),
          new TextRun({ text: `${index + 1}. ${note.text}`, italics: true, size: 20 }),
        ],
        indent: { left: 900, hanging: 900 },
        tabStops: [{ type: TabStopType.LEFT, position: 900 }],
        spacing: { after: 20 },
      })
    );
  });
  // The heavy line between the header and the questions.
  out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000", space: 4 } }, spacing: { after: 200 } }));
  return out;
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/** Builds the .docx for a LaTeX paper. `images` holds the paper's uploaded images by file name. */
export async function buildLatexDocx(source: string, images: Record<string, Blob>): Promise<Blob> {
  const parsed = parseLatex(source);
  const loaded = new Map<string, LoadedImage>();
  for (const [name, blob] of Object.entries(images)) {
    const image = await loadImage(blob);
    if (image) loaded.set(name, image);
  }

  let logo: LoadedImage | null = null;
  const logoName = parsed.meta.logo?.text;
  if (parsed.meta.showHeader && logoName) {
    if (logoName === "college-logo" && cache.logoBytes) logo = await loadImage(new Blob([cache.logoBytes]));
    else if (logoName === "sit-logo") logo = await loadImage(await (await fetch(SIT_LOGO_DATA_URL)).blob());
    else logo = findImage(logoName, loaded) ?? null;
  }

  const ctx: Context = { macros: parsed.macros, images: loaded };
  const body: BodyItem[] = parsed.meta.showHeader ? header(parsed.meta, logo) : [];
  blocks(parsed.blocks, { indent: 0, labels: [] }, ctx, 0, body);

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 24 } } } },
    sections: [
      {
        properties: {
          page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
        },
        children: body,
      },
    ],
  });
  return Packer.toBlob(doc);
}

export function docxFileName(meta: PaperMeta): string {
  const name = [meta.courseCode?.text, meta.subject?.text, meta.examTitle?.text].filter(Boolean).join(" - ") || "Question paper";
  return `${name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120)}.docx`;
}

export async function downloadLatexDocx(source: string, images: Record<string, Blob>): Promise<void> {
  const blob = await buildLatexDocx(source, images);
  saveAs(blob, docxFileName(parseLatex(source).meta));
}
