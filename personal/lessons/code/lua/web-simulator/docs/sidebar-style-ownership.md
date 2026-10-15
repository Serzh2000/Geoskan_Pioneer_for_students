# Sidebar style ownership and inspection checklist

Runtime palette: `core/base.css`. Shared geometry: `layout/panel-shell.css`.
Semantic surfaces/text and keyboard/reduced-motion states: `panels/panel-chrome.css`.
Shared fields/buttons: `core/forms.css`. Scrollbars: `core/base.css`.
All panel checks compare light/dark, narrow width, long labels and keyboard focus.

| Surface / entry | Inner layout owner | Specific checks |
| --- | --- | --- |
| Code | `scene/editor.css` entry and editor recipes | Lua/Python/Blockly; API + bottom terminal coexistence; notification empty/result states; editor height; resize release |
| Telemetry | `panels/telemetry.css` | Real status, dominant altitude, battery and physical LEDs; narrow/full-width cards; no bright unlit pixels |
| Swarm | `scene/swarm-and-led.css` entry | Selected drone/list empty state, safe actions, actual connection status |
| Scene manager | `scene/manager-panel.css` entry | Objects/properties, filter clearing/no results, selected/protected objects, terrain disclosure and explicit Add, catalogue popup |
| Textbook | `panels/guide-panel.css`, course/workbook recipes | Python and Lua first; all five stages, real code + scene, error/retry/result/reflection; independent Blockly track |
| Theme rail control | `layout/sidebar-tabs.css`, `header/theme-toggle.css` | Same icon hit area, active/keyboard/focus states; theme switch does not alter layout |
| Controller | `gamepad/panel.css`, workspace/wizard recipes | Mapping/monitor/settings panes; no-device state; axis monitoring; calibration and cancel; responsive panel-width geometry |
| General settings | `panels/settings.css` entry | Four disclosures, range values, checkboxes, persisted toggles; all controls visible at narrow width |
| Channel monitor (secondary panel) | Gamepad monitor recipes | Same channel visuals as controller pane; standalone scroll ownership |
| API reference (secondary panel/editor drawer) | `panels/api-docs.css` | Search/clear, category filters, entries, loading/failure/empty states; native choices and keyboard focus |
| Event journal (secondary panel) | `panels/logs.css` | Search/source/severity, technical toggle, empty/results, follow/export/clear; visible global scrollbar |

## Removed overlapping owners

- `sidebar-card-overrides.css`: unused generic `.card` rule hid headings globally.
- `dark-foundation/workspace-shell.css`: separate theme copies for panel/rail/header
  removed after existing recipes consume canonical theme variables.
- `core/forms.css` per-panel WebKit scrollbar override: global visible baseline owns it.
- `journal-academy.css` journal selectors: migrated to the existing `logs.css` owner.
- `dark-panels/dashboard-and-logs.css` telemetry/log rules: component tokens own themes.
- Global `.btn-primary/.btn-secondary` declarations move from gamepad to shared forms.

Manager/editor/settings/gamepad cleanups are coordinated with their feature owners.
This checklist describes required browser inspection and source ownership; it is
not a claim that all browser states passed. Root integration records real results.

## Integration inspection, 12 October 2026

The primary rail entries (code, telemetry, swarm, manager, textbook, theme,
controller and settings) were opened in the browser. Headers use 52 px / 15 px
titles / 36 px close controls. Shared panel/theme/field owners replace the foreign
gamepad rules in `journal-academy.css` and the old manager dark override. The CSS
import guard reports 118 reachable stylesheets, eight canonical owners, zero
retired files and zero runtime references to those files.

Verified interactions include: API drawer beside the editor with a 260 px terminal
at the bottom; notification empty state with disabled Clear; manager zero-result
search and clearing; protected ground properties and disabled delete; controller
mapping/monitor tabs and no-device disabled calibration; settings disclosures.
Desktop fullscreen utility panels leave the rail accessible. Narrow panels retain
normal flow. Per-panel saved widths remain user preferences; a fresh utility panel
no longer inherits the code editor's large width.

Dark controller screenshot confirms the formerly pale cards now use the same
semantic surfaces. Hardware calibration, every API entry and every event-journal
operation are outside the observed browser evidence; style ownership was checked
for these secondary surfaces in source. See `textbook-design-review.md` for the
test/build runs and the strict static auditor's detection limitation.
