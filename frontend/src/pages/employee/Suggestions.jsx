import { useState, useEffect } from "react";
import { submitSuggestion, listSuggestions } from "../../api";
import { Lightbulb, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  submitted:    "badge-blue",
  under_review: "badge-amber",
  implemented:  "badge-green",
  in_progress:  "badge-amber",
  noted:        "badge-gray",
  declined:     "badge-red",
};

export default function Suggestions() {
  const [title, setTitle]           = useState("");
  const [description, setDesc]      = useState("");
  const [loading, setLoading]       = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [justSubmitted, setJust]    = useState(false);

  useEffect(() => { listSuggestions().then(setSuggestions); }, [justSubmitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return toast.error("Title and description are required.");
    setLoading(true);
    try {
      await submitSuggestion({ title, description });
      toast.success("Suggestion submitted! The MD reviews these monthly.");
      setTitle(""); setDesc(""); setJust((p) => !p);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit suggestion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><Lightbulb size={22} className="text-brand-gold" /> Suggest an Improvement</h1>
        <p className="text-sm text-brand-muted mt-1">The MD reviews suggestions monthly and shares the Top 3 updates with the team.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Short title for your suggestion" required />
        </div>
        <div>
          <label className="label">Description *</label>
          <textarea value={description} onChange={(e) => setDesc(e.target.value)} className="input h-28 resize-none" placeholder="Describe the improvement and why it would help…" required />
        </div>
        <button type="submit" disabled={loading} className="btn-gold flex items-center gap-2">
          <Lightbulb size={16} /> {loading ? "Submitting…" : "Submit Suggestion"}
        </button>
      </form>

      {suggestions.length > 0 && (
        <div>
          <h2 className="section-title">My Suggestions</h2>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.id} className="card-sm flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-brand-ink">{s.title}</p>
                  <p className="text-xs text-brand-muted mt-0.5">{s.description}</p>
                  {s.md_notes && <p className="text-xs text-brand-blue mt-1 italic">MD: {s.md_notes}</p>}
                </div>
                <span className={`badge flex-shrink-0 ${STATUS_BADGE[s.status] || "badge-gray"}`}>{s.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
