import { useState } from "react";
import { createRequest, submitRequest } from "../../api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";

const TYPES = [
  { value: "leave",         label: "Leave Request",         hint: "Annual, sick, maternity, paternity or other leave" },
  { value: "document",      label: "Document Request",      hint: "Employment letter, payslip copy, reference letter" },
  { value: "reimbursement", label: "Reimbursement Request", hint: "Work expenses — attach receipt" },
  { value: "bank_change",   label: "Bank Change Request",   hint: "Update your salary payment bank details" },
  { value: "general",       label: "General Request",       hint: "Any other HR-related request" },
];

export default function SubmitRequest() {
  const [type, setType]         = useState("");
  const [description, setDesc]  = useState("");
  const [attachment, setAttach] = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!type) return toast.error("Please select a request type.");
    setLoading(true);
    try {
      const req = await createRequest({ type, description, attachment_url: attachment || undefined });
      await submitRequest(req.id);
      toast.success(`Request ${req.ref_id} submitted successfully.`);
      navigate("/portal/requests");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  const selectedType = TYPES.find((t) => t.value === type);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="page-title">Submit a Request</h1>
        <p className="text-sm text-brand-muted mt-1">Your request will be reviewed in line with the company process.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Type selector */}
        <div>
          <label className="label">Request Type *</label>
          <div className="grid grid-cols-1 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`text-left px-4 py-3 rounded-md border text-sm transition-colors ${
                  type === t.value
                    ? "border-brand-green bg-green-50 text-brand-green font-medium"
                    : "border-brand-border hover:border-brand-muted"
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <span className="block text-xs text-brand-muted mt-0.5">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            className="input h-28 resize-none"
            placeholder={
              type === "leave" ? "Leave dates, reason, type of leave…"
              : type === "reimbursement" ? "What was purchased, business purpose, amount…"
              : "Describe your request…"
            }
          />
        </div>

        {/* Attachment URL (for receipts etc.) */}
        {(type === "reimbursement" || type === "document") && (
          <div>
            <label className="label">Attachment URL {type === "reimbursement" && "(Receipt link)"}</label>
            <input
              type="url"
              value={attachment}
              onChange={(e) => setAttach(e.target.value)}
              className="input"
              placeholder="https://drive.google.com/…"
            />
          </div>
        )}

        <button type="submit" disabled={loading || !type} className="btn-primary w-full flex items-center justify-center gap-2">
          <Send size={16} />
          {loading ? "Submitting…" : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
