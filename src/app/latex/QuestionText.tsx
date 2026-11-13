import { memo, useMemo } from "react";
import { parseLatex } from "./parser";
import { LatexRenderer } from "./LatexRenderer";
import { useQuestionImageUrls } from "../services/questionImages";
import type { Question } from "../services/storage/questionStorage";

/** Compact styling for questions shown in lists and pickers rather than on a paper. */
const COMPACT = "space-y-1.5 text-xs leading-relaxed text-slate-800 [&_img]:max-h-40 [&_img]:w-auto";

/**
 * A question's text as it will print: equations rendered and images shown.
 * Plain-text questions (written before LaTeX support) are shown as typed.
 */
export const QuestionText = memo(function QuestionText({
  question,
  className = COMPACT,
}: {
  question: Pick<Question, "id" | "text" | "format" | "images">;
  className?: string;
}) {
  const images = useQuestionImageUrls(question.id, question.images);
  const parsed = useMemo(() => (question.format === "latex" ? parseLatex(question.text) : null), [question.format, question.text]);
  if (!parsed) return <span className="whitespace-pre-wrap">{question.text}</span>;
  return <LatexRenderer blocks={parsed.blocks} macros={parsed.macros} images={images} className={className} />;
});
