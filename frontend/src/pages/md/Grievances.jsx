import { useEffect, useState } from "react";
import { listGrievances, updateGrievance, listEmployees } from "../../api";
import { AlertTriangle, Lock } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_CFG = {
  open:         { label: "Open",         cls: "badge-red"   },
  under_review: { label: "Under Review", cls: "badge-amber" },
  resolved:     { label: "Resolved",     cls: "badge-blue"  },
  closed:       { label: "Closed",       cls: "badge-green" },
};

const CATEGORY_LABEL = {
  harassment: "Harassment", discrimination: "Discrimination", salary: "Salary",
  workload: "Workload", manager_conduct: "Manager Conduct", other: "Other",
};

function GrievanceCard({ grv, employees, onUpdate }) {
  const [expanded, setExpanded]   = useState(false);
  const [status, setStatus]       = useState(grv.status);
  const [handledBy, setHandledBy] = useState(grv.handled_by || "");
  const [resolution, setRes]      = useState(grv.resolution || "");
  const [loading, setLoading]     = useState(false);

  const save = async () => {
    if (status === "closed" && !resolution.trim()) return toast.error("Resolution is required before closing.");
    setLoading(true);
    try {
      const updated = await updateGrievance(grv.id, {
        status,
        handled_by: handledBy || null,
        resolution: resolution || null,
      });
      toast.success("Grievance updated.");
      onUpdate(updated);
      setExpanded(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed.");
    } finally { setLoading(false); }
  };

  const cfg = STATUS_CFG[grv.status] || { label: grv.status, cls: "badge-gray" };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded((p) => !p)}>
        <div className="flex items-center gap-3">
          <Lock size={14} className="text-brand-red" />
          <div>
            <span className="font-mono text-sm font-bold">{grv.ref_id}</span>
            <span className="ml-2 text-xs text-brand-muted">{CATEGORY_LABEL[grv.category]}</span>
            <span className="ml-2 text-xs text-brand-muted">· {new Date(grv.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-brand-border pt-4">
          <div className="bg-gray-50 rounded p-3 text-sm">{grv.description}</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Delegate Investigation To (optional)</label>
              <select value={handledBy} onChange={(e) => setHandledBy(e.target.value)} className="input">
                <option value="">MD handles directly</option>
                {employees.filter((e) => e.role === "manager").map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <p className="text-xs text-brand-muted mt-1">Final decision always stays with MD</p>
            </div>
          </div>

          <div>
            <label className="label">Resolution {status === "closed" && <span className="text-brand-red">*</span>}</label>
            <textarea value={resolution} onChange={(e) => setRes(e.target.value)} className="input h-24 resize-none" placeholder="Required before closing the case…" />
          </div>

          <button onClick={save} disabled={loading} className="btn-primary">{loading ? "Saving…" : "Save Changes"}</button>
        </div>
      )}
    </div>
  );
}

export default function Grievances() {
  const [grievances, setGrievances] = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [filter, setFilter]         = useState("open");
  const [loading, setLoading]       = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([listGrievances(filter ? { grv_status: filter } : {}), listEmployees()])
      .then(([g, e]) => { setGrievances(g); setEmployees(e); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const onUpdate = (updated) =>
    setGrievances((prev) => prev.map((g) => g.id === updated.id ? updated : g));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><AlertTriangle size={22} className="text-brand-red" /> Grievances</h1>
          <p className="text-sm text-brand-muted mt-1">MD-only access. Managers cannot see this section.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-44">
          <option value="">All</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? <p className="text-sm text-brand-muted">Loading…</p> :
        grievances.length === 0 ? (
          <div className="card text-center py-12 text-brand-muted">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No grievances with status: {filter || "all"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grievances.map((g) => <GrievanceCard key={g.id} grv={g} employees={employees} onUpdate={onUpdate} />)}
          </div>
        )
      }
    </div>
  );
}
