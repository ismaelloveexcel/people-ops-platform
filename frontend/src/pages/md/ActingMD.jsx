import { useEffect, useState } from "react";
import { listActingMD, assignActingMD, expireActingMD, listEmployees } from "../../api";
import { UserCheck, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function ActingMD() {
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [form, setForm]               = useState({ assigned_to: "", start_date: "", end_date: "", notes: "" });
  const [loading, setLoading]         = useState(false);

  const load = () => Promise.all([listActingMD(), listEmployees()]).then(([a, e]) => { setAssignments(a); setEmployees(e); });
  useEffect(() => { load(); }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!form.assigned_to || !form.start_date || !form.end_date) return toast.error("All fields required.");
    setLoading(true);
    try {
      await assignActingMD(form);
      toast.success("Acting MD assigned successfully.");
      setForm({ assigned_to: "", start_date: "", end_date: "", notes: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to assign Acting MD.");
    } finally { setLoading(false); }
  };

  const handleExpire = async (id, ref) => {
    if (!confirm(`Force-expire this Acting MD assignment?`)) return;
    try {
      await expireActingMD(id, { notes: "Force-expired by MD." });
      toast.success("Assignment expired.");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to expire.");
    }
  };

  const managers = employees.filter((e) => e.role === "manager");
  const active   = assignments.filter((a) => a.status === "active");
  const history  = assignments.filter((a) => a.status === "expired");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><UserCheck size={22} className="text-brand-gold" /> Acting MD</h1>
        <p className="text-sm text-brand-muted mt-1">Only the real MD can assign this role. Acting MD cannot self-extend.</p>
      </div>

      {active.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-700 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Active Acting MD Assignment</p>
            {active.map((a) => {
              const emp = employees.find((e) => e.id === a.assigned_to);
              return (
                <div key={a.id} className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-amber-700">{emp?.name || a.assigned_to} · {a.start_date} → {a.end_date}</p>
                  <button onClick={() => handleExpire(a.id)} className="text-xs text-red-700 underline">Force expire</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleAssign} className="card space-y-4 max-w-md">
        <h2 className="section-title">Assign Acting MD</h2>
        <div>
          <label className="label">Assign To (Manager) *</label>
          <select value={form.assigned_to} onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))} className="input" required>
            <option value="">Select manager…</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.department}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start Date *</label>
            <input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} className="input" required />
          </div>
          <div>
            <label className="label">End Date *</label>
            <input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} className="input" required />
          </div>
        </div>
        <div>
          <label className="label">Notes (reason for absence)</label>
          <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="input" placeholder="Travel, annual leave, etc." />
        </div>
        <button type="submit" disabled={loading} className="btn-gold w-full">
          {loading ? "Assigning…" : "Assign Acting MD"}
        </button>
      </form>

      {history.length > 0 && (
        <div>
          <h2 className="section-title">Assignment History</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-ink text-white">
                <tr>{["Assigned To", "Start", "End", "Status", "Notes"].map((h) => <th key={h} className="text-left px-4 py-2 text-xs">{h}</th>)}</tr>
              </thead>
              <tbody>
                {history.map((a) => {
                  const emp = employees.find((e) => e.id === a.assigned_to);
                  return (
                    <tr key={a.id} className="border-b border-brand-border">
                      <td className="px-4 py-2">{emp?.name || "—"}</td>
                      <td className="px-4 py-2 text-brand-muted">{a.start_date}</td>
                      <td className="px-4 py-2 text-brand-muted">{a.end_date}</td>
                      <td className="px-4 py-2"><span className="badge badge-gray">{a.status}</span></td>
                      <td className="px-4 py-2 text-brand-muted max-w-xs truncate">{a.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
