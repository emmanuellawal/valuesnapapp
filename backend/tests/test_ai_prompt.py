import ast
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from backend.models import (
    GENERIC_IDENTITY_TOKENS,
    MIN_VISIBLE_OBSERVATIONS,
    ItemIdentity,
)


REPO_ROOT = Path(__file__).resolve().parents[2]

# Long enough to clear MIN_VISIBLE_OBSERVATIONS regardless of its exact value.
GROUNDED_OBSERVATIONS = (
    "Black over-ear headphones with a padded headband, folding hinges, "
    "and the text 'SONY' printed on the band; USB-C port on the right earcup."
)


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


def _identity(**overrides) -> ItemIdentity:
    data = dict(
        visible_observations=GROUNDED_OBSERVATIONS,
        item_type="wireless headphones",
        brand="Sony",
        model="WH-1000XM4",
        visual_condition="used_good",
        condition_details="Light scuffs on earcups.",
        search_keywords=["Sony WH-1000XM4", "over-ear noise cancelling"],
        ai_identification_confidence="HIGH",
    )
    data.update(overrides)
    return ItemIdentity(**data)


# ---------------------------------------------------------------------------
# Prompt tests
# ---------------------------------------------------------------------------


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


def test_identification_prompt_describes_before_naming():
    prompt = _load_identification_prompt().lower()

    obs_header = prompt.find("**visible observations")
    identify_header = prompt.find("**identify**:")
    assert obs_header != -1, "prompt must have a visible-observations section"
    assert identify_header != -1, "prompt must have an identify section"
    assert obs_header < identify_header, "observations section must come before naming"


def test_identification_prompt_drops_bland_pressure_line():
    prompt = _load_identification_prompt().lower()

    assert "do not leave the output bland" not in prompt


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


# ---------------------------------------------------------------------------
# Schema tests
# ---------------------------------------------------------------------------


def test_item_identity_rejects_free_text_visual_condition():
    with pytest.raises(ValidationError):
        ItemIdentity(
            visible_observations=GROUNDED_OBSERVATIONS,
            item_type="speaker",
            brand="JBL",
            model="Clip 4",
            visual_condition="lightly used",
            condition_details="Minor scuffs visible.",
            search_keywords=["JBL Clip 4"],
        )


def test_visible_observations_is_required():
    with pytest.raises(ValidationError):
        ItemIdentity(
            item_type="speaker",
            brand="JBL",
            model="Clip 4",
            visual_condition="used_good",
            condition_details="Minor scuffs visible.",
            search_keywords=["JBL Clip 4"],
        )


def test_visible_observations_is_first_schema_field():
    assert list(ItemIdentity.model_fields)[0] == "visible_observations"


def test_grounded_specific_identity_stays_high():
    identity = _identity()

    assert identity.ai_identification_confidence == "HIGH"
    assert identity.brand == "Sony"
    assert identity.model == "WH-1000XM4"


@pytest.mark.parametrize("brand,model", [("unknown", "WH-1000XM4"), ("Sony", "unknown")])
def test_high_with_unknown_brand_or_model_coerces_to_medium(brand, model):
    identity = _identity(brand=brand, model=model)

    assert identity.ai_identification_confidence == "MEDIUM"


@pytest.mark.parametrize("junk", ["n/a", "NA", "None", "null", "Unidentified", "  item  "])
def test_junk_brand_normalizes_to_unknown_and_blocks_high(junk):
    identity = _identity(brand=junk)

    assert identity.brand == "unknown"
    assert identity.ai_identification_confidence == "MEDIUM"


def test_high_with_thin_observations_coerces_to_medium():
    thin = "x" * (MIN_VISIBLE_OBSERVATIONS - 1)
    identity = _identity(visible_observations=thin)

    assert identity.ai_identification_confidence == "MEDIUM"


def test_observations_at_minimum_length_keep_high():
    exact = "x" * MIN_VISIBLE_OBSERVATIONS
    identity = _identity(visible_observations=exact)

    assert identity.ai_identification_confidence == "HIGH"


def test_whitespace_padding_does_not_count_as_observations():
    padded = " " * (MIN_VISIBLE_OBSERVATIONS * 2) + "short"
    identity = _identity(visible_observations=padded)

    assert identity.ai_identification_confidence == "MEDIUM"


def test_generic_item_type_is_replaced_by_specific_keyword():
    identity = _identity(
        brand="unknown",
        model="unknown",
        item_type="item",
        search_keywords=["blue ceramic vase with handle"],
        ai_identification_confidence="HIGH",
    )

    assert identity.item_type == "blue ceramic vase with handle"
    assert identity.search_keywords == ["blue ceramic vase with handle"]
    # Category is now specific and the name is not, so HIGH drops to MEDIUM.
    assert identity.ai_identification_confidence == "MEDIUM"


def test_low_stays_low_after_generic_item_type_is_replaced():
    identity = _identity(
        brand="unknown",
        model="unknown",
        item_type="n/a",
        search_keywords=["blue ceramic vase"],
        ai_identification_confidence="LOW",
    )

    assert identity.item_type == "blue ceramic vase"
    assert identity.ai_identification_confidence == "LOW"


def test_medium_with_unknown_identity_and_specific_item_type_is_unchanged():
    identity = _identity(
        brand="unknown",
        model="unknown",
        ai_identification_confidence="MEDIUM",
    )

    assert identity.ai_identification_confidence == "MEDIUM"


def test_low_is_never_raised():
    identity = _identity(ai_identification_confidence="LOW")

    assert identity.ai_identification_confidence == "LOW"


def test_confidence_coercion_logs_warning(caplog):
    with caplog.at_level("WARNING", logger="backend.models"):
        _identity(brand="unknown")

    assert any("confidence" in r.message.lower() for r in caplog.records)


# ---------------------------------------------------------------------------
# Keyword abstention tests
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "keywords",
    [[], ["item"], ["Item", "  object ", "UNKNOWN"], ["", "  ", "!!!"], ["item", "  "], ["n/a"]],
)
def test_generic_or_empty_keywords_fall_back_to_item_type(keywords):
    identity = _identity(
        brand="unknown",
        model="unknown",
        item_type="over-ear wireless headphones",
        search_keywords=keywords,
        ai_identification_confidence="MEDIUM",
    )

    assert identity.search_keywords == ["over-ear wireless headphones"]
    assert "item" not in [k.lower() for k in identity.search_keywords]


def test_generic_keywords_are_filtered_but_specific_ones_kept_in_order():
    identity = _identity(
        search_keywords=["item", "Sony WH-1000XM4", "product", "black over-ear headphones"],
    )

    assert identity.search_keywords == ["Sony WH-1000XM4", "black over-ear headphones"]


@pytest.mark.parametrize("keywords", [[], ["item"], ["thing", "stuff"]])
def test_generic_item_type_with_no_specific_keyword_raises(keywords):
    with pytest.raises(ValueError):
        _identity(
            brand="unknown",
            model="unknown",
            item_type="item",
            search_keywords=keywords,
            ai_identification_confidence="LOW",
        )


def test_every_generic_token_is_rejected_as_item_type_fallback():
    for token in GENERIC_IDENTITY_TOKENS:
        with pytest.raises(ValueError):
            _identity(
                brand="unknown",
                model="unknown",
                item_type=token,
                search_keywords=[],
            )


def test_placeholder_keywords_do_not_survive_next_to_a_real_one():
    identity = _identity(search_keywords=["!!!", "Sony WH-1000XM4", "", "n/a"])

    assert identity.search_keywords == ["Sony WH-1000XM4"]
    assert identity.ai_identification_confidence == "HIGH"


# ---------------------------------------------------------------------------
# Fixtures and failure path
# ---------------------------------------------------------------------------


def test_high_mock_fixtures_stay_high():
    from backend.services.mocks.mock_ai import MOCK_ITEMS

    named = {(m.brand, m.model): m for m in MOCK_ITEMS if m.brand != "unknown"}
    assert {("Rolex", "Submariner"), ("Sony", "WH-1000XM4"), ("Herman Miller", "Aeron")} <= set(named)
    for item in named.values():
        assert item.ai_identification_confidence == "HIGH"
        assert len(item.visible_observations.strip()) >= MIN_VISIBLE_OBSERVATIONS


def test_unknown_brand_mocks_stay_low():
    from backend.services.mocks.mock_ai import MOCK_ITEMS

    unknown = [m for m in MOCK_ITEMS if m.brand == "unknown"]
    assert unknown
    for item in unknown:
        assert item.ai_identification_confidence == "LOW"
        assert "item" not in [k.lower() for k in item.search_keywords]


@pytest.mark.asyncio
async def test_generic_keyword_dead_end_becomes_ai_identification_error(monkeypatch):
    from backend.config import settings
    from backend.services import ai

    monkeypatch.setattr(settings, "use_mock", False)
    monkeypatch.setattr(ai, "_get_client", lambda: object())

    async def _fake_call(client, base64_image):
        # openai.lib._parsing._completions._parse_content calls model_validate_json.
        # A generic-only payload must fail there, then the existing handler wraps it.
        return ItemIdentity.model_validate_json(json.dumps({
            "visible_observations": GROUNDED_OBSERVATIONS,
            "item_type": "item",
            "brand": "unknown",
            "model": "unknown",
            "visual_condition": "used_good",
            "condition_details": "No readable markings.",
            "search_keywords": ["item"],
            "ai_identification_confidence": "LOW",
        }))

    monkeypatch.setattr(ai, "_call_openai_api", _fake_call)

    with pytest.raises(ai.AIIdentificationError) as exc_info:
        await ai.identify_item_from_image("ignored")

    assert exc_info.value.code == "AI_IDENTIFICATION_FAILED"
    assert isinstance(exc_info.value.original_error, ValidationError)


@pytest.mark.asyncio
async def test_missing_parsed_identity_becomes_ai_identification_error(monkeypatch):
    from backend.config import settings
    from backend.services import ai

    monkeypatch.setattr(settings, "use_mock", False)
    monkeypatch.setattr(ai, "_get_client", lambda: object())

    async def _fake_call(client, base64_image):
        return None

    monkeypatch.setattr(ai, "_call_openai_api", _fake_call)

    with pytest.raises(ai.AIIdentificationError) as exc_info:
        await ai.identify_item_from_image("ignored")

    assert exc_info.value.code == "AI_IDENTIFICATION_FAILED"
    assert "no parsed" in exc_info.value.message
