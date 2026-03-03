# Redesign: User Management Page

The current page is functional but plain — raw tables with minimal visual hierarchy. Here's a polished redesign plan:

## Changes to `src/pages/admin/ManageUsers.tsx`

### 1. Add Stat Cards at Top

Add summary stat cards above the tabs showing:

- **Total Students** count with Users icon
- **Active Invite Codes** count with Ticket icon  
- **Total Code Uses** (sum of current_uses) with CheckCircle icon

Cards use `bg-card border border-border/50 rounded-xl` with icon accent colors, matching the existing admin analytics card pattern.

### 2. Improve Tabs Styling

- Center the tabs and make them wider (`max-w-lg mx-auto`)
- Add subtle background container around tabs area

### 3. Redesign Invite Codes Tab

- Add a search/filter input alongside the "Generate Code" button in a proper toolbar row
- Replace plain table rows with **card-style rows**: each code gets a subtle card with rounded corners, slight padding, and hover elevation
- Show code description as a secondary line under the code
- Usage shown as a mini progress bar (not just text badge)
- Status toggle and actions inline with better spacing
- Mobile: stack into cards instead of hiding columns

### 4. Redesign Students Tab

- Add a **search input** to filter students by name or email
- Each student row becomes a card-like row with an **avatar circle** (initials-based) on the left
- Name bold, email subtle below, joined date right-aligned
- Add student count badge in the header
- Mobile: responsive card layout

### 5. Empty States

- Improve empty state illustrations with larger icons, descriptive text, and a CTA button

### 6. Loading State

- Add shimmer skeletons (3 skeleton rows) instead of a plain spinner, matching the project's shimmer pattern

## File to edit

- `src/pages/admin/ManageUsers.tsx` — Full redesign of the component  
  
mobile responsive first then other devices like desktop
- &nbsp;