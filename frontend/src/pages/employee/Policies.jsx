import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const POLICIES = [
  {
    title: "Leave Information (General Guidance)",
    content: [
      "Annual Leave: 20 working days per year (Workers' Rights Act 2019)",
      "Sick Leave: 15 working days per year. A medical certificate is required after 3 consecutive days of absence.",
      "Maternity Leave: 14 weeks paid leave.",
      "Paternity Leave: 5 continuous working days paid leave.",
      "Public Holidays: As per the official Mauritius Government Gazette each year.",
      "Leave requests are submitted through this portal and reviewed in line with the company process.",
      "Leave information shown here is for guidance only. Final leave balance and approval remain subject to company records and HR review.",
    ],
  },
  {
    title: "How to Submit a Request",
    content: [
      "Go to the relevant request page (Leave, Document, Reimbursement, or Bank Details).",
      "Fill in the required details and submit.",
      "Your request will be reviewed in line with the company process.",
      "You can track the status on the My Requests page.",
      "Statuses: Submitted → Under Review → Processed (approved or returned with feedback).",
    ],
  },
  {
    title: "Reimbursement Policy",
    content: [
      "Work-related expenses must be submitted with a receipt or proof of payment.",
      "Include a clear description of the expense and its business purpose.",
      "Reimbursement requests are reviewed in line with the company process.",
      "Processing time may vary — you will see the status update on this portal.",
    ],
  },
  {
    title: "Bank Details Update",
    content: [
      "You can request a change to your salary payment bank details through this portal.",
      "Changes are subject to verification and will not be applied automatically.",
      "Please provide your new bank name, branch, account number, and account holder name.",
      "A supporting document (e.g. bank statement) may help with the verification process.",
    ],
  },
  {
    title: "Raising a Concern",
    content: [
      "If you have a workplace concern, you may use the Raise a Concern form to share it.",
      "Submissions are directed to senior management for internal review and follow-up.",
      "This is an internal process and is not a formal legal or grievance procedure.",
      "Concerns will be handled appropriately within the company.",
    ],
  },
  {
    title: "Suggestions & Improvements",
    content: [
      "All employees are encouraged to suggest improvements to workplace processes.",
      "Suggestions are reviewed periodically by management.",
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
      "Access to your submissions is limited to authorised personnel as part of the company process.",
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
          Common policies, information, and answers to frequently asked questions.
        </p>
      </div>

      <div className="space-y-2">
        {POLICIES.map((policy) => (
          <PolicySection key={policy.title} policy={policy} />
        ))}
      </div>

      <p className="text-xs text-brand-muted">
        This information is provided for general guidance only and does not constitute a legal or contractual commitment. For specific questions, please follow your company's internal process.
      </p>
    </div>
  );
}
