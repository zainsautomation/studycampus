

# Fix: Admin Sidebar Reloads on Every Page Navigation

## Problem

Every admin page is lazy-loaded and individually wraps itself in `<AdminLayout>`. The single `<Suspense>` boundary sits above all routes in `App.tsx`. When navigating between admin pages:

1. React suspends while loading the new lazy chunk
2. The `<PageLoader>` fallback (full-screen spinner) replaces **everything**, including the sidebar
3. When the chunk loads, `AdminLayout` + sidebar re-mount from scratch with entry animations

This causes the sidebar to flash/reload on every admin navigation.

## Solution

Create a **persistent admin layout route** that renders `AdminLayout` once, with a nested `<Suspense>` boundary only around the page content. Admin child pages stop wrapping themselves in `AdminLayout`.

### Architecture Change

```text
BEFORE:
  <Suspense fallback={PageLoader}>      ← covers everything
    <Route path="/admin" element={<AdminDashboard />} />  ← each has <AdminLayout>
    <Route path="/admin/notes" element={<ManageNotes />} />

AFTER:
  <Route path="/admin" element={<AdminLayoutRoute />}>   ← persistent layout
    <Route index element={<AdminDashboard />} />          ← content only
    <Route path="notes" element={<ManageNotes />} />
  </Route>
```

### Steps

1. **Create `AdminLayoutRoute` wrapper** -- A new component that renders `AdminLayout` with an `<Outlet>` inside a local `<Suspense>` boundary. The suspense fallback is a small content-area spinner (not full-page).

2. **Update `App.tsx` routing** -- Replace flat admin routes with nested routes under a single `/admin` parent that uses `AdminLayoutRoute` as its element.

3. **Update `AdminLayout`** -- Accept `children` as before, no changes needed (the Outlet will pass content as children... actually we'll render Outlet inside AdminLayout).

4. **Remove `<AdminLayout>` wrapper from every admin page** (13 files):
   - `AdminDashboard.tsx`, `ManageNotes.tsx`, `ManageMCQ.tsx`, `ManageAnnouncements.tsx`, `ManageUpdates.tsx`, `ManageSubjects.tsx`, `ManageUsers.tsx`, `Analytics.tsx`, `ActivityLog.tsx`, `ManageQandA.tsx`, `ManagePosts.tsx`, `ManageRequests.tsx`, `Moderation.tsx`
   - Each page will just return its content directly; `title` and `description` will be passed via the layout route or kept inline.

5. **Handle page titles** -- Since `AdminLayout` needs `title`/`description` per page, create a lightweight approach: either use `<Outlet context>` or have each page render its own title header while the layout only provides the sidebar + scrollable container.

### Recommended approach for titles

Simplest: Split `AdminLayout` so it only provides the sidebar + main scroll container. Each page keeps its own title/description header inline. This avoids complex context passing.

### Files to modify
- `src/App.tsx` -- Nested admin routes
- `src/components/admin/AdminLayout.tsx` -- Remove title props, use `<Outlet>`
- All 13 admin page files -- Remove `<AdminLayout>` wrapper, keep title inline

### Result
- Sidebar stays mounted and never re-renders on navigation
- Only the content area shows a loading spinner during lazy chunk loads
- Entry animations on sidebar only play once on initial admin visit

