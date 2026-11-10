# Student verification and community posting access

## What students and admins get
- Add a private roll-number field to the student’s own profile; only that student and admins can view it.
- Add a verification request flow where a student submits their name and roll number, then sees a clear pending, approved, or needs-resubmission state.
- Add a verification queue to Admin → Users. Admins can review the submitted details, contact the student using the account email, and approve or reject with an optional note.
- Show a verified badge on public profiles without exposing roll numbers.
- Let everyone continue reading Posts, while unverified students cannot publish, like, or comment there. Other areas such as Q&A and Requests remain unchanged.

## Delivery steps
1. Add a private verification-request table with owner/admin-only reads, student-only submissions, admin-only decisions, and a rule preventing multiple pending requests for one student.
2. Enforce verified-only posting and post interactions in Supabase row-level security, not just by hiding controls in the page. Keep post reading available to current visitors.
3. Add a polished verification area to the student profile and a verified indicator to public profiles; keep roll numbers out of public profile data.
4. Add a searchable pending/reviewed queue to the existing Admin → Users page, with contact, approve, reject, and optional admin-note actions.
5. Update the Posts experience to explain verification status and provide read-only access to unverified students. Retain normal post interactions for verified students and admins.
6. Verify database access rules, check the changed app pages, and run the project’s available checks.

## Technical details
- Use a dedicated `public.student_verification_requests` table so roll numbers and review details do not enter public profile responses. Give authenticated users only `SELECT`/`INSERT` grants and admins full access; enable RLS and create owner/admin policies in the required order.
- Store each application as a separate row with submitted name, roll number, status, timestamps, reviewer, and optional note. A partial unique index allows at most one pending request per student while preserving prior decisions.
- Add a narrowly scoped `public.is_verified_student(uuid)` security-definer helper with a fixed search path. Use it in insert/update/delete policies for posts, post likes, and post comments; preserve Q&A comments and all existing read policies.
- Extend the existing safe public-profile RPC with a verified boolean only. The private roll number is fetched from the student’s own request or the admin queue, never from the public-profile RPC.
- Use the existing admin email lookup for a `mailto:` contact action; approval remains an explicit admin decision after contact, with no invented external contact channel.
- Record the dedicated request table and database-enforced posting gate in the project’s root `AGENTS.md` when implementation is approved.

## Acceptance checks
- An unverified signed-in student can read Posts but cannot create a post, like, or comment, including through direct database requests.
- A verified student can create posts and use post likes/comments normally.
- A student cannot see another student’s roll number or alter their request’s review status.
- Admins can review and decide requests; rejected students can submit again, and duplicate pending requests are blocked.
- Public profiles may show verification status but never a roll number; Q&A behavior remains unchanged.