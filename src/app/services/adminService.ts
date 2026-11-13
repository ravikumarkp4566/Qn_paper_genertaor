import { api } from "./api";

export type Tenant = {
  id: string;
  name: string;
  plan: string;
  users: number;
  papers: number;
  status: "Healthy" | "Review";
};

export type PlatformOverview = {
  totals: { colleges: number; users: number; papers: number };
  tenants: Tenant[];
};

/** Colleges, users and paper counts, counted from the database. */
export function getPlatformOverview(): Promise<PlatformOverview> {
  return api<PlatformOverview>("/admin/overview");
}
