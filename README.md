# AI Prototype Delivery Tool

> AI 原型交付与协作平台 — 从需求到团队评审确认，一站式完成

## 📋 项目概述

面向产品团队的 AI 原型交付与协作平台。核心价值在于"消灭原型从生成到交付过程中的所有上下文切换"。

### 核心功能

- 🤖 **AI 生成原型** — 输入自然语言，AI 生成结构化原型（JSON + 组件实例）
- 📝 **需求标注** — R1/R2/R3 标注直挂页面组件
- 🔄 **版本管理** — 多迭代版本隔离 + Diff 对比
- 👥 **评审协作** — 评论 + 状态联动 + 无需登录评论
- 🚀 **一键发布** — 云端发布生成唯一链接

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 + Tailwind CSS + Konva.js |
| 后端 | Node.js + Express + Prisma |
| AI 引擎 | Python + FastAPI + OpenAI/Claude |
| 数据库 | PostgreSQL 16 + Redis 7 |
| 实时协作 | Socket.io + ShareDB |
| 部署 | Docker Compose / Kubernetes |

## 🚀 快速开始

### 前置条件

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- pnpm (推荐)

### 1. 克隆项目

```bash
git clone <repo-url>
cd ai-prototype
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的 API Key 等配置
```

### 3. 启动基础设施

```bash
# 启动 PostgreSQL + Redis
docker compose up -d db redis
```

### 4. 启动后端 API

```bash
cd api
pnpm install
pnpm prisma generate
pnpm prisma db push
pnpm dev
```

### 5. 启动 AI 引擎

```bash
cd ai-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 6. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

### 7. 访问应用

- 前端：http://localhost:3000
- API：http://localhost:4000
- AI 引擎：http://localhost:8000

## 📁 项目结构

```
ai-prototype/
├── frontend/          # Next.js 14 前端
├── api/               # Node.js/Express 后端 API
├── ai-engine/         # Python/FastAPI AI 引擎
├── socket/            # Socket.io 实时协作服务
├── workers/           # 后台任务
├── db/                # 数据库初始化脚本
├── docker-compose.yml # 开发环境编排
├── .env.example       # 环境变量模板
└── README.md
```

## 📖 API 文档

API 基础路径：`/api/v1`

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录 |
| GET | `/auth/me` | 当前用户信息 |

### 项目
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects` | 项目列表 |
| POST | `/projects` | 创建项目 |
| GET | `/projects/:id` | 项目详情 |
| PATCH | `/projects/:id` | 更新项目 |
| DELETE | `/projects/:id` | 删除项目 |

### 迭代
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects/:pid/iterations` | 迭代列表 |
| POST | `/projects/:pid/iterations` | 创建迭代 |
| GET | `/iterations/:id` | 迭代详情 |

### 页面
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/iterations/:iid/pages` | 页面列表 |
| POST | `/iterations/:iid/pages` | 创建页面 |
| GET | `/pages/:id` | 页面详情（含组件树） |

### 组件
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/pages/:id/components` | 添加组件 |
| PATCH | `/components/:id` | 更新组件 |
| DELETE | `/components/:id` | 删除组件 |

### AI 生成
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/ai/generate` | AI 生成原型 |
| POST | `/ai/refine` | AI 优化调整 |

## 📄 License

MIT
