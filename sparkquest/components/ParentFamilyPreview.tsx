import React from 'react';
import { ParentFamilyWorkspace } from './ParentFamilyWorkspace';
import type { FamilyChild } from '../hooks/useParentFamily';

const children: FamilyChild[] = [
  {
    id: 'preview-learner-one', name: 'Maya Maker', issue: null,
    permissions: ['portfolio', 'gallery', 'enrollments', 'payments', 'pickup'],
    media: { status: 'ready', data: [
      { id: 'bench-photo', url: '/mission-plant-guardian.svg', caption: 'Testing the plant sensor in the workshop', date: '2026-10-10' }
    ] },
    projects: [{
      id: 'preview-plant', studentId: 'preview-learner-one', organizationId: 'preview-org',
      title: 'Build a smart plant guardian', description: 'A sensor that helps care for a plant.',
      station: 'Circuits', status: 'building', thumbnailUrl: '/mission-plant-guardian.svg',
      missionBrief: {
        goal: 'Make a small device that notices when a plant needs water.',
        whyItMatters: 'Sensors make invisible changes easier to understand.',
        finalOutcome: 'A working light alert with a wet and dry test.',
        materials: ['Moisture sensor', 'LED', 'Microcontroller']
      },
      resources: [{ id: 'guide', title: 'Sensor guide', type: 'image', url: '/mission-plant-guardian.svg', description: 'See the circuit before wiring it.' }],
      steps: [
        { id: 'observe', title: 'Observe the plant', status: 'done', objective: 'Notice what changes when the soil dries.', note: 'The soil felt dry after two days.', evidence: '/mission-plant-guardian.svg', evidenceMimeType: 'image/svg+xml' },
        { id: 'build', title: 'Build the alert', status: 'doing', objective: 'Wire the sensor and LED safely.', instructions: 'Disconnect the power before moving wires.', checklist: ['Connect the sensor', 'Test the LED'], resources: [{ id: 'wiring', title: 'Wiring reference', type: 'image', url: '/mission-plant-guardian.svg' }] },
        { id: 'test', title: 'Test wet and dry soil', status: 'todo', objective: 'Prove the alert responds to moisture.' }
      ],
      commits: [], skills: ['Circuits', 'Testing'], feedback: 'A clear first observation. Next, test the sensor twice.'
    }],
    operations: {
      finance: { status: 'ready', data: {
        agreed: 6000, paid: 4000, balance: 2000, currency: 'MAD', enrollmentCount: 1, paymentCount: 2, pendingPaymentCount: 0, latestPaymentDate: '2026-10-01',
        enrollments: [{ id: 'enrollment-one', programName: 'STEMQuest', packName: 'Mini Makers', session: '2025–2026', status: 'active', agreed: 6000, paid: 4000, balance: 2000 }],
        payments: [
          { id: 'payment-two', enrollmentId: 'enrollment-one', date: '2026-10-01', amount: 2000, status: 'verified', method: 'virement' },
          { id: 'payment-one', enrollmentId: 'enrollment-one', date: '2026-09-01', amount: 2000, status: 'verified', method: 'cash' }
        ]
      } },
      attendance: { status: 'ready', data: {
        total: 3, present: 2, late: 1, absent: 0, excused: 0, latestDate: '2026-10-10', latestStatus: 'present',
        records: [
          { date: '2026-10-10', status: 'present', enrollmentId: 'enrollment-one' },
          { date: '2026-10-03', status: 'late', enrollmentId: 'enrollment-one' },
          { date: '2026-09-26', status: 'present', enrollmentId: 'enrollment-one' }
        ]
      } },
      pickup: { status: 'ready', data: { status: 'arrived', sessionDate: '2026-10-10', pickerName: 'Family guardian', isPreviousDay: false, initiatedByCurrentGuardian: false } }
    }
  },
  {
    id: 'preview-learner-two', name: 'Adam Maker', issue: null,
    permissions: ['portfolio', 'gallery', 'enrollments', 'payments', 'pickup'],
    media: { status: 'ready', data: [] }, projects: [],
    operations: {
      finance: { status: 'ready', data: { agreed: 0, paid: 0, balance: 0, currency: 'MAD', enrollmentCount: 0, paymentCount: 0, pendingPaymentCount: 0, latestPaymentDate: null, enrollments: [], payments: [] } },
      attendance: { status: 'ready', data: { total: 0, present: 0, late: 0, absent: 0, excused: 0, latestDate: null, latestStatus: null, records: [] } },
      pickup: { status: 'ready', data: { status: null, sessionDate: '2026-10-10', pickerName: null, isPreviousDay: false, initiatedByCurrentGuardian: null } }
    }
  }
];

export const ParentFamilyPreview: React.FC = () =>
  <ParentFamilyWorkspace parentUid="preview-parent" organizationId="preview-org" parentName="Samira Maker" onSignOut={() => undefined} previewChildren={children} />;
