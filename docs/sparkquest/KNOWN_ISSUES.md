# SparkQuest Mission Experience — Known Issues

- Ten of the 20 live mission templates still embed base64 thumbnails inside Firestore. They remain readable, but moving them to Storage is a separate measured performance migration and must not be mixed into the permission repair.
- The Phase 8 rules/client candidate still needs a coordinated production release and authenticated instructor/learner smoke test.

- The isolated Auth/Firestore/Storage emulator proves the exact showcase upload and submission transaction, including a legacy project without tenant ownership. The production Storage IAM bridge and Firebase rules are repaired; a final authenticated learner upload still needs a designated learner account after the web-client release.
- The repository-wide parent TypeScript configuration reports unrelated legacy diagnostics; the scoped SparkQuest TypeScript project passes.
- The production bundle still reports existing Firebase static/dynamic import overlap and a main chunk above 500 kB.
- Legacy missions without structured materials, deliverables or safety notes use conservative display fallbacks until an instructor edits them.
