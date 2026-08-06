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
