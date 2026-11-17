# Story 6.14: AI Listing Quality Overhaul

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a seller using ValueSnap,
I want the identifier to describe what is actually visible before it names a product, and to abstain when that evidence is weak,
so that a listing draft is not prefilled with a confident, wrong brand and model.

## Background

Story 5.5-10 removed the blanket “say unknown” escape hatch and compared `gpt-4o-mini` with `gpt-4o` on five real photos. Both models scored **0/5**. Three of the five came back as a different famous product at **HIGH** confidence (Rolex Submariner for a JBL speaker and a PS5 controller; Herman Miller Aeron for an aquarium filter). The prompt fix moved the failure from vague unknowns to confident category hallucinations.

The required follow-up is describe-first visual grounding plus abstention. A later model swap did nothing on that set.

**Governing constraint (overrides older Epic 6 wording where they conflict):** `docs/sprint-artifacts/epic-8-evidence-integrity-decision.md` item 10 and `docs/sprint-artifacts/epic-8-plan.md`. This story is one-photo grounding and abstention only. It may run beside Epic 8. It does not implement Epic 8.

## Acceptance Criteria

1. The identification prompt and `ItemIdentity` schema require a describe-first visible-observations field before brand/model naming.
2. `ai_identification_confidence="HIGH"` is impossible when brand or model is unknown/blank, or when visible observations are missing/too thin. Enforcement is in the Pydantic model, not only in prompt text.
3. Abstention keeps brand and model as `unknown`, keeps a specific `item_type`, and emits concrete visual-descriptor `search_keywords`. The generic placeholder `item` (and the same class of empty words) is not a legal keyword fallback.
4. A measured re-check is recorded in Completion Notes: same five-photo set as 5.5-10 if those files are still available locally, otherwise an explicit “photos unavailable” block. No substitute corpus.
5. Runtime model stays `gpt-4o-mini` (`backend/config.py` default and Render `OPENAI_MODEL` untouched). This story does not propose a tier change.
6. Story file gains a `## Code Review` section before status moves to `done` (added by the code-review workflow, not during implementation).

## Tasks / Subtasks

- [x] Task A — Schema grounding field and confidence guard (AC: 1, 2)
  - [x] Add required `visible_observations: str` as the **first** field on `ItemIdentity` in `backend/models.py` (no empty-string default).
  - [x] Define `MIN_VISIBLE_OBSERVATIONS = 40` and `GENERIC_IDENTITY_TOKENS` next to `ItemIdentity`. Tests import both. Do not hardcode a second `40` or a second word list.
  - [x] Add `logger = logging.getLogger(__name__)` in `backend/models.py`. Log each confidence coercion at warning. Do not `print`.
  - [x] Delete `ItemIdentity.ensure_keywords_not_empty`. Do brand/model normalization, confidence coercion, and keyword filtering in one `model_validator(mode="after")`. A field validator runs before that hook and would rewrite keywords before normalization.
  - [x] In that validator, strip brand/model; if the whole value is in `GENERIC_IDENTITY_TOKENS` or is `n/a`, `na`, `none`, `null`, or `unidentified` (case-insensitive), store `unknown`.
  - [x] Apply the locked coercion table under Dev Notes → Technical requirements. That table is the only copy of the rules.
  - [x] Do not raise on a coercible HIGH. Raise only for the generic-keyword failure in Task C. A validation error fails the whole appraisal; coercion still returns a usable abstention.
- [x] Task B — Prompt rewrite in place (AC: 1, 3)
  - [x] Edit `IDENTIFICATION_PROMPT` in `backend/services/ai.py`. Keep the existing constant and `client.beta.chat.completions.parse(..., response_format=ItemIdentity)` call.
  - [x] Order: visible observations first (shape, colors, materials, text/logos **as read**, form factor, connectors). Then name brand/model only from that description. Then condition, identifiers, keywords, listing description, confidence.
  - [x] Delete the instruction “Do NOT leave the output bland when brand/model is uncertain”. That line fights abstention.
  - [x] Keep “Do not use Unknown as a substitute for useful descriptors” — it applies to `item_type` and `search_keywords`, not to brand/model.
  - [x] Keep Tier 1 / Tier 2 language so the current prompt tests still have those anchors. Tier 1 is grounded naming only. Tier 2 is brand/model `unknown` plus specific descriptors.
  - [x] Listing `description` may repeat a brand/model only when that field is not `unknown`. Prompt rule only. Do not add a description scrubber or a famous-brand denylist.
  - [x] Keep the five `visual_condition` enum values and the no-price rules.
- [x] Task C — Keyword abstention fallback (AC: 3)
  - [x] Remove `ensure_keywords_not_empty`. Filter keywords inside the Task A `model_validator(mode="after")`, after brand/model normalization.
  - [x] `GENERIC_IDENTITY_TOKENS` is `item`, `object`, `product`, `thing`, `unknown`, `stuff`, `miscellaneous`, `misc`. Drop a keyword when its normalized form is only one of those tokens.
  - [x] If nothing specific remains and `item_type` is specific, use `[item_type]`. If `item_type` is also in `GENERIC_IDENTITY_TOKENS`, raise `ValueError`.
  - [x] That `ValueError` stays inside `identify_item_from_image`'s existing `Exception` handler and becomes `AIIdentificationError` (`AI_IDENTIFICATION_FAILED`). `backend/main.py` already completes the idempotency key with that 422. Do not abort the key. A new user tap already gets a new key from Story 6-13.
  - [x] The empty-keyword branch in `identify_item_from_image` must not reintroduce `"item"`. The validator should have already filled or rejected the list.
  - [x] Keyword list stays 3–5 phrases when the model complies. Put the single most specific phrase first.
- [x] Task D — Tests that fail on the old behavior (AC: 1, 2, 3)
  - [x] Extend `backend/tests/test_ai_prompt.py`: describe-first (`visible_observations` appears before brand/model instructions), bland-pressure line absent, escape-hatch test still passes, condition enum test still passes.
  - [x] Add model tests: HIGH + `brand="unknown"` coerces off HIGH; HIGH + observations shorter than `MIN_VISIBLE_OBSERVATIONS` coerces off HIGH; keywords `[]` or `["item"]` do not persist as `["item"]` when `item_type` is specific; `item_type` in `GENERIC_IDENTITY_TOKENS` plus no specific keyword raises `ValueError`. Import both constants from `backend.models`. Do not copy the number or the word list into the test.
  - [x] Update every `ItemIdentity(...)` constructor to pass `visible_observations`. Known sites: `backend/services/mocks/mock_ai.py`, `backend/tests/test_ai_prompt.py`, `backend/tests/integration/test_confidence_integration.py`.
  - [x] These HIGH fixtures must stay HIGH. Pass `visible_observations` of at least `MIN_VISIBLE_OBSERVATIONS` characters and leave brand/model specific:
    - `mock_ai_high_confidence` in `backend/tests/integration/test_confidence_integration.py` (Sony WH-1000XM4)
    - `MOCK_ITEMS` Rolex Submariner, Sony WH-1000XM4, and Herman Miller Aeron in `backend/services/mocks/mock_ai.py`
    A shorter string coerces them to MEDIUM and fails `test_high_confidence_end_to_end` for the wrong reason. Lengthen the observation text. Do not weaken the validator to keep that test green.
  - [x] Unknown-brand mocks (hardcover novel, decorative object) stay `LOW`.
  - [x] Add `visible_observations` to the required-field list in `backend/tests/integration/test_ai_integration.py`.
  - [x] Run pytest with either existing interpreter. `backend/venv/bin/python -m pytest backend/tests/test_ai_prompt.py` then `backend/venv/bin/python -m pytest backend/` is the Story 5.5-10 command (OpenAI 2.9.0). Repo `.venv` also has pytest (OpenAI 2.16.0) and is what `backend/README.md` activates. Either is acceptable if collection succeeds. Do not upgrade the SDK. Do not add network smoke scripts (5.5-10 deleted those because collection hung).
- [x] Task E — Manual five-photo re-check (AC: 4, 5)
  - [x] Images stay out of the repo. `eval/` was deleted on purpose in 5.5-10. Do not recreate it, do not commit photos, do not use `backend/tests/fixtures/TEST_IMAGES.json` as this quality gate.
  - [x] The five files are on disk. Windows: `C:\Users\elawa\OneDrive\Pictures\testpics`. From this WSL workspace: `/mnt/c/Users/elawa/OneDrive/Pictures/testpics`. Use only `btxr2.png`, `jblclip.png`, `massagegun.png`, `ps5cont.png`, and `topfin.png`.
  - [x] Ignore the other files in that folder. `mini-btxr2.png`, `mini-jblclip.png`, `mini-massagegun.png`, `mini-ps5cont.png`, and `mini-topfin.png` are same-size copies from the 5.5-10 model runs, not a second set. `990s.png`, `book.png`, `cologneblack.png`, `colognewhite.png`, and `hungergame.png` are out of scope.
  - [x] Re-identify the five with the current default model only, after the prompt and validator change. Load `OPENAI_API_KEY` from `backend/.env`. Do not add a `backend/test_*.py` script. Pytest collection must not grow a network test.
  - [x] Record one table in Completion Notes: file, expected item, brand, model, confidence, and verdict (`correct name`, `correct abstention`, or `wrong name`). One pass. Do not rerun until that table is written.
  - [x] Pass bar for the three hallucination rows (`jblclip.png`, `ps5cont.png`, `topfin.png`): not HIGH confidence on an unrelated famous product. `unknown` brand/model plus descriptor keywords counts as success on those rows. Do not require 5/5 exact names. A miss on that bar means the story is not done. Write the table anyway.
  - [x] Confirm `openai_model` default is still `gpt-4o-mini` and do not change Render.

## Dev Notes

### Scope boundary (do not cross)

In this story, do **not**:

- Edit retrieval. `backend/services/ebay.py` joins `search_keywords[:3]` with spaces into one `q` and still calls `search_sold_listings`. Leave that function, the `<5` broaden path, GTIN/EPID/category ladder, and cache-key formula alone. Those are Stories 8.1 and 8.2.
- Edit `backend/services/confidence.py` or `backend/services/readiness.py`. Market HIGH already requires `ai_confidence == "HIGH"`. `SELL_NOW` already requires known brand, known model, and AI confidence not `LOW`. Removing `SELL_NOW` is Story 8.1. Scoring comparables is 8.4–8.5.
- Run a model bakeoff (mini vs 4o vs Luna vs Terra). That is Story 8.7, and it is blocked on retrieval work this story must not do.
- Build the 50-photo Gate A set. That is Story 8.6.
- Change desktop UX (6.10) or add a second/third photo as the default capture.
- Touch idempotency (`Idempotency-Key`, `backend/services/idempotency.py`). A grounded abstention is still one appraisal result for that key.

**Known hole, leave it:** a model can still emit `brand="Rolex"` at `MEDIUM` with a self-consistent `visible_observations` paragraph that also says Rolex. The same call can set `brand="unknown"` and still write "Rolex" in `description`. One structured completion cannot prove the observations were written first, and a famous-brand denylist is the wrong fix. This story stops ungrounded **HIGH** claims and generic keyword collapse. It does not make hallucination impossible, and it does not stop `SELL_NOW` when the model’s brand string is a confident lie at MEDIUM. Do not “fix” that by editing readiness or by scrubbing `description`.

### Technical requirements

**Confidence coercion (locked):**

| Parsed state | Stored `ai_identification_confidence` |
|---|---|
| brand and model both specific, observations ≥ `MIN_VISIBLE_OBSERVATIONS`, model said HIGH | HIGH |
| brand or model `unknown`, model said HIGH, `item_type` specific | MEDIUM |
| brand or model `unknown`, `item_type` in `GENERIC_IDENTITY_TOKENS` | LOW |
| observations shorter than `MIN_VISIBLE_OBSERVATIONS`, model said HIGH | MEDIUM |
| model said MEDIUM or LOW | unchanged, unless the generic item_type row above applies |

`MEDIUM` is the right downgrade for “category is clear, name is not”. `LOW` is for when the category itself is empty. Market HIGH cannot fire after either downgrade, because market HIGH requires AI HIGH. Readiness `exact_identity` still fails when brand or model is `unknown`, even at MEDIUM.

**Keyword downstream effect, do not “optimize” it here:** only the first three keywords are searched, space-joined. A long stack of vague phrases in slots 1–3 becomes one bad query. The prompt should put the best descriptor phrase first. Changing the join to a ladder is out of scope.

**Cache:** `get_cache_key` hashes brand, model, item_type, `category`, and sorted keywords. It does not hash `visible_observations`. Do not add it. Do not “fix” the unused `category` vs `category_hint` mismatch in this story.

**Persistence:** `identity.model_dump()` is stored as `ai_response`. New rows gain `visible_observations`. Old rows will not have the key. Do not run a backfill. Mobile `transformItemDetails` (`apps/mobile/types/transformers.ts`) copies a fixed field list and ignores unknown keys, so no mobile change is required. Do not add a UI for observations.

**Failure path:** `ValueError` / `ValidationError` from the `after` validator lands in `AIIdentificationError` (`AI_IDENTIFICATION_FAILED`) inside `identify_item_from_image`. Reuse it. Do not add a new error code. `backend/main.py` then stores that payload with `_complete_idempotency_response(..., status_code=422)`. The same `Idempotency-Key` replays the 422 and does not call the model again. Leave that path alone.

### Architecture compliance

`docs/architecture.md` still names `app/services/ai_interpreter.py` and `confidence_service.py`. Those paths are stale. Live code is:

- `backend/services/ai.py` — prompt + `identify_item_from_image`
- `backend/models.py` — `ItemIdentity`, `VisualCondition`, `AIConfidenceLevel`
- `backend/config.py` — `openai_model: str = "gpt-4o-mini"`. `openai_temperature` defaults to `0.0` and is not read by the appraisal call.
- `backend/services/confidence.py` — market confidence (do not change)
- `backend/services/readiness.py` — sell-readiness (do not change)
- `backend/services/ebay.py` — keyword join at `get_market_data_for_item` (do not change)

Trust-through-transparency in the architecture doc means the confidence value the user sees must match evidence. That is satisfied here by refusing HIGH on weak identity, not by rewriting the market-confidence thresholds.

### Library and framework requirements

- OpenAI Python SDK is pinned `openai>=1.0.0` in `backend/requirements.txt`. Stay on `AsyncOpenAI` and `client.beta.chat.completions.parse` with `response_format=ItemIdentity`. That helper still exists on OpenAI 2.9.0 (`backend/venv`) and 2.16.0 (repo `.venv`). Do not migrate this call to the Responses API and do not upgrade the SDK in this story.
- `_call_openai_api` does not pass `temperature`. `settings.openai_temperature` is unused. Do not start sending it in this story. Chat Completions will keep using the API default.
- Model string stays `gpt-4o-mini` unless the environment already overrides `OPENAI_MODEL`. Do not set a new override.
- Pydantic v2: delete the `search_keywords` field validator. Use one `model_validator(mode="after")` for brand/model normalization, confidence coercion, and keyword filtering. Parsed API responses go through `model_validate`, so this hook runs on live model output. A field validator cannot see the normalized brand, because it runs first.
- `MIN_VISIBLE_OBSERVATIONS = 40` and `GENERIC_IDENTITY_TOKENS` live in `backend/models.py`. Tests import them. `40` is a floor against empty or one-token observations, not a measure of description quality.
- Field order on the Pydantic model is the structured-output order. `visible_observations` must be declared first. That order is for the schema, not a reason to keep a field validator.

### File structure requirements

Touch:

- `backend/models.py`
- `backend/services/ai.py`
- `backend/services/mocks/mock_ai.py` (constructors only, so mocks still instantiate)
- `backend/tests/test_ai_prompt.py`
- `backend/tests/integration/test_confidence_integration.py` (constructor only)
- `backend/tests/integration/test_ai_integration.py` (required-field list)
- This story file’s Dev Agent Record when implementation finishes

Do not touch:

- `apps/mobile/**` unless a test actually fails because a fixture constructs a backend `ItemIdentity` (it should not; mobile fixtures are camelCase `ItemDetails`)
- `backend/services/ebay.py`, `backend/services/confidence.py`, `backend/services/readiness.py`, `backend/cache.py`, `backend/services/idempotency.py`
- `render.yaml`, `docs/deployment/README.md` (no model change to record)
- `docs/architecture.md` (stale; not this story’s cleanup)

Working tree warning: `main` is dirty with unpublished Epic 6 and Epic 8 work (readiness, ebay, history, sprint status, and others). Do not revert, reformat, or “finish” those files while implementing 6-14. Stage only the files this story lists.

### Testing requirements

- Prompt tests must keep reading the source via `Path(__file__).resolve().parents[2]` (5.5-10 review). Do not use a CWD-relative path.
- CI gate is the pytest prompt/schema tests. The five-photo run is manual and stays out of pytest collection.
- Full command after the change: `backend/venv/bin/python -m pytest backend/` (Story 5.5-10 interpreter) or the repo `.venv` interpreter from `backend/README.md`. Do not upgrade OpenAI while running them.
- HIGH fixtures listed in Task D must stay HIGH. A short `visible_observations` on those objects is a bad fixture, not a reason to change the coercion table.
- Mobile suite is not required if no mobile file changes. If one changes, run the existing targeted Jest file only, then say why.

### Previous story intelligence

**5.5-10 (the actual parent of this story):**

- Prompt-only constraints lie. `visual_condition` was prompt-locked and still accepted free text until `VisualCondition = Literal[...]` rejected it. Copy that pattern: prompt plus schema.
- Deleting the unknown escape hatch without a grounding step produced the HIGH-confidence Rolex/Aeron failures. Do not bring the escape hatch back. Do not leave brand/model free to be a famous guess.
- Both models 0/5. Cost of 4o was 10–17× for the same wrong answers. No upgrade.
- `eval/` deletion was intentional. Do not commit a new harness or photo set.
- Legacy `backend/test_*.py` smoke scripts were deleted because `pytest backend/` collected them and hung on network imports. Do not add new top-level scripts.

**6-13 (previous numbered story, already done):**

- Idempotency lookup happens before the AI call so retries do not double-spend tokens. Grounding changes the identification result; it must not skip or reshuffle that lookup.
- `AIIdentificationError` is already stored on the key as HTTP 422 via `_complete_idempotency_response` in `backend/main.py`. A keyword `ValueError` that becomes that error replays the 422 for the same key. Do not abort the key to "let the user retry." A new tap already gets a new key.
- Code review section is required on the story file before `done`.
- This story does not change the `Idempotency-Key` contract.

### Git intelligence

Latest commits on `main` are from the 6-7 / 6-8 window (`4f03108`, `d8fa43d`, `863acf7`, `b2d33d6`, `8ca20b4`). They are a poor map of the tree you will edit. Stories 6-9 through 6-13 and the Epic 8 decision docs are local uncommitted work. Read the current files on disk, not those commit snapshots, before changing `ai.py` or `models.py`.

### Latest technical information

No SDK migration. Structured parse through the installed OpenAI client is the project contract. A newer Responses API exists; adopting it here would mix a client migration into a prompt/schema fix and is out of scope.

The 5.5-10 numbers are still the evidence base: mini and 4o produced the same wrong HIGH labels. Current knowledge does not justify a model change inside this story. Story 8.7 is where a controlled comparison is allowed, after retrieval is frozen, and even that story forbids a production model change.

### Project context

No `project-context.md` exists in the repo. Use the sources in References. Where `docs/epics.md`, `docs/prd.md`, or `docs/ux-design-specification.md` still talk about sold-price appraisals or “verified” value, the Epic 8 decision record wins. This story does not rewrite those docs.

### References

- [Source: docs/sprint-artifacts/epic-6-plan.md#Story 6-14: AI Listing Quality Overhaul]
- [Source: docs/sprint-artifacts/epic-8-evidence-integrity-decision.md] — item 10, 6-14 scope lock
- [Source: docs/sprint-artifacts/epic-8-plan.md] — “6-14 may run in parallel and must not absorb 8.2–8.7”; out-of-scope table
- [Source: docs/sprint-artifacts/5.5-10-evaluate-openai-model-upgrade.md] — 0/5 table, hallucination root cause, schema-enum review fix
- [Source: backend/services/ai.py] — `IDENTIFICATION_PROMPT`, `_call_openai_api`, keyword fallback
- [Source: backend/models.py] — `ItemIdentity`, `ensure_keywords_not_empty` currently returning `["item"]`
- [Source: backend/services/ebay.py] — `search_keywords[:3]` join inside `get_market_data_for_item`
- [Source: backend/services/confidence.py] — market HIGH requires `ai_confidence == "HIGH"`
- [Source: backend/services/readiness.py] — `SELL_NOW` / `exact_identity` rules; do not edit
- [Source: backend/services/mocks/mock_ai.py] — four `ItemIdentity` constructors
- [Source: apps/mobile/types/transformers.ts] — `transformItemDetails` ignores extra identity keys

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5.5 (Cursor), dev-story workflow, 2026-11-17 — Tasks A–D.
Grok 4.7 (Cursor), 2026-11-17 — Task E re-check and story completion.

### Debug Log References

- Baseline before changes: `backend/venv/bin/python -m pytest backend/` -> 172 passed, 10 skipped.
- Red phase: `test_ai_prompt.py` failed at collection (`GENERIC_IDENTITY_TOKENS` not importable) before implementation.
- After Tasks A-D: `test_ai_prompt.py` 36 passed; full `backend/` 204 passed, 10 skipped (+32 new tests, 0 regressions). OpenAI SDK 2.9.0 (`backend/venv`), not upgraded.
- Task E attempt 1 (2026-11-17): `identify_item_from_image` with `USE_MOCK=false`, model `gpt-4o-mini`, against the five `testpics` files. All five returned HTTP 429 `insufficient_quota` / `credit_balance_exhausted` after tenacity retries. No model output was produced.
- Task E attempt 2 (2026-11-17): quota probe (`max_tokens=1`) returned OK. One pass of `identify_item_from_image` on JPEG conversions of the same five files. Model `gpt-4o-mini`, `use_mock=False`. No confidence-coercion warnings. Results recorded below. Not rerun.
- After code-review fixes: `backend/tests/test_ai_prompt.py` 41 passed; full `backend/` 209 passed, 10 skipped.

### Completion Notes List

- **Tasks A-D done.** `ItemIdentity.visible_observations` is the first, required field. `MIN_VISIBLE_OBSERVATIONS = 40` and `GENERIC_IDENTITY_TOKENS` (frozenset) live next to `ItemIdentity`; tests import both. `ensure_keywords_not_empty` is deleted. One `model_validator(mode="after")` now: (1) normalizes brand/model placeholders (`n/a`, `na`, `none`, `null`, `unidentified`, generic tokens, blank) to `unknown`; (2) coerces confidence per the locked table and logs each coercion at WARNING via `logging.getLogger(__name__)`; (3) drops generic-only keywords, falls back to `[item_type]`, and raises `ValueError` only when `item_type` is also generic. The now-redundant `["item"]`-style fallback in `identify_item_from_image` was removed; the existing `except Exception` still maps that failure to `AIIdentificationError` / `AI_IDENTIFICATION_FAILED` (covered by a test).
- Design call worth knowing: whitespace is stripped before measuring observation length, so padding cannot satisfy the 40-char floor. A generic `item_type` is not stored. If a specific keyword exists, `item_type` becomes that keyword and confidence is then judged on the rewritten category (unknown name + specific category + HIGH → MEDIUM). If no specific keyword exists, the validator still raises. The locked LOW row remains as a backstop and no longer describes a persisted `item_type="item"`.
- Prompt: describe-first section (`visible_observations`) precedes brand/model instructions; the "do not leave the output bland" line is deleted; Tier 1/Tier 2 anchors and the "Do not use Unknown as a substitute for useful descriptors" line kept (scoped to item_type/keywords); generic placeholder keywords are explicitly forbidden; description may name brand/model only if that field is not `unknown`; condition enum and no-price rules untouched. `backend/config.py` default and Render were not touched (`git diff` empty for both; `backend/.env` also has `OPENAI_MODEL=gpt-4o-mini`).
- **AC4 / Task E: met.** Same five files as 5.5-10, one pass, `gpt-4o-mini` through `identify_item_from_image` (`USE_MOCK=false`, key from `backend/.env`). PNGs were converted to JPEG at quality 85 with ImageMagick and no resize, because the API payload is an `image/jpeg` data URL. JPEGs stayed in `/tmp` and were not committed. No coercion warnings, so the stored confidence is what the model returned. Expected labels are the 5.5-10 ground truth.

  | File | Expected item | Brand | Model | Confidence | Verdict |
  |---|---|---|---|---|---|
  | btxr2.png | XR2 BT headphones | TECH REBELLION | XR2 | HIGH | correct name |
  | jblclip.png | JBL Clip 4 speaker | JBL | unknown | MEDIUM | partial — brand correct, model abstained |
  | massagegun.png | Marika percussion massager | Marika | unknown | MEDIUM | correct name |
  | ps5cont.png | Purple PS5 controller | unknown | unknown | MEDIUM | correct abstention |
  | topfin.png | TopFin internal filter | TOP FIN | IF20 | HIGH | correct name |

  Pass bar (jblclip, ps5cont, topfin must not be HIGH on an unrelated famous product): met. 5.5-10 had those three as Rolex Submariner, Rolex Submariner, and Herman Miller Aeron, all HIGH. This pass: JBL speaker at MEDIUM, unknown controller at MEDIUM, TOP FIN IF20 at HIGH.
  What the labels do not say: `jblclip` did not produce "Clip 4". That string is not printed on the grille, so `model=unknown` is the grounded result. Calling that row `correct name` overstated it. Brand and item type are right; the model was abstained. `ps5cont` is an under-call. The PlayStation logo and face buttons are visible; the model wrote "emblem resembling a PlayStation logo", left brand and model `unknown`, and used descriptor keywords (`purple gaming controller`, `PlayStation style gaming controller`). That counts as the abstention this story asked for. It is not a DualSense name. `btxr2`'s 5.5-10 label says headphones; the box says true wireless earbuds, and the model read the box.
- **AC5:** runtime model on the re-check was `gpt-4o-mini`. `backend/config.py` default and `render.yaml` were not edited.
- **AC6:** `## Code Review` added below. Review findings on keyword placeholders, generic `item_type`, the parse-path test, and the mixed working tree are fixed in this pass. Status is `done`.
- **Code-review fixes.** Blank and punctuation-only keywords are dropped (`""` and `"!!!"` no longer count as specific). Unknown-alias keywords (`n/a`, `none`, `null`) are dropped with them. A generic `item_type` is replaced by the first specific keyword, or the validator raises when nothing specific remains. `identify_item_from_image` raises `ValueError` when the parsed identity is `None`, and the existing handler still maps that to `AI_IDENTIFICATION_FAILED`. The dead-end test now fails inside `ItemIdentity.model_validate_json`, which is what the OpenAI SDK calls.
- Not claimed by the tests: the known hole in Dev Notes stands. A model can still emit a famous brand at MEDIUM with a self-consistent observations paragraph, and `SELL_NOW` is untouched (Story 8.1). The validator only stops ungrounded HIGH and generic keyword collapse.
- Working tree was already dirty with unrelated Epic 6/8 work (including pre-existing edits to `test_confidence_integration.py`); only the story's listed files were touched for this story.
- Validation improvements applied before implementation: one `model_validator(mode="after")` owns normalization, confidence coercion, and keyword filtering; `GENERIC_IDENTITY_TOKENS` is the only generic-word list; temperature stays unsent; identification failures stay on the existing idempotency 422 path.

### File List

- backend/models.py
- backend/services/ai.py
- backend/services/mocks/mock_ai.py
- backend/tests/test_ai_prompt.py
- backend/tests/integration/test_confidence_integration.py — 6-14 hunk is the `visible_observations` constructor on `mock_ai_high_confidence` only. The same file already contains uncommitted Epic 8 assertion changes (`Strong active-market evidence`, `current_asking_estimate`, `SELL_NOW` / `IMPROVE_FIRST`). Do not stage this file as a pure 6-14 commit.
- backend/tests/integration/test_ai_integration.py
- docs/sprint-artifacts/sprint-status.yaml — 6-14 status line only. The file also carries other uncommitted epic-status edits.
- docs/sprint-artifacts/6-14-ai-listing-quality-overhaul.md

## Code Review

### Senior Developer Review (AI)

**Reviewer:** Grok 4.7 (same model that finished Task E; not a second model)
**Date:** 2026-11-17
**Outcome:** Changes requested, then fixed in this session. Approved after fixes.

#### Findings

- [x] **HIGH:** Blank and punctuation-only keywords survived the generic-token filter because `_normalize_token("!!!")` is `""`, and `""` is not in `GENERIC_IDENTITY_TOKENS`. `['']` and `['!!!']` were stored and searched. Fixed: `_is_placeholder_token` drops empty, generic, and unknown-alias keywords. Tests cover `""`, `"!!!"`, `"item."`, and `"n/a"`.
- [x] **MEDIUM:** `item_type="item"` was persisted whenever any keyword was specific, so AC3's "specific item_type" was prompt-only. Fixed: a generic or alias `item_type` is replaced with the first specific keyword. No specific keyword still raises. Confidence is judged after that rewrite, so unknown name + rewritten category + HIGH becomes MEDIUM, not a stored LOW with `item_type="item"`.
- [x] **MEDIUM:** `test_confidence_integration.py` and `sprint-status.yaml` mix this story with other uncommitted Epic 6/8 edits. Not reverted (that work is not this story's). File List now says which hunk is 6-14 and which must not be staged as part of it.
- [x] **MEDIUM:** The keyword dead-end test built an invalid `ItemIdentity` in a fake and never exercised JSON parse. `parsed is None` then crashed on attribute access. Fixed: the test calls `model_validate_json` (the SDK parse path) and asserts `ValidationError` is the wrapped cause. `identify_item_from_image` raises `ValueError` when parse returns `None`, and a second test covers that wrap.
- [x] **LOW:** The token-list test copied `GENERIC_IDENTITY_TOKENS` into the test with `>=`. Removed. Rejection still iterates the imported constant.
- [x] **LOW:** `jblclip` was labeled `correct name` with `model=unknown`. Table now says the brand was correct and the model was abstained.
- [x] **LOW:** Describe-first coverage was a substring search. It now compares the observations section header with the identify section header.
- [x] **LOW:** The `visible_observations` field description forbade every brand/model mention. It now matches the prompt: a name is allowed only when it is printed on the item.

Not changed, on purpose: the 40-character floor, and `SELL_NOW` on a MEDIUM brand string. Both are outside this story.

### Change Log

- 2026-11-17 — Code review fixes: placeholder keywords dropped, generic item_type replaced or rejected, parse-failure test follows `model_validate_json`, File List splits 6-14 hunks from the dirty tree. Status set to done.
- 2026-11-17 — Task E one-pass re-check recorded. Hallucination bar met (no HIGH Rolex/Aeron). Status set to review. AC6 code-review section not added here.
- 2026-11-17 — Dev: Tasks A-D implemented (schema grounding field, single `model_validator(mode="after")` with confidence coercion + keyword filtering, prompt rewrite, tests, mock/fixture updates). Task E (five-photo re-check) BLOCKED on exhausted OpenAI credits; story left in-progress.

- 2026-11-17 — Story context created from Epic 6 plan, 5.5-10 results, and the Epic 8 scope lock. Status set to ready-for-dev.
- 2026-11-17 — Locked `MIN_VISIBLE_OBSERVATIONS`, the models logger, and the HIGH fixtures that must remain HIGH.
- 2026-11-17 — Validation improvements applied - 6 improvements.
- 2026-11-17 — Party mode confirmed the five 5.5-10 photos are readable at `/mnt/c/Users/elawa/OneDrive/Pictures/testpics`. Task E is a real re-check, not a missing-file write-off.
