export type PlatformMetric = {
  label: string;
  value: string;
  trend: string;
  tone: "blue" | "green" | "violet" | "amber";
};

export type Tenant = {
  name: string;
  plan: string;
  users: number;
  papers: number;
  status: "Healthy" | "Review";
};

export const getPlatformOverview = () => ({
  metrics: [
    { label: "Active workspaces", value: "128", trend: "+12.4%", tone: "blue" },
    { label: "Monthly generated papers", value: "24,891", trend: "+8.7%", tone: "violet" },
    { label: "Platform uptime", value: "99.98%", trend: "Last 30 days", tone: "green" },
    { label: "Support queue", value: "07", trend: "2 urgent", tone: "amber" },
  ] satisfies PlatformMetric[],
  tenants: [
    { name: "Northstar University", plan: "Enterprise", users: 84, papers: 4230, status: "Healthy" },
    { name: "Apex Institute of Technology", plan: "Growth", users: 42, papers: 2180, status: "Healthy" },
    { name: "Greenfield College", plan: "Starter", users: 18, papers: 642, status: "Review" },
  ] satisfies Tenant[],
});
