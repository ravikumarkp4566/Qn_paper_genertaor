// Everything the app shows comes from the database. It is loaded once after
// sign-in and kept here, so pages can read it instantly; the storage modules
// update this copy and send each change to the server.

import { api, apiBlob } from "./api";
import type { Question } from "./storage/questionStorage";
import type { Subject } from "./storage/subjectStorage";
import type { PaperRecord } from "./storage/paperStorage";
import type { LatexPaperRecord } from "./storage/latexPaperStorage";
import type { AssessmentPolicy } from "./assessmentPolicy";
import { setAcademicOptions, type AcademicOptions } from "../config/academicOptions";

export interface CollegeHeader {
  institute?: string;
  affiliation?: string;
  usnLabel?: string;
  usnPrefix?: string;
  usnBoxes?: number;
  hasLogo?: boolean;
}

export interface CollegeInfo {
  id: string;
  name: string;
  header: CollegeHeader;
}

interface Cache {
  college: CollegeInfo | null;
  /** The college logo, ready for Word exports (which need the bytes, not a URL). */
  logoBytes: Uint8Array | null;
  subjects: Subject[];
  questions: Question[];
  papers: PaperRecord[];
  latexPapers: LatexPaperRecord[];
  policies: AssessmentPolicy[];
}

export const cache: Cache = {
  college: null,
  logoBytes: null,
  subjects: [],
  questions: [],
  papers: [],
  latexPapers: [],
  policies: [],
};

export function resetCache(): void {
  Object.assign(cache, { college: null, logoBytes: null, subjects: [], questions: [], papers: [], latexPapers: [], policies: [] });
}

/** Loads all of the signed-in user's data. Platform admins have no college of their own. */
export async function loadAll(role: "faculty" | "platform_admin"): Promise<void> {
  const forCollege = role === "faculty";
  const [college, subjects, questions, papers, latexPapers, policies, options] = await Promise.all([
    forCollege ? api<CollegeInfo>("/college") : Promise.resolve(null),
    forCollege ? api<Subject[]>("/subjects") : Promise.resolve([]),
    forCollege ? api<Question[]>("/questions") : Promise.resolve([]),
    forCollege ? api<PaperRecord[]>("/papers") : Promise.resolve([]),
    forCollege ? api<LatexPaperRecord[]>("/latex-papers") : Promise.resolve([]),
    api<AssessmentPolicy[]>("/assessment-policies"),
    api<AcademicOptions>("/options"),
  ]);

  let logoBytes: Uint8Array | null = null;
  if (college?.header.hasLogo) {
    logoBytes = await apiBlob(`/colleges/${college.id}/logo`)
      .then(async (blob) => new Uint8Array(await blob.arrayBuffer()))
      .catch(() => null);
  }

  Object.assign(cache, { college, logoBytes, subjects, questions, papers, latexPapers, policies });
  setAcademicOptions(options);
}

// ---------------------------------------------------------------------------
// The signed-in user's college, for paper headers
// ---------------------------------------------------------------------------

export function collegeHeader(): Required<Omit<CollegeHeader, "hasLogo">> & { logoUrl: string | null } {
  const header = cache.college?.header ?? {};
  return {
    institute: header.institute ?? cache.college?.name ?? "",
    affiliation: header.affiliation ?? "",
    usnLabel: header.usnLabel ?? "USN",
    usnPrefix: header.usnPrefix ?? "",
    usnBoxes: header.usnBoxes ?? 10,
    logoUrl: header.hasLogo && cache.college ? `/api/colleges/${cache.college.id}/logo` : null,
  };
}
