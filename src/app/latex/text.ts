/** Plain text (questions written before LaTeX support) made safe to use as LaTeX. */
export function plainTextToLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([%&#_$])/g, "\\$1")
    .replace(/([{}])/g, "\\$1")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/~/g, "\\textasciitilde{}");
}
