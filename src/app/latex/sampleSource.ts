// The commands that fill the institute header. "Insert header" adds these to
// a paper that has none.
export const INSTITUTE_COMMANDS_TEMPLATE = String.raw`\institute{Siddaganga Institute of Technology, Tumakuru-572 103}
\affiliation{(An Autonomous Institution affiliated to VTU, Belagavi, Approved by AICTE, New Delhi)}
\logo{sit-logo}
\usnlabel{USN}
\usnprefix{1SI}
\usnboxes{10}
`;

export const HEADER_COMMANDS_TEMPLATE = INSTITUTE_COMMANDS_TEMPLATE + String.raw`\examtitle{Semester End Examinations}
\subject{Engineering Mathematics}
\coursecode{MA101}
\semester{Semester 3}
\examdate{June/July 2026}
\duration{3 Hours}
\maxmarks{100}
\note{Revealing of Identity in any form in the answer book will be treated as malpractice.}
\note{Answer any five questions choosing one full question from each unit.}
`;

// Starter text for a new LaTeX paper. It doubles as a tour of what the
// editor understands: equations, nested parts, marks, tables and images.
export const SAMPLE_LATEX_SOURCE = HEADER_COMMANDS_TEMPLATE + String.raw`
\begin{center}
\textbf{Unit - I}
\end{center}

\begin{enumerate}
  \item
  \begin{enumerate}
    \item Solve the differential equation $\dfrac{dy}{dx} + y\tan x = \sin 2x$ given that $y(0) = 1$. \hfill \textbf{[8]}
    \item Evaluate
    \[
      \int_{0}^{\infty} \frac{x^{2}}{(1+x^{2})^{2}} \, dx
    \]
    using the Beta and Gamma functions. \hfill \textbf{[6]}
    \item Find the rank of the matrix
    \[
      A = \begin{bmatrix} 1 & 2 & 3 \\ 2 & 4 & 6 \\ 1 & 0 & 1 \end{bmatrix}
    \]
    \hfill \textbf{[6]}
  \end{enumerate}

  \begin{center} \textbf{OR} \end{center}

  \item
  \begin{enumerate}
    \item State and prove the Cauchy--Riemann equations in polar form. \hfill \textbf{[10]}
    \item The marks scored by five students are given below. Compute the mean and the standard deviation $\sigma = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(x_i - \bar{x})^2}$. \hfill \textbf{[10]}

    \begin{center}
    \begin{tabular}{|c|c|c|c|c|c|}
      \hline
      Student & A & B & C & D & E \\ \hline
      Marks & 42 & 55 & 61 & 38 & 74 \\ \hline
    \end{tabular}
    \end{center}
  \end{enumerate}
\end{enumerate}
`;
