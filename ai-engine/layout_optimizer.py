"""
Layout Optimizer - 布局优化算法
对 AI 生成的原始布局进行后处理优化
"""

from typing import List, Dict, Any, Tuple
from dataclasses import dataclass


@dataclass
class LayoutRect:
    """布局矩形"""
    x: float
    y: float
    w: float
    h: float

    @property
    def right(self) -> float:
        return self.x + self.w

    @property
    def bottom(self) -> float:
        return self.y + self.h

    @property
    def center_x(self) -> float:
        return self.x + self.w / 2

    @property
    def center_y(self) -> float:
        return self.y + self.h / 2

    def intersects(self, other: 'LayoutRect') -> bool:
        """判断是否与另一个矩形相交"""
        return not (
            self.right <= other.x or
            other.right <= self.x or
            self.bottom <= other.y or
            other.bottom <= self.y
        )

    def intersection_area(self, other: 'LayoutRect') -> float:
        """计算与另一个矩形的重叠面积"""
        if not self.intersects(other):
            return 0
        x_overlap = max(0, min(self.right, other.right) - max(self.x, other.x))
        y_overlap = max(0, min(self.bottom, other.bottom) - max(self.y, other.y))
        return x_overlap * y_overlap


def snap_to_grid(value: float, grid_size: int = 4) -> float:
    """将值对齐到网格"""
    return round(value / grid_size) * grid_size


def optimize_layout(
    components: List[Dict[str, Any]],
    viewport_w: int,
    viewport_h: int,
    padding: int = 24,
    grid_size: int = 4,
    min_gap: int = 8,
) -> List[Dict[str, Any]]:
    """
    布局优化算法

    Args:
        components: 组件列表
        viewport_w: 视口宽度
        viewport_h: 视口高度
        padding: 边距
        grid_size: 网格大小
        min_gap: 最小间距

    Returns:
        优化后的组件列表
    """
    if not components:
        return components

    optimized = []

    for comp in components:
        layout = comp.get("layout", {})

        # 1. 网格对齐
        x = snap_to_grid(layout.get("x", 0), grid_size)
        y = snap_to_grid(layout.get("y", 0), grid_size)
        w = snap_to_grid(layout.get("w", 100), grid_size)
        h = snap_to_grid(layout.get("h", 100), grid_size)

        # 2. 宽度约束（不超出视口）
        if x + w > viewport_w - padding:
            w = viewport_w - padding - x
        if x < padding:
            x = padding

        # 3. 高度约束
        if y + h > viewport_h - padding:
            h = viewport_h - padding - y
        if y < 0:
            y = 0

        # 确保最小尺寸
        w = max(w, 20)
        h = max(h, 20)

        optimized.append({
            **comp,
            "layout": {"x": x, "y": y, "w": w, "h": h}
        })

    # 4. 间距修正（最小间距 min_gap）
    optimized = fix_spacing(optimized, min_gap)

    # 5. 重叠检测和修正
    optimized = fix_overlaps(optimized, viewport_w, viewport_h, padding)

    return optimized


def fix_spacing(
    components: List[Dict[str, Any]],
    min_gap: int = 8,
) -> List[Dict[str, Any]]:
    """
    修正组件间距，确保相邻组件间距不低于 min_gap
    """
    if len(components) <= 1:
        return components

    # 按 Y 坐标排序
    sorted_comps = sorted(components, key=lambda c: c["layout"]["y"])

    for i in range(1, len(sorted_comps)):
        prev = sorted_comps[i - 1]
        curr = sorted_comps[i]

        prev_bottom = prev["layout"]["y"] + prev["layout"]["h"]
        curr_top = curr["layout"]["y"]

        # 如果间距不足，向下移动当前组件
        if curr_top - prev_bottom < min_gap:
            new_y = prev_bottom + min_gap
            sorted_comps[i] = {
                **curr,
                "layout": {
                    **curr["layout"],
                    "y": new_y
                }
            }

    return sorted_comps


def fix_overlaps(
    components: List[Dict[str, Any]],
    viewport_w: int,
    viewport_h: int,
    padding: int = 24,
) -> List[Dict[str, Any]]:
    """
    检测并修正组件重叠
    """
    if len(components) <= 1:
        return components

    result = components.copy()
    max_iterations = 10

    for _ in range(max_iterations):
        has_overlap = False

        for i in range(len(result)):
            for j in range(i + 1, len(result)):
                rect_i = LayoutRect(**result[i]["layout"])
                rect_j = LayoutRect(**result[j]["layout"])

                if rect_i.intersects(rect_j):
                    has_overlap = True

                    # 计算重叠区域
                    overlap_x = max(0, min(rect_i.right, rect_j.right) - max(rect_i.x, rect_j.x))
                    overlap_y = max(0, min(rect_i.bottom, rect_j.bottom) - max(rect_i.y, rect_j.y))

                    # 决定移动方向（选择重叠较小的方向）
                    if overlap_x < overlap_y:
                        # 水平移动
                        if rect_i.center_x < rect_j.center_x:
                            new_x = rect_i.x - overlap_x / 2
                        else:
                            new_x = rect_i.x + overlap_x / 2
                        result[i] = {
                            **result[i],
                            "layout": {**result[i]["layout"], "x": snap_to_grid(new_x)}
                        }
                    else:
                        # 垂直移动
                        if rect_i.center_y < rect_j.center_y:
                            new_y = rect_i.y - overlap_y / 2
                        else:
                            new_y = rect_i.y + overlap_y / 2
                        result[i] = {
                            **result[i],
                            "layout": {**result[i]["layout"], "y": snap_to_grid(new_y)}
                        }

        if not has_overlap:
            break

    # 确保所有组件在视口内
    for i, comp in enumerate(result):
        layout = comp["layout"]
        x = max(padding, min(layout["x"], viewport_w - padding - layout["w"]))
        y = max(0, min(layout["y"], viewport_h - padding - layout["h"]))
        result[i] = {
            **comp,
            "layout": {**layout, "x": x, "y": y}
        }

    return result


def auto_layout_vertical(
    components: List[Dict[str, Any]],
    start_x: int = 24,
    start_y: int = 24,
    gap: int = 12,
    max_width: int = 400,
) -> List[Dict[str, Any]]:
    """
    自动垂直布局
    将组件从上到下依次排列
    """
    result = []
    current_y = start_y

    for comp in components:
        layout = comp.get("layout", {})
        w = layout.get("w", 100)
        h = layout.get("h", 44)

        result.append({
            **comp,
            "layout": {
                "x": start_x,
                "y": current_y,
                "w": min(w, max_width),
                "h": h,
            }
        })

        current_y += h + gap

    return result


def center_components(
    components: List[Dict[str, Any]],
    viewport_w: int,
) -> List[Dict[str, Any]]:
    """
    将组件居中对齐
    """
    if not components:
        return components

    # 计算组件总宽度
    max_w = max(c["layout"]["w"] for c in components)
    center_x = (viewport_w - max_w) / 2

    return [
        {
            **comp,
            "layout": {
                **comp["layout"],
                "x": snap_to_grid(center_x)
            }
        }
        for comp in components
    ]


def calculate_page_height(components: List[Dict[str, Any]], padding: int = 24) -> int:
    """
    计算页面所需高度
    """
    if not components:
        return 600

    max_bottom = max(
        c["layout"]["y"] + c["layout"]["h"]
        for c in components
    )

    return int(max_bottom + padding)
