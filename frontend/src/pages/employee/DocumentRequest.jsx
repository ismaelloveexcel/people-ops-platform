import { useState } from "react";
import { createRequest, submitRequest } from "../../api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { FileText, Send } from "lucide-react";

export default function DocumentRequest() {
  const [description, setDesc]  = useState("");
  const [attachment, setAttach] = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return toast.error("Please describe what document you need.");
    setLoading(true);
    try {
      const req = await createRequest({
        type: "document",
        description,
        attachment_url: attachment || undefined,
      });
      await submitRequest(req.id);
      toast.success(`Document request ${req.ref_id} submitted.`);
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
          <FileText size={22} className="text-brand-green" /> Document Request
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Request an employment letter, payslip copy, reference letter, or any other document. Your request will be reviewed in line with the company process.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label">What document do you need? *</label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            className="input h-28 resize-none"
            placeholder="e.g. Employment confirmation letter for bank, payslip for March 2026, reference letter..."
            required
          />
        </div>

        <div>
          <label className="label">Attachment URL (optional)</label>
          <input
            type="url"
            value={attachment}
            onChange={(e) => setAttach(e.target.value)}
            className="input"
            placeholder="https://drive.google.com/…"
          />
          <p className="text-xs text-brand-muted mt-1">If you have a supporting document, paste the link here.</p>
        </div>

        <button type="submit" disabled={loading || !description.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
          <Send size={16} />
          {loading ? "Submitting…" : "Submit Document Request"}
        </button>
      </form>
    </div>
  );
}
