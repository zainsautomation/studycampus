// University-style marks breakdown (Mid / Sessional / Final / Practical).
// Theory is out of 100. With a practical, theory is weighted 75% and practical (out of 25) is added.
export const MAX = { mid: 20, sessional: 20, final: 60, practical: 25 } as const;

export interface MarksSubject {
  id: string;
  name: string;
  credits: number;
  hasPractical: boolean;
  mid: string;
  sessional: string;
  final: string;
  practical: string;
}

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export function gradePoint(m: number): number {
  if (m >= 85) return 4;
  if (m < 50) return 0;
  const table: Record<number, number> = {
    84: 3.9, 83: 3.8, 82: 3.8, 81: 3.7, 80: 3.7, 79: 3.6, 78: 3.5, 77: 3.5, 76: 3.4, 75: 3.4,
    74: 3.3, 73: 3.2, 72: 3.1, 71: 3.1, 70: 3.0,
  };
  if (table[m] !== undefined) return table[m];
  // 50–69: linear 1.0 → 2.9
  return Math.round((1 + (m - 50) * 0.1) * 10) / 10;
}

export function letter(m: number): string {
  if (m >= 85) return 'A';
  if (m >= 80) return 'B+';
  if (m >= 70) return 'B';
  if (m >= 60) return 'C';
  if (m >= 50) return 'D';
  return 'F';
}

export function letterFromGpa(g: number): string {
  if (g >= 3.7) return 'A';
  if (g >= 3.3) return 'B+';
  if (g >= 3.0) return 'B';
  if (g >= 2.0) return 'C';
  if (g >= 1.0) return 'D';
  return 'F';
}

export function invalidField(s: MarksSubject): string | null {
  for (const k of ['mid', 'sessional', 'final', 'practical'] as const) {
    if (k === 'practical' && !s.hasPractical) continue;
    const v = num(s[k]);
    if (v < 0 || v > MAX[k]) return `${k} must be 0–${MAX[k]}`;
  }
  return null;
}

export function computeSubject(s: MarksSubject) {
  const theory = num(s.mid) + num(s.sessional) + num(s.final);
  const prac = s.hasPractical ? num(s.practical) : 0;
  const total = s.hasPractical ? Math.ceil(theory * 0.75 + prac) : Math.ceil(theory);
  const gp = gradePoint(Math.min(total, 100));
  const qp = Math.round(gp * s.credits * 100) / 100;
  return { theory, prac, total, gp, qp, grade: letter(total), passed: total >= 50 };
}

export function computeAll(subjects: MarksSubject[]) {
  const rows = subjects.map((s) => ({ s, r: computeSubject(s) }));
  const credits = subjects.reduce((a, s) => a + s.credits, 0);
  const qp = rows.reduce((a, x) => a + x.r.qp, 0);
  const sgpa = credits ? qp / credits : 0;
  const obtained = rows.reduce((a, x) => a + x.r.total, 0);
  const max = subjects.length * 100;
  const failed = rows.filter((x) => !x.r.passed).map((x) => x.s.name || 'Untitled');
  return {
    rows, credits, qp: Math.round(qp * 10) / 10, sgpa: Math.round(sgpa * 100) / 100,
    obtained, max, percentage: max ? (obtained / max) * 100 : 0,
    grade: letterFromGpa(sgpa), failed,
  };
}

export const newSubject = (name = ''): MarksSubject => ({
  id: crypto.randomUUID(), name, credits: 3, hasPractical: false,
  mid: '', sessional: '', final: '', practical: '',
});

export async function downloadMarksPdf(
  info: { name: string; rollNo: string; program: string; session: string; institute: string },
  subjects: MarksSubject[],
) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const res = computeAll(subjects);

  doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 70, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(info.institute || 'StudyCampus', 40, 32);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text('Student Result Sheet', 40, 52);
  doc.text(new Date().toLocaleDateString(), W - 40, 52, { align: 'right' });

  doc.setTextColor(15, 23, 42); doc.setFontSize(10);
  const line = (l: string, v: string, x: number, y: number) => {
    doc.setFont('helvetica', 'bold'); doc.text(l, x, y);
    doc.setFont('helvetica', 'normal'); doc.text(v || '—', x + 70, y);
  };
  line('Name:', info.name, 40, 95); line('Roll No:', info.rollNo, 40, 112);
  line('Program:', info.program, 320, 95); line('Session:', info.session, 320, 112);

  autoTable(doc, {
    startY: 130,
    head: [['#', 'Subject', 'Cr', 'Mid', 'Sess', 'Final', 'Theory', 'Prac', 'Total', 'G.P', 'Q.P', 'Grade']],
    body: res.rows.map(({ s, r }, i) => [
      i + 1, s.name || 'Untitled', s.credits, s.mid || 0, s.sessional || 0, s.final || 0,
      r.theory.toFixed(2), s.hasPractical ? r.prac.toFixed(2) : '—', r.total, r.gp.toFixed(2), r.qp.toFixed(1), r.grade,
    ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [37, 99, 235] },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 11 && d.cell.raw === 'F') d.cell.styles.textColor = [220, 38, 38];
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y = (doc as any).lastAutoTable.finalY + 20;
  autoTable(doc, {
    startY: y,
    head: [['Credits', 'Quality Points', 'SGPA', 'Grade', 'Marks', 'Percentage', 'Result']],
    body: [[res.credits, res.qp, res.sgpa.toFixed(2), res.grade, `${res.obtained} / ${res.max}`,
      `${res.percentage.toFixed(2)}%`, res.failed.length ? `Fail in: ${res.failed.join(', ')}` : 'Pass']],
    styles: { fontSize: 10, halign: 'center' },
    headStyles: { fillColor: [15, 23, 42] },
  });

  doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text('Self-calculated result — not an official university document.', 40, H - 22);
  doc.save(`${(info.name || 'result').replace(/\s+/g, '_')}_result_sheet.pdf`);
}
