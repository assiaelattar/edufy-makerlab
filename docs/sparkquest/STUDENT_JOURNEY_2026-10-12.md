# Student journey visual pass — 2026-10-12

The learner session now uses three focused stops over the existing workbench and project contracts: **My build** for the pinned project and ongoing builds, **Explore** for assigned missions and personal/Showcase creation, and **Mentor** for submitted work and revision feedback. The Field log and maker profile remain reachable. Empty states lead to Explore instead of a hidden section anchor.

The parent portal's existing 011Y Rive component is reused in the learner guide and saved mission step focus. The surrounding scene and message follow the current context; the shipped Rive file has only the verified `Hit` trigger, so internal emotion states are not claimed. Student route styling uses the same paper, blue, lime, rounded controls, and muted pastel palette while retaining learner-specific project cards and actions. Ongoing builds and assigned missions use horizontal, snap-aligned rails on narrow screens.

Saved project details now focus one plan step at a time with color changes, progress markers, and previous/next actions that keep the reader at the step. The project brief, materials, resources, evidence and review truth are still drawn from the existing `StudentMissionDetails` and learner domain. No auth, project write, review, Firebase rule, or identity contract changed.

Local acceptance: `?designPreview=workbench` at 390px, including My build, Explore, Mentor, project brief, and Field log; saved brief step navigation at phone width; SparkQuest TypeScript and both production builds; URL, student identity, and Phase 2 smokes. A designated real learner should still check their own assigned missions, saved evidence, and submission path on a physical phone.
