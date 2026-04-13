import { useEffect, useState } from "react";
import { listDisciplinaryCases, updateDisciplinaryCase, listEmployees } from "../../api";
import { Shield } from "lucide-react";
import toast from "react-hot-toast";

const OUTCOMES = ["warning", "final_warning", "suspension", "termination", "no_action"];
const OUTCOME_LABELS = { warning: "Warning", final_warning: "Final Warning", suspension: "Suspension", termination: "Termination", no_action: "No Action" };

export default function DisciplinaryCases() {
  const [cases, setCases]         = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter]       = useState("open");
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(null);

  // Per-card edit state
  const [edits, setEdits] = useState({});

  const load = () => {
    setLoading(true);
    Promise.all([listDisciplinaryCases(filter ? { case_status: filter } : {}), listEmployees()])
      .then(([c, e]) => { setCases(c); setEmployees(e); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const getEdit = (c) => edits[c.id] || { status: c.status, outcome: c.outcome || "", handled_by: c.handled_by || "", hearing_date: c.hearing_date || "" };
  const setEdit = (id, patch) => setEdits((prev) => ({ ...prev, [id]: { ...getEdit({ id, ...cases.find((c) => c.id === id) }), ...patch } }));

  const save = async (c) => {
    const e = getEdit(c);
    if (e.status === "closed" && !e.outcome) return toast.error("Outcome required before closing.");
    try {
      const updated = await updateDisciplinaryCase(c.id, {
        status: e.status || undefined,
        outcome: e.outcome || undefined,
        handled_by: e.handled_by || null,
        hearing_date: e.hearing_date || undefined,
      });
      toast.success(`${c.ref_id} updated.`);
      setCases((prev) => prev.map((x) => x.id === c.id ? updated : x));
      setExpanded(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed.");
    }
  };

  const managers = employees.filter((e) => e.role === "manager");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Shield size={22} className="text-brand-red" /> Disciplinary Cases</h1>
          <p className="text-sm text-brand-muted mt-1">Review, schedule hearings, record outcomes. Only MD can close.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-36">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="">All</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-brand-muted">Loading…</p> :
        cases.length === 0 ? (
          <div className="card text-center py-12 text-brand-muted"><Shield size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No cases.</p></div>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => {
              const e = getEdit(c);
              const isOpen = expanded === c.id;
              return (
                <div key={c.id} className="card space-y-3">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(isOpen ? null : c.id)}>
                    <div>
                      <span className="font-mono text-sm font-bold">{c.ref_id}</span>
                      <span className="ml-2 text-xs text-brand-muted capitalize">{c.issue_type.replace("_"," ")}</span>
                    </div>
                    <span className={`badge ${c.status === "closed" ? "badge-green" : "badge-amber"}`}>{c.status}</span>
                  </div>
                  {isOpen && (
                    <div className="border-t border-brand-border pt-4 space-y-4">
                      <p className="text-sm bg-gray-50 rounded p-3">{c.description}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="label">Status</label>
                          <select value={e.status} onChange={(ev) => setEdit(c.id, { status: ev.target.value })} className="input">
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Outcome {e.status === "closed" && <span className="text-brand-red">*</span>}</label>
                          <select value={e.outcome} onChange={(ev) => setEdit(c.id, { outcome: ev.target.value })} className="input">
                            <option value="">Select outcome…</option>
                            {OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label">Hearing Date</label>
                          <input type="date" value={e.hearing_date} onChange={(ev) => setEdit(c.id, { hearing_date: ev.target.value })} className="input" />
                        </div>
                        <div>
                          <label className="label">Delegate Investigation To</label>
                          <select value={e.handled_by} onChange={(ev) => setEdit(c.id, { handled_by: ev.target.value })} className="input">
                            <option value="">MD handles directly</option>
                            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <button onClick={() => save(c)} className="btn-primary">Save Changes</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
