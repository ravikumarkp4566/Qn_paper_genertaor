import { SIT_LOGO_DATA_URL } from "../assets/sitLogo";
import { SYNC_CLASS, resolveImage, sourceKey } from "./LatexRenderer";
import type { PaperMeta } from "./parser";
import { collegeHeader } from "../services/dataStore";

/**
 * `\logo{college-logo}` is the signed-in college's logo from the database;
 * `\logo{sit-logo}` is kept for papers written before logos moved there.
 * Any other name is an image uploaded to the paper.
 */
function builtInLogo(name: string): string | undefined {
  if (name === "college-logo") return collegeHeader().logoUrl ?? undefined;
  if (name === "sit-logo") return SIT_LOGO_DATA_URL;
  return undefined;
}

const DEFAULT_USN_BOXES = 10;
const MAX_USN_BOXES = 20;

/** "180" is read as minutes; anything else ("3 Hours") is shown as written. */
function formatDuration(text: string): string {
  if (!/^\d+$/.test(text.trim())) return text;
  const hours = parseInt(text, 10) / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ${hours === 1 ? "Hour" : "Hours"}`;
}

/**
 * The header of the paper: roll-number boxes, logo, institute, exam and course
 * titles. Nothing here is fixed to one college. Every part comes from a
 * command in the LaTeX (`\institute{...}`, `\logo{...}`, `\subject{...}`) and
 * carries that command's position, so a click on it can find the command.
 */
export function PaperSheetHeader({ meta, images }: { meta: PaperMeta; images: Record<string, string> }) {
  const boxCount = Math.min(MAX_USN_BOXES, Math.max(1, parseInt(meta.usnBoxes?.text ?? "", 10) || DEFAULT_USN_BOXES));
  const prefix = meta.usnPrefix?.text ?? "";
  const logoName = meta.logo?.text ?? "";
  const logoSrc = logoName ? builtInLogo(logoName) ?? resolveImage(logoName, images) : undefined;
  // Clicking the boxes should land on whichever roll-number command exists.
  const usnRange = (meta.usnPrefix ?? meta.usnLabel ?? meta.usnBoxes)?.range;

  return (
    <div className="space-y-4 border-b-2 border-slate-900 p-6 sm:p-8">
      {/* The sheet sits in a resizable pane, so this layout must not depend on viewport width. */}
      {(meta.showUsn || meta.courseCode) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {meta.showUsn ? (
            <div data-src={sourceKey(usnRange)} className={`flex items-center gap-2 ${SYNC_CLASS}`}>
              <span className="font-mono text-sm font-extrabold tracking-wider text-slate-900">
                {meta.usnLabel?.text ?? "USN"}
              </span>
              <div className="inline-flex divide-x-2 divide-slate-900 border-2 border-slate-900 bg-white">
                {Array.from({ length: boxCount }).map((_, index) => (
                  <div key={index} className="flex h-7 w-5 items-center justify-center font-mono text-xs font-bold text-slate-900">
                    {prefix[index] ?? ""}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <span />
          )}
          {meta.courseCode && (
            <span
              data-src={sourceKey(meta.courseCode.range)}
              className={`font-mono text-base font-black tracking-wider text-slate-900 ${SYNC_CLASS}`}
            >
              {meta.courseCode.text}
            </span>
          )}
        </div>
      )}

      {(meta.logo || meta.institute || meta.affiliation) && (
        <div className="flex items-center justify-center gap-3 text-center">
          {meta.logo &&
            (logoSrc ? (
              <img
                data-src={sourceKey(meta.logo.range)}
                src={logoSrc}
                alt="Institute logo"
                className={`h-14 w-14 shrink-0 object-contain ${SYNC_CLASS}`}
              />
            ) : (
              <span
                data-src={sourceKey(meta.logo.range)}
                className={`shrink-0 rounded border border-dashed border-amber-400 bg-amber-50 px-2 py-1 text-left font-sans text-[11px] text-amber-800 ${SYNC_CLASS}`}
              >
                Logo “{logoName}” is not uploaded.
                <br />
                Use “Add image”.
              </span>
            ))}
          <div>
            {meta.institute && (
              <h2
                data-src={sourceKey(meta.institute.range)}
                className={`text-lg font-black leading-tight tracking-tight text-slate-950 ${SYNC_CLASS}`}
              >
                {meta.institute.text}
              </h2>
            )}
            {meta.affiliation && (
              <p
                data-src={sourceKey(meta.affiliation.range)}
                className={`mt-0.5 text-[11px] italic leading-snug text-slate-700 ${SYNC_CLASS}`}
              >
                {meta.affiliation.text}
              </p>
            )}
          </div>
        </div>
      )}

      {(meta.examTitle || meta.examDate) && (
        <h3 className="pt-1 text-center text-base font-extrabold text-slate-900 sm:text-lg">
          {meta.examTitle && (
            <span data-src={sourceKey(meta.examTitle.range)} className={SYNC_CLASS}>
              {meta.examTitle.text}
            </span>
          )}
          {meta.examTitle && meta.examDate && ", "}
          {meta.examDate && (
            <span data-src={sourceKey(meta.examDate.range)} className={SYNC_CLASS}>
              {meta.examDate.text}
            </span>
          )}
        </h3>
      )}

      {meta.subject && (
        <h1
          data-src={sourceKey(meta.subject.range)}
          className={`text-center text-lg font-black tracking-tight text-slate-950 sm:text-2xl ${SYNC_CLASS}`}
        >
          {meta.subject.text}
        </h1>
      )}

      {(meta.duration || meta.maxMarks) && (
        <div className="flex items-center justify-between pt-1 text-sm font-bold text-slate-900">
          <span data-src={sourceKey(meta.duration?.range)} className={SYNC_CLASS}>
            {meta.duration && `Time: ${formatDuration(meta.duration.text)}`}
          </span>
          <span data-src={sourceKey(meta.maxMarks?.range)} className={SYNC_CLASS}>
            {meta.maxMarks && `Max. Marks: ${meta.maxMarks.text}`}
          </span>
        </div>
      )}

      {meta.notes.length > 0 && (
        <div className="flex items-start gap-2 pt-1 text-xs font-medium italic text-slate-800">
          <span className="shrink-0 whitespace-nowrap font-bold not-italic">Note :</span>
          <div className="space-y-1">
            {meta.notes.map((note, index) => (
              <p key={index} data-src={sourceKey(note.range)} className={SYNC_CLASS}>
                {index + 1}. {note.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
