import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign,
  HeadingLevel,
  ImageRun,
} from "docx";
import { saveAs } from "file-saver";
import { cache, collegeHeader } from "../services/dataStore";

interface QuestionPart {
  text: string;
  marks: number;
  co: string;
  po?: string;
  pso?: string;
  bloomsLevel: string; // Bloom's Level
}

interface Question {
  number: number;
  parts: QuestionPart[];
}

interface OrQuestion {
  questions: Question[];
}

interface Unit {
  unitNumber: number;
  name: string;
  content: (Question | OrQuestion)[];
}

export interface PaperData {
  universityName?: string;
  affiliationSubtext?: string;
  examTitle: string;
  program?: string;
  departmentName?: string;
  subjectName: string;
  subjectCode: string;
  date: string;
  time: string;
  maxMarks: string;
  usnPrefix?: string;
  mobilePhonesProhibited?: boolean;
  instructions: string[];
  units: Unit[];
}

function isOrQuestion(item: Question | OrQuestion): item is OrQuestion {
  return "questions" in item;
}

function createHeaderSection(data: PaperData) {
  // The college logo from the database, loaded at sign-in.
  let sitLogoImage: ImageRun | null = null;
  try {
    if (!cache.logoBytes) throw new Error("This college has no logo");
    sitLogoImage = new ImageRun({
      type: "jpg",
      data: cache.logoBytes,
      transformation: {
        width: 44,
        height: 44,
      },
    });
  } catch (e) {
    console.warn("Could not load SIT logo in docx", e);
  }

  const usnPrefixStr = (data.usnPrefix || collegeHeader().usnPrefix).padEnd(3, " ");
  // 10 cells for USN box
  const usnCells: TableCell[] = Array.from({ length: 10 }).map((_, idx) => {
    const char = idx < 3 ? usnPrefixStr[idx] : "";
    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: char,
              bold: true,
              size: 16,
              font: "Consolas",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
      width: { size: 10, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2 },
        bottom: { style: BorderStyle.SINGLE, size: 2 },
        left: { style: BorderStyle.SINGLE, size: 2 },
        right: { style: BorderStyle.SINGLE, size: 2 },
      },
      verticalAlign: VerticalAlign.CENTER,
    });
  });

  const usnTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: usnCells })],
  });

  // Top official 3-column banner table
  const topBannerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          // Left: USN
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "USN",
                    bold: true,
                    size: 18,
                    font: "Consolas",
                  }),
                ],
                spacing: { after: 40 },
              }),
              usnTable,
            ],
            width: { size: 28, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
          }),

          // Center: Logo + University Name + Affiliation
          new TableCell({
            children: [
              ...(sitLogoImage
                ? [
                    new Paragraph({
                      children: [sitLogoImage],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 60 },
                    }),
                  ]
                : []),
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      data.universityName ||
                      collegeHeader().institute,
                    bold: true,
                    size: 20,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      data.affiliationSubtext ||
                      collegeHeader().affiliation,
                    italics: true,
                    size: 14,
                    color: "333333",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 48, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
          }),

          // Right: Course Code & Mobile warning
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: data.subjectCode,
                    bold: true,
                    size: 18,
                    font: "Consolas",
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 40 },
              }),
              ...(data.mobilePhonesProhibited !== false
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "MOBILE PHONES PROHIBITED",
                          bold: true,
                          size: 13,
                          color: "B91C1C",
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    }),
                  ]
                : []),
            ],
            width: { size: 24, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
          }),
        ],
      }),
    ],
  });

  // Time & Max Marks line
  const timeMarksTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2 },
      bottom: { style: BorderStyle.SINGLE, size: 2 },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Time: ${data.time}`,
                    bold: true,
                    size: 20,
                  }),
                ],
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Max. Marks: ${data.maxMarks}`,
                    bold: true,
                    size: 20,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ],
  });

  return [
    topBannerTable,

    // Exam Title
    new Paragraph({
      children: [
        new TextRun({
          text: data.examTitle,
          bold: true,
          size: 18,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
    }),

    // Subject Name
    new Paragraph({
      children: [
        new TextRun({
          text: data.subjectName,
          bold: true,
          size: 22,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),

    timeMarksTable,

    // Notes
    new Paragraph({
      children: [
        new TextRun({ text: "Note: 1. ", bold: true, size: 17 }),
        new TextRun({
          text:
            data.instructions[0] ||
            "Revealing of Identity in any form in the answer book will be treated as malpractice.",
          size: 17,
        }),
      ],
      spacing: { before: 80, after: 30 },
      indent: { left: 140 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "2. ", bold: true, size: 17 }),
        new TextRun({
          text:
            data.instructions[1] ||
            "Answer any five questions choosing one full question from each unit.",
          size: 17,
        }),
      ],
      spacing: { after: 140 },
      indent: { left: 520 },
    }),

    // Solid border before questions
    new Paragraph({
      text: "",
      spacing: { after: 150 },
      border: {
        bottom: {
          color: "000000",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 3,
        },
      },
    }),
  ];
}

function createQuestionTable(
  questionNumber: number,
  parts: QuestionPart[]
): Table {
  const rows: TableRow[] = [];

  // Header row for table (matches Preview columns: Question, Marks, BL, CO, PO, PSO)
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Question", bold: true })] })],
          width: { size: 60, type: WidthType.PERCENTAGE },
          shading: { fill: "E8E8E8" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Marks", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "E8E8E8" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "BL", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "E8E8E8" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "CO", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "E8E8E8" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "PO", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "E8E8E8" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "PSO", bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "E8E8E8" },
        }),
      ],
    })
  );

  // Question rows
  parts.forEach((part, index) => {
    const partLabel = parts.length > 1 ? String.fromCharCode(97 + index) : "";
    const questionText =
      parts.length > 1 ? `${questionNumber}. (${partLabel}) ${part.text}` : `${questionNumber}. ${part.text}`;

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: questionText,
                spacing: { before: 100, after: 100 },
              }),
            ],
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: (part.marks || 0).toString(),
                alignment: AlignmentType.CENTER,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: (part.bloomsLevel || "BL1").replace(/^BL/i, ""),
                alignment: AlignmentType.CENTER,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: (part.co || "CO1").replace(/^CO/i, ""),
                alignment: AlignmentType.CENTER,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: (part.po || "").replace(/^PO/i, ""),
                alignment: AlignmentType.CENTER,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: (part.pso || "").replace(/^PSO/i, ""),
                alignment: AlignmentType.CENTER,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows,
  });
}

function createUnitContent(unit: Unit) {
  const content: (Paragraph | Table)[] = [];
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][unit.unitNumber - 1] || unit.unitNumber.toString();

  // Unit heading
  content.push(
    new Paragraph({
      text: `Unit - ${roman}${unit.name ? ": " + unit.name : ""}`,
      spacing: { before: 400, after: 200 },
      style: "heading3",
    })
  );

  let questionCounter = (unit.unitNumber - 1) * 2 + 1;

  unit.content.forEach((item) => {
    if (isOrQuestion(item)) {
      const q1Num = item.questions[0].number || questionCounter;
      const q2Num = item.questions[1].number || (q1Num + 1);

      // First question of OR pair
      content.push(createQuestionTable(q1Num, item.questions[0].parts));

      // OR separator
      content.push(
        new Paragraph({
          text: "OR",
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          style: "heading4",
        })
      );

      // Second question of OR pair
      content.push(createQuestionTable(q2Num, item.questions[1].parts));

      content.push(new Paragraph({ text: "", spacing: { after: 300 } }));
      questionCounter = q2Num + 1;
    } else {
      const qNum = item.number || questionCounter;
      content.push(createQuestionTable(qNum, item.parts));
      content.push(new Paragraph({ text: "", spacing: { after: 300 } }));
      questionCounter = qNum + 1;
    }
  });

  return content;
}

function createMappingTable(data: PaperData): Table {
  const counts = { po: {} as Record<string, number>, pso: {} as Record<string, number>, bl: {} as Record<string, number> };

  data.units.forEach(unit => {
    unit.content.forEach((item) => {
      if (isOrQuestion(item)) {
        item.questions[0].parts.forEach(part => countPart(part, counts));
        item.questions[1].parts.forEach(part => countPart(part, counts));
      } else {
        item.parts.forEach(part => countPart(part, counts));
      }
    });
  });

  const rows: TableRow[] = [];

  // Header row for matrix table
  const headerCells = [
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Criteria", bold: true })] })], shading: { fill: "E8E8E8" }, verticalAlign: VerticalAlign.CENTER })
  ];
  for (let i = 1; i <= 12; i++) {
    headerCells.push(
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: i.toString(), bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "E8E8E8" }, verticalAlign: VerticalAlign.CENTER })
    );
  }
  rows.push(new TableRow({ children: headerCells }));

  const metrics = [
    { name: "Bloom's Level (BL)", data: counts.bl, max: 6 },
    { name: "Program Outcome (PO)", data: counts.po, max: 12 },
    { name: "Prog. Specific Outcome (PSO)", data: counts.pso, max: 4 },
  ];

  metrics.forEach(metric => {
    const rowCells = [
      new TableCell({ children: [new Paragraph({ text: metric.name, spacing: { before: 100, after: 100 } })], verticalAlign: VerticalAlign.CENTER })
    ];
    
    for (let i = 1; i <= 12; i++) {
      const valStr = i.toString();
      const isApplicable = i <= metric.max;
      const count = isApplicable ? (metric.data[valStr] || 0) : "-";
      
      rowCells.push(
        new TableCell({ 
          children: [new Paragraph({ text: count.toString(), alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } })], 
          verticalAlign: VerticalAlign.CENTER 
        })
      );
    }
    
    rows.push(new TableRow({ children: rowCells }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows,
  });
}

function countPart(part: QuestionPart, counts: { po: Record<string, number>, pso: Record<string, number>, bl: Record<string, number> }) {
  const processMulti = (val: string, targetMap: Record<string, number>) => {
    if (!val) return;
    val.split(/[,/ ]+/).map(v => v.trim()).filter(Boolean).forEach(v => {
      const cleanNum = v.replace(/[^0-9]/g, "").trim();
      if (cleanNum) {
        targetMap[cleanNum] = (targetMap[cleanNum] || 0) + 1;
      }
    });
  };

  processMulti(part.po || "", counts.po);
  processMulti(part.pso || "", counts.pso);
  const bl = (part.bloomsLevel || "BL1").replace(/[^0-9]/g, "").trim();
  if (bl) {
    counts.bl[bl] = (counts.bl[bl] || 0) + 1;
  }
}

export async function generateQuestionPaperDOCX(data: PaperData) {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24, // 12pt
          },
          paragraph: {
            spacing: { line: 360, before: 0, after: 0 },
          },
        },
      },
      paragraphStyles: [
        {
          id: "heading1",
          name: "Heading 1",
          basedOn: "Normal",
          run: {
            font: "Times New Roman",
            size: 32, // 16pt
            bold: true,
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: "heading2",
          name: "Heading 2",
          basedOn: "Normal",
          run: {
            font: "Times New Roman",
            size: 28, // 14pt
            bold: true,
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: "heading3",
          name: "Heading 3",
          basedOn: "Normal",
          run: {
            font: "Times New Roman",
            size: 26, // 13pt
            bold: true,
          },
        },
        {
          id: "heading4",
          name: "Heading 4",
          basedOn: "Normal",
          run: {
            font: "Times New Roman",
            size: 24, // 12pt
            bold: true,
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          ...createHeaderSection(data),
          ...data.units.flatMap((unit) => createUnitContent(unit)),
          new Paragraph({
            text: "*** End of Question Paper ***",
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 600 },
            style: "heading4",
          }),
          new Paragraph({
            text: "Question Mapping Table",
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 300 },
            style: "heading3",
          }),
          createMappingTable(data),
          new Paragraph({ text: "" }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${data.subjectCode}_${data.subjectName.replace(/\s+/g, "_")}_${new Date().getTime()}.docx`;
  saveAs(blob, fileName);
}

// Example usage with sample data
export function generateSamplePaper() {
  const sampleData: PaperData = {
    universityName: "ABC UNIVERSITY",
    examTitle: "END SEMESTER EXAMINATION - MAY 2026",
    program: "B.Tech - Computer Science and Engineering (IV Semester)",
    subjectName: "Data Structures and Algorithms",
    subjectCode: "CS201",
    date: "April 8, 2026",
    time: "3 Hours",
    maxMarks: "100",
    instructions: [
      "Answer ALL questions.",
      "Each question carries marks as indicated.",
      "CO - Course Outcome, BL - Bloom's Level",
      "Use of non-programmable scientific calculators is permitted.",
      "Mobile phones and other electronic gadgets are strictly prohibited.",
    ],
    units: [
      {
        unitNumber: 1,
        name: "Introduction to Data Structures",
        content: [
          {
            number: 1,
            parts: [
              {
                text: "Define data structures and explain their classification with examples.",
                marks: 5,
                co: "CO1",
                bloomsLevel: "BL2",
              },
              {
                text: "Compare linear and non-linear data structures with suitable diagrams.",
                marks: 5,
                co: "CO1",
                bloomsLevel: "BL2",
              },
            ],
          },
          {
            questions: [
              {
                number: 2,
                parts: [
                  {
                    text: "Explain the concept of Abstract Data Types (ADT) with an example of Stack ADT.",
                    marks: 6,
                    co: "CO1",
                    bloomsLevel: "BL2",
                  },
                  {
                    text: "Write an algorithm to implement stack operations using arrays.",
                    marks: 4,
                    co: "CO2",
                    bloomsLevel: "BL3",
                  },
                ],
              },
              {
                number: 2,
                parts: [
                  {
                    text: "Describe the applications of stacks in expression evaluation and conversion.",
                    marks: 6,
                    co: "CO1",
                    bloomsLevel: "BL2",
                  },
                  {
                    text: "Convert the infix expression (A+B)*C-D/E to postfix notation.",
                    marks: 4,
                    co: "CO2",
                    bloomsLevel: "BL3",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        unitNumber: 2,
        name: "Linked Lists and Trees",
        content: [
          {
            questions: [
              {
                number: 3,
                parts: [
                  {
                    text: "Explain singly linked list with all basic operations: insertion, deletion, and traversal.",
                    marks: 10,
                    co: "CO2",
                    bloomsLevel: "BL2",
                  },
                ],
              },
              {
                number: 3,
                parts: [
                  {
                    text: "Compare singly linked list, doubly linked list, and circular linked list with diagrams.",
                    marks: 10,
                    co: "CO2",
                    bloomsLevel: "BL4",
                  },
                ],
              },
            ],
          },
          {
            number: 4,
            parts: [
              {
                text: "Define a binary tree and explain its properties.",
                marks: 4,
                co: "CO3",
                bloomsLevel: "BL1",
              },
              {
                text: "Implement pre-order, in-order, and post-order tree traversal algorithms.",
                marks: 6,
                co: "CO3",
                bloomsLevel: "BL3",
              },
            ],
          },
        ],
      },
      {
        unitNumber: 3,
        name: "Searching and Sorting",
        content: [
          {
            number: 5,
            parts: [
              {
                text: "Explain the binary search algorithm with an example. Derive its time complexity.",
                marks: 10,
                co: "CO4",
                bloomsLevel: "BL3",
              },
            ],
          },
          {
            questions: [
              {
                number: 6,
                parts: [
                  {
                    text: "Explain Quick Sort algorithm with a suitable example and derive its time complexity for best and worst cases.",
                    marks: 10,
                    co: "CO4",
                    bloomsLevel: "BL3",
                  },
                ],
              },
              {
                number: 6,
                parts: [
                  {
                    text: "Explain Merge Sort algorithm with a step-by-step example. Compare it with Quick Sort.",
                    marks: 10,
                    co: "CO4",
                    bloomsLevel: "BL4",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  return generateQuestionPaperDOCX(sampleData);
}
