# SparkQuest Factory learning dashboard concept

This is a **visual prototype** for the instructor dashboard. It uses synthetic learner, mission, and class records, and it does not connect to an account or change the live Factory. Open `factory-learning-demo.html` through the SparkQuest Vite dev server.

## Direction

The dashboard borrows tactile interaction patterns from playful learning apps—rounded controls, a visible pressed edge, immediate feedback, a small sense of reward—while using SparkQuest's own spark symbol and maker language. The main visual is a teaching trail: review proof → launch a mission → check the class pulse. That sequence represents real instructor work rather than an arbitrary gamification score. The surrounding cards use the balanced density of the supplied reference dashboard.

## Core tokens

| Token | Value | Role |
| --- | --- | --- |
| Canvas | `#eff6fb` | Light blue canvas keeps the learning work clear |
| Ink | `#203149` | Legible headings and actions |
| Spark blue | `#2f78e8` | Primary action and current step |
| Workshop coral | `#ff8268` | Proof awaiting feedback |
| Marigold | `#ffd35f` | Resources and encouragement |
| Citrus | `#a9df39` | Learning progress and momentum |
| Violet | `#9b7ae7` | Ideas and mission drafts |
| Border | `#e4eaf2` | Card definition |

Display type is Nunito 900 for short, friendly headings; DM Sans carries operational copy. Desktop page titles reach 46px and card titles 22px; the phone title is 34px. Primary controls are at least 52px high. Cards have 23px corners and a subtle lower edge. Primary buttons have a five-pixel bottom shadow that disappears as the control presses. Gradients give depth to the main action and selected learning surfaces, while the underlying text stays high contrast. Icons come from Lucide; the spark mark is built from CSS shapes and is original to this concept.

## Components demonstrated

- `Teaching trail`: three actual instructor tasks, linked by a dashed path and clickable destinations.
- `Press button`: primary, dark, and outline variants with hover, press, and focus states.
- `Metric card`: proof workload without a generic business KPI chart.
- `Class pulse`: group switcher and visible progress ring with descriptive text.
- `Proof row`: opens a sample note; sample approval or revision updates the local queue and feedback count.
- `Mission bench`: creates a local draft and allows a sample assignment state.
- `Resource invitation`: a compact supporting panel.
- `Navigation`: desktop pill navigation and four-destination phone bar; Resources remains in the phone menu.

Desktop and 390px layouts are intentionally composed separately. On phones, the metric cards stack so the larger controls remain easy to use. Motion is limited to hover, press, pop-in, state feedback, and slow accents on the current step; `prefers-reduced-motion` removes it. The next product step is to evaluate this concept with instructors before mapping its tokens to live Factory screens and real data contracts.
