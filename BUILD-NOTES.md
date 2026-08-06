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
