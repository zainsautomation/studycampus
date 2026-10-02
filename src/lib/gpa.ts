import { z } from 'zod';

export interface GradeBand { min: number; grade: string; points: number }

// HEC 4.0 scale — adjust here if a university uses different ranges.
export const GRADE_SCALE: GradeBand[] = [
  { min: 85, grade: 'A', points: 4.0 },
  { min: 80, grade: 'A-', points: 3.66 },
  { min: 75, grade: 'B+', points: 3.33 },
  { min: 71, grade: 'B', points: 3.0 },
  { min: 68, grade: 'B-', points: 2.66 },
  { min: 65, grade: 'C+', points: 2.33 },
  { min: 61, grade: 'C', points: 2.0 },
  { min: 58, grade: 'C-', points: 1.66 },
  { min: 50, grade: 'D', points: 1.0 },
  { min: 0, grade: 'F', points: 0 },
];

export const MAX_SEMESTERS = 12;
export const MAX_SUBJECTS = 15;

export interface Subject {
  id: string;
  name: string;
  credits: number | '';
  marks: number | '';
  /** When set, the letter grade is used instead of marks */
  grade?: string;
}
export interface Semester { id: string; name: string; subjects: Subject[] }
export interface StudentDetails {
  name: string; rollNo: string; program: string; university: string; session: string;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const newSubject = (): Subject => ({ id: uid(), name: '', credits: 3, marks: '' });
export const newSemester = (n: number): Semester => ({
  id: uid(), name: `Semester ${n}`, subjects: [newSubject(), newSubject(), newSubject()],
});

export function gradeFromMarks(marks: number): GradeBand {
  return GRADE_SCALE.find(b => marks >= b.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
}

export function subjectResult(s: Subject): GradeBand | null {
  if (s.grade) return GRADE_SCALE.find(b => b.grade === s.grade) ?? null;
  if (s.marks === '' || isNaN(Number(s.marks))) return null;
  return gradeFromMarks(Number(s.marks));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function semesterStats(sem: Semester) {
  let credits = 0, qp = 0, marksSum = 0, marksCount = 0;
  for (const s of sem.subjects) {
    const r = subjectResult(s);
    const c = Number(s.credits);
    if (!r || !c) continue;
    credits += c; qp += r.points * c;
    if (s.marks !== '' && !s.grade) { marksSum += Number(s.marks); marksCount++; }
  }
  return { credits, qualityPoints: qp, gpa: credits ? round2(qp / credits) : 0, marksSum, marksCount };
}

export function overallStats(sems: Semester[]) {
  const per = sems.map(semesterStats);
  const credits = per.reduce((a, s) => a + s.credits, 0);
  const qp = per.reduce((a, s) => a + s.qualityPoints, 0);
  const mc = per.reduce((a, s) => a + s.marksCount, 0);
  const ms = per.reduce((a, s) => a + s.marksSum, 0);
  return {
    per, credits,
    cgpa: credits ? round2(qp / credits) : 0,
    percentage: mc ? round2(ms / mc) : null,
  };
}

export function remarks(cgpa: number) {
  if (cgpa >= 3.5) return 'Excellent — Distinction';
  if (cgpa >= 3.0) return 'Very Good — First Division';
  if (cgpa >= 2.5) return 'Good — Second Division';
  if (cgpa >= 2.0) return 'Satisfactory — Pass';
  if (cgpa > 0) return 'Below minimum (2.00) — Probation';
  return '—';
}

export const subjectSchema = z.object({
  name: z.string().trim().min(1, 'Subject name required').max(100, 'Max 100 characters'),
  credits: z.coerce.number().int().min(1, 'Credits 1–6').max(6, 'Credits 1–6'),
  marks: z.union([z.literal(''), z.coerce.number().min(0, '0–100').max(100, '0–100')]),
  grade: z.string().optional(),
}).refine(s => s.grade || s.marks !== '', { message: 'Enter marks or grade', path: ['marks'] });

export const detailsSchema = z.object({
  name: z.string().trim().min(1, 'Name required').max(100),
  rollNo: z.string().trim().max(50),
  program: z.string().trim().max(100),
  university: z.string().trim().max(150),
  session: z.string().trim().max(50),
});

export function validateAll(details: StudentDetails, sems: Semester[]) {
  const errors: Record<string, string> = {};
  const d = detailsSchema.safeParse(details);
  if (!d.success) d.error.issues.forEach(i => { errors[`details.${i.path[0]}`] = i.message; });
  sems.forEach(sem => {
    if (!sem.name.trim()) errors[`${sem.id}.name`] = 'Semester name required';
    sem.subjects.forEach(s => {
      const r = subjectSchema.safeParse(s);
      if (!r.success) r.error.issues.forEach(i => { errors[`${s.id}.${String(i.path[0])}`] ??= i.message; });
    });
  });
  if (!sems.length || sems.every(s => !s.subjects.length)) errors.general = 'Add at least one subject';
  return errors;
}
