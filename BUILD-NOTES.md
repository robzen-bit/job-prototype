# BUILD-NOTES — Deadlines & Automation Restructure + Step 3 Registration Flows + Job Settings Tabs

Build date: Aug 6, 2026 (prototype "today" = Jul 21, 2026)
Brief: phased unattended build, 15 phases. This file records every assumption,
ambiguity resolution, and deviation, tagged by phase.

## Global

- **Verification method**: per the project's standing convention (owner does
  browser QA via GitHub Pages; Claude does not drive a browser), each phase's
  verification was performed statically: tracing the code paths that implement
  the verified behavior, `node --check` on the extracted script, handler/id
  existence sweeps, and div-balance checks. Each phase's verification section
  below records what was traced.
- One commit per phase, pushed to GitHub Pages after each.

## Phase log

### Phase 1 — Collapse pattern ✅

- Added `dlPanelOn` master switches (all three panels start off/collapsed) and a
  panel-head layout (title + description + toggle). The body (mode radios,
  date/time controls, automations) renders only while the panel toggle is on.
- **Assumption logged (per brief):** the disabled-until-prerequisite pattern
  inside an expanded panel is unchanged; collapse operates at panel level only.
- **Decision:** a panel toggle now gates the deadline itself — `dlResolve`
  returns unresolved for a panel that is off, so anchors, ordering warnings,
  Review, and dependency logic all treat an off panel as "no deadline set."
- **Decision:** turning a panel OFF while another enabled panel's relative rule
  resolves through it fires the existing dependency-warning modal
  (informational variant, confirm = "Turn Off"). Config inside the panel is
  KEPT (persist pattern established on the Ecommerce step); dependents are not
  cleared — they surface "can't resolve" states until the panel is re-enabled.
- Groundwork: introduced `uiCtx` ('wizard' | 'settings') and guarded the
  wizard-modal swap in the warning-modal open/close paths with it, so the same
  modal machinery can serve the settings surface in Part Three.
- **Verification (static):** `dlPanelOn` initialized/reset all-false → all
  three panels render collapsed on load; body HTML is emitted only when
  `dlPanelOn[key] && !gated`; toggle handler flips only its own key; the
  gated preorder panel is forced collapsed regardless of stored state.
  `node --check` clean.

### Phase 2 — Automation vs notification classification ✅

- Added `DL_PANELS` (panel titles + collapsed-state descriptions) as a separate
  map from `DL_DEFS` (deadline FIELD names). Rationale: the field names
  ("Upload deadline") are load-bearing in anchor labels, validation copy, and
  dependency modals — renaming them to panel names would corrupt phrases like
  "sends after the upload deadline has passed."
- Panels renamed: **Preorder Automation** / **Upload Deadline Notification** /
  **Delivery Automation**. Each collapsed description states explicitly whether
  the system acts on its own ("The system acts for you — …") or only notifies
  ("Notification only — … It takes no action itself").
- Expanded body now carries the deadline field's own sub-heading so the
  panel/field distinction stays legible after the rename.
- No grouping/sections added — distinction expressed purely through naming and
  copy, per brief.
- **Verification (static):** head renders `DL_PANELS` title/desc for all three
  keys; every `DL_DEFS.title` usage in anchors/modals/validation unchanged and
  still refers to the deadline field. `node --check` clean.

### Phase 3 — Preorder Automation ✅

- Panel body now renders in the brief's order: **announcement → reminders →
  preorder deadline**.
- **3.1 Announcement (new):** template selector + specific/relative send
  timing. Relative mode anchors to a **shoot date with a picker** (Last shoot /
  First shoot / Shoot N), before/on/after + time. Validates: unresolvable
  without shoot dates, past sends blocked, and (extra, logged) warns if the
  announcement would land after the preorder deadline.
- **3.2 Reminders now repeatable:** stored as a list (structure was already a
  list from the earlier "structured for more" decision). Each reminder has its
  own template + timing (specific, or relative locked before/on the preorder
  deadline), its own remove ×, plus an "Add another reminder" control. The
  3-days-out + 1-day-out example is buildable.
- **Assumption logged (per brief):** reminder relative anchor stays locked to
  the **preorder deadline**, NOT the shoot — the walkthrough example conflicted
  with the earlier spec. FLAGGED FOR REVIEW.
- **Decision:** per-reminder on/off toggles removed — the panel master toggle
  governs the automation; a reminder exists or it doesn't (add/remove).
  Reminders can be removed down to zero (announcement + deadline remain).
- **Decision (deviation from pre-restructure behavior):** the Case-1
  "clear dependent settings" modal no longer silently turns automations off —
  automations always keep their configuration and surface "waiting on the …
  deadline" validation until dates resolve again (consistent persist pattern).
  Modal copy updated to say exactly that.
- **Verification (static):** body assembly for preorder = announceHTML +
  remindersListHTML + fieldSection in that order; add/remove handlers splice
  the list and re-render; announcement anchor select is populated from
  `shootAnchorOptions()` only. `node --check` clean; all 16 new functions
  defined exactly once.

### Phase 4 — Upload Deadline Notification ✅

- **4.1 Audience widened:** every reference to "contributing photographers" is
  gone (grep sweep = zero hits). Copy now says "the photographers working on
  this job" in the panel description and the notifications-list description.
- **4.2 Multiple notifications:** upload migrated onto the same repeatable
  per-item machinery as preorder reminders — starts with one configured (as
  today), "Add another notification" control, each removable. Items are
  **locked** per the earlier revision: relative-only, before-only, anchored to
  the upload deadline; only days, time-of-day, and template are editable.
- **Assumption logged (per brief):** built multiple upload *notifications*
  only. OPEN QUESTION FLAGGED: whether the upload **deadline itself** should be
  repeatable on multi-shoot-date jobs (Phase 5's "anchors to the last upload
  deadline" implies it might). This build keeps a single upload deadline; the
  delivery anchor therefore trivially resolves to "the last" (= only) one.
- Cleanup: the pre-restructure single-item functions (`autoReminderHTML`,
  `autoSendDT`, `autoValidation`, `autoFieldChanged`) removed; `autoToggle` /
  `autoTemplateChanged` now serve only the delivery sub-features (share/remind).
- **Verification (static):** upload body = fieldSection + notifications list
  (locked=true); add/remove handlers shared with preorder; no leftover
  references to removed functions; "contributing photographer" appears nowhere
  in the file. `node --check` clean.

### Phase 5 — Delivery Automation ✅

- Specific + relative modes kept; relative anchor remains **locked to the
  upload deadline** with no anchor selection (existing behavior verified).
- Multiple-upload-deadline anchoring: the upload deadline is single in this
  build (Phase 4 assumption), so "anchors to the last upload deadline" resolves
  trivially — no code change needed; flagged alongside the Phase 4 question.
- **Decision:** the panel master toggle now IS the share automation — the
  redundant inner "Automatically share galleries" sub-toggle was removed. The
  delivery-email template selector and the fire note ("Galleries will be shared
  with all contacts on the delivery deadline — <date>") render directly in the
  expanded panel. `dlAutos.share.on` is no longer consulted anywhere.
- **New copy (per brief):** the "Remind me" description now states the reminder
  itself will include an option to **pause the automatic delivery** before
  galleries go out.
- **Assumption logged (per brief):** the pause mechanism does NOT exist in this
  prototype and was NOT built — only the copy promising it was added, matching
  the earlier scoping of pause/hold as a later job-settings feature.
- **Verification (static):** delivery relative branch renders no anchor select
  (locked row + lock note); dlAffectedAutos counts "Automatic gallery sharing"
  whenever the Delivery Automation panel is on; remind copy contains the pause
  sentence (grep = 1 hit). `node --check` clean.

### Phase 6 — Collect registration before the shoot ✅ (pre-existing, verified + fixed)

- **Deviation from brief's framing:** this flow was NOT built from scratch — it
  was already ported from the gallery settings prototype (nz-settings-redesign
  "Volume Wizard") in an earlier session, with the choose-location-and-title
  step already skipped per the same requirement this brief states. This phase
  therefore verified it end to end and fixed compliance gaps:
  - **Fixed:** hardcoded preset name "Matthews" in the new-gallery assignment
    option → replaced with a real, working preset `<select>` bound to new
    `regPreset` state (also feeds Phase 8's Ecommerce step).
  - **Fixed:** two more hardcoded preset defaults (`csvPreset = 'Matthews'`,
    `bulkPreset = 'Mystic Falls School Portraits'`) → derived from
    `Object.keys(VOLUME_PRESET_ROLES)[0]` (final self-check #8).
  - **Fixed:** builder read the job name from the wizard's DOM field only —
    added `regJobName()` / `regJobFolder()` context helpers (wizard vs job
    settings) so the component is reusable in Part Three.
  - **Improved (location carried forward):** the "Add registrants to this
    folder" option now names the actual job destination folder inline, making
    the carried-forward location visible.
- **Verification (static):** selectJobType('prereg') → placeholder pane shows
  wz-ph-before → renderRegFormBuilder mount; no location/title prompt exists in
  the ported flow; folder label sources from wzParent (wizard) / job path
  (settings). `node --check` clean.

### Phase 7 — Collect registration during the shoot ✅ (pre-existing, verified)

- Also pre-existing from the earlier port (see Phase 6 note). Verified rather
  than rebuilt: Gallery Bulk Setup (count / naming convention / preset with
  live 10-row preview) → internal Next → the SAME form builder component the
  before-flow uses, navigated by `duringAdvancePhase()` intercepting the
  wizard's own Back/Next; no location/title prompt exists.
- Relevant fix landed earlier this session: the placeholder pane checked
  `selectedJobType === 'during'`/`'before'` while the actual ids are
  `'duringreg'`/`'prereg'` — the flows were unreachable until that was fixed.
- `bulkPreset` hardcoded default removed in the Phase 6 sweep.
- **Verification (static):** wizNav intercepts duringreg on the placeholder
  pane before step advance; paintDuringPhase toggles wz-during-bulk /
  wz-during-form-wrap; bulk preset select populated from VOLUME_PRESET_ROLES;
  the form phase mounts the shared builder into wz-ph-during-form-mount.

### Phase 8 — Ecommerce + Deadlines attached to both new flows ✅

- `wizFlow()` now appends wiz-ecom + wiz-deadlines for all three step-3 paths
  via new `wizEcomPath()` (import / prereg / duringreg, Setup=Now). Review rows
  and createJob's price-list/preorder/deadline wiring follow the same predicate.
- **Preset source per path** via new `wizActivePreset()`: import → CSV step
  preset; during → Gallery Bulk Setup preset; before → the form builder's
  "Apply Preset" select (`regPreset`, made real in Phase 6). The Ecommerce
  headline and preset→price-list default both use it; identical components and
  behavior across paths — no duplication.
- Blank Job intentionally excluded (out of scope per brief).
- **Verification (static):** flow arrays for prereg/duringreg include both new
  steps; during's internal form phase falls through to the ecom step on Next;
  ecom re-derives its default price list per path because selectJobType resets
  `ecomPLTouched`. `node --check` clean.

### Phase 9 — Preorder gating logic ✅

- Gating chain (mostly established in Phases 1–8, verified here): preorder off
  at Ecommerce (`preorderActive()` = price list + preorder toggle) →
  Preorder Automation panel renders **visible, collapsed, toggle disabled**
  (pointer-events off, faded), forced collapsed even if its master toggle was
  previously on; `dlPanelToggle('preorder')` refuses while gated; the deadline
  resolves as unresolved so nothing downstream consumes it.
- **Collapsed-state helper text (per brief)** upgraded: explains the panel is
  disabled because preorder isn't on for this job, points to the Ecommerce
  step, and — when configuration already exists — states it is kept and comes
  back when preorder is re-enabled.
- **Reacts to later changes:** the deadlines surface re-renders on every entry
  (wizard step paint; settings tab entry in Part Three), and `disabled` is
  computed from live ecom state each render — turning preorder off after
  configuring collapses + disables the panel and preserves its configuration
  (persist pattern, logged in Phase 1/3).
- **Verification (static):** four `preorderActive()` consumers traced (panel
  toggle guard, dlResolve gate, render-disabled flag, plus ecom's own
  enablement painter); helper renders inside the collapsed head, not the body.
  `node --check` clean.

### Phase 10 — Job settings shared approach (documented BEFORE building tabs)

**Component reuse — shared components, shared state, context-switched mounts.**
The wizard's configuration components (schedule builder, ecommerce pane,
deadlines panels, registration form builder, CSV preset/role config) already
operate on module-global state and render into a mount element. Rather than
building settings-only copies, the settings tabs reuse the exact same renderers:

- A global `uiCtx` ('wizard' | 'settings') selects the active mount per
  component (e.g. deadlines render into `wz-deadlines-mount` in the wizard and
  `set-dl-mount` in settings). Rendering into one context clears the other
  container, so element ids stay unique. Static fragments the renderers depend
  on (ecommerce pane body, deadlines timezone/order-warning header) are
  extracted into the renderers so both surfaces get them.
- The schedule builder keeps its DOM-as-state design; its container is resolved
  through `shootsMountId()` instead of a hardcoded `#wz-shoots`, and the
  settings surface gets a parallel container seeded from the job.
- Per-job configuration lives on the job record as `j.config` (path, csv/reg/
  bulk setup, ecom, deadlines, schedule). `loadJobSettings(j)` copies config →
  the shared globals when a job is opened; `persistJobSettings()` copies
  globals → config when leaving a settings pane/tab/view. New jobs snapshot the
  wizard state at creation; premade demo jobs synthesize a default config on
  first open (logged below).

**Wizard chrome stripped.** Settings panes contain none of the wizard's Next
buttons, step chips, or the "can always be changed later in job settings" line
— the reassurance line lives in the wizard pane outside the shared mounts, so
it cannot leak into settings.

**Save model — follow Job Details.** Job Details' established pattern is
immediate commit (notes commit on Enter; org/contact changes commit through
their confirm modals). The other tabs therefore also commit immediately: every
control writes to the shared state on change, and the state is persisted to the
job record on tab/pane/view exit. There are no Save buttons and no unsaved
state, so no unsaved-changes warning is needed. (If a true staged-save model is
wanted later, `persistJobSettings()` is the single choke point to gate.)

**Assumptions logged:**
- Tabs are **editable**, not read-only, following the Job Details precedent.
- Premade demo jobs have no stored config; a default is synthesized on first
  open (path=import subject list, no price list, preorder off, all deadline
  panels off, schedule seeded from the job's shoot dates with venue +
  photographers carried over; street/city/state detail is not reconstructed
  from the demo display strings).
- Job-card/overview summary strings refresh from the edited schedule via
  `parseShoots()` on persist; deeper derived demo data (report charts, order
  history) intentionally does not re-derive.

### Phase 11 — Schedule tab ✅

- The Schedule pane hosts the SAME shoot-schedule builder the wizard uses
  (`createShootBlock`/`addLocCard`/photographer chips/duplicate/sort), rendered
  into `#set-sched-shoots` via the Phase-10 mount helper and seeded from
  `j.config.sched` on job open. Org saved-location dropdowns and the
  save-location-to-organization checkbox work here too (context resolves the
  job's organization).
- **Dependency modals reused, not rebuilt:** in settings context, shoot-date
  edits route through `wsDateChanged` → the existing `modal-dl-warn` machinery.
  Changing a date fires the informational variant naming every deadline whose
  relative rule resolves through the shoot schedule (plus transitive dependents
  and affected automations, including the shoot-anchored preorder
  announcement); clearing a date or removing a dated shoot block fires the
  destructive variant ("Remove Date"). Confirm commits + recalculates +
  persists; cancel reverts the input. Duplicating a shoot also warns, since a
  new latest date moves "last shoot" anchors.
- **Decision:** in the WIZARD the same edits stay silent (deadlines re-resolve
  on step entry) per the earlier auto-recalc decision — the modal interception
  is settings-only, matching this brief's Phase 11 scope.
- **Verification (static):** wsDateChanged/removeShootBlock/duplicateShootBlock
  branch on uiCtx; shootDependents() collects direct shoot-anchored deadlines +
  transitive dependents; confirm path = pendingShoot.commit → sortShoots →
  persist → renderDeadlines; cancel path (button, ×, overlay click) restores
  the previous date via dataset.prev. `node --check` clean.

### Phase 12 — Setup tab ✅

- Shows the job's step-3 path as a **read-only** chip with a lock note; the
  configuration inside the path is editable via the SAME components the wizard
  uses:
  - import → the extracted CSV preset & role-configuration fragment
    (`csvConfigHTML`, mount-swapped like the ecom pane; the wizard's static
    copy was replaced by a mount so the fragment exists once).
  - before → the shared registration form builder mounted into the tab.
  - during → the extracted Gallery Bulk Setup fragment (`bulkConfigHTML`,
    same mount-swap treatment) plus the shared registration form builder.
  - no path (job saved early via Save & Exit) → explanatory line, no config.
- **Assumption logged (per brief):** the path itself is NOT switchable from
  settings — switching paths after a job exists has data consequences beyond
  this build. DECISION FLAGGED FOR REVIEW.
- **Not shown:** the import path's dropzone/data-matching (the import already
  ran at creation) — only preset/role config remains editable. Logged as an
  interpretation of "everything configured within that path."
- **Verification (static):** renderSetupTab branches for all three paths plus
  the no-path case; fragments render exactly once per surface (mount-swap
  clears the other side); reg builder's mount clear-list includes the settings
  mount with null guards. `node --check` clean; settings block div-balanced.

### Phase 13 — Ecommerce tab ✅

- The pane hosts `set-ecom-mount`; `renderEcomStep()` (mount-aware since
  Phase 10) renders the identical ecommerce pane body there: dynamic preset
  headline (State A/B via `wizActivePreset()` + the job's loaded path), price
  list dropdown with correct defaulting (`ecomPLTouched` persisted per job),
  and the full preorder enablement chain (no price list → toggle disabled;
  toggle off → settings visible but disabled; values persist).
- No wizard chrome: the reassurance line lives outside the shared mount in the
  wizard pane only.
- **Verification (static):** renderSettingsPane('set-ecom') → renderEcomStep →
  mount targets settings container in settings ctx and clears the wizard's;
  paintEcomEnablement operates on ids that exist exactly once. `node --check`
  clean.
