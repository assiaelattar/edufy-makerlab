# Atlas UI System

Atlas is the operational workspace inside Edufy. It serves education-center owners and staff who move quickly between students, classes, money, families, and team work. The interface should feel prepared, calm, and attentive: important work is already within reach, dense information remains readable, and every action gives clear feedback.

## Design Thesis

Atlas is a personal service desk, not a collection of dashboards. The shell keeps active work connected through persistent, reorderable workspace tabs. Each module follows the same operating rhythm:

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

Module colors identify data categories; they do not replace Service Teal as the interaction color.

### Theme

- Atlas supports `dark` and `light` themes through `data-atlas-theme` on the document root and application shell.
- A user's explicit choice is stored per tenant at `atlas:theme:<tenant-id>`. The operating-system preference is consulted only when that key does not exist.
- Dark remains the deep operational workspace. Light uses warm-neutral canvas `#F3F1EB`, white work surfaces, graphite text, and restrained slate borders.
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
- Pills are reserved for status, presence, and compact counts.
- Default control height: 40px. Dense table controls may use 34-36px.
- Avoid cards nested inside cards. Use dividers and full-width bands for hierarchy.

### Motion

- Control feedback: 140-180ms.
- Panels and navigation: 200-240ms.
- Animate opacity and transforms only; avoid layout-shifting entrance effects.
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
