-- ============================================
-- AI Prototype Delivery Tool - Database Schema
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Users
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    avatar_url      VARCHAR(500),
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at   TIMESTAMP WITH TIME ZONE,
    is_active       BOOLEAN DEFAULT TRUE,
    provider        VARCHAR(50) DEFAULT 'email',
    provider_id     VARCHAR(255),
    UNIQUE(provider, provider_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);

-- ============================================
-- Organizations
-- ============================================
CREATE TABLE organizations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL,
    slug         VARCHAR(50) UNIQUE NOT NULL,
    plan         VARCHAR(20) DEFAULT 'free',
    logo_url     VARCHAR(500),
    owner_id     UUID NOT NULL REFERENCES users(id),
    settings     JSONB DEFAULT '{}',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orgs_slug ON organizations(slug);
CREATE INDEX idx_orgs_owner ON organizations(owner_id);

-- ============================================
-- Projects
-- ============================================
CREATE TABLE projects (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(200) NOT NULL,
    description          TEXT,
    org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id             UUID NOT NULL REFERENCES users(id),
    current_iteration_id UUID,
    is_public            BOOLEAN DEFAULT FALSE,
    thumbnail_url        VARCHAR(500),
    settings             JSONB DEFAULT '{
        "default_device": "desktop",
        "grid_visible": true,
        "snap_to_grid": true
    }',
    metadata             JSONB DEFAULT '{}',
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at           TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);

-- ============================================
-- Project Members
-- ============================================
CREATE TABLE project_members (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(20) NOT NULL DEFAULT 'editor',
    invite_email VARCHAR(255),
    invited_by   UUID REFERENCES users(id),
    joined_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_pm_project ON project_members(project_id);
CREATE INDEX idx_pm_user ON project_members(user_id);

-- ============================================
-- Iterations
-- ============================================
CREATE TABLE iterations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    version         VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'editing',
    description     TEXT,
    based_on_id     UUID REFERENCES iterations(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    snapshot_url    VARCHAR(500),
    is_current      BOOLEAN DEFAULT FALSE,
    review_deadline TIMESTAMP WITH TIME ZONE,
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_project_version UNIQUE(project_id, version)
);

CREATE INDEX idx_iter_project ON iterations(project_id);
CREATE INDEX idx_iter_current ON iterations(project_id, is_current) WHERE is_current = TRUE;

-- ============================================
-- Pages
-- ============================================
CREATE TABLE pages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iteration_id UUID NOT NULL REFERENCES iterations(id) ON DELETE CASCADE,
    name         VARCHAR(200) NOT NULL,
    slug         VARCHAR(100),
    description  TEXT,
    page_type    VARCHAR(30) DEFAULT 'screen',
    device_type  VARCHAR(20) DEFAULT 'desktop',
    viewport_w   INTEGER DEFAULT 1440,
    viewport_h   INTEGER DEFAULT 900,
    bg_color     VARCHAR(20) DEFAULT '#FFFFFF',
    sort_order   INTEGER DEFAULT 0,
    flow_group   VARCHAR(100),
    is_cover     BOOLEAN DEFAULT FALSE,
    ai_prompt    TEXT,
    created_by   UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at   TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_iteration_slug UNIQUE(iteration_id, slug)
);

CREATE INDEX idx_pages_iteration ON pages(iteration_id);
CREATE INDEX idx_pages_sort ON pages(iteration_id, sort_order);

-- ============================================
-- Components
-- ============================================
CREATE TABLE components (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id        UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL,
    name           VARCHAR(100),
    props          JSONB NOT NULL DEFAULT '{}',
    layout         JSONB NOT NULL DEFAULT '{}',
    styles         JSONB DEFAULT '{}',
    interactions   JSONB DEFAULT '[]',
    states         JSONB DEFAULT '{}',
    parent_id      UUID REFERENCES components(id),
    sort_order     INTEGER DEFAULT 0,
    is_locked      BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comp_page ON components(page_id);
CREATE INDEX idx_comp_parent ON components(parent_id);
CREATE INDEX idx_comp_props ON components USING GIN(props);
CREATE INDEX idx_comp_type ON components(component_type);

-- ============================================
-- Annotations
-- ============================================
CREATE TABLE annotations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id    UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    page_id         UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    iteration_id    UUID NOT NULL REFERENCES iterations(id) ON DELETE CASCADE,
    annotation_type VARCHAR(20) NOT NULL DEFAULT 'requirement',
    content         TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'open',
    priority        INTEGER DEFAULT 1,
    color           VARCHAR(20) DEFAULT '#3B82F6',
    tag             VARCHAR(50),
    created_by      UUID NOT NULL REFERENCES users(id),
    assigned_to     UUID REFERENCES users(id),
    due_date        DATE,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_anno_component ON annotations(component_id);
CREATE INDEX idx_anno_page ON annotations(page_id);
CREATE INDEX idx_anno_iteration ON annotations(iteration_id);
CREATE INDEX idx_anno_type ON annotations(annotation_type);
CREATE INDEX idx_anno_status ON annotations(status);

-- ============================================
-- Annotation Comments
-- ============================================
CREATE TABLE annotation_comments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id),
    content       TEXT NOT NULL,
    mentions      JSONB DEFAULT '[]',
    attachments   JSONB DEFAULT '[]',
    is_deleted    BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ac_anno ON annotation_comments(annotation_id);
CREATE INDEX idx_ac_user ON annotation_comments(user_id);

-- ============================================
-- Preview Links
-- ============================================
CREATE TABLE preview_links (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iteration_id     UUID NOT NULL REFERENCES iterations(id) ON DELETE CASCADE,
    token            VARCHAR(100) UNIQUE NOT NULL,
    name             VARCHAR(100),
    password         VARCHAR(255),
    view_count       INTEGER DEFAULT 0,
    expires_at       TIMESTAMP WITH TIME ZONE,
    created_by       UUID NOT NULL REFERENCES users(id),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pl_token ON preview_links(token);
CREATE INDEX idx_pl_iteration ON preview_links(iteration_id);

-- ============================================
-- Activities (Audit Log)
-- ============================================
CREATE TABLE activities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id   UUID,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_act_project ON activities(project_id);
CREATE INDEX idx_act_project_time ON activities(project_id, created_at DESC);

-- ============================================
-- Add foreign key for current_iteration_id
-- ============================================
ALTER TABLE projects ADD CONSTRAINT fk_projects_current_iteration
    FOREIGN KEY (current_iteration_id) REFERENCES iterations(id);

-- ============================================
-- Default data: Create a demo user and organization
-- Note: Password hash is for 'demo123' - change in production
-- ============================================
INSERT INTO users (id, email, name, password_hash, provider)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo@example.com',
    'Demo User',
    '$2a$12$LJ3m4ys3Lz0YBNOURq0Y3OjCfKJmKPOJYqDTPVCKzLOBhZMHfWO6e', -- bcrypt hash of 'demo123'
    'email'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO organizations (id, name, slug, owner_id, plan)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Demo Organization',
    'demo',
    '00000000-0000-0000-0000-000000000001',
    'free'
) ON CONFLICT (slug) DO NOTHING;
