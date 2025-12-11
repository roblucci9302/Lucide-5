# Phase 2 Manual Testing Guide

This guide provides step-by-step instructions for manually testing all Phase 2 features in the Lucide application.

## Prerequisites

Before testing, ensure:
- ✅ Application is running (`npm start`)
- ✅ You have created at least one meeting session with transcripts
- ✅ Meeting notes have been generated

---

## Phase 2.1: Participant Attribution

### Test 1: Detect Speakers
**Steps:**
1. Open a completed meeting session
2. Navigate to the "Résumé" tab in Post-Meeting Panel
3. Click the "✏️ Assigner" button
4. **Expected:** Participant modal opens showing detected speakers (Me, Them, etc.)

### Test 2: Assign Participant Details
**Steps:**
1. In the Participant Modal, fill in details for each speaker:
   - Name: Required field
   - Email: Optional
   - Role: Optional
   - Company: Optional
2. Click "Enregistrer"
3. **Expected:** Modal closes, success message appears

### Test 3: Autocomplete Functionality
**Steps:**
1. Open Participant Modal again
2. Start typing in the "Nom" field
3. **Expected:** Autocomplete suggestions appear based on previous participants

### Test 4: Label Replacement in Notes
**Steps:**
1. After assigning participants, check the meeting notes
2. Look at "Points clés", "Éléments d'action", "Décisions"
3. **Expected:** Speaker labels ("Me", "Them") are replaced with actual names

### Test 5: View Saved Participants
**Steps:**
1. Reload the session
2. Open Participant Modal
3. **Expected:** Previously saved participant details are pre-filled

---

## Phase 2.2: Email Generation

### Test 6: Generate Brief Email
**Steps:**
1. Navigate to the "Export" tab
2. Click "📝 Email bref"
3. **Expected:** Email preview modal opens with concise summary

### Test 7: Generate Detailed Email
**Steps:**
1. In Export tab, click "📋 Email détaillé"
2. **Expected:** Email preview shows full details with all sections:
   - Key points
   - Decisions
   - Action items
   - Next steps

### Test 8: Generate Action-Only Email
**Steps:**
1. Click "✅ Actions seulement"
2. **Expected:** Email focuses only on action items and tasks

### Test 9: AI-Generated Email (If AI configured)
**Steps:**
1. Click "🤖 Email IA (Claude)"
2. Wait for generation
3. **Expected:** AI-generated follow-up email appears

### Test 10: Email Preview Modes
**Steps:**
1. In Email Preview Modal, toggle between "Texte" and "HTML"
2. **Expected:** Both plain text and HTML-formatted versions display correctly

### Test 11: Copy to Clipboard
**Steps:**
1. In Email Preview Modal, click "📋 Copier"
2. Paste into a text editor
3. **Expected:** Email content is copied correctly

### Test 12: Open in Mail Client
**Steps:**
1. Click "📧 Ouvrir dans mail"
2. **Expected:** Default email client opens with pre-filled content

### Test 13: Edit Recipients
**Steps:**
1. In Email Preview Modal, edit the "À:" field
2. Add/remove email addresses
3. Click "Ouvrir dans mail"
4. **Expected:** Updated recipients appear in mail client

---

## Phase 2.3: Task Management

### Test 14: Auto-Assign Emails
**Steps:**
1. Navigate to "Tâches" tab
2. Verify some tasks have "assigned_to" but no email
3. First assign participants (Phase 2.1)
4. Click "📧 Attribuer emails"
5. **Expected:**
   - Success message shows "Assigned emails to X out of Y tasks"
   - Tasks now show email addresses

### Test 15: Export Tasks to CSV
**Steps:**
1. In Tâches tab, click "📊 Export CSV"
2. Check your Downloads folder
3. Open the CSV file
4. **Expected:**
   - File named `tasks-{sessionId}-{timestamp}.csv`
   - Contains all task fields: description, assigned to, email, deadline, priority, status, etc.
   - CSV properly formatted with headers

### Test 16: Update Task Fields
**Steps:**
1. Edit a task and add:
   - Notes
   - Estimated hours
   - Tags
2. Save the task
3. **Expected:** New fields are saved and displayed

### Test 17: Change Task Status
**Steps:**
1. Change a task status to "Completed"
2. **Expected:**
   - Status updates
   - Completed timestamp is set
   - Task appears grayed out or marked complete

### Test 18: Block a Task
**Steps:**
1. Change task status to "Blocked"
2. Provide a blocked reason
3. **Expected:** Task shows as blocked with reason displayed

### Test 19: Set Task Reminder
**Steps:**
1. Edit a task
2. Set a reminder date
3. Save
4. **Expected:** Reminder date is stored (reminder notifications would require additional implementation)

### Test 20: Filter by Status
**Steps:**
1. Use status filter in Tâches tab
2. Select "Pending", "Completed", "Blocked"
3. **Expected:** Only tasks with selected status are shown

### Test 21: Identify Overdue Tasks
**Steps:**
1. Check if any tasks have passed deadlines
2. **Expected:** Overdue tasks are highlighted or filtered

---

## Phase 2.4: Follow-up Suggestions

### Test 22: Generate Suggestions
**Steps:**
1. In "Résumé" tab, look for the suggestions section
2. **Expected:**
   - System automatically generates suggestions
   - Shows up to 5 suggestions
   - Each suggestion has a priority indicator (🔴🟡🟢)

### Test 23: Suggestion Types
**Verify the following suggestion types appear (when applicable):**
- 📧 Unassigned tasks needing assignment
- ⏰ Upcoming deadline reminders
- 🔁 Recurring meeting patterns
- 📊 Filter suggestions for pending/blocked tasks

### Test 24: Accept a Suggestion
**Steps:**
1. Click "✓ Appliquer" on a suggestion
2. **Expected:**
   - Suggestion action is executed
   - Suggestion is removed from list
   - If suggestion requires navigation (e.g., to Tasks tab), user is redirected

### Test 25: Dismiss a Suggestion
**Steps:**
1. Click "✕" on a suggestion
2. **Expected:** Suggestion is removed from view

### Test 26: Suggestion Ranking
**Steps:**
1. Check the order of suggestions
2. **Expected:**
   - High priority suggestions appear first
   - Suggestions are ranked by relevance (priority × confidence)

### Test 27: Historical Pattern Detection
**Steps:**
1. Create multiple meetings with same title (e.g., "Weekly Sync")
2. Check suggestions
3. **Expected:** Suggestion to schedule next occurrence appears

### Test 28: AI Suggestions (If configured)
**Steps:**
1. Ensure AI is enabled in settings
2. Generate suggestions
3. **Expected:** AI-powered contextual suggestions appear

---

## Integration Tests

### Test 29: End-to-End Workflow
**Complete workflow:**
1. Create meeting with transcripts
2. Generate meeting notes
3. Assign participants → Notes update with real names
4. Auto-assign emails to tasks → Tasks get email addresses
5. Generate AI email → Email includes personalized participant info
6. Accept a suggestion → Action executes correctly
7. Export tasks to CSV → All data exports correctly

### Test 30: Data Persistence
**Steps:**
1. Complete Phase 2 actions (assign participants, set reminders, etc.)
2. Close and reopen application
3. **Expected:** All Phase 2 data persists across sessions

---

## Validation Checklist

After completing all tests, verify:

- [ ] All speaker labels replaced with participant names
- [ ] Email generation works for all 4 templates
- [ ] Task auto-assignment matches participants correctly
- [ ] CSV export includes all task fields
- [ ] Suggestions generate and execute properly
- [ ] No console errors during testing
- [ ] Data persists after app restart
- [ ] UI is responsive and intuitive

---

## Troubleshooting

### Common Issues:

**Participants not saving:**
- Ensure "Name" field is filled (required)
- Check console for errors

**Email generation fails:**
- Verify meeting notes exist
- Check if AI service is configured (for AI emails)

**Auto-assign emails doesn't work:**
- Ensure participants are assigned first
- Verify participant names match task assignees

**Suggestions not appearing:**
- Ensure meeting has tasks and participants
- Check if there's enough data for pattern analysis

**CSV export fails:**
- Check write permissions to Downloads folder
- Verify tasks exist for the session

---

## Expected Results Summary

**Phase 2.1:** ✅ Participants assigned, labels replaced in notes
**Phase 2.2:** ✅ All 4 email types generated successfully
**Phase 2.3:** ✅ Tasks managed with emails, tags, reminders, CSV export
**Phase 2.4:** ✅ Intelligent suggestions generated and actionable

---

## Notes

- Some features require AI configuration (Anthropic API key)
- Tests should be performed in an actual Electron environment
- Database is SQLite-based and stored locally
- All test data can be cleaned by deleting test sessions

---

**Testing completed by:** __________________
**Date:** __________________
**Overall Phase 2 Status:** ⬜ Pass ⬜ Fail

**Issues found:**
