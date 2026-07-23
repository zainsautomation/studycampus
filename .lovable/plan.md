# Plan: "What's New" for Students + Note View Analytics for Admin

Two related features:
1. **Students** get a "What's New" badge/panel showing recently added content (notes, MCQs, announcements, updates) since their last check. Icon shows a dot when there's new stuff; opening it clears the badge.
2. **Admins** can see how many students viewed each note (unique viewers + total views).

---

## Part 1 — Student "What's New" Feed

### UX

- New **bell/sparkle icon** in the top Header (desktop) and next to the profile in mobile Header — shows a red dot + count when new items exist since `last_checked_at`.
- Clicking the icon opens a **Popover / Sheet** (Sheet on mobile, Popover on desktop) listing new items grouped by type:
  - 📚 New Notes (title, subject, date)
  - 🧠 New MCQ Tests (title, subject)
  - 📢 New Announcements (title, priority)
  - 📅 New Events (title, event_date)
- Each item is a link to its detail page.
- Opening the panel automatically updates the user's `last_checked_at` → badge clears.
- Empty state: "You're all caught up ✨".
- Guests: icon hidden (feature requires auth).

### Data source

No new items table needed — query the existing tables filtered by `created_at > last_checked_at`, limit 20 per type.

### Storage of `last_checked_at`

Add a single column `whats_new_checked_at timestamptz` on `profiles`. Default `now()` for existing users so the badge doesn't explode on first load.

### Files

| File | Action |
|---|---|
| `src/components/whats-new/WhatsNewButton.tsx` | Create — icon + badge + popover trigger |
| `src/components/whats-new/WhatsNewPanel.tsx` | Create — grouped list of new items |
| `src/hooks/useWhatsNew.tsx` | Create — fetch counts + items, mark as read mutation |
| `src/components/layout/Header.tsx` | Modify — mount button next to theme toggle |
| DB migration | Add `whats_new_checked_at` column + backfill |

---

## Part 2 — Admin Note View Analytics

### UX

- On **Admin → Manage Notes**, each note row/card gets a small **"👁 N views · M unique"** badge.
- Clicking it opens a Sheet listing viewers (avatar, name, viewed_at) — paginated / limited to 50.
- On **Admin → Analytics**, add a "Top Viewed Notes" chart (already partially exists via `TopNotesCharts.tsx` — extend with unique viewer count).

### Data source

`note_views` table already exists and tracks per-user views. Just need to aggregate.

- **Total views** per note = `count(*)` from `note_views` grouped by `note_id`.
- **Unique viewers** = already unique because of the `(user_id, note_id)` upsert conflict target — so `count(*)` == unique viewers. Total impressions would need a separate approach; we'll surface **unique viewers** as the primary metric and label it clearly ("N students viewed").

Admin RLS on `note_views` already permits admin SELECT (confirmed in existing Activity Log usage). If not, add an admin SELECT policy.

### Files

| File | Action |
|---|---|
| `src/hooks/useNoteViewStats.tsx` | Create — fetch aggregated view counts per note |
| `src/components/admin/NoteViewersSheet.tsx` | Create — list of students who viewed a note |
| `src/pages/admin/ManageNotes.tsx` | Modify — show view count badge on each note, open sheet |
| DB migration (conditional) | Add admin SELECT policy on `note_views` if missing |

---

## Technical Notes

- `WhatsNewPanel` fetches with React Query, keyed by `user.id + whats_new_checked_at`. Mutation to mark-as-read sets `whats_new_checked_at = now()` and invalidates the query.
- Badge count = sum of the four categories, capped at "9+" for display.
- View-stats query uses a single grouped query per page (LEFT JOIN + count) rather than per-note fetches to avoid N+1.
- Mobile: WhatsNew opens as a bottom Sheet; desktop uses Popover anchored to the icon.
- No new dependencies.

---

## Rollout order

1. DB migration (add `whats_new_checked_at`; ensure admin policy on `note_views`).
2. Build `useWhatsNew` + button + panel; wire into Header.
3. Build `useNoteViewStats` + viewers sheet; wire into `ManageNotes`.
4. Verify with Playwright as `test@gmail.com` on desktop + mobile.
