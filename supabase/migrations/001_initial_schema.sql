-- ============================================================
-- PEOPLE OPERATIONS PLATFORM — Phase 1: Database Schema
-- Supabase (PostgreSQL) · Mauritius SME
-- Blueprint v3 compliant · All 7 tables + RLS + triggers
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. EXTENSIONS & ENUMS
-- ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles (maps to Supabase Auth)
CREATE TYPE user_role AS ENUM ('employee', 'manager', 'md', 'acting_md');

-- Employment types
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract');

-- Employee status
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'on_notice');

-- Request types
CREATE TYPE request_type AS ENUM ('leave', 'document', 'reimbursement', 'bank_change', 'general');

-- Request status
CREATE TYPE request_status AS ENUM ('draft', 'submitted', 'pending', 'approved', 'rejected', 'completed');

-- Approval actions
CREATE TYPE approval_action AS ENUM ('submitted', 'approved', 'rejected', 'escalated', 'returned');

-- Grievance categories
CREATE TYPE grievance_category AS ENUM ('harassment', 'discrimination', 'salary', 'workload', 'manager_conduct', 'other');

-- Grievance status
CREATE TYPE grievance_status AS ENUM ('open', 'under_review', 'resolved', 'closed');

-- Disciplinary issue types
CREATE TYPE disciplinary_issue_type AS ENUM ('misconduct', 'absence', 'performance', 'policy_breach', 'other');

-- Disciplinary outcomes
CREATE TYPE disciplinary_outcome AS ENUM ('warning', 'final_warning', 'suspension', 'termination', 'no_action');

-- Disciplinary case status
CREATE TYPE disciplinary_status AS ENUM ('open', 'closed');

-- Acting MD status
CREATE TYPE acting_md_status AS ENUM ('active', 'expired');

-- Suggestion status
CREATE TYPE suggestion_status AS ENUM ('submitted', 'under_review', 'implemented', 'in_progress', 'noted', 'declined');

-- AI confidence levels
CREATE TYPE ai_confidence AS ENUM ('based_on_policy', 'confirm_with_manager', 'speak_to_md');


-- ════════════════════════════════════════════════════════════
-- TABLE 1: EMPLOYEES
-- ════════════════════════════════════════════════════════════

CREATE TABLE employees (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    department      TEXT NOT NULL,
    reports_to      UUID REFERENCES employees(id) ON DELETE SET NULL,
    date_joined     DATE NOT NULL DEFAULT CURRENT_DATE,
    employment_type employment_type NOT NULL DEFAULT 'full_time',
    status          employee_status NOT NULL DEFAULT 'active',
    nid             TEXT,                          -- Mauritius National ID
    role            user_role NOT NULL DEFAULT 'employee',
    phone           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_auth_user    ON employees(auth_user_id);
CREATE INDEX idx_employees_department   ON employees(department);
CREATE INDEX idx_employees_reports_to   ON employees(reports_to);
CREATE INDEX idx_employees_status       ON employees(status);
CREATE INDEX idx_employees_role         ON employees(role);

COMMENT ON TABLE employees IS 'Employee master — single source of truth for all personnel data';
COMMENT ON COLUMN employees.reports_to IS 'Line manager — auto-routes approvals to this person';
COMMENT ON COLUMN employees.nid IS 'Mauritius National ID or Passport number';


-- ════════════════════════════════════════════════════════════
-- TABLE 2: REQUESTS
-- ════════════════════════════════════════════════════════════

-- Sequence for auto-incrementing request ref numbers per year
CREATE SEQUENCE request_ref_seq START 1;

CREATE TABLE requests (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_id            TEXT UNIQUE NOT NULL,         -- REF-YYYY-001 format
    employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type              request_type NOT NULL,
    status            request_status NOT NULL DEFAULT 'draft',
    manager_id        UUID REFERENCES employees(id) ON DELETE SET NULL,
    description       TEXT,
    submitted_at      TIMESTAMPTZ,
    decided_at        TIMESTAMPTZ,
    rejection_reason  TEXT,                         -- MANDATORY on rejection
    attachment_url    TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Blueprint rule: rejection reason is mandatory when rejected
    CONSTRAINT chk_rejection_reason CHECK (
        (status != 'rejected') OR (rejection_reason IS NOT NULL AND rejection_reason != '')
    )
);

CREATE INDEX idx_requests_employee   ON requests(employee_id);
CREATE INDEX idx_requests_manager    ON requests(manager_id);
CREATE INDEX idx_requests_status     ON requests(status);
CREATE INDEX idx_requests_type       ON requests(type);
CREATE INDEX idx_requests_submitted  ON requests(submitted_at);

COMMENT ON TABLE requests IS 'All employee requests — leave, document, reimbursement, bank change, general';
COMMENT ON COLUMN requests.ref_id IS 'Human-readable reference: REF-YYYY-NNN';
COMMENT ON COLUMN requests.rejection_reason IS 'MANDATORY on rejection — system blocks submission without it';


-- ════════════════════════════════════════════════════════════
-- TABLE 3: APPROVAL LOGS
-- ════════════════════════════════════════════════════════════

CREATE TABLE approval_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    action      approval_action NOT NULL,
    actor_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reason      TEXT,
    metadata    JSONB DEFAULT '{}',               -- extra context (decision guide ref, etc.)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_logs_request  ON approval_logs(request_id);
CREATE INDEX idx_approval_logs_actor    ON approval_logs(actor_id);
CREATE INDEX idx_approval_logs_action   ON approval_logs(action);

COMMENT ON TABLE approval_logs IS 'Audit trail — every approval action is logged here (compliance requirement)';


-- ════════════════════════════════════════════════════════════
-- TABLE 4: GRIEVANCES
-- ════════════════════════════════════════════════════════════

CREATE SEQUENCE grievance_ref_seq START 1;

CREATE TABLE grievances (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_id        TEXT UNIQUE NOT NULL,            -- GRV-YYYY-001 format
    employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    category      grievance_category NOT NULL,
    description   TEXT NOT NULL,
    status        grievance_status NOT NULL DEFAULT 'open',
    assigned_to   UUID NOT NULL REFERENCES employees(id),  -- Always MD
    handled_by    UUID REFERENCES employees(id),   -- ★ v3: MD can delegate investigation
    resolution    TEXT,                            -- Required before closure
    closed_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Resolution required before closing
    CONSTRAINT chk_grievance_resolution CHECK (
        (status != 'closed') OR (resolution IS NOT NULL AND resolution != '')
    )
);

CREATE INDEX idx_grievances_employee    ON grievances(employee_id);
CREATE INDEX idx_grievances_assigned    ON grievances(assigned_to);
CREATE INDEX idx_grievances_handled_by  ON grievances(handled_by);
CREATE INDEX idx_grievances_status      ON grievances(status);

COMMENT ON TABLE grievances IS 'Grievance cases — bypasses AI, auto-assigned to MD. v3: handled_by allows delegated investigation';
COMMENT ON COLUMN grievances.assigned_to IS 'Always the MD (or Acting MD) — cannot be a regular manager';
COMMENT ON COLUMN grievances.handled_by IS '★ v3 FIX 01: MD can delegate investigation but final decision stays with MD';


-- ════════════════════════════════════════════════════════════
-- TABLE 5: DISCIPLINARY CASES
-- ════════════════════════════════════════════════════════════

CREATE SEQUENCE disciplinary_ref_seq START 1;

CREATE TABLE disciplinary_cases (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_id        TEXT UNIQUE NOT NULL,            -- DISC-YYYY-001 format
    employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reported_by   UUID NOT NULL REFERENCES employees(id),  -- Manager who initiates
    issue_type    disciplinary_issue_type NOT NULL,
    description   TEXT NOT NULL,
    handled_by    UUID REFERENCES employees(id),   -- ★ v3: MD can delegate investigation
    hearing_date  DATE,
    outcome       disciplinary_outcome,
    status        disciplinary_status NOT NULL DEFAULT 'open',
    closed_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Outcome required before closing
    CONSTRAINT chk_disciplinary_outcome CHECK (
        (status != 'closed') OR (outcome IS NOT NULL)
    )
);

CREATE INDEX idx_disciplinary_employee    ON disciplinary_cases(employee_id);
CREATE INDEX idx_disciplinary_reported_by ON disciplinary_cases(reported_by);
CREATE INDEX idx_disciplinary_handled_by  ON disciplinary_cases(handled_by);
CREATE INDEX idx_disciplinary_status      ON disciplinary_cases(status);

COMMENT ON TABLE disciplinary_cases IS 'Disciplinary process — Manager initiates, MD owns closure. v3: handled_by for delegated investigation';
COMMENT ON COLUMN disciplinary_cases.reported_by IS 'Line manager who created the case';
COMMENT ON COLUMN disciplinary_cases.handled_by IS '★ v3 FIX 01: MD can delegate investigation only — final decision stays MD';


-- ════════════════════════════════════════════════════════════
-- TABLE 6: ACTING MD
-- ════════════════════════════════════════════════════════════

CREATE TABLE acting_md (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assigned_to   UUID NOT NULL REFERENCES employees(id),  -- The person becoming Acting MD
    assigned_by   UUID NOT NULL REFERENCES employees(id),  -- Must be current MD
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    status        acting_md_status NOT NULL DEFAULT 'active',
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- End date must be after start date
    CONSTRAINT chk_acting_md_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_acting_md_assigned_to ON acting_md(assigned_to);
CREATE INDEX idx_acting_md_status      ON acting_md(status);
CREATE INDEX idx_acting_md_dates       ON acting_md(start_date, end_date);

COMMENT ON TABLE acting_md IS '★ v3 FIX 04: Acting MD role — time-limited, auto-expires, same permissions as MD during active period';
COMMENT ON COLUMN acting_md.assigned_to IS 'Senior manager who temporarily assumes MD permissions';
COMMENT ON COLUMN acting_md.end_date IS 'Role auto-expires on this date — cannot self-extend';


-- ════════════════════════════════════════════════════════════
-- TABLE 7: SUGGESTIONS
-- ════════════════════════════════════════════════════════════

CREATE TABLE suggestions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    status        suggestion_status NOT NULL DEFAULT 'submitted',
    md_notes      TEXT,                            -- MD's review notes
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestions_employee  ON suggestions(employee_id);
CREATE INDEX idx_suggestions_status    ON suggestions(status);
CREATE INDEX idx_suggestions_submitted ON suggestions(submitted_at);

COMMENT ON TABLE suggestions IS '★ v3 FIX 05: Employee suggestions — MD reviews monthly, sends Top 3 update';


-- ────────────────────────────────────────────────────────────
-- HELPER: updated_at trigger
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_employees_updated_at       BEFORE UPDATE ON employees          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_requests_updated_at        BEFORE UPDATE ON requests           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_grievances_updated_at      BEFORE UPDATE ON grievances         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_disciplinary_updated_at    BEFORE UPDATE ON disciplinary_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_acting_md_updated_at       BEFORE UPDATE ON acting_md          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suggestions_updated_at     BEFORE UPDATE ON suggestions        FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ────────────────────────────────────────────────────────────
-- HELPER: Auto-generate ref_ids
-- ────────────────────────────────────────────────────────────

-- Requests: REF-YYYY-001
CREATE OR REPLACE FUNCTION generate_request_ref_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
    current_year TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(ref_id FROM '\d+$') AS INTEGER)
    ), 0) + 1 INTO next_num
    FROM requests
    WHERE ref_id LIKE 'REF-' || current_year || '-%';

    NEW.ref_id := 'REF-' || current_year || '-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_request_ref_id
    BEFORE INSERT ON requests
    FOR EACH ROW
    WHEN (NEW.ref_id IS NULL OR NEW.ref_id = '')
    EXECUTE FUNCTION generate_request_ref_id();

-- Grievances: GRV-YYYY-001
CREATE OR REPLACE FUNCTION generate_grievance_ref_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
    current_year TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(ref_id FROM '\d+$') AS INTEGER)
    ), 0) + 1 INTO next_num
    FROM grievances
    WHERE ref_id LIKE 'GRV-' || current_year || '-%';

    NEW.ref_id := 'GRV-' || current_year || '-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grievance_ref_id
    BEFORE INSERT ON grievances
    FOR EACH ROW
    WHEN (NEW.ref_id IS NULL OR NEW.ref_id = '')
    EXECUTE FUNCTION generate_grievance_ref_id();

-- Disciplinary: DISC-YYYY-001
CREATE OR REPLACE FUNCTION generate_disciplinary_ref_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
    current_year TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(ref_id FROM '\d+$') AS INTEGER)
    ), 0) + 1 INTO next_num
    FROM disciplinary_cases
    WHERE ref_id LIKE 'DISC-' || current_year || '-%';

    NEW.ref_id := 'DISC-' || current_year || '-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_disciplinary_ref_id
    BEFORE INSERT ON disciplinary_cases
    FOR EACH ROW
    WHEN (NEW.ref_id IS NULL OR NEW.ref_id = '')
    EXECUTE FUNCTION generate_disciplinary_ref_id();


-- ────────────────────────────────────────────────────────────
-- HELPER: Auto-set submitted_at on requests
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_request_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
        NEW.submitted_at = NOW();
    END IF;
    IF NEW.status IN ('approved', 'rejected') AND OLD.status NOT IN ('approved', 'rejected') THEN
        NEW.decided_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_request_timestamps
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION set_request_submitted_at();


-- ────────────────────────────────────────────────────────────
-- HELPER: Auto-expire Acting MD
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION expire_acting_md()
RETURNS void AS $$
BEGIN
    UPDATE acting_md
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
      AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Call this via Supabase cron (pg_cron) or Edge Function daily
-- SELECT cron.schedule('expire-acting-md', '0 0 * * *', 'SELECT expire_acting_md()');


-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE employees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE acting_md          ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions        ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- HELPER: Get current employee from auth
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS UUID AS $$
    SELECT id FROM employees WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_employee_role()
RETURNS user_role AS $$
    SELECT role FROM employees WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is active Acting MD
CREATE OR REPLACE FUNCTION is_acting_md()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM acting_md
        WHERE assigned_to = get_current_employee_id()
          AND status = 'active'
          AND CURRENT_DATE BETWEEN start_date AND end_date
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user has MD-level access (MD or active Acting MD)
CREATE OR REPLACE FUNCTION has_md_access()
RETURNS BOOLEAN AS $$
    SELECT get_current_employee_role() = 'md' OR is_acting_md();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ────────────────────────────────────────────────────────────
-- RLS POLICIES: EMPLOYEES
-- Employee sees own row. Manager sees team. MD sees all.
-- ────────────────────────────────────────────────────────────

CREATE POLICY employees_select_own ON employees
    FOR SELECT USING (
        auth_user_id = auth.uid()                                        -- Own record
        OR has_md_access()                                               -- MD/Acting MD sees all
        OR id IN (                                                       -- Manager sees direct reports
            SELECT id FROM employees WHERE reports_to = get_current_employee_id()
        )
    );

CREATE POLICY employees_update_own ON employees
    FOR UPDATE USING (
        auth_user_id = auth.uid()                                        -- Own profile
        OR has_md_access()                                               -- MD can edit any
    );

CREATE POLICY employees_insert_md ON employees
    FOR INSERT WITH CHECK (
        has_md_access()                                                  -- Only MD can create employees
    );


-- ────────────────────────────────────────────────────────────
-- RLS POLICIES: REQUESTS
-- Employee sees own. Manager sees team. MD sees all.
-- ────────────────────────────────────────────────────────────

CREATE POLICY requests_select ON requests
    FOR SELECT USING (
        employee_id = get_current_employee_id()                          -- Own requests
        OR manager_id = get_current_employee_id()                        -- Assigned to me as manager
        OR has_md_access()                                               -- MD sees all
    );

CREATE POLICY requests_insert ON requests
    FOR INSERT WITH CHECK (
        employee_id = get_current_employee_id()                          -- Can only submit own requests
    );

CREATE POLICY requests_update ON requests
    FOR UPDATE USING (
        employee_id = get_current_employee_id()                          -- Own draft edits
        OR manager_id = get_current_employee_id()                        -- Manager approval/rejection
        OR has_md_access()                                               -- MD override
    );


-- ────────────────────────────────────────────────────────────
-- RLS POLICIES: APPROVAL LOGS
-- Visible to request owner, assigned manager, and MD.
-- ────────────────────────────────────────────────────────────

CREATE POLICY approval_logs_select ON approval_logs
    FOR SELECT USING (
        actor_id = get_current_employee_id()                             -- Own actions
        OR has_md_access()                                               -- MD sees all
        OR request_id IN (                                               -- Request owner sees logs
            SELECT id FROM requests WHERE employee_id = get_current_employee_id()
        )
        OR request_id IN (                                               -- Manager sees their decisions
            SELECT id FROM requests WHERE manager_id = get_current_employee_id()
        )
    );

CREATE POLICY approval_logs_insert ON approval_logs
    FOR INSERT WITH CHECK (
        actor_id = get_current_employee_id()                             -- Can only log own actions
    );


-- ────────────────────────────────────────────────────────────
-- RLS POLICIES: GRIEVANCES
-- Employee sees own. MD sees all. Managers see NOTHING.
-- ────────────────────────────────────────────────────────────

CREATE POLICY grievances_select ON grievances
    FOR SELECT USING (
        employee_id = get_current_employee_id()                          -- Own grievances
        OR has_md_access()                                               -- MD/Acting MD sees all
        OR handled_by = get_current_employee_id()                        -- Delegated investigator
    );

CREATE POLICY grievances_insert ON grievances
    FOR INSERT WITH CHECK (
        employee_id = get_current_employee_id()                          -- Submit own grievance
    );

CREATE POLICY grievances_update ON grievances
    FOR UPDATE USING (
        has_md_access()                                                  -- Only MD can update grievances
    );


-- ────────────────────────────────────────────────────────────
-- RLS POLICIES: DISCIPLINARY CASES
-- Reporter (manager) sees cases they created. MD sees all.
-- ────────────────────────────────────────────────────────────

CREATE POLICY disciplinary_select ON disciplinary_cases
    FOR SELECT USING (
        reported_by = get_current_employee_id()                          -- Manager who initiated
        OR employee_id = get_current_employee_id()                       -- Employee being disciplined
        OR has_md_access()                                               -- MD sees all
        OR handled_by = get_current_employee_id()                        -- Delegated investigator
    );

CREATE POLICY disciplinary_insert ON disciplinary_cases
    FOR INSERT WITH CHECK (
        get_current_employee_role() IN ('manager', 'md')                 -- Manager initiates, MD can too
        OR is_acting_md()
    );

CREATE POLICY disciplinary_update ON disciplinary_cases
    FOR UPDATE USING (
        has_md_access()                                                  -- Only MD closes/updates
    );


-- ────────────────────────────────────────────────────────────
-- RLS POLICIES: ACTING MD
-- Only MD can manage. Acting MD can see own assignment.
-- ────────────────────────────────────────────────────────────

CREATE POLICY acting_md_select ON acting_md
    FOR SELECT USING (
        assigned_to = get_current_employee_id()                          -- See own assignment
        OR assigned_by = get_current_employee_id()                       -- MD who assigned
        OR has_md_access()                                               -- MD sees all
    );

CREATE POLICY acting_md_insert ON acting_md
    FOR INSERT WITH CHECK (
        get_current_employee_role() = 'md'                               -- Only real MD can assign (not Acting)
    );

CREATE POLICY acting_md_update ON acting_md
    FOR UPDATE USING (
        get_current_employee_role() = 'md'                               -- Only real MD can modify
    );


-- ────────────────────────────────────────────────────────────
-- RLS POLICIES: SUGGESTIONS
-- Employee sees own. MD sees all for monthly review.
-- ────────────────────────────────────────────────────────────

CREATE POLICY suggestions_select ON suggestions
    FOR SELECT USING (
        employee_id = get_current_employee_id()                          -- Own suggestions
        OR has_md_access()                                               -- MD monthly review
    );

CREATE POLICY suggestions_insert ON suggestions
    FOR INSERT WITH CHECK (
        employee_id = get_current_employee_id()                          -- Submit own suggestions
    );

CREATE POLICY suggestions_update ON suggestions
    FOR UPDATE USING (
        has_md_access()                                                  -- Only MD updates status
    );


-- ════════════════════════════════════════════════════════════
-- SEED: Department list (Mauritius SME typical)
-- ════════════════════════════════════════════════════════════

-- You can customize these for your specific company:
-- INSERT INTO employees (name, email, department, role, ...) VALUES (...);

-- ════════════════════════════════════════════════════════════
-- DONE — Phase 1 Complete
-- ════════════════════════════════════════════════════════════
-- Tables created:     7  (employees, requests, approval_logs,
--                         grievances, disciplinary_cases, acting_md, suggestions)
-- RLS enabled:        All 7 tables
-- Triggers:           ref_id auto-generation, updated_at, request timestamps
-- Constraints:        rejection_reason mandatory, resolution before closure,
--                     outcome before closing disciplinary, date validation
-- Helper functions:   get_current_employee_id(), get_current_employee_role(),
--                     is_acting_md(), has_md_access(), expire_acting_md()
