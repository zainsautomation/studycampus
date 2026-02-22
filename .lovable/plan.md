

# Notes Preview Redesign and Folder Picker Fix

## Problem Summary
1. **Note Preview Dialog** needs a modern, polished redesign with better visual hierarchy
2. **Folder Picker** currently shows ALL folders in Google Drive, including the default storage folder and its subfolders -- it should only show user-created folders for selection
3. General UI polish needed across the notes flow

---

## Changes

### 1. Redesign NotePreviewDialog (`src/components/notes/NotePreviewDialog.tsx`)

**Current issues:** Plain header, minimal styling, no loading states, basic layout

**Enhancements:**
- Add a gradient accent bar at the top matching the subject color
- Improve header with a frosted-glass effect and better spacing
- Add file info metadata row (file size, type icon, date)
- Smooth entry animation using Framer Motion
- Better "no preview available" state with an illustration-style empty state
- Loading shimmer while the iframe/image loads
- Rounded action buttons with icon-only on mobile, labels on desktop
- Add keyboard shortcut hint for fullscreen (Esc to exit)

### 2. Redesign PDFViewer (`src/components/notes/PDFViewer.tsx`)

- Modernize the toolbar with pill-shaped zoom controls
- Add a subtle progress/loading indicator
- Better Google Drive access-restricted fallback with a card-style layout
- Improve zoom percentage display with a slider-style indicator

### 3. Redesign NoteDetailsDialog (`src/components/notes/NoteDetailsDialog.tsx`)

- Add a colored header strip matching the subject
- Better description area with a subtle card background
- Improved action button layout with clear visual hierarchy (primary action prominent)
- Add file type icon with colored background

### 4. Fix FolderPicker filtering (`src/components/admin/FolderPicker.tsx`)

**Current bug:** When the admin opens the folder picker during note upload, it shows ALL folders including the default notes storage folder and auto-organized subject subfolders. The user wants to see only the folders they manually created.

**Fix approach:**
- Accept an optional `excludeFolderIds` prop containing the IDs of folders to exclude (the default storage folder)
- Pass `googleDriveDefaultFolderId` from `ManageNotes.tsx` as the excluded folder
- Filter out the excluded folders from the listing results
- This way, the picker only shows folders the user can select as alternatives

### 5. Polish Student Notes Page (`src/pages/Notes.tsx`)

- Add a subtle gradient background to the subject cards header area
- Improve note card hover states with a colored left border accent
- Better empty state illustrations
- Add view count indicator on note cards

---

## Technical Details

### Files to modify:
1. `src/components/notes/NotePreviewDialog.tsx` -- Full redesign with Framer Motion animations, gradient accent, improved layout
2. `src/components/notes/PDFViewer.tsx` -- Modern toolbar, loading states
3. `src/components/notes/NoteDetailsDialog.tsx` -- Subject-colored header, better actions layout
4. `src/components/admin/FolderPicker.tsx` -- Add `excludeFolderIds` prop, filter results
5. `src/pages/admin/ManageNotes.tsx` -- Pass excluded folder IDs to FolderPicker
6. `src/pages/Notes.tsx` -- Polish note cards and subject cards

### No new dependencies needed
All enhancements use existing libraries: Framer Motion, Lucide icons, Tailwind CSS, and shadcn/ui components.

