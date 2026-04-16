import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Calendar, FileText, Receipt, Building2, Lightbulb,
  ClipboardList, BookOpen, User,
} from "lucide-react";

const QUICK_ACTIONS = [
  { to: "/portal/leave-request",        icon: Calendar,      label: "Leave Request",         desc: "Request annual, sick, or other leave" },
  { to: "/portal/document-request",     icon: FileText,      label: "Document Request",      desc: "Employment letter, payslip copy, reference" },
  { to: "/portal/reimbursement",        icon: Receipt,       label: "Reimbursement",         desc: "Submit work expense for reimbursement" },
  { to: "/portal/bank-details",         icon: Building2,     label: "Bank Details Update",   desc: "Update your salary payment details" },
  { to: "/portal/suggestions",          icon: Lightbulb,     label: "Suggest an Improvement", desc: "Share ideas to improve the workplace" },
  { to: "/portal/my-requests",          icon: ClipboardList, label: "My Requests",           desc: "Track the status of your submissions" },
  { to: "/portal/policies",             icon: BookOpen,      label: "Policies & FAQ",        desc: "Company policies and common questions" },
  { to: "/portal/my-profile",           icon: User,          label: "My Profile",            desc: "View your employment information" },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Welcome{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="text-sm text-brand-muted mt-1">
          Use this portal to submit requests, track their status, and access your information.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.to}
            onClick={() => navigate(action.to)}
            className="card text-left hover:border-brand-green hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
                <action.icon size={20} className="text-brand-green" />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-ink">{action.label}</p>
                <p className="text-xs text-brand-muted mt-0.5">{action.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-brand-blue">
        <p className="font-medium">How it works</p>
        <p className="text-xs mt-1">
          Submit a request → it gets reviewed by your manager → you can track the status here.
          All decisions are made by people, not automated systems.
        </p>
      </div>
    </div>
  );
}
