/* Credits in Robert's other job screens: Overview, Reports › Overview, Contacts, Deadlines & Automation, and Needs
   attention on the Jobs list. Credits replace package pre-orders, so every pre-order figure and label becomes its
   credit equivalent. Riverside shows live credit figures; other jobs keep Robert's numbers in credit terms. */
CR.jv = {};
CR.jv.set = function (id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; };
CR.jv.isRiverside = function () { return currentJob && currentJob.key === 'riverside'; };

/* Orders paid with credit across the job: the test users' orders plus the sample buyers' (as in Clients). */
CR.jv.creditOrders = function () {
  const rows = CR.ph.balanceRows();
  return {
    count: rows.reduce((t, r) => t + r.orders.length, 0),
    card: CR.orders.reduce((t, o) => t + (o.creditApplied ? o.cardCharged || 0 : 0), 0)
  };
};

/* ── Overview tab and Reports › Overview ── */
const crRobertComputeAll = computeAll;
computeAll = function (j) {
  crRobertComputeAll(j);
  CR.jv.paintFigures(j);
};

CR.jv.paintFigures = function (j) {
  j = j || currentJob;
  if (!j) return;
  const card = document.querySelector('.summary-card[onclick*="tab-preorders"] .summary-card-title');
  if (card) card.textContent = 'Credits';
  if (!CR.jv.isRiverside()) {
    /* Other jobs: Robert's figures, in credit terms. */
    const pre = ORDERS.filter(o => o.pre), preSum = pre.reduce((s, o) => s + o.amt, 0);
    CR.jv.set('ov-orders-sub', ORDERS.length ? pre.length + ' paid with credit' : 'no orders yet');
    CR.jv.set('ov-revenue-sub', ORDERS.length ? fmt$(preSum) + ' paid with credit' : 'set up credit to sell early');
    CR.jv.set('rp-orders-sub', pre.length + ' paid with credit · ' + (ORDERS.length - pre.length) + ' card only');
    if (j.po && j.po.setup) CR.jv.set('sc-pre', fmt$(preSum) + ' credit · ' + pre.length + ' orders');
    CR.jv.set('rp-conv-sub', String(j.conv[1]).replace('pre-ordered', 'bought credit'));
    CR.jv.set('cr-rep-credit', '');
    return;
  }
  const f = CR.jobFigures(), co = CR.jv.creditOrders(), live = CR.offer.status === 'published';
  const regs = CR.ph.registrationRows().length;
  /* Riverside has no gallery sales yet: every order is paid with credit (plus any card top-up). */
  CR.jv.set('ov-orders', String(co.count));
  CR.jv.set('ov-orders-sub', co.count ? 'all paid with credit' : 'no orders yet');
  CR.jv.set('ov-revenue', CR.money(f.redeemed + co.card));
  CR.jv.set('ov-revenue-sub', CR.money(f.redeemed) + ' paid with credit' + (co.card ? ' · ' + CR.money(co.card) + ' card' : ''));
  CR.jv.set('sc-pre', live ? CR.money(f.sold) + ' sold · ' + CR.money(f.outstanding) + ' outstanding' + CR.PHASE5 : 'No credit offer yet');
  CR.jv.set('sc-pre-sub', regs + ' of ' + JOBS.riverside.po.regTotal + ' subjects registered');
  CR.jv.set('rp-orders', String(co.count));
  CR.jv.set('rp-orders-sub', co.count + ' paid with credit · 0 card only');
  CR.jv.set('rp-revenue', CR.money(f.redeemed + co.card));
  CR.jv.set('rp-rev-sub', 'Credit spent ' + CR.money(f.redeemed) + ' · credit sold counts once it’s spent');
  const fams = CR.ph.familyRows();
  CR.jv.set('rp-conv-sub', fams.filter(x => x.credit).length + ' of ' + fams.length + ' registered families bought credit');
  const sub = [...document.querySelectorAll('#rep-overview .chart-sub')].find(x => /Pre-orders begin|Credit on sale/.test(x.textContent));
  if (sub) sub.textContent = 'Credit on sale ' + CR.ph.fmtD(CR.ph.opensDate(CR.offer.window)) + ' · photos available ' + JOBS.riverside.deadline;
  CR.jv.paintReportStrip(f, live);
};

/* A credit strip at the top of Reports › Overview on the credits job. */
CR.jv.paintReportStrip = function (f, live) {
  let el = document.getElementById('cr-rep-credit');
  const pane = document.getElementById('rep-overview');
  if (!el && pane) { el = document.createElement('div'); el.id = 'cr-rep-credit'; pane.insertBefore(el, pane.firstChild); }
  if (!el) return;
  if (!live) { el.innerHTML = ''; return; }
  const tile = (label, value, sub) => '<div class="stat-tile"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div><div class="stat-delta flat">' + sub + '</div></div>';
  el.innerHTML = '<div class="cr-rep-credit-head"><span>Credit' + CR.PHASE5 + '</span><a class="gallery-name-link" onclick="switchJobTabById(\'tab-preorders\')">Selling &amp; Registration</a></div>' +
    '<div class="overview-stats" style="grid-template-columns: repeat(5, 1fr); margin-bottom:16px;">' +
      tile('Credit sold' + CR.PHASE5, CR.money(f.sold), CR.money(f.face) + ' to spend, with bonuses') +
      tile('Credit spent' + CR.PHASE5, CR.money(f.redeemed), f.awaiting + ' orders awaiting approval') +
      tile('Outstanding' + CR.PHASE5, CR.money(f.outstanding), f.clientsWithBalance + ' clients holding a balance') +
      tile('Secured funds', CR.money(f.securedFunds), 'held, not yet paid out') +
      tile('Paid out', CR.money(f.paidOut), 'on approved orders') +
    '</div>';
};

CR.onChange(function () { if (CR.jv.isRiverside()) CR.jv.paintFigures(); });

/* Robert's Orders table (other jobs; hidden on Riverside): his package pre-orders read as orders paid with credit. */
const crJvRenderOrders = renderOrders;
renderOrders = function () {
  crJvRenderOrders();
  document.querySelectorAll('#orders-tbody .chip-orange').forEach(c => { if (c.textContent === 'Pre-order') c.textContent = 'Credit'; });
  const opt = document.querySelector('#fl-date option[value="pre"]');
  if (opt) opt.textContent = 'Paid with credit';
};

/* ── Contacts tab: credit status per contact, and a "Has a credit balance" filter ──
   On Riverside the Reg Info chip comes from the family's registration and ledger (matched by email); contacts who
   haven't registered keep Robert's chip (Imported, Primary Contact). Clicking a credit chip opens that family in
   Selling & Registration › Clients. Other jobs: his "Pre-ordered" chip reads "Bought credit". */
CR.jv.contactsFilter = 'all';
const crRobertBuildContacts = buildContacts;
buildContacts = function (j) {
  crRobertBuildContacts(j);
  CR.jv.paintContacts(j);
};
CR.jv.contactStatus = function (email) {
  const f = CR.ph.familyRows().find(x => x.live && x.email && x.email.toLowerCase() === String(email).toLowerCase());
  if (!f) {
    /* A test user who hasn't registered (yet) in the demo. */
    const c = CR_DATA.clients.find(x => x.email.toLowerCase() === String(email).toLowerCase());
    return c ? { key: 'none', html: '<span class="chip chip-gray">Not registered</span>' } : null;
  }
  if (!f.credit) return { key: 'reg', html: '<span class="chip chip-teal">Registered</span>', family: f };
  return f.credit.left > 0
    ? { key: 'credit', html: '<button class="chip chip-teal cr-chip-btn" onclick="CR.jv.openClient(\'' + f.key + '\')">' + CR.money(f.credit.left) + ' credit left</button>', family: f }
    : { key: 'used', html: '<button class="chip chip-gray cr-chip-btn" onclick="CR.jv.openClient(\'' + f.key + '\')">Credit used up</button>', family: f };
};
CR.jv.paintContacts = function (j) {
  j = j || currentJob;
  const tb = document.getElementById('contacts-tbody');
  if (!tb || !j) return;
  let bar = document.getElementById('cr-contacts-filter');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'cr-contacts-filter';
    const wrap = document.querySelector('#tab-contacts .gallery-table-wrap');
    if (wrap) wrap.parentNode.insertBefore(bar, wrap);
  }
  if (j.key !== 'riverside') {
    bar.innerHTML = '';
    tb.querySelectorAll('.chip').forEach(c => { if (c.textContent.trim() === 'Pre-ordered') c.innerHTML = c.innerHTML.replace('Pre-ordered', 'Bought credit'); });
    return;
  }
  const rows = [...tb.querySelectorAll('tr')];
  let withBalance = 0;
  rows.forEach((tr, i) => {
    const c = j.contacts[i];
    if (!c) return;
    const st = CR.jv.contactStatus(c[2]);
    if (st) tr.children[6].innerHTML = st.html;
    if (st && st.key === 'credit') withBalance++;
    tr.hidden = CR.jv.contactsFilter === 'credit' && !(st && st.key === 'credit');
  });
  bar.innerHTML = '<div class="cr-seg">' +
    '<button class="' + (CR.jv.contactsFilter === 'all' ? 'active' : '') + '" onclick="CR.jv.setContactsFilter(\'all\')">All contacts</button>' +
    '<button class="' + (CR.jv.contactsFilter === 'credit' ? 'active' : '') + '" onclick="CR.jv.setContactsFilter(\'credit\')">Has a credit balance <span class="cr-muted">' + withBalance + '</span>' + CR.PHASE5 + '</button>' +
  '</div>';
};
CR.jv.setContactsFilter = function (f) { CR.jv.contactsFilter = f; CR.jv.paintContacts(); };
/* From a contact to the same family in Clients › Credit, opened. */
CR.jv.openClient = function (key) {
  const f = CR.ph.familyRows().find(x => x.key === key);
  switchJobTabById('tab-preorders');
  CR.ph.fam.view = f && f.credit ? 'credit' : 'reg';
  CR.ph.fam.filter.credit = 'all';
  CR.ph.fam.search = f ? f.parent : '';
  CR.ph.fam.open = key;
  CR.ph.render();
  const el = document.getElementById('cr-clients');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
CR.onChange(function () { if (CR.jv.isRiverside()) CR.jv.paintContacts(); });

/* ── Settings › Deadlines & Automation ──
   Robert's preorder panel becomes the credit panel: "Credit Automation" (announcement and reminders before credit
   sales close) with the "Credit sales close" date read-only from the credit offer, so there's one place for that date.
   A new "Unspent credit reminder" panel emails families who still hold a balance once photos are available; its send
   date is an open decision. His other panels are unchanged. */
DL_DEFS.preorder.title = 'Credit sales close';
DL_DEFS.preorder.desc = 'Clients can buy credit until this date. It’s set in the credit offer, so it’s the same everywhere.';
DL_PANELS.preorder.title = 'Credit Automation';
DL_PANELS.preorder.desc = 'The system acts for you — it emails your customers automatically, announcing that credit is on sale and reminding them before credit sales close.';
CR.jv.reminder = { on: false };

CR.jv.creditWords = function (root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const swaps = [[/preordering is open and gives them a link to place an order/g, 'credit is on sale and gives them a link to buy it'],
    [/preordering/g, 'buying credit'], [/Preorder Reminder/g, 'Credit Reminder'], [/Preorder Last Call/g, 'Credit Last Call'],
    [/the preorder window is closing/g, 'credit sales are closing'], [/Preorder announcement/g, 'Credit on sale announcement'],
    [/Preorder deadline/g, 'Credit sales close date'], [/Enable preorder in the Ecommerce step/g, 'Turn on credit sales in Selling & Registration'],
    [/preorder isn’t turned on/g, 'credit sales aren’t turned on'], [/Preorder/g, 'Credit sales'], [/preorder/g, 'credit sales']];
  let n;
  while ((n = walker.nextNode())) { let t = n.nodeValue; swaps.forEach(s => { t = t.replace(s[0], s[1]); }); if (t !== n.nodeValue) n.nodeValue = t; }
};

const crRobertRenderDeadlines = renderDeadlines;
renderDeadlines = function () {
  const riverside = CR.set.isRiverside();
  if (riverside && CR.offer.status !== 'empty') {
    /* His deadline follows the credit offer's close date, so his ordering checks still work. */
    const c = CR.ph.closesDate(CR.offer.window);
    if (c) dlState.preorder = Object.assign({}, dlState.preorder, { mode: 'specific', date: c.getFullYear() + '-' + String(c.getMonth() + 1).padStart(2, '0') + '-' + String(c.getDate()).padStart(2, '0'), time: '23:59' });
  }
  crRobertRenderDeadlines();
  const mount = document.getElementById(dlMountId());
  if (!mount) return;
  const block = mount.querySelector('.dl-block');   /* his first panel is the preorder (now credit) panel */
  CR.jv.creditWords(block);
  CR.jv.creditWords(document.getElementById('dl-order-warn'));
  if (!riverside) return;
  const field = block && [...block.querySelectorAll('.dl-section')].find(sec => /Credit sales close/.test((sec.querySelector('.dl-sec-label') || {}).textContent || ''));
  if (field) {
    const c = CR.offer.status !== 'empty' ? CR.ph.closesDate(CR.offer.window) : null;
    field.innerHTML = '<div class="dl-sec-label">Credit sales close</div>' +
      '<div class="dl-sec-desc">' + DL_DEFS.preorder.desc + '</div>' +
      '<div class="dl-resolved">' + (c ? 'Closes <b>' + CR.ph.fmtD(c) + '</b> · ' + CR.jv.closesRule(CR.offer.window) : 'No credit offer yet') +
        ' · <a class="gallery-name-link" onclick="CR.ph.startEdit(3); switchJobTabById(\'tab-preorders\')">Change in Selling &amp; Registration</a></div>';
  }
  mount.insertAdjacentHTML('beforeend', CR.jv.reminderPanelHTML());
};

CR.jv.closesRule = function (w) {
  return w.closes.mode === 'shoot' ? 'on the shoot date' : w.closes.mode === 'after' ? w.closes.days + ' days after the shoot' : 'on a set date';
};
CR.jv.reminderPanelHTML = function () {
  const on = CR.jv.reminder.on;
  return '<div class="dl-block' + (on ? '' : ' collapsed') + '" id="cr-dl-reminder">' +
    '<div class="dl-panel-head"><div style="min-width:0; flex:1;">' +
      '<div class="dl-title">Unspent Credit Reminder</div>' +
      '<div class="dl-desc">The system acts for you — it emails families who still hold a credit balance once photos are available, with their balance and a link to spend it.</div>' +
    '</div><button class="toggle' + (on ? ' on' : '') + '" onclick="CR.jv.toggleReminder()"></button></div>' +
    (on ? '<div class="dl-panel-body"><div class="dl-section">' +
      '<div class="dl-sec-label">Send</div>' +
      '<div class="dl-sec-desc">To every family with a balance above $0. Families who have used their credit don’t get it.</div>' +
      '<div class="dl-resolved">Sends <span class="cr-placeholder">[send date]</span> · Email only · ' + CR.jobFigures().clientsWithBalance + ' families hold a balance today</div>' +
      '<button class="btn btn-ghost-sm" style="margin-top:10px;" onclick="CR.jv.previewReminder()"><i class="fa-regular fa-eye"></i> Preview the email</button>' +
    '</div></div>' : '') +
  '</div>';
};
CR.jv.toggleReminder = function () { CR.jv.reminder.on = !CR.jv.reminder.on; renderDeadlines(); };
/* Preview with a test user who holds a balance. */
CR.jv.previewReminder = function () {
  const c = CR_DATA.clients.find(x => CR.registered[x.id] && CR.balance(x.id) > 0) || CR_DATA.clients[1];
  CR.cl.open(c.id, 'emailReminder');
};

/* ── Needs attention on the Jobs list: credit items for the credits job, kept up to date ── */
CR.jv.paintAttention = function () {
  const card = document.querySelector('.attention-card');
  if (!card) return;
  let box = document.getElementById('cr-attention');
  if (!box) {
    box = document.createElement('div');
    box.id = 'cr-attention';
    card.querySelector('.attention-title').insertAdjacentElement('afterend', box);
    /* Robert's pre-registration row: his link text said "View pre-orders". */
    card.querySelectorAll('.attention-row a').forEach(a => { if (a.textContent === 'View pre-orders') a.textContent = 'View registrations'; });
  }
  if (CR.offer.status !== 'published') { box.innerHTML = ''; return; }
  const f = CR.jobFigures(), job = 'Riverside Youth Soccer';
  const row = (icon, text, link, fn) => '<div class="attention-row"><i class="fa-solid ' + icon + '"></i>' + text +
    '<span class="att-job">' + job + '</span><a onclick="' + fn + '">' + link + '</a></div>';
  box.innerHTML =
    CR.rep.pendingShortfall().map(o => row('fa-triangle-exclamation', 'Order #' + o.id.replace('o-', '') + ' costs ' + CR.money(o.shortfall) + ' more than the credit held for it', 'Decide', 'openJob(\'riverside\'); CR.rep.open()')).join('') +
    (f.awaiting ? row('fa-clipboard-check', f.awaiting + (f.awaiting === 1 ? ' order' : ' orders') + ' paid with credit awaiting approval', 'Review orders', 'openJob(\'riverside\'); CR.rep.open()') : '') +
    (f.clientsWithBalance ? row('fa-wallet', f.clientsWithBalance + ' clients still hold ' + CR.money(f.outstanding) + ' of credit' + CR.PHASE5, 'See clients', 'openJob(\'riverside\'); switchJobTabById(\'tab-preorders\'); CR.ph.showClients(\'credit\')') : '');
};
CR.onChange(CR.jv.paintAttention);
CR.jv.paintAttention();
