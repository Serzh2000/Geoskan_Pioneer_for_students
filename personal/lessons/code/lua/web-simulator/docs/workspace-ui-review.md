# Workspace UI review · 2026-10-12

Implemented the user-requested rail repair, bottom terminal, telemetry and scene
manager layout. Canonical owners and responsive behavior are recorded in DESIGN.md
and UX-CONTRACT.md. Existing user changes in the repository were retained.

## Verified

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit`, exit 0.
- Full build: `npm run build`, exit 0 (including example sync, Vite and server tsc).
  Vite retains existing large-chunk warnings; no new splitting work was included.
- Five Jest suites: workspace-panels, mission-guide-course-ui,
  mission-guide-walkthrough, mission-guide-learning and viewport-pointer-controls;
  37 tests passed. Regression tests cover repeated rail toggles during close,
  unavailable storage and utility focus restoration.
- ESLint on changed TypeScript and the new test: 0 errors, 10 existing `any` warnings.
  No separate formatter is configured in package.json.
- Real browser at localhost:3011, dark/light, desktop, 800×900 and 430×900.
  The viewport override was reset. Code/terminal geometry remains separate; the
  side drawer bottom equals the terminal top. Keyboard End at 430×900 produced
  exactly 448px in both ARIA and layout, with 242px left for code/reference.
- Pointer resize released its drag state. Arrow/Home/End resizing, drawer close,
  sequential Escape and focus restoration worked. Notifications clear to the
  persistent empty state. Search no-results/clear and object-to-properties worked.
  Radio arrows change the pending preset and summary without creating scene objects.
- Utility panel sizes after editor: telemetry 320px, manager 420px. Twenty-five
  matrix pixels remain bound; battery meter reports the actual value. Unlit LEDs
  use the same dark board in both themes.
- The backend had not been running (real HTTP 502/API unavailable state). Started
  dist/server-dev.js on 127.0.0.1:3010, reloaded, and verified the Lua example list.
  Existing WebGL shadow deprecation warning remains outside this UI change.

## Tool limits and existing checks

Strict Premium audit was run over the learning and workspace owners, with JSON
saved as premium-workspace-audit.json. It reports 95 actionless-button findings:
its detector recognizes only literal onclick/Vue click attributes (audit_project.py
lines 721–741), while these controls are bound by addEventListener/delegated data
handlers. Changed controls were verified with their real bindings and browser
interactions. These findings have not been suppressed or reported as a clean audit.
Duplicate manager WebKit scrollbar recipes were removed in favor of the canonical
cross-browser base; inspector textareas now use bounded auto-growing resize-none.

Repository-wide ESLint exits 1: 15,308 errors and 1,610 warnings. Most errors are
from existing dist-mission-review generated bundles (Monaco 8,774; Blockly 2,115;
Three 1,339). Counts are saved in workspace-eslint-summary.json. Those artifacts
and unrelated source were not rewritten to make this UI task's lint appear green.

DESIGN.md YAML and required groups pass local js-yaml validation. Official designmd
lint is still unverified: the earlier automatic approval review rejected downloading
and executing the missing external package (see learning-ui-review.md). No bypass
or replacement claim was made.

Native language-select invocation was exercised; its platform popup is outside the
browser screenshot surface. No custom popup was introduced. Reduced-motion rules
were checked statically; OS motion preference and physical touch/keyboard devices
were not emulated. No terrain insertion/deletion or flight was needed for this
layout task; scene contents and code were left intact.
