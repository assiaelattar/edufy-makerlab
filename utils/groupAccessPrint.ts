import type { Student } from '../types';

export type GroupAccessPrintContext = {
  organizationId: string;
  academyName: string;
  programName: string;
  gradeName: string;
  groupName: string;
  loginUrl: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character] || character));

export const hasPrintableLearnerAccess = (student: Student, organizationId: string): boolean =>
  student.organizationId === organizationId
  && student.status === 'active'
  && Boolean(student.loginInfo?.uid?.trim() && student.loginInfo?.email?.trim() && student.loginInfo?.initialPassword?.trim());

export const buildGroupAccessPrintHtml = (students: Student[], context: GroupAccessPrintContext): string => {
  if (students.length === 0 || students.some(student => !hasPrintableLearnerAccess(student, context.organizationId))) {
    throw new Error('Choose active learners in this organization with linked, printable access.');
  }

  const loginUrl = new URL(context.loginUrl);
  if (!['http:', 'https:'].includes(loginUrl.protocol)) throw new Error('The learner portal URL is invalid.');

  const safe = {
    academyName: escapeHtml(context.academyName),
    programName: escapeHtml(context.programName),
    gradeName: escapeHtml(context.gradeName),
    groupName: escapeHtml(context.groupName),
    loginUrl: escapeHtml(loginUrl.toString()),
  };
  const uniqueStudents = Array.from(new Map(students.map(student => [student.id, student])).values());

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${safe.groupName} learner access</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #142235; font-family: Arial, Helvetica, sans-serif; print-color-adjust: exact; }
  .page-heading { margin: 0 0 8mm; display: flex; justify-content: space-between; gap: 12mm; align-items: end; }
  .page-heading strong { display: block; font-size: 17pt; }
  .page-heading span { color: #607082; font-size: 9pt; }
  .access-card { min-height: 104mm; margin-bottom: 7mm; padding: 9mm; border: 1.5px dashed #7d93a8; border-radius: 5mm; break-inside: avoid; page-break-inside: avoid; }
  .access-card:nth-of-type(2n):not(:last-of-type) { break-after: page; page-break-after: always; }
  .brand { color: #176e70; font-size: 10pt; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .eyebrow { margin-top: 4mm; color: #607082; font-size: 9pt; }
  h2 { margin: 2mm 0 6mm; font-size: 22pt; line-height: 1.1; }
  .fields { display: grid; gap: 4mm; }
  .field { padding: 3mm 4mm; background: #f1f6f6; border-radius: 2mm; overflow-wrap: anywhere; }
  .field span { display: block; margin-bottom: 1mm; color: #526273; font-size: 8pt; font-weight: bold; text-transform: uppercase; }
  .field strong { font-family: Consolas, 'Courier New', monospace; font-size: 12pt; }
  .footer { margin-top: 5mm; color: #526273; font-size: 8.5pt; }
  @media screen { body { max-width: 210mm; margin: 20px auto; padding: 12mm; background: white; } }
</style></head><body>
<div class="page-heading"><div><strong>${safe.groupName} · learner access</strong><span>${safe.programName} / ${safe.gradeName}</span></div><span>${uniqueStudents.length} card${uniqueStudents.length === 1 ? '' : 's'}</span></div>
${uniqueStudents.map(student => `<article class="access-card">
  <div class="brand">${safe.academyName}</div>
  <div class="eyebrow">${safe.programName} · ${safe.gradeName} · ${safe.groupName}</div>
  <h2>${escapeHtml(student.name)}</h2>
  <div class="fields">
    <div class="field"><span>Learner portal</span><strong>${safe.loginUrl}</strong></div>
    <div class="field"><span>Login email</span><strong>${escapeHtml(student.loginInfo!.email)}</strong></div>
    <div class="field"><span>Initial password</span><strong>${escapeHtml(student.loginInfo!.initialPassword!)}</strong></div>
  </div>
  <p class="footer">Private access card. Give this paper to the correct learner or guardian. If the password has changed, ask the academy for help.</p>
</article>`).join('')}
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });</script>
</body></html>`;
};

export const printGroupAccessCards = (students: Student[], context: GroupAccessPrintContext): boolean => {
  const html = buildGroupAccessPrintHtml(students, context);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
};
