import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const POLICIES = [
  {
    title: "Leave Entitlements",
    content: [
      "Annual Leave: 20 working days per year (Workers' Rights Act 2019)",
      "Sick Leave: 15 working days per year. A medical certificate is required after 3 consecutive days of absence.",
      "Maternity Leave: 14 weeks paid leave.",
      "Paternity Leave: 5 continuous working days paid leave.",
      "Public Holidays: As per the official Mauritius Government Gazette each year.",
      "Leave requests are submitted through this portal and reviewed by your line manager.",
    ],
  },
  {
    title: "How to Submit a Request",
    content: [
      "Go to the relevant request page (Leave, Document, Reimbursement, or Bank Details).",
      "Fill in the required details and submit.",
      "Your request will be reviewed by your line manager.",
      "You can track the status on the My Requests page.",
      "Statuses: Submitted → Under Review → Processed (approved or returned with feedback).",
    ],
  },
  {
    title: "Reimbursement Policy",
    content: [
      "Work-related expenses must be submitted with a receipt or proof of payment.",
      "Include a clear description of the expense and its business purpose.",
      "Reimbursement requests are reviewed by your line manager.",
      "Processing time depends on approval workflow — you will see the status update on this portal.",
    ],
  },
  {
    title: "Bank Details Update",
    content: [
      "You can request a change to your salary payment bank details through this portal.",
      "Changes require manual verification and are not applied automatically.",
      "Please provide your new bank name, branch, account number, and account holder name.",
      "A supporting document (e.g. bank statement) may speed up verification.",
    ],
  },
  {
    title: "Raising a Concern",
    content: [
      "If you have a workplace concern (harassment, discrimination, salary issue, workload, or manager conduct), use the Raise a Concern form.",
      "Your concern goes directly to the Managing Director and is treated confidentially.",
      "Your line manager cannot see grievance submissions.",
      "The MD will review and respond to your concern.",
    ],
  },
  {
    title: "Suggestions & Improvements",
    content: [
      "All employees are encouraged to suggest improvements to workplace processes.",
      "Suggestions are reviewed by the MD on a monthly basis.",
      "You can track the status of your suggestions on the Suggestions page.",
      "The focus is on constructive ideas that improve how we work together.",
    ],
  },
  {
    title: "Data & Privacy",
    content: [
      "This portal stores only the information necessary for your requests and profile.",
      "You can view your own profile information on the My Profile page.",
      "Sensitive personal data (like NID) is stored securely and not displayed in full.",
      "Only you, your line manager (for requests), and the MD have access to your submissions.",
    ],
  },
];

function PolicySection({ policy }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-brand-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-sm font-medium text-brand-ink">{policy.title}</span>
        {open ? <ChevronUp size={16} className="text-brand-muted" /> : <ChevronDown size={16} className="text-brand-muted" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-gray-50 border-t border-brand-border">
          <ul className="space-y-2">
            {policy.content.map((item, i) => (
              <li key={i} className="text-sm text-brand-ink flex items-start gap-2">
                <span className="text-brand-muted mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Policies() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <BookOpen size={22} className="text-brand-green" /> Policies & FAQ
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Common policies, entitlements, and answers to frequently asked questions.
        </p>
      </div>

      <div className="space-y-2">
        {POLICIES.map((policy) => (
          <PolicySection key={policy.title} policy={policy} />
        ))}
      </div>

      <p className="text-xs text-brand-muted">
        This information is provided as guidance. For specific questions about your entitlements, please speak with your line manager or the Managing Director.
      </p>
    </div>
  );
}
