## Plan: GPA / CGPA Result Calculator

### Goal
Students enter their semester subjects, credit hours and marks, see their GPA and overall CGPA (HEC 4.0 scale) instantly, save results to their account, and download a professional PDF transcript.

### What students will see
1. **New "Result Calculator" page** (in More menu + Dashboard quick link, signed-in students only).
2. **Student details card** — name (prefilled from profile), roll number, program/degree, university, session.
3. **Semesters** — add/remove semesters (e.g. "Semester 1"). Each semester has a table of subjects:
   - Subject name, credit hours (1–6), marks out of 100 (or choose a letter grade directly).
   - Grade and grade points appear live per row.
   - Semester GPA and total credits shown at the bottom.
4. **Summary panel** (sticky on desktop, bottom card on mobile) — CGPA, total credits, overall percentage, division/remarks, animated progress ring, per-semester GPA trend chart.
5. **Save** — results saved to the student's history; autosave draft so nothing is lost.
6. **History** — list of saved results with CGPA, date; open, edit, duplicate, delete, download.
7. **Download PDF transcript** — branded StudyCampus header, student details, each semester's subject table (marks, grade, points, credits), semester GPA, final CGPA, grading scale legend, generated date and a unique reference number. Clearly marked "Self-calculated — not an official transcript".

### HEC 4.0 grading scale
```text
85-100  A   4.00      65-69  C+  2.33
80-84   A-  3.66      61-64  C   2.00
75-79   B+  3.33      58-60  C-  1.66
71-74   B   3.00      50-57  D   1.00
68-70   B-  2.66      0-49   F   0.00
```
Note: HEC-recommended ranges vary slightly by university; the scale lives in one config so it can be adjusted. GPA = sum(points x credits) / sum(credits). CGPA uses all semesters' credits combined.

### Validation
- Marks 0–100, credits 1–6, subject name required (max 100 chars), max 12 semesters / 15 subjects each.
- Clear inline error messages; Save and Download disabled until valid.

### Technical details
- **Database**: new `gpa_results` table — user_id, title, student_details (jsonb), semesters (jsonb: subjects with name/credits/marks/grade), cgpa, total_credits, created_at, updated_at. GRANTs to authenticated + service_role, RLS so students only read/write their own rows, updated_at trigger. Admins can read (optional, for support).
- **Logic**: `src/lib/gpa.ts` — pure functions for grade lookup, semester GPA, CGPA (rounded to 2 decimals), zod schemas.
- **Hook**: `src/hooks/useGpaResults.tsx` — React Query list/get/create/update/delete keyed by user.id.
- **UI**: `src/pages/ResultCalculator.tsx`, components in `src/components/gpa/` (StudentDetailsForm, SemesterCard, SubjectRow, ResultSummaryPanel, ResultHistory). Uses existing design tokens, PageContainer, TapScale, Framer Motion, recharts.
- **PDF**: generated in the browser with `jspdf` + `jspdf-autotable` (no server needed), Unicode-safe font for names.
- **Routing**: `/result-calculator` behind ProtectedRoute; link in More page and Dashboard.
- **Analytics**: `gpa_result_saved`, `gpa_pdf_downloaded` events.

### Validation of the build
- Calculate a sample 2-semester case by hand and confirm matching GPA/CGPA.
- Save, reload, edit, delete; confirm another student cannot see it.
- Download PDF and visually check layout on mobile and desktop.
