import React from 'react';
import { ParentFamilyWorkspace } from './ParentFamilyWorkspace';
import type { FamilyChild } from '../hooks/useParentFamily';

const today = new Date();
const previewSessionDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const nextWorkshopDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
const previewWorkshopDate = `${nextWorkshopDay.getFullYear()}-${String(nextWorkshopDay.getMonth() + 1).padStart(2, '0')}-${String(nextWorkshopDay.getDate()).padStart(2, '0')}`;

const children: FamilyChild[] = [
  {
    id: 'preview-learner-one', name: 'Maya Maker', issue: null,
    permissions: ['portfolio', 'gallery', 'enrollments', 'payments', 'pickup'],
    pickupProfile: { active: true, parentName: 'Samira Maker', authorizedPickups: ['Family guardian'] },
    media: { status: 'ready', data: [
      { id: 'bench-photo', url: '/mission-plant-guardian.svg', caption: 'Testing the plant sensor in the workshop', date: '2026-10-10' }
    ] },
    upcoming: { status: 'ready', data: { missions: [
      { id: 'preview-next', title: 'Créer une mini station météo', intention: 'Observer la lumière et la température avec deux capteurs.', thumbnailUrl: '/mission-weather-station.svg' },
      { id: 'preview-next-two', title: 'Imaginer un robot dessinateur', intention: 'Créer un robot qui transforme un mouvement en dessin.', thumbnailUrl: '/mission-drawing-robot.svg' }
    ], contextNote: null } },
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
    }, {
      id: 'preview-light', studentId: 'preview-learner-one', organizationId: 'preview-org',
      title: 'Une lampe pour lire sous les étoiles', description: 'Une petite lampe fabriquée et testée à l’atelier.',
      station: 'Circuits', status: 'published', thumbnailUrl: '/mission-reading-light.svg',
      missionBrief: { goal: 'Assembler une lampe simple et fiable.', finalOutcome: 'Une lampe qui éclaire une page et tient debout.', materials: ['LED', 'Pile', 'Interrupteur'] },
      resources: [], steps: [
        { id: 'light-idea', title: 'Dessiner la lampe', status: 'done', note: 'J’ai choisi une lumière qui vise mon livre.' },
        { id: 'light-build', title: 'Construire le circuit', status: 'done', note: 'Le bouton allume la lampe.' }
      ], commits: [], skills: ['Circuits', 'Créativité']
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
      pickup: { status: 'ready', data: { status: 'arrived', sessionDate: previewSessionDate, pickerName: 'Family guardian', isPreviousDay: false, initiatedByCurrentGuardian: false } },
      workshop: { status: 'ready', data: { next: { date: previewWorkshopDate, startTime: '15:00', endTime: '16:30', timezone: 'Africa/Casablanca', programName: 'STEMQuest', groupName: 'Mini Makers', locationName: 'MakerLab Academy', isUnderway: false } } }
    }
  },
  {
    id: 'preview-learner-two', name: 'Adam Maker', issue: null,
    permissions: ['portfolio', 'gallery', 'enrollments', 'payments', 'pickup'],
    pickupProfile: { active: true, parentName: 'Samira Maker', authorizedPickups: ['Family guardian'] },
    media: { status: 'ready', data: [] }, projects: [],
    upcoming: { status: 'ready', data: { missions: [], contextNote: null } },
    operations: {
      finance: { status: 'ready', data: { agreed: 0, paid: 0, balance: 0, currency: 'MAD', enrollmentCount: 0, paymentCount: 0, pendingPaymentCount: 0, latestPaymentDate: null, enrollments: [], payments: [] } },
      attendance: { status: 'ready', data: { total: 0, present: 0, late: 0, absent: 0, excused: 0, latestDate: null, latestStatus: null, records: [] } },
      pickup: { status: 'ready', data: { status: null, sessionDate: previewSessionDate, pickerName: null, isPreviousDay: false, initiatedByCurrentGuardian: null } },
      workshop: { status: 'ready', data: { next: null } }
    }
  }
];

children.push({
  id: 'preview-learner-three', name: 'Leila Maker', issue: null,
  permissions: ['portfolio', 'gallery', 'enrollments', 'payments', 'pickup'],
  pickupProfile: { active: true, parentName: 'Samira Maker', authorizedPickups: ['Family guardian'] },
  media: { status: 'ready', data: [] }, projects: [],
  upcoming: { status: 'ready', data: { missions: [], contextNote: null } },
  operations: children[1].operations,
});

export const ParentFamilyPreview: React.FC = () =>
  <ParentFamilyWorkspace parentUid="preview-parent" organizationId="preview-org" parentName="Samira Maker" onSignOut={() => { window.location.assign(`${window.location.pathname}#login`); }} previewChildren={children} />;
