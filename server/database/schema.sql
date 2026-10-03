-- ============================================================
-- INCIDENT MANAGEMENT SYSTEM
-- PostgreSQL Database Schema
-- ============================================================

-- ============================================================
-- 1. ROLES
-- ============================================================

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. SITES
-- ============================================================

CREATE TABLE sites (
    id BIGSERIAL PRIMARY KEY,

    site_code VARCHAR(50) NOT NULL UNIQUE,
    site_name VARCHAR(150) NOT NULL,

    site_lead VARCHAR(150),

    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    pin_code VARCHAR(20),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. DEPARTMENTS
-- Department belongs to a SITE
-- ============================================================

CREATE TABLE departments (
    id BIGSERIAL PRIMARY KEY,

    site_id BIGINT NOT NULL,

    department_code VARCHAR(50) NOT NULL,
    department_name VARCHAR(150) NOT NULL,

    department_head_name VARCHAR(150),

    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_departments_site
        FOREIGN KEY (site_id)
        REFERENCES sites(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_department_site_code
        UNIQUE (site_id, department_code),

    CONSTRAINT uq_department_site_name
        UNIQUE (site_id, department_name)
);


-- ============================================================
-- 4. SUB DEPARTMENTS
-- Sub Department belongs to a Department
-- ============================================================

CREATE TABLE sub_departments (
    id BIGSERIAL PRIMARY KEY,

    department_id BIGINT NOT NULL,

    sub_department_code VARCHAR(50) NOT NULL,
    sub_department_name VARCHAR(150) NOT NULL,

    head_name VARCHAR(150),

    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sub_departments_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_sub_department_code
        UNIQUE (department_id, sub_department_code),

    CONSTRAINT uq_sub_department_name
        UNIQUE (department_id, sub_department_name)
);


-- ============================================================
-- 5. USERS
-- ============================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,

    user_id VARCHAR(50) NOT NULL UNIQUE,

    employee_code VARCHAR(50),

    full_name VARCHAR(150) NOT NULL,

    email VARCHAR(255) UNIQUE,
    mobile VARCHAR(20),

    password_hash TEXT,

    role_id BIGINT NOT NULL,

    site_id BIGINT,
    department_id BIGINT,
    sub_department_id BIGINT,

    designation VARCHAR(150),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),

    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_users_site
        FOREIGN KEY (site_id)
        REFERENCES sites(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_users_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_users_sub_department
        FOREIGN KEY (sub_department_id)
        REFERENCES sub_departments(id)
        ON DELETE RESTRICT
);
-- ============================================================
-- 6. INCIDENTS
-- ============================================================

CREATE TABLE incidents (
    id BIGSERIAL PRIMARY KEY,

    incident_no VARCHAR(50) NOT NULL UNIQUE,

    site_id BIGINT NOT NULL,

    -- SOURCE
    from_site_id BIGINT NOT NULL,
    from_department_id BIGINT NOT NULL,
    from_sub_department_id BIGINT,
    reported_by BIGINT NOT NULL,

    -- DESTINATION
    to_site_id BIGINT NOT NULL,
    to_department_id BIGINT NOT NULL,
    to_sub_department_id BIGINT,
    assigned_to BIGINT,

    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (
            priority IN (
                'LOW',
                'MEDIUM',
                'HIGH',
                'CRITICAL'
            )
        ),

    status VARCHAR(30) NOT NULL DEFAULT 'REPORTED'
        CHECK (
            status IN (
                'REPORTED',
                'ASSIGNED',
                'WORKING',
                'DONE_FROM_MY_SIDE',
                'REVIEW',
                'REOPENED',
                'FINISHED',
                'CANCELLED'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    closed_at TIMESTAMPTZ,

    -- AUTOMATIC ASSIGNMENT
    assignment_deadline_at TIMESTAMP,
    auto_assigned_at TIMESTAMP,

    CONSTRAINT fk_incidents_site
        FOREIGN KEY (site_id)
        REFERENCES sites(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidents_from_site
        FOREIGN KEY (from_site_id)
        REFERENCES sites(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidents_from_department
        FOREIGN KEY (from_department_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidents_from_sub_department
        FOREIGN KEY (from_sub_department_id)
        REFERENCES sub_departments(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidents_reported_by
        FOREIGN KEY (reported_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidents_to_site
        FOREIGN KEY (to_site_id)
        REFERENCES sites(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidents_to_department
        FOREIGN KEY (to_department_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidents_to_sub_department
        FOREIGN KEY (to_sub_department_id)
        REFERENCES sub_departments(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_incidents_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON DELETE RESTRICT
);
CREATE INDEX idx_incidents_from_site
    ON incidents (from_site_id);

CREATE INDEX idx_incidents_to_site
    ON incidents (to_site_id);

CREATE INDEX idx_incidents_assignment_deadline
    ON incidents (assignment_deadline_at)
    WHERE assigned_to IS NULL;
-- ============================================================
-- 7. INCIDENT ATTACHMENTS
-- ============================================================

CREATE TABLE incident_attachments (
    id BIGSERIAL PRIMARY KEY,

    incident_id BIGINT NOT NULL,

    file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,

    file_path TEXT NOT NULL,

    mime_type VARCHAR(100),
    file_size BIGINT,

    uploaded_by BIGINT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_attachment_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attachment_user
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
);
-- ============================================================
-- 8. INCIDENT ASSIGNMENTS
-- ============================================================

CREATE TABLE incident_assignments (
    id BIGSERIAL PRIMARY KEY,

    incident_id BIGINT NOT NULL,

    assigned_to BIGINT,
    assigned_department_id BIGINT,
    assigned_sub_department_id BIGINT,

    assigned_by BIGINT NOT NULL,

    remarks TEXT,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    unassigned_at TIMESTAMPTZ,

    CONSTRAINT fk_assignment_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_user
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assignment_department
        FOREIGN KEY (assigned_department_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assignment_sub_department
        FOREIGN KEY (assigned_sub_department_id)
        REFERENCES sub_departments(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assignment_by
        FOREIGN KEY (assigned_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
);
-- ============================================================
-- 9. INCIDENT UPDATES
-- ============================================================

CREATE TABLE incident_updates (
    id BIGSERIAL PRIMARY KEY,

    incident_id BIGINT NOT NULL,

    user_id BIGINT NOT NULL,

    update_text TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_update_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_update_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);
-- ============================================================
-- 10. INCIDENT RESOLUTION CYCLES
-- ============================================================

CREATE TABLE incident_resolution_cycles (
    id BIGSERIAL PRIMARY KEY,

    incident_id BIGINT NOT NULL,

    cycle_number INTEGER NOT NULL,

    started_at TIMESTAMPTZ,

    done_at TIMESTAMPTZ,

    resolution_details TEXT,

    work_performed TEXT,

    resolved_by BIGINT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_cycle_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cycle_resolved_by
        FOREIGN KEY (resolved_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_incident_cycle
        UNIQUE (incident_id, cycle_number)
);
-- ============================================================
-- 11. INCIDENT REVIEWS
-- ============================================================

CREATE TABLE incident_reviews (
    id BIGSERIAL PRIMARY KEY,

    incident_id BIGINT NOT NULL,

    resolution_cycle_id BIGINT,

    reviewed_by BIGINT NOT NULL,

    review_result VARCHAR(20) NOT NULL
        CHECK (
            review_result IN (
                'APPROVED',
                'REOPENED'
            )
        ),

    remarks TEXT,

    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_review_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_cycle
        FOREIGN KEY (resolution_cycle_id)
        REFERENCES incident_resolution_cycles(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_review_user
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
);
-- ============================================================
-- 12. INCIDENT STATUS HISTORY
-- ============================================================

CREATE TABLE incident_status_history (
    id BIGSERIAL PRIMARY KEY,

    incident_id BIGINT NOT NULL,

    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,

    changed_by BIGINT,

    remarks TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_status_history_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_status_history_user
        FOREIGN KEY (changed_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
);
-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    incident_id BIGINT,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    notification_type VARCHAR(50),

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    read_at TIMESTAMPTZ,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE
);
-- ============================================================
-- 14. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(100),
    entity_id BIGINT,

    old_data JSONB,
    new_data JSONB,

    ip_address INET,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);
-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_departments_site
    ON departments(site_id);

CREATE INDEX idx_sub_departments_department
    ON sub_departments(department_id);

CREATE INDEX idx_users_site
    ON users(site_id);

CREATE INDEX idx_users_department
    ON users(department_id);

CREATE INDEX idx_users_sub_department
    ON users(sub_department_id);

CREATE INDEX idx_incidents_site
    ON incidents(site_id);

CREATE INDEX idx_incidents_from_department
    ON incidents(from_department_id);

CREATE INDEX idx_incidents_to_department
    ON incidents(to_department_id);

CREATE INDEX idx_incidents_reported_by
    ON incidents(reported_by);

CREATE INDEX idx_incidents_assigned_to
    ON incidents(assigned_to);

CREATE INDEX idx_incidents_status
    ON incidents(status);

CREATE INDEX idx_incidents_created_at
    ON incidents(created_at);

CREATE INDEX idx_incident_updates_incident
    ON incident_updates(incident_id);

CREATE INDEX idx_status_history_incident
    ON incident_status_history(incident_id);

CREATE INDEX idx_notifications_user
    ON notifications(user_id);

CREATE INDEX idx_notifications_unread
    ON notifications(user_id, is_read);
-- ============================================================
-- DEFAULT ROLES
-- ============================================================

INSERT INTO roles
    (role_code, role_name, description)
VALUES
    (
        'SUPER_ADMIN',
        'Super Admin',
        'Full access to the entire Incident Management System'
    ),
    (
        'DEPARTMENT_ADMIN',
        'Department Admin',
        'Manages users and incidents within the assigned department'
    ),
    (
        'USER',
        'Normal User',
        'Creates and handles incidents according to permissions'
    );
-- ============================================================
-- SITE-WISE HIERARCHY INTEGRITY
-- ============================================================

-- ------------------------------------------------------------
-- Ensure a sub-department belongs to the same department
-- hierarchy that is referenced by a user.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_user_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    dept_site_id BIGINT;
    sub_dept_department_id BIGINT;
BEGIN

    -- Validate department -> site
    IF NEW.department_id IS NOT NULL AND NEW.site_id IS NOT NULL THEN

        SELECT site_id
        INTO dept_site_id
        FROM departments
        WHERE id = NEW.department_id;

        IF dept_site_id IS NULL THEN
            RAISE EXCEPTION
                'Department % does not exist',
                NEW.department_id;
        END IF;

        IF dept_site_id <> NEW.site_id THEN
            RAISE EXCEPTION
                'User department does not belong to the selected site';
        END IF;

    END IF;


    -- Validate sub-department -> department
    IF NEW.sub_department_id IS NOT NULL
       AND NEW.department_id IS NOT NULL THEN

        SELECT department_id
        INTO sub_dept_department_id
        FROM sub_departments
        WHERE id = NEW.sub_department_id;

        IF sub_dept_department_id IS NULL THEN
            RAISE EXCEPTION
                'Sub-department % does not exist',
                NEW.sub_department_id;
        END IF;

        IF sub_dept_department_id <> NEW.department_id THEN
            RAISE EXCEPTION
                'User sub-department does not belong to the selected department';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_validate_user_hierarchy
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION validate_user_hierarchy();
-- ============================================================
-- INCIDENT HIERARCHY INTEGRITY
-- ============================================================

CREATE OR REPLACE FUNCTION validate_incident_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    from_dept_site_id BIGINT;
    to_dept_site_id BIGINT;
    from_sub_dept_department_id BIGINT;
    to_sub_dept_department_id BIGINT;
    reporter_site_id BIGINT;
BEGIN

    -- --------------------------------------------------------
    -- FROM DEPARTMENT must belong to incident SITE
    -- --------------------------------------------------------

    SELECT site_id
    INTO from_dept_site_id
    FROM departments
    WHERE id = NEW.from_department_id;

    IF from_dept_site_id IS NULL THEN
        RAISE EXCEPTION
            'Source department % does not exist',
            NEW.from_department_id;
    END IF;

    IF from_dept_site_id <> NEW.site_id THEN
        RAISE EXCEPTION
            'Source department does not belong to incident site';
    END IF;


    -- --------------------------------------------------------
    -- TO DEPARTMENT must belong to incident SITE
    -- --------------------------------------------------------

    SELECT site_id
    INTO to_dept_site_id
    FROM departments
    WHERE id = NEW.to_department_id;

    IF to_dept_site_id IS NULL THEN
        RAISE EXCEPTION
            'Destination department % does not exist',
            NEW.to_department_id;
    END IF;

    IF to_dept_site_id <> NEW.site_id THEN
        RAISE EXCEPTION
            'Destination department does not belong to incident site';
    END IF;


    -- --------------------------------------------------------
    -- FROM SUB DEPARTMENT must belong to FROM DEPARTMENT
    -- --------------------------------------------------------

    IF NEW.from_sub_department_id IS NOT NULL THEN

        SELECT department_id
        INTO from_sub_dept_department_id
        FROM sub_departments
        WHERE id = NEW.from_sub_department_id;

        IF from_sub_dept_department_id IS NULL THEN
            RAISE EXCEPTION
                'Source sub-department % does not exist',
                NEW.from_sub_department_id;
        END IF;

        IF from_sub_dept_department_id <> NEW.from_department_id THEN
            RAISE EXCEPTION
                'Source sub-department does not belong to source department';
        END IF;

    END IF;


    -- --------------------------------------------------------
    -- TO SUB DEPARTMENT must belong to TO DEPARTMENT
    -- --------------------------------------------------------

    IF NEW.to_sub_department_id IS NOT NULL THEN

        SELECT department_id
        INTO to_sub_dept_department_id
        FROM sub_departments
        WHERE id = NEW.to_sub_department_id;

        IF to_sub_dept_department_id IS NULL THEN
            RAISE EXCEPTION
                'Destination sub-department % does not exist',
                NEW.to_sub_department_id;
        END IF;

        IF to_sub_dept_department_id <> NEW.to_department_id THEN
            RAISE EXCEPTION
                'Destination sub-department does not belong to destination department';
        END IF;

    END IF;


    -- --------------------------------------------------------
    -- REPORTER must belong to incident SITE
    -- --------------------------------------------------------

    SELECT site_id
    INTO reporter_site_id
    FROM users
    WHERE id = NEW.reported_by;

    IF reporter_site_id IS NOT NULL
       AND reporter_site_id <> NEW.site_id THEN

        RAISE EXCEPTION
            'Reporter does not belong to incident site';

    END IF;


    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_validate_incident_hierarchy
BEFORE INSERT OR UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION validate_incident_hierarchy();

-- --------------------------------------------------------
-- PUSH SUBSCRIPTIONS
-- --------------------------------------------------------

CREATE TABLE push_subscriptions (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    endpoint TEXT NOT NULL UNIQUE,

    p256dh TEXT NOT NULL,

    auth TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_push_subscriptions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_push_subscriptions_user
    ON push_subscriptions(user_id);

