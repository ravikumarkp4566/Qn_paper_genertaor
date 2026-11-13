import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Subjects } from "./pages/Subjects";
import { QuestionBank } from "./pages/QuestionBank";
import { GeneratePaper } from "./pages/GeneratePaper";
import { Preview } from "./pages/Preview";
import { History } from "./pages/History";
import { Login } from "./pages/Login";
import { LatexPaper } from "./pages/LatexPaper";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminDashboard } from "./admin/AdminDashboard";
import { AdminSection } from "./admin/AdminSection";
import { GeneratePaper as AdminGeneratePaper } from "./pages/GeneratePaper";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "dashboard", Component: Dashboard },
      { path: "subjects", Component: Subjects },
      { path: "subjects/:subjectId", Component: QuestionBank },
      { path: "question-bank", Component: QuestionBank },
      { path: "generate", Component: GeneratePaper },
      { path: "preview", Component: Preview },
      { path: "preview/:id", Component: Preview },
      { path: "latex-paper/:id?", Component: LatexPaper },
      { path: "history", Component: History },
      { path: "configure", element: <Navigate to="/generate" replace /> },
    ],
  },
  {
    path: "/platform-admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "workspaces", Component: AdminSection },
      { path: "users", Component: AdminSection },
      { path: "audit-log", Component: AdminSection },
      { path: "assessment-settings", Component: AdminSection },
      { path: "generate", Component: AdminGeneratePaper },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
