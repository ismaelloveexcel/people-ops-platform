import { useState } from "react";
import { createRequest, submitRequest } from "../../api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Calendar, Send } from "lucide-react";

export default function LeaveRequest() {
  const [description, setDesc] = useState("");
  const [loading, setLoading]  = useState(false);
  const navigate               = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return toast.error("Please describe your leave request.");
    setLoading(true);
    try {
      const req = await createRequest({ type: "leave", description });
      await submitRequest(req.id);
      toast.success(`Leave request ${req.ref_id} submitted.`);
      navigate("/portal/my-requests");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Calendar size={22} className="text-brand-green" /> Leave Request
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Request annual, sick, maternity, paternity, or other leave. Your request will be reviewed in line with the company process.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-brand-blue">
        <p className="font-medium">Leave Information (General Guidance)</p>
        <ul className="text-xs mt-1 space-y-0.5">
          <li>• Annual Leave: 20 days / year</li>
          <li>• Sick Leave: 15 days / year (certificate required after 3 days)</li>
          <li>• Maternity Leave: 14 weeks paid</li>
          <li>• Paternity Leave: 5 days paid</li>
        </ul>
        <p className="text-xs mt-2 italic">Leave information shown here is for guidance only. Final leave balance and approval remain subject to company records and HR review.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label">Leave Details *</label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            className="input h-32 resize-none"
            placeholder="Please include: type of leave, start date, end date, reason..."
            required
          />
        </div>

        <button type="submit" disabled={loading || !description.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
          <Send size={16} />
          {loading ? "Submitting…" : "Submit Leave Request"}
        </button>
      </form>

      <p className="text-xs text-brand-muted">
        Your request will be reviewed in line with the company process. This submission does not constitute automatic approval.
      </p>
    </div>
  );
}
