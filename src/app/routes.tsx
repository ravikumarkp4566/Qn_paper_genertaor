import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Subjects } from "./pages/Subjects";
import { QuestionBank } from "./pages/QuestionBank";
import { GeneratePaper } from "./pages/GeneratePaper";
import { Preview } from "./pages/Preview";
import { History } from "./pages/History";

export const router = createBrowserRouter([
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
      { path: "history", Component: History },
      { path: "configure", element: <Navigate to="/generate" replace /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
