import { useState } from "react";
import { createRequest, submitRequest } from "../../api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Building2, Send, AlertTriangle } from "lucide-react";

export default function BankDetailsUpdate() {
  const [description, setDesc]  = useState("");
  const [attachment, setAttach] = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return toast.error("Please provide your new bank details.");
    setLoading(true);
    try {
      const req = await createRequest({
        type: "bank_change",
        description,
        attachment_url: attachment || undefined,
      });
      await submitRequest(req.id);
      toast.success(`Bank details update request ${req.ref_id} submitted.`);
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
          <Building2 size={22} className="text-brand-green" /> Bank Details Update
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Request a change to your salary payment bank details.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Verification required</p>
          <p className="text-xs mt-0.5">Bank detail changes require manual verification before processing. This is not applied automatically.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label">New Bank Details *</label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            className="input h-28 resize-none"
            placeholder="Bank name, branch, account number, account holder name..."
            required
          />
        </div>

        <div>
          <label className="label">Supporting Document (optional)</label>
          <input
            type="url"
            value={attachment}
            onChange={(e) => setAttach(e.target.value)}
            className="input"
            placeholder="https://drive.google.com/… (e.g. bank statement or letter)"
          />
        </div>

        <button type="submit" disabled={loading || !description.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
          <Send size={16} />
          {loading ? "Submitting…" : "Submit Bank Details Update"}
        </button>
      </form>
    </div>
  );
}
