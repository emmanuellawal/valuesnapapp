---
workflowName: validate-create-story
creationDate: 2025-12-12
module: BMM
status: COMPLETE
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
---

# Workflow Creation Summary

## Workflow Information

- **Name:** validate-create-story
- **Module:** BMM (BMAD Method Management)
- **Phase:** 4-implementation
- **Created:** 2025-12-12
- **Location:** `.bmad/bmm/workflows/4-implementation/validate-create-story/`

## Generated Files

1. **workflow.yaml** - Main workflow configuration
   - Defines workflow metadata, variables, input patterns
   - Location: `workflow.yaml`

2. **instructions.xml** - Workflow execution instructions
   - Contains all 7 steps with detailed execution logic
   - Location: `instructions.xml`

3. **checklist.md** - Validation checklist
   - 10-point systematic quality gate
   - 5-dimension scoring rubric (0-10 scale)
   - Location: `checklist.md`

4. **validation-report-template.md** - Report template
   - Structured template for validation reports
   - Handles both improvements found and clean bill of health scenarios
   - Location: `validation-report-template.md`

5. **workflow-plan-validate-create-story.md** - Design documentation
   - Complete requirements, design, and build documentation
   - Location: `workflow-plan-validate-create-story.md`

## Quick Start Guide

### How to Run the Workflow

**From any agent context:**
```
*validate-create-story
```

**With explicit story path:**
```
*validate-create-story story_path="docs/sprint-artifacts/0-3-create-primitive-components.md"
```

**Auto-discovery:**
- If no story path provided, workflow auto-discovers first "drafted" or "ready-for-dev" story from sprint-status.yaml

### Workflow Flow

1. **Initialize** - Loads story file (user-provided or auto-discovered)
2. **Discover** - Loads all source documents with fresh context
3. **Re-Analysis** - Exhaustive systematic analysis using 10-point checklist
4. **Generate Findings** - Calculates quality score (0-10) and categorizes findings
5. **Present & Approve** - Interactive findings review (accept/reject/modify)
6. **Apply Improvements** - Updates story file with approved improvements
7. **Generate Report** - Creates validation report with competitive stats

### Expected Outputs

- **Updated Story File** - Story file with approved improvements applied
- **Validation Report** - `{story_key}-validation-report.md` with:
  - Quality score (before/after)
  - Findings breakdown
  - Validator scorecard
  - User decisions
  - Competitive stats

## Next Steps

### Immediate Testing

1. **Test with Story 0-3:**
   ```
   *validate-create-story story_path="docs/sprint-artifacts/0-3-create-primitive-components.md"
   ```

2. **Verify Fresh Context:**
   - Confirm validator loads documents independently
   - Check that no prior knowledge is assumed

3. **Test All Menu Options:**
   - Accept all improvements
   - Select individually
   - Reject all
   - Advanced Elicitation
   - Party Mode

### Post-Creation Recommendations

1. **Run Compliance Check:**
   - Start a new Claude conversation (fresh context)
   - Run: `/bmad:bmm:workflows:workflow-compliance-check`
   - Provide path: `.bmad/bmm/workflows/4-implementation/validate-create-story/workflow.yaml`
   - Fix any violations found

2. **Test Workflow:**
   - Run on Story 0-3 to verify functionality
   - Test zero improvements path (if high-quality story available)
   - Verify report generation

3. **Documentation:**
   - Consider adding example validation reports
   - Document common use cases
   - Share with team if needed

4. **Integration:**
   - Add to workflow index if applicable
   - Update any workflow documentation
   - Consider adding to sprint-planning recommendations

## Workflow Features

- ✅ Fresh context protocol (zero prior knowledge)
- ✅ Exhaustive systematic analysis (10-point checklist)
- ✅ 5-dimension quality scoring (0-10 scale)
- ✅ Interactive findings approval
- ✅ Competitive framing (celebrates validator success)
- ✅ Zero improvements path (clean bill of health)
- ✅ Advanced Elicitation integration
- ✅ Party Mode integration
- ✅ Comprehensive validation report generation

## Support

For questions or issues:
- Review workflow plan: `workflow-plan-validate-create-story.md`
- Check checklist: `checklist.md`
- Review instructions: `instructions.xml`

---

_Workflow creation completed successfully on 2025-12-12_

