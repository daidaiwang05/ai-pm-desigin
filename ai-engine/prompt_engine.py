"""
Prompt Engineering Module
构建结构化 Prompt，引导 LLM 生成高质量原型
"""

from typing import Dict, Any, List, Optional
from component_library import COMPONENT_LIBRARY, get_component_table


SYSTEM_PROMPT = """你是一个专业的 UI/UX 原型设计师。根据用户需求生成结构化原型 JSON。

## 核心规则
1. 只输出 JSON，无其他内容
2. 使用指定的组件类型
3. 布局使用绝对定位（x, y, w, h 像素值）
4. 组件间距 8-16px，不超出视口
5. 每页 ≤20 个主要组件

## JSON Schema
```json
{
  "pages": [{
    "name": "页面名称",
    "slug": "url-slug",
    "components": [{
      "type": "组件类型",
      "name": "组件名称",
      "props": {},
      "layout": {"x": 0, "y": 0, "w": 100, "h": 40}
    }]
  }],
  "usage": {"tokens": 0, "model": "deepseek"}
}
```

## 布局原则
- 顶部 Header：y=0, h=56-64
- 内容区：从 y=80 开始
- 左右边距：24px
- 表单标签在输入框上方
- 按钮在表单底部
- 卡片宽度自适应内容

## 组件使用指南
- Text: 文本内容，props.content 必填
- Button: 按钮，props.text 必填，props.variant: primary/secondary/ghost
- Input: 输入框，props.placeholder 必填
- Card: 卡片，props.title 和 props.content
- Select: 下拉选择，props.options 数组
- Image: 图片，props.alt 描述文本
- Avatar: 头像，props.name 首字母显示
- Tag: 标签，props.text 必填
- Divider: 分割线
- Link: 链接，props.text 和 props.href

直接输出 JSON。"""


def build_generate_prompt(
    user_prompt: str,
    device_type: str = "desktop",
    viewport_w: int = 1440,
    viewport_h: int = 900,
    existing_components: Optional[List[str]] = None,
    page_count: int = 1,
) -> str:
    """
    构建生成原型的 Prompt

    Args:
        user_prompt: 用户需求描述
        device_type: 设备类型 (desktop/tablet/mobile)
        viewport_w: 视口宽度
        viewport_h: 视口高度
        existing_components: 指定使用的组件类型（可选）
        page_count: 生成页面数量
    """

    # 获取组件表格
    component_table = get_component_table()

    # 设备特定的布局规则
    device_rules = get_device_rules(device_type)

    # 构建 Prompt
    prompt = f"""生成 {page_count} 个页面的原型。

## 设备
{device_type}（{viewport_w}×{viewport_h}）

## 需求
{user_prompt}

## 可用组件
{component_table}

## 布局规则
{device_rules}

## 要求
- 每页有 name 和 slug
- layout 包含 x, y, w, h（像素）
- 组件在视口内：x+w ≤ {viewport_w}, y+h ≤ {viewport_h}
- 组件间距 12px

输出 JSON。"""

    return prompt


def build_refine_prompt(
    current_page: Dict[str, Any],
    instruction: str,
    device_type: str = "desktop",
) -> str:
    """
    构建优化原型的 Prompt

    Args:
        current_page: 当前页面 JSON
        instruction: 用户优化指令
        device_type: 设备类型
    """

    prompt = f"""【当前页面】
```json
{current_page}
```

【优化指令】
{instruction}

【要求】
1. 保持页面整体结构不变
2. 只修改与指令相关的部分
3. 确保修改后的布局仍然合理
4. 输出完整的页面 JSON（包含所有组件）

请直接输出优化后的完整页面 JSON。"""

    return prompt


def build_add_component_prompt(
    current_page: Dict[str, Any],
    component_type: str,
    description: str,
    device_type: str = "desktop",
) -> str:
    """
    构建添加组件的 Prompt

    Args:
        current_page: 当前页面 JSON
        component_type: 要添加的组件类型
        description: 组件描述
        device_type: 设备类型
    """

    # 获取组件默认属性
    component_info = COMPONENT_LIBRARY.get(component_type, {})
    default_props = component_info.get("default_props", {})

    prompt = f"""【当前页面】
```json
{current_page}
```

【任务】
在页面中添加一个 {component_type} 组件。

【组件描述】
{description}

【组件默认属性】
```json
{default_props}
```

【要求】
1. 找到合适的位置放置新组件
2. 确保不与现有组件重叠
3. 保持页面布局美观
4. 输出添加组件后的完整页面 JSON

请直接输出完整的页面 JSON。"""

    return prompt


def get_device_rules(device_type: str) -> str:
    """获取设备特定的布局规则"""

    rules = {
        "desktop": """- 使用网格布局，单位为像素(px)
- 默认从 y=0 开始依次向下排列
- 组件之间保持 12-16px 间距
- 按钮高度建议 36-44px
- 输入框高度建议 36-44px
- 页面顶部预留 Header 区域（56px）
- 内容区域左右边距：24px
- 最大内容宽度：1200px（居中显示）""",

        "tablet": """- 使用网格布局，单位为像素(px)
- 默认从 y=0 开始依次向下排列
- 组件之间保持 12-16px 间距
- 按钮高度建议 44-48px
- 输入框高度建议 44-48px
- 页面顶部预留 NavBar 区域（44px）
- 内容区域左右边距：20px
- 考虑横屏和竖屏两种模式""",

        "mobile": """- 使用垂直布局，单位为像素(px)
- 默认从 y=0 开始依次向下排列
- 组件之间保持 8-12px 间距
- 按钮高度建议 44-48px
- 输入框高度建议 44-48px
- 页面顶部预留 NavBar 区域（44px）
- 内容区域左右边距：16px
- 组件宽度尽量填满屏幕（减去边距）
- 底部预留 TabBar 区域（50px）""",
    }

    return rules.get(device_type, rules["desktop"])


def validate_json_schema(data: Dict[str, Any]) -> List[str]:
    """
    验证 LLM 输出的 JSON 是否符合 Schema

    Returns:
        错误列表，空列表表示验证通过
    """

    errors = []

    if not isinstance(data, dict):
        return ["输出必须是 JSON 对象"]

    if "pages" not in data:
        return ["缺少 pages 字段"]

    if not isinstance(data["pages"], list):
        return ["pages 必须是数组"]

    for i, page in enumerate(data["pages"]):
        if not isinstance(page, dict):
            errors.append(f"pages[{i}] 必须是对象")
            continue

        if "name" not in page:
            errors.append(f"pages[{i}] 缺少 name 字段")

        if "components" not in page:
            errors.append(f"pages[{i}] 缺少 components 字段")
            continue

        if not isinstance(page["components"], list):
            errors.append(f"pages[{i}].components 必须是数组")
            continue

        for j, comp in enumerate(page["components"]):
            if not isinstance(comp, dict):
                errors.append(f"pages[{i}].components[{j}] 必须是对象")
                continue

            if "type" not in comp:
                errors.append(f"pages[{i}].components[{j}] 缺少 type 字段")

            if "layout" not in comp:
                errors.append(f"pages[{i}].components[{j}] 缺少 layout 字段")
                continue

            layout = comp["layout"]
            if not isinstance(layout, dict):
                errors.append(f"pages[{i}].components[{j}].layout 必须是对象")
                continue

            for key in ["x", "y", "w", "h"]:
                if key not in layout:
                    errors.append(f"pages[{i}].components[{j}].layout 缺少 {key} 字段")
                elif not isinstance(layout[key], (int, float)):
                    errors.append(f"pages[{i}].components[{j}].layout.{key} 必须是数字")

    return errors
