

## Bug: Both "MCQ Tests" and "MCQ Results" highlight as active

### Root Cause

The `isActive` function uses `startsWith` matching:

```typescript
const isActive = (path: string) => {
  if (path === '/admin') return location.pathname === '/admin';
  return location.pathname.startsWith(path);
};
```

When the user navigates to `/admin/mcq-results`, both `/admin/mcq` and `/admin/mcq-results` match because `"/admin/mcq-results".startsWith("/admin/mcq")` is `true`.

### Fix

Update the `isActive` function (appears twice -- desktop sidebar line 126 and mobile nav line 373) to use exact matching or boundary-aware matching:

```typescript
const isActive = (path: string) => {
  if (path === '/admin') return location.pathname === '/admin';
  return location.pathname === path || location.pathname.startsWith(path + '/');
};
```

This ensures `/admin/mcq` only matches `/admin/mcq` or `/admin/mcq/something`, but NOT `/admin/mcq-results`.

### Files to modify

| File | Change |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Update `isActive` in both `AdminSidebar` (line ~126) and `AdminMobileNav` (line ~373) |

One small, targeted fix -- two lines changed.

