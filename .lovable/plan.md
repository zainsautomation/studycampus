

## Plan: Moderation Page Improvements

### Issues identified

1. **Cannot clear/delete resolved cases** - No way to remove dismissed/removed/warned entries from the moderation queue
2. **Post image not showing** - When the original post is deleted, the moderation card shows nothing because `item.content` is null (post no longer exists in DB)
3. **Post deletion should move Drive images to trash, not permanently delete** - Use `files.update({ trashed: true })` instead of `files.delete()`
4. **Delete confirmation dialog should say "Delete post?" not mention Drive** - Simplify the user-facing message

### Changes

#### 1. Moderation page (`src/pages/admin/Moderation.tsx`)

**Add "Clear" button for resolved cases:**
- On non-pending items (dismissed/removed/warned), show a small "Clear" or trash icon button that deletes the moderation_queue row
- Add a "Clear All Resolved" bulk action button above the list when viewing "All Reports" tab and resolved items exist

**Handle deleted content gracefully:**
- When `item.content` is null (post was already deleted), show a placeholder card: "This content has been deleted" with a muted style instead of showing nothing
- Still show the report reason, author info (from moderation record), and reporter info

**Google Drive: trash instead of permanent delete:**
- In `deleteContent()`, change `window.gapi.client.drive.files.delete({ fileId })` to `window.gapi.client.drive.files.update({ fileId, resource: { trashed: true } })`
- Same change in the `handleQuickAction` path

**Simplify delete confirmation text:**
- The moderation page uses inline quick actions without a separate dialog for delete confirmation. The toast message after removal currently says "content removed" which is fine. No separate dialog changes needed here.

#### 2. Posts page delete dialog (`src/pages/Posts.tsx`)

**Simplify confirmation dialog text:**
- Change from "This will permanently delete this post and its image" to just "This will permanently delete this post."
- Remove the conditional `{postToDelete?.imageUrl ? " and its image" : ""}` text

**Google Drive: trash instead of permanent delete:**
- Change `window.gapi.client.drive.files.delete({ fileId })` to `window.gapi.client.drive.files.update({ fileId, resource: { trashed: true } })`

#### 3. Files to modify

| File | Changes |
|------|---------|
| `src/pages/admin/Moderation.tsx` | Add clear/delete buttons for resolved cases; handle null content; Drive trash instead of delete |
| `src/pages/Posts.tsx` | Simplify delete dialog text; Drive trash instead of delete |

