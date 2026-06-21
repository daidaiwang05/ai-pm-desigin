"""
Tests for prompt_engine module
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from prompt_engine import (
    build_generate_prompt,
    build_refine_prompt,
    build_add_component_prompt,
    get_device_rules,
    validate_json_schema,
    SYSTEM_PROMPT,
)


class TestBuildGeneratePrompt:
    """Test build_generate_prompt function"""

    def test_basic_prompt_contains_requirements(self):
        prompt = build_generate_prompt("Create a login page")
        assert "Create a login page" in prompt
        assert "desktop" in prompt
        assert "1440" in prompt
        assert "900" in prompt

    def test_prompt_with_mobile_device(self):
        prompt = build_generate_prompt("Create a form", device_type="mobile")
        assert "mobile" in prompt
        assert "375" in prompt or "mobile" in prompt.lower()

    def test_prompt_with_custom_viewport(self):
        prompt = build_generate_prompt(
            "Create a page", viewport_w=800, viewport_h=600
        )
        assert "800" in prompt
        assert "600" in prompt

    def test_prompt_with_page_count(self):
        prompt = build_generate_prompt("Create pages", page_count=3)
        assert "3" in prompt

    def test_prompt_contains_component_table(self):
        prompt = build_generate_prompt("Create something")
        # Should contain at least some component types
        assert "Text" in prompt or "Button" in prompt or "Input" in prompt

    def test_prompt_with_existing_components(self):
        prompt = build_generate_prompt(
            "Add more components",
            existing_components=["Text", "Button"],
        )
        assert "Text" in prompt


class TestBuildRefinePrompt:
    """Test build_refine_prompt function"""

    def test_refine_prompt_contains_page_data(self, sample_page):
        prompt = build_refine_prompt(sample_page, "Make it blue")
        assert "Make it blue" in prompt
        assert "Test Page" in prompt

    def test_refine_prompt_contains_instruction(self, sample_page):
        prompt = build_refine_prompt(sample_page, "Add a header")
        assert "Add a header" in prompt


class TestBuildAddComponentPrompt:
    """Test build_add_component_prompt function"""

    def test_add_component_prompt(self, sample_page):
        prompt = build_add_component_prompt(
            sample_page, "Input", "Email input field"
        )
        assert "Input" in prompt
        assert "Email input field" in prompt

    def test_add_component_with_defaults(self, sample_page):
        prompt = build_add_component_prompt(
            sample_page, "Button", "Submit button"
        )
        assert "Button" in prompt
        # Should include default props
        assert "text" in prompt.lower() or "props" in prompt.lower()


class TestGetDeviceRules:
    """Test get_device_rules function"""

    def test_desktop_rules(self):
        rules = get_device_rules("desktop")
        assert "desktop" in rules.lower() or "1200" in rules

    def test_mobile_rules(self):
        rules = get_device_rules("mobile")
        assert "mobile" in rules.lower() or "16px" in rules

    def test_tablet_rules(self):
        rules = get_device_rules("tablet")
        assert "tablet" in rules.lower() or "20px" in rules

    def test_unknown_device_falls_back_to_desktop(self):
        rules = get_device_rules("unknown")
        assert len(rules) > 0  # Should return something, not empty


class TestValidateJsonSchema:
    """Test validate_json_schema function"""

    def test_valid_schema_returns_empty(self, sample_generate_response):
        errors = validate_json_schema(sample_generate_response)
        assert errors == []

    def test_missing_pages_field(self):
        errors = validate_json_schema({"no_pages": []})
        assert len(errors) > 0
        assert any("pages" in e for e in errors)

    def test_pages_not_list(self):
        errors = validate_json_schema({"pages": "not a list"})
        assert len(errors) > 0

    def test_page_missing_name(self):
        data = {"pages": [{"components": []}]}
        errors = validate_json_schema(data)
        assert any("name" in e for e in errors)

    def test_page_missing_components(self):
        data = {"pages": [{"name": "Page"}]}
        errors = validate_json_schema(data)
        assert any("components" in e for e in errors)

    def test_component_missing_type(self):
        data = {
            "pages": [
                {
                    "name": "Page",
                    "components": [{"layout": {"x": 0, "y": 0, "w": 100, "h": 50}}],
                }
            ]
        }
        errors = validate_json_schema(data)
        assert any("type" in e for e in errors)

    def test_component_missing_layout(self):
        data = {
            "pages": [
                {
                    "name": "Page",
                    "components": [{"type": "Text"}],
                }
            ]
        }
        errors = validate_json_schema(data)
        assert any("layout" in e for e in errors)

    def test_layout_missing_dimensions(self):
        data = {
            "pages": [
                {
                    "name": "Page",
                    "components": [
                        {"type": "Text", "layout": {"x": 0, "y": 0}}
                    ],
                }
            ]
        }
        errors = validate_json_schema(data)
        assert len(errors) > 0

    def test_non_dict_input(self):
        errors = validate_json_schema("not a dict")
        assert len(errors) > 0

    def test_empty_pages_list(self):
        data = {"pages": []}
        errors = validate_json_schema(data)
        assert errors == []  # Empty pages is valid


class TestSystemPrompt:
    """Test SYSTEM_PROMPT constant"""

    def test_system_prompt_is_string(self):
        assert isinstance(SYSTEM_PROMPT, str)

    def test_system_prompt_contains_json_schema(self):
        assert "pages" in SYSTEM_PROMPT
        assert "components" in SYSTEM_PROMPT
        assert "layout" in SYSTEM_PROMPT
