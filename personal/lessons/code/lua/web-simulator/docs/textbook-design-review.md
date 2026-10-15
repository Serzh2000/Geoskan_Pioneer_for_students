# Textbook design review · 12 October 2026

The requested surface is a Russian educational product: understand a concept,
predict it, write or assemble a small program, observe actual simulation output,
then explain it. It retains the existing five stages, independent Python/Lua/
Blockly tracks, gated completion, drafts and temporary scene ownership.

The visual direction is an instructor's flight workbook. Its signature is the
five-checkpoint route with a short action verb beneath each stage. Course indices
represent the real curriculum; decorative statistics, promotional hero sections
and animated scenery are absent.

## Scope and owners

`public/styles/panels/guide-panel/flight-workbook.css` is the final textbook visual
recipe after `course-shell.css`. It consumes existing `--work-*` palette tokens,
font tokens and shared scrollbar ownership. It introduces no global theme changes,
new fonts or new behavior primitives. `DESIGN.md` mirrors the new geometry.

| Previous evidence | Decision | Result |
| --- | --- | --- |
| Large paragraph followed by equally weighted rounded API cards | Separate lead, references and experiment | 17 px lead, flat reference rows, one task callout |
| Step navigation is a loose group of pills | Use the subject's real ordered flight route | Five connected checkpoints, real completed marks, active state |
| Large header competes with the lesson | Compact shell; let the lesson title lead | 56 px shell header, 25–32 px title, optional context line |
| Multiple CSS polish passes prescribe contradictory spacing | Final named component recipe preserves underlying contracts | 24 px section gaps, 28 px desktop gutters, 16 px mobile gutters |
| Six-stage sentence in DESIGN.md predates the canonical five stages | Correct stale documentation | Five stages remain unchanged in runtime |

The existing graphite/orange and pale neutral identity remains. Light/dark use the
same hierarchy and semantic tokens. Narrow layouts retain all five named stages,
course navigation and actions. A body container decides when reading/work areas
can use columns; the window does not force a two-column editor into a thin pane.

## Verification responsibility

The root agent owns real-browser checks, screenshots, strict premium audit and
project verification. The behavior agent owns state/focus tests. This report is
design evidence and does not claim a browser result before those checks occur.

Applicable browser matrix: three tracks; light/dark; idea/prediction/practice/
result/review; wrong/right prediction; unavailable next step; narrow course
navigation; keyboard focus; actual editor and scene frames; reduced motion.
Existing modal/input ownership, runtime completion and stale-source checks remain
the canonical owners. No CSS rule marks a lesson complete or executes a program.

## Observed integration results

Python and Lua were the primary browser checks. Lesson 2 was completed through
prediction, a real edited comment, actual runtime execution, accepted result and
available reflection. The test did not mark lesson 2 complete. Lesson 1 was
successfully completed to unlock it; the browser's shared course progress is 1/108.
These checks do not claim that every lesson or a physical controller was tested.

- Each language retains its own lesson draft across switching and closing/reopening
  the book. Closing restores the original six-line Lua workspace and its language;
  lesson documents no longer overwrite the main editor's saved drafts.
- At 700 px width, opening the outline makes lesson content inert and focuses the
  current enabled lesson. Escape returns to content without closing the book.
  A regression test covers the selector-order bug discovered in the browser.
- At 1054 px width, practice shows the real editor alongside instructions/scene,
  and results show status alongside the live scene. The result's camera controls
  use one horizontally scrollable row instead of covering the drone in four rows.
- Light/dark surfaces were inspected. Python practice/result screenshots and Lua
  editor/terminal screenshots are saved in the task's visualization directory.

The final city-to-book transition also exposed inherited overview distance: a
600 m map camera made the lesson drone nearly invisible. The preview now owns a
temporary camera snapshot, frames the selected drone on first mount and preserves
the learner's viewpoint on subsequent renders; exiting restores the workspace
camera. This is part of the same temporary scene/editor ownership contract.
The final browser practice screenshot confirms the drone is framed again. The
four-suite camera/input/outline verification passed 19 tests, including repeated
mounts retaining the learner's viewpoint and the first camera-update frame after
restoration. The final build and the CSS-owner guard passed after these changes.

Verification: the integration run passed 13 matched suites / 95 tests; a separate
run passed the four city/variety/surface/collision suites / 33 tests. The subsequent
outline regression suite passed both tests. The final atmosphere suite passed
12 tests. These are run counts, not a sum of distinct tests. The final production
build, TypeScript check and scoped ESLint completed without errors. Vite retains
its existing large-chunk warning.

The strict premium static audit is saved in `docs/premium-audit-final.json`. It
exits 1 with 95 findings, all `affordance.actionless-button`: its literal-markup
detector does not resolve this application's external/delegated event handlers.
No findings were suppressed and a strict pass is not claimed. Browser checks and
feature tests provide the runtime evidence for the inspected controls. The
external DESIGN.md CLI download/run was rejected by automatic approval review in
the earlier verification pass; the local design context remains saved.
