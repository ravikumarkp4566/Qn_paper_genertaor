import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { Download, RefreshCw, Edit, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { generateSamplePaper, generateQuestionPaperDOCX } from "../utils/docxGenerator";
import { getPaperById, PaperRecord } from "../services/storage/paperStorage";
import { getQuestions } from "../services/storage/questionStorage";
import { SIT_LOGO_DATA_URL } from "../assets/sitLogo";

interface QuestionPart {
  text: string;
  marks: number;
  options?: string[];
  bloomsLevel: string; // Bloom's Level
  co?: string;
  po: string;
  pso: string;
}

interface Question {
  number: number;
  parts: QuestionPart[];
  hasOr?: boolean;
  orQuestion?: {
    number: number;
    parts: QuestionPart[];
  };
}

interface Unit {
  unitNumber: number;
  name: string;
  questions: Question[];
}

export function Preview() {
  const { id } = useParams<{ id: string }>();
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [paperDetails, setPaperDetails] = useState<Partial<PaperRecord>>({
    universityName: "Siddaganga Institute of Technology, Tumakuru-572 103",
    title: "Even Semester B.E. Examinations, June/July 2025",
    subjectName: "Data Structures",
    courseCode: "DS-S3IS01",
    totalMarks: 100,
    duration: 180,
    date: "June/July 2025",
  });

  const fallbackUnits: Unit[] = [
    {
      unitNumber: 1,
      name: "",
      questions: [
        {
          number: 1,
          hasOr: true,
          parts: [
            { text: "Define a structure “Faculty” with fields: name, dept, designation, experience. Write a C program using this structure to print faculty with >20 years service and in ISE dept.", marks: 8, bloomsLevel: "BL3", co: "CO1", po: "PO2", pso: "PSO1" },
            { text: "Explain with general syntax and example, the following file functions: fopen(), getc(), fprintf(), fseek().", marks: 6, bloomsLevel: "BL2", co: "CO1", po: "PO1", pso: "PSO1" },
            { text: "Read n integers at the command line and store them in a file. Compute sum and average and store at end of file.", marks: 6, bloomsLevel: "BL2", co: "CO1", po: "PO1", pso: "PSO1" },
          ],
          orQuestion: {
            number: 2,
            parts: [
               { text: "Consider two files LIST1 and LIST2 containing integer elements. Write a C program to produce third file MERGE to concat two lists.", marks: 8, bloomsLevel: "BL3", co: "CO1", po: "PO2", pso: "PSO1" },
               { text: "Write a C program to read two integer arrays and check whether they are identical or not using pointers.", marks: 6, bloomsLevel: "BL2", co: "CO1", po: "PO2", pso: "PSO1" },
               { text: "Explain the methods by which the values of a structure can be transferred from one function to another with advantages/disadvantages.", marks: 6, bloomsLevel: "BL1", co: "CO1", po: "PO1", pso: "PSO1" },
            ],
          },
        },
      ],
    },
    {
      unitNumber: 2,
      name: "",
      questions: [
        {
          number: 3,
          hasOr: true,
          parts: [
            { text: "Write C functions to perform operations on Stack: Push character; Pop character; Transfer Stack1 to Stack2 maintaining element order.", marks: 8, bloomsLevel: "BL3", co: "CO2", po: "PO2", pso: "PSO1" },
            { text: "How circular queue is different from a linear queue? Write a C program to implement circular queue of integers using static memory allocation.", marks: 8, bloomsLevel: "BL2", co: "CO2", po: "PO2", pso: "PSO1" },
            { text: "Write a C program to compute sum of the series 1 + x + x² + x³ + … + xⁿ with recursive functions.", marks: 4, bloomsLevel: "BL3", co: "CO2", po: "PO2", pso: "PSO1" },
          ],
          orQuestion: {
            number: 4,
            parts: [
               { text: "Consider a producer-consumer problem with buffer of size n. Mention data structure and develop a C program.", marks: 8, bloomsLevel: "BL3", co: "CO2", po: "PO2", pso: "PSO1" },
               { text: "Develop a C recursive program to compute the sum of first n natural numbers.", marks: 6, bloomsLevel: "BL2", co: "CO2", po: "PO1", pso: "PSO1" },
               { text: "Convert the following infix expressions to equivalent prefix and postfix expressions: (A+(B-C)*D)+E/F; P^(Q+R)–S/T*(U+W).", marks: 6, bloomsLevel: "BL2", co: "CO2", po: "PO1", pso: "PSO1" },
            ],
          },
        },
      ],
    },
  ];

  const questionBank = [
    { text: "Define a structure “Faculty” and write a C program to filter faculty with >20 years experience.", po: "PO2", pso: "PSO1" },
    { text: "Explain fopen(), getc(), fprintf(), fseek() file functions with examples.", po: "PO1", pso: "PSO1" },
    { text: "Read n integers at the command line and store them in a file.", po: "PO1", pso: "PSO1" },
    { text: "Write a C program to read two integer arrays and check whether they are identical using pointers.", po: "PO2", pso: "PSO1" },
    { text: "Write C functions to perform operations on Stack: Push, Pop, Transfer contents.", po: "PO2", pso: "PSO1" },
    { text: "How circular queue is different from a linear queue? Write a C program to implement circular queue.", po: "PO2", pso: "PSO1" },
    { text: "Write a C program to compute sum of the series 1 + x + x² + ... + xⁿ using recursion.", po: "PO2", pso: "PSO1" },
    { text: "Write C functions to perform operations on singly linked list: insert, delete, reverse.", po: "PO2", pso: "PSO1" },
    { text: "Develop C function to perform operations on a doubly linked list with integer data.", po: "PO2", pso: "PSO1" },
    { text: "Develop a C program to implement the Josephus problem using circular linked list.", po: "PO2", pso: "PSO1" },
    { text: "Construct a binary search tree and find inorder predecessor, leaf nodes, and sibling nodes.", po: "PO2", pso: "PSO1" },
    { text: "Write a C program to construct an expression tree for a given postfix expression.", po: "PO2", pso: "PSO1" },
  ];

  const getRandomQuestion = (bl: string, marks: number, po?: string, pso?: string) => {
    const q = questionBank[Math.floor(Math.random() * questionBank.length)];
    return { 
      ...q, 
      marks, 
      bloomsLevel: bl,
      po: po || q.po,
      pso: pso || q.pso
    };
  };

  const [units, setUnits] = useState<Unit[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    // 1. Check if ID matches saved paper in paperStorage
    if (id) {
      const saved = getPaperById(id);
      if (saved && saved.units && saved.units.length > 0) {
        setUnits(saved.units);
        setPaperDetails({
          ...saved,
          universityName: saved.universityName || "Siddaganga Institute of Technology, Tumakuru-572 103",
          title: saved.title || "Semester End Examinations",
          subjectName: saved.subjectName,
          courseCode: saved.courseCode,
          totalMarks: saved.totalMarks,
          duration: saved.duration,
          date: saved.date,
        });
        return;
      }
    }

    // 2. Check activeGeneratedPaper in localStorage
    const activeStr = localStorage.getItem("activeGeneratedPaper");
    if (activeStr) {
      try {
        const parsed = JSON.parse(activeStr);
        if (parsed.units && parsed.units.length > 0) {
          setUnits(parsed.units);
          setPaperDetails({
            ...parsed,
            universityName: parsed.universityName || "Siddaganga Institute of Technology, Tumakuru-572 103",
            title: parsed.title || "Semester End Examinations",
            subjectName: parsed.subjectName,
            courseCode: parsed.courseCode,
            totalMarks: parsed.totalMarks,
            duration: parsed.duration,
            date: parsed.date,
          });
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 3. Fallback to existing paperConfig if present
    const configStr = localStorage.getItem("paperConfig");
    if (!configStr) {
       setUnits(fallbackUnits);
       return;
    }
    try {
      const config = JSON.parse(configStr);
      
      const generatedUnits: Unit[] = config.units.map((unitConf: any, unitIndex: number) => {
        const { bloomsDistribution, subQuestionsCount, po, pso } = unitConf;
        
        let blArray: string[] = [];
        Object.entries(bloomsDistribution || {}).forEach(([bl, count]) => {
           for (let i = 0; i < (count as number); i++) {
             blArray.push(bl);
           }
        });
        
        // Edge case: Fill remaining randomly if selected fewer BLs than subQuestionsCount
        const allBLs = ["BL1", "BL2", "BL3", "BL4", "BL5", "BL6"];
        while (blArray.length < subQuestionsCount) {
          blArray.push(allBLs[Math.floor(Math.random() * allBLs.length)]);
        }
        
        // Sort to ensure predictable ordering (e.g., BL1 before BL2)
        blArray.sort();
        
        // Truncate if selected more
        blArray = blArray.slice(0, subQuestionsCount);
        
        let marksArray: number[] = [];
        if (subQuestionsCount === 2) marksArray = [10, 10];
        else if (subQuestionsCount === 3) marksArray = [8, 8, 4];
        else if (subQuestionsCount === 4) marksArray = [5, 5, 5, 5];
        else {
          marksArray = Array(subQuestionsCount).fill(Math.floor(20 / subQuestionsCount));
          marksArray[0] += 20 - marksArray.reduce((a,b)=>a+b, 0);
        }
        
        // Generate parts maintaining same BL order for both options
        const mainParts = blArray.map((bl, i) => getRandomQuestion(bl, marksArray[i], po, pso));
        const orParts = blArray.map((bl, i) => getRandomQuestion(bl, marksArray[i], po, pso));
        
        const startQNum = unitIndex * 2 + 1;
        
        return {
          unitNumber: unitConf.unit || (unitIndex + 1),
          name: "",
          questions: [
            {
              number: startQNum,
              hasOr: true,
              parts: mainParts,
              orQuestion: {
                number: startQNum + 1,
                parts: orParts,
              }
            }
          ]
        };
      });
      
      setUnits(generatedUnits);
      if (config.subject) {
        setPaperDetails((prev) => ({
          ...prev,
          subjectName: config.subject,
          totalMarks: config.totalMarks || 100,
          duration: config.duration || 180,
        }));
      }
    } catch (e) {
      console.error(e);
      setUnits(fallbackUnits);
    }
  }, [refreshCounter, id]);

  const handleReplace = (questionId: string) => {
    setSelectedQuestion(questionId);
    setTimeout(() => setSelectedQuestion(null), 1000);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to History</span>
          </Link>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Paper Preview</h1>
            <p className="text-sm text-muted-foreground">
              {paperDetails.subjectName} • {paperDetails.totalMarks} marks • {paperDetails.duration} min
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setRefreshCounter(c => c + 1)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
            <button
              onClick={() => {
                const mappedUnits: any[] = units.map(u => ({
                  unitNumber: u.unitNumber,
                  name: u.name,
                  content: u.questions.map(q => {
                    if (q.hasOr && q.orQuestion) {
                      return {
                        questions: [
                          { number: q.number, parts: q.parts },
                          { number: q.orQuestion.number, parts: q.orQuestion.parts }
                        ]
                      };
                    }
                    return { number: q.number, parts: q.parts };
                  })
                }));

                generateQuestionPaperDOCX({
                  universityName: paperDetails.universityName || "Siddaganga Institute of Technology, Tumakuru-572 103",
                  affiliationSubtext: paperDetails.affiliationSubtext || "(An Autonomous Institution affiliated to VTU, Belagavi, Approved by AICTE, New Delhi)",
                  examTitle: paperDetails.title || "Supplementary Semester B.E. Information Sc. and Engg. Examinations, Aug-Sept. 2025",
                  program: paperDetails.degreeName || "B.E.",
                  departmentName: paperDetails.departmentName || "Information Sc. and Engg.",
                  subjectName: paperDetails.subjectName || "Data Structures / Data Structures and Applications",
                  subjectCode: paperDetails.courseCode || "S3IS01/3RIS02",
                  date: paperDetails.date || "Aug-Sept. 2025",
                  time: `${Math.floor((paperDetails.duration || 180) / 60)} Hours`,
                  maxMarks: `${paperDetails.totalMarks || 100}`,
                  usnPrefix: paperDetails.usnPrefix || "1SI",
                  instructions: paperDetails.instructions || [
                    "Revealing of Identity in any form in the answer book will be treated as malpractice.",
                    "Answer any five questions choosing one full question from each unit."
                  ],
                  units: mappedUnits
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download DOCX</span>
            </button>
          </div>
        </div>

        {/* Paper Sheet */}
        <div className="bg-white rounded-xl shadow-lg border border-border overflow-hidden">
          {/* Official University Header matching university standard */}
          <div className="border-b-2 border-slate-900 p-6 sm:p-8 space-y-4">
            {/* Row 1: USN Box, Center Institution + Logo, Right Mobile Phones Icon & Course Code */}
            <div className="grid grid-cols-12 items-start gap-2">
              {/* Left: USN */}
              <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider text-slate-900 font-mono">USN</span>
                <div className="inline-flex border-2 border-slate-900 divide-x-2 divide-slate-900 bg-white">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const prefix = (paperDetails.usnPrefix || "1SI").padEnd(3, " ");
                    const char = idx < 3 ? prefix[idx] : "";
                    return (
                      <div
                        key={idx}
                        className="w-4 sm:w-5 h-7 flex items-center justify-center text-xs font-mono font-bold text-slate-900"
                      >
                        {char}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Center: Logo + University Name + Affiliation */}
              <div className="col-span-12 sm:col-span-6 flex items-center justify-center gap-3 text-center">
                <img
                  src={SIT_LOGO_DATA_URL}
                  alt="SIT Logo"
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0"
                />
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight leading-tight">
                    {paperDetails.universityName || "Siddaganga Institute of Technology, Tumakuru-572 103"}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-700 italic mt-0.5 leading-snug">
                    {paperDetails.affiliationSubtext || "(An Autonomous Institution affiliated to VTU, Belagavi, Approved by AICTE, New Delhi)"}
                  </p>
                </div>
              </div>

              {/* Right: Mobile Phones Prohibited & Course Code */}
              <div className="col-span-12 sm:col-span-3 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 text-right">
                {paperDetails.mobilePhonesProhibited !== false && (
                  <div className="border border-slate-300 rounded px-2 py-0.5 flex items-center gap-1.5 bg-slate-50 text-[10px] font-bold text-slate-700 shadow-2xs">
                    <span className="w-3.5 h-3.5 rounded-full border border-rose-600 text-rose-600 flex items-center justify-center text-[9px] font-extrabold">🚫</span>
                    <span className="leading-tight">MOBILE PHONES PROHIBITED</span>
                  </div>
                )}
                <span className="text-base sm:text-lg font-black font-mono text-slate-900 tracking-wider">
                  {paperDetails.courseCode || "S3IS01/3RIS02"}
                </span>
              </div>
            </div>

            {/* Row 2: Exam Title (centered bold) */}
            <div className="text-center pt-1">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                {paperDetails.title || "Supplementary Semester B.E. Information Sc. and Engg. Examinations, Aug-Sept. 2025"}
              </h3>
            </div>

            {/* Row 3: Course Title (centered larger bold) */}
            <div className="text-center">
              <h1 className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight">
                {paperDetails.subjectName || "Data Structures / Data Structures and Applications"}
              </h1>
            </div>

            {/* Row 4: Time and Max Marks */}
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1">
              <span>Time: {Math.floor((paperDetails.duration || 180) / 60)} Hours</span>
              <span>Max. Marks: {paperDetails.totalMarks || 100}</span>
            </div>

            {/* Row 5: Notes / Instructions */}
            <div className="text-xs text-slate-800 space-y-0.5 pt-1">
              <div className="flex gap-2 items-start font-medium italic">
                <span className="font-bold not-italic">Note :</span>
                <div className="space-y-1">
                  <p>1. {paperDetails.instructions?.[0] || "Revealing of Identity in any form in the answer book will be treated as malpractice."}</p>
                  <p>2. {paperDetails.instructions?.[1] || "Answer any five questions choosing one full question from each unit."}</p>
                </div>
              </div>
            </div>

            {/* Column Headers for M, BL, CO, PO, PSO aligned above question table */}
            <div className="flex justify-end pt-2 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-700 flex items-center pr-2">
                <span className="w-8 text-center">M</span>
                <span className="w-8 text-center">BL</span>
                <span className="w-8 text-center">CO</span>
                <span className="w-8 text-center">PO</span>
                <span className="w-8 text-center">PSO</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {units.map((unit) => (
              <div key={unit.unitNumber} className="space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-foreground text-lg">
                    Unit - {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][unit.unitNumber - 1] || unit.unitNumber}
                  </h3>
                </div>

                <div className="space-y-6">
                  {unit.questions.map((question) => {
                    return (
                      <div key={question.number} className="space-y-4">
                        <div className="overflow-hidden relative">
                          <table className="w-full text-base">
                            <tbody>
                              {question.parts.map((part, index) => {
                                const partLabel = String.fromCharCode(97 + index); // a, b, c
                                return (
                                  <tr key={index} className="group align-top">
                                    <td className="p-2 w-8 font-bold text-slate-900">
                                      {index === 0 ? question.number : ""}
                                    </td>
                                    <td className="p-2 w-8 font-semibold text-slate-800">
                                      {partLabel})
                                    </td>
                                    <td className="p-2 pr-4 text-justify leading-relaxed text-slate-900">
                                      {part.text}
                                      {part.options && (
                                        <ol className="mt-2 grid gap-1 pl-5 text-left text-sm sm:grid-cols-2" type="A">
                                          {part.options.map((option) => <li key={option}>{option}</li>)}
                                        </ol>
                                      )}
                                    </td>
                                    <td className="py-2 px-1 w-8 text-center font-bold text-slate-900">{part.marks}</td>
                                    <td className="py-2 px-1 w-8 text-center font-semibold text-slate-700">{(part.bloomsLevel || "BL1").replace('BL', '')}</td>
                                    <td className="py-2 px-1 w-8 text-center text-slate-700">{(part.co || "CO1").replace('CO', '')}</td>
                                    <td className="py-2 px-1 w-8 text-center text-slate-700">{(part.po || "").replace('PO', '')}</td>
                                    <td className="py-2 px-1 w-8 text-center text-slate-700">{(part.pso || "").replace('PSO', '')}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {question.hasOr && question.orQuestion && (
                          <>
                            <div className="text-center font-extrabold py-2 text-base text-slate-900 tracking-wider">
                              OR
                            </div>

                            <div className="overflow-hidden relative">
                              <table className="w-full text-base">
                                <tbody>
                                  {question.orQuestion.parts.map((part, index) => {
                                    const partLabel = String.fromCharCode(97 + index);
                                    return (
                                      <tr key={index} className="group align-top">
                                        <td className="p-2 w-8 font-bold text-slate-900">
                                          {index === 0 ? question.orQuestion!.number : ""}
                                        </td>
                                        <td className="p-2 w-8 font-semibold text-slate-800">
                                          {partLabel})
                                        </td>
                                        <td className="p-2 pr-4 text-justify leading-relaxed text-slate-900">
                                          {part.text}
                                          {part.options && (
                                            <ol className="mt-2 grid gap-1 pl-5 text-left text-sm sm:grid-cols-2" type="A">
                                              {part.options.map((option) => <li key={option}>{option}</li>)}
                                            </ol>
                                          )}
                                        </td>
                                        <td className="py-2 px-1 w-8 text-center font-bold text-slate-900">{part.marks}</td>
                                        <td className="py-2 px-1 w-8 text-center font-semibold text-slate-700">{(part.bloomsLevel || "BL1").replace('BL', '')}</td>
                                        <td className="py-2 px-1 w-8 text-center text-slate-700">{(part.co || "CO1").replace('CO', '')}</td>
                                        <td className="py-2 px-1 w-8 text-center text-slate-700">{(part.po || "").replace('PO', '')}</td>
                                        <td className="py-2 px-1 w-8 text-center text-slate-700">{(part.pso || "").replace('PSO', '')}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-8 mt-8">
            <p className="text-sm text-muted-foreground text-center mb-8">
              *** End of Question Paper ***
            </p>

            <div className="mt-8 flex justify-center">
              <div className="w-full">
                <h3 className="text-lg font-bold text-center mb-4 text-foreground">Distribution Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-2 text-left">Criteria</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="border border-border p-2 text-center w-10">{i + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const counts = { po: {} as Record<string, number>, pso: {} as Record<string, number>, bl: {} as Record<string, number> };
                        
                        const processMulti = (val: string, targetMap: Record<string, number>) => {
                          if (!val) return;
                          val.split(/[,/ ]+/).map(v => v.trim()).filter(Boolean).forEach(v => {
                            const cleanNum = v.replace(/[^0-9]/g, "").trim();
                            if (cleanNum) {
                              targetMap[cleanNum] = (targetMap[cleanNum] || 0) + 1;
                            }
                          });
                        };

                        units.forEach(unit => {
                          unit.questions.forEach(q => {
                            q.parts.forEach(p => {
                              processMulti(p.po, counts.po);
                              processMulti(p.pso, counts.pso);
                              const bl = (p.bloomsLevel || "BL1").replace(/[^0-9]/g, "").trim();
                              if (bl) counts.bl[bl] = (counts.bl[bl] || 0) + 1;
                            });
                            if (q.hasOr && q.orQuestion) {
                              q.orQuestion.parts.forEach(p => {
                                processMulti(p.po, counts.po);
                                processMulti(p.pso, counts.pso);
                                const bl = (p.bloomsLevel || "BL1").replace(/[^0-9]/g, "").trim();
                                if (bl) counts.bl[bl] = (counts.bl[bl] || 0) + 1;
                              });
                            }
                          });
                        });

                        const metrics = [
                          { name: "Bloom's Level (BL)", data: counts.bl, max: 6 },
                          { name: "Program Outcome (PO)", data: counts.po, max: 12 },
                          { name: "Prog. Specific Outcome (PSO)", data: counts.pso, max: 4 },
                        ];

                        return metrics.map(metric => (
                          <tr key={metric.name}>
                            <td className="border border-border p-2 font-medium whitespace-nowrap">{metric.name}</td>
                            {Array.from({ length: 12 }, (_, i) => {
                              const val = i + 1;
                              const isApplicable = val <= metric.max;
                              return (
                                <td key={val} className="border border-border p-2 text-center">
                                  {isApplicable ? (
                                    <span className={metric.data[val.toString()] ? "text-foreground font-semibold" : "text-muted-foreground/40"}>
                                      {metric.data[val.toString()] || 0}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/30">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
