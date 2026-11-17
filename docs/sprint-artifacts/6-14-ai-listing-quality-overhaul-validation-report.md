---
story_key: "6-14-ai-listing-quality-overhaul"
validation_date: "2026-11-17"
validator_model: "Grok 4.7"
original_score: 7
final_score: 10
improvements_found: 6
improvements_applied: 6
status: "improved"
---

# Validation Report: 6-14-ai-listing-quality-overhaul

**Story:** AI Listing Quality Overhaul  
**Validated:** 2026-11-17  
**Validator:** Grok 4.7

---

## Executive Summary

**Quality Score:** 7/10 → 10/10 (+3)

**Improvements Found:** 6 total
- 🔴 Critical: 1
- 🟡 Medium: 3
- 🟢 Low: 2

**Improvements Applied:** 6 (100% acceptance rate)

**Verdict:** Story improved through validation. 6 improvements applied. The implementer now has one validator hook, one generic-word list, an accurate temperature instruction, and the existing idempotency 422 path called out so it is not "fixed."

---

## Validator Scorecard

🎯 **Validator Scorecard**

Found 6 improvements:
- 🔴 Critical (1): Keyword fallback was aimed at a field validator that runs before brand normalization
- 🟡 Medium (3): Unused temperature setting, two generic-word lists, idempotency stores identification failures as 422
- 🟢 Low (2): Two local pytest interpreters, listing description can still name an abstained brand

**Original draft missed these because:**
- Confidence coercion and keyword cleanup were specified as two hooks, without Pydantic's field-validator-then-model-validator order
- Temperature was read from `backend/config.py` instead of the appraisal call
- The idempotency note covered the lookup, not the 422 completion a few lines later in `backend/main.py`

**Quality Score:** 7/10 → 10/10 (+3 improvement)

---

## Quality Score Breakdown

| Dimension | Before | After | Change |
|-----------|--------|-------|--------|
| **Completeness** | 2/2 | 2/2 | 0 |
| **Clarity** | 1/2 | 2/2 | +1 |
| **Actionability** | 1/2 | 2/2 | +1 |
| **Accuracy** | 1/2 | 2/2 | +1 |
| **Context Depth** | 2/2 | 2/2 | 0 |
| **TOTAL** | **7/10** | **10/10** | **+3** |

**Key Improvements:**
- One `model_validator(mode="after")` owns normalization, confidence coercion, and keyword filtering
- `GENERIC_IDENTITY_TOKENS` is the only generic-word list
- Temperature stays unsent
- Identification failures stay on the existing idempotency 422 path

---

## Detailed Findings

### Finding 1: CRITICAL - Keyword cleanup will fight the model validator

**Location:** Task C (`docs/sprint-artifacts/6-14-ai-listing-quality-overhaul.md`); live hook `backend/models.py` `ItemIdentity.ensure_keywords_not_empty`

**Description:** The draft told the implementer to replace the field validator that turns an empty keyword list into `["item"]`, while brand normalization lived in a later `model_validator`. In Pydantic v2 the field validator runs first, so the `after` hook would see keywords that were already rewritten and would not see the normalized brand.

**Reasoning:** Empty keywords plus a generic `item_type` are supposed to raise. A field validator that injects `["item"]` makes that raise unreachable. `info.data` only contains fields declared above `search_keywords`.

**Suggested Improvement:** Delete `ensure_keywords_not_empty`. Do brand/model normalization, confidence coercion, and keyword filtering in one `model_validator(mode="after")`. Keep `visible_observations` first for schema order only.

**Status:** accepted

---

### Finding 2: MEDIUM - "Temperature stays 0.0" is not what the call does

**Location:** Library and framework requirements, temperature bullet

**Description:** `backend/config.py` sets `openai_temperature = 0.0`. `backend/services/ai.py` never reads it. `_call_openai_api` does not pass `temperature`, so the Chat Completions default applies.

**Reasoning:** Wiring the unused setting into the call would change production sampling inside a prompt story.

**Suggested Improvement:** State that the call does not send `temperature`, leave `openai_temperature` unused, and do not add the argument in this story.

**Status:** accepted

---

### Finding 3: MEDIUM - Two generic-word lists

**Location:** Task C denylist versus the coercion table under Technical requirements

**Description:** Keywords dropped `miscellaneous` and `misc`. The generic `item_type` row did not. `item_type="misc"` with an empty keyword list would miss the LOW / `ValueError` path.

**Reasoning:** One story with two lists gets implemented as two lists.

**Suggested Improvement:** One `GENERIC_IDENTITY_TOKENS` frozenset in `backend/models.py`, used for keyword tokens and generic `item_type`, including `miscellaneous` and `misc`.

**Status:** accepted

---

### Finding 4: MEDIUM - A failed identification is stored on the idempotency key

**Location:** Previous-story idempotency note; behavior is `backend/main.py` `AIIdentificationError` handler

**Description:** `identify_item_from_image` wraps `ValidationError` as `AIIdentificationError`. `main.py` completes the idempotency key with status 422. The same key replays that 422 and does not call the model again. A new user tap already gets a new key from Story 6-13.

**Reasoning:** The likely "fix" is aborting the key so the user can retry, which reopens Story 6-13.

**Suggested Improvement:** Keyword/schema failure stays on the existing 422 completion path. Do not abort the key. Do not add a new error code.

**Status:** accepted

---

### Finding 5: LOW - Two virtualenvs both run pytest

**Location:** Task D command `backend/venv/bin/python -m pytest backend/`

**Description:** That command works (pytest 9.0.3, OpenAI 2.9.0). `backend/README.md` activates the repo `.venv` (OpenAI 2.16.0, pytest 9.0.2). Story 5.5-10 used `backend/venv`. Both still expose `client.beta.chat.completions.parse`.

**Reasoning:** The draft read as if only one interpreter existed.

**Suggested Improvement:** Name both. `backend/venv` is the 5.5-10 command. Either is acceptable if `pytest backend/` collects. Do not upgrade the SDK in this story.

**Status:** accepted

---

### Finding 6: LOW - Listing description can still name an abstained brand

**Location:** Known-hole paragraph and Task B description bullet

**Description:** The prompt said `description` may repeat a brand only when that field is not `unknown`. Nothing in the schema enforces it. Listing prefill uses that description.

**Reasoning:** The known hole covered a self-consistent `brand="Rolex"` at MEDIUM. It did not cover `brand="unknown"` plus a description that still says Rolex. A famous-brand denylist is the wrong fix.

**Suggested Improvement:** Add that case to the known hole. Prompt rule only. No description scrubber in this story.

**Status:** accepted

---

## User Decisions

**Total Findings:** 6  
**Accepted:** 6  
**Rejected:** 0  
**Modified:** 0  
**Acceptance Rate:** 100%

**Accepted Improvements:**
- CRITICAL: Keyword cleanup will fight the model validator (Task C / `backend/models.py`)
- MEDIUM: Temperature is not sent on the appraisal call (Library requirements)
- MEDIUM: Two generic-word lists (Task C and the coercion table)
- MEDIUM: Identification failure is stored as idempotency 422 (`backend/main.py`)
- LOW: Two pytest virtualenvs (Task D)
- LOW: Description can still name an abstained brand (Known hole)

---

## Validator Notes

### Analysis Methodology

The validator re-read the story against the Epic 6 plan, the Epic 8 decision and plan, Story 5.5-10, Story 6-13, `docs/architecture.md`, `docs/ux-design-specification.md`, and `docs/SWISS-MINIMALIST.md`, then checked the live call sites.

**Systematic Checklist Applied:**
- [x] All ACs are implementable (no vague requirements)
- [x] Tasks map correctly to ACs (every AC has corresponding tasks)
- [x] Dev notes are comprehensive (architecture, patterns, constraints)
- [x] Previous story learnings are referenced and applied
- [x] Architecture alignment verified (live paths override stale `ai_interpreter.py` names in `docs/architecture.md`)
- [x] Anti-patterns documented (what NOT to do)
- [x] Testing strategy is clear (how to verify)
- [x] File structure matches project conventions
- [x] TypeScript/types are properly specified (no mobile type change; `transformItemDetails` ignores extra identity keys)
- [x] Accessibility requirements included (if applicable) — N/A, no screen change. Swiss Minimalist rules are N/A for the same reason.

**Core Validation Question:** "Can Amelia (DEV agent) implement this story without asking any clarification questions?"

**Answer:** YES, after the six edits. Before them, the answer was NO: the keyword hook, the temperature sentence, and the idempotency failure path each required a guess.

### Patterns Observed

- **Prompt-only rules fail closed only when the schema enforces them.** Story 5.5-10 already proved this for `visual_condition`. The same split showed up again as a field validator versus an `after` validator.
- **Config defaults are not call behavior.** `openai_temperature` looks like a product decision and is dead code.
- **Epic 8 scope held.** No finding asked this story to take retrieval, Gate A, or a model swap.

### Recommendations

- Implement from the updated story file. Do not reopen the six decisions during `dev-story`.
- The five-photo re-check is still manual and still blocked if those files are gone. That is an explicit completion-note outcome, not a missing requirement.
- Story status stays `ready-for-dev`. Validation does not move it.

---

## Competitive Stats

**Validator Performance:**
- Findings identified: 6
- Quality improvement: +3 points
- User acceptance rate: 100%

**Validator Success:** Found 6 improvements the original draft missed, improving story quality by 3 points.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-11-17 | Validation completed - 6 improvements applied | Grok 4.7 |

---

_This validation report was generated by the validate-create-story workflow._
