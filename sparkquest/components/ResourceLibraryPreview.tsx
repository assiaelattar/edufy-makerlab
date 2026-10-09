import React from 'react';
import type { ResourceLibraryItem } from '../types';
import { ResourceLibrary } from './ResourceLibrary';

const previewResources: ResourceLibraryItem[] = [
  {
    id: 'makecode-web', organizationId: 'preview-organization', status: 'active', title: 'Microsoft MakeCode for micro:bit', type: 'tool', toolAccess: 'web', url: 'https://makecode.microbit.org/',
    description: 'Build and simulate block or JavaScript programs directly in the browser.', tags: ['coding', 'micro:bit', 'web app', 'beginner'],
  },
  {
    id: 'arduino-ide', organizationId: 'preview-organization', status: 'active', title: 'Arduino IDE', type: 'tool', toolAccess: 'download', url: 'https://www.arduino.cc/en/software',
    description: 'Download the desktop editor used to write and upload Arduino projects.', tags: ['coding', 'Windows', 'macOS', 'installation'],
  },
  {
    id: 'sensor-guide', organizationId: 'preview-organization', status: 'active', title: 'Moisture sensor quick guide', type: 'file', url: 'https://example.com/moisture-sensor-guide.pdf',
    description: 'A visual pin map for power, ground, and signal before the first circuit is wired.', tags: ['electronics', 'sensors', 'beginner'], requiredForProgress: true,
    quiz: { version: 1, passingScore: 100, questions: [{ id: 'power-pin', prompt: 'Which pin provides power?', options: ['3V', 'GND', 'Signal'], correctOptionIndex: 0 }] },
  },
  {
    id: 'safe-wiring', organizationId: 'preview-organization', status: 'active', title: 'Safe wiring in three moves', type: 'video', url: 'https://example.com/safe-wiring.mp4',
    description: 'A short demonstration of the safe order for changing wires and checking a circuit.', tags: ['safety', 'circuits'], requiredForProgress: true,
    quiz: { version: 1, passingScore: 100, questions: [{ id: 'disconnect', prompt: 'What comes before changing a wire?', options: ['Disconnect power', 'Add water', 'Run the code'], correctOptionIndex: 0 }] },
  },
  {
    id: 'circuit-symbols', organizationId: 'preview-organization', status: 'active', title: 'Circuit symbols field card', type: 'image', url: '/mission-plant-guardian.svg',
    description: 'Keep the most useful circuit symbols beside your notebook while you sketch.', tags: ['planning', 'circuits'],
  },
  {
    id: 'microbit-reference', organizationId: 'preview-organization', status: 'active', title: 'Microcontroller pin reference', type: 'link', url: 'https://microbit.org/get-started/user-guide/overview/',
    description: 'A reliable reference for inputs, outputs, power, and common board features.', tags: ['microcontroller', 'reference'],
  },
  {
    id: 'prototype-checklist', organizationId: 'preview-organization', status: 'active', title: 'Prototype testing checklist', type: 'file', url: 'https://example.com/prototype-checklist.pdf',
    description: 'Use the same observations for wet and dry soil so your evidence is easy to compare.', tags: ['testing', 'evidence'],
  },
  {
    id: 'reflection-prompts', organizationId: 'preview-organization', status: 'active', title: 'Maker reflection prompts', type: 'link', url: 'https://example.com/maker-reflection',
    description: 'Questions that help learners explain what changed, what worked, and what they would try next.', tags: ['reflection', 'showcase'],
  },
];

export default function ResourceLibraryPreview() {
  return <ResourceLibrary previewMode previewResources={previewResources} onClose={() => { window.location.href = `${window.location.pathname}?designPreview=studio`; }} />;
}
