"""
Tests for component_library module
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from component_library import (
    COMPONENT_LIBRARY,
    get_component_table,
    get_component_default_size,
    get_component_default_props,
    get_all_component_types,
)


class TestComponentLibrary:
    """Test COMPONENT_LIBRARY dict"""

    def test_library_is_dict(self):
        assert isinstance(COMPONENT_LIBRARY, dict)

    def test_library_not_empty(self):
        assert len(COMPONENT_LIBRARY) > 0

    def test_all_components_have_required_fields(self):
        for comp_type, info in COMPONENT_LIBRARY.items():
            assert "category" in info, f"{comp_type} missing 'category'"
            assert "description" in info, f"{comp_type} missing 'description'"
            assert "default_size" in info, f"{comp_type} missing 'default_size'"
            assert "default_props" in info, f"{comp_type} missing 'default_props'"

    def test_all_components_have_valid_size(self):
        for comp_type, info in COMPONENT_LIBRARY.items():
            size = info["default_size"]
            assert "w" in size, f"{comp_type} size missing 'w'"
            assert "h" in size, f"{comp_type} size missing 'h'"
            assert size["w"] > 0, f"{comp_type} width must be > 0"
            assert size["h"] > 0, f"{comp_type} height must be > 0"

    def test_basic_components_exist(self):
        basic_types = ["Text", "Image", "Button", "Input"]
        for comp_type in basic_types:
            assert comp_type in COMPONENT_LIBRARY, f"Missing basic component: {comp_type}"

    def test_component_categories(self):
        categories = set()
        for info in COMPONENT_LIBRARY.values():
            categories.add(info["category"])
        # Should have at least basic and form categories
        assert len(categories) >= 2


class TestGetComponentTable:
    """Test get_component_table function"""

    def test_returns_string(self):
        table = get_component_table()
        assert isinstance(table, str)

    def test_table_contains_component_types(self):
        table = get_component_table()
        for comp_type in COMPONENT_LIBRARY:
            assert comp_type in table


class TestGetComponentDefaultSize:
    """Test get_component_default_size function"""

    def test_returns_dict_with_w_h(self):
        size = get_component_default_size("Text")
        assert "w" in size
        assert "h" in size

    def test_known_component(self):
        size = get_component_default_size("Button")
        assert size["w"] > 0
        assert size["h"] > 0

    def test_unknown_component_returns_default(self):
        size = get_component_default_size("UnknownType")
        # Should return some default, not crash
        assert "w" in size
        assert "h" in size


class TestGetComponentDefaultProps:
    """Test get_component_default_props function"""

    def test_returns_dict(self):
        props = get_component_default_props("Text")
        assert isinstance(props, dict)

    def test_text_has_content(self):
        props = get_component_default_props("Text")
        assert "content" in props

    def test_button_has_text(self):
        props = get_component_default_props("Button")
        assert "text" in props

    def test_unknown_component_returns_empty(self):
        props = get_component_default_props("UnknownType")
        assert isinstance(props, dict)


class TestGetAllComponentTypes:
    """Test get_all_component_types function"""

    def test_returns_list(self):
        types = get_all_component_types()
        assert isinstance(types, list)

    def test_contains_all_library_types(self):
        types = get_all_component_types()
        for comp_type in COMPONENT_LIBRARY:
            assert comp_type in types

    def test_no_duplicates(self):
        types = get_all_component_types()
        assert len(types) == len(set(types))
