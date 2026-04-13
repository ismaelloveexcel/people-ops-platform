import { useState, useEffect } from "react";
import { createDisciplinaryCase, listEmployees, listDisciplinaryCases } from "../../api";
import { Shield, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const ISSUE_TYPES = [
  { value: "misconduct",    label: "Misconduct" },
  { value: "absence",       label: "Unauthorised Absence" },
  { value: "performance",   label: "Performance Issue" },
  { value: "policy_breach", label: "Policy Breach" },
  { value: "other",         label: "Other" },
];

export default function InitiateDisciplinary() {
  const [employees, setEmployees]   = useState([]);
  const [cases, setCases]           = useState([]);
  const [employeeId, setEmpId]      = useState("");
  const [issueType, setIssueType]   = useState("");
  const [description, setDesc]      = useState("");
  const [loading, setLoading]       = useState(false);
  const [submitted, setSubmitted]   = useState(null);

  useEffect(() => {
    listEmployees().then(setEmployees);
    listDisciplinaryCases().then(setCases);
  }, [submitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId || !issueType || !description.trim()) return toast.error("All fields are required.");
    setLoading(true);
    try {
      const c = await createDisciplinaryCase({ employee_id: employeeId, issue_type: issueType, description });
      setSubmitted(c);
      toast.success(`Case ${c.ref_id} created. MD has been notified.`);
      setEmpId(""); setIssueType(""); setDesc("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create case.");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><Shield size={22} className="text-brand-red" /> Initiate Disciplinary Case</h1>
        <p className="text-sm text-brand-muted mt-1">You create the case. The MD reviews, schedules the hearing, and closes it.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        <strong>Process reminder:</strong> Verbal → Written → Final Warning → Termination. Employee must be informed of allegations in writing and given the opportunity to respond. All stages require MD closure.
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 max-w-lg">
        <div>
          <label className="label">Employee *</label>
          <select value={employeeId} onChange={(e) => setEmpId(e.target.value)} className="input" required>
            <option value="">Select employee…</option>
            {employees.filter((e) => e.role === "employee").map((e) => (
              <option key={e.id} value={e.id}>{e.name} — {e.department}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Issue Type *</label>
          <select value={issueType} onChange={(e) => setIssueType(e.target.value)} className="input" required>
            <option value="">Select type…</option>
            {ISSUE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Description *</label>
          <textarea value={description} onChange={(e) => setDesc(e.target.value)} className="input h-28 resize-none" placeholder="Describe the issue with dates, incidents, and prior warnings given…" required />
        </div>
        <button type="submit" disabled={loading} className="btn-danger flex items-center gap-2">
          <Shield size={16} /> {loading ? "Submitting…" : "Create Case (notify MD)"}
        </button>
      </form>

      {cases.length > 0 && (
        <div>
          <h2 className="section-title">Cases You Initiated</h2>
          <div className="space-y-2">
            {cases.map((c) => (
              <div key={c.id} className="card-sm flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-medium">{c.ref_id}</span>
                  <span className="text-xs text-brand-muted ml-2 capitalize">{c.issue_type.replace("_", " ")}</span>
                </div>
                <span className={`badge ${c.status === "closed" ? "badge-green" : "badge-amber"}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
