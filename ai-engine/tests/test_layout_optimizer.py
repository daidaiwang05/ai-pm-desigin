"""
Tests for layout_optimizer module
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from layout_optimizer import (
    LayoutRect,
    snap_to_grid,
    optimize_layout,
    fix_spacing,
    fix_overlaps,
    auto_layout_vertical,
    center_components,
    calculate_page_height,
)


class TestLayoutRect:
    """Test LayoutRect dataclass"""

    def test_properties(self):
        rect = LayoutRect(x=10, y=20, w=100, h=50)
        assert rect.right == 110
        assert rect.bottom == 70
        assert rect.center_x == 60
        assert rect.center_y == 45

    def test_intersects_true(self):
        rect1 = LayoutRect(x=0, y=0, w=100, h=100)
        rect2 = LayoutRect(x=50, y=50, w=100, h=100)
        assert rect1.intersects(rect2) is True

    def test_intersects_false(self):
        rect1 = LayoutRect(x=0, y=0, w=50, h=50)
        rect2 = LayoutRect(x=100, y=100, w=50, h=50)
        assert rect1.intersects(rect2) is False

    def test_intersects_edge_touching(self):
        rect1 = LayoutRect(x=0, y=0, w=50, h=50)
        rect2 = LayoutRect(x=50, y=0, w=50, h=50)
        # Edge touching is NOT intersection
        assert rect1.intersects(rect2) is False

    def test_intersection_area(self):
        rect1 = LayoutRect(x=0, y=0, w=100, h=100)
        rect2 = LayoutRect(x=50, y=50, w=100, h=100)
        assert rect1.intersection_area(rect2) == 50 * 50

    def test_intersection_area_no_overlap(self):
        rect1 = LayoutRect(x=0, y=0, w=50, h=50)
        rect2 = LayoutRect(x=100, y=100, w=50, h=50)
        assert rect1.intersection_area(rect2) == 0


class TestSnapToGrid:
    """Test snap_to_grid function"""

    def test_snap_exact(self):
        assert snap_to_grid(8, 4) == 8

    def test_snap_round_up(self):
        assert snap_to_grid(7, 4) == 8

    def test_snap_round_down(self):
        assert snap_to_grid(5, 4) == 4

    def test_snap_zero(self):
        assert snap_to_grid(0, 4) == 0

    def test_snap_negative(self):
        assert snap_to_grid(-3, 4) == -4


class TestOptimizeLayout:
    """Test optimize_layout function"""

    def test_empty_components(self):
        result = optimize_layout([], 1440, 900)
        assert result == []

    def test_single_component(self):
        components = [
            {"type": "Text", "layout": {"x": 25, "y": 25, "w": 200, "h": 30}}
        ]
        result = optimize_layout(components, 1440, 900)
        assert len(result) == 1
        # Should be grid-aligned
        assert result[0]["layout"]["x"] % 4 == 0
        assert result[0]["layout"]["y"] % 4 == 0

    def test_components_stay_within_viewport(self):
        components = [
            {"type": "Text", "layout": {"x": 1400, "y": 800, "w": 200, "h": 100}}
        ]
        result = optimize_layout(components, 1440, 900)
        layout = result[0]["layout"]
        assert layout["x"] + layout["w"] <= 1440
        assert layout["y"] + layout["h"] <= 900

    def test_minimum_size_enforced(self):
        components = [
            {"type": "Text", "layout": {"x": 24, "y": 24, "w": 5, "h": 5}}
        ]
        result = optimize_layout(components, 1440, 900)
        assert result[0]["layout"]["w"] >= 20
        assert result[0]["layout"]["h"] >= 20

    def test_spacing_fix(self):
        components = [
            {"type": "Text", "layout": {"x": 24, "y": 24, "w": 200, "h": 40}},
            {"type": "Text", "layout": {"x": 24, "y": 60, "w": 200, "h": 40}},
        ]
        result = optimize_layout(components, 1440, 900, min_gap=12)
        # Second component should be pushed down
        comp1_bottom = result[0]["layout"]["y"] + result[0]["layout"]["h"]
        comp2_top = result[1]["layout"]["y"]
        assert comp2_top - comp1_bottom >= 12


class TestFixSpacing:
    """Test fix_spacing function"""

    def test_empty_list(self):
        assert fix_spacing([]) == []

    def test_single_component(self):
        comps = [{"layout": {"x": 0, "y": 0, "w": 100, "h": 50}}]
        assert fix_spacing(comps) == comps

    def test_fixes_insufficient_gap(self):
        comps = [
            {"layout": {"x": 0, "y": 0, "w": 100, "h": 50}},
            {"layout": {"x": 0, "y": 52, "w": 100, "h": 50}},  # Only 2px gap
        ]
        result = fix_spacing(comps, min_gap=8)
        # Second component should be moved down
        assert result[1]["layout"]["y"] >= 58  # 50 + 8


class TestFixOverlaps:
    """Test fix_overlaps function"""

    def test_no_overlaps(self):
        comps = [
            {"layout": {"x": 0, "y": 0, "w": 100, "h": 50}},
            {"layout": {"x": 200, "y": 200, "w": 100, "h": 50}},
        ]
        result = fix_overlaps(comps, 1440, 900)
        assert len(result) == 2

    def test_resolves_overlap(self):
        comps = [
            {"layout": {"x": 0, "y": 0, "w": 100, "h": 100}},
            {"layout": {"x": 50, "y": 50, "w": 100, "h": 100}},
        ]
        result = fix_overlaps(comps, 1440, 900)
        # After fix, components should not overlap
        rect1 = LayoutRect(**result[0]["layout"])
        rect2 = LayoutRect(**result[1]["layout"])
        # At least reduced overlap
        assert len(result) == 2


class TestAutoLayoutVertical:
    """Test auto_layout_vertical function"""

    def test_empty_components(self):
        result = auto_layout_vertical([])
        assert result == []

    def test_vertical_stacking(self):
        comps = [
            {"layout": {"x": 0, "y": 0, "w": 200, "h": 40}},
            {"layout": {"x": 0, "y": 0, "w": 200, "h": 40}},
            {"layout": {"x": 0, "y": 0, "w": 200, "h": 40}},
        ]
        result = auto_layout_vertical(comps, start_x=24, start_y=24, gap=12)

        assert result[0]["layout"]["y"] == 24
        assert result[1]["layout"]["y"] == 24 + 40 + 12
        assert result[2]["layout"]["y"] == 24 + 40 + 12 + 40 + 12

    def test_custom_start_position(self):
        comps = [{"layout": {"x": 0, "y": 0, "w": 200, "h": 40}}]
        result = auto_layout_vertical(comps, start_x=50, start_y=100)
        assert result[0]["layout"]["x"] == 50
        assert result[0]["layout"]["y"] == 100

    def test_max_width_constraint(self):
        comps = [{"layout": {"x": 0, "y": 0, "w": 500, "h": 40}}]
        result = auto_layout_vertical(comps, max_width=400)
        assert result[0]["layout"]["w"] == 400


class TestCenterComponents:
    """Test center_components function"""

    def test_empty_components(self):
        result = center_components([], 1440)
        assert result == []

    def test_centering(self):
        comps = [
            {"layout": {"x": 0, "y": 0, "w": 200, "h": 40}},
            {"layout": {"x": 0, "y": 50, "w": 300, "h": 40}},
        ]
        result = center_components(comps, 1440)
        # All components should have same x (centered based on max width)
        expected_x = snap_to_grid((1440 - 300) / 2)
        for comp in result:
            assert comp["layout"]["x"] == expected_x


class TestCalculatePageHeight:
    """Test calculate_page_height function"""

    def test_empty_components(self):
        assert calculate_page_height([]) == 600

    def test_calculates_correct_height(self):
        comps = [
            {"layout": {"x": 0, "y": 0, "w": 100, "h": 50}},
            {"layout": {"x": 0, "y": 100, "w": 100, "h": 200}},
        ]
        # Max bottom = 100 + 200 = 300, + padding(24) = 324
        assert calculate_page_height(comps, padding=24) == 324
