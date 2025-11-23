# Deprecated Components

This folder contains components that have been replaced but are kept for reference.

## ApplicationTypeModal.jsx
**Deprecated:** 2025-01-XX  
**Replaced by:** AIInterviewEditor.jsx  
**Reason:** Migration to unified sections-based format

### What it did:
- Old form editor for manual application type creation
- Used flat `fields` array format
- Had UFL (Universal Field Library) integration via PurposeMatcher

### Why it was replaced:
- Two editors created confusion (ApplicationTypeModal vs AIInterviewEditor)
- Flat fields format less flexible than sections format
- PDF Parser and CSV Import already used AIInterviewEditor
- Maintaining two editors created technical debt

### Migration path:
1. All creation methods now use sections format
2. All forms open in AIInterviewEditor
3. Old forms migrated via `migrate_to_sections.py`
4. UFL integration to be re-added to AIInterviewEditor (see FUTURE_UFL_INTEGRATION.md)

**DO NOT DELETE** - May need for reference during UFL re-integration.
