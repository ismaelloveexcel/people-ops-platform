import { useEffect, useState } from "react";
import { getMyProfile } from "../../api";
import { User } from "lucide-react";

const STATUS_BADGE = { active: "badge-green", inactive: "badge-red", on_notice: "badge-amber" };
const ROLE_LABEL   = { employee: "Employee", manager: "Manager", md: "Managing Director", acting_md: "Acting MD" };
const TYPE_LABEL   = { full_time: "Full-time", part_time: "Part-time", contract: "Contract" };

function Field({ label, value }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="text-sm text-brand-ink font-medium">{value || "—"}</p>
    </div>
  );
}

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProfile().then(setProfile).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-brand-muted text-sm">Loading…</p>;
  if (!profile) return <p className="text-brand-red text-sm">Could not load profile.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <User size={22} className="text-brand-green" /> My Profile
        </h1>
        <p className="text-sm text-brand-muted mt-1">Your employment information</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-brand-border">
          <div className="w-14 h-14 rounded-full bg-brand-green flex items-center justify-center text-white text-xl font-bold">
            {profile.name?.[0]}
          </div>
          <div>
            <p className="text-lg font-bold text-brand-ink">{profile.name}</p>
            <p className="text-sm text-brand-muted">{profile.email}</p>
            <span className={`badge mt-1 ${STATUS_BADGE[profile.status] || "badge-gray"}`}>
              {profile.status?.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Field label="Department"       value={profile.department} />
          <Field label="Employment Type"  value={TYPE_LABEL[profile.employment_type]} />
          <Field label="Date Joined"      value={profile.date_joined} />
          <Field label="Role"             value={ROLE_LABEL[profile.role]} />
          <Field label="Phone"            value={profile.phone} />
          <Field label="NID / Passport"   value={profile.nid ? "•••• on file" : "Not provided"} />
        </div>
      </div>

      <p className="text-xs text-brand-muted">
        To update your personal details, please submit a request through the portal or follow your company's internal process.
      </p>
    </div>
  );
}
