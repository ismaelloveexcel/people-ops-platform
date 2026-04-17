import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth } from "./components/ui/RoleGuard";
import AppLayout from "./components/layout/AppLayout";

// Auth
import Login from "./pages/auth/Login";

// Employee portal pages
import Home                 from "./pages/employee/Home";
import MyRequests           from "./pages/employee/MyRequests";
import LeaveRequest         from "./pages/employee/LeaveRequest";
import DocumentRequest      from "./pages/employee/DocumentRequest";
import ReimbursementRequest from "./pages/employee/ReimbursementRequest";
import BankDetailsUpdate    from "./pages/employee/BankDetailsUpdate";
import Suggestions          from "./pages/employee/Suggestions";
import RaiseConcern         from "./pages/employee/RaiseConcern";
import Policies             from "./pages/employee/Policies";
import MyProfile            from "./pages/employee/MyProfile";

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

          {/* ── Employee Portal ── */}
          <Route
            path="/portal"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index                  element={<Home />} />
            <Route path="my-requests"     element={<MyRequests />} />
            <Route path="leave-request"   element={<LeaveRequest />} />
            <Route path="document-request" element={<DocumentRequest />} />
            <Route path="reimbursement"   element={<ReimbursementRequest />} />
            <Route path="bank-details"    element={<BankDetailsUpdate />} />
            <Route path="suggestions"     element={<Suggestions />} />
            <Route path="raise-concern"   element={<RaiseConcern />} />
            <Route path="policies"        element={<Policies />} />
            <Route path="my-profile"      element={<MyProfile />} />
          </Route>

          {/* Root → portal */}
          <Route path="/" element={<Navigate to="/portal" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
