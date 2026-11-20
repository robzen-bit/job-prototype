/* Credits ledger. Every balance and money figure is derived from the event list; nothing stores a balance.
   Event types: purchase {paid, face}, redemption {amount, orderId, galleryId}, refund {amount}, adjustment {amount}.
   A client can buy more than once; purchases pool into one balance (decided 2026-11-05). An adjustment with an orderId
   gives back the credit of an order the photographer cancelled (shortfall declined): it undoes that redemption.
   All credits code shares Robert's global scope, so everything lives on CR to avoid name clashes. */
const CR = {
  events: [],
  orders: [],
  moment: 'on_sale',                 /* demo "moment in time", see CR.MOMENTS */
  phase: 'before_photos',            /* derived from the moment: 'before_photos' | 'photos_available' */
  userStart: {},                     /* per test user: 'new' | 'registered' | 'sample' (their sample history) */
  listeners: []
};

/* Demo state has three independent parts, each with its own reset:
   - settings: the credit offer, selling settings, credit emails, and registration (on/off and questions), which the photographer edits
   - test users: who has registered, their answers, their ledger events and orders
   - moment: where the job is in time, which sets the job phase and the demo's "today" */

/* ── Settings ── */
CR.seedSettings = function (empty) {
  const o = CR_DATA.creditOffer, j = CR_DATA.job;
  const opens = Math.round((new Date(j.shootDate) - new Date(o.purchaseWindow.opens)) / 86400000);
  CR.offer = {
    status: empty ? 'empty' : o.status,             /* 'empty' | 'draft' | 'published' */
    amounts: empty ? [] : o.amounts.map(a => ({ paid: a.paid, face: a.face })),
    examples: empty ? [] : o.examplePackages.slice(),   /* example products: package or single-item ids from the price list */
    exampleImages: {},                                   /* id → image the photographer uploaded; otherwise our default */
    window: {
      opens: { mode: 'before', days: opens, date: '' },   /* 'before' (days before the shoot) | 'date' */
      closes: { mode: 'shoot', days: 0, date: '' }        /* 'shoot' | 'after' (days after the shoot) | 'date' */
    },
    registration: { purchaseRequired: o.registration.purchaseRequired },   /* buying credit at registration: a credit rule */
    audience: 'parents'   /* who can pre-order (decided 2026-11-05): 'parents' | 'students' | 'everyone' */
  };
  CR.settings = {
    creditSalesOn: empty ? false : j.creditSalesOn,
    packageFirstCheckout: j.packageFirstCheckout,
    /* The price list's own settings (edited in the price list editor, read-only on the job tab, 2026-11-05):
       a minimum order for families without credit (replaces the standard selling switch), off by default, and
       package required before single items. How that interacts with the job's package-first is open. */
    minOrder: { on: false, amount: 50 },
    pkgFirstPriceList: false,   /* "Package required before checkout" (ADO 85337) */
    pkgOnlyPriceList: false     /* "Only sell packages": can't be on with package required (ADO 85337) */
  };
  /* Credit emails card: the pre-order invite (recorded, never sent) and who reminders go to. */
  CR.emails = { invite: { state: 'none', date: null }, reminderTo: 'notPreordered' };
  const required = { 'Student name': true, 'Team': true };
  /* Registration is its own setting: it works with or without credit. */
  CR.reg = {
    on: o.registration.required,
    /* When the registration link accepts registrations. Opens: now, on a date, or days before the shoot. Closes: no end
       date, on a date, or days before or after the shoot. */
    window: { opens: { mode: 'now', days: 30, date: '' }, closes: { mode: 'none', days: 7, date: '' } },
    questions: o.registration.questions.map((q, i) => ({
      id: 'q' + (i + 1), label: q.label, type: q.type, required: !!required[q.label], options: (q.options || []).slice()
    })),
    nextId: o.registration.questions.length + 1,
    /* Registration fee (ecom meeting 2026-11-05): Robert's prototype has no fee setting, so a sample $10. Off by default. */
    fee: { on: false, amount: 10 }
  };
};

/* ── Test users ── */
CR.sampleIds = CR_DATA.clients.map(c => c.id);
CR.userStart = { 'c-dana-smith': 'new' };   /* Dana starts unregistered so the main flow can be tested right away */
/* Who starts with a password: Luis. Everyone logs in with the access code; a password is optional (2026-11-05). */
CR.accountStart = { 'c-luis-martinez': true };
CR.accounts = {};
CR.loggedIn = {};
/* Preview options (Demo control, prototype only): ways of presenting the offer, of a family arriving, and the wording.
   Defaults are today's version. Imported contact: Dana is the sample family the photographer imported. */
CR.prev = { layout: 'A', arrival: 'anonymous', words: 'credit' };
CR.IMPORTED_ID = 'c-dana-smith';
CR.imported = {};
CR.startOf = function (id) {
  const c = CR.client(id);
  if (CR.userStart[id]) return CR.userStart[id];
  if (c && c.isNew) return 'new';
  return c && (c.ledger || []).length ? 'sample' : 'registered';   /* a sample user without history starts registered */
};

/* One user back to their starting state. Sample answers come from the user's galleries (student name from the
   gallery name, team from its folder) and prefill the registration form. */
/* Emails as in the sample data, so a reset undoes a photographer's email correction. */
CR.origEmail = {};
CR_DATA.clients.forEach(c => { CR.origEmail[c.id] = c.email; });
CR.emailLog = {};   /* clientId → [{ who, date, from, to, reason }]: corrections by the photographer, demo state only */
CR.seedUser = function (c) {
  const st = CR.startOf(c.id);
  if (CR.origEmail[c.id] && c.email !== CR.origEmail[c.id]) {
    const row = (JOBS.riverside.contacts || []).find(r => r[2] === c.email);
    if (row) row[2] = CR.origEmail[c.id];
    c.email = CR.origEmail[c.id];
  }
  delete CR.emailLog[c.id];
  CR.events = CR.events.filter(e => e.clientId !== c.id);
  CR.orders = CR.orders.filter(o => o.clientId !== c.id);
  delete CR.registered[c.id];
  if (st !== 'new') CR.registered[c.id] = true;
  /* An imported contact is known before they buy: registered, with their (first) child's details. */
  if (CR.imported[c.id] && st === 'new') CR.registered[c.id] = true;
  /* Account at first use: whether the family has an account (a demo setting) and is logged in on this device. */
  delete CR.loggedIn[c.id];
  if (CR.accountStart[c.id] && st !== 'new') CR.accounts[c.id] = true; else delete CR.accounts[c.id];
  if (st === 'sample') {
    (c.ledger || []).forEach(e => CR.events.push(Object.assign({ clientId: c.id }, e)));
    (c.orders || []).forEach(o => CR.orders.push(Object.assign({ clientId: c.id }, o)));
  }
  /* Registered sample users registered on the day of their first purchase (or a fixed sample day). */
  const bought = (c.ledger || []).find(e => e.type === 'purchase');
  CR.answers[c.id] = (c.galleries || []).map(gid => {
    const g = CR_DATA.galleries.find(x => x.id === gid), parts = g.name.split(', ');
    return { galleryId: gid, date: bought ? bought.date : '2026-04-24', values: { q1: parts[1] + ' ' + parts[0], q2: g.folder } };
  });
};
CR.trimImported = function (id) { if (CR.imported[id]) CR.answers[id] = (CR.answers[id] || []).slice(0, 1); };
CR.seedUsers = function () {
  CR_DATA.clients = CR_DATA.clients.filter(c => !c.isNew);   /* families added during testing go away */
  CR.events = []; CR.orders = []; CR.registered = {}; CR.answers = {};
  CR_DATA.clients.forEach(CR.seedUser);
  Object.keys(CR.imported).forEach(CR.trimImported);
};

/* A family that isn't in the sample data, created when "New family" is opened in the demo control. */
CR.newFamilyCount = 0;
CR.addNewFamily = function () {
  const c = { id: 'c-new-' + (++CR.newFamilyCount), name: 'New family ' + CR.newFamilyCount, email: '', galleries: [], isNew: true };
  CR_DATA.clients.push(c);
  CR.answers[c.id] = [];
  return c;
};

/* What a test user's state is right now, in a few words. */
CR.userStatus = function (id) {
  const s = CR.summary(id);
  if (!CR.registered[id] && !s.face) return { key: 'new', text: 'Not registered' };
  if (CR.imported[id] && !s.face) return { key: 'registered', text: 'Imported contact · no credit' };
  if (!s.face) return { key: 'registered', text: 'Registered · no credit' };
  if (s.balance > 0) return { key: 'credit', text: CR.money(s.balance) + ' credit' + (s.redeemed ? ' left' : '') };
  return { key: 'spent', text: 'Credit spent' };
};
/* The starting states a user can be reset to. "sample" is offered only when it differs from "registered". */
CR.startOptions = function (c) {
  if (c.isNew) return [['new', 'Not registered']];
  const opts = [['new', 'Not registered'], ['registered', 'Registered']];
  if ((c.ledger || []).length) {
    const face = c.ledger.filter(e => e.type === 'purchase').reduce((t, e) => t + e.face, 0);
    const spent = c.ledger.filter(e => e.type === 'redemption').reduce((t, e) => t + e.amount, 0);
    opts.push(['sample', spent >= face ? 'Credit spent' : 'Has ' + CR.money(face - spent) + ' credit']);
  }
  return opts;
};

/* ── Moment in time ── */
CR.MOMENTS = [
  ['before_sale', 'Before credit goes on sale'],
  ['on_sale', 'Credit on sale'],
  ['closed', 'Sales closed, no photos yet'],
  ['photos', 'Photos available']
];
/* Purchase window as days from the shoot date, from the current offer (or the sample window if there's none). */
CR.windowOffsets = function () {
  const w = CR.offer.window, shoot = new Date(CR_DATA.job.shootDate + 'T00:00:00');
  const days = iso => Math.round((new Date(iso + 'T00:00:00') - shoot) / 86400000);
  const opens = w.opens.mode === 'date' && w.opens.date ? days(w.opens.date) : -w.opens.days;
  const closes = w.closes.mode === 'date' && w.closes.date ? days(w.closes.date) : (w.closes.mode === 'after' ? w.closes.days : 0);
  return { opens: opens, closes: closes };
};
CR.setMoment = function (m) {
  CR.moment = m;
  CR.phase = m === 'photos' ? 'photos_available' : 'before_photos';
  CR.changed();
};

/* ── Resets ── */
CR.resetUsers = function () { CR.seedUsers(); CR.changed(); };
CR.resetUser = function (id) { CR.seedUser(CR.client(id)); CR.trimImported(id); CR.changed(); };
CR.setLayout = function (v) { CR.prev.layout = v; CR.changed(); };
CR.setWords = function (v) { CR.prev.words = v; CR.changed(); };
/* How the family arrives: an imported contact (Dana), anonymous registration (today), or registration off. */
CR.setArrival = function (v) {
  CR.prev.arrival = v;
  CR.imported = {};
  if (v === 'imported') CR.imported[CR.IMPORTED_ID] = true;
  if (CR.reg.on !== (v !== 'off')) CR.ph.setRegistration(v !== 'off');
  CR.resetUser(CR.IMPORTED_ID);
};
CR.setUserStart = function (id, st) { CR.userStart[id] = st; CR.resetUser(id); };
CR.setUserAccount = function (id, on) {
  CR.accountStart[id] = on;
  if (on) CR.accounts[id] = true; else { delete CR.accounts[id]; delete CR.loggedIn[id]; }
  CR.changed();
};
CR.resetSettings = function (empty) { CR.seedSettings(empty); CR.changed(); };

/* Notify every screen that reads the ledger. */
CR.onChange = function (fn) { CR.listeners.push(fn); };
CR.changed = function () { CR.listeners.forEach(fn => fn()); };

CR.add = function (event) {
  CR.events.push(Object.assign({ date: CR.todayISO() }, event));
  CR.changed();
};

/* ── Derived figures ── */
CR.client = function (id) { return CR_DATA.clients.find(c => c.id === id); };
CR.eventsFor = function (clientId) { return CR.events.filter(e => e.clientId === clientId); };

CR.summary = function (clientId) {
  const s = { paid: 0, face: 0, redeemed: 0, refunded: 0, adjusted: 0 };
  CR.eventsFor(clientId).forEach(e => {
    if (e.type === 'purchase')   { s.paid += e.paid; s.face += e.face; }
    if (e.type === 'redemption') s.redeemed += e.amount;
    if (e.type === 'refund')     s.refunded += e.amount;
    if (e.type === 'adjustment' && e.orderId) s.redeemed -= e.amount;   /* cancelled order: its credit comes back */
    else if (e.type === 'adjustment') s.adjusted += e.amount;
  });
  s.bonus = s.face - s.paid;
  s.balance = s.face + s.adjusted - s.redeemed - s.refunded;
  return s;
};

CR.balance = function (clientId) { return CR.summary(clientId).balance; };

/* Totals over the test users only. */
CR.ledgerTotals = function () {
  const t = { paid: 0, face: 0, redeemed: 0, outstanding: 0, clientsWithBalance: 0 };
  CR_DATA.clients.forEach(c => {
    const s = CR.summary(c.id);
    t.paid += s.paid; t.face += s.face; t.redeemed += s.redeemed;
    t.outstanding += s.balance;
    if (s.balance > 0) t.clientsWithBalance++;
  });
  return t;
};

/* ── Payout (decided 2026-11-03: proportional) ──
   Each credit dollar spent pays out what the client paid for it: paid ÷ face value over their purchases ($85 for
   $100 → $0.85). Rounded on the running total, so the payouts of a client's redemptions always add up to exactly what
   they paid once the credit is used up. The card part of an order is paid out in full. Paid when the order is
   approved, never at purchase; until then the money is secured funds. */
CR.creditPayouts = function (clientId) {
  const s = CR.summary(clientId), rate = s.face ? s.paid / s.face : 0, out = {};
  const r2 = v => Math.round(v * 100) / 100;
  let cum = 0, paidSoFar = 0;
  const cancelled = id => (CR.orders.find(o => o.id === id) || {}).status === 'cancelled';
  CR.eventsFor(clientId).filter(e => e.type === 'redemption' && !cancelled(e.orderId)).forEach(e => {
    cum += e.amount;
    const target = cum >= s.face ? s.paid : r2(cum * rate);
    out[e.orderId] = r2(target - paidSoFar);
    paidSoFar = target;
  });
  return out;
};
CR.orderPayout = function (o) {
  const credit = o.creditApplied ? (CR.creditPayouts(o.clientId)[o.id] || 0) : 0;
  return { credit: credit, card: o.cardCharged || 0, total: Math.round((credit + (o.cardCharged || 0)) * 100) / 100 };
};
/* Credit paid out so far: the credit part of approved orders. */
CR.paidOutCredit = function () {
  return CR.orders.filter(o => o.status === 'approved').reduce((t, o) => t + CR.orderPayout(o).credit, 0);
};
CR.approve = function (orderId) {
  const o = CR.orders.find(x => x.id === orderId);
  if (!o || o.status === 'approved') return;
  o.status = 'approved';
  o.approvedDate = CR.todayISO();
  CR.changed();
};

/* Job figures: the sample job's totals across all subjects, adjusted by how the test users differ from their sample
   history (CR.baseline). Secured funds are what clients paid for credit minus what has been paid out. */
CR.jobFigures = function () {
  const base = CR_DATA.jobTotalsForDashboard, now = CR.ledgerTotals(), b = CR.baseline;
  const sold = base.creditPaid + now.paid - b.paid;
  const face = base.creditFaceValue + now.face - b.face;
  const redeemed = base.creditRedeemed + now.redeemed - b.redeemed;
  const paidOut = base.paidOut + CR.paidOutCredit();   /* the sample test users have no approved orders */
  return {
    sold: sold,
    face: face,
    redeemed: redeemed,
    outstanding: face - redeemed,
    clientsWithBalance: base.clientsWithCredit + now.clientsWithBalance - b.clientsWithBalance,
    securedFunds: sold - paidOut,
    paidOut: paidOut,
    awaiting: CR.orders.filter(o => o.creditApplied && o.status !== 'approved' && o.status !== 'cancelled').length
  };
};

/* The per-job credit summary (sold, spent, outstanding, who holds a balance) is Phase 5 in the PRD (2026-11-06). The
   prototype keeps it, tagged so nobody counts it in the Phase 1 estimate. Secured funds stay Phase 1: no tag. */
CR.PHASE5 = ' <span class="cr-placeholder cr-phase">[Phase 5]</span>';

/* ── Formatting ── */
CR.money = function (n) {
  const v = Math.round(n * 100) / 100;
  return '$' + (v % 1 ? v.toFixed(2) : String(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/* Sample dates are written against the sample shoot date. Robert's prototype re-anchors Riverside's shoot date to
   today at load, so credits dates keep their distance from the shoot date instead of their calendar date. */
CR.shootDate = function () {
  return displayDateToLocal(JOBS.riverside.shoot) || new Date(CR_DATA.job.shootDate + 'T00:00:00');
};
CR.dateFor = function (iso) {
  const sampleShoot = new Date(CR_DATA.job.shootDate + 'T00:00:00');
  const offset = Math.round((new Date(iso + 'T00:00:00') - sampleShoot) / 86400000);
  const d = CR.shootDate();
  d.setDate(d.getDate() + offset);
  return d;
};
CR.fmtDate = function (iso) {
  if (iso === CR.todayISO()) return 'Today';
  return CR.dateFor(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
/* The demo's "today", as days from the shoot date, set by the moment in time and kept inside or outside the offer's
   purchase window as that moment needs. Robert anchors the shoot itself to the real today, which would otherwise
   leave the window already closed. */
CR.demoOffset = function (moment) {
  const w = CR.windowOffsets(), m = moment || CR.moment;
  if (m === 'before_sale') return w.opens - 3;
  if (m === 'closed') return Math.max(w.closes, 0) + 1;
  if (m === 'photos') return Math.max(7, w.closes + 1);
  return Math.min(Math.max(-10, w.opens + 1), w.closes);   /* on sale: after the sample purchases */
};
CR.demoToday = function (moment) { const d = CR.shootDate(); d.setDate(d.getDate() + CR.demoOffset(moment)); return d; };

/* "Today" in sample-date terms, so events added during the demo sort and format alongside the sample ones. */
CR.todayISO = function () {
  const days = CR.demoOffset();
  const d = new Date(CR_DATA.job.shootDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

/* Start: sample settings; sample totals as the baseline for job figures; test users at their starting states. */
CR.seedSettings(false);
CR.events = []; CR.orders = []; CR.registered = {}; CR.answers = {};
CR_DATA.clients.forEach(c => (c.ledger || []).forEach(e => CR.events.push(Object.assign({ clientId: c.id }, e))));
CR.baseline = CR.ledgerTotals();
CR.seedUsers();
