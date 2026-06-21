"""
AI Prototype Engine - Main Application
FastAPI 服务，提供 AI 原型生成能力
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import logging
from dotenv import load_dotenv

import sentry_sdk

from component_library import (
    COMPONENT_LIBRARY,
    get_component_table,
    get_component_default_size,
    get_component_default_props,
    get_all_component_types,
)
from prompt_engine import (
    SYSTEM_PROMPT,
    build_generate_prompt,
    build_refine_prompt,
    build_add_component_prompt,
    validate_json_schema,
)
from layout_optimizer import (
    optimize_layout,
    auto_layout_vertical,
    center_components,
    calculate_page_height,
)

load_dotenv()

# ============================================
# Sentry Initialization
# ============================================
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.1 if os.getenv("ENVIRONMENT") == "production" else 1.0,
    )

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Prototype Engine",
    description="AI 原型生成引擎 - 将自然语言转换为结构化原型",
    version="2.0.0",
)

# CORS
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:4000").split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Models
# ============================================


class GenerateRequest(BaseModel):
    prompt: str
    device_type: str = "desktop"
    viewport_w: int = 1440
    viewport_h: int = 900
    existing_components: Optional[List[str]] = None
    page_count: int = 1


class PRDGenerateRequest(BaseModel):
    product_name: str
    description: str
    target_users: Optional[str] = None
    core_features: Optional[List[str]] = None
    industry: Optional[str] = None


class PRDResponse(BaseModel):
    title: str
    overview: str
    target_users: List[Dict[str, str]]
    user_stories: List[Dict[str, str]]
    features: List[Dict[str, Any]]
    acceptance_criteria: List[str]
    timeline: Dict[str, str]
    risks: List[Dict[str, str]]


class ComponentLayout(BaseModel):
    x: float
    y: float
    w: float
    h: float

    class Config:
        # 允许从整数转换为浮点数
        json_encoders = {
            float: lambda v: v,
        }


class Component(BaseModel):
    type: str
    name: Optional[str] = None
    props: Dict[str, Any] = {}
    layout: ComponentLayout
    interactions: List[Dict[str, Any]] = []

    class Config:
        # 允许额外字段
        extra = "allow"


class PageSchema(BaseModel):
    name: str
    slug: str
    components: List[Component]


class GenerateResponse(BaseModel):
    pages: List[PageSchema]
    usage: Dict[str, Any] = {"tokens": 0, "model": "unknown"}


class RefineRequest(BaseModel):
    page: PageSchema
    instruction: str
    device_type: str = "desktop"


class AddComponentRequest(BaseModel):
    page: PageSchema
    component_type: str
    description: str
    device_type: str = "desktop"


class ComponentInfo(BaseModel):
    type: str
    category: str
    description: str
    default_size: Dict[str, int]
    default_props: Dict[str, Any]


# ============================================
# LLM Service (Lazy Loading)
# ============================================

_llm_service = None


def get_llm_service():
    global _llm_service
    if _llm_service is None:
        try:
            from llm_service import LLMService
            _llm_service = LLMService()
            logger.info("LLM service initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize LLM service: {e}")
            _llm_service = None
    return _llm_service


# ============================================
# Routes
# ============================================


@app.get("/health")
async def health_check():
    llm_status = "available" if get_llm_service() else "unavailable"
    return {
        "status": "ok",
        "service": "ai-engine",
        "version": "2.0.0",
        "llm_status": llm_status,
        "component_count": len(COMPONENT_LIBRARY),
    }


# ============================================
# Streaming Generation
# ============================================


@app.post("/ai/generate/stream")
async def generate_prototype_stream(request: GenerateRequest):
    """
    AI 生成原型（流式响应）

    使用 SSE (Server-Sent Events) 流式返回生成结果
    """
    try:
        llm_service = get_llm_service()

        if not llm_service:
            # Mock 模式：返回 SSE 格式的完整结果
            result = generate_mock_response(request)
            return StreamingResponse(
                iter([f"data: {json.dumps({'done': True, 'result': result})}\n\n"]),
                media_type="text/event-stream",
            )

        prompt = build_generate_prompt(
            user_prompt=request.prompt,
            device_type=request.device_type,
            viewport_w=request.viewport_w,
            viewport_h=request.viewport_h,
            existing_components=request.existing_components,
            page_count=request.page_count,
        )

        async def event_generator():
            full_response = ""
            async for chunk in llm_service.generate_stream(prompt, SYSTEM_PROMPT):
                full_response += chunk
                # 发送 SSE 事件
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            # 尝试解析完整响应
            try:
                # 处理可能的 markdown 代码块
                cleaned = full_response.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]

                result = json.loads(cleaned.strip())
                result.setdefault("usage", {"tokens": 0, "model": "deepseek"})

                # 优化布局
                for page in result.get("pages", []):
                    components = page.get("components", [])
                    optimized = optimize_layout(
                        components,
                        request.viewport_w,
                        request.viewport_h,
                    )
                    page["components"] = optimized

                yield f"data: {json.dumps({'done': True, 'result': result})}\n\n"
            except json.JSONDecodeError:
                yield f"data: {json.dumps({'error': 'JSON 解析失败', 'raw': full_response[:500]})}\n\n"
            except Exception as e:
                logger.error(f"Stream post-processing error: {e}")
                yield f"data: {json.dumps({'error': f'处理失败: {str(e)}'})}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except Exception as e:
        import traceback
        logger.error(f"Stream generate error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# PRD Generation
# ============================================

PRD_SYSTEM_PROMPT = """你是一个专业的产品经理 AI 助手。你的任务是根据用户的产品描述，生成结构化的 PRD（产品需求文档）。

你必须严格遵守以下规则：
1. 只输出 JSON 格式，不要输出任何其他内容
2. PRD 内容要专业、完整、可执行
3. 用户故事要符合标准格式：作为[角色]，我想要[功能]，以便[价值]
4. 验收标准要具体、可测试
5. 风险分析要客观、有应对措施

输出 JSON Schema：
```json
{
  "title": "PRD 标题",
  "overview": "产品概述（200字以内）",
  "target_users": [
    {"role": "用户角色", "needs": "核心需求", "pain_points": "痛点"}
  ],
  "user_stories": [
    {"as_a": "角色", "i_want": "功能", "so_that": "价值", "priority": "P0/P1/P2"}
  ],
  "features": [
    {
      "name": "功能名称",
      "description": "功能描述",
      "priority": "P0/P1/P2",
      "user_stories": ["关联的用户故事"],
      "acceptance_criteria": ["验收标准1", "验收标准2"]
    }
  ],
  "acceptance_criteria": ["整体验收标准1", "整体验收标准2"],
  "timeline": {
    "mvp": "MVP 阶段描述",
    "v1": "V1.0 阶段描述",
    "v2": "V2.0 阶段描述"
  },
  "risks": [
    {"risk": "风险描述", "impact": "影响程度", "mitigation": "应对措施"}
  ]
}
```"""


@app.post("/ai/generate-prd", response_model=PRDResponse)
async def generate_prd(request: PRDGenerateRequest):
    """
    AI 生成 PRD 文档

    根据产品描述生成结构化的 PRD 文档
    """
    try:
        llm_service = get_llm_service()

        # 构建 Prompt
        prompt = f"""【产品名称】
{request.product_name}

【产品描述】
{request.description}

{"【目标用户】" + request.target_users if request.target_users else ""}

{"【核心功能】" + ", ".join(request.core_features) if request.core_features else ""}

{"【行业领域】" + request.industry if request.industry else ""}

请生成完整的 PRD 文档，包含：
1. 产品概述
2. 目标用户分析
3. 用户故事（至少 5 个）
4. 功能列表（按优先级 P0/P1/P2 分类）
5. 验收标准
6. 产品路线图
7. 风险分析

请直接输出 JSON，不要包含任何解释。"""

        if llm_service:
            logger.info(f"Generating PRD for: {request.product_name}")
            result = await llm_service.generate_json(prompt, PRD_SYSTEM_PROMPT)
            logger.info("PRD generated successfully")

            # 确保所有必需字段存在
            result.setdefault("title", request.product_name)
            result.setdefault("overview", "")
            result.setdefault("target_users", [])
            result.setdefault("user_stories", [])
            result.setdefault("features", [])
            result.setdefault("acceptance_criteria", [])
            result.setdefault("timeline", {})
            result.setdefault("risks", [])

            return result
        else:
            # Mock PRD
            return generate_mock_prd(request)

    except Exception as e:
        import traceback
        logger.error(f"PRD generation error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


def generate_mock_prd(request: PRDGenerateRequest) -> Dict[str, Any]:
    """生成 Mock PRD"""
    return {
        "title": f"{request.product_name} 产品需求文档",
        "overview": request.description,
        "target_users": [
            {"role": "产品经理", "needs": "快速验证产品想法", "pain_points": "原型制作耗时"},
            {"role": "设计师", "needs": "高效协作", "pain_points": "需求不清晰"},
            {"role": "开发者", "needs": "明确需求", "pain_points": "频繁变更"},
        ],
        "user_stories": [
            {"as_a": "产品经理", "i_want": "用自然语言描述需求", "so_that": "快速生成原型", "priority": "P0"},
            {"as_a": "产品经理", "i_want": "在线分享原型", "so_that": "收集反馈", "priority": "P0"},
            {"as_a": "设计师", "i_want": "查看需求标注", "so_that": "理解设计意图", "priority": "P1"},
            {"as_a": "开发者", "i_want": "导出设计稿", "so_that": "快速开发", "priority": "P1"},
            {"as_a": "团队负责人", "i_want": "查看版本历史", "so_that": "追踪进度", "priority": "P2"},
        ],
        "features": [
            {
                "name": "AI 原型生成",
                "description": "通过自然语言描述自动生成 UI 原型",
                "priority": "P0",
                "user_stories": ["作为产品经理，我想要用自然语言描述需求，以便快速生成原型"],
                "acceptance_criteria": ["支持中英文输入", "生成时间 < 30s"],
            },
            {
                "name": "在线预览",
                "description": "生成可分享的在线预览链接",
                "priority": "P0",
                "user_stories": ["作为产品经理，我想要在线分享原型，以便收集反馈"],
                "acceptance_criteria": ["支持密码保护", "支持评论"],
            },
        ],
        "acceptance_criteria": [
            "核心功能可正常使用",
            "页面加载时间 < 3s",
            "支持主流浏览器",
        ],
        "timeline": {
            "mvp": "2 周 - 核心功能上线",
            "v1": "1 个月 - 功能完善",
            "v2": "3 个月 - 企业级功能",
        },
        "risks": [
            {"risk": "AI 生成质量不稳定", "impact": "高", "mitigation": "增加人工审核环节"},
            {"risk": "用户数据安全", "impact": "高", "mitigation": "数据加密 + 私有化部署"},
        ],
    }


@app.get("/ai/components", response_model=List[ComponentInfo])
async def list_components():
    """获取所有可用组件"""
    components = []
    for comp_type, info in COMPONENT_LIBRARY.items():
        components.append(
            ComponentInfo(
                type=comp_type,
                category=info["category"],
                description=info["description"],
                default_size=info["default_size"],
                default_props=info["default_props"],
            )
        )
    return components


@app.get("/ai/components/{category}", response_model=List[ComponentInfo])
async def list_components_by_category(category: str):
    """按分类获取组件"""
    components = []
    for comp_type, info in COMPONENT_LIBRARY.items():
        if info["category"] == category:
            components.append(
                ComponentInfo(
                    type=comp_type,
                    category=info["category"],
                    description=info["description"],
                    default_size=info["default_size"],
                    default_props=info["default_props"],
                )
            )
    return components


@app.post("/ai/generate")
async def generate_prototype(request: GenerateRequest):
    """
    AI 生成原型

    使用 LLM 根据自然语言描述生成结构化原型
    如果 LLM 不可用，使用 Mock 生成器
    """
    try:
        llm_service = get_llm_service()

        if llm_service:
            # 使用真实 LLM
            prompt = build_generate_prompt(
                user_prompt=request.prompt,
                device_type=request.device_type,
                viewport_w=request.viewport_w,
                viewport_h=request.viewport_h,
                existing_components=request.existing_components,
                page_count=request.page_count,
            )

            logger.info(f"Calling LLM with prompt length: {len(prompt)}")
            result = await llm_service.generate_json(prompt, SYSTEM_PROMPT)
            logger.info(f"LLM response received")

            # 确保有 usage 字段
            if "usage" not in result:
                result["usage"] = {"tokens": 0, "model": "deepseek"}

            # 验证 JSON Schema
            errors = validate_json_schema(result)
            if errors:
                logger.warning(f"Schema validation errors: {errors}")
                # 尝试修复或降级到 Mock
                result = generate_mock_response(request)
        else:
            # 使用 Mock 生成器
            logger.info("Using mock generator")
            result = generate_mock_response(request)

        # 确保有 usage 字段
        if "usage" not in result:
            result["usage"] = {"tokens": 0, "model": "deepseek"}

        # 优化布局
        for page in result.get("pages", []):
            components = page.get("components", [])
            optimized = optimize_layout(
                components,
                request.viewport_w,
                request.viewport_h,
            )
            page["components"] = optimized

        return result

    except Exception as e:
        import traceback
        logger.error(f"Generate error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/refine")
async def refine_prototype(request: RefineRequest):
    """
    AI 优化原型

    根据用户指令优化现有原型
    """
    try:
        llm_service = get_llm_service()

        if llm_service:
            prompt = build_refine_prompt(
                current_page=request.page.dict(),
                instruction=request.instruction,
                device_type=request.device_type,
            )

            result = await llm_service.generate_json(prompt, SYSTEM_PROMPT)

            # 验证
            errors = validate_json_schema(result)
            if errors:
                raise ValueError(f"优化结果验证失败: {errors}")

            return result
        else:
            # Mock: 返回原页面
            return {
                "pages": [request.page.dict()],
                "changes": [],
            }

    except Exception as e:
        logger.error(f"Refine error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/add-component")
async def add_component(request: AddComponentRequest):
    """
    AI 添加组件

    智能添加组件到页面合适位置
    """
    try:
        # 验证组件类型
        if request.component_type not in COMPONENT_LIBRARY:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的组件类型: {request.component_type}",
            )

        llm_service = get_llm_service()

        if llm_service:
            prompt = build_add_component_prompt(
                current_page=request.page.dict(),
                component_type=request.component_type,
                description=request.description,
                device_type=request.device_type,
            )

            result = await llm_service.generate_json(prompt, SYSTEM_PROMPT)
            return result
        else:
            # Mock: 智能添加组件
            page_data = request.page.dict()
            new_component = create_mock_component(
                request.component_type,
                request.description,
                page_data["components"],
            )
            page_data["components"].append(new_component)
            return {"pages": [page_data]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add component error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ai/component-props/{component_type}")
async def get_component_props(component_type: str):
    """获取组件的默认属性"""
    if component_type not in COMPONENT_LIBRARY:
        raise HTTPException(
            status_code=404,
            detail=f"组件类型不存在: {component_type}",
        )

    info = COMPONENT_LIBRARY[component_type]
    return {
        "type": component_type,
        "default_size": info["default_size"],
        "default_props": info["default_props"],
        "category": info["category"],
        "description": info["description"],
    }


# ============================================
# Mock Response Generator
# ============================================

# 预定义的页面模板
PAGE_TEMPLATES = {
    "login": {
        "name": "登录页",
        "slug": "login",
        "components": [
            {"type": "Text", "name": "标题", "props": {"content": "欢迎登录", "fontSize": 28, "fontWeight": "bold"}, "layout": {"x": 0, "y": 40, "w": 400, "h": 48}},
            {"type": "Text", "name": "副标题", "props": {"content": "请输入您的账号信息", "fontSize": 14, "color": "#6b7280"}, "layout": {"x": 0, "y": 96, "w": 400, "h": 24}},
            {"type": "Input", "name": "用户名", "props": {"placeholder": "请输入用户名/邮箱", "label": "账号", "type": "text"}, "layout": {"x": 0, "y": 152, "w": 360, "h": 48}},
            {"type": "Input", "name": "密码", "props": {"placeholder": "请输入密码", "label": "密码", "type": "password"}, "layout": {"x": 0, "y": 216, "w": 360, "h": 48}},
            {"type": "Button", "name": "登录按钮", "props": {"text": "登录", "variant": "primary"}, "layout": {"x": 0, "y": 296, "w": 360, "h": 48}},
            {"type": "Link", "name": "忘记密码", "props": {"text": "忘记密码？", "href": "#"}, "layout": {"x": 0, "y": 360, "w": 120, "h": 24}},
            {"type": "Link", "name": "注册链接", "props": {"text": "没有账号？立即注册", "href": "#"}, "layout": {"x": 0, "y": 392, "w": 200, "h": 24}},
        ],
    },
    "register": {
        "name": "注册页",
        "slug": "register",
        "components": [
            {"type": "Text", "name": "标题", "props": {"content": "创建账号", "fontSize": 28, "fontWeight": "bold"}, "layout": {"x": 0, "y": 40, "w": 400, "h": 48}},
            {"type": "Input", "name": "姓名", "props": {"placeholder": "请输入姓名", "label": "姓名"}, "layout": {"x": 0, "y": 120, "w": 360, "h": 48}},
            {"type": "Input", "name": "邮箱", "props": {"placeholder": "请输入邮箱", "label": "邮箱", "type": "email"}, "layout": {"x": 0, "y": 184, "w": 360, "h": 48}},
            {"type": "Input", "name": "密码", "props": {"placeholder": "设置密码（至少8位）", "label": "密码", "type": "password"}, "layout": {"x": 0, "y": 248, "w": 360, "h": 48}},
            {"type": "Input", "name": "确认密码", "props": {"placeholder": "再次输入密码", "label": "确认密码", "type": "password"}, "layout": {"x": 0, "y": 312, "w": 360, "h": 48}},
            {"type": "Button", "name": "注册按钮", "props": {"text": "注册", "variant": "primary"}, "layout": {"x": 0, "y": 392, "w": 360, "h": 48}},
        ],
    },
    "dashboard": {
        "name": "仪表盘",
        "slug": "dashboard",
        "components": [
            {"type": "Text", "name": "标题", "props": {"content": "仪表盘", "fontSize": 24, "fontWeight": "bold"}, "layout": {"x": 24, "y": 24, "w": 300, "h": 40}},
            {"type": "Card", "name": "统计卡片1", "props": {"title": "总用户数", "content": "12,345"}, "layout": {"x": 24, "y": 88, "w": 280, "h": 120}},
            {"type": "Card", "name": "统计卡片2", "props": {"title": "活跃用户", "content": "8,234"}, "layout": {"x": 320, "y": 88, "w": 280, "h": 120}},
            {"type": "Card", "name": "统计卡片3", "props": {"title": "今日访问", "content": "1,567"}, "layout": {"x": 616, "y": 88, "w": 280, "h": 120}},
            {"type": "Card", "name": "统计卡片4", "props": {"title": "转化率", "content": "23.5%"}, "layout": {"x": 912, "y": 88, "w": 280, "h": 120}},
            {"type": "Text", "name": "近期活动", "props": {"content": "近期活动", "fontSize": 18, "fontWeight": "bold"}, "layout": {"x": 24, "y": 240, "w": 200, "h": 32}},
            {"type": "Card", "name": "活动列表", "props": {"title": "活动记录", "content": "暂无活动数据"}, "layout": {"x": 24, "y": 288, "w": 800, "h": 300}},
        ],
    },
    "list": {
        "name": "列表页",
        "slug": "list",
        "components": [
            {"type": "Text", "name": "标题", "props": {"content": "数据列表", "fontSize": 24, "fontWeight": "bold"}, "layout": {"x": 24, "y": 24, "w": 300, "h": 40}},
            {"type": "Input", "name": "搜索", "props": {"placeholder": "搜索...", "type": "search"}, "layout": {"x": 24, "y": 80, "w": 360, "h": 44}},
            {"type": "Button", "name": "新增按钮", "props": {"text": "新增", "variant": "primary"}, "layout": {"x": 400, "y": 80, "w": 100, "h": 44}},
            {"type": "Card", "name": "列表项1", "props": {"title": "项目名称 1", "content": "这是项目描述信息"}, "layout": {"x": 24, "y": 148, "w": 1200, "h": 80}},
            {"type": "Card", "name": "列表项2", "props": {"title": "项目名称 2", "content": "这是项目描述信息"}, "layout": {"x": 24, "y": 244, "w": 1200, "h": 80}},
            {"type": "Card", "name": "列表项3", "props": {"title": "项目名称 3", "content": "这是项目描述信息"}, "layout": {"x": 24, "y": 340, "w": 1200, "h": 80}},
        ],
    },
    "form": {
        "name": "表单页",
        "slug": "form",
        "components": [
            {"type": "Text", "name": "标题", "props": {"content": "表单填写", "fontSize": 24, "fontWeight": "bold"}, "layout": {"x": 24, "y": 24, "w": 300, "h": 40}},
            {"type": "Input", "name": "姓名", "props": {"placeholder": "请输入姓名", "label": "姓名"}, "layout": {"x": 24, "y": 88, "w": 360, "h": 48}},
            {"type": "Input", "name": "邮箱", "props": {"placeholder": "请输入邮箱", "label": "邮箱", "type": "email"}, "layout": {"x": 24, "y": 152, "w": 360, "h": 48}},
            {"type": "Input", "name": "电话", "props": {"placeholder": "请输入电话", "label": "电话", "type": "tel"}, "layout": {"x": 24, "y": 216, "w": 360, "h": 48}},
            {"type": "Select", "name": "类型", "props": {"placeholder": "请选择", "label": "类型", "options": [{"value": "a", "label": "类型A"}, {"value": "b", "label": "类型B"}]}, "layout": {"x": 24, "y": 280, "w": 360, "h": 48}},
            {"type": "Textarea", "name": "备注", "props": {"placeholder": "请输入备注", "label": "备注", "rows": 4}, "layout": {"x": 24, "y": 344, "w": 360, "h": 120}},
            {"type": "Button", "name": "提交按钮", "props": {"text": "提交", "variant": "primary"}, "layout": {"x": 24, "y": 488, "w": 120, "h": 44}},
            {"type": "Button", "name": "取消按钮", "props": {"text": "取消", "variant": "secondary"}, "layout": {"x": 160, "y": 488, "w": 120, "h": 44}},
        ],
    },
    "profile": {
        "name": "个人中心",
        "slug": "profile",
        "components": [
            {"type": "Avatar", "name": "头像", "props": {"name": "User", "size": "lg"}, "layout": {"x": 24, "y": 24, "w": 80, "h": 80}},
            {"type": "Text", "name": "用户名", "props": {"content": "用户名", "fontSize": 20, "fontWeight": "bold"}, "layout": {"x": 120, "y": 40, "w": 200, "h": 32}},
            {"type": "Tag", "name": "状态", "props": {"text": "在线", "color": "success"}, "layout": {"x": 120, "y": 80, "w": 60, "h": 24}},
            {"type": "Text", "name": "基本信息", "props": {"content": "基本信息", "fontSize": 18, "fontWeight": "bold"}, "layout": {"x": 24, "y": 140, "w": 200, "h": 32}},
            {"type": "Card", "name": "信息卡片", "props": {"title": "个人信息", "content": "邮箱：user@example.com\n电话：138****8888"}, "layout": {"x": 24, "y": 188, "w": 400, "h": 160}},
            {"type": "Button", "name": "编辑按钮", "props": {"text": "编辑资料", "variant": "primary"}, "layout": {"x": 24, "y": 372, "w": 120, "h": 44}},
        ],
    },
    "settings": {
        "name": "设置页",
        "slug": "settings",
        "components": [
            {"type": "Text", "name": "标题", "props": {"content": "系统设置", "fontSize": 24, "fontWeight": "bold"}, "layout": {"x": 24, "y": 24, "w": 300, "h": 40}},
            {"type": "Text", "name": "基本设置", "props": {"content": "基本设置", "fontSize": 18, "fontWeight": "bold"}, "layout": {"x": 24, "y": 88, "w": 200, "h": 32}},
            {"type": "Switch", "name": "通知开关", "props": {"label": "开启通知", "defaultChecked": True}, "layout": {"x": 24, "y": 136, "w": 300, "h": 32}},
            {"type": "Switch", "name": "暗色模式", "props": {"label": "暗色模式", "defaultChecked": False}, "layout": {"x": 24, "y": 184, "w": 300, "h": 32}},
            {"type": "Select", "name": "语言", "props": {"label": "语言", "placeholder": "选择语言", "options": [{"value": "zh", "label": "中文"}, {"value": "en", "label": "English"}]}, "layout": {"x": 24, "y": 232, "w": 300, "h": 48}},
            {"type": "Button", "name": "保存按钮", "props": {"text": "保存设置", "variant": "primary"}, "layout": {"x": 24, "y": 304, "w": 120, "h": 44}},
        ],
    },
}

# 关键词到页面模板的映射
KEYWORD_PAGE_MAP = {
    "登录": ["login"],
    "login": ["login"],
    "注册": ["register"],
    "register": ["register"],
    "仪表盘": ["dashboard"],
    "dashboard": ["dashboard"],
    "列表": ["list"],
    "list": ["list"],
    "表单": ["form"],
    "form": ["form"],
    "个人": ["profile"],
    "profile": ["profile"],
    "设置": ["settings"],
    "settings": ["settings"],
    "用户管理": ["list", "form"],
    "CRM": ["dashboard", "list", "form"],
    "后台": ["dashboard", "list", "settings"],
    "管理系统": ["dashboard", "list", "settings"],
}


def generate_mock_response(request: GenerateRequest) -> Dict[str, Any]:
    """生成 Mock 原型响应（支持多页面）"""

    prompt_lower = request.prompt.lower()
    page_count = request.page_count

    # 根据关键词匹配页面模板
    matched_templates = set()
    for keyword, templates in KEYWORD_PAGE_MAP.items():
        if keyword.lower() in prompt_lower:
            matched_templates.update(templates)

    # 如果没有匹配到，使用默认模板
    if not matched_templates:
        matched_templates = {"login", "dashboard"}

    # 限制页面数量
    template_list = list(matched_templates)[:page_count]

    # 如果需要更多页面，重复添加
    while len(template_list) < page_count:
        template_list.append(template_list[-1] if template_list else "login")

    # 生成页面
    pages = []
    for i, template_key in enumerate(template_list):
        template = PAGE_TEMPLATES.get(template_key, PAGE_TEMPLATES["login"])

        # 根据设备类型调整布局
        adjusted_components = adjust_components_for_device(
            template["components"],
            request.device_type,
            request.viewport_w,
            request.viewport_h,
        )

        page = {
            "name": f"{template['name']}" if page_count == 1 else f"{template['name']} {i + 1}",
            "slug": f"{template['slug']}" if page_count == 1 else f"{template['slug']}-{i + 1}",
            "components": adjusted_components,
        }
        pages.append(page)

    return {
        "pages": pages,
        "usage": {"tokens": 0, "model": "mock"},
    }


def adjust_components_for_device(
    components: List[Dict],
    device_type: str,
    viewport_w: int,
    viewport_h: int,
) -> List[Dict]:
    """根据设备类型调整组件布局"""

    if device_type == "mobile":
        # 移动端：缩小组件宽度，增加间距
        adjusted = []
        for comp in components:
            new_comp = comp.copy()
            layout = comp.get("layout", {}).copy()

            # 缩小宽度到屏幕宽度的一半
            layout["w"] = min(layout["w"], viewport_w - 32)
            layout["x"] = min(layout["x"], 16)

            new_comp["layout"] = layout
            adjusted.append(new_comp)
        return adjusted

    elif device_type == "tablet":
        # 平板端：适当调整
        adjusted = []
        for comp in components:
            new_comp = comp.copy()
            layout = comp.get("layout", {}).copy()

            layout["w"] = min(layout["w"], viewport_w - 48)
            layout["x"] = min(layout["x"], 24)

            new_comp["layout"] = layout
            adjusted.append(new_comp)
        return adjusted

    return components


def create_mock_component(
    component_type: str,
    description: str,
    existing_components: List[Dict],
) -> Dict[str, Any]:
    """创建 Mock 组件"""

    # 获取默认属性和尺寸
    default_props = get_component_default_props(component_type)
    default_size = get_component_default_size(component_type)

    # 计算放置位置（在现有组件下方）
    if existing_components:
        max_y = max(
            c.get("layout", {}).get("y", 0) + c.get("layout", {}).get("h", 0)
            for c in existing_components
        )
        y = max_y + 16
    else:
        y = 24

    return {
        "type": component_type,
        "name": description[:50] if description else component_type,
        "props": default_props,
        "layout": {
            "x": 24,
            "y": y,
            "w": default_size["w"],
            "h": default_size["h"],
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
