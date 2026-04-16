import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Home, ClipboardList, Calendar, FileText, Receipt,
  Building2, Lightbulb, BookOpen, User, LogOut, AlertTriangle,
} from "lucide-react";

const PORTAL_NAV = [
  { to: "/portal",                 icon: Home,          label: "Home",              end: true },
  { to: "/portal/my-requests",     icon: ClipboardList, label: "My Requests" },
  { to: "/portal/leave-request",   icon: Calendar,      label: "Leave Request" },
  { to: "/portal/document-request",icon: FileText,      label: "Document Request" },
  { to: "/portal/reimbursement",   icon: Receipt,       label: "Reimbursement" },
  { to: "/portal/bank-details",    icon: Building2,     label: "Bank Details Update" },
  { to: "/portal/suggestions",     icon: Lightbulb,     label: "Suggest Improvement" },
  { to: "/portal/raise-concern",   icon: AlertTriangle, label: "Raise a Concern" },
  { to: "/portal/policies",        icon: BookOpen,      label: "Policies & FAQ" },
  { to: "/portal/my-profile",      icon: User,          label: "My Profile" },
];

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-brand-green text-white font-medium"
            : "text-brand-muted hover:bg-gray-100 hover:text-brand-ink"
        }`
      }
    >
      <Icon size={16} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-brand-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-brand-border">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-brand-green" />
          <div>
            <p className="text-sm font-bold text-brand-ink leading-none">Employee Portal</p>
            <p className="text-xs text-brand-muted">People Ops</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-brand-border">
        <p className="text-sm font-medium text-brand-ink truncate">{user?.name}</p>
        <span className="badge badge-green">Employee</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {PORTAL_NAV.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-brand-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-brand-muted hover:text-brand-red hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
