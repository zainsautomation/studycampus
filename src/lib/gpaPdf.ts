import { GRADE_SCALE, overallStats, remarks, subjectResult, type Semester, type StudentDetails } from './gpa';

export async function downloadTranscript(details: StudentDetails, semesters: Semester[], title = 'Result') {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const ink: [number, number, number] = [15, 23, 42];
  const accent: [number, number, number] = [37, 99, 235];
  const muted: [number, number, number] = [100, 116, 139];
  const ref = `SC-${Date.now().toString(36).toUpperCase()}`;
  const stats = overallStats(semesters);

  // Header band
  doc.setFillColor(...ink); doc.rect(0, 0, W, 78, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('StudyCampus', M, 38);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Academic Result Transcript (GPA / CGPA)', M, 56);
  doc.setFontSize(9);
  doc.text(`Ref: ${ref}`, W - M, 38, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, W - M, 56, { align: 'right' });

  // Student details
  let y = 106;
  doc.setTextColor(...ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text(title, M, y); y += 8;
  const rows: [string, string][] = [
    ['Student Name', details.name || '—'], ['Roll Number', details.rollNo || '—'],
    ['Program', details.program || '—'], ['University', details.university || '—'],
    ['Session', details.session || '—'],
  ];
  autoTable(doc, {
    startY: y + 6, margin: { left: M, right: M }, theme: 'plain',
    body: [[rows[0][0], rows[0][1], rows[1][0], rows[1][1]], [rows[2][0], rows[2][1], rows[4][0], rows[4][1]], [rows[3][0], { content: rows[3][1], colSpan: 3 } as any]],
    styles: { fontSize: 9.5, cellPadding: 4, textColor: ink },
    columnStyles: { 0: { fontStyle: 'bold', textColor: muted, cellWidth: 90 }, 2: { fontStyle: 'bold', textColor: muted, cellWidth: 70 } },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // Summary boxes
  const boxW = (W - M * 2 - 20) / 3;
  const boxes = [
    ['CGPA', stats.cgpa.toFixed(2) + ' / 4.00'],
    ['Total Credit Hours', String(stats.credits)],
    ['Remarks', remarks(stats.cgpa)],
  ];
  boxes.forEach(([k, v], i) => {
    const x = M + i * (boxW + 10);
    doc.setFillColor(241, 245, 249); doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, boxW, 50, 6, 6, 'FD');
    doc.setFontSize(8); doc.setTextColor(...muted); doc.setFont('helvetica', 'normal'); doc.text(k.toUpperCase(), x + 10, y + 16);
    doc.setTextColor(...(i === 0 ? accent : ink)); doc.setFont('helvetica', 'bold');
    doc.setFontSize(i === 2 ? 9 : 15);
    doc.text(doc.splitTextToSize(v, boxW - 20), x + 10, y + 36);
  });
  y += 70;

  // Semesters
  semesters.forEach((sem, idx) => {
    const s = stats.per[idx];
    if (y > H - 140) { doc.addPage(); y = M; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink);
    doc.text(sem.name, M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...muted);
    doc.text(`GPA ${s.gpa.toFixed(2)}  ·  ${s.credits} credits`, W - M, y, { align: 'right' });
    autoTable(doc, {
      startY: y + 6, margin: { left: M, right: M },
      head: [['#', 'Subject', 'Credits', 'Marks', 'Grade', 'Points', 'Quality Pts']],
      body: sem.subjects.map((sub, i) => {
        const r = subjectResult(sub);
        const c = Number(sub.credits) || 0;
        return [i + 1, sub.name, c, sub.grade ? '—' : sub.marks, r?.grade ?? '—', r ? r.points.toFixed(2) : '—', r ? (r.points * c).toFixed(2) : '—'];
      }),
      foot: [['', 'Semester Total', s.credits, '', '', '', s.qualityPoints.toFixed(2)]],
      theme: 'grid',
      headStyles: { fillColor: ink, textColor: 255, fontSize: 9 },
      footStyles: { fillColor: [241, 245, 249], textColor: ink, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 5, lineColor: [226, 232, 240] },
      columnStyles: { 0: { cellWidth: 24, halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
    });
    y = (doc as any).lastAutoTable.finalY + 22;
  });

  // Grading scale legend
  if (y > H - 120) { doc.addPage(); y = M; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...ink);
  doc.text('Grading Scale (HEC 4.0)', M, y);
  const ranges = GRADE_SCALE.map((b, i) => {
    const max = i === 0 ? 100 : GRADE_SCALE[i - 1].min - 1;
    return `${b.grade} ${b.min}-${max} (${b.points.toFixed(2)})`;
  });
  autoTable(doc, {
    startY: y + 6, margin: { left: M, right: M }, theme: 'plain',
    body: [ranges.slice(0, 5), ranges.slice(5)],
    styles: { fontSize: 8, textColor: muted, cellPadding: 3 },
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240); doc.line(M, H - 40, W - M, H - 40);
    doc.setFontSize(8); doc.setTextColor(...muted); doc.setFont('helvetica', 'italic');
    doc.text('Self-calculated result — not an official university transcript.', M, H - 26);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${p} of ${pages}`, W - M, H - 26, { align: 'right' });
  }

  const safe = (details.name || 'result').replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
  doc.save(`${safe}_transcript.pdf`);
}
