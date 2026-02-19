---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
status: COMPLETE
completionDate: 2025-12-12
---

# Workflow Creation Plan: validate-create-story

## Initial Project Context

- **Module:** BMM (BMAD Method Management)
- **Phase:** 4-implementation
- **Target Location:** .bmad/bmm/workflows/4-implementation/validate-create-story/
- **Created:** 2025-12-12

## Workflow Purpose

A quality competition workflow where a fresh LLM in clean context systematically re-analyzes all source documents that were used to create a story, identifies gaps, omissions, or improvements, and presents findings interactively for user approval before applying improvements.

## Problem Statement

When `create-story` generates a story file, it may miss context, misinterpret requirements, or fail to extract critical details. This workflow provides:
1. Independent validation by a fresh LLM (no prior context bias)
2. Systematic re-analysis of all source artifacts
3. Interactive presentation of findings
4. Competitive improvement application

## Target Users

- Scrum Master (SM) agent after running `create-story`
- Project managers wanting to ensure story quality before dev work begins
- Teams practicing continuous improvement

## Expected Inputs

- Story file path (newly created story .md file)
- Access to source documents (epics.md, architecture.md, previous stories, etc.)
- Sprint status file for context

## Expected Outputs

- Critique report with identified gaps/improvements
- Interactive menu for user decisions (accept, reject, modify)
- Updated story file with approved improvements
- Validation log

---

## Comprehensive Requirements

### 1. Workflow Purpose and Scope

**Execution Frequency:** Every time a story is created via `create-story`

**Analysis Depth:** Exhaustive analysis (not quick check)
- Systematic re-analysis of ALL source documents
- Fresh LLM perspective with zero prior context bias
- Deep dive into every section: tasks, ACs, dev notes, learnings

**Problem Being Solved:**
- Single-context blind spots in story creation
- Missing critical implementation details
- Misinterpreted requirements from source documents
- Incomplete learnings from previous stories
- Gaps in architectural alignment

**Primary Users:**
- Scrum Master (SM) agent after `create-story`
- Human PMs wanting quality assurance before dev work

**Main Deliverable:** Validated, improved story file ready for `dev-story`

### 2. Workflow Type Classification

**Type:** Action + Interactive Workflow

- **Action Component:** Performs systematic analysis, identifies gaps
- **Interactive Component:** Presents findings for user approval before applying

### 3. Workflow Flow and Step Structure

**Pattern:** Linear (single pass, not iterative)

**Flow:**
```
1. Initialize (load story file, extract story key/epic)
2. Discover & load all source documents (same as create-story + additional)
3. Systematic exhaustive re-analysis (fresh LLM, zero context)
4. Generate quality score (0-10 scale)
5. Compare with original story → identify gaps/improvements
6. Present findings interactively (categorized by severity/type)
7. User approval workflow (accept all, select, reject, modify)
8. Apply approved improvements to story file
9. Recalculate quality score (before/after comparison)
10. Generate validation report (competitive framing)
```

**Competitive Framing:**
- Validator "wins" by finding more issues
- Gamification: Show improvement delta (7/10 → 9/10)
- Celebrate validator success ("Found 8 improvements the original creator missed!")

**Scoring System:**
- Story quality score (0-10 scale)
- Dimensions: Completeness, Clarity, Actionability, Accuracy, Context Depth
- Before/After comparison to show improvement

### 4. User Interaction Style

**Analysis Phase:** Mostly autonomous (let fresh LLM work without interruption)

**Findings Phase:** Highly interactive
- Present findings categorized by type (gaps, inaccuracies, improvements)
- User controls what gets applied (granular accept/reject)
- Natural conversation about findings

### 5. Instruction Style

**Mixed Approach:**
- **Prescriptive** for analysis steps (systematic, repeatable checklist)
- **Intent-based** for user interaction (conversational findings presentation)

**Analysis should follow systematic checklist:**
- ✓ Are all ACs implementable?
- ✓ Do tasks map to ACs?
- ✓ Are dev notes comprehensive?
- ✓ Are previous story learnings applied?
- ✓ Is architecture alignment verified?
- ✓ Are anti-patterns documented?
- ✓ Is testing strategy clear?

### 6. Input Requirements

**Required Inputs:**
- Story file path (newly created story)
- Story key (e.g., "0-3-create-primitive-components")
- Epic number (extracted from story key)

**Automatic Discovery:**
- Load ALL documents that `create-story` used:
  - epics.md (relevant epic section)
  - architecture.md (relevant sections)
  - Previous stories in same epic (for learnings)
  - Sprint status file (for context)
  
**Additional Context (beyond create-story):**
- SWISS-MINIMALIST.md (design constraints)
- UX design specification (component patterns)
- Code review findings from previous stories (common issues)
- Git history (recent commits for patterns)

**Prerequisites:**
- Story must have Status: "drafted" or "ready-for-dev"
- Story file must be accessible and readable

### 7. Output Specifications

**Primary Output:**
- Updated story file (with approved improvements applied)
- Status remains "ready-for-dev" (not changed by validation)

**Validation Report:**
- Separate file: `{story_dir}/{story_key}-validation-report.md`
- Contents:
  - Quality score (before/after)
  - Findings summary (gaps, improvements, corrections)
  - Competitive stats (validator found X issues)
  - User decisions (accepted/rejected)
  - Improvement delta

**Format:**
- Story file: Markdown (.md)
- Validation report: Markdown (.md)
- Both use YAML frontmatter for metadata

### 8. Success Criteria

**Quality Metrics:**
- Fresh LLM finds ≥3 actionable improvements (proves value)
- User accepts ≥50% of findings (proves relevance)
- Quality score improves by ≥1 point (measurable improvement)

**Completeness Checks:**
- All story sections validated (Story, ACs, Tasks, Dev Notes)
- All source documents re-analyzed
- All architectural constraints verified
- All previous story learnings checked

**User Satisfaction:**
- Developer implementing story needs zero clarifications
- Story contains 100% of context needed
- No critical gaps remain after validation

**Competitive Success:**
- Validator identifies improvements original creator missed
- Before/after scores show measurable improvement
- Validation report celebrates validator's contribution

### 9. Additional Workflow Characteristics

**Tone:** Competitive but constructive
- "Let's see if we can improve on the original story!"
- "Validator found 8 improvements - great catch!"
- Not: "The original story was bad" (constructive, not critical)

**Transparency:**
- Show user exactly what changed
- Highlight severity (Critical, Medium, Low improvements)
- Explain reasoning for each finding

**Efficiency:**
- Single pass (not multiple rounds)
- Clear categorization of findings
- Bulk accept/reject options available

---

## Party Mode Discoveries (2025-12-12)

### Key Insights from Multi-Agent Brainstorming

**Bob (Scrum Master) - Quality Gate Approach:**
- Validator needs systematic checklist (like code review for story context)
- Story Quality Rubric with specific checkpoints:
  - Are all ACs implementable?
  - Do tasks map correctly to ACs?
  - Are dev notes comprehensive?
  - Are previous story learnings referenced?
  - Is architecture alignment verified?
  - Are anti-patterns documented?

**John (Product Manager) - User Job-to-be-Done:**
- Core question: "Can Amelia (DEV agent) implement this without asking questions?"
- If yes → story passes
- If no → validator wins by finding gaps
- Validator Scorecard: Show improvements with categorization (Critical, Medium, Low)
- Educational framing: "Original creator missed these because..." (not just competitive)

**Winston (Architect) - Scoring & Architecture:**
- Scoring needs 5 dimensions (each 0-2 points, total 0-10):
  1. **Completeness** - All sections present, no gaps
  2. **Clarity** - Clear instructions, unambiguous
  3. **Actionability** - Developer can implement without clarification
  4. **Accuracy** - Technical details correct, references valid
  5. **Context Depth** - Previous learnings applied, architecture aligned
- Fresh context requirement: Validator loads documents independently (no memory of original creation)
- Clear workflow boundaries: Validator operates in completely fresh context

### Implementation Decisions

**Story Quality Rubric Structure:**
```
For each dimension (Completeness, Clarity, Actionability, Accuracy, Context Depth):
  - 0 points: Critical gaps, cannot proceed
  - 1 point: Some gaps, needs improvement
  - 2 points: Excellent, no gaps found
Total: 0-10 scale
```

**Validator Checklist (Systematic Quality Gate):**
- [ ] All ACs are implementable (no vague requirements)
- [ ] Tasks map correctly to ACs (every AC has corresponding tasks)
- [ ] Dev notes are comprehensive (architecture, patterns, constraints)
- [ ] Previous story learnings are referenced and applied
- [ ] Architecture alignment verified (matches architecture.md)
- [ ] Anti-patterns documented (what NOT to do)
- [ ] Testing strategy is clear (how to verify)
- [ ] File structure matches project conventions
- [ ] TypeScript/types are properly specified
- [ ] Accessibility requirements included (if applicable)

**Validator Scorecard Format:**
```
🎯 Validator Scorecard

Found 8 improvements:
- 🔴 Critical (2): Missing AC implementation details, No testing strategy
- 🟡 Medium (4): Previous learnings not applied, Architecture misalignment
- 🟢 Low (2): Typo in dev notes, Missing file structure reference

Original creator missed these because:
- Didn't cross-reference with Story 0.2 learnings
- Architecture section not fully analyzed
- Testing approach assumed but not documented

Quality Score: 6/10 → 9/10 (+3 improvement)
```

**Fresh Context Protocol:**
- Validator starts with zero knowledge of original story creation
- Loads all source documents independently
- Performs own analysis without inheriting create-story's conclusions
- This ensures true second-opinion value

**Core Validation Question:**
- "Can Amelia (DEV agent) implement this story without asking any clarification questions?"
- If answer is NO → validator identifies what's missing
- If answer is YES → story passes validation

---

## Party Mode Plan Review Discoveries (2025-12-12)

### Key Insights from Multi-Agent Plan Review

**Bob (Scrum Master) - Fresh Context Enforcement:**
- Question: How do we enforce "fresh LLM, zero context"?
- Solution: Document as workflow execution requirement with explicit instruction to ignore prior knowledge
- Add checkpoint: Validator must explicitly clear context or start new session

**John (Product Manager) - Zero Improvements Handling:**
- Concern: What if original story is already excellent?
- Solution: Celebrate "no improvements needed" as validator success (quality confirmation)
- Need: "Clean bill of health" report format for zero-improvement scenarios
- Validator wins by confirming quality, not by finding problems

**Winston (Architect) - Scoring System Refinement:**
- If story scores 9/10 or 10/10 initially → Report "Story is excellent, no improvements needed"
- Competitive element should be about thoroughness, not nitpicking
- Validation report should always be generated, even if just "All checks passed"

### Implementation Decisions

**Fresh Context Protocol Enhancement:**
- Add explicit instruction in workflow: "Validator MUST start with zero knowledge of original story creation"
- Document as execution requirement: "Use fresh LLM session or explicitly clear context"
- Add validation checkpoint: "Confirm validator has no prior knowledge of story creation"

**Zero Improvements Path:**
- If quality score ≥ 9/10 AND no improvements found:
  - Generate "Clean Bill of Health" validation report
  - Format: "🎯 Validator Scorecard: Story passed all quality checks. Score: 9/10. No improvements needed."
  - Celebrate validator success: "Validator confirms story quality - excellent work by original creator!"
- Validator still "wins" by providing quality assurance confirmation

**Validation Report Format Variations:**

**Format 1: Improvements Found**
```
🎯 Validator Scorecard

Found 8 improvements:
- 🔴 Critical (2): Missing AC implementation details, No testing strategy
- 🟡 Medium (4): Previous learnings not applied, Architecture misalignment
- 🟢 Low (2): Typo in dev notes, Missing file structure reference

Original creator missed these because:
- Didn't cross-reference with Story 0.2 learnings
- Architecture section not fully analyzed
- Testing approach assumed but not documented

Quality Score: 6/10 → 9/10 (+3 improvement)
```

**Format 2: Zero Improvements (Clean Bill of Health)**
```
🎯 Validator Scorecard

Story passed all quality checks! ✅

Quality Score: 9/10
Improvements Found: 0

Validator confirms story quality - excellent work by original creator!
All systematic checks passed:
- ✓ All ACs implementable
- ✓ Tasks map correctly to ACs
- ✓ Dev notes comprehensive
- ✓ Previous learnings applied
- ✓ Architecture alignment verified
- ✓ Testing strategy clear

Story is ready for dev-story workflow.
```

**Workflow Execution Requirement:**
- Step 3 must include: "Validator MUST operate in fresh context with zero knowledge of original story creation"
- Add validation checkpoint: "Confirm validator has independently loaded all documents without inheriting create-story's analysis"

---

## Tools Configuration

### Core BMAD Tools

- **Party-Mode**: Excluded - Already used during workflow creation brainstorming
- **Advanced Elicitation**: Included - Integration point: Deep analysis phase for critical evaluation from multiple perspectives
- **Brainstorming**: Excluded - Already used during workflow creation

### LLM Features

- **Web-Browsing**: Included - Use cases: Verify latest library versions, check API documentation, validate technical references in story
- **File I/O**: Included - Operations: Read story files, source documents (epics.md, architecture.md), previous stories; Write validation reports, update story files
- **Sub-Agents**: Excluded - Linear workflow doesn't require parallel processing
- **Sub-Processes**: Excluded - Linear workflow doesn't require independent parallel processing

### Memory Systems

- **Sidecar File**: Excluded - Not needed for single-pass validation workflow

### External Integrations

- None required - All validation can be performed using core BMAD tools and file system access

### Installation Requirements

- **No installation required** - All selected tools (File I/O, Advanced Elicitation, Web-Browsing) are built-in LLM capabilities
- **User Installation Preference**: N/A (no external tools requiring installation)

---

## Output Format Design

**Format Type:** Structured

**Output Requirements:**
- Document type: Validation Report
- File format: Markdown (.md)
- Frequency: Single report per story validation
- File naming: `{story_key}-validation-report.md`

**Structure Specifications:**

**Required Sections (in order):**
1. **Header/Metadata** (YAML frontmatter) - Story key, dates, scores, status
2. **Executive Summary** - Overall score, findings count, verdict
3. **Validator Scorecard** - Findings breakdown, competitive stats
4. **Quality Score Breakdown** - Before/after by dimension (table format)
5. **Detailed Findings** - Each finding with severity, location, reasoning, suggestion
6. **User Decisions** - Accepted/rejected/modified counts and details
7. **Validator Notes** - Methodology, patterns, recommendations
8. **Competitive Stats** - Validator performance metrics
9. **Change Log** - Validation history

**Template Information:**
- Template source: Created (AI proposed)
- Template file: `validation-report-template.md`
- Placeholders: Handlebars-style syntax ({{variable}})
- Conditional sections: Handlebars conditionals for improvements vs clean bill of health

**Format Guidelines:**
- Markdown (.md) format with YAML frontmatter
- Consistent section headers (##)
- Tables for score breakdowns
- Lists for findings and decisions
- Competitive but constructive tone
- Two format variations:
  - Improvements found (standard report)
  - Clean bill of health (zero improvements)

**Special Considerations:**
- Must handle both scenarios: improvements found vs zero improvements
- Competitive framing (celebrate validator success)
- Educational value (why improvements were missed)
- User decision tracking (accepted/rejected/modified)

---

## Workflow Structure Design

### Step Breakdown (7 Major Steps)

**Step 01: Initialize & Load Story**
- Goal: Load story file, extract story key/epic, verify prerequisites
- Input: Story file path (or auto-discover from sprint-status.yaml)
- Output: Story loaded, key extracted, prerequisites verified
- Interaction: User provides story path OR auto-discover
- Validation: Story status must be "drafted" or "ready-for-dev"

**Step 02: Discover & Load Source Documents**
- Goal: Fresh context protocol - load all source documents independently
- Input: Story key, epic number
- Output: All source documents loaded (epics.md, architecture.md, previous stories, etc.)
- Interaction: Autonomous (no user input needed)
- Fresh Context: Validator MUST operate with zero knowledge of original story creation

**Step 03: Exhaustive Re-Analysis**
- Goal: Systematic checklist application, quality scoring, gap identification
- Input: Story file + all source documents
- Output: Quality score (0-10), findings list, scorecard data
- Interaction: Autonomous (exhaustive analysis phase)
- Tools: Advanced Elicitation (deep analysis from multiple perspectives)
- Checklist: Apply 10-point systematic quality gate

**Step 04: Generate Findings & Score**
- Goal: Categorize findings by severity, calculate quality score, prepare scorecard
- Input: Analysis results from Step 03
- Output: Categorized findings (Critical/Medium/Low), quality score breakdown, scorecard
- Interaction: Autonomous (processing phase)
- Scoring: 5 dimensions × 2 points each = 0-10 total

**Step 05: Present Findings & Get Approval**
- Goal: Interactive presentation, user decisions (accept/reject/modify)
- Input: Findings list, scorecard
- Output: User decisions (accepted/rejected/modified findings)
- Interaction: Highly interactive (main user decision point)
- Menu Options: Accept all, Select individually, Reject all, Modify, Advanced Elicitation, Party Mode
- Continuation Support: Can pause here and resume later

**Step 06: Apply Improvements**
- Goal: Update story file, recalculate score, track changes
- Input: User-approved findings
- Output: Updated story file, new quality score, change log
- Interaction: Autonomous (applies approved improvements)
- Validation: Verify all changes applied correctly

**Step 07: Generate Validation Report**
- Goal: Create report file, competitive stats, final summary
- Input: All validation data, user decisions, before/after scores
- Output: Validation report file (`{story_key}-validation-report.md`)
- Interaction: Autonomous (report generation)
- Template: Use validation-report-template.md

### Flow Pattern

**Type:** Linear (single pass, no loops)

**Sequence:**
```
Step 01 → Step 02 → Step 03 → Step 04 → Step 05 → Step 06 → Step 07
```

**Decision Points:**
- Step 01: Story path input vs auto-discover
- Step 05: User approval decisions (main interaction point)

**Continuation Support:**
- ✅ Included (using step-01b-continue.md)
- Can pause/resume at Step 05 (findings review)
- State tracked in validation report frontmatter

### Interaction Patterns

**Autonomous Steps (01-04, 06-07):**
- AI works independently
- Progress updates shown
- No user input required

**Interactive Step (05):**
- Present findings with severity categorization
- Show scorecard and quality breakdown
- Menu options for user decisions
- Can accept all, select individually, reject, modify
- Advanced Elicitation and Party Mode available

**Menu Pattern:**
- [A] Accept all improvements
- [S] Select improvements individually
- [R] Reject all improvements
- [M] Modify specific improvements
- [E] Advanced Elicitation
- [P] Party Mode
- [C] Continue (after decisions made)

### Data Flow

**Step 01 → Step 02:**
- Story key, epic number passed forward
- Story file content available

**Step 02 → Step 03:**
- All source documents loaded
- Fresh context established

**Step 03 → Step 04:**
- Analysis results, findings list
- Quality score calculated

**Step 04 → Step 05:**
- Categorized findings
- Scorecard prepared
- Quality breakdown ready

**Step 05 → Step 06:**
- User decisions (accepted findings)
- Rejected/modified tracking

**Step 06 → Step 07:**
- Updated story file
- Before/after scores
- All validation data

**State Tracking:**
- `stepsCompleted` array in validation report frontmatter
- Story file updated with improvements
- Validation report persists all decisions

### File Structure

**Required Files:**
```
validate-create-story/
├── workflow.yaml              # Workflow configuration
├── instructions.xml           # Workflow execution instructions
├── validation-report-template.md  # Report template (created)
├── checklist.md               # Validation checklist (to create)
└── workflow-plan-validate-create-story.md  # Design plan
```

**Templates:**
- `validation-report-template.md` ✅ (already created)

**Data Files:**
- None required (reads from existing story files and source docs)

**Supporting Files:**
- `checklist.md` - 10-point systematic quality gate checklist

### Role and Persona Definition

**AI Role:** Adversarial Code Reviewer (for stories)

**Expertise:**
- Story quality assessment
- Systematic analysis methodology
- Gap identification
- Quality scoring

**Communication Style:**
- Competitive but constructive
- Direct and systematic
- Educational (explains why improvements were missed)
- Celebratory when finding improvements OR confirming quality

**Tone:**
- "Let's see if we can improve on the original story!"
- "Validator found 8 improvements - great catch!"
- "Story passed all checks - excellent work!"
- NOT: "The original story was bad" (constructive, not critical)

**Collaboration Level:**
- Autonomous during analysis (Steps 01-04)
- Highly collaborative during findings review (Step 05)
- Autonomous during application (Steps 06-07)

### Validation and Error Handling

**Input Validation:**
- Step 01: Verify story file exists and is readable
- Step 01: Verify story status is "drafted" or "ready-for-dev"
- Step 02: Verify source documents are accessible

**Output Validation:**
- Step 06: Verify all approved improvements applied correctly
- Step 07: Verify validation report generated successfully
- Step 07: Verify quality score recalculated correctly

**Error Handling:**
- If story file not found → HALT with clear error message
- If source documents missing → Continue with available docs, note gaps
- If no improvements found → Generate clean bill of health report
- If user rejects all → Still generate report (showing zero improvements applied)

**Recovery:**
- Continuation support allows resuming from Step 05
- State persisted in validation report frontmatter
- Can re-run validation on same story (will overwrite previous report)

### Special Features

**Fresh Context Protocol:**
- Step 02 explicitly instructs: "Validator MUST operate with zero knowledge of original story creation"
- Independent document loading (no inheritance from create-story)
- Checkpoint: Confirm validator has no prior knowledge

**Zero Improvements Path:**
- If quality score ≥ 9/10 AND no improvements found:
  - Generate "Clean Bill of Health" report variant
  - Celebrate validator success (quality confirmation)
  - Still generate full report with all checks passed

**Competitive Framing:**
- Scorecard shows validator "wins" by finding improvements
- Report celebrates validator contribution
- Educational insights explain why improvements were missed

**Quality Scoring:**
- 5 dimensions × 2 points each = 0-10 total
- Before/after comparison shown
- Dimension breakdown in report

**Advanced Elicitation Integration:**
- Available at Step 05 (findings review)
- Deep dive into specific findings
- Multiple perspective evaluation

**Party Mode Integration:**
- Available at Step 05 (findings review)
- Multi-agent discussion about findings
- Creative problem-solving for improvements

### Design Review

**Flow Completeness:**
✅ All 10 planned steps covered in 7 logical steps
✅ Linear progression maintained
✅ Decision points clearly defined

**Requirements Coverage:**
✅ Exhaustive analysis (Step 03)
✅ Fresh context protocol (Step 02)
✅ Quality scoring (Steps 03-04)
✅ Interactive findings (Step 05)
✅ Competitive framing (Step 07)
✅ Zero improvements path (Step 07)

**User Experience:**
✅ Clear progress indication
✅ Autonomous analysis phase
✅ Interactive decision point
✅ Continuation support
✅ Clear error handling

**Technical Feasibility:**
✅ All tools available (File I/O, Advanced Elicitation, Web-Browsing)
✅ Template created
✅ State tracking designed
✅ File structure planned

---


