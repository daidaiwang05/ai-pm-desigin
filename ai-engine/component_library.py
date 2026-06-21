"""
Component Library - 组件库定义
定义所有可用的 UI 组件及其默认属性
"""

from typing import Dict, Any, List


# ============================================
# 组件库定义
# ============================================

COMPONENT_LIBRARY: Dict[str, Dict[str, Any]] = {
    # ===== 基础组件 =====
    "Text": {
        "category": "basic",
        "description": "文本组件",
        "default_size": {"w": 200, "h": 24},
        "default_props": {
            "content": "文本内容",
            "fontSize": 14,
            "fontWeight": "normal",
            "color": "#000000",
            "align": "left",
        },
    },
    "Image": {
        "category": "basic",
        "description": "图片组件",
        "default_size": {"w": 100, "h": 100},
        "default_props": {
            "src": "",
            "alt": "图片",
            "objectFit": "cover",
            "borderRadius": 0,
        },
    },
    "Icon": {
        "category": "basic",
        "description": "图标组件",
        "default_size": {"w": 24, "h": 24},
        "default_props": {
            "name": "default",
            "size": 24,
            "color": "#000000",
        },
    },
    "Divider": {
        "category": "basic",
        "description": "分割线",
        "default_size": {"w": 400, "h": 1},
        "default_props": {
            "direction": "horizontal",
            "color": "#e5e7eb",
            "thickness": 1,
        },
    },
    "Badge": {
        "category": "basic",
        "description": "徽标",
        "default_size": {"w": 20, "h": 20},
        "default_props": {
            "text": "0",
            "color": "#ef4444",
            "size": "sm",
        },
    },
    "Avatar": {
        "category": "basic",
        "description": "头像",
        "default_size": {"w": 40, "h": 40},
        "default_props": {
            "src": "",
            "size": "md",
            "shape": "circle",
        },
    },
    "Tag": {
        "category": "basic",
        "description": "标签",
        "default_size": {"w": 60, "h": 24},
        "default_props": {
            "text": "标签",
            "color": "default",
            "closable": False,
        },
    },
    "Link": {
        "category": "basic",
        "description": "链接",
        "default_size": {"w": 80, "h": 20},
        "default_props": {
            "text": "链接文本",
            "href": "#",
            "underline": True,
        },
    },
    "Progress": {
        "category": "basic",
        "description": "进度条",
        "default_size": {"w": 200, "h": 8},
        "default_props": {
            "value": 50,
            "showLabel": True,
            "color": "#3b82f6",
        },
    },
    "Tooltip": {
        "category": "basic",
        "description": "提示",
        "default_size": {"w": 100, "h": 32},
        "default_props": {
            "content": "提示内容",
            "position": "top",
        },
    },

    # ===== 表单组件 =====
    "Input": {
        "category": "form",
        "description": "输入框",
        "default_size": {"w": 300, "h": 44},
        "default_props": {
            "placeholder": "请输入",
            "type": "text",
            "label": "",
            "error": "",
            "disabled": False,
        },
    },
    "Textarea": {
        "category": "form",
        "description": "多行文本",
        "default_size": {"w": 300, "h": 100},
        "default_props": {
            "placeholder": "请输入",
            "rows": 4,
            "maxLength": 500,
            "label": "",
        },
    },
    "Select": {
        "category": "form",
        "description": "下拉选择",
        "default_size": {"w": 300, "h": 44},
        "default_props": {
            "options": [
                {"value": "option1", "label": "选项1"},
                {"value": "option2", "label": "选项2"},
            ],
            "placeholder": "请选择",
            "multiple": False,
        },
    },
    "Checkbox": {
        "category": "form",
        "description": "复选框",
        "default_size": {"w": 200, "h": 24},
        "default_props": {
            "label": "复选框",
            "checked": False,
            "disabled": False,
        },
    },
    "Radio": {
        "category": "form",
        "description": "单选框",
        "default_size": {"w": 200, "h": 24},
        "default_props": {
            "options": [
                {"value": "option1", "label": "选项1"},
                {"value": "option2", "label": "选项2"},
            ],
            "value": "option1",
            "disabled": False,
        },
    },
    "Switch": {
        "category": "form",
        "description": "开关",
        "default_size": {"w": 44, "h": 24},
        "default_props": {
            "checked": False,
            "label": "开关",
            "disabled": False,
            "size": "md",
        },
    },
    "Slider": {
        "category": "form",
        "description": "滑块",
        "default_size": {"w": 200, "h": 20},
        "default_props": {
            "min": 0,
            "max": 100,
            "value": 50,
            "step": 1,
        },
    },
    "DatePicker": {
        "category": "form",
        "description": "日期选择",
        "default_size": {"w": 300, "h": 44},
        "default_props": {
            "value": "",
            "format": "YYYY-MM-DD",
            "range": False,
        },
    },

    # ===== 反馈组件 =====
    "Button": {
        "category": "feedback",
        "description": "按钮",
        "default_size": {"w": 120, "h": 44},
        "default_props": {
            "text": "按钮",
            "variant": "primary",
            "size": "md",
            "loading": False,
            "disabled": False,
            "icon": "",
        },
    },
    "IconButton": {
        "category": "feedback",
        "description": "图标按钮",
        "default_size": {"w": 40, "h": 40},
        "default_props": {
            "icon": "settings",
            "size": "md",
            "variant": "ghost",
            "tooltip": "",
        },
    },
    "Toast": {
        "category": "feedback",
        "description": "轻提示",
        "default_size": {"w": 300, "h": 48},
        "default_props": {
            "message": "提示信息",
            "type": "info",
            "duration": 3000,
        },
    },
    "Modal": {
        "category": "feedback",
        "description": "弹窗",
        "default_size": {"w": 480, "h": 320},
        "default_props": {
            "title": "弹窗标题",
            "content": "弹窗内容",
            "visible": True,
            "footer": True,
            "size": "md",
        },
    },
    "Alert": {
        "category": "feedback",
        "description": "警告提示",
        "default_size": {"w": 400, "h": 56},
        "default_props": {
            "message": "警告信息",
            "type": "info",
            "closable": True,
            "description": "",
        },
    },
    "Loading": {
        "category": "feedback",
        "description": "加载态",
        "default_size": {"w": 100, "h": 100},
        "default_props": {
            "size": "md",
            "type": "spinner",
            "text": "加载中...",
        },
    },

    # ===== 布局组件 =====
    "Card": {
        "category": "layout",
        "description": "卡片",
        "default_size": {"w": 360, "h": 200},
        "default_props": {
            "title": "卡片标题",
            "content": "卡片内容",
            "footer": "",
            "padding": 16,
            "shadow": "sm",
            "borderRadius": 8,
        },
    },
    "NavBar": {
        "category": "layout",
        "description": "顶部导航",
        "default_size": {"w": 1440, "h": 56},
        "default_props": {
            "title": "导航栏",
            "leftIcon": "",
            "rightIcon": "",
            "fixed": True,
            "transparent": False,
        },
    },
    "TabBar": {
        "category": "layout",
        "description": "底部标签栏",
        "default_size": {"w": 375, "h": 50},
        "default_props": {
            "tabs": [
                {"label": "首页", "icon": "home"},
                {"label": "搜索", "icon": "search"},
                {"label": "我的", "icon": "user"},
            ],
            "activeIndex": 0,
            "fixed": True,
        },
    },
    "Sidebar": {
        "category": "layout",
        "description": "侧边栏",
        "default_size": {"w": 240, "h": 600},
        "default_props": {
            "menus": [
                {"label": "菜单1", "icon": "menu"},
                {"label": "菜单2", "icon": "menu"},
            ],
            "collapsed": False,
            "width": 240,
        },
    },
    "Header": {
        "category": "layout",
        "description": "页头",
        "default_size": {"w": 1440, "h": 64},
        "default_props": {
            "title": "页面标题",
            "breadcrumb": [],
            "actions": [],
            "height": 64,
        },
    },
    "Footer": {
        "category": "layout",
        "description": "页脚",
        "default_size": {"w": 1440, "h": 80},
        "default_props": {
            "copyright": "© 2024 Company",
            "links": [],
            "height": 80,
        },
    },
    "Grid": {
        "category": "layout",
        "description": "网格容器",
        "default_size": {"w": 400, "h": 400},
        "default_props": {
            "columns": 3,
            "gap": 16,
            "rowGap": 16,
        },
    },
    "Stack": {
        "category": "layout",
        "description": "堆叠容器",
        "default_size": {"w": 300, "h": 300},
        "default_props": {
            "direction": "vertical",
            "gap": 12,
            "align": "stretch",
            "justify": "flex-start",
        },
    },

    # ===== 业务组件 =====
    "List": {
        "category": "business",
        "description": "列表",
        "default_size": {"w": 400, "h": 300},
        "default_props": {
            "items": [
                {"title": "列表项1", "description": "描述1"},
                {"title": "列表项2", "description": "描述2"},
                {"title": "列表项3", "description": "描述3"},
            ],
            "emptyText": "暂无数据",
            "loading": False,
        },
    },
    "Table": {
        "category": "business",
        "description": "表格",
        "default_size": {"w": 800, "h": 400},
        "default_props": {
            "columns": [
                {"title": "列1", "dataIndex": "col1"},
                {"title": "列2", "dataIndex": "col2"},
            ],
            "data": [],
            "pagination": True,
            "rowKey": "id",
        },
    },
    "Form": {
        "category": "business",
        "description": "表单容器",
        "default_size": {"w": 400, "h": 300},
        "default_props": {
            "items": [],
            "layout": "vertical",
            "labelAlign": "left",
            "rules": {},
        },
    },
    "Stepper": {
        "category": "business",
        "description": "步骤条",
        "default_size": {"w": 600, "h": 60},
        "default_props": {
            "steps": [
                {"title": "步骤1", "description": "描述1"},
                {"title": "步骤2", "description": "描述2"},
                {"title": "步骤3", "description": "描述3"},
            ],
            "current": 0,
            "direction": "horizontal",
        },
    },
    "Pagination": {
        "category": "business",
        "description": "分页器",
        "default_size": {"w": 400, "h": 40},
        "default_props": {
            "total": 100,
            "page": 1,
            "pageSize": 10,
            "sizes": [10, 20, 50, 100],
        },
    },
    "Empty": {
        "category": "business",
        "description": "空状态",
        "default_size": {"w": 300, "h": 200},
        "default_props": {
            "text": "暂无数据",
            "image": "",
            "action": "",
        },
    },
}


def get_component_table() -> str:
    """生成组件表格字符串，用于 Prompt"""
    lines = ["| Type | 说明 | 默认 Props |", "|------|------|-----------|"]

    for comp_type, info in COMPONENT_LIBRARY.items():
        description = info["description"]
        default_props = str(info["default_props"])[:80]
        if len(str(info["default_props"])) > 80:
            default_props += "..."
        lines.append(f"| {comp_type} | {description} | {default_props} |")

    return "\n".join(lines)


def get_component_default_size(component_type: str) -> Dict[str, int]:
    """获取组件默认尺寸"""
    comp = COMPONENT_LIBRARY.get(component_type)
    if comp:
        return comp["default_size"]
    return {"w": 100, "h": 100}


def get_component_default_props(component_type: str) -> Dict[str, Any]:
    """获取组件默认属性"""
    comp = COMPONENT_LIBRARY.get(component_type)
    if comp:
        return comp["default_props"].copy()
    return {}


def get_components_by_category(category: str) -> List[str]:
    """按分类获取组件列表"""
    return [
        comp_type
        for comp_type, info in COMPONENT_LIBRARY.items()
        if info["category"] == category
    ]


def get_all_component_types() -> List[str]:
    """获取所有组件类型"""
    return list(COMPONENT_LIBRARY.keys())
