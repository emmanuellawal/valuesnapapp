import ast
from pathlib import Path

import pytest
from pydantic import ValidationError

from backend.models import ItemIdentity


REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_identification_prompt() -> str:
    source = (REPO_ROOT / "backend" / "services" / "ai.py").read_text()
    module = ast.parse(source)

    for node in module.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "IDENTIFICATION_PROMPT":
                    assert isinstance(node.value, ast.Constant)
                    assert isinstance(node.value.value, str)
                    return node.value.value

    raise AssertionError("IDENTIFICATION_PROMPT assignment not found")


def test_identification_prompt_removes_blank_unknown_escape_hatch():
    prompt = _load_identification_prompt().lower()

    assert 'say "unknown" if you cannot confidently identify something' not in prompt
    assert "blank unknown" not in prompt


def test_identification_prompt_requires_two_tier_identification():
    prompt = _load_identification_prompt().lower()

    assert "tier 1" in prompt
    assert "tier 2" in prompt
    assert "visual descriptors" in prompt
    assert "do not use unknown as a substitute for useful descriptors" in prompt


def test_identification_prompt_locks_condition_vocabulary():
    prompt = _load_identification_prompt()

    for condition in (
        "new",
        "used_excellent",
        "used_good",
        "used_fair",
        "damaged",
    ):
        assert condition in prompt

    assert "Use only one of these exact values" in prompt


def test_item_identity_rejects_free_text_visual_condition():
    with pytest.raises(ValidationError):
        ItemIdentity(
            item_type="speaker",
            brand="JBL",
            model="Clip 4",
            visual_condition="lightly used",
            condition_details="Minor scuffs visible.",
            search_keywords=["JBL Clip 4"],
        )
