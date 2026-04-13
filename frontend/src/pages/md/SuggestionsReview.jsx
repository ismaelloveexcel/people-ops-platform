import { useEffect, useState } from "react";
import { monthlyReview, updateSuggestion } from "../../api";
import { BarChart2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "under_review", label: "Under Review" },
  { value: "implemented",  label: "Implemented" },
  { value: "in_progress",  label: "In Progress" },
  { value: "noted",        label: "Noted" },
  { value: "declined",     label: "Declined" },
];

const STATUS_BADGE = {
  submitted: "badge-blue", under_review: "badge-amber", implemented: "badge-green",
  in_progress: "badge-amber", noted: "badge-gray", declined: "badge-red",
};

export default function SuggestionsReview() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});

  const load = () => {
    setLoading(true);
    monthlyReview(year, month).then(setItems).finally(() => setLoading(false));
  };
  useEffect(load, [year, month]);

  const getEdit = (s) => edits[s.id] || { status: s.status, md_notes: s.md_notes || "" };
  const setEdit = (id, patch) => setEdits((prev) => ({ ...prev, [id]: { ...getEdit({ id }), ...patch } }));

  const save = async (s) => {
    const e = getEdit(s);
    try {
      const updated = await updateSuggestion(s.id, { status: e.status, md_notes: e.md_notes });
      toast.success("Suggestion updated.");
      setItems((prev) => prev.map((x) => x.id === s.id ? updated : x));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update.");
    }
  };

  const topThree = items.filter((s) => ["implemented", "in_progress"].includes(getEdit(s).status)).slice(0, 3);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><BarChart2 size={22} className="text-brand-gold" /> Monthly Suggestions Review</h1>
          <p className="text-sm text-brand-muted mt-1">Review submissions, update status, then send Top 3 to the team.</p>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={(e) => setMonth(+e.target.value)} className="input w-28">
            {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(+e.target.value)} className="input w-24">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Top 3 comms preview */}
      {topThree.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-bold text-green-800 mb-2">📢 Top 3 Message Preview (send via WhatsApp/Email)</p>
          <p className="text-sm text-green-700 font-mono bg-white rounded p-3 border border-green-200">
            This month's top suggestions: {topThree.map((s, i) => `[${s.title} — ${getEdit(s).status.replace("_", " ")}]`).join(" ")}. Thank you for your ideas!
          </p>
        </div>
      )}

      {loading ? <p className="text-sm text-brand-muted">Loading…</p> :
        items.length === 0 ? (
          <div className="card text-center py-12 text-brand-muted">
            <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No suggestions for {monthNames[month - 1]} {year}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((s) => {
              const e = getEdit(s);
              return (
                <div key={s.id} className="card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-brand-ink">{s.title}</p>
                      <p className="text-xs text-brand-muted mt-0.5">{s.description}</p>
                    </div>
                    <span className={`badge flex-shrink-0 ${STATUS_BADGE[s.status] || "badge-gray"}`}>{s.status.replace("_", " ")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Update Status</label>
                      <select value={e.status} onChange={(ev) => setEdit(s.id, { status: ev.target.value })} className="input">
                        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">MD Notes</label>
                      <input value={e.md_notes} onChange={(ev) => setEdit(s.id, { md_notes: ev.target.value })} className="input" placeholder="Feedback for employee…" />
                    </div>
                  </div>
                  <button onClick={() => save(s)} className="btn-primary text-xs px-3 py-1.5">Save</button>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
