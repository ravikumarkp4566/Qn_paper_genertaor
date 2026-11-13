export type AssessmentKind = "SEE" | "TEST" | "QUIZ";

export type AssessmentPolicy = {
  kind: AssessmentKind;
  label: string;
  totalMarks: number;
  duration: number;
  hasChoice: boolean;
  questionCount: number;
  questionType: "descriptive" | "mcq";
  allowedQuestionMarks: number[];
};

// Stored in the database (collection "assessmentpolicies"); loaded at sign-in.

import { api, saveInBackground } from "./api";
import { cache } from "./dataStore";

export function getAssessmentPolicies(): AssessmentPolicy[] {
  return cache.policies;
}

/** Saves the policies that changed. Platform admins edit the defaults every college starts from. */
export function saveAssessmentPolicies(policies: AssessmentPolicy[]): void {
  const changed = policies.filter((policy) => {
    const before = cache.policies.find((p) => p.kind === policy.kind);
    return JSON.stringify(before) !== JSON.stringify(policy);
  });
  cache.policies = policies;
  for (const policy of changed) {
    const { kind, ...body } = policy as AssessmentPolicy & { id?: string; createdAt?: string; updatedAt?: string };
    delete (body as { id?: string }).id;
    saveInBackground(api(`/assessment-policies/${kind}`, { method: "PUT", body }), `the ${policy.label} rules`);
  }
}

export function getAssessmentPolicy(kind: AssessmentKind): AssessmentPolicy {
  return cache.policies.find((policy) => policy.kind === kind) ?? cache.policies[0];
}
