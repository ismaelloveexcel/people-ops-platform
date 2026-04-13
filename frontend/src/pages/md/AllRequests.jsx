import { useEffect, useState } from "react";
import { listRequests, approveRequest, rejectRequest } from "../../api";
import { FileText } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_CFG = {
  draft:     { label: "Draft",     cls: "badge-gray"  },
  submitted: { label: "Submitted", cls: "badge-blue"  },
  pending:   { label: "Pending",   cls: "badge-amber" },
  approved:  { label: "Approved",  cls: "badge-green" },
  rejected:  { label: "Rejected",  cls: "badge-red"   },
  completed: { label: "Completed", cls: "badge-green" },
};

export default function AllRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [rejecting, setReject]  = useState(null);
  const [reason, setReason]     = useState("");

  const load = () => {
    setLoading(true);
    listRequests(filter ? { status: filter } : {}).then(setRequests).finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const approve = async (id, ref) => {
    try {
      await approveRequest(id, { reason: "Approved by MD." });
      toast.success(`${ref} approved.`);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed."); }
  };

  const reject = async () => {
    if (!reason.trim()) return toast.error("Rejection reason is required.");
    try {
      await rejectRequest(rejecting.id, { rejection_reason: reason });
      toast.success(`${rejecting.ref_id} rejected.`);
      setReject(null); setReason(""); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed."); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">All Requests</h1>
          <p className="text-sm text-brand-muted mt-1">Full visibility across all employees and statuses</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-44">
          <option value="">All statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? <p className="text-sm text-brand-muted">Loading…</p> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-ink text-white">
              <tr>{["Ref", "Type", "Status", "Submitted", "Reason", "Actions"].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-muted">No requests found.</td></tr>
              ) : requests.map((r) => {
                const cfg = STATUS_CFG[r.status] || { label: r.status, cls: "badge-gray" };
                return (
                  <tr key={r.id} className="border-b border-brand-border hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-xs">{r.ref_id}</td>
                    <td className="px-4 py-3 capitalize">{r.type.replace("_", " ")}</td>
                    <td className="px-4 py-3"><span className={`badge ${cfg.cls}`}>{cfg.label}</span></td>
                    <td className="px-4 py-3 text-brand-muted">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-brand-muted max-w-xs truncate">{r.rejection_reason || "—"}</td>
                    <td className="px-4 py-3">
                      {r.status === "submitted" && (
                        <div className="flex gap-1">
                          <button onClick={() => approve(r.id, r.ref_id)} className="text-xs text-green-700 hover:underline font-medium">Approve</button>
                          <span className="text-brand-muted">·</span>
                          <button onClick={() => { setReject(r); setReason(""); }} className="text-xs text-red-700 hover:underline font-medium">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rejection modal */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-brand-ink">Reject {rejecting.ref_id}</h3>
            <div>
              <label className="label">Rejection Reason * (mandatory)</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input h-24 resize-none" autoFocus placeholder="Reason shown to employee…" />
            </div>
            <div className="flex gap-2">
              <button onClick={reject} disabled={!reason.trim()} className="btn-danger">Confirm Rejection</button>
              <button onClick={() => setReject(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
