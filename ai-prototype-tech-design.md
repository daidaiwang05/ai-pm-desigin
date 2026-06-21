# AI 原型交付工具 — 技术设计文档

> **文档版本**：v1.0
> **撰写人**：PM Team
> **日期**：2026-06-16
> **状态**：初稿

---

## 1. 系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Web (Next.js) │  │ 预览器(纯前端) │  │ 离线编辑器(桌面)  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                  │                    │             │
├─────────┼──────────────────┼────────────────────┼─────────────┤
│         │              网关层                     │             │
│         └──────────┬───────────────────┬───────┘             │
│                    │  API Gateway / Load Balancer              │
├────────────────────┼──────────────────────────────────────────┤
│                    │              业务逻辑层                   │
│  ┌─────────────────┴─────────────────────────────────────┐   │
│  │                    BFF 层 (Node.js / Express)          │   │
│  │  项目服务 │ 页面服务 │ 迭代服务 │ 标注服务 │ 协作服务    │   │
│  └─────────────────────────────────────────────────────┬──┘   │
│                                                        │       │
│  ┌──────────────────────────┐  ┌───────────────────┐  │       │
│  │    AI 引擎 (Python/FastAPI) │  │  实时协同服务     │  │       │
│  │  LLM调度 │ 组件映射 │ 布局算法 │  │  Socket.io/Redis │  │       │
│  └──────────────────────────┘  └───────────────────┘  │       │
├──────────────────────────────────────────────────────┼──────────┤
│                         数据层                          │          │
│  ┌────────────┐ ┌─────────────┐ ┌────────────────┐  │          │
│  │ PostgreSQL │ │   Redis     │ │  S3/OSS 对象存储│  │          │
│  │ (结构化数据) │ │ (缓存/会话)  │ │  (快照/资源文件) │  │          │
│  └────────────┘ └─────────────┘ └────────────────┘  │          │
├──────────────────────────────────────────────────────┼──────────┤
│                       基础设施层                        │          │
│  Vercel 前端部署 │ 云服务器 │ CDN │ AI API (OpenAI/Claude)│       │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖关系

```
用户请求
   ↓
Next.js (CSR/SSR)
   ↓
API Gateway (鉴权/限流)
   ↓
BFF (Node.js)
   ├── 项目服务  → PostgreSQL
   ├── 页面服务  → PostgreSQL + S3
   ├── 迭代服务  → PostgreSQL + S3 (快照)
   ├── 标注服务  → PostgreSQL
   ├── AI 服务   → FastAPI → LLM API → 组件库
   └── 协作服务  → Socket.io + Redis
```

### 1.3 前后端职责边界

| 职责 | 前端 (Next.js) | 后端 (Node.js + FastAPI) |
|------|----------------|-------------------------|
| 页面路由与渲染 | ✅ | - |
| 画布编辑交互 | ✅ | - |
| 组件拖拽/属性编辑 | ✅ | - |
| 项目/迭代/页面 CRUD | - | ✅ |
| AI 生成编排 | - | ✅ |
| 标注管理 | ✅（本地） + ✅（同步） | ✅（持久化） |
| 预览链接生成 | ✅ | ✅（存储） |
| 实时协同 | ✅ | ✅（Socket.io） |
| 文件上传/下载 | - | ✅（S3/OSS） |

---

## 2. 数据库 Schema 设计

### 2.1 ER 关系图

```
User
  ├── 1:N → Organization (用户所属组织)
  ├── 1:N → ProjectMember (项目成员关系)
  └── 1:N → Annotation (标注)

Organization
  ├── 1:N → Project (组织内项目)
  └── 1:N → User (组织成员)

Project
  ├── 1:N → Iteration (项目迭代)
  └── 1:N → ProjectMember (成员关联)

Iteration
  ├── N:1 → Project
  └── 1:N → Page (迭代内页面)

Page
  ├── N:1 → Iteration
  └── 1:N → Component (页面内组件)

Component
  ├── N:1 → Page
  └── 1:N → Annotation (组件上标注)
  └── 1:N → AnnotationComment (标注评论)
```

### 2.2 表结构详述

#### 2.2.1 users（用户表）

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  avatar_url    VARCHAR(500),
  phone         VARCHAR(20),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active     BOOLEAN DEFAULT TRUE,
  -- SSO 相关
  provider      VARCHAR(50) DEFAULT 'email',  -- 'email' | 'google' | 'github' | 'wechat'
  provider_id   VARCHAR(255),
  UNIQUE(provider, provider_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
```

#### 2.2.2 organizations（组织表）

```sql
CREATE TABLE organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  slug         VARCHAR(50) UNIQUE NOT NULL,  -- URL 友好标识
  plan         VARCHAR(20) DEFAULT 'free',    -- 'free' | 'pro' | 'enterprise'
  logo_url     VARCHAR(500),
  owner_id     UUID NOT NULL REFERENCES users(id),
  settings     JSONB DEFAULT '{}',            -- 组织设置
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orgs_slug ON organizations(slug);
CREATE INDEX idx_orgs_owner ON organizations(owner_id);
```

#### 2.2.3 projects（项目表）

```sql
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES users(id),
  current_iteration_id UUID,  -- 指向当前活跃迭代
  is_public       BOOLEAN DEFAULT FALSE,
  thumbnail_url   VARCHAR(500),              -- 项目缩略图
  settings        JSONB DEFAULT '{
    "default_device": "desktop",
    "grid_visible": true,
    "snap_to_grid": true
  }',
  metadata        JSONB DEFAULT '{}',        -- AI 元数据/标签
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at      TIMESTAMP WITH TIME ZONE   -- 软删除
);

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_slug ON projects(org_id, name);  -- 组织内唯一
```

#### 2.2.4 project_members（项目成员表）

```sql
CREATE TABLE project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'editor',  -- 'viewer' | 'editor' | 'admin' | 'owner'
  invite_email VARCHAR(255),
  invited_by  UUID REFERENCES users(id),
  joined_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_pm_project ON project_members(project_id);
CREATE INDEX idx_pm_user ON project_members(user_id);
```

#### 2.2.5 iterations（迭代表）

```sql
CREATE TABLE iterations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,  -- e.g. "v0.2 登录流程重构"
  version      VARCHAR(20) NOT NULL,   -- e.g. "0.2"
  status       VARCHAR(20) DEFAULT 'editing',  -- 'editing' | 'reviewing' | 'approved' | 'archived'
  description  TEXT,
  based_on_id  UUID REFERENCES iterations(id),  -- 父迭代（用于分支）
  created_by   UUID NOT NULL REFERENCES users(id),
  snapshot_url VARCHAR(500),            -- 快照图片 S3 地址
  is_current   BOOLEAN DEFAULT FALSE,   -- 是否为当前活跃迭代
  review_deadline TIMESTAMP WITH TIME ZONE,
  approved_by  UUID REFERENCES users(id),
  approved_at  TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_project_version UNIQUE(project_id, version)
);

CREATE INDEX idx_iter_project ON iterations(project_id);
CREATE INDEX idx_iter_current ON iterations(project_id, is_current) WHERE is_current = TRUE;
```

#### 2.2.6 pages（页面表）

```sql
CREATE TABLE pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iteration_id UUID NOT NULL REFERENCES iterations(id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(100),           -- URL 友好名称
  description  TEXT,
  page_type    VARCHAR(30) DEFAULT 'screen',  -- 'screen' | 'component' | 'template'
  device_type  VARCHAR(20) DEFAULT 'desktop', -- 'desktop' | 'tablet' | 'mobile'
  viewport_w   INTEGER DEFAULT 1440,
  viewport_h   INTEGER DEFAULT 900,
  bg_color     VARCHAR(20) DEFAULT '#FFFFFF',
  sort_order   INTEGER DEFAULT 0,       -- 页面在迭代内的排序
  flow_group   VARCHAR(100),           -- 所属流程组（用于连线）
  is_cover     BOOLEAN DEFAULT FALSE,  -- 是否为项目封面页
  ai_prompt    TEXT,                    -- 生成该页面的原始 AI prompt
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at   TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_iteration_slug UNIQUE(iteration_id, slug)
);

CREATE INDEX idx_pages_iteration ON pages(iteration_id);
CREATE INDEX idx_pages_sort ON pages(iteration_id, sort_order);
```

#### 2.2.7 components（组件表）

```sql
CREATE TABLE components (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id      UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  component_type VARCHAR(50) NOT NULL,   -- 'Input' | 'Button' | 'Card' | 'NavBar' 等
  name         VARCHAR(100),             -- 组件显示名称（可选）
  props        JSONB NOT NULL DEFAULT '{}',  -- 组件属性 { placeholder, text, src, ... }
  layout       JSONB NOT NULL DEFAULT '{}',  -- 布局信息 { x, y, w, h, rotation, zIndex }
  styles       JSONB DEFAULT '{}',           -- 样式覆盖 { bgColor, border, shadow, ... }
  interactions JSONB DEFAULT '[]',           -- 交互定义 [{ trigger, action, target }]
  states       JSONB DEFAULT '{}',          -- 多状态定义 { hover: {...}, active: {...} }
  parent_id    UUID REFERENCES components(id),  -- 嵌套父组件
  sort_order   INTEGER DEFAULT 0,
  is_locked    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comp_page ON components(page_id);
CREATE INDEX idx_comp_parent ON components(parent_id);
-- GIN 索引用于 props 内部字段查询
CREATE INDEX idx_comp_props ON components USING GIN(props);
CREATE INDEX idx_comp_type ON components(component_type);
```

#### 2.2.8 annotations（标注表）

```sql
CREATE TABLE annotations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id   UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  page_id        UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  iteration_id   UUID NOT NULL REFERENCES iterations(id) ON DELETE CASCADE,
  annotation_type VARCHAR(20) NOT NULL DEFAULT 'requirement',  -- 'requirement' | 'note' | 'status' | 'question' | 'todo' | 'bug'
  content        TEXT NOT NULL,
  status         VARCHAR(20) DEFAULT 'open',  -- 'open' | 'resolved' | 'accepted' | 'rejected'
  priority       INTEGER DEFAULT 1,           -- 1=高 2=中 3=低
  color          VARCHAR(20) DEFAULT '#3B82F6',  -- 标签颜色
  tag            VARCHAR(50),                 -- 标签名（显示为 R1/R2 样式）
  created_by     UUID NOT NULL REFERENCES users(id),
  assigned_to    UUID REFERENCES users(id),
  due_date       DATE,
  resolved_by    UUID REFERENCES users(id),
  resolved_at    TIMESTAMP WITH TIME ZONE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_anno_component ON annotations(component_id);
CREATE INDEX idx_anno_page ON annotations(page_id);
CREATE INDEX idx_anno_iteration ON annotations(iteration_id);
CREATE INDEX idx_anno_type ON annotations(annotation_type);
CREATE INDEX idx_anno_status ON annotations(status);
CREATE INDEX idx_anno_page_status ON annotations(page_id, status);
```

#### 2.2.9 annotation_comments（标注评论表）

```sql
CREATE TABLE annotation_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  content       TEXT NOT NULL,
  mentions      JSONB DEFAULT '[]',    -- @提及的用户 [{ userId, start, end }]
  attachments   JSONB DEFAULT '[]',     -- 附件 [{ url, name, type }]
  is_deleted    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ac_anno ON annotation_comments(annotation_id);
CREATE INDEX idx_ac_user ON annotation_comments(user_id);
```

#### 2.2.10 preview_links（预览链接表）

```sql
CREATE TABLE preview_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iteration_id UUID NOT NULL REFERENCES iterations(id) ON DELETE CASCADE,
  token        VARCHAR(100) UNIQUE NOT NULL,  -- URL 中的唯一标识
  name         VARCHAR(100),                  -- 链接名称（可选）
  password     VARCHAR(255),                  -- 访问密码（bcrypt 加密）
  view_count   INTEGER DEFAULT 0,
  expires_at   TIMESTAMP WITH TIME ZONE,     -- 过期时间（可选）
  created_by   UUID NOT NULL REFERENCES users(id),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pl_token ON preview_links(token);
CREATE INDEX idx_pl_iteration ON preview_links(iteration_id);
```

#### 2.2.11 activities（活动日志表）

```sql
CREATE TABLE activities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id),
  action_type  VARCHAR(50) NOT NULL,  -- 'page_created' | 'annotation_added' | 'iter_published' | ...
  target_type  VARCHAR(50),            -- 'page' | 'annotation' | 'iteration' | ...
  target_id    UUID,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_act_project ON activities(project_id);
CREATE INDEX idx_act_project_time ON activities(project_id, created_at DESC);
```

---

## 3. API 设计

### 3.1 API 规范

- **Base URL**：`/api/v1`
- **认证**：Bearer Token（JWT）
- **请求格式**：`application/json`
- **响应格式**：统一包装 `{ success, data, error, meta }`

### 3.2 核心 API 列表

#### 认证相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录 |
| POST | `/auth/logout` | 登出 |
| GET | `/auth/me` | 当前用户信息 |

**`POST /auth/login`**
```json
// Request
{ "email": "adam@example.com", "password": "xxx" }
// Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "uuid", "name": "Adam", "email": "adam@example.com", "avatarUrl": "..." }
  }
}
```

#### 项目管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects` | 列表（分页+搜索） |
| POST | `/projects` | 创建项目 |
| GET | `/projects/:id` | 项目详情 |
| PATCH | `/projects/:id` | 更新项目 |
| DELETE | `/projects/:id` | 删除项目（软删除） |
| GET | `/projects/:id/members` | 成员列表 |
| POST | `/projects/:id/members` | 添加成员 |
| DELETE | `/projects/:id/members/:uid` | 移除成员 |
| PATCH | `/projects/:id/members/:uid` | 更新成员角色 |

**`POST /projects`**
```json
// Request
{
  "name": "用户登录模块重构",
  "description": "优化登录流程，增加手机号+验证码登录",
  "orgId": "uuid"
}
// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "用户登录模块重构",
    "description": "优化登录流程...",
    "currentIterationId": null,
    "createdAt": "2026-06-16T15:00:00Z"
  }
}
```

#### 迭代管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects/:pid/iterations` | 迭代列表 |
| POST | `/projects/:pid/iterations` | 创建迭代 |
| GET | `/iterations/:id` | 迭代详情（含页面列表） |
| PATCH | `/iterations/:id` | 更新迭代 |
| POST | `/iterations/:id/clone` | 复制迭代 |
| POST | `/iterations/:id/publish` | 发布预览链接 |
| POST | `/iterations/:id/approve` | 审批通过 |

**`POST /projects/:pid/iterations`**
```json
// Request
{
  "name": "v0.3 登录流程重构",
  "version": "0.3",
  "description": "新增手机号+验证码登录",
  "basedOnId": "uuid-v0.2"  // 可选，基于哪个版本创建
}
// Response
{
  "success": true,
  "data": {
    "id": "uuid-v0.3",
    "name": "v0.3 登录流程重构",
    "version": "0.3",
    "projectId": "uuid-p",
    "basedOnId": "uuid-v0.2",
    "status": "editing",
    "createdAt": "2026-06-16T15:00:00Z"
  }
}
```

#### 页面管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/iterations/:iid/pages` | 页面列表 |
| POST | `/iterations/:iid/pages` | 创建页面 |
| GET | `/pages/:id` | 页面详情（含组件树） |
| PATCH | `/pages/:id` | 更新页面 |
| DELETE | `/pages/:id` | 删除页面 |
| PATCH | `/pages/:id/reorder` | 批量排序 |

**`GET /pages/:id`**
```json
// Response
{
  "success": true,
  "data": {
    "id": "uuid-page",
    "name": "登录页",
    "slug": "login",
    "deviceType": "desktop",
    "viewport": { "w": 1440, "h": 900 },
    "components": [
      {
        "id": "uuid-comp",
        "componentType": "Input",
        "name": "手机号输入框",
        "props": { "placeholder": "请输入手机号", "type": "tel" },
        "layout": { "x": 40, "y": 120, "w": 300, "h": 44 },
        "styles": { "bgColor": "#F9FAFB" },
        "interactions": [],
        "annotations": [
          {
            "id": "uuid-anno",
            "type": "requirement",
            "content": "需校验手机号格式，格式错误时显示提示"
          }
        ]
      }
    ],
    "createdAt": "2026-06-16T15:00:00Z"
  }
}
```

#### 组件管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/pages/:id/components` | 添加组件 |
| PATCH | `/components/:id` | 更新组件 |
| DELETE | `/components/:id` | 删除组件 |
| PATCH | `/pages/:id/components/reorder` | 批量排序 |

**`PATCH /components/:id`**
```json
// Request
{
  "props": { "placeholder": "请输入验证码（6位）" },
  "layout": { "x": 40, "y": 180, "w": 200, "h": 44 }
}
// Response
{ "success": true, "data": { /* 更新后的组件对象 */ } }
```

#### 标注管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/components/:id/annotations` | 添加标注 |
| GET | `/iterations/:iid/annotations` | 获取迭代所有标注（支持过滤） |
| PATCH | `/annotations/:id` | 更新标注 |
| DELETE | `/annotations/:id` | 删除标注 |
| POST | `/annotations/:id/comments` | 添加评论 |
| PATCH | `/annotations/:id/status` | 更新状态（解决/接受等） |

**`POST /components/:id/annotations`**
```json
// Request
{
  "annotationType": "requirement",
  "content": "点击登录按钮后，若网络错误需显示重试按钮",
  "priority": 1,
  "tag": "R3"
}
// Response
{ "success": true, "data": { "id": "uuid", "tag": "R3", "color": "#3B82F6", ... } }
```

#### AI 生成

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/ai/generate` | AI 生成原型 |
| POST | `/ai/refine` | AI 优化/调整 |
| POST | `/ai/describe` | AI 描述页面（多模态） |

**`POST /ai/generate`**
```json
// Request
{
  "iterationId": "uuid",
  "prompt": "一个移动端登录页面，包含手机号输入、验证码输入、登录按钮，还有'忘记密码'链接",
  "deviceType": "mobile",
  "existingComponents": ["Button", "Input", "Link"]  // 可选，指定组件池
}
// Response
{
  "success": true,
  "data": {
    "pages": [
      {
        "id": "uuid-page",
        "name": "登录页",
        "components": [
          {
            "id": "uuid-comp",
            "componentType": "Input",
            "props": { "placeholder": "手机号", "type": "tel" },
            "layout": { "x": 24, "y": 120, "w": 312, "h": 48 },
            "annotations": []
          }
        ]
      }
    ],
    "usage": { "tokens": 2048, "model": "gpt-4o" }
  }
}
```

#### 预览与交付

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/iterations/:id/preview-links` | 生成预览链接 |
| GET | `/preview/:token` | 访问预览（无需登录） |
| GET | `/preview/:token/pages` | 预览版页面列表 |
| GET | `/preview/:token/pages/:pageId` | 预览某页面 |
| DELETE | `/preview-links/:id` | 删除预览链接 |

### 3.3 错误响应规范

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      { "field": "name", "message": "项目名称不能为空" }
    ]
  }
}
```

错误码体系：
| 错误码 | HTTP 状态 | 说明 |
|--------|----------|------|
| UNAUTHORIZED | 401 | 未登录 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 参数校验失败 |
| RATE_LIMITED | 429 | 请求频率超限 |
| INTERNAL_ERROR | 500 | 服务器错误 |

---

## 4. AI 引擎设计

### 4.1 AI 引擎架构

```
用户输入（Prompt）
       ↓
意图识别层（Intent Classification）
       ↓
┌─────────────────────────────────┐
│   Prompt 工程层                  │
│  设备上下文 + 组件库约束 + 布局规则 │
└─────────────────────────────────┘
       ↓
结构化输出层（JSON Schema）
       ↓
LLM API（GPT-4o / Claude Sonnet）
       ↓
Schema 校验（JSON Schema Validation）
       ↓
组件映射层（Component Mapping）
       ↓
布局优化层（Layout Optimization）
       ↓
最终 PageSchema 输出
```

### 4.2 Prompt 工程模板

#### 主生成 Prompt

```
你是专业的移动端/桌面端 UI 原型设计师。请根据以下需求生成可交互的原型页面结构。

【设备类型】
{{device_type}}（{{viewport_width}} × {{viewport_height}}）

【需求描述】
{{user_prompt}}

【可用组件库】
你只能使用以下组件类型，每个组件必须指定 type 和合理的 props：

| Type | 说明 | 默认 Props |
|------|------|-----------|
| Text | 文本 | { content, fontSize, fontWeight, color } |
| Input | 输入框 | { placeholder, type, label } |
| Button | 按钮 | { text, variant: 'primary'|'secondary'|'ghost' } |
| Image | 图片 | { src, alt, borderRadius } |
| Card | 卡片容器 | { title, padding, shadow } |
| NavBar | 导航栏 | { title, leftIcon, rightIcon } |
| TabBar | 底部标签栏 | { tabs: [{label, icon}] } |
| List | 列表 | { items: [], itemHeight } |
| IconButton | 图标按钮 | { icon, size } |
| Checkbox | 复选框 | { label, checked } |
| Switch | 开关 | { checked, label } |
| Badge | 徽标 | { text, color } |
| Divider | 分割线 | {} |
| Avatar | 头像 | { src, size, shape } |
| Tag | 标签 | { text, color } |
| Toast | 提示 | { message, type: 'success'|'error'|'info' } |

【布局规则】
- 使用网格布局，单位为像素(px)
- 默认从 y=0 开始依次向下排列
- 组件之间保持 12-16px 间距
- 按钮高度建议 44-48px（移动端）/ 36-44px（桌面端）
- 输入框高度建议 44-48px
- 页面顶部预留 NavBar 区域（移动端 44px，桌面端 56px）
- 内容区域左右边距：移动端 16px，桌面端 24px

【输出格式】
请严格输出 JSON 格式，不得包含任何解释说明：

{
  "pages": [
    {
      "name": "页面名称",
      "slug": "url-slug",
      "components": [
        {
          "type": "组件类型",
          "name": "组件名称（可选）",
          "props": { /* 组件属性 */ },
          "layout": { "x": 数字, "y": 数字, "w": 数字, "h": 数字 }
        }
      ]
    }
  ]
}

【注意事项】
1. 不要生成任何图片 URL 占位符之外的图片组件
2. 交互元素（如按钮、输入框）必须有合适的 props
3. 组件位置和尺寸必须是合理的像素值
4. 每个页面不超过 20 个主要组件
```

### 4.3 JSON Schema 输出定义

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PrototypePageSchema",
  "type": "object",
  "required": ["pages"],
  "properties": {
    "pages": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "slug", "components"],
        "properties": {
          "name": { "type": "string", "maxLength": 100 },
          "slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },
          "components": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["type", "layout"],
              "properties": {
                "type": {
                  "type": "string",
                  "enum": ["Text","Input","Button","Image","Card","NavBar","TabBar","List","IconButton","Checkbox","Switch","Badge","Divider","Avatar","Tag","Link"]
                },
                "name": { "type": "string" },
                "props": {
                  "type": "object",
                  "default": {},
                  "additionalProperties": true
                },
                "layout": {
                  "type": "object",
                  "required": ["x","y","w","h"],
                  "properties": {
                    "x": { "type": "number", "minimum": 0 },
                    "y": { "type": "number", "minimum": 0 },
                    "w": { "type": "number", "minimum": 10 },
                    "h": { "type": "number", "minimum": 10 }
                  }
                },
                "interactions": {
                  "type": "array",
                  "default": [],
                  "items": {
                    "type": "object",
                    "properties": {
                      "trigger": { "type": "string", "enum": ["click","hover","focus","change"] },
                      "action": { "type": "string", "enum": ["navigate","toggle","show","hide","submit"] },
                      "target": { "type": "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 4.4 布局优化算法

AI 给出的原始布局往往不够精确，需要后处理优化：

```python
def optimize_layout(components: List[Dict], viewport_w: int, padding: int = 24) -> List[Dict]:
    """
    布局优化算法：
    1. 对齐修正：将 x 坐标修正到最近的 4px 网格
    2. 间距修正：确保相邻组件间距不低于 8px
    3. 溢出检测：修正超出视口宽度的组件
    4. 重叠检测：检测并修正重叠组件
    """
    optimized = []
    for comp in components:
        layout = comp['layout']
        # 1. 网格对齐（snap to grid，4px）
        layout['x'] = round(layout['x'] / 4) * 4
        layout['y'] = round(layout['y'] / 4) * 4
        # 2. 宽度约束（不超出视口）
        if layout['x'] + layout['w'] > viewport_w - padding:
            layout['w'] = viewport_w - padding - layout['x']
        optimized.append({**comp, 'layout': layout})
    
    # 3. 间距修正（最小间距 8px）
    optimized.sort(key=lambda c: c['layout']['y'])
    for i in range(1, len(optimized)):
        prev_bottom = optimized[i-1]['layout']['y'] + optimized[i-1]['layout']['h']
        curr_top = optimized[i]['layout']['y']
        if curr_top - prev_bottom < 8:
            optimized[i]['layout']['y'] = prev_bottom + 8
    
    return optimized
```

### 4.5 多轮迭代策略

```
用户输入 → 草稿生成（快，1-2 页） → 用户确认方向
    ↓
细化生成（添加更多组件细节） → 用户调整单组件
    ↓
导出/预览
```

- **草稿阶段**：低 token 消耗，快速出 1-2 个候选方案
- **细化阶段**：高 token 消耗，精细化当前选定方案
- **调整阶段**：不调 LLM，直接前端编辑

---

## 5. 组件库规范

### 5.1 组件原子清单（v1.0）

#### 基础组件（10个）

| 组件名 | 描述 | 核心 Props | 默认尺寸 |
|--------|------|-----------|---------|
| `Text` | 文本 | `content`, `fontSize`, `fontWeight`, `color`, `align` | auto |
| `Image` | 图片 | `src`, `alt`, `objectFit`, `borderRadius` | 100×100 |
| `Icon` | 图标 | `name`（iconfont 名称）, `size`, `color` | 24×24 |
| `Divider` | 分割线 | `direction`（h/v）, `color`, `thickness` | 100%×1 |
| `Badge` | 徽标 | `text`, `color`, `size`, `position` | auto |
| `Avatar` | 头像 | `src`, `size`（sm/md/lg）, `shape`（circle/square） | 40×40 |
| `Tag` | 标签 | `text`, `color`, `closable` | auto |
| `Link` | 链接 | `text`, `href`, `underline` | auto |
| `Progress` | 进度条 | `value`（0-100）, `showLabel`, `color` | 100%×8 |
| `Tooltip` | 提示 | `content`, `position`（top/bottom/left/right） | auto |

#### 表单组件（8个）

| 组件名 | 描述 | 核心 Props |
|--------|------|-----------|
| `Input` | 输入框 | `placeholder`, `type`, `label`, `error`, `disabled`, `prefix`, `suffix` |
| `Textarea` | 多行文本 | `placeholder`, `rows`, `maxLength`, `label` |
| `Select` | 下拉选择 | `options`（[{value, label}]）, `placeholder`, `multiple` |
| `Checkbox` | 复选框 | `label`, `checked`, `disabled`, `indeterminate` |
| `Radio` | 单选框 | `options`, `value`, `disabled` |
| `Switch` | 开关 | `checked`, `label`, `disabled`, `size` |
| `Slider` | 滑块 | `min`, `max`, `value`, `step` |
| `DatePicker` | 日期选择 | `value`, `format`, `range` |

#### 反馈组件（6个）

| 组件名 | 描述 | 核心 Props |
|--------|------|-----------|
| `Button` | 按钮 | `text`, `variant`（primary/secondary/ghost/danger）, `size`, `loading`, `disabled`, `icon` |
| `IconButton` | 图标按钮 | `icon`, `size`, `variant`, `tooltip` |
| `Toast` | 轻提示 | `message`, `type`（success/error/info/warning）, `duration` |
| `Modal` | 弹窗 | `title`, `content`, `visible`, `footer`, `size` |
| `Alert` | 警告提示 | `message`, `type`, `closable`, `description` |
| `Loading` | 加载态 | `size`, `type`（spinner/skeleton）, `text` |

#### 布局组件（8个）

| 组件名 | 描述 | 核心 Props |
|--------|------|-----------|
| `Card` | 卡片 | `title`, `content`, `footer`, `padding`, `shadow`, `borderRadius` |
| `NavBar` | 顶部导航 | `title`, `leftIcon`, `rightIcon`, `fixed`, `transparent` |
| `TabBar` | 底部标签栏 | `tabs`（[{label, icon, badge}]）, `activeIndex`, `fixed` |
| `Sidebar` | 侧边栏 | `menus`（[{label, icon, children}]）, `collapsed`, `width` |
| `Header` | 页头 | `title`, `breadcrumb`, `actions`, `height` |
| `Footer` | 页脚 | `copyright`, `links`, `height` |
| `Grid` | 网格容器 | `columns`, `gap`, `rowGap` |
| `Stack` | 堆叠容器 | `direction`（row/col）, `gap`, `align`, `justify` |

#### 业务组件（6个）

| 组件名 | 描述 | 核心 Props |
|--------|------|-----------|
| `List` | 列表 | `items`, `renderItem`, `emptyText`, `loading` |
| `Table` | 表格 | `columns`, `data`, `pagination`, `rowKey` |
| `Form` | 表单容器 | `items`, `layout`, `labelAlign`, `rules` |
| `Stepper` | 步骤条 | `steps`, `current`, `direction` |
| `Pagination` | 分页器 | `total`, `page`, `pageSize`, `sizes` |
| `Empty` | 空状态 | `text`, `image`, `action` |

### 5.2 组件 Props 接口规范（TypeScript）

```typescript
// 基础 Props 接口
interface BaseComponentProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  // 布局
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
    rotation?: number;
    zIndex?: number;
  };
  // 状态
  locked?: boolean;
  visible?: boolean;
}

// Button Props
interface ButtonProps extends BaseComponentProps {
  text: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;           // 图标名称
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  borderRadius?: number;
}

// Input Props
interface InputProps extends BaseComponentProps {
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'tel' | 'number' | 'search';
  label?: string;
  value?: string;
  error?: string;           // 错误提示
  hint?: string;            // 辅助说明
  disabled?: boolean;
  readonly?: boolean;
  prefix?: string | React.ReactNode;
  suffix?: string | React.ReactNode;
  clearable?: boolean;
  maxLength?: number;
  borderRadius?: number;
}

// Card Props
interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  content?: string;
  footer?: React.ReactNode;
  padding?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  borderRadius?: number;
  clickable?: boolean;
}
```

### 5.3 组件状态机定义

每个组件内置标准状态机：

```typescript
// 统一状态定义
interface ComponentStates {
  default: BaseState;      // 默认态
  hover?: BaseState;       // 悬停态（桌面端）
  active?: BaseState;      // 按下态
  focus?: BaseState;       // 聚焦态
  disabled?: BaseState;    // 禁用态
  loading?: BaseState;     // 加载态
  error?: BaseState;        // 错误态
}

interface BaseState {
  props?: Partial<ComponentProps>;  // 属性覆盖
  styles?: React.CSSProperties;     // 样式覆盖
  visible?: boolean;
}

// Button 状态示例
const ButtonStates: ComponentStates = {
  default: {
    props: { loading: false, disabled: false }
  },
  hover: {
    props: { variant: 'primary' },  // 悬停时统一变 primary
    styles: { opacity: 0.9, transform: 'translateY(-1px)' }
  },
  active: {
    styles: { transform: 'translateY(0)', boxShadow: 'none' }
  },
  disabled: {
    props: { disabled: true },
    styles: { opacity: 0.5, cursor: 'not-allowed' }
  },
  loading: {
    props: { loading: true, disabled: true }
  }
};
```

---

## 6. 版本管理策略

### 6.1 版本快照机制

每次创建新迭代时，执行以下快照流程：

```
用户点击「创建新迭代」
       ↓
系统复制当前迭代的所有页面和组件数据
       ↓
生成快照 JSON（完整数据，压缩存储）
       ↓
生成快照缩略图（Canvas 渲染 PNG，上传 S3）
       ↓
创建新迭代记录，based_on_id 指向父迭代
       ↓
新迭代状态设为 "editing"，is_current = true
       ↓
旧迭代 is_current = false
```

### 6.2 快照存储结构

```
S3 Bucket: s3://proto-snapshots/
  └── {org_id}/
        └── {project_id}/
              └── {iteration_id}/
                    ├── snapshot.json.gz      # 完整数据快照
                    ├── thumbnail.png         # 缩略图
                    ├── thumbnail@2x.png      # 高清缩略图
                    └── assets/               # 快照内使用的资源
                          ├── img_001.png
                          └── font_abc.woff
```

### 6.3 增量 Diff 算法

```python
import json
import zlib
from typing import Dict, List, Any

def diff_iterations(before: Dict, after: Dict) -> Dict:
    """
    对比两个迭代版本，返回差异报告
    用于：版本 Diff 展示 / 变更通知
    """
    diff = {
        "pages": {"added": [], "removed": [], "modified": []},
        "components": {"added": [], "removed": [], "modified": []},
        "annotations": {"added": [], "resolved": [], "modified": []},
        "summary": {"pagesChanged": 0, "componentsChanged": 0, "annotationsChanged": 0}
    }
    
    # 1. 页面 Diff
    before_pages = {p['id']: p for p in before.get('pages', [])}
    after_pages = {p['id']: p for p in after.get('pages', [])}
    
    for pid in set(after_pages.keys()) - set(before_pages.keys()):
        diff['pages']['added'].append(after_pages[pid])
    for pid in set(before_pages.keys()) - set(after_pages.keys()):
        diff['pages']['removed'].append(before_pages[pid])
    for pid in set(before_pages.keys()) & set(after_pages.keys()):
        if json.dumps(before_pages[pid], sort_keys=True) != json.dumps(after_pages[pid], sort_keys=True):
            page_diff = diff_dict(before_pages[pid], after_pages[pid])
            diff['pages']['modified'].append(page_diff)
    
    # 2. 组件 Diff（按页面内组件对比）
    # 3. 标注 Diff（新增/解决/修改）
    
    # 汇总
    diff['summary']['pagesChanged'] = (
        len(diff['pages']['added']) + 
        len(diff['pages']['removed']) + 
        len(diff['pages']['modified'])
    )
    
    return diff

def diff_dict(before: Dict, after: Dict, path: str = "") -> Dict:
    """递归对比两个字典，返回具体变更路径"""
    changes = {"path": path, "fields": {}}
    all_keys = set(before.keys()) | set(after.keys())
    for key in all_keys:
        current_path = f"{path}.{key}" if path else key
        if key not in before:
            changes['fields'][key] = {"type": "added", "value": after[key]}
        elif key not in after:
            changes['fields'][key] = {"type": "removed", "value": before[key]}
        elif before[key] != after[key]:
            if isinstance(before[key], dict) and isinstance(after[key], dict):
                changes['fields'][key] = diff_dict(before[key], after[key], current_path)
            else:
                changes['fields'][key] = {
                    "type": "modified",
                    "before": before[key],
                    "after": after[key]
                }
    return changes
```

### 6.4 存储优化策略

| 优化点 | 策略 | 节省预估 |
|--------|------|---------|
| JSON 压缩 | snapshot.json 存储前 gzip 压缩 | ~70% |
| 缩略图压缩 | PNG → WebP，生成 1x + 2x 两档 | ~60% |
| 增量存储 | 同项目相邻迭代只存储 diff，不存全量 | ~40%（随迭代增多效果显著）|
| 冷热分离 | 3个月前快照迁移至 S3 Glacier | ~80%（冷存费用）|
| 资源去重 | 同资源多迭代引用同一 S3 对象 | ~30% |

---

## 7. 实时协作方案

### 7.1 方案选型：OT vs CRDT

| 维度 | OT (Operational Transform) | CRDT |
|------|---------------------------|------|
| 复杂度 | 高（服务端实现复杂） | 中（纯客户端） |
| 离线支持 | 弱 | 强 |
| 扩展性 | 一般 | 好 |
| 适合场景 | 延迟低（<100ms） | 允许离线/高延迟 |
| 成熟库 | ShareDB, Firepad | Yjs, Automerge |

**决策**：Phase 1-2 采用 **ShareDB (OT)**，Phase 3 升级为 **Yjs (CRDT)**。

理由：
- 产品原型协作场景延迟要求不高（通常同地团队）
- ShareDB 与 Node.js 生态集成好，开发成本低
- Yjs 支持离线但需要额外基础设施

### 7.2 协同架构

```
用户A 编辑组件属性
       ↓
本地状态立即更新（乐观更新）
       ↓
操作序列 [Op1: { type: 'updateProps', id: 'xxx', path: 'props.placeholder', value: '新值' }]
       ↓
Socket.io 发送到服务端
       ↓
服务端（ShareDB）：
  1. 应用操作到服务端文档状态
  2. 计算 Transform（变换）其他并发操作
  3. 广播 Transform 后的操作给其他客户端
       ↓
用户B 收到操作
       ↓
本地应用操作，状态更新，UI 刷新
```

### 7.3 操作类型定义

```typescript
// 协同操作类型
type Operation = 
  | { type: 'add_component'; pageId: string; component: Component; afterId?: string }
  | { type: 'remove_component'; pageId: string; componentId: string }
  | { type: 'update_component'; pageId: string; componentId: string; patch: Partial<Component> }
  | { type: 'move_component'; pageId: string; componentId: string; layout: Layout }
  | { type: 'add_annotation'; componentId: string; annotation: Annotation }
  | { type: 'update_annotation'; annotationId: string; patch: Partial<Annotation> }
  | { type: 'add_comment'; annotationId: string; comment: Comment }
  | { type: 'reorder_pages'; pageOrders: { pageId: string; sortOrder: number }[] };
```

### 7.4 冲突处理策略

| 冲突类型 | 处理策略 |
|---------|---------|
| 同一组件被两人同时编辑 | Last Write Wins + 变更历史记录（可回滚） |
| 组件被删除同时被编辑 | 删除优先，编辑者的操作被忽略，通知用户 |
| 页面被删除同时有新增组件 | 删除优先，新增组件被移到回收站 |
| 标注被解决同时被评论 | 解决优先，评论保留并通知新状态 |

### 7.5 状态同步策略

```typescript
// 前端状态同步管理器
class SyncManager {
  private doc: ShareDB.Doc;
  private pendingOps: Operation[] = [];
  private isConnected: boolean = false;
  
  // 乐观更新：立即应用，异步同步
  updateComponent(componentId: string, patch: Partial<Component>) {
    const op: Operation = {
      type: 'update_component',
      pageId: this.currentPageId,
      componentId,
      patch
    };
    
    // 立即更新本地
    this.applyLocally(op);
    
    // 加入待发送队列
    this.pendingOps.push(op);
    this.flushPending();
  }
  
  // WebSocket 断线重连
  onReconnect() {
    // 重新同步：从服务端获取最新快照
    this.doc.subscribe((error) => {
      if (error) console.error('Sync error:', error);
    });
    
    // 重新发送 pending ops
    this.flushPending();
  }
}
```

---

## 8. 部署架构

### 8.1 整体部署拓扑

```
                          用户请求
                              │
                        ┌─────▼─────┐
                        │   CDN     │  (Vercel Edge / Cloudflare)
                        │ (静态资源) │
                        └─────┬─────┘
                              │
                        ┌─────▼─────┐
                        │  Vercel   │  Next.js 前端
                        │  (Frontend)│
                        └─────┬─────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │  API GW   │  │  AI GW    │  │  Socket   │
        │ (Node.js) │  │ (FastAPI) │  │  Server   │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │               │               │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │ PostgreSQL│  │ LLM API   │  │  Redis    │
        │  (RDS)    │  │(OpenAI/   │  │ (Pub/Sub) │
        └───────────┘  │ Claude)   │  └───────────┘
                        └───────────┘

        ┌──────────────────────────────────────────┐
        │              S3 / OSS (对象存储)            │
        │  快照 │ 缩略图 │ 导出文件 │ 用户上传资源    │
        └──────────────────────────────────────────┘
```

### 8.2 部署配置

#### Docker Compose（开发/测试环境）

```yaml
version: '3.8'
services:
  frontend:
    image: node:20-alpine
    command: npm run dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:4000
      - NEXT_PUBLIC_WS_URL=ws://localhost:4001

  api:
    image: node:20-alpine
    command: npm run start
    ports:
      - "4000:4000"
    volumes:
      - ./api:/app
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/proto
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - S3_BUCKET=proto-snapshots
      - AI_API_KEY=${AI_API_KEY}

  socket:
    image: node:20-alpine
    command: npm run start:socket
    ports:
      - "4001:4001"
    volumes:
      - ./socket:/app
    environment:
      - REDIS_URL=redis://redis:6379

  ai:
    image: python:3.11-slim
    command: uvicorn main:app --host 0.0.0.0 --port 8000
    ports:
      - "8000:8000"
    volumes:
      - ./ai-engine:/app
    environment:
      - OPENAI_API_KEY=${AI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

  worker:
    image: node:20-alpine
    command: npm run worker
    volumes:
      - ./workers:/app
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/proto
      - REDIS_URL=redis://redis:6379
      - S3_BUCKET=proto-snapshots

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=proto
      - POSTGRES_PASSWORD=password
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

#### 生产环境 Kubernetes（K3s / EKS）

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: proto-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: proto-api
  template:
    metadata:
      labels:
        app: proto-api
    spec:
      containers:
        - name: api
          image: registry.example.com/proto-api:latest
          ports:
            - containerPort: 4000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: proto-secrets
                  key: database-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: proto-secrets
                  key: jwt-secret
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 10
            periodSeconds: 5
```

### 8.3 CDN 配置

```
域名：assets.proto-app.com

缓存策略：
- 缩略图/快照：Cache-Control: public, max-age=31536000, immutable
- 用户上传资源：Cache-Control: public, max-age=86400
- API 响应：Cache-Control: no-store
- 预览链接静态资源：Cache-Control: public, max-age=604800
```

---

## 9. 技术风险与应对

### 9.1 风险矩阵

| 风险项 | 概率 | 影响 | 优先级 | 应对方案 |
|--------|------|------|--------|---------|
| AI 布局合理性差 | 高 | 高 | **P0** | 组件级模板约束 + Grid 布局算法 + 用户手动微调 |
| AI 生成内容不符合预期 | 高 | 中 | **P0** | 分阶段生成（草稿→细化）+ 多方案候选 + 明确 Prompt 边界 |
| 高并发画布操作卡顿 | 中 | 高 | **P1** | 虚拟化渲染（只渲染视口内组件）+ 操作防抖 |
| 实时协同冲突丢失 | 低 | 高 | **P1** | OT 算法 + 操作日志 + 版本回滚 |
| 大项目快照存储爆炸 | 中 | 中 | **P1** | 增量快照 + 压缩 + 冷热分层 |
| LLM API 成本失控 | 高 | 中 | **P2** | Token 预算 + 缓存 + 按需细化 |
| 预览链接被未授权访问 | 低 | 高 | **P0** | 链接 Token 随机化 + 可选密码保护 + 访问日志 |
| 复杂组件交互还原困难 | 中 | 中 | **P2** | 交互模板库 + 前端组件状态机内置支持 |

### 9.2 P0 风险详细方案

#### 风险1：AI 布局合理性

**根因**：LLM 不擅长精确坐标计算，生成结果往往是"大致方向对"但具体数值不合理。

**解决方案**：放弃让 LLM 计算绝对坐标，改为输出"语义布局"。

```typescript
// 语义布局 Schema（替代绝对坐标）
interface SemanticLayout {
  type: 'vertical-stack' | 'grid' | 'float' | 'fixed';
  gap?: number;
  align?: 'left' | 'center' | 'right' | 'stretch';
  padding?: { top: number; bottom: number; left: number; right: number };
  children?: SemanticLayout[];  // 嵌套
}

// AI 输出语义布局 → 前端渲染引擎计算绝对坐标
function resolveLayout(semantic: SemanticLayout, viewport: { w: number; h: number }): Layout[] {
  // 根据语义 + 视口尺寸 → 精确像素坐标
  // 网格对齐、间距约束、超出检测全部在此层处理
}
```

#### 风险2：预览链接安全

**根因**：Token 过于规律/短，容易被猜测枚举。

**解决方案**：
1. Token 使用 256 位随机值（UUID v4 + 额外熵）
2. 每个 Token 绑定特定迭代 ID，跨迭代无效
3. 可选密码保护（bcrypt 加密）
4. 访问时记录 IP + UA，可审计
5. 支持手动撤销 Token

```python
import secrets
import hashlib

def generate_secure_token() -> str:
    """生成防猜测的安全 Token"""
    random_bytes = secrets.token_bytes(32)
    return hashlib.sha256(random_bytes).hexdigest()[:48]  # 48 字符熵

# 存储：只存 Token 的 SHA256 哈希，验证时比对
# 数据库只存 hash(Token)，无法反向推导 Token
```

### 9.3 性能基准

| 操作 | 目标 | 测量方法 |
|------|------|---------|
| 页面首次加载 | < 2s | Lighthouse / Web Vitals |
| 画布交互响应 | < 16ms（60fps） | Chrome DevTools Performance |
| AI 生成（草稿） | < 10s | 服务端计时 |
| 预览链接打开 | < 3s | 端到端计时 |
| 实时操作同步延迟 | < 100ms（同地）/ < 300ms（异地）| Socket.io 延迟监控 |
| 1000 组件页面渲染 | < 500ms | 虚拟化后测量 |

---

## 10. 监控与可观测性

### 10.1 核心指标监控

```typescript
// 关键业务指标埋点
const metrics = {
  // AI 使用
  'ai.generate.count': { type: 'counter', labels: ['status', 'model'] },
  'ai.generate.duration': { type: 'histogram', labels: ['model'] },
  'ai.generate.tokens': { type: 'histogram', labels: ['model'] },
  'ai.generate.cost': { type: 'counter', labels: ['model'] },
  
  // 协作
  'collab.users.active': { type: 'gauge' },
  'collab.operations.count': { type: 'counter' },
  'collab.conflict.count': { type: 'counter' },
  
  // 性能
  'page.load.time': { type: 'histogram', labels: ['page_type'] },
  'canvas.interaction.fps': { type: 'gauge' },
  
  // 业务
  'project.created': { type: 'counter' },
  'iteration.published': { type: 'counter' },
  'preview.link.created': { type: 'counter' }
};
```

### 10.2 日志规范

```json
{
  "timestamp": "2026-06-16T15:30:00.123Z",
  "level": "info",
  "service": "api",
  "traceId": "abc123",
  "userId": "uuid",
  "action": "component.update",
  "duration": 45,
  "meta": {
    "projectId": "uuid",
    "pageId": "uuid",
    "componentId": "uuid"
  }
}
```

---

*文档结束 — 如有疑问或需补充，请联系产品团队。*
