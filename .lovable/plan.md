

## Post Section Redesign Plan

### Current Issues (Pros/Cons Analysis)

**Current Pros:**
- Functional infinite scroll, like/comment system
- Google Drive image integration works
- Category filtering exists
- Rich text editor for post creation

**Current Cons:**
- PostCard is visually flat and dense -- too much padding, cramped header
- Category filter uses `flex-wrap` which breaks on narrow screens
- Like button is the only visible action; comment toggle is buried
- Image takes full width with no aspect ratio control, can look awkward
- PostForm "What's on your mind?" is generic, not visually engaging
- No visual distinction between post types (help vs meme vs discussion)
- Page header is plain, no engagement stats or feed context
- No skeleton variation for image posts vs text-only
- Mobile: action bar wraps badly in PostForm, category select is too wide

### Redesign Approach

Mobile-first, social-media-inspired feed with clear visual hierarchy. Minimal structural changes -- keep all existing logic, mutations, data flow intact. Focus on component-level UI/UX polish.

---

### Changes

#### 1. `PostCard.tsx` -- Complete visual refresh

- **Header**: Tighter layout. Avatar (36px mobile, 40px desktop), name + time on one line, category dot indicator instead of full badge inline. Move CategoryBadge to a subtle colored dot or small pill next to the time.
- **Pinned indicator**: Subtle top banner strip with gradient instead of ring + icon inline.
- **Content**: Add `line-clamp-6` with "Read more" expand for long posts. Better text spacing.
- **Image**: Use `aspect-ratio` container (16:9 default, auto for portrait). Rounded-2xl with subtle shadow. Skeleton placeholder while loading.
- **Action bar redesign**: Horizontal row with Like (heart + count), Comment (bubble + count), and 3-dot menu all on one line. Like and Comment as ghost icon buttons, not pill-shaped. More compact.
- **Comment section**: Move the comment toggle into the action bar (clicking comment icon expands). Remove separate button.
- **Pinned posts**: Thin colored top border (2px primary gradient) instead of ring.

#### 2. `PostForm.tsx` -- Smarter composer

- Collapsed state: Avatar + "What's on your mind?" in a rounded-full input-like bar (keep existing).
- Expanded state: Clean the toolbar. Put image button, category selector, and anonymous toggle in a single icon toolbar row. Category as icon-only dropdown on mobile, full label on desktop.
- Better image preview: Show as rounded card with aspect ratio, overlay remove button.
- Submit button: Primary color, icon-only on mobile, "Post" label on desktop.

#### 3. `CategoryFilter.tsx` -- Horizontal scroll chips

- Use `overflow-x-auto scrollbar-hide` horizontal scroll instead of `flex-wrap`.
- Chips: Rounded-full, smaller padding, tap-friendly (min 44px touch target).
- Selected state: Filled background with category color, unselected: ghost/outline.
- Add subtle scroll fade indicators on edges.

#### 4. `CategoryBadge.tsx` -- Compact variant

- Add a `compact` prop: renders as a small colored dot (6px circle) with tooltip showing category name. Used in PostCard header.
- Keep full badge for filter and other contexts.

#### 5. `Posts.tsx` -- Page-level improvements

- Constrain feed to `max-w-2xl mx-auto` for a focused reading experience (like Twitter/Instagram).
- Reduce `space-y` between cards from 4 to 3 for tighter feed feel.
- Better empty state with illustration-style icon arrangement.
- Staggered animation on post cards using index-based delay.

#### 6. `PostCommentSection.tsx` -- Integrate into action bar

- Export a `commentCount` display and toggle function so PostCard can place the comment icon in the action bar.
- When expanded, render below the action bar with a smooth slide-down.

---

### Files to modify

| File | Summary |
|------|---------|
| `src/components/posts/PostCard.tsx` | Redesigned layout: compact header, image aspect ratio, unified action bar, pinned banner |
| `src/components/posts/PostForm.tsx` | Cleaner toolbar, responsive icon-only on mobile, better image preview |
| `src/components/posts/CategoryFilter.tsx` | Horizontal scroll chips, no wrap, scroll-fade |
| `src/components/posts/CategoryBadge.tsx` | Add compact dot variant |
| `src/components/posts/PostCommentSection.tsx` | Minor: expose toggle for action bar integration |
| `src/pages/Posts.tsx` | max-w-2xl feed, tighter spacing, staggered animations |

### What stays the same
- All data fetching, mutations, infinite scroll logic
- Google Drive URL transformation
- Image upload flow
- Report/moderation integration
- Comment threading system

