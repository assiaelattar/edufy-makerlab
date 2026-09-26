# SparkQuest Mission Experience — Decisions

- Keep `MissionBrief` additive and optional so published legacy missions remain readable.
- Resolve learner-facing content in `domain/missionContent.ts`; UI components do not invent independent fallbacks.
- Give learners a role-specific briefing while instructors retain readiness and audience information.
- Require mission review before creating a learner project, then snapshot the brief and resources into that project.
- Use one amber primary action and four restrained semantic card colors: blue for understanding, orange for building, mint for testing/readiness and violet for help/proof.
- Prefer short, icon-led learner cards over dossier-like paragraphs. Keep complete mission meaning, but expose it in scan-sized sections.
- Use the existing Framer Motion dependency for transform/opacity reveals instead of adding another animation runtime; respect reduced motion.
- Give mission details their own vertical scroll container because the application shell intentionally locks body scrolling.
- Lead with the instructor-authored project thumbnail and problem, then teach the five-stage engineering cycle before showing tools and construction steps.
- Use a local STEM fallback illustration when a legacy mission has no thumbnail; do not fetch random third-party imagery.
- Keep the design-preview query development-only so it cannot expose mock content in production.
- Keep showcase publication moderated: learners upload media and a link, submit the project, and instructors publish it from the existing review queue.
- Store learner files under `student-projects/{organizationId}/{authUid}/{projectId}` while Firestore projects retain the canonical Edufy learner record id.
