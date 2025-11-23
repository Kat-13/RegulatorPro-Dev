# Testing Checklist: Single Editor Migration

## Pre-Testing Setup

### 1. Database Backup
```bash
cd /home/ubuntu/RegulatorPro-Dev/backend
python3.11 migrate_to_sections.py --dry-run
```
Review what will be migrated, then:
```bash
python3.11 migrate_to_sections.py --backup
```

### 2. Start Services
```bash
# Backend
cd /home/ubuntu/RegulatorPro-Dev/backend
python3.11 app.py

# Frontend
cd /home/ubuntu/RegulatorPro-Dev
npm run dev
```

## Test Cases

### Test 1: PDF Parser (Already Working)
- [ ] Upload a PDF form via Smart PDF Parser
- [ ] Click "Save as Draft"
- [ ] Verify it appears on Kanban board
- [ ] Click to open - should open in AIInterviewEditor
- [ ] Verify sections, questions, and instructions display correctly
- [ ] Make edits and save
- [ ] Verify changes persist

### Test 2: Manual Creation (NEW)
- [ ] Click "+ New License Type" on Kanban board
- [ ] Should open AIInterviewEditor (not old modal)
- [ ] Create a new form with:
  - Form name and description
  - At least 2 sections
  - Multiple questions per section
  - Different field types (text, date, radio, checkbox)
  - At least one instruction block
- [ ] Save the form
- [ ] Verify it appears on Kanban board
- [ ] Reopen and verify all data saved correctly

### Test 3: Bulk Import (UPDATED)
- [ ] Prepare bulk import JSON with `fields` array (old format)
- [ ] POST to `/api/application-types/import`
- [ ] Verify forms created successfully
- [ ] Open one of the imported forms
- [ ] Should open in AIInterviewEditor
- [ ] Verify fields converted to sections format
- [ ] Check `parser_version` is set to 'Bulk_Import_v2'

### Test 4: CSV Import (Already Working)
- [ ] Import a CSV file with application type fields
- [ ] Verify form created
- [ ] Open form - should be in AIInterviewEditor
- [ ] Verify fields organized into sections

### Test 5: Existing Forms (MIGRATED)
- [ ] Run migration script (if not done already)
- [ ] Open a previously created form (old format)
- [ ] Should open in AIInterviewEditor
- [ ] Verify fields converted to sections
- [ ] Edit and save
- [ ] Verify changes persist

### Test 6: Licensee Portal (CRITICAL)
- [ ] Switch to Licensee portal
- [ ] Select an application type
- [ ] Fill out the form
- [ ] Verify all field types render correctly:
  - [ ] Text inputs
  - [ ] Date pickers
  - [ ] Radio buttons
  - [ ] Checkboxes
  - [ ] Dropdowns
  - [ ] File uploads
  - [ ] Signature fields
- [ ] Verify conditional logic works
- [ ] Verify validation works
- [ ] Submit the application
- [ ] Verify submission saved correctly

### Test 7: Draft vs Published
- [ ] Create a new form, save as draft
- [ ] Verify it shows "Draft" status on Kanban
- [ ] Verify it does NOT appear in Licensee portal
- [ ] Toggle to "Published"
- [ ] Verify it appears in Licensee portal
- [ ] Toggle back to "Draft"
- [ ] Verify it disappears from Licensee portal

## Known Issues / Expected Behavior

### UFL Integration
- **Expected:** Manual creation does NOT have field library lookup
- **Workaround:** Fields must be created manually
- **Future:** Will be re-added (see FUTURE_UFL_INTEGRATION.md)

### Empty Sections
- **Expected:** New manual forms start with one empty section
- **Workaround:** Add sections and questions manually
- **This is normal:** AIInterviewEditor is designed for editing, not blank creation

### Field Types
- **Expected:** All field types from PDF parser should work
- **Test carefully:** Date, signature, file upload fields
- **Check:** Conditional logic and validation

## Rollback Plan

If critical issues found:

```bash
# Switch back to main branch
git checkout main

# Restore database backup (if needed)
cd backend
cp instance/regulatory_platform_backup_YYYYMMDD_HHMMSS.db instance/regulatory_platform.db

# Restart services
```

## Success Criteria

- [ ] All 4 creation methods work
- [ ] All forms open in AIInterviewEditor
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Licensee portal renders all forms correctly
- [ ] Draft/Published workflow works
- [ ] Data persists correctly after edits

## Sign-off

- **Tester:** _______________
- **Date:** _______________
- **Result:** [ ] PASS [ ] FAIL
- **Notes:** _______________
