import { Fragment, memo, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { Align, Block, Inline, ListItem, SourceRange, TableCell } from "./parser";
import { QINFO_COLUMNS } from "./parser";

/** Marks an element with the LaTeX it came from; the editor reads this to sync both panes. */
export const sourceKey = (range?: SourceRange) => (range ? `${range[0]}:${range[1]}` : undefined);

/** Look of the paper element whose LaTeX holds the cursor (set through data-active). */
export const SYNC_CLASS =
  "rounded-sm data-[active=true]:bg-indigo-50 data-[active=true]:outline-2 data-[active=true]:outline-offset-2 data-[active=true]:outline-indigo-300 data-[active=true]:outline";

interface RenderContext {
  macros: Record<string, string>;
  /** Uploaded image URLs keyed by file name. */
  images: Record<string, string>;
}

const ALIGN_CLASS: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const STYLE_CLASS: Record<string, string> = {
  bold: "font-bold",
  italic: "italic",
  underline: "underline underline-offset-2",
  mono: "font-mono text-[0.92em]",
  smallcaps: "[font-variant:small-caps]",
};

function renderMath(tex: string, displayMode: boolean, macros: Record<string, string>): string {
  // KaTeX writes \gdef results back into the object it is given.
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    strict: "ignore",
    macros: { ...macros },
  });
}

/** Finds an uploaded image whether or not the LaTeX gave its extension. */
export function resolveImage(name: string, images: Record<string, string>): string | undefined {
  const wanted = name.split(/[\\/]/).pop()!.toLowerCase();
  const stem = (file: string) => file.toLowerCase().replace(/\.[a-z0-9]+$/, "");
  const match = Object.keys(images).find(
    (file) => file.toLowerCase() === wanted || stem(file) === wanted || stem(file) === stem(wanted)
  );
  return match ? images[match] : undefined;
}

function Inlines({ inlines, ctx }: { inlines: Inline[]; ctx: RenderContext }): ReactNode {
  return inlines.map((inline, index) => {
    switch (inline.type) {
      case "text":
        return <Fragment key={index}>{inline.text}</Fragment>;
      case "math":
        return (
          <span key={index} dangerouslySetInnerHTML={{ __html: renderMath(inline.tex, false, ctx.macros) }} />
        );
      case "style": {
        const children = <Inlines inlines={inline.children} ctx={ctx} />;
        if (inline.style === "sup") return <sup key={index}>{children}</sup>;
        if (inline.style === "sub") return <sub key={index}>{children}</sub>;
        return (
          <span key={index} className={STYLE_CLASS[inline.style]}>
            {children}
          </span>
        );
      }
      case "break":
        return <br key={index} />;
      case "hfill":
      case "qinfo":
        return null;
      case "image": {
        const src = resolveImage(inline.name, ctx.images);
        if (!src) {
          return (
            <span
              key={index}
              className="inline-block rounded border border-dashed border-amber-400 bg-amber-50 px-3 py-2 font-sans text-xs text-amber-800"
            >
              Image “{inline.name}” is not uploaded yet
            </span>
          );
        }
        return (
          <img
            key={index}
            src={src}
            alt={inline.name}
            className="inline-block max-w-full align-middle"
            style={{ width: inline.width, height: inline.height }}
          />
        );
      }
      case "unknown":
        return (
          <code
            key={index}
            title="This LaTeX command is not supported"
            className="rounded bg-amber-100 px-1 font-mono text-[0.85em] text-amber-900"
          >
            {inline.raw}
          </code>
        );
    }
  });
}

/** The fixed-width right-hand columns: marks, BL, CO, PO, PSO. */
function QinfoColumns({ cells, header = false }: { cells: string[]; header?: boolean }) {
  return (
    <div className={`flex shrink-0 text-[13px] ${header ? "font-bold" : ""}`}>
      {QINFO_COLUMNS.map((_, index) => (
        <span key={index} className={`w-10 text-center ${index === 0 && !header ? "font-bold" : ""}`}>
          {cells[index] ?? ""}
        </span>
      ))}
    </div>
  );
}

/** A line of text; `\hfill` pushes what follows it (usually marks) to the right edge. */
function Line({ inlines, ctx, className = "" }: { inlines: Inline[]; ctx: RenderContext; className?: string }) {
  const qinfo = inlines.find((x): x is Extract<Inline, { type: "qinfo" }> => x.type === "qinfo");
  if (qinfo) {
    // Question text on the left, its marks/BL/CO/PO/PSO in columns on the right.
    return (
      // Columns line up with the question's last line, as in the Word export.
      <div className={`flex items-end gap-3 ${className}`}>
        <div className="min-w-0 flex-1">
          <Line inlines={inlines.filter((x) => x !== qinfo && x.type !== "hfill")} ctx={ctx} />
        </div>
        <QinfoColumns cells={qinfo.cells} />
      </div>
    );
  }
  const fillAt = inlines.findIndex((x) => x.type === "hfill");
  if (fillAt === -1) {
    return (
      <p className={className}>
        <Inlines inlines={inlines} ctx={ctx} />
      </p>
    );
  }
  return (
    <div className={`flex items-baseline justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <Inlines inlines={inlines.slice(0, fillAt)} ctx={ctx} />
      </div>
      <div className="shrink-0 whitespace-nowrap">
        <Inlines inlines={inlines.slice(fillAt + 1)} ctx={ctx} />
      </div>
    </div>
  );
}

function ListItemView({ item, ctx }: { item: ListItem; ctx: RenderContext }) {
  return (
    <div data-src={sourceKey(item.range)} className={`flex items-baseline gap-2 ${SYNC_CLASS}`}>
      {item.label && <span className="min-w-[1.75rem] shrink-0">{item.label}</span>}
      <div className="min-w-0 flex-1 space-y-2">
        <Blocks blocks={item.blocks} ctx={ctx} />
      </div>
      {item.marks && <span className="shrink-0 whitespace-nowrap font-bold">[{item.marks}]</span>}
    </div>
  );
}

function TableView({ rows, aligns, bordered, ctx }: { rows: TableCell[][]; aligns: Align[]; bordered: boolean; ctx: RenderContext }) {
  return (
    <table className="inline-table border-collapse text-left">
      <tbody>
        {rows.map((cells, rowIndex) => {
          let column = 0;
          return (
            <tr key={rowIndex}>
              {cells.map((cell, cellIndex) => {
                const align = cell.align ?? aligns[column] ?? "left";
                column += cell.colSpan ?? 1;
                return (
                  <td
                    key={cellIndex}
                    colSpan={cell.colSpan}
                    className={`px-3 py-1 align-top ${ALIGN_CLASS[align]} ${bordered ? "border border-slate-900" : ""}`}
                  >
                    <Inlines inlines={cell.inlines} ctx={ctx} />
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function BlockView({ block, ctx }: { block: Block; ctx: RenderContext }) {
  switch (block.type) {
    case "paragraph":
      return <Line inlines={block.inlines} ctx={ctx} />;
    case "heading": {
      const size = block.level === 1 ? "text-lg" : block.level === 2 ? "text-base" : "text-[15px]";
      return <Line inlines={block.inlines} ctx={ctx} className={`${size} pt-2 font-bold`} />;
    }
    case "math":
      return (
        <div
          className="overflow-x-auto overflow-y-hidden py-1"
          dangerouslySetInnerHTML={{ __html: renderMath(block.tex, true, ctx.macros) }}
        />
      );
    case "list":
      if (block.inline) {
        return (
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            {block.items.map((item, index) => (
              <ListItemView key={index} item={item} ctx={ctx} />
            ))}
          </div>
        );
      }
      return (
        <div className="space-y-2">
          {block.items.map((item, index) => (
            <ListItemView key={index} item={item} ctx={ctx} />
          ))}
        </div>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <TableView rows={block.rows} aligns={block.aligns} bordered={block.bordered} ctx={ctx} />
        </div>
      );
    case "align":
      return (
        <div className={`space-y-2 ${ALIGN_CLASS[block.align]}`}>
          <Blocks blocks={block.blocks} ctx={ctx} />
        </div>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded bg-slate-50 px-3 py-2 text-left font-mono text-[13px] leading-snug text-slate-900">
          {block.text}
        </pre>
      );
    case "rule":
      return <hr className="border-slate-900" />;
    case "space":
      return <div className="h-3" />;
    case "qinfoheader":
      return (
        <div className="flex justify-end border-b border-slate-300 pb-1">
          <QinfoColumns cells={QINFO_COLUMNS} header />
        </div>
      );
    case "pagebreak":
      return (
        <div className="flex items-center gap-3 py-2 font-sans text-[11px] uppercase tracking-wider text-slate-400">
          <span className="h-px flex-1 border-t border-dashed border-slate-300" />
          Page break
          <span className="h-px flex-1 border-t border-dashed border-slate-300" />
        </div>
      );
    case "unknown":
      return (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-left font-sans">
          <p className="text-xs font-semibold text-amber-900">{block.reason}</p>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[12px] text-amber-900/80">
            {block.raw}
          </pre>
        </div>
      );
  }
}

function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: RenderContext }) {
  return blocks.map((block, index) => (
    <div key={index} data-src={sourceKey(block.range)} className={SYNC_CLASS}>
      <BlockView block={block} ctx={ctx} />
    </div>
  ));
}

interface LatexRendererProps {
  blocks: Block[];
  macros: Record<string, string>;
  images: Record<string, string>;
  /** Overrides the paper typography, e.g. for compact question previews. */
  className?: string;
}

/** Renders a parsed LaTeX paper body in the serif style of a printed paper. */
export const LatexRenderer = memo(function LatexRenderer({ blocks, macros, images, className }: LatexRendererProps) {
  const ctx: RenderContext = { macros, images };
  return (
    <div className={className ?? "space-y-3 font-['Times_New_Roman',Times,serif] text-[16px] leading-relaxed text-slate-950"}>
      <Blocks blocks={blocks} ctx={ctx} />
    </div>
  );
});
