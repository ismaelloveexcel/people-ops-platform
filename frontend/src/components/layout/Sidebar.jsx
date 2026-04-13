import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  MessageSquare, FileText, Send, Clock, AlertTriangle,
  Lightbulb, CheckSquare, Users, Shield, UserCheck,
  BarChart2, LogOut, ChevronRight, Building2,
} from "lucide-react";

const EMPLOYEE_NAV = [
  { to: "/employee/chat",     icon: MessageSquare, label: "Ask AI" },
  { to: "/employee/my-hr",    icon: FileText,      label: "My HR" },
  { to: "/employee/request",  icon: Send,          label: "Submit Request" },
  { to: "/employee/requests", icon: Clock,         label: "My Requests" },
  { to: "/employee/concern",  icon: AlertTriangle, label: "Raise a Concern" },
  { to: "/employee/suggest",  icon: Lightbulb,     label: "Suggest an Improvement" },
];

const MANAGER_NAV = [
  { to: "/manager/approvals",    icon: CheckSquare,   label: "Pending Approvals" },
  { to: "/manager/team",         icon: Users,         label: "Team Requests" },
  { to: "/manager/disciplinary", icon: Shield,        label: "Initiate Disciplinary" },
];

const MD_NAV = [
  { to: "/md/grievances",    icon: AlertTriangle, label: "Grievances" },
  { to: "/md/disciplinary",  icon: Shield,        label: "Disciplinary Cases" },
  { to: "/md/acting-md",     icon: UserCheck,     label: "Acting MD" },
  { to: "/md/requests",      icon: FileText,      label: "All Requests" },
  { to: "/md/suggestions",   icon: BarChart2,     label: "Suggestions" },
];

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
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
  const { user, isMD, isManager, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = isMD ? MD_NAV : isManager ? MANAGER_NAV : EMPLOYEE_NAV;
  const roleLabel = isMD ? "Managing Director" : isManager ? "Manager" : "Employee";
  const roleBadgeClass = isMD
    ? "badge badge-amber"
    : isManager
    ? "badge badge-blue"
    : "badge badge-green";

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-brand-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-brand-border">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-brand-green" />
          <div>
            <p className="text-sm font-bold text-brand-ink leading-none">People Ops</p>
            <p className="text-xs text-brand-muted">Platform</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-brand-border">
        <p className="text-sm font-medium text-brand-ink truncate">{user?.name}</p>
        <span className={roleBadgeClass}>{roleLabel}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
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
