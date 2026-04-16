import { useEffect, useState } from "react";
import { listRequests, getRequestLogs } from "../../api";
import { Clock, FileText, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";

/* Simplified statuses for employee view: Submitted / Under Review / Processed */
const STATUS_DISPLAY = {
  draft:     { label: "Submitted",    cls: "badge-blue"  },
  submitted: { label: "Submitted",    cls: "badge-blue"  },
  pending:   { label: "Under Review", cls: "badge-amber" },
  approved:  { label: "Processed",    cls: "badge-green" },
  rejected:  { label: "Processed",    cls: "badge-red"   },
  completed: { label: "Processed",    cls: "badge-green" },
};

const STATUS_FILTER = [
  { value: "",              label: "All statuses" },
  { value: "submitted",     label: "Submitted" },
  { value: "under_review",  label: "Under Review" },
  { value: "processed",     label: "Processed" },
];

/* Map internal statuses to portal status groups for client-side filtering */
const PORTAL_STATUS_MAP = {
  draft:     "submitted",
  submitted: "submitted",
  pending:   "under_review",
  approved:  "processed",
  rejected:  "processed",
  completed: "processed",
};

const TYPE_LABEL = {
  leave: "Leave", document: "Document", reimbursement: "Reimbursement",
  bank_change: "Bank Change", general: "General",
};

function RequestRow({ req }) {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs]         = useState(null);
  const cfg = STATUS_DISPLAY[req.status] || { label: req.status, cls: "badge-gray" };

  const loadLogs = async () => {
    if (!logs) setLogs(await getRequestLogs(req.id));
    setExpanded((p) => !p);
  };

  return (
    <div className="border border-brand-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer" onClick={loadLogs}>
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-brand-muted" />
          <div>
            <p className="text-sm font-medium text-brand-ink">{req.ref_id}</p>
            <p className="text-xs text-brand-muted">{TYPE_LABEL[req.type]} · {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : "Draft"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>
      {expanded && (
        <div className="bg-gray-50 border-t border-brand-border px-4 py-3 space-y-3">
          {req.description && <p className="text-sm text-brand-ink">{req.description}</p>}
          {req.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-800">
              <span className="font-medium">Rejection reason:</span> {req.rejection_reason}
            </div>
          )}
          {logs?.length > 0 && (
            <div>
              <p className="label mb-2">Audit trail</p>
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-brand-muted">
                    <span className="w-20 text-right font-medium capitalize">{log.action}</span>
                    <span>·</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                    {log.reason && <span className="text-brand-ink">— {log.reason}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter]     = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    listRequests({}).then((data) => {
      if (filter) {
        setRequests(data.filter((r) => PORTAL_STATUS_MAP[r.status] === filter));
      } else {
        setRequests(data);
      }
    }).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardList size={22} className="text-brand-green" /> My Requests
          </h1>
          <p className="text-sm text-brand-muted mt-1">Track the status of all your submitted requests</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-40">
          {STATUS_FILTER.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-brand-muted">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="card text-center py-12 text-brand-muted">
          <Clock size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No requests yet. Submit your first request above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => <RequestRow key={r.id} req={r} />)}
        </div>
      )}
    </div>
  );
}
