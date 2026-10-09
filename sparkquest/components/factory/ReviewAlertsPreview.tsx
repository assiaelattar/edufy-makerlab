import React, { useState } from 'react';
import { BellRing, Send } from 'lucide-react';
import type { StudentProject } from '../../types';
import { submittedProof } from '../../domain/projectReview';
import { ReviewSubmissionAlerts } from './ReviewSubmissionAlerts';

const cleanProject: StudentProject = {
  id: 'alert-preview-project',
  title: 'Smart plant guardian',
  description: 'A moisture-sensing device that warns its owner before the soil becomes too dry.',
  station: 'Robotics',
  status: 'building',
  organizationId: 'alert-preview-org',
  studentId: 'alert-preview-student',
  reviewProtocolVersion: 1,
  resources: [],
  skills: ['Electronics', 'Testing'],
  commits: [],
  steps: [{ id: 'test', title: 'Test wet and dry soil', status: 'doing', note: '', submittedAt: undefined }],
};

export default function ReviewAlertsPreview() {
  const [project, setProject] = useState(cleanProject);
  const [opened, setOpened] = useState(false);

  const simulateSubmission = () => {
    const submittedAt = new Date().toISOString();
    setOpened(false);
    setProject(current => ({
      ...current,
      steps: [submittedProof(current.steps[0], `${window.location.origin}/mission-plant-guardian.svg?alert=${Date.now()}`, 'I tested the sensor in wet and dry soil and labelled both readings.', submittedAt, 'image/svg+xml')],
    }));
  };

  return <main className="min-h-screen bg-[#f4f7fb] p-5 text-slate-950 sm:p-10">
    <section className="mx-auto max-w-4xl overflow-hidden rounded-[28px] border-2 border-slate-950 bg-white shadow-[9px_9px_0_#0f172a]">
      <header className="flex flex-col gap-4 border-b-2 border-slate-950 bg-amber-300 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em]">Local notification test</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Student review alert</h1>
        </div>
        <ReviewSubmissionAlerts previewMode projects={[project]} students={[{ id: 'alert-preview-student', name: 'Aya Maker' }]} organizationId="alert-preview-org" instructorId="alert-preview-instructor" onOpenReview={() => setOpened(true)} />
      </header>
      <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm font-black uppercase tracking-[.14em] text-blue-700">How to test</p>
          <ol className="mt-4 space-y-4 text-base font-bold leading-7 text-slate-700">
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-white">1</span>Enable review alerts and allow browser notifications.</li>
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-white">2</span>Press “Simulate student submission.”</li>
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-white">3</span>The prominent chime, Windows notification, and in-app review card should appear once.</li>
          </ol>
          <button type="button" onClick={simulateSubmission} className="mt-7 inline-flex min-h-14 items-center gap-3 rounded-2xl border-2 border-slate-950 bg-lime-300 px-6 text-base font-black shadow-[5px_5px_0_#0f172a] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"><Send size={20} /> Simulate student submission</button>
        </div>
        <aside className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-5">
          <BellRing className="text-amber-600" size={28} />
          <h2 className="mt-4 text-xl font-black">What ships</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">The instructor app watches the canonical review queue. A new proof, final mission, or genuine resubmission creates one alert. Previously announced versions stay quiet.</p>
          {opened && <p className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm font-black text-emerald-900">Review action opened the correct submission.</p>}
        </aside>
      </div>
    </section>
  </main>;
}

