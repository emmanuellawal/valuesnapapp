---
story_key: "{{story_key}}"
validation_date: "{{date}}"
validator_model: "{{validator_model}}"
original_score: {{original_score}}
final_score: {{final_score}}
improvements_found: {{improvements_found}}
improvements_applied: {{improvements_applied}}
status: "{{status}}" # "improved" | "clean_bill_of_health"
---

# Validation Report: {{story_key}}

**Story:** {{story_title}}  
**Validated:** {{validation_date}}  
**Validator:** {{validator_model}}

---

## Executive Summary

**Quality Score:** {{original_score}}/10 → {{final_score}}/10 ({{improvement_delta}})

{{#if improvements_found > 0}}
**Improvements Found:** {{improvements_found}} total
- 🔴 Critical: {{critical_count}}
- 🟡 Medium: {{medium_count}}
- 🟢 Low: {{low_count}}

**Improvements Applied:** {{improvements_applied}} ({{user_acceptance_rate}}% acceptance rate)

**Verdict:** Story improved through validation. {{improvements_applied}} improvements applied to enhance completeness, clarity, and actionability.
{{else}}
**Improvements Found:** 0

**Verdict:** ✅ Story passed all quality checks! No improvements needed - excellent work by original creator.
{{/if}}

---

## Validator Scorecard

{{#if improvements_found > 0}}
🎯 **Validator Scorecard**

Found {{improvements_found}} improvements:
- 🔴 Critical ({{critical_count}}): {{critical_summary}}
- 🟡 Medium ({{medium_count}}): {{medium_summary}}
- 🟢 Low ({{low_count}}): {{low_summary}}

**Original creator missed these because:**
{{#each missed_reasons}}
- {{this}}
{{/each}}

**Quality Score:** {{original_score}}/10 → {{final_score}}/10 (+{{improvement_delta}} improvement)
{{else}}
🎯 **Validator Scorecard**

Story passed all quality checks! ✅

**Quality Score:** {{final_score}}/10  
**Improvements Found:** 0

Validator confirms story quality - excellent work by original creator!

**All systematic checks passed:**
- ✓ All ACs implementable
- ✓ Tasks map correctly to ACs
- ✓ Dev notes comprehensive
- ✓ Previous learnings applied
- ✓ Architecture alignment verified
- ✓ Testing strategy clear
- ✓ File structure matches conventions
- ✓ TypeScript/types properly specified
- ✓ Accessibility requirements included (if applicable)

Story is ready for dev-story workflow.
{{/if}}

---

## Quality Score Breakdown

| Dimension | Before | After | Change |
|-----------|--------|-------|--------|
| **Completeness** | {{completeness_before}}/2 | {{completeness_after}}/2 | {{completeness_delta}} |
| **Clarity** | {{clarity_before}}/2 | {{clarity_after}}/2 | {{clarity_delta}} |
| **Actionability** | {{actionability_before}}/2 | {{actionability_after}}/2 | {{actionability_delta}} |
| **Accuracy** | {{accuracy_before}}/2 | {{accuracy_after}}/2 | {{accuracy_delta}} |
| **Context Depth** | {{context_before}}/2 | {{context_after}}/2 | {{context_delta}} |
| **TOTAL** | **{{original_score}}/10** | **{{final_score}}/10** | **+{{improvement_delta}}** |

{{#if improvements_found > 0}}
**Key Improvements:**
- {{#each key_improvements}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

---

## Detailed Findings

{{#if improvements_found > 0}}
{{#each findings}}

### Finding {{@index}}: {{severity}} - {{title}}

**Location:** {{location}} ({{file_path}}:{{line_number}})

**Description:** {{description}}

**Reasoning:** {{reasoning}}

**Suggested Improvement:** {{suggestion}}

**Status:** {{status}} # "accepted" | "rejected" | "modified"

{{#if user_notes}}
**User Notes:** {{user_notes}}
{{/if}}

---

{{/each}}
{{else}}
**No improvements needed** - All quality checks passed successfully.

The validator performed exhaustive analysis across all dimensions:
- ✅ Completeness: All sections present, no gaps
- ✅ Clarity: Clear instructions, unambiguous
- ✅ Actionability: Developer can implement without clarification
- ✅ Accuracy: Technical details correct, references valid
- ✅ Context Depth: Previous learnings applied, architecture aligned
{{/if}}

---

## User Decisions

**Total Findings:** {{improvements_found}}  
**Accepted:** {{accepted_count}}  
**Rejected:** {{rejected_count}}  
**Modified:** {{modified_count}}  
**Acceptance Rate:** {{user_acceptance_rate}}%

{{#if accepted_count > 0}}
**Accepted Improvements:**
{{#each accepted_findings}}
- {{severity}}: {{title}} ({{location}})
{{/each}}
{{/if}}

{{#if rejected_count > 0}}
**Rejected Improvements:**
{{#each rejected_findings}}
- {{severity}}: {{title}} ({{location}}) - Reason: {{rejection_reason}}
{{/each}}
{{/if}}

{{#if modified_count > 0}}
**Modified Improvements:**
{{#each modified_findings}}
- {{severity}}: {{title}} ({{location}}) - Modification: {{modification_notes}}
{{/each}}
{{/if}}

---

## Validator Notes

### Analysis Methodology

The validator performed exhaustive systematic analysis using the Story Quality Rubric:

**Systematic Checklist Applied:**
- [x] All ACs are implementable (no vague requirements)
- [x] Tasks map correctly to ACs (every AC has corresponding tasks)
- [x] Dev notes are comprehensive (architecture, patterns, constraints)
- [x] Previous story learnings are referenced and applied
- [x] Architecture alignment verified (matches architecture.md)
- [x] Anti-patterns documented (what NOT to do)
- [x] Testing strategy is clear (how to verify)
- [x] File structure matches project conventions
- [x] TypeScript/types are properly specified
- [x] Accessibility requirements included (if applicable)

**Core Validation Question:** "Can Amelia (DEV agent) implement this story without asking any clarification questions?"

{{#if improvements_found > 0}}
**Answer:** NO - {{improvements_found}} gaps identified that would require clarification.
{{else}}
**Answer:** YES - Story contains all context needed for flawless implementation.
{{/if}}

### Patterns Observed

{{#if patterns_observed}}
{{#each patterns_observed}}
- **{{pattern_name}}:** {{pattern_description}}
{{/each}}
{{else}}
No significant patterns observed in this validation.
{{/if}}

### Recommendations

{{#if recommendations}}
{{#each recommendations}}
- {{this}}
{{/each}}
{{else}}
No additional recommendations - story meets all quality standards.
{{/if}}

---

## Competitive Stats

**Validator Performance:**
- Findings identified: {{improvements_found}}
- Quality improvement: +{{improvement_delta}} points
- User acceptance rate: {{user_acceptance_rate}}%

{{#if improvements_found > 0}}
**Validator Success:** Found {{improvements_found}} improvements the original creator missed, improving story quality by {{improvement_delta}} points!
{{else}}
**Validator Success:** Confirmed story quality - thorough validation provides confidence that story is ready for development.
{{/if}}

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| {{validation_date}} | Validation completed - {{improvements_applied}} improvements applied | {{validator_model}} |

---

_This validation report was generated by the validate-create-story workflow._

