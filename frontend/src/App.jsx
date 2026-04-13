import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth, RoleRedirect, RequireRole } from "./components/ui/RoleGuard";
import AppLayout from "./components/layout/AppLayout";

// Auth
import Login from "./pages/auth/Login";

// Employee pages
import AskAI          from "./pages/employee/AskAI";
import MyHR           from "./pages/employee/MyHR";
import SubmitRequest  from "./pages/employee/SubmitRequest";
import MyRequests     from "./pages/employee/MyRequests";
import RaiseConcern   from "./pages/employee/RaiseConcern";
import Suggestions    from "./pages/employee/Suggestions";

// Manager pages
import PendingApprovals     from "./pages/manager/PendingApprovals";
import TeamRequests         from "./pages/manager/TeamRequests";
import InitiateDisciplinary from "./pages/manager/InitiateDisciplinary";

// MD pages
import Grievances        from "./pages/md/Grievances";
import DisciplinaryCases from "./pages/md/DisciplinaryCases";
import ActingMD          from "./pages/md/ActingMD";
import AllRequests       from "./pages/md/AllRequests";
import SuggestionsReview from "./pages/md/SuggestionsReview";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: "13px", fontFamily: "inherit" },
            success: { iconTheme: { primary: "#1a472a", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#c0392b", secondary: "#fff" } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Root redirect — auto-route based on role */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <RoleRedirect />
              </RequireAuth>
            }
          />

          {/* ── EMPLOYEE ── */}
          <Route
            path="/employee"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="ask-ai" replace />} />
            <Route path="ask-ai"         element={<AskAI />} />
            <Route path="my-hr"          element={<MyHR />} />
            <Route path="submit-request" element={<SubmitRequest />} />
            <Route path="my-requests"    element={<MyRequests />} />
            <Route path="raise-concern"  element={<RaiseConcern />} />
            <Route path="suggestions"    element={<Suggestions />} />
          </Route>

          {/* ── MANAGER ── */}
          <Route
            path="/manager"
            element={
              <RequireAuth>
                <RequireRole roles={["manager", "md", "acting_md"]}>
                  <AppLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="pending" replace />} />
            <Route path="pending"      element={<PendingApprovals />} />
            <Route path="team"         element={<TeamRequests />} />
            <Route path="disciplinary" element={<InitiateDisciplinary />} />
          </Route>

          {/* ── MD ── */}
          <Route
            path="/md"
            element={
              <RequireAuth>
                <RequireRole roles={["md", "acting_md"]}>
                  <AppLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="requests" replace />} />
            <Route path="requests"           element={<AllRequests />} />
            <Route path="grievances"         element={<Grievances />} />
            <Route path="disciplinary"       element={<DisciplinaryCases />} />
            <Route path="acting-md"          element={<ActingMD />} />
            <Route path="suggestions-review" element={<SuggestionsReview />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
