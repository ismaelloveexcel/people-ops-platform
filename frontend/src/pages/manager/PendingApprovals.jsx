import { useEffect, useState } from "react";
import { listRequests, approveRequest, rejectRequest } from "../../api";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Info } from "lucide-react";
import toast from "react-hot-toast";

// ── Decision Guide — v3 FIX 02 ────────────────────────────────────────────────
const DECISION_GUIDES = {
  leave: {
    title: "📋 Leave Approval Guide",
    approve: "Sufficient balance · No business conflict · Reasonable notice · Team coverage available",
    discuss: "Peak period · Team short-staffed · Long duration · Insufficient notice",
    reject:  "Zero balance · Critical deadline · Same dates as approved leave · Policy breach",
  },
  reimbursement: {
    title: "💰 Reimbursement Approval Guide",
    approve: "Valid receipt attached · Work-related · Within policy limit · Pre-approved activity",
    discuss: "Receipt missing · Amount above usual · Unclear business purpose · Not pre-approved",
    reject:  "Personal expense · No receipt · Outside policy scope · Duplicate claim",
  },
  document: {
    title: "📄 Document Request Guide",
    approve: "Employee is active · Standard document · No pending disciplinary · Legitimate purpose",
    discuss: "Unusual document type · Employee on notice · Sensitive content required",
    reject:  "Active disciplinary case · Legal context suspected → Escalate to MD",
  },
  bank_change: {
    title: "🏦 Bank Change Guide",
    approve: "Employee confirms request · Standard account type · No recent changes",
    discuss: "Recent change already processed · Multiple requests",
    reject:  "Cannot verify identity · Possible fraud risk → Escalate to MD",
  },
  general: {
    title: "📝 General Request Guide",
    approve: "Clear legitimate purpose · Within your authority",
    discuss: "Unclear purpose or scope · May need MD involvement",
    reject:  "Outside policy · Refer to MD if uncertain",
  },
};

function DecisionGuide({ type }) {
  const guide = DECISION_GUIDES[type] || DECISION_GUIDES.general;
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
      <p className="text-xs font-bold text-brand-blue mb-3 flex items-center gap-1">
        <Info size={12} /> {guide.title}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded p-2">
          <p className="text-xs font-semibold text-green-800 mb-1">✅ Approve</p>
          <p className="text-xs text-green-700">{guide.approve}</p>
        </div>
        <div className="bg-amber-50 rounded p-2">
          <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Discuss First</p>
          <p className="text-xs text-amber-700">{guide.discuss}</p>
        </div>
        <div className="bg-red-50 rounded p-2">
          <p className="text-xs font-semibold text-red-800 mb-1">✗ Reject</p>
          <p className="text-xs text-red-700">{guide.reject}</p>
        </div>
      </div>
    </div>
  );
}

function ApprovalCard({ req, onDone }) {
  const [expanded, setExpanded]      = useState(false);
  const [showReject, setShowReject]  = useState(false);
  const [reason, setReason]          = useState("");
  const [loading, setLoading]        = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveRequest(req.id, { reason: "Approved via Decision Guide review." });
      toast.success(`${req.ref_id} approved.`);
      onDone(req.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Approval failed.");
    } finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!reason.trim()) return toast.error("Rejection reason is required.");
    setLoading(true);
    try {
      await rejectRequest(req.id, { rejection_reason: reason });
      toast.success(`${req.ref_id} rejected.`);
      onDone(req.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Rejection failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded((p) => !p)}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-brand-ink">{req.ref_id}</span>
            <span className="badge badge-amber capitalize">{req.type.replace("_", " ")}</span>
          </div>
          <p className="text-xs text-brand-muted mt-0.5">
            Submitted {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : "—"}
          </p>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <>
          {req.description && <p className="text-sm text-brand-ink bg-gray-50 rounded p-3">{req.description}</p>}

          {/* Decision Guide — shown during every approval action */}
          <DecisionGuide type={req.type} />

          {/* Actions */}
          {!showReject ? (
            <div className="flex gap-2 pt-2">
              <button onClick={handleApprove} disabled={loading} className="btn-primary flex items-center gap-1">
                <CheckCircle size={14} /> Approve
              </button>
              <button onClick={() => setShowReject(true)} disabled={loading} className="btn-danger flex items-center gap-1">
                <XCircle size={14} /> Reject
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <label className="label">Rejection Reason * (mandatory — visible to employee)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input h-20 resize-none"
                placeholder="State the reason clearly. Employee will see this."
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleReject} disabled={loading || !reason.trim()} className="btn-danger flex items-center gap-1">
                  <XCircle size={14} /> Confirm Rejection
                </button>
                <button onClick={() => setShowReject(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PendingApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = () => {
    setLoading(true);
    listRequests({ status: "submitted" }).then(setRequests).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const removeDone = (id) => setRequests((p) => p.filter((r) => r.id !== id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Pending Approvals</h1>
        <p className="text-sm text-brand-muted mt-1">Each request includes the Decision Guide. Rejection reason is mandatory.</p>
      </div>
      {loading ? (
        <p className="text-sm text-brand-muted">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="card text-center py-12 text-brand-muted">
          <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No pending approvals. You're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => <ApprovalCard key={r.id} req={r} onDone={removeDone} />)}
        </div>
      )}
    </div>
  );
}
