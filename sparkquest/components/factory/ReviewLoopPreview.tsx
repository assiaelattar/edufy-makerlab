import React, { useState } from 'react';
import { buildReviewPatch, effectiveStepReviewStatus, stepReviewFeedback, submittedProof } from '../../domain/projectReview';
import type { StudentProject } from '../../types';
import { ReviewWorkspace } from './ReviewModal';
import { ReviewQueuePanel } from './ReviewInbox';

const createFixture = (): StudentProject => ({
  id: 'local-proof-project', organizationId: 'local-review-org', studentId: 'local-learner', studentName: 'Aya Maker', title: 'Plant guardian · test proof', description: 'A sensor that helps someone care for a plant.', station: 'Circuits', status: 'building', reviewProtocolVersion: 1, skills: [], resources: [], commits: [],
  steps: [submittedProof({ id: 'test', title: 'Test wet and dry soil', status: 'doing', required: true, objective: 'Show how the alert responds to two different soil conditions.', instructions: 'Run both tests and explain what you changed.' }, `${window.location.origin}/mission-plant-guardian.svg`, 'My first test showed the alert. I still need to label the two readings.', '2026-10-01T10:00:00Z', 'image/png')],
});
export default function ReviewLoopPreview() {
  const [project, setProject] = useState(createFixture);
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState(false);
  const [queueError, setQueueError] = useState(false);
  const proof = project.steps[0];
  const proofStatus = effectiveStepReviewStatus(project, proof);
  const proofFeedback = stepReviewFeedback(project, proof);
  return <main style={{ maxWidth: 1120, margin: 'auto', padding: 24, color: '#17243b', background: '#f4f7fc', minHeight: '100vh' }}>
    <p className="sq-review-kicker">Local acceptance fixture · synthetic records only</p>
    <h1 style={{ fontSize: 32, fontWeight: 850, margin: '12px 0' }}>Student proof → instructor review</h1>
    <p>No account reads, database writes, or uploads. Changes below live only in this tab.</p>
    <div className="sq-review-actions" style={{ margin: '18px 0' }}>
      <button type="button" className="sq-review-primary" onClick={() => { setProject(createFixture()); setFailure(false); setQueueError(false); }}>Reset demo</button>
      <button type="button" onClick={() => setOpen(true)}>Open progress & history</button>
      <label><input type="checkbox" checked={failure} onChange={event => setFailure(event.target.checked)} /> Simulate save failure</label>
      <label><input type="checkbox" checked={queueError} onChange={event => setQueueError(event.target.checked)} /> Simulate inbox error</label>
    </div>
    <ReviewQueuePanel projects={[project]} error={queueError ? 'Projects could not be loaded. Retry, or check your instructor access.' : null} onRetry={() => setQueueError(false)} onReviewProject={() => setOpen(true)} />
    <section style={{ background: 'white', border: '1px solid #d7dfeb', borderRadius: 14, padding: 20, marginTop: 24 }} aria-label="Learner feedback">
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>What the learner sees</h2><p>Step: {proofStatus} · Mission: {project.status}</p><p>{proofFeedback || project.feedback || 'Waiting for instructor feedback.'}</p><p>{project.reviewHistory?.length || 0} decisions saved · {proof.submissionHistory?.length || 0} proof versions</p>
      {proofStatus === 'rejected' && <button type="button" className="sq-review-primary" onClick={() => setProject(current => ({ ...current, steps: [submittedProof(current.steps[0], `${window.location.origin}/mission-plant-guardian.svg?version=2`, 'I labelled wet and dry readings and repeated both tests.', new Date().toISOString(), 'image/png')] }))}>Student: resubmit improved proof</button>}
      {proofStatus === 'done' && project.status === 'building' && <button type="button" className="sq-review-primary" onClick={() => setProject(current => ({ ...current, status: 'submitted', submittedAt: new Date().toISOString(), mediaUrls: [`${window.location.origin}/mission-plant-guardian.svg`] }))}>Student: send final mission</button>}
      {project.status === 'published' && <p role="status">Mission approved & published. Completion reward: {project.xpReward} XP.</p>}
    </section>
    {open && <ReviewWorkspace project={project} studentName="Aya Maker" onClose={() => setOpen(false)} onReview={async command => {
      if (failure) throw new Error('Demo save failure. Your feedback is still here; retry after turning off the failure toggle.');
      const updated = { ...project, ...buildReviewPatch(project, command, { uid: 'local-instructor', role: 'instructor', organizationId: 'local-review-org', name: 'Demo mentor' }, new Date().toISOString()) };
      setProject(updated); return updated;
    }} />}
  </main>;
}
