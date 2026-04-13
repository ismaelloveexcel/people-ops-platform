import { useEffect, useState } from "react";
import { listRequests } from "../../api";
import { FileText } from "lucide-react";

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "badge-gray"  },
  submitted: { label: "Submitted", cls: "badge-blue"  },
  pending:   { label: "Pending",   cls: "badge-amber" },
  approved:  { label: "Approved",  cls: "badge-green" },
  rejected:  { label: "Rejected",  cls: "badge-red"   },
  completed: { label: "Completed", cls: "badge-green" },
};

export default function TeamRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter]     = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    listRequests(filter ? { status: filter } : {}).then(setRequests).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Team Requests</h1>
          <p className="text-sm text-brand-muted mt-1">Full history of your team's requests</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-44">
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? <p className="text-sm text-brand-muted">Loading…</p> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-ink text-white">
              <tr>
                {["Ref ID", "Type", "Status", "Submitted", "Decision", "Reason"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-muted">No requests found.</td></tr>
              ) : requests.map((r) => {
                const cfg = STATUS_CONFIG[r.status] || { label: r.status, cls: "badge-gray" };
                return (
                  <tr key={r.id} className="border-b border-brand-border hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium">{r.ref_id}</td>
                    <td className="px-4 py-3 capitalize">{r.type.replace("_", " ")}</td>
                    <td className="px-4 py-3"><span className={`badge ${cfg.cls}`}>{cfg.label}</span></td>
                    <td className="px-4 py-3 text-brand-muted">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-brand-muted">{r.decided_at ? new Date(r.decided_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-brand-muted max-w-xs truncate">{r.rejection_reason || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
