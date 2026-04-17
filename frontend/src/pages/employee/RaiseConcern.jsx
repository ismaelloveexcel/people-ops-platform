import { useState } from "react";
import { submitGrievance } from "../../api";
import { AlertTriangle, Lock, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = [
  { value: "harassment",      label: "Harassment" },
  { value: "discrimination",  label: "Discrimination" },
  { value: "salary",          label: "Salary Issue" },
  { value: "workload",        label: "Workload / Wellbeing" },
  { value: "manager_conduct", label: "Manager Conduct" },
  { value: "other",           label: "Other" },
];

export default function RaiseConcern() {
  const [category, setCategory]   = useState("");
  const [description, setDesc]    = useState("");
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !description.trim()) return toast.error("Please complete all fields.");
    setLoading(true);
    try {
      const grv = await submitGrievance({ category, description });
      setSubmitted(grv);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit concern.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg">
        <div className="card text-center py-10 space-y-4">
          <CheckCircle size={40} className="mx-auto text-brand-green" />
          <h2 className="text-lg font-bold text-brand-ink">Concern Submitted</h2>
          <p className="text-sm text-brand-muted">Your concern <span className="font-mono font-medium text-brand-ink">{submitted.ref_id}</span> has been received and will be handled appropriately within the company.</p>
          <p className="text-xs text-brand-muted">Submissions are directed to senior management for internal review.</p>
          <button onClick={() => setSubmitted(null)} className="btn-secondary">Submit another concern</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <AlertTriangle size={22} className="text-brand-red" /> Raise a Concern
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          You may use this section to raise a concern or share something that requires attention. Submissions will be handled appropriately within the company.
        </p>
      </div>

      {/* Internal handling notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <Lock size={16} className="text-brand-blue mt-0.5 flex-shrink-0" />
        <div className="text-sm text-brand-blue">
          <p className="font-medium">Internal handling</p>
          <p className="text-xs mt-0.5">Concerns submitted here are directed to senior management for internal review and follow-up.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label">Category *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input" required>
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            className="input h-36 resize-none"
            placeholder="Describe the situation clearly. Include dates, names, and what happened…"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-danger w-full flex items-center justify-center gap-2">
          <AlertTriangle size={16} />
          {loading ? "Submitting…" : "Submit Concern"}
        </button>
      </form>
    </div>
  );
}
