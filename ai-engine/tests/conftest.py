"""
Shared test fixtures for AI Engine tests
"""

import pytest
import sys
import os

# Add parent directory to path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def sample_component():
    """Sample component for testing"""
    return {
        "type": "Text",
        "name": "Test Text",
        "props": {"content": "Hello World", "fontSize": 14},
        "layout": {"x": 24, "y": 24, "w": 200, "h": 24},
    }


@pytest.fixture
def sample_page():
    """Sample page for testing"""
    return {
        "name": "Test Page",
        "slug": "test",
        "components": [
            {
                "type": "Text",
                "name": "Title",
                "props": {"content": "Welcome", "fontSize": 24, "fontWeight": "bold"},
                "layout": {"x": 24, "y": 24, "w": 300, "h": 40},
            },
            {
                "type": "Button",
                "name": "Submit",
                "props": {"text": "Submit", "variant": "primary"},
                "layout": {"x": 24, "y": 80, "w": 120, "h": 44},
            },
        ],
    }


@pytest.fixture
def sample_generate_response():
    """Sample AI generate response"""
    return {
        "pages": [
            {
                "name": "Login Page",
                "slug": "login",
                "components": [
                    {
                        "type": "Text",
                        "name": "Title",
                        "props": {"content": "Login", "fontSize": 24},
                        "layout": {"x": 0, "y": 40, "w": 400, "h": 48},
                    },
                    {
                        "type": "Input",
                        "name": "Email",
                        "props": {"placeholder": "Email", "label": "Email"},
                        "layout": {"x": 0, "y": 100, "w": 360, "h": 48},
                    },
                ],
            }
        ],
        "usage": {"tokens": 100, "model": "test"},
    }
