import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      {/* Shows a message when a save to the server fails. */}
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  );
}
