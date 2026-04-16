import { useState } from "react";
import { createRequest, submitRequest } from "../../api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Receipt, Send } from "lucide-react";

export default function ReimbursementRequest() {
  const [description, setDesc]  = useState("");
  const [attachment, setAttach] = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return toast.error("Please describe the expense.");
    setLoading(true);
    try {
      const req = await createRequest({
        type: "reimbursement",
        description,
        attachment_url: attachment || undefined,
      });
      await submitRequest(req.id);
      toast.success(`Reimbursement request ${req.ref_id} submitted.`);
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
          <Receipt size={22} className="text-brand-green" /> Reimbursement Request
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Submit work-related expenses for reimbursement. Please attach a receipt. Your request will be reviewed in line with the company process.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label">Expense Details *</label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            className="input h-28 resize-none"
            placeholder="What was purchased, business purpose, amount (MUR)..."
            required
          />
        </div>

        <div>
          <label className="label">Receipt Link (optional)</label>
          <input
            type="url"
            value={attachment}
            onChange={(e) => setAttach(e.target.value)}
            className="input"
            placeholder="https://drive.google.com/…"
          />
          <p className="text-xs text-brand-muted mt-1">Upload your receipt to Google Drive or similar and paste the link.</p>
        </div>

        <button type="submit" disabled={loading || !description.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
          <Send size={16} />
          {loading ? "Submitting…" : "Submit Reimbursement Request"}
        </button>
      </form>
    </div>
  );
}
