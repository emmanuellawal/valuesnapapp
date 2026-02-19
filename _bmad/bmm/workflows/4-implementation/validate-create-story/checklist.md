# Story Validation Checklist

This checklist is used by the validate-create-story workflow to systematically assess story quality across all dimensions.

## Story Quality Rubric

**Scoring:** Each dimension scored 0-2 points (0 = Critical gaps, 1 = Some gaps, 2 = Excellent)
**Total Score:** 0-10 (sum of 5 dimensions)

### Dimensions

1. **Completeness** (0-2 points)
   - All sections present (Story, ACs, Tasks, Dev Notes, File List)
   - No gaps in requirements
   - All ACs have corresponding tasks

2. **Clarity** (0-2 points)
   - Clear instructions, unambiguous
   - No vague requirements
   - Developer can understand what to build

3. **Actionability** (0-2 points)
   - Developer can implement without clarification
   - All technical details specified
   - File paths and structure clear

4. **Accuracy** (0-2 points)
   - Technical details correct
   - References valid (library versions, APIs)
   - No factual errors

5. **Context Depth** (0-2 points)
   - Previous story learnings applied
   - Architecture alignment verified
   - Design constraints documented

---

## 10-Point Systematic Quality Gate

### 1. ACs Implementable
- [ ] All ACs are specific and measurable
- [ ] No vague requirements (e.g., "make it better")
- [ ] Each AC is testable/verifiable
- [ ] ACs use BDD format (Given/When/Then) where appropriate

**Scoring:**
- 0: Vague or untestable ACs present
- 1: Most ACs clear, some ambiguity
- 2: All ACs implementable and testable

---

### 2. Task Mapping
- [ ] Every AC has corresponding tasks/subtasks
- [ ] Tasks map correctly to ACs (no orphaned tasks)
- [ ] Task sequence matches implementation order
- [ ] Tasks are specific and actionable

**Scoring:**
- 0: Tasks don't map to ACs or missing tasks
- 1: Most tasks map correctly, some gaps
- 2: Perfect AC-to-task mapping

---

### 3. Dev Notes Comprehensive
- [ ] Architecture patterns referenced
- [ ] Technical constraints documented
- [ ] Implementation approach explained
- [ ] Code patterns and conventions specified
- [ ] Dependencies and prerequisites listed

**Scoring:**
- 0: Dev notes missing or minimal
- 1: Dev notes present but incomplete
- 2: Comprehensive dev notes with all context

---

### 4. Previous Learnings Applied
- [ ] Previous stories in epic referenced
- [ ] Learnings from previous stories applied
- [ ] Review feedback incorporated (if applicable)
- [ ] Patterns from previous work followed

**Scoring:**
- 0: No previous learnings referenced
- 1: Some learnings mentioned but not applied
- 2: Previous learnings fully integrated

---

### 5. Architecture Alignment
- [ ] Matches architecture.md specifications
- [ ] Follows project structure conventions
- [ ] Uses approved libraries and frameworks
- [ ] Aligns with architectural decisions

**Scoring:**
- 0: Architecture misalignment or violations
- 1: Mostly aligned, minor deviations
- 2: Perfect architecture alignment

---

### 6. Anti-patterns Documented
- [ ] "What NOT to do" section present
- [ ] Common mistakes listed
- [ ] Anti-patterns specific to this story
- [ ] Clear guidance on what to avoid

**Scoring:**
- 0: No anti-patterns documented
- 1: Some anti-patterns mentioned
- 2: Comprehensive anti-pattern documentation

---

### 7. Testing Strategy Clear
- [ ] Testing approach specified
- [ ] Test types defined (unit/integration/e2e)
- [ ] Verification methods clear
- [ ] Test coverage expectations stated

**Scoring:**
- 0: No testing strategy
- 1: Testing mentioned but unclear
- 2: Clear, comprehensive testing strategy

---

### 8. File Structure Matches Conventions
- [ ] File paths match project structure
- [ ] Naming conventions followed
- [ ] Folder organization correct
- [ ] Import patterns specified

**Scoring:**
- 0: File structure doesn't match conventions
- 1: Mostly correct, some deviations
- 2: Perfect alignment with project structure

---

### 9. TypeScript/Types Properly Specified
- [ ] Type definitions specified
- [ ] Interface requirements clear
- [ ] Type safety considerations documented
- [ ] TypeScript patterns explained

**Scoring:**
- 0: Types not specified or incorrect
- 1: Some types specified, gaps remain
- 2: Complete type specifications

---

### 10. Accessibility Requirements Included
- [ ] Accessibility requirements documented (if applicable)
- [ ] WCAG compliance mentioned (if UI story)
- [ ] Screen reader considerations (if applicable)
- [ ] Keyboard navigation (if applicable)

**Scoring:**
- 0: Accessibility missing when required
- 1: Accessibility mentioned but incomplete
- 2: Comprehensive accessibility requirements

**Note:** If story doesn't involve UI/accessibility, this checkpoint is N/A (doesn't affect score)

---

## Core Validation Question

**"Can Amelia (DEV agent) implement this story without asking any clarification questions?"**

- **YES** → Story passes validation (score ≥ 9/10, no improvements needed)
- **NO** → Validator identifies what's missing and provides improvements

---

## Finding Severity Levels

### 🔴 Critical
- Blocks implementation
- Missing critical information
- Architecture violations
- ACs not implementable

### 🟡 Medium
- Needs improvement for clarity
- Missing helpful context
- Minor architecture misalignment
- Testing strategy unclear

### 🟢 Low
- Nice-to-have improvements
- Minor documentation gaps
- Style/format improvements
- Non-blocking issues

---

## Validation Success Criteria

**Minimum Requirements:**
- Validator finds ≥3 actionable improvements (proves value)
- User accepts ≥50% of findings (proves relevance)
- Quality score improves by ≥1 point (measurable improvement)

**Clean Bill of Health:**
- Quality score ≥ 9/10
- Zero improvements found
- All 10 checkpoints pass
- Validator confirms quality (still generates report)

