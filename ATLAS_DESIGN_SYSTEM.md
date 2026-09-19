# Atlas UI System

Atlas is the operational foundation inside Edufy. School owners and staff should experience Edufy—not the underlying platform architecture—while moving between students, classes, money, families, and team work. The interface should feel bright, prepared, calm, and attentive: today's school activity is immediately understandable, important work is already within reach, and every action gives clear feedback.

## Design Thesis

Edufy is a school-day workspace, not a collection of SaaS dashboards. The shell keeps active work connected through persistent, reorderable open pages. Customer-facing language uses school concepts such as Today, Students, Classes, Attendance, Payments, Families, and Staff; terms such as tenant, module, SaaS, and command remain internal. Each module follows the same operating rhythm:

```text
+-----------------------------------------------------------+
| Context bar: tenant, density, account                     |
+-----------------------------------------------------------+
| Reorderable workspace tabs                               |
+-----------------------------------------------------------+
| Command header                         Compact actions    |
+-----------------------------------------------------------+
| Operational signals                                      |
+-----------------------------------------------------------+
| Filters / views / search                                 |
+-----------------------------------------------------------+
| Primary work surface                                     |
+-----------------------------------------------------------+
```

## Foundation

### Color

- Atlas Ink `#08111F`: application shell and primary text on paper.
- Night Panel `#0F1B2D`: elevated operational surfaces.
- Service Teal `#14B8A6`: primary action, focus, active navigation.
- Care Amber `#F2C766`: attention, pending work, human follow-up.
- Atlas Paper `#F7F1E4`: marketing and high-contrast light surfaces.
- Signal Rose `#FB7185`: destructive actions and urgent risk only.
- Edufy Volt `#C8FF00`: the product's signature action capsule, selected workspace state, and small readiness signal. It is deliberately rare and always paired with ink text.
- Electric Blue `#8DB5FF`: expressive school-category surfaces and supporting information, never the default action color.

Module colors identify data categories; they do not replace Service Teal as the interaction color.

### Theme

- Atlas supports `dark` and `light` themes through `data-atlas-theme` on the document root and application shell.
- A user's explicit choice is stored per tenant at `atlas:theme:<tenant-id>`. Light is used only when that key does not yet exist.
- Light is the default for a new school workspace and uses a cool paper canvas `#F2F4F7`, white work surfaces, graphite text, and restrained slate borders. A stored explicit preference is always preserved.
- Dark is a fully designed alternative using deep navy canvas and surfaces. It follows the same hierarchy and semantic components; it is not an inversion filter or a separate layout.
- Soft mint, sky, peach, lilac, and sun tones identify school-day categories in both themes. Dark mode uses controlled translucent equivalents rather than bright pastel fills.
- On owner overview screens, color should occupy the card surface rather than appear only as a small icon accent. Use an approximate 65/25/10 balance: calm paper and neutral space, category pastels, then a small amount of high-contrast ink or saturated action color.
- The strongest spectrum treatment is reserved for one priority card per view, such as verified payments. Supporting cards use one pastel family each so the page remains warm without becoming noisy.
- Service Teal and Care Amber keep the same meaning in both themes. Their light-theme text variants must be dark enough for readable contrast.
- Shared components consume semantic `--atlas-*` surface, border, and text tokens. New module work must not add theme-specific branching in React.
- The scoped light compatibility rules in `index.css` are a migration bridge for existing dark Tailwind utilities, not the preferred pattern for new surfaces.

### Typography

- Display and interface: DM Sans, 700-900 weight.
- Supporting copy: DM Sans or Inter, 400-600 weight.
- Financial values, timestamps, IDs, and compact metadata: JetBrains Mono.
- Headings inside work surfaces stay compact. Hero-scale typography belongs only to marketing.

### Geometry

- Command surfaces: 12px radius.
- Cards, fields, tabs, buttons: 8px radius.
- School-day overview and bento cards are the expressive exception: use 23-30px asymmetric corner geometry, a fine highlight edge, and a soft two-layer shadow. Nested controls remain compact so the surface still feels operational.
- Shared module headers and primary panels use 28px sculpted corners. List rows and option cards use 18-20px corners; primary and secondary actions may use capsule geometry. Do not turn large content cards into pills.
- Pills are reserved for status, presence, and compact counts.
- Default control height: 40px. Dense table controls may use 34-36px.
- Avoid cards nested inside cards. Use dividers and full-width bands for hierarchy.

### Motion

- Control feedback: 140-180ms.
- Panels and navigation: 200-240ms.
- Animate opacity and transforms only; avoid layout-shifting entrance effects.
- Owner overview entrances may stagger by 45-70ms, with a total reveal under 500ms. Hover lift stays below 6px and 1.02 scale.
- Data bars may grow from their baseline and the current schedule marker may pulse gently. Ambient hero shapes can drift slowly, but must remain clipped inside the hero and never compete with actions.
- Dragging raises the active tab and reduces surrounding emphasis.
- Respect `prefers-reduced-motion` everywhere.

## Shell Behavior

- The navigation rail can collapse on desktop and becomes a drawer on mobile.
- Opening a module adds it to the workspace strip.
- Workspace tabs can be activated, closed, and reordered by pointer or keyboard.
- Tab order, rail state, density, and theme are saved per tenant in local storage.
- The desktop context bar exposes a compact theme icon with a tooltip; the mobile drawer exposes the same action with a visible label.
- The workspace strip scrolls horizontally on small screens and never wraps.
- Comfortable and compact density change shell and Atlas primitive spacing without changing information hierarchy.

## Module Contract

Every logged-in module should use these shared pieces where applicable:

1. `AtlasCommandHeader` for title, context, badges, and primary actions.
2. `AtlasSignalCard` for two to four operational signals, not decorative metrics.
3. `AtlasToolbar` for search, filters, date ranges, and view controls.
4. `AtlasSectionHeader` for unframed content sections.
5. `AtlasEmptyState` with a clear next action.
6. Shared confirmation and alert modals instead of browser dialogs.
7. Shared module surfaces inherit the Edufy component language: white or navy appliance panels, category-tinted signal cards, soft capsule toolbars, rounded fields, separated table rows, and theme-aware dialogs.

Legacy authenticated modules may temporarily inherit these rules through the scoped `.atlas-module-content` compatibility layer. New work should use the semantic Atlas primitives directly rather than adding more hard-coded slate surfaces.

## Interaction Rules

- Use icon buttons for familiar actions and include tooltips or accessible labels.
- Keep the primary action visible and limit each surface to one dominant primary action.
- Name controls by the action they perform: `Save changes`, `Assign instructor`, `Send reminder`.
- Filters update the current work surface; navigation changes modules or views.
- Preserve selection and filters when practical when moving between workspace tabs.
- Destructive actions explain the consequence before confirmation.
- Success feedback uses the same verb as the initiating action.

## Responsive Rules

- Mobile layouts prioritize the current task, then signals, then supporting context.
- Two-column signal rails are acceptable on mobile; tables must scroll or transform into deliberate rows.
- Action groups wrap without changing control height.
- Long labels truncate only when the full value is available through context or a tooltip.
- Fixed-format controls use stable dimensions so labels, counts, and loading states cannot move the layout.

## Parallel Module Ownership

- Shared files (`index.css`, `AdminLayout`, `components/atlas/*`, modal infrastructure) have one integration owner.
- Module agents edit only their assigned view files.
- Agents must not introduce new global tokens, dependencies, or shared primitives.
- Each module pass runs a production build and scans touched files for browser-native dialogs.
- Integration happens in small module groups, followed by responsive visual review.
