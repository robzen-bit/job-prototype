/* Photographer side of credits. This step: the Credits tab (credit offer setup, margin view, registration link).
   Robert's Pre-Orders markup stays in the tab, hidden, so his buildPreorders() keeps writing to its ids without errors. */
CR.ph = { mode: 'view', draft: null, job: null };

CR.ph.mount = function () {
  const panel = document.getElementById('tab-preorders');
  const robert = document.createElement('div');
  robert.id = 'cr-robert-preorders';
  robert.hidden = true;
  while (panel.firstChild) robert.appendChild(panel.firstChild);
  panel.appendChild(robert);
  const mine = document.createElement('div');
  mine.id = 'cr-credit-tab';
  panel.appendChild(mine);
  /* Buttons don't take focus, so a field being edited keeps it and the click isn't lost to a re-render on blur. */
  mine.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  CR.onChange(() => CR.ph.render());
};

/* Robert's openJob() calls buildPreorders(j); credits render after it. */
const crRobertBuildPreorders = buildPreorders;
buildPreorders = function (j) {
  crRobertBuildPreorders(j);
  CR.ph.job = j;
  CR.ph.mode = 'view';
  CR.ph.draft = null;
  CR.ph.regDraft = null;
  CR.ph.render();
};

CR.ph.isRiverside = function () { return CR.ph.job && CR.ph.job.key === 'riverside'; };

/* ── Lookups and margin maths ── */
CR.ph.item = function (id) { return CR_DATA.priceList.items.find(i => i.id === id); };
CR.ph.pkg = function (id) { return CR_DATA.priceList.packages.find(p => p.id === id); };
CR.ph.pkgCost = function (p) { return p.contents.reduce((s, id) => s + CR.ph.item(id).labCost, 0); };
/* Example products: any package or single item in the job's price list. Packages first, then single items. */
CR.ph.products = function () {
  /* Packages carry their description and contents from the price list, so they read as on a paper handout. */
  return CR_DATA.priceList.packages.map(p => ({ id: p.id, kind: 'package', name: p.name, price: p.price, cost: CR.ph.pkgCost(p), sub: CR.ph.pkgContents(p), desc: p.description || '' }))
    .concat(CR_DATA.priceList.items.map(i => ({ id: i.id, kind: 'item', name: i.name, price: i.price, cost: i.labCost, sub: 'Single product' })));
};
CR.ph.product = function (id) { return CR.ph.products().find(p => p.id === id); };
CR.ph.examplesOf = function (o) { return CR.ph.products().filter(p => o.examples.indexOf(p.id) >= 0); };

/* Each example product shows the photographer's own image if they uploaded one, otherwise our default: a simple
   drawing of the product type. The real build needs proper default product images. */
CR.ph.photoSVG = function (x, y, w, h) {
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="1.5" style="fill:var(--surface);stroke:var(--text-3);stroke-width:.75"/>' +
    '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (w - 4) + '" height="' + (h - 4) + '" style="fill:var(--teal-soft)"/>' +
    '<circle cx="' + (x + w * 0.68) + '" cy="' + (y + h * 0.32) + '" r="' + Math.max(1.5, w * 0.1) + '" style="fill:var(--orange);opacity:.75"/>' +
    '<path d="M' + (x + 2) + ' ' + (y + h - 2) + ' L' + (x + w * 0.38) + ' ' + (y + h * 0.55) + ' L' + (x + w * 0.62) + ' ' + (y + h * 0.75) + ' L' + (x + w - 2) + ' ' + (y + h * 0.5) + ' L' + (x + w - 2) + ' ' + (y + h - 2) + ' Z" style="fill:var(--teal);opacity:.6"/>';
};
CR.ph.defaultImageSVG = function (id) {
  const p = CR.ph.photoSVG, kind = CR.ph.product(id).kind;
  let art;
  if (kind === 'package') art = p(20, 10, 28, 36) + p(14, 15, 28, 36) + p(8, 20, 28, 36);
  else if (id === 'i-digital') art = '<rect x="18" y="6" width="28" height="52" rx="5" style="fill:var(--surface);stroke:var(--text-3)"/>' + p(21, 12, 22, 34) +
    '<circle cx="32" cy="52" r="2" style="fill:var(--text-3)"/>';
  else if (id === 'i-wallets') art = p(10, 8, 20, 22) + p(34, 8, 20, 22) + p(10, 34, 20, 22) + p(34, 34, 20, 22);
  else if (id === 'i-magnet') art = '<rect x="12" y="12" width="40" height="40" rx="9" style="fill:var(--surface);stroke:var(--text-3)"/>' + p(17, 17, 30, 30);
  else if (id === 'i-memory-mate') art = '<rect x="4" y="12" width="56" height="40" rx="2" style="fill:var(--surface);stroke:var(--text-3)"/>' + p(8, 16, 22, 32) + p(34, 16, 22, 32);
  else if (id === 'i-5x7') art = p(18, 12, 28, 40);
  else art = p(14, 8, 36, 48);
  return '<svg viewBox="0 0 64 64" aria-hidden="true">' + art + '</svg>';
};
CR.ph.thumbHTML = function (id, o) {
  const custom = o.exampleImages && o.exampleImages[id];
  return custom ? '<img class="cr-thumb" src="' + custom + '" alt="">' : '<span class="cr-thumb">' + CR.ph.defaultImageSVG(id) + '</span>';
};

CR.ph.pkgContents = function (p) {
  const counts = {};
  p.contents.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  return Object.keys(counts).map(id => (counts[id] > 1 ? counts[id] + ' × ' : '') + CR.ph.item(id).name).join(', ');
};
/* Credit bought with a bonus brings in paid/face of each dollar spent. Processing fee and commission are taken from
   what the client actually paid, then the lab cost. */
/* Processing fee (ADO 85123, 2026-11-14): estimated as the price list does it, a high estimate that assumes a
   single-item order: the rate on the selling price. The real build uses the connected processor's regional rate, or
   the highest standard rate the plan allows. The flat per-transaction fee is [flat fee] (no amount yet, not included).
   Commission (open, [sample rate]) comes out of what the client paid for the item, so it falls with a bonus. */
CR.ph.procFee = function (price) { return price * CR_DATA.fees.processingPct / 100; };
CR.ph.commission = function (price, a) { return price * (a ? a.paid / a.face : 1) * CR_DATA.fees.commissionPct / 100; };
CR.ph.margin = function (price, cost, a) { return price * (a ? a.paid / a.face : 1) - cost - CR.ph.procFee(price) - CR.ph.commission(price, a); };
CR.ph.validAmount = function (a) { return a.paid > 0 && a.face >= a.paid; };
CR.ph.bonusAmounts = function (o) { return o.amounts.filter(a => CR.ph.validAmount(a) && a.face > a.paid); };

/* ── Dates ── */
CR.ph.shootPlus = function (days) { const d = CR.shootDate(); d.setDate(d.getDate() + days); return d; };
CR.ph.fmtD = function (d) { return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; };
CR.ph.isoDate = function (iso) { return iso ? new Date(iso + 'T00:00:00') : null; };
CR.ph.opensDate = function (w) { return w.opens.mode === 'date' ? CR.ph.isoDate(w.opens.date) : CR.ph.shootPlus(-w.opens.days); };
CR.ph.closesDate = function (w) {
  if (w.closes.mode === 'date') return CR.ph.isoDate(w.closes.date);
  return CR.ph.shootPlus(w.closes.mode === 'after' ? w.closes.days : 0);
};
CR.ph.windowText = function (w) {
  const opens = w.opens.mode === 'date' ? 'Opens ' + CR.ph.fmtD(CR.ph.opensDate(w))
    : 'Opens ' + w.opens.days + ' days before the shoot (' + CR.ph.fmtD(CR.ph.opensDate(w)) + ')';
  const closes = w.closes.mode === 'shoot' ? 'closes on the shoot date (' + CR.ph.fmtD(CR.ph.closesDate(w)) + ')'
    : w.closes.mode === 'after' ? 'closes ' + w.closes.days + ' days after the shoot (' + CR.ph.fmtD(CR.ph.closesDate(w)) + ')'
    : 'closes ' + CR.ph.fmtD(CR.ph.closesDate(w));
  return opens + ', ' + closes;
};

/* ── Render ── */
CR.ph.render = function () {
  const el = document.getElementById('cr-credit-tab');
  if (!el || !CR.ph.job) return;
  const j = CR.ph.job, o = CR.offer, riverside = CR.ph.isRiverside();
  const status = riverside ? o.status : 'empty';
  el.innerHTML =
    '<div class="tab-section-head">' +
      '<div>' +
        '<div class="tab-section-title">Selling &amp; Registration</div>' +
        '<div class="tab-section-sub">What clients can buy, the credit offer, and registration for this job, in one place.</div>' +
      '</div>' +
      '<button class="btn btn-ghost" onclick="' + (riverside ? 'CR.cl.openPreview(\'register\', CR.ph.draft || CR.offer)' : 'toast(\'Opening the registration page preview…\')') + '"><i class="fa-regular fa-eye"></i> Preview Registration Page</button>' +
    '</div>' +
    CR.ph.tilesHTML(j, status) +
    (riverside ? CR.ph.timelineCardHTML() : '') +
    '<div class="preorder-grid">' +
      CR.ph.linkCardHTML(j, status) +
      '<div>' +
        (CR.set ? CR.set.sellingCardHTML() : '') +
        (riverside ? (CR.ph.mode === 'edit' ? CR.ph.editHTML() : CR.ph.offerHTML()) : CR.ph.otherJobHTML()) +
        (riverside && CR.offer.status !== 'empty' ? CR.ph.emailsCardHTML() : '') +
        (riverside ? CR.ph.registrationCardHTML() : '') +
        (riverside && (CR.offer.status === 'published' || CR.ph.registrationRows().length) ? CR.ph.clientsCardHTML() : '') +
      '</div>' +
    '</div>';
  const robertQR = document.getElementById('qr-svg'), qr = document.getElementById('cr-qr-svg');
  if (robertQR && qr) qr.innerHTML = robertQR.innerHTML;
};

CR.ph.tilesHTML = function (j, status) {
  const po = j.po || {};
  const reg = CR.ph.isRiverside() ? '<a class="cr-tile-link" onclick="CR.ph.showClients(\'reg\')">' + CR.ph.registrationRows().length + '</a> <span class="cr-tile-of">/ ' + po.regTotal + '</span>'
    : po.setup ? po.reg + ' <span class="cr-tile-of">/ ' + po.regTotal + '</span>' : '—';
  const live = status === 'published';
  const f = CR.jobFigures();
  const tile = (label, value, sub) =>
    '<div class="stat-tile"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div>' +
    '<div class="stat-delta flat">' + sub + '</div></div>';
  /* Credit dashboard: sold, redeemed, outstanding, and secured funds (held against credit sales, not yet paid out). */
  const toOrders = '<a class="gallery-name-link" onclick="CR.rep.open()">';
  return '<div class="overview-stats" style="grid-template-columns: repeat(5, 1fr);">' +
    tile('Subjects registered', reg, po.setup ? po.regSub : 'registration not set up') +
    tile('Credit sold' + CR.PHASE5, live ? CR.money(f.sold) : '—', live ? CR.money(f.face) + ' to spend, with bonuses' : 'no credit offer published') +
    tile('Credit redeemed' + CR.PHASE5, live ? CR.money(f.redeemed) : '—', live ? (f.awaiting ? toOrders + f.awaiting + ' order' + (f.awaiting === 1 ? '' : 's') + ' awaiting approval</a>' : toOrders + 'Orders paid with credit</a>') : '—') +
    tile('Outstanding balance' + CR.PHASE5, live ? CR.money(f.outstanding) : '—', live ? '<a class="gallery-name-link" onclick="CR.ph.showClients(\'credit\')">' + f.clientsWithBalance + ' clients holding a balance</a>' : '—') +
    tile('Secured funds', live ? CR.money(f.securedFunds) : '—', live ? CR.money(f.paidOut) + ' paid out on approval' : '—') +
  '</div>';
};

CR.ph.linkCardHTML = function (j, status) {
  const po = j.po || {};
  const regOn = CR.ph.isRiverside() ? CR.reg.on : !!po.open;
  const shows = status === 'published' && CR.settings.creditSalesOn
    ? '<span class="chip chip-teal">Shows the credit offer</span>'
    : '<span class="chip chip-gray">Registration only</span>';
  return '<div class="link-card">' +
    '<div class="chart-title">Registration Link</div>' +
    '<div class="chart-sub" style="margin-bottom:0;">Share with families or print the QR code on flyers.</div>' +
    '<div class="qr-box"><svg id="cr-qr-svg" viewBox="0 0 29 29" width="100%" height="100%"></svg></div>' +
    '<div class="link-pill"><span>' + (po.link || 'zenfol.io/r/…') + '</span>' +
      '<button class="copy-btn" onclick="toast(\'Registration link copied to clipboard\')">Copy</button></div>' +
    '<div class="cr-link-shows">' + shows + '</div>' +
    /* The switch says whether the job uses registration (on/off); the chip says whether it's open right now. */
    '<div class="reg-status-row"><div><div class="reg-status-label">Registration</div>' +
      '<div class="reg-status-sub" id="cr-link-reg-sub">' + (CR.ph.isRiverside() ? CR.ph.regStatusHTML() : 'Families register and get matched to their gallery') + '</div></div>' +
      CR.ph.regSwitchHTML(regOn) + '</div>' +
  '</div>';
};

CR.ph.toggleRegistration = function () {
  if (!CR.ph.isRiverside()) { toast('Registration is set up on the Riverside job in this prototype'); return; }
  CR.ph.setRegistration(!CR.reg.on);
};
CR.ph.setRegistration = function (on) {
  CR.reg.on = on;
  /* Mandatory credit needs registration: turning registration off makes buying credit optional. */
  if (!CR.reg.on && CR.offer.registration.purchaseRequired) {
    CR.offer.registration.purchaseRequired = false;
    if (CR.ph.draft) CR.ph.draft.registration.purchaseRequired = false;
    toast('Registration off · buying credit is now optional');
  }
  CR.changed();
};

CR.ph.otherJobHTML = function () {
  return '<div class="detail-card cr-offer-empty">' +
    '<div class="cr-empty-icon"><i class="fa-solid fa-ticket"></i></div>' +
    '<div class="cr-empty-title">No credit offer on this job</div>' +
    '<div class="cr-empty-text">In this prototype the credit offer is set up on the Riverside Youth Soccer job.</div>' +
    '<button class="btn btn-ghost" onclick="openJob(\'riverside\'); switchJobTabById(\'tab-preorders\')">Open Riverside</button>' +
  '</div>';
};

/* Card head shared by every offer state: "Credits" section title, status, the [name pending] tag, and the credit
   sales switch (also in the Selling card). */
CR.ph.offerHeadHTML = function (actions) {
  const st = CR.offer.status;
  const chip = st === 'published' ? ' <span class="chip chip-teal">Published</span>' : st === 'draft' ? ' <span class="chip chip-gray">Draft</span>' : '';
  return '<div class="cr-offer-head">' +
    '<div><div class="detail-card-header" style="margin:0;">Credits <span class="cr-placeholder">[name pending]</span>' + chip + '</div>' +
    '<div class="cr-offer-sub">Clients buy credit, not a package, and choose what to buy once photos exist.</div></div>' +
    '<div class="cr-offer-head-right">' + (actions || '') +
      /* Same setting as "Credit sales" in the Selling card: both switches always show the same state. */
      '<button class="toggle' + (CR.settings.creditSalesOn ? ' on' : '') + '" onclick="CR.set.toggleCredit()" aria-label="Credit sales" title="Credit sales"></button>' +
    '</div>' +
  '</div>';
};

/* ── Overview: every setting in one card, each row with an Edit link that opens its step ── */
CR.ph.STEPS = [
  [1, 'Amounts & bonuses'],
  [2, 'What clients see'],
  [3, 'When clients buy'],
  [4, 'Review & publish']
];
CR.ph.LAST = CR.ph.STEPS.length;

CR.ph.offerHTML = function () {
  const o = CR.offer;
  if (o.status === 'empty') {
    return '<div class="detail-card">' + CR.ph.offerHeadHTML() +
      '<div class="cr-offer-empty">' +
        '<div class="cr-empty-icon"><i class="fa-solid fa-ticket"></i></div>' +
        '<div class="cr-empty-title">Sell credit before picture day</div>' +
        '<div class="cr-empty-text">Families pay now and spend the credit on anything in ' + CR_DATA.priceList.name +
          ' once photos are ready. Add a bonus to reward buying early. Setup takes five short steps.</div>' +
        '<button class="btn btn-brand" onclick="CR.ph.startEdit(1)"><i class="fa-solid fa-plus"></i> Set up credit offer</button>' +
      '</div></div>';
  }
  const published = o.status === 'published';
  const actions = '<button class="btn btn-ghost-sm" onclick="CR.ph.showClients(\'credit\')"><i class="fa-solid fa-users"></i> Who bought credit' + CR.PHASE5 + '</button>' +
    '<button class="btn btn-ghost" onclick="CR.cl.openPreview(\'offer\', CR.offer)"><i class="fa-regular fa-eye"></i> Preview what clients see</button>' +
    (published ? '' : '<button class="btn btn-brand" onclick="CR.ph.publish(CR.offer)">Publish offer</button>');
  return '<div class="detail-card">' + CR.ph.offerHeadHTML(actions) +
    (CR.settings.creditSalesOn ? '' : '<div class="cr-note"><i class="fa-solid fa-circle-info"></i> Credit sales are off. Nobody can buy credit; clients who already bought can still spend theirs.</div>') +
    CR.ph.marginAlertHTML(o, 'CR.ph.fixMargin()') +
    CR.ph.summaryHTML(CR.ph.current(), n => 'CR.ph.startEdit(' + n + ')') +
  '</div>';
};

CR.ph.current = function () { return CR.offer; };

/* How credit is paid out (decided 2026-11-03): proportional, on approval. */
CR.ph.payoutText = function (d) {
  const a = d.amounts.filter(x => CR.ph.validAmount(x) && x.face > x.paid).sort((x, y) => y.face - x.face)[0];
  return 'Paid when an order is approved. Each credit dollar spent pays out what the client paid for it' +
    (a ? ': ' + CR.money(a.paid / a.face) + ' for Pay ' + CR.money(a.paid) + ' → Spend ' + CR.money(a.face) : '') +
    '. Card payments are paid out in full. Until then, credit sales are secured funds.';
};

CR.ph.summaryHTML = function (d, onEdit) {
  const amounts = d.amounts.filter(CR.ph.validAmount).map(a =>
    '<div class="cr-amount-chip"><span>Pay <b>' + CR.money(a.paid) + '</b></span><i class="fa-solid fa-arrow-right"></i><span>Spend <b>' + CR.money(a.face) + '</b></span>' +
    (a.face > a.paid ? '<span class="cr-bonus">+' + CR.money(a.face - a.paid) + ' bonus</span>' : '') + '</div>').join('') || '<span class="cr-muted">No amounts yet</span>';
  const ex = CR.ph.examplesOf(d);
  const examples = ex.length ? '<div class="cr-sum-examples">' + ex.map(p =>
    '<span class="cr-sum-ex">' + CR.ph.thumbHTML(p.id, d) + '<span>' + p.name + ' <b>' + CR.money(p.price) + '</b></span></span>').join('') + '</div>'
    : '<span class="cr-muted">No example products</span>';
  const w = d.window;
  const window = '<b>' + CR.ph.fmtD(CR.ph.opensDate(w)) + ' – ' + CR.ph.fmtD(CR.ph.closesDate(w)) + '</b><div class="cr-muted">' + CR.ph.windowText(w) + '</div>' +
    (CR.reg.on ? '<div>Buying credit at registration: <b>' + (d.registration.purchaseRequired ? 'mandatory' : 'optional') + '</b></div>'
      : '<div>Buying credit: <b>optional</b> <span class="cr-muted">· registration is off, so families buy from the gallery link with their name and email</span></div>') +
    '<div>Who can pre-order: <b>' + CR.ph.audienceText(d) + '</b> <span class="cr-muted">· the primary contact receives the credit</span></div>';
  const row = (n, label, body) => '<div class="cr-ov-row">' +
    '<div class="cr-ov-label"><span class="cr-ov-num">' + n + '</span>' + label + '</div>' +
    '<div class="cr-ov-body">' + body + '</div>' +
    (onEdit ? '<button class="cr-ov-edit" onclick="' + onEdit(n) + '">Edit</button>' : '<span></span>') +
  '</div>';
  return '<div class="cr-ov">' +
    row(1, 'Amounts &amp; bonuses', '<div class="cr-amounts">' + amounts + '</div>') +
    row(2, 'What clients see', examples) +
    row(3, 'When clients buy', window) +
    '<div class="cr-ov-row"><div class="cr-ov-label"><span class="cr-ov-num"></span>Where credit is spent</div>' +
      '<div class="cr-ov-body">Credit can be spent in any gallery in this job, including a sibling’s gallery where no credit was bought. Families can buy more while sales are open; it adds to one balance.</div><span></span></div>' +
    '<div class="cr-ov-row"><div class="cr-ov-label"><span class="cr-ov-num"></span>Payout</div>' +
      '<div class="cr-ov-body">' + CR.ph.payoutText(d) + '</div><span></span></div>' +
    '<div class="cr-ov-row"><div class="cr-ov-label"><span class="cr-ov-num"></span>Expiry</div>' +
      '<div class="cr-ov-body">Credit expires after <span class="cr-placeholder">[expiry period]</span> · <span class="cr-placeholder">[client terms]</span></div><span></span></div>' +
  '</div>';
};

/* ── Setup steps. One draft holds everything; steps are views of it. ──
   First setup (empty offer): Back / Next through the steps, Save draft at any point, publish on step 5.
   Once the offer exists: any step opens directly from the overview; Save changes returns to the overview. */
CR.ph.startEdit = function (step) {
  if (!CR.settings.creditSalesOn) CR.settings.creditSalesOn = true;
  const d = JSON.parse(JSON.stringify(CR.offer));
  if (!d.amounts.length) d.amounts.push({ paid: 0, face: 0 });
  CR.ph.draft = d;
  CR.ph.flow = CR.offer.status === 'empty' ? 'setup' : 'edit';
  CR.ph.step = step || 1;
  CR.ph.visited = CR.ph.flow === 'setup' ? CR.ph.step : CR.ph.LAST;
  CR.ph.mode = 'edit';
  CR.ph.tried = false;
  CR.changed();
};
CR.ph.cancelEdit = function () { CR.ph.mode = 'view'; CR.ph.draft = null; CR.changed(); };
CR.ph.goStep = function (n) {
  if (CR.ph.flow === 'setup' && n > CR.ph.visited + 1) return;
  CR.ph.step = n;
  CR.ph.visited = Math.max(CR.ph.visited, n);
  CR.ph.render();
  const card = document.getElementById('cr-steps');
  if (card) card.scrollIntoView({ block: 'nearest' });
};

/* Problems per step, so an error can send the photographer to the step that has it. */
CR.ph.stepErrors = function (d, n) {
  const errs = [];
  if (n === 1) {
    if (!d.amounts.some(CR.ph.validAmount)) errs.push('Add at least one amount.');
    if (d.amounts.some(a => (a.paid || a.face) && !CR.ph.validAmount(a))) errs.push('Fix the amounts marked in red.');
  }
  if (n === 3) {
    const o = CR.ph.opensDate(d.window), c = CR.ph.closesDate(d.window);
    if (o && c && o > c) errs.push('The purchase window closes before it opens.');
  }
  return errs;
};
CR.ph.editErrors = function (d) { return [1, 3].reduce((all, n) => all.concat(CR.ph.stepErrors(d, n)), []); };
CR.ph.firstBadStep = function (d) { return [1, 3].find(n => CR.ph.stepErrors(d, n).length); };

CR.ph.commit = function (d) {
  d.amounts = d.amounts.filter(CR.ph.validAmount);
  CR.offer = d;
  CR.ph.mode = 'view'; CR.ph.draft = null;
};
CR.ph.save = function (publish) {
  const d = CR.ph.draft;
  CR.ph.tried = true;
  const bad = CR.ph.firstBadStep(d);
  if (bad) { CR.ph.step = bad; CR.ph.render(); return; }
  if (publish) d.status = 'published';
  else if (d.status === 'empty') d.status = 'draft';
  const was = CR.offer.status;
  CR.ph.commit(d);
  if (publish) CR.settings.creditSalesOn = true;
  toast(publish && was !== 'published' ? 'Credit offer published · the registration link now shows it'
    : d.status === 'published' ? 'Credit offer updated' : 'Credit offer saved as a draft');
  CR.changed();
};
CR.ph.publish = function (o) {
  o.status = 'published';
  CR.offer = o;
  CR.settings.creditSalesOn = true;
  CR.ph.mode = 'view'; CR.ph.draft = null;
  toast('Credit offer published · the registration link now shows it');
  CR.changed();
};

/* Typing never re-renders the step (that would lose focus and Tab order); it refreshes the parts that depend on
   the values: bonus labels, margin view, resolved window dates, errors. Structural changes re-render. */
CR.ph.setAmount = function (i, key, v) {
  CR.ph.draft.amounts[i][key] = Math.max(0, Math.round(+v || 0));
  CR.ph.refresh();
};
CR.ph.addAmount = function () { CR.ph.draft.amounts.push({ paid: 0, face: 0 }); CR.ph.render(); };
CR.ph.removeAmount = function (i) { CR.ph.draft.amounts.splice(i, 1); CR.ph.render(); };
CR.ph.toggleExample = function (id) {
  const l = CR.ph.draft.examples, i = l.indexOf(id);
  if (i >= 0) l.splice(i, 1); else l.push(id);
  CR.ph.render();   /* the image controls appear for selected products */
};
/* The photographer's own image, read in the browser. Nothing is uploaded anywhere in the prototype. */
CR.ph.uploadImage = function (id, input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('Choose an image file'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('Image is over 5 MB. Choose a smaller one.'); return; }
  const r = new FileReader();
  r.onload = function () { CR.ph.draft.exampleImages[id] = r.result; CR.ph.render(); };
  r.readAsDataURL(file);
};
CR.ph.useDefaultImage = function (id) { delete CR.ph.draft.exampleImages[id]; CR.ph.render(); };
CR.ph.itemsOpen = false;
CR.ph.setWindow = function (end, key, v) {
  CR.ph.draft.window[end][key] = key === 'days' ? Math.max(0, Math.round(+v || 0)) : v;
  if (key === 'mode') CR.ph.render(); else CR.ph.refresh();
};
CR.ph.setPurchaseRequired = function (v) { CR.ph.draft.registration.purchaseRequired = v; CR.ph.render(); };

CR.ph.amountMetaHTML = function (a) {
  if ((a.paid || a.face) && !CR.ph.validAmount(a)) return '<span class="cr-err">Can’t be less than what the client pays</span>';
  if (CR.ph.validAmount(a) && a.face > a.paid) return '<span class="cr-bonus">+' + CR.money(a.face - a.paid) + ' bonus · ' + Math.round((a.face - a.paid) / a.paid * 100) + '%</span>';
  return a.paid ? '<span class="cr-muted">No bonus</span>' : '';
};

CR.ph.refresh = function () {
  const d = CR.ph.draft, set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  d.amounts.forEach((a, i) => {
    const row = document.getElementById('cr-row-' + i);
    if (row) row.classList.toggle('bad', !!((a.paid || a.face) && !CR.ph.validAmount(a)));
    set('cr-meta-' + i, CR.ph.amountMetaHTML(a));
  });
  set('cr-margin-region', CR.ph.marginHTML(d));
  set('cr-step-nav', CR.ph.stepNavHTML());
  CR.ph.refreshTimelines();
  const w = d.window, o = CR.ph.opensDate(w), c = CR.ph.closesDate(w);
  set('cr-opens-res', CR.ph.fmtD(o));
  set('cr-closes-res', CR.ph.fmtD(c));
  set('cr-window-err', o && c && o > c ? 'The window closes before it opens.' : '');
  const errs = CR.ph.stepErrors(d, CR.ph.step);
  set('cr-foot-err', errs.length && CR.ph.tried ? errs.join(' ') : '');
};

/* Step header: numbered steps; done, current, or with a problem (red dot). */
CR.ph.stepNavHTML = function () {
  const d = CR.ph.draft;
  return CR.ph.STEPS.map(s => {
    const n = s[0], open = CR.ph.flow === 'edit' || n <= CR.ph.visited + 1;
    /* Errors block saving; a margin warning is advisory (publishing is never blocked), so it gets an amber dot. */
    const problem = CR.ph.stepErrors(d, n).length, warn = !problem && n === 1 && CR.ph.losers(d).length;
    const cls = 'cr-stepnav-item' + (n === CR.ph.step ? ' on' : n <= CR.ph.visited ? ' done' : '') + (problem ? ' bad' : warn ? ' warn' : '');
    return '<button class="' + cls + '"' + (open ? ' onclick="CR.ph.goStep(' + n + ')"' : ' disabled') + '>' +
      '<span class="cr-stepnav-num">' + n + '</span><span class="cr-stepnav-label">' + s[1].replace('&', '&amp;') + '</span></button>';
  }).join('<i class="cr-stepnav-line"></i>');
};

CR.ph.editHTML = function () {
  const d = CR.ph.draft, n = CR.ph.step, setup = CR.ph.flow === 'setup';
  const published = d.status === 'published';
  const bodies = { 1: CR.ph.stepAmountsHTML, 2: CR.ph.stepExamplesHTML, 3: CR.ph.stepWindowHTML, 4: CR.ph.stepReviewHTML };
  const errs = CR.ph.stepErrors(d, n);
  let left = '', right = '';
  if (setup) {
    left = '<button class="btn btn-ghost" onclick="CR.ph.save(false)">Save draft</button>';
    right = (n > 1 ? '<button class="btn btn-ghost" onclick="CR.ph.goStep(' + (n - 1) + ')"><i class="fa-solid fa-chevron-left"></i> Back</button>' : '') +
      (n < CR.ph.LAST ? '<button class="btn btn-brand" onclick="CR.ph.goStep(' + (n + 1) + ')">Next: ' + CR.ph.STEPS[n][1].replace('&', '&amp;') + ' <i class="fa-solid fa-chevron-right"></i></button>'
        : '<button class="btn btn-brand" onclick="CR.ph.save(true)">Publish offer</button>');
  } else {
    left = '<button class="btn btn-ghost" onclick="CR.ph.cancelEdit()">Cancel</button>';
    right = '<button class="btn ' + (published ? 'btn-brand' : 'btn-ghost') + '" onclick="CR.ph.save(false)">Save changes</button>' +
      (published ? '' : '<button class="btn btn-brand" onclick="CR.ph.save(true)">Publish offer</button>');
  }
  return '<div class="detail-card cr-edit" id="cr-steps">' + CR.ph.offerHeadHTML() +
    '<div class="cr-stepnav" id="cr-step-nav">' + CR.ph.stepNavHTML() + '</div>' +
    (published ? '<div class="cr-note"><i class="fa-solid fa-circle-info"></i> This offer is live. Changes apply to new purchases only; clients who already bought keep the credit they bought.</div>' : '') +
    '<div class="cr-step-title">Step ' + n + ' of ' + CR.ph.LAST + ' · ' + CR.ph.STEPS[n - 1][1].replace('&', '&amp;') + '</div>' +
    bodies[n](d) +
    '<div class="cr-err cr-foot-err" id="cr-foot-err">' + (errs.length && CR.ph.tried ? errs.join(' ') : '') + '</div>' +
    '<div class="cr-edit-foot cr-step-foot"><div>' + left + '</div><div class="cr-step-foot-right">' + right + '</div></div>' +
  '</div>';
};

/* ── Timeline (first version, read-only): what the photographer has set up, without reading text ──
   Dated markers sit on a line scaled from the day credit goes on sale to the day photos are available. Markers
   for open decisions and emails without a set send date are greyed at the end of the line. Dates are edited in the
   form next to it. */
/* The timeline card at the top of the tab: registration, credit and picture day at a glance. It follows what's being
   edited (the credit draft, the registration draft) as you type. */
CR.ph.timelineCardHTML = function () {
  return '<div class="detail-card cr-tl-card">' +
    '<div class="cr-offer-head"><div><div class="detail-card-header" style="margin:0;">Timeline</div>' +
      '<div class="cr-offer-sub">Registration, credit and picture day at a glance. Updates as you edit.</div></div></div>' +
    '<div id="cr-timeline-top">' + CR.ph.timelineHTML() + '</div>' +
  '</div>';
};
CR.ph.refreshTimelines = function () {
  ['cr-timeline-top', 'cr-timeline', 'cr-reg-timeline'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = CR.ph.timelineHTML(); });
};
CR.ph.timelineHTML = function () {
  /* The credit window being edited, else the saved one; no credit markers without an offer. */
  const w = CR.ph.mode === 'edit' && CR.ph.draft ? CR.ph.draft.window : CR.offer.status !== 'empty' ? CR.offer.window : null;
  const shoot = CR.shootDate(), opens = w ? CR.ph.opensDate(w) : null, closes = w ? CR.ph.closesDate(w) : null;
  const photos = displayDateToLocal(JOBS.riverside.deadline) || CR.ph.shootPlus(14);   /* the job's delivery deadline */
  const dated = [
    { d: opens, label: 'Credit on sale', icon: 'fa-tag', cls: 'credit' },
    { d: shoot, label: 'Picture day', icon: 'fa-camera', cls: 'shoot' },
    { d: closes, label: 'Credit sales close', icon: 'fa-tag', cls: 'credit' },
    { d: photos, label: 'Photos available', icon: 'fa-images', cls: 'photos' },
    { d: photos, label: 'Photos-ready email', icon: 'fa-envelope', cls: 'email' }
  ];
  /* Registration: a dated marker when it opens or closes on a date; "open now" at the start otherwise. */
  const rw = CR.ph.regWin(), regOpens = CR.reg.on ? CR.ph.regOpensDate(rw) : null, regCloses = CR.reg.on ? CR.ph.regClosesDate(rw) : null;
  if (regOpens) dated.push({ d: regOpens, label: 'Registration opens', icon: 'fa-user-plus', cls: 'reg' });
  if (regCloses) dated.push({ d: regCloses, label: 'Registration closes', icon: 'fa-user-xmark', cls: 'reg' });
  dated.splice(0, dated.length, ...dated.filter(m => m.d));
  /* Markers on the same day share one point. */
  const groups = [];
  dated.sort((a, b) => a.d - b.d).forEach(m => {
    const g = groups.find(x => x.d.getTime() === m.d.getTime());
    if (g) g.items.push(m); else groups.push({ d: m.d, items: [m] });
  });
  const start = Math.min(groups[0].d, CR.demoToday()), end = Math.max(groups[groups.length - 1].d, CR.demoToday());
  const span = Math.max(1, end - start);
  const pos = d => 10 + 56 * (d - start) / span;   /* 0–10%: registration, 10–66%: dated, 74–100%: not set yet */
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const point = (left, items, date, i, extra) => '<div class="cr-tl-pt ' + items[0].cls + (extra || '') + (i % 2 ? ' below' : '') + '" style="left:' + left + '%">' +
    '<span class="cr-tl-dot">' + items.map(m => '<i class="fa-solid ' + m.icon + '"></i>').slice(0, 2).join('') + '</span>' +
    '<span class="cr-tl-label">' + items.map(m => m.label).join('<br>') + (date ? '<small>' + date + '</small>' : '') + '</span></div>';
  const today = CR.demoToday();
  return '<div class="cr-tl" aria-label="Timeline">' +
    '<div class="cr-tl-line"></div><div class="cr-tl-line pending"></div>' +
    (regOpens ? '' : point(2, [{ label: CR.reg.on ? 'Registration open' : 'Registration off', icon: 'fa-user-plus', cls: 'reg' }], CR.reg.on ? 'now' : '', 1)) +
    groups.map((g, i) => point(pos(g.d), g.items, fmt(g.d), i)).join('') +
    '<div class="cr-tl-today" style="left:' + pos(today) + '%"><span>Today (demo) · ' + fmt(today) + '</span></div>' +
    point(77, [{ label: '<span class="cr-placeholder">[bulk order closes]</span>', icon: 'fa-truck', cls: 'pending' }], '', 1, ' pending') +
    point(87, [{ label: '<span class="cr-placeholder">[price list switches]</span>', icon: 'fa-tags', cls: 'pending' }], '', 0, ' pending') +
    point(96, [{ label: 'Unspent credit reminder<br><span class="cr-placeholder">[send date]</span>', icon: 'fa-envelope', cls: 'pending' }], '', 1, ' pending') +
  '</div>' +
  '<div class="cr-tl-foot">Sent as they happen: purchase confirmation, remainder after each order. Expiry warning: <span class="cr-placeholder">[expiry period]</span>.</div>';
};

CR.ph.stepAmountsHTML = function (d) {
  const amountRows = d.amounts.map((a, i) => {
    const bad = (a.paid || a.face) && !CR.ph.validAmount(a);
    return '<div class="cr-amount-row' + (bad ? ' bad' : '') + '" id="cr-row-' + i + '">' +
      '<label><span>Client pays</span><div class="cr-money"><i>$</i><input class="f-input" type="number" min="1" aria-label="Client pays" value="' + (a.paid || '') + '" oninput="CR.ph.setAmount(' + i + ',\'paid\',this.value)"></div></label>' +
      '<i class="fa-solid fa-arrow-right cr-arrow"></i>' +
      '<label><span>Client can spend</span><div class="cr-money"><i>$</i><input class="f-input" type="number" min="1" aria-label="Client can spend" value="' + (a.face || '') + '" oninput="CR.ph.setAmount(' + i + ',\'face\',this.value)"></div></label>' +
      '<div class="cr-amount-meta" id="cr-meta-' + i + '">' + CR.ph.amountMetaHTML(a) + '</div>' +
      '<button class="cr-icon-btn" title="Remove amount" onclick="CR.ph.removeAmount(' + i + ')"><i class="fa-solid fa-xmark"></i></button>' +
    '</div>';
  }).join('');
  return '<div class="cr-section-sub">Fixed amounts a client can buy. A bonus adds spending power on top of what they pay and comes out of your margin.</div>' +
    amountRows +
    '<button class="btn btn-ghost-sm cr-add" onclick="CR.ph.addAmount()"><i class="fa-solid fa-plus"></i> Add amount</button>' +
    (CR.prev.layout === 'D' ? CR.ph.fromPackagesHTML(d) : '') +
    '<div id="cr-margin-region">' + CR.ph.marginHTML(d) + '</div>';
};

/* Preview option, layout D: amounts created from packages at their price (bonus off by default). Only shown while
   layout D is selected in the Demo control. It sets amounts only: credit stays credit, not tied to the package. */
CR.ph.pkgPick = {};
CR.ph.fromPackagesHTML = function (d) {
  const pkgs = CR.ph.products().filter(p => p.kind === 'package');
  return '<div class="cr-from-pkgs"><div class="cr-section-title">Set amounts from packages <span class="cr-demo-tag">Preview option D</span></div>' +
    '<div class="cr-section-sub">One amount per package, at its price. Clients still get credit they can spend on anything; the package is how the amount is labelled.</div>' +
    pkgs.map(p => '<label class="cr-from-pkg"><input type="checkbox"' + (CR.ph.pkgPick[p.id] || d.amounts.some(a => a.pkgId === p.id) ? ' checked' : '') +
      ' onchange="CR.ph.pkgPick[\'' + p.id + '\'] = this.checked"> <b>' + p.name + '</b> <span class="cr-muted">' + CR.money(p.price) + '</span></label>').join('') +
    '<button class="btn btn-ghost-sm" onclick="CR.ph.usePackages()">Use these packages</button></div>';
};
CR.ph.usePackages = function () {
  const d = CR.ph.draft, prev = {};
  d.amounts.forEach(a => { if (a.pkgId) prev[a.pkgId] = a; });
  const ids = CR.ph.products().filter(p => p.kind === 'package' && (CR.ph.pkgPick[p.id] || (prev[p.id] && CR.ph.pkgPick[p.id] !== false))).map(p => p.id);
  if (!ids.length) { toast('Tick at least one package'); return; }
  d.amounts = ids.map(id => { const p = CR.ph.product(id); return prev[id] ? prev[id] : { paid: p.price, face: p.price, pkgId: id }; });
  CR.ph.pkgPick = {};
  CR.ph.render();
};

CR.ph.stepExamplesHTML = function (d) {
  const exRow = p => {
    const on = d.examples.indexOf(p.id) >= 0, custom = d.exampleImages[p.id];
    return '<div class="cr-pkg-row' + (on ? ' on' : '') + '">' +
      '<label class="cr-pkg-pick"><input type="checkbox"' + (on ? ' checked' : '') + ' onchange="CR.ph.toggleExample(\'' + p.id + '\')">' +
        CR.ph.thumbHTML(p.id, d) +
        '<span class="cr-pkg-name"><b>' + p.name + '</b>' + (p.desc ? '<small class="cr-pkg-desc">' + escHtml(p.desc) + '</small>' : '') +
          '<small>' + p.sub + (on ? ' · ' + (custom ? 'your image' : 'default image') : '') + '</small></span></label>' +
      (on ? '<span class="cr-img-ctl"><label class="btn btn-ghost-sm"><i class="fa-solid fa-arrow-up-from-bracket"></i> ' + (custom ? 'Replace image' : 'Upload image') +
          '<input type="file" accept="image/*" hidden onchange="CR.ph.uploadImage(\'' + p.id + '\', this)"></label>' +
          (custom ? '<button class="cr-link-btn" onclick="CR.ph.useDefaultImage(\'' + p.id + '\')">Use default</button>' : '') + '</span>' : '') +
      '<span class="cr-pkg-price">' + CR.money(p.price) + '</span></div>';
  };
  /* Selected single products sit with the packages, so every example is visible; the rest stay in the collapsed list. */
  const prods = CR.ph.products(), singles = prods.filter(p => p.kind === 'item');
  const isOn = p => d.examples.indexOf(p.id) >= 0;
  const singlesOn = singles.filter(isOn), singlesOff = singles.filter(p => !isOn(p));
  return '<div class="cr-section-sub">Optional. Packages or single products from ' + CR_DATA.priceList.name + ', at their real price. Shown when clients buy credit and in the gallery, as a guide only: clients can spend credit on anything. Each shows our default image unless you upload your own.</div>' +
    '<div class="cr-ex-label">Packages</div>' + prods.filter(p => p.kind === 'package').map(exRow).join('') +
    (singlesOn.length ? '<div class="cr-ex-label">Single products</div>' + singlesOn.map(exRow).join('') : '') +
    (singlesOff.length ? '<details class="cr-ex-more"' + (CR.ph.itemsOpen ? ' open' : '') + ' ontoggle="CR.ph.itemsOpen = this.open">' +
      '<summary><i class="fa-solid fa-plus"></i> Add a single product' +
        ' <span class="cr-muted">' + singlesOff.length + (singlesOn.length ? ' more' : '') + ' in the price list</span></summary>' +
      singlesOff.map(exRow).join('') +
    '</details>' : '') +
    '<button class="btn btn-ghost-sm cr-preview-btn" onclick="CR.cl.openPreview(\'offer\', CR.ph.draft)"><i class="fa-regular fa-eye"></i> Preview what clients see</button>';
};

CR.ph.stepWindowHTML = function (d) {
  const w = d.window;
  const sel = (end, opts, cur) => '<select class="f-input cr-select" onchange="CR.ph.setWindow(\'' + end + '\',\'mode\',this.value)">' +
    opts.map(op => '<option value="' + op[0] + '"' + (op[0] === cur ? ' selected' : '') + '>' + op[1] + '</option>').join('') + '</select>';
  const daysIn = end => '<input class="f-input cr-days" type="number" min="0" value="' + w[end].days + '" oninput="CR.ph.setWindow(\'' + end + '\',\'days\',this.value)"><span class="cr-muted">days</span>';
  const dateIn = end => '<input class="f-input cr-date" type="date" value="' + w[end].date + '" oninput="CR.ph.setWindow(\'' + end + '\',\'date\',this.value)">';
  const opensCtl = (w.opens.mode === 'date' ? dateIn('opens') : daysIn('opens')) + sel('opens', [['before', 'before the shoot'], ['date', 'on a date']], w.opens.mode);
  const closesCtl = sel('closes', [['shoot', 'On the shoot date'], ['after', 'Days after the shoot'], ['date', 'On a date']], w.closes.mode) +
    (w.closes.mode === 'after' ? daysIn('closes') : w.closes.mode === 'date' ? dateIn('closes') : '');
  const opensD = CR.ph.opensDate(w), closesD = CR.ph.closesDate(w);
  return '<div class="cr-section-sub">When clients can buy credit. Spending isn’t limited by this window.</div>' +
    '<div id="cr-timeline">' + CR.ph.timelineHTML() + '</div>' +
    '<div class="cr-window-row"><span class="cr-window-label">Opens</span>' + opensCtl + '<span class="cr-resolved" id="cr-opens-res">' + CR.ph.fmtD(opensD) + '</span></div>' +
    '<div class="cr-window-row"><span class="cr-window-label">Closes</span>' + closesCtl + '<span class="cr-resolved" id="cr-closes-res">' + CR.ph.fmtD(closesD) + '</span></div>' +
    '<div class="cr-err" id="cr-window-err" style="margin-top:6px;">' + (opensD && closesD && opensD > closesD ? 'The window closes before it opens.' : '') + '</div>' +
    /* How credit relates to registration is a credit rule; registration itself is set up in its own card. */
    '<div class="cr-section"><div class="cr-section-title">Buying credit at registration</div>' +
      '<div class="cr-section-sub">' + (!CR.reg.on ? 'Registration is off: families buy credit from the gallery link with their name and email.'
        : d.registration.purchaseRequired
        ? 'Mandatory: families fill in their details, then buy credit. They’re registered only once payment goes through.'
        : 'Optional: families register first, then can buy credit straight away or later from the gallery link.') + '</div>' +
      '<div class="cr-seg' + (CR.reg.on ? '' : ' cr-seg-off') + '">' +
        '<button class="' + (d.registration.purchaseRequired && CR.reg.on ? '' : 'active') + '"' + (CR.reg.on ? ' onclick="CR.ph.setPurchaseRequired(false)"' : ' disabled') + '>Optional</button>' +
        '<button class="' + (d.registration.purchaseRequired && CR.reg.on ? 'active' : '') + '"' + (CR.reg.on ? ' onclick="CR.ph.setPurchaseRequired(true)"' : ' disabled') + '>Mandatory</button>' +
      '</div>' +
      (CR.reg.on ? '' : '<div class="cr-note" style="margin-top:10px;"><i class="fa-solid fa-circle-info"></i> Applies when registration is on.</div>') +
    '</div>' +
    /* Who can pre-order (decided 2026-11-05): an audience from the job's contacts. */
    '<div class="cr-section"><div class="cr-section-title">Who can pre-order</div>' +
      '<div class="cr-section-sub">Uses the job’s contact audiences. Invites go only to this audience; other emails can’t buy credit. ' +
        'With several contacts in a registration, the primary contact receives the credit.</div>' +
      '<select class="f-input cr-select" onchange="CR.ph.draft.audience=this.value; CR.ph.render()">' +
        CR.ph.AUDIENCES.map(a => '<option value="' + a[0] + '"' + ((d.audience || 'parents') === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') +
      '</select> <span class="cr-muted">Sample audiences for this job</span>' +
    '</div>';
};
CR.ph.AUDIENCES = [['parents', 'Parents and guardians'], ['students', 'Students'], ['everyone', 'Everyone']];
CR.ph.audienceText = function (d) { return (CR.ph.AUDIENCES.find(a => a[0] === (d.audience || 'parents')) || [])[1]; };

CR.ph.stepReviewHTML = function (d) {
  return '<div class="cr-section-sub">Check everything before clients see it. Edit any part, then publish.</div>' +
    CR.ph.marginAlertHTML(d, 'CR.ph.fixMargin()') +
    CR.ph.summaryHTML(d, n => 'CR.ph.goStep(' + n + ')') +
    '<button class="btn btn-ghost-sm cr-preview-btn" onclick="CR.cl.openPreview(\'offer\', CR.ph.draft)"><i class="fa-regular fa-eye"></i> Preview what clients see</button>';
};

/* ── Margin check: collapsed by default, problems first ──
   Products checked: every item in the price list plus the selected example packages. A product "loses money" when
   its margin is zero or below for any bonus amount. */
CR.ph.marginOpen = false;
CR.ph.marginRows = function (d) {
  return CR_DATA.priceList.items.map(i => ({ id: i.id, name: i.name, price: i.price, cost: i.labCost, pkg: false, example: d.examples.indexOf(i.id) >= 0 }))
    .concat(CR.ph.examplesOf(d).filter(p => p.kind === 'package').map(p => ({ id: p.id, name: p.name, price: p.price, cost: p.cost, pkg: true, example: true })));
};
CR.ph.losers = function (d) {
  const bonuses = CR.ph.bonusAmounts(d);
  return CR.ph.marginRows(d).filter(r => bonuses.some(a => CR.ph.margin(r.price, r.cost, a) <= 0));
};
/* The red warning: on step 1 under the amounts, on the overview and on the review step. Clicking opens the check. */
CR.ph.marginAlertHTML = function (d, onClick) {
  const n = CR.ph.losers(d).length;
  if (!n) return '';
  const at = CR.ph.bonusAmounts(d).length === 1 ? 'at this bonus' : 'with these bonuses';
  return '<button class="cr-margin-alert" onclick="' + onClick + '"><i class="fa-solid fa-triangle-exclamation"></i> ' +
    '<b>' + n + (n === 1 ? ' item loses' : ' items lose') + ' money ' + at + '</b><span>Show margin check</span></button>';
};
CR.ph.openMargin = function () {
  CR.ph.marginOpen = true;
  CR.ph.refresh();
  const el = document.getElementById('cr-margin-check');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
/* From the overview or the review step: open step 1 with the check expanded. */
CR.ph.fixMargin = function () {
  CR.ph.marginOpen = true;
  if (CR.ph.mode === 'edit') CR.ph.goStep(1); else CR.ph.startEdit(1);
  setTimeout(CR.ph.openMargin, 0);
};

CR.ph.marginHTML = function (d) {
  const bonuses = CR.ph.bonusAmounts(d), rows = CR.ph.marginRows(d);
  if (!bonuses.length) {
    return '<div class="cr-margin-quiet"><i class="fa-solid fa-scale-balanced"></i> Margin check · add a bonus to see what you keep on each product</div>';
  }
  const losers = CR.ph.losers(d), loserIds = losers.map(r => r.id);
  const fine = rows.filter(r => loserIds.indexOf(r.id) < 0);
  const cell = (r, a) => {
    const m = CR.ph.margin(r.price, r.cost, a), pct = r.price ? Math.round(m / r.price * 100) : 0;
    return '<td class="cr-m' + (m <= 0 ? ' neg' : '') + '">' + (m < 0 ? '−' : '') + CR.money(Math.abs(m)) + ' <small>' + (pct < 0 ? '−' + -pct : pct) + '%</small></td>';
  };
  const table = list => '<div class="cr-margin-wrap"><table class="cr-margin">' +
    '<thead><tr><th>Product</th><th class="cr-num">Price</th><th class="cr-num">Lab cost</th>' +
      '<th class="cr-num">Estimated processing fee <span class="cr-placeholder">[flat fee]</span></th>' +
      '<th class="cr-num">Commission ' + CR_DATA.fees.commissionPct + '% <span class="cr-placeholder">[sample rate]</span></th><th class="cr-num">No bonus</th>' +
      bonuses.map(a => '<th class="cr-num">Pay ' + CR.money(a.paid) + ' → ' + CR.money(a.face) + '</th>').join('') + '</tr></thead><tbody>' +
    list.map(r => '<tr' + (r.pkg ? ' class="cr-pkg-tr"' : '') + '><td>' + r.name +
        (r.example ? ' <span class="chip chip-orange">' + (r.pkg ? 'Example package' : 'Example product') + '</span>' : '') + '</td>' +
      '<td class="cr-num">' + CR.money(r.price) + '</td><td class="cr-num">' + CR.money(r.cost) + '</td>' +
      '<td class="cr-num">' + CR.money(CR.ph.procFee(r.price)) + '</td><td class="cr-num">' + CR.money(CR.ph.commission(r.price, null)) + '</td>' +
      cell(r, null) + bonuses.map(a => cell(r, a)).join('') + '</tr>').join('') +
    '</tbody></table></div>';
  const summary = losers.length
    ? '<span class="cr-margin-sum-bad">' + losers.length + ' losing money</span> · ' + fine.length + ' fine'
    : 'all ' + rows.length + ' products keep a margin';
  return CR.ph.marginAlertHTML(d, 'CR.ph.openMargin()') +
    '<details class="cr-margin-check" id="cr-margin-check"' + (CR.ph.marginOpen ? ' open' : '') + ' ontoggle="CR.ph.marginOpen = this.open">' +
      '<summary><i class="fa-solid fa-chevron-right"></i> Margin check <span class="cr-muted">· ' + summary + '</span></summary>' +
      '<div class="cr-section-sub" style="margin-top:4px;">What you keep per sale when the client pays with credit: price × (paid ÷ spend), minus lab cost, the estimated processing fee and our commission. ' +
        'Commission comes out of what the client paid, so it falls with a bonus.</div>' +
      '<div class="cr-margin-fee-note"><i class="fa-solid fa-circle-info"></i> <span><b>Estimated processing fee:</b> a high estimate that assumes one item per order. Actual profit shows on the placed order. ' +
        CR_DATA.fees.processingPct + '% of the price <span class="cr-placeholder">[sample rate]</span> plus a flat fee per order <span class="cr-placeholder">[flat fee]</span>, not included yet.</span></div>' +
      (losers.length ? '<div class="cr-margin-group bad">Losing money (' + losers.length + ')</div>' + table(losers) : '') +
      (fine.length ? '<details class="cr-margin-fine"' + (CR.ph.fineOpen ? ' open' : '') + ' ontoggle="CR.ph.fineOpen = this.open">' +
        '<summary><i class="fa-solid fa-chevron-right"></i> Fine (' + fine.length + ')</summary>' + table(fine) + '</details>' : '') +
    '</details>';
};

/* ── Registrations: every registered child, like Credit by client for credit ──
   The test users (and families added in the Demo control) come live from the registration data. The rest of the
   job is SAMPLE DATA: 93 registrations, so the default demo shows 96 of 142 subjects as the tile did. The 41 sample
   credit buyers are among them, with the same names, so both lists agree. */
CR.ph.sampleRegistrations = function () {
  if (CR.ph.sampleRegsCache) return CR.ph.sampleRegsCache;
  const rng = mulberry32(1142), pick = a => a[Math.floor(rng() * a.length)];
  const iso = day => day > 30 ? '2026-05-' + String(day - 30).padStart(2, '0') : '2026-04-' + String(day).padStart(2, '0');
  const coaches = ['Coach Davis', 'Coach Rivera', 'Coach Kim', 'Coach Patel'];
  const answers = (child, folder) => ({ q1: child, q2: folder, q3: rng() < 0.7 ? String(1 + Math.floor(rng() * 30)) : '', q4: pick(coaches) });
  const email = name => name.toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.') + '@yopmail.com';
  const buyers = CR.ph.sampleBuyers().map(b => {
    const day = Math.max(10, parseInt(b.bought.slice(8), 10) + (b.bought.slice(5, 7) === '05' ? 30 : 0) - Math.floor(rng() * 4));
    return { key: 'r-' + b.key, parent: b.name, email: email(b.name), date: iso(day), matched: true, folder: b.folder, values: answers(b.child, b.folder), buyer: b };
  });
  const taken = CR_DATA.clients.map(c => c.name.split(' ').slice(-1)[0]);
  const lasts = LASTS.filter(l => taken.indexOf(l) < 0);
  const others = [];
  for (let i = 0; i < 93 - buyers.length; i++) {
    const last = lasts[(i * 5 + 3) % lasts.length], parent = pick(BUYERS) + ' ' + last, folder = rng() < 0.5 ? 'Eagles U10' : 'Riverside Raptors U12';
    others.push({ key: 'r-o' + i, parent: parent, email: email(parent), date: iso(10 + Math.floor(rng() * 24)), matched: i % 13 !== 5, folder: folder,
      values: answers(pick(FIRSTS) + ' ' + last, folder) });
  }
  CR.ph.sampleRegsCache = buyers.concat(others);
  return CR.ph.sampleRegsCache;
};
/* One row per registered child, newest first. */
CR.ph.registrationRows = function () {
  const live = [];
  CR_DATA.clients.filter(c => CR.registered[c.id]).forEach(c => {
    const s = CR.summary(c.id);
    (CR.answers[c.id] || []).forEach((a, i) => {
      const g = CR_DATA.galleries.find(x => x.id === a.galleryId);
      live.push({ key: c.id + ':' + i, parent: c.name, email: c.email, date: a.date || CR.todayISO(), matched: !!g, gallery: g, folder: g ? g.folder : a.values.q2,
        values: a.values, credit: s.face ? { face: s.face, paid: s.paid, left: s.balance } : null, clientId: c.id, live: true });
    });
  });
  const sample = CR.ph.sampleRegistrations().map(r => Object.assign({}, r, {
    credit: r.buyer ? { face: r.buyer.face, paid: r.buyer.paid, left: r.buyer.face - r.buyer.spent } : null
  }));
  return live.concat(sample).sort((a, b) => b.date.localeCompare(a.date) || (b.live ? 1 : 0) - (a.live ? 1 : 0) || a.parent.localeCompare(b.parent));
};
CR.ph.mount();

/* Resetting the settings drops any half-edited offer. */
const crResetSettings = CR.resetSettings;
CR.resetSettings = function (empty) { CR.ph.mode = 'view'; CR.ph.draft = null; CR.ph.regDraft = null; crResetSettings(empty); };

/* ── Registration form: parent fields are Robert's core fields; custom questions are asked once per child ── */
CR.ph.qTypes = [['text', 'Text'], ['choice', 'Choice'], ['date', 'Date']];
/* "Export registrations": every registration with its answers. Same export from the Registration card and the
   Recent registrations list; the file format is an open decision. */
CR.ph.toggleExport = function (where) { CR.ph.exportOpen = CR.ph.exportOpen === where ? null : where; CR.ph.render(); };
CR.ph.exportHTML = function (where) {
  const n = CR.ph.registrationRows().length;
  return '<div class="cr-export"><button class="btn btn-ghost-sm" onclick="CR.ph.toggleExport(\'' + where + '\')"><i class="fa-solid fa-download"></i> Export registrations <i class="fa-solid fa-chevron-down" style="font-size:9px;"></i></button>' +
    (CR.ph.exportOpen === where ? '<div class="cr-export-menu"><div class="cr-export-label">Format</div>' +
      '<button onclick="CR.ph.toggleExport(\'' + where + '\'); toast(\'Exporting ' + n + ' registrations with their answers…\')"><span class="cr-placeholder">[format]</span></button></div>' : '') +
  '</div>';
};

/* ── Credit by client: who bought credit, what they've spent, what's left ──
   The four test users come from the live ledger. The rest of the job is SAMPLE DATA, generated once so the list adds
   up exactly to the job totals in the tiles (sold $2,145, $2,390 to spend, $610 spent, 41 clients holding a
   balance): 41 buyers (11 × $85 → $100, 12 × $50 → $55, 18 × $25 → $25), 2 of them used up. */
CR.ph.sampleBuyers = function () {
  if (CR.ph.sampleBuyersCache) return CR.ph.sampleBuyersCache;
  const rng = mulberry32(2026), pick = a => a[Math.floor(rng() * a.length)];
  const taken = CR_DATA.clients.map(c => c.name.split(' ').slice(-1)[0]);
  const lasts = LASTS.filter(l => taken.indexOf(l) < 0);
  const iso = (m, d) => '2026-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  /* What each buyer spent, chosen so partial spends total $475 and the two used-up buyers $80. */
  const plan = [].concat(
    [55, 35, 25, 0, 70, 15, 0, 40, 0, 25, 0].map(s => [85, 100, s]),
    [55, 25, 35, 0, 15, 0, 25, 0, 0, 35, 0, 0].map(s => [50, 55, s]),
    [25, 10, 12, 0, 15, 0, 12, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 16].map(s => [25, 25, s])
  );
  let oid = 2001;
  const out = plan.map((p, i) => {
    const last = lasts[(i * 7) % lasts.length], child = pick(FIRSTS);
    const day = 20 + Math.floor(rng() * 14);   /* Apr 20 – May 3: inside the purchase window, before the demo's "today" */
    const bought = day > 30 ? iso(5, day - 30) : iso(4, day);
    const orders = [];
    if (p[2]) {
      const parts = p[2] >= 50 ? [Math.round(p[2] * 0.6 / 5) * 5, 0] : [p[2]];
      if (parts.length === 2) parts[1] = p[2] - parts[0];
      parts.forEach((amt, k) => {
        const day = 20 + Math.floor(rng() * 9) + k * 6;
        orders.push({ id: '#' + (oid++), amount: amt, date: day > 31 ? iso(6, day - 31) : iso(5, day), approved: day < 25 });
      });
    }
    return { key: 's' + i, name: pick(BUYERS) + ' ' + last, child: child + ' ' + last, folder: i % 2 ? 'Eagles U10' : 'Riverside Raptors U12',
      paid: p[0], face: p[1], bought: bought, spent: p[2], orders: orders, sample: true };
  });
  CR.ph.sampleBuyersCache = out;
  return out;
};
/* One row per client who bought credit: test users live from the ledger, then the sample buyers. */
CR.ph.balanceRows = function () {
  const live = CR_DATA.clients.filter(c => CR.summary(c.id).face > 0).map(c => {
    const s = CR.summary(c.id), ev = CR.eventsFor(c.id);
    const first = (CR.answers[c.id] || [])[0];
    const g = CR_DATA.galleries.find(x => x.id === (first ? first.galleryId : c.galleries[0]));
    const orders = CR.orders.filter(o => o.clientId === c.id).map(o => {
      const red = ev.find(e => e.type === 'redemption' && e.orderId === o.id);
      return { id: '#' + o.id.replace('o-', ''), amount: o.creditApplied, card: o.cardCharged, date: o.date || (red && red.date),
        approved: o.status === 'approved', payout: CR.orderPayout(o).credit, live: o.id };
    });
    return { key: c.id, name: c.name, child: first && first.values.q1 ? first.values.q1 : (g ? g.name.split(', ').reverse().join(' ') : '—'),
      folder: g ? g.folder : (first && first.values.q2) || '—', paid: s.paid, face: s.face, spent: s.redeemed,
      bought: (ev.find(e => e.type === 'purchase') || {}).date, orders: orders, clientId: c.id };
  });
  return live.concat(CR.ph.sampleBuyers()).map(r => Object.assign(r, { left: r.face - r.spent }));
};
/* A client's credit history: purchases, orders paid with credit with their payout status, and the balance. */
CR.ph.balanceHistoryHTML = function (r) {
  const rate = r.face ? r.paid / r.face : 0;
  const lines = [{ date: r.bought, html: '<i class="fa-solid fa-tag"></i><span>Bought credit: paid <b>' + CR.money(r.paid) + '</b>, to spend <b>' + CR.money(r.face) + '</b>' +
    (r.face > r.paid ? ' (includes ' + CR.money(r.face - r.paid) + ' bonus)' : '') + '</span>' }]
    .concat(r.orders.map(o => {
      const payout = o.payout !== undefined ? o.payout : Math.round(o.amount * rate * 100) / 100;
      return { date: o.date, html: '<i class="fa-solid fa-bag-shopping"></i><span>Order ' +
        (o.live ? '<a class="gallery-name-link" onclick="event.stopPropagation(); CR.rep.open()">' + o.id + '</a>' : o.id) +
        ': <b>' + CR.money(o.amount) + '</b> of credit' + (o.card ? ' + ' + CR.money(o.card) + ' card' : '') + '</span>' +
        '<span class="cr-bal-payout">' + (o.approved ? 'Paid out ' + CR.money(payout) : CR.money(payout) + ' on approval') + '</span>' };
    }))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return '<div class="cr-bal-history">' +
    lines.map(l => '<div class="cr-bal-line"><span class="cr-bal-date">' + (l.date ? CR.fmtDate(l.date) : '') + '</span>' + l.html + '</div>').join('') +
    '<div class="cr-bal-line cr-bal-now"><span class="cr-bal-date">Now</span><i class="fa-solid fa-wallet"></i><span>Balance <b>' + CR.money(r.left) + '</b>' +
      (r.left > 0 ? ' · expires after <span class="cr-placeholder">[expiry period]</span>' : '') + '</span></div>' +
  '</div>';
};

/* ── Clients: one list of every registered family, with their children and their credit ──
   Every family with credit is registered, so registrations and credit are one list with two views:
   Registrations (who's coming, matching, answers) and Credit (who bought, spent, what's left).
   One row per family; the children are stacked in the row. */
CR.ph.fam = { view: 'reg', filter: { reg: 'all', credit: 'balance' }, search: '', open: null, all: false, cols: { q1: true, q2: true }, colsOpen: false };

CR.ph.familyRows = function () {
  const credit = {};
  CR.ph.balanceRows().forEach(b => { credit[b.clientId || b.key] = b; });
  const fams = {};
  CR.ph.registrationRows().forEach(r => {
    const key = r.live ? r.clientId : r.key;
    const f = fams[key] || (fams[key] = { key: key, parent: r.parent, email: r.email, live: !!r.live, clientId: r.clientId, children: [],
      credit: r.live ? credit[r.clientId] || null : r.buyer ? credit[r.buyer.key] : null });
    f.children.push({ name: r.values.q1 || '—', values: r.values, folder: r.folder, matched: r.matched, gallery: r.gallery, date: r.date });
  });
  /* Buyers without a registration (registration off): listed by name and email; student columns read "No registration". */
  CR_DATA.clients.filter(c => !CR.registered[c.id] && credit[c.id]).forEach(c => {
    fams[c.id] = { key: c.id, parent: c.name, email: c.email, live: true, clientId: c.id, credit: credit[c.id], noReg: true,
      children: [{ name: 'No registration', values: {}, folder: '', matched: false, gallery: null, date: credit[c.id].bought || CR.todayISO(), noReg: true }] };
  });
  return Object.keys(fams).map(k => {
    const f = fams[k];
    f.date = f.children.map(c => c.date).sort().reverse()[0];
    return f;
  });
};

CR.ph.FAM_FILTERS = {
  reg: [['all', 'All', () => true], ['unmatched', 'Not matched yet', f => f.children.some(c => !c.matched && !c.noReg)],
    ['credit', 'With credit', f => !!f.credit], ['nocredit', 'Without credit', f => !f.credit]],
  credit: [['balance', 'Has a balance', f => f.credit && f.credit.left > 0], ['used', 'Used up', f => f.credit && f.credit.left <= 0],
    ['all', 'All buyers', f => !!f.credit]]
};

CR.ph.showClients = function (view) {
  CR.ph.fam.view = view;
  CR.ph.fam.filter[view] = view === 'credit' ? 'balance' : 'all';
  CR.ph.fam.open = null; CR.ph.fam.all = false;
  CR.ph.render();
  const el = document.getElementById('cr-clients');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
CR.ph.setFamView = function (v) { CR.ph.fam.view = v; CR.ph.fam.open = null; CR.ph.fam.all = false; CR.ph.fam.colsOpen = false; CR.ph.render(); };
CR.ph.setFamFilter = function (f) { CR.ph.fam.filter[CR.ph.fam.view] = f; CR.ph.fam.open = null; CR.ph.fam.all = false; CR.ph.render(); };
CR.ph.setFamSearch = function (v) { CR.ph.fam.search = v; CR.ph.refreshFam(); };
CR.ph.toggleFamRow = function (key) { CR.ph.fam.open = CR.ph.fam.open === key ? null : key; CR.ph.refreshFam(); };
CR.ph.showAllFam = function () { CR.ph.fam.all = true; CR.ph.refreshFam(); };
CR.ph.toggleFamCol = function (id) { CR.ph.fam.cols[id] = !CR.ph.fam.cols[id]; CR.ph.render(); };
CR.ph.toggleFamCols = function () { CR.ph.fam.colsOpen = !CR.ph.fam.colsOpen; CR.ph.render(); };
/* Typing in the search box refreshes the rows only, so the box keeps focus. */
CR.ph.refreshFam = function () { const el = document.getElementById('cr-fam-body'); if (el) el.innerHTML = CR.ph.famBodyHTML(); };

CR.ph.clientsCardHTML = function () {
  const fam = CR.ph.fam, rows = CR.ph.familyRows();
  const views = [['reg', 'Registrations'], ['credit', 'Credit' + CR.PHASE5]].map(v =>
    '<button class="' + (fam.view === v[0] ? 'active' : '') + '" onclick="CR.ph.setFamView(\'' + v[0] + '\')">' + v[1] + '</button>').join('');
  const seg = CR.ph.FAM_FILTERS[fam.view].map(f => '<button class="' + (fam.filter[fam.view] === f[0] ? 'active' : '') + '" onclick="CR.ph.setFamFilter(\'' + f[0] + '\')">' +
    f[1] + ' <span class="cr-muted">' + rows.filter(f[2]).length + '</span></button>').join('');
  const nCols = CR.reg.questions.filter(q => fam.cols[q.id]).length;
  const answers = fam.view !== 'reg' ? '' :
    '<div class="cr-export"><button class="btn btn-ghost-sm" onclick="CR.ph.toggleFamCols()"><i class="fa-solid fa-table-columns"></i> Answers' + (nCols ? ' · ' + nCols : '') + '</button>' +
      (fam.colsOpen ? '<div class="cr-export-menu cr-cols-menu"><div class="cr-export-label">Show as columns</div>' +
        CR.reg.questions.map(q => '<label><input type="checkbox"' + (fam.cols[q.id] ? ' checked' : '') + ' onchange="CR.ph.toggleFamCol(\'' + q.id + '\')"> ' + escHtml(q.label) + '</label>').join('') +
      '</div>' : '') + '</div>';
  return '<div class="detail-card" id="cr-clients">' +
    '<div class="cr-offer-head"><div><div class="detail-card-header" style="margin:0;">Clients</div>' +
      '<div class="cr-offer-sub">Every registered family: their children, answers, gallery match and credit.</div></div>' +
      '<div class="cr-offer-head-right"><div class="cr-seg cr-view-seg">' + views + '</div>' +
        '<button class="btn btn-ghost-sm" onclick="toast(\'Exporting ' + rows.filter(CR.ph.FAM_FILTERS[fam.view].find(f => f[0] === fam.filter[fam.view])[2]).length +
          ' clients with the columns shown…\')"><i class="fa-solid fa-download"></i> Export <span class="cr-placeholder">[format]</span></button></div></div>' +
    '<div class="cr-bal-tools"><div class="cr-seg">' + seg + '</div>' +
      '<div class="cr-bal-tools-right">' + answers +
        '<div class="cr-bal-search"><i class="fa-solid fa-magnifying-glass"></i><input class="f-input" placeholder="Find a parent, child or email" value="' + escHtml(fam.search) + '" oninput="CR.ph.setFamSearch(this.value)"></div>' +
      '</div></div>' +
    '<div id="cr-fam-body">' + CR.ph.famBodyHTML() + '</div>' +
  '</div>';
};

CR.ph.famBodyHTML = function () {
  const fam = CR.ph.fam, credit = fam.view === 'credit', q = fam.search.trim().toLowerCase();
  const all = CR.ph.familyRows(), filter = CR.ph.FAM_FILTERS[fam.view].find(f => f[0] === fam.filter[fam.view]);
  const rows = all.filter(filter[2])
    .filter(f => !q || (f.parent + ' ' + f.email + ' ' + f.children.map(c => c.name).join(' ')).toLowerCase().indexOf(q) >= 0)
    .sort(credit ? (a, b) => (b.credit.left - a.credit.left) || a.parent.localeCompare(b.parent)
      : (a, b) => b.date.localeCompare(a.date) || (b.live ? 1 : 0) - (a.live ? 1 : 0) || a.parent.localeCompare(b.parent));
  const shown = fam.all || q ? rows : rows.slice(0, 10);
  const qs = CR.reg.questions.filter(x => fam.cols[x.id]);
  const stack = (f, fn) => f.children.map(fn).map(v => '<div>' + v + '</div>').join('');
  const chip = c => !c ? '<span class="cr-muted">No credit</span>'
    : c.left > 0 ? '<span class="chip chip-teal">' + CR.money(c.left) + ' left</span>' : '<span class="chip chip-gray">Used up</span>';
  const last = c => {
    const o = c.orders.filter(x => x.date).sort((a, b) => b.date.localeCompare(a.date))[0];
    return o ? 'Order ' + o.id + ' · ' + CR.fmtDate(o.date) : 'Bought ' + (c.bought ? CR.fmtDate(c.bought) : '');
  };
  const parent = f => '<td><i class="fa-solid fa-chevron-right cr-bal-caret"></i><b>' + escHtml(f.parent) + '</b>' + (f.live ? ' <span class="cr-demo-tag">Test user</span>' : '') +
    '<div class="cr-rep-sub" style="margin-left:18px;">' + escHtml(f.email || '—') + '</div></td>';
  const head = credit
    ? '<th>Parent</th><th>Children</th><th>Bought</th><th class="cr-num">Spent</th><th class="cr-num">Outstanding</th><th class="cr-num">Orders</th><th>Last activity</th>'
    : '<th>Parent</th>' + qs.map(x => '<th>' + escHtml(x.label) + '</th>').join('') + '<th>Registered</th><th>Gallery</th><th>Credit</th>';
  const cols = credit ? 7 : 4 + qs.length;
  const body = shown.map(f => {
    const c = f.credit, open = fam.open === f.key;
    const cells = credit
      ? '<td>' + stack(f, ch => ch.noReg ? '<span class="cr-muted">No registration</span>' : escHtml(ch.name) + ' <span class="cr-rep-sub" style="display:inline;">' + escHtml(ch.folder || '') + '</span>') + '</td>' +
        '<td>' + CR.money(c.paid) + ' → ' + CR.money(c.face) + '<div class="cr-rep-sub">' + (c.bought ? CR.fmtDate(c.bought) : '') + '</div></td>' +
        '<td class="cr-num">' + CR.money(c.spent) + '</td>' +
        '<td class="cr-num"><b class="' + (c.left > 0 ? '' : 'cr-muted') + '">' + CR.money(c.left) + '</b></td>' +
        '<td class="cr-num">' + c.orders.length + '</td>' +
        '<td class="type-cell">' + last(c) + '</td>'
      : qs.map(x => '<td class="type-cell">' + stack(f, ch => ch.noReg ? '<span class="cr-muted">No registration</span>' : escHtml(ch.values[x.id] || '—')) + '</td>').join('') +
        '<td class="type-cell">' + stack(f, ch => ch.noReg ? '<span class="cr-muted">No registration</span>' : CR.fmtDate(ch.date)) + '</td>' +
        '<td>' + stack(f, ch => ch.noReg ? '<span class="cr-muted">—</span>' : ch.matched ? '<span class="cr-reg-matched"><i class="fa-solid fa-check"></i> Matched</span>' : '<span class="chip chip-orange">Not matched yet</span>') + '</td>' +
        '<td>' + chip(c) + '</td>';
    return '<tr class="cr-bal-row' + (open ? ' open' : '') + '" onclick="CR.ph.toggleFamRow(\'' + f.key + '\')">' + parent(f) + cells + '</tr>' +
      (open ? '<tr class="cr-bal-detail"><td colspan="' + cols + '">' + CR.ph.famDetailHTML(f) + '</td></tr>' : '');
  }).join('');
  const sum = k => rows.reduce((t, f) => t + f.credit[k], 0);
  const subjects = all.reduce((t, f) => t + f.children.filter(c => !c.noReg).length, 0);
  const foot = credit
    ? '<td colspan="2">' + rows.length + (rows.length === 1 ? ' client' : ' clients') + '</td><td>' + CR.money(sum('paid')) + ' → ' + CR.money(sum('face')) + '</td>' +
      '<td class="cr-num">' + CR.money(sum('spent')) + '</td><td class="cr-num">' + CR.money(sum('left')) + '</td>' +
      '<td class="cr-num">' + rows.reduce((t, f) => t + f.credit.orders.length, 0) + '</td><td></td>'
    : '<td colspan="' + cols + '">' + (fam.filter.reg === 'all' && !q
        ? all.length + ' families · ' + subjects + ' of ' + JOBS.riverside.po.regTotal + ' subjects registered'
        : rows.length + ' of ' + all.length + ' families') + '</td>';
  return '<div class="gallery-table-wrap cr-rep-wrap"><table class="gallery-table cr-bal">' +
      '<thead><tr>' + head + '</tr></thead>' +
      '<tbody>' + (body || '<tr><td colspan="' + cols + '" style="text-align:center; padding:24px; color:var(--text-3);">No clients match.</td></tr>') + '</tbody>' +
      '<tfoot><tr>' + foot + '</tr></tfoot>' +
    '</table></div>' +
    (shown.length < rows.length ? '<button class="btn btn-ghost-sm cr-bal-more" onclick="CR.ph.showAllFam()">Show all ' + rows.length + ' clients</button>' : '');
};

/* One family: contact, each child (answers and gallery), and their credit history. */
CR.ph.famDetailHTML = function (f) {
  const contact = f.live ? (JOBS.riverside.contacts || []).find(x => x[2] === f.email) : null;
  const child = c => {
    if (c.noReg) return '<div class="cr-fam-child"><span class="cr-muted">No registration: bought credit with name and email only. Student details <span class="cr-placeholder">[student details: pending]</span></span></div>';
    const g = c.gallery || (c.matched ? { name: (c.name || '').split(' ').reverse().join(', '), folder: c.folder } : null);
    return '<div class="cr-fam-child"><b>' + escHtml(c.name) + '</b> <span class="cr-muted">· registered ' + CR.fmtDate(c.date) + '</span>' +
      CR.reg.questions.map(x => '<div class="cr-reg-ans"><span>' + escHtml(x.label) + '</span><b>' + escHtml(c.values[x.id] || '—') + '</b></div>').join('') +
      '<div class="cr-reg-ans"><span>Gallery</span>' + (g ? '<a class="gallery-name-link">' + escHtml(g.name) + '</a>' : '<span class="chip chip-orange">Not matched yet</span>') + '</div></div>';
  };
  return '<div class="cr-fam-detail">' +
    '<div><div class="cr-export-label">Parent or guardian</div><b>' + escHtml(f.parent) + '</b><br>' + escHtml(f.email || '—') +
      (contact && contact[3] !== '—' ? '<br>' + escHtml(contact[3]) : '') +
      (f.live && f.credit ? CR.ph.correctEmailHTML(f.clientId) : '') + '</div>' +
    '<div><div class="cr-export-label">' + (f.children.length === 1 ? 'Child' : 'Children') + '</div>' + f.children.map(child).join('') + '</div>' +
    '<div><div class="cr-export-label">Credit</div>' + (f.credit ? CR.ph.balanceHistoryHTML(f.credit) : '<span class="cr-muted">No credit bought</span>') + '</div>' +
  '</div>';
};

/* ── Registration schedule ── */
CR.ph.regOpensDate = function (w) {
  return w.opens.mode === 'date' ? CR.ph.isoDate(w.opens.date) : w.opens.mode === 'before' ? CR.ph.shootPlus(-w.opens.days) : null;
};
CR.ph.regClosesDate = function (w) {
  if (w.closes.mode === 'date') return CR.ph.isoDate(w.closes.date);
  if (w.closes.mode === 'before') return CR.ph.shootPlus(-w.closes.days);
  if (w.closes.mode === 'after') return CR.ph.shootPlus(w.closes.days);
  return null;
};
/* 'off' | 'before' | 'open' | 'closed', from the switch, the schedule and the demo's "today". */
/* The schedule being edited, else the saved one. */
CR.ph.regWin = function () { return CR.ph.regDraft ? CR.ph.regDraft.window : CR.reg.window; };
CR.ph.regState = function (win) {
  if (!CR.reg.on) return 'off';
  const w = win || CR.reg.window, today = CR.demoToday(), o = CR.ph.regOpensDate(w), c = CR.ph.regClosesDate(w);
  if (o && today < o) return 'before';
  if (c && today > c) return 'closed';
  return 'open';
};
/* Two different things: registration ON/OFF is the photographer's switch (does this job use registration at all);
   OPEN is the result of the schedule while it's on (scheduled, open now, closed). */
CR.ph.regStatusText = function (win) {
  const w = win || CR.reg.window, st = CR.ph.regState(w), c = CR.ph.regClosesDate(w);
  if (st === 'off') return 'Not used on this job';
  if (st === 'before') return 'Scheduled · opens ' + CR.ph.fmtD(CR.ph.regOpensDate(w));
  if (st === 'closed') return 'Closed · since ' + CR.ph.fmtD(c);
  return 'Open now' + (c ? ' · closes ' + CR.ph.fmtD(c) : ' · no end date');
};
CR.ph.regStatusHTML = function (win) {
  const st = CR.ph.regState(win);
  const cls = st === 'open' ? 'chip-teal' : st === 'before' ? 'chip-orange' : 'chip-gray';
  return '<span class="chip ' + cls + '">' + CR.ph.regStatusText(win) + '</span>';
};
/* The on/off switch, with its state in words so it isn't read as "open". */
CR.ph.regSwitchHTML = function (on) {
  return '<span class="cr-reg-switch"><span>' + (on ? 'On' : 'Off') + '</span>' +
    '<button class="toggle' + (on ? ' on' : '') + '" onclick="CR.ph.toggleRegistration()" aria-label="Use registration on this job" title="Use registration on this job"></button></span>';
};
/* Typing a date or a number of days refreshes the dates and status only; changing a mode re-renders. */
CR.ph.setRegWindow = function (end, key, v) {
  CR.ph.regWin()[end][key] = key === 'days' ? Math.max(0, Math.round(+v || 0)) : v;
  if (key === 'mode') { CR.ph.render(); return; }
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  const w = CR.ph.regWin();
  set('cr-reg-opens-res', CR.ph.fmtD(CR.ph.regOpensDate(w)) === '—' ? 'now' : CR.ph.fmtD(CR.ph.regOpensDate(w)));
  set('cr-reg-closes-res', CR.ph.regClosesDate(w) ? CR.ph.fmtD(CR.ph.regClosesDate(w)) : '');
  set('cr-reg-status', CR.ph.regStatusHTML(w));
  set('cr-reg-sched-note', CR.ph.regScheduleNote());
  CR.ph.refreshTimelines();
};
CR.ph.regScheduleNote = function () {
  const w = CR.ph.regWin(), o = CR.ph.regOpensDate(w), c = CR.ph.regClosesDate(w);
  if (o && c && c < o) return '<div class="cr-err">Registration closes before it opens.</div>';
  const creditCloses = CR.offer.status !== 'empty' && CR.settings.creditSalesOn ? CR.ph.closesDate(CR.offer.window) : null;
  if (c && creditCloses && c < creditCloses) {
    return '<div class="cr-note"><i class="fa-solid fa-circle-info"></i> Registration closes before credit sales close (' + CR.ph.fmtD(creditCloses) +
      '). Families who haven’t registered by ' + CR.ph.fmtD(c) + ' can’t buy credit.</div>';
  }
  return '';
};
CR.ph.regScheduleHTML = function () {
  const w = CR.ph.regWin();
  const sel = (end, opts, cur) => '<select class="f-input cr-select" onchange="CR.ph.setRegWindow(\'' + end + '\',\'mode\',this.value)">' +
    opts.map(op => '<option value="' + op[0] + '"' + (op[0] === cur ? ' selected' : '') + '>' + op[1] + '</option>').join('') + '</select>';
  const daysIn = end => '<input class="f-input cr-days" type="number" min="0" value="' + w[end].days + '" oninput="CR.ph.setRegWindow(\'' + end + '\',\'days\',this.value)"><span class="cr-muted">days</span>';
  const dateIn = end => '<input class="f-input cr-date" type="date" value="' + w[end].date + '" oninput="CR.ph.setRegWindow(\'' + end + '\',\'date\',this.value)">';
  const o = CR.ph.regOpensDate(w), c = CR.ph.regClosesDate(w);
  const opensCtl = sel('opens', [['now', 'Now'], ['date', 'On a date'], ['before', 'Days before the shoot']], w.opens.mode) +
    (w.opens.mode === 'date' ? dateIn('opens') : w.opens.mode === 'before' ? daysIn('opens') : '');
  const closesCtl = sel('closes', [['none', 'No end date'], ['date', 'On a date'], ['before', 'Days before the shoot'], ['after', 'Days after the shoot']], w.closes.mode) +
    (w.closes.mode === 'date' ? dateIn('closes') : w.closes.mode === 'before' || w.closes.mode === 'after' ? daysIn('closes') : '');
  return '<div class="cr-rule-row" style="margin-top:4px;"><span class="cr-muted">Result:</span><span id="cr-reg-status">' + CR.ph.regStatusHTML(w) + '</span></div>' +
    '<div class="cr-window-row"><span class="cr-window-label">Opens</span>' + opensCtl + '<span class="cr-resolved" id="cr-reg-opens-res">' + (o ? CR.ph.fmtD(o) : 'now') + '</span></div>' +
    '<div class="cr-window-row"><span class="cr-window-label">Closes</span>' + closesCtl + '<span class="cr-resolved" id="cr-reg-closes-res">' + (c ? CR.ph.fmtD(c) : '') + '</span></div>' +
    '<div id="cr-reg-sched-note" style="margin-top:8px;">' + CR.ph.regScheduleNote() + '</div>';
};

/* Registration has its own card: it works with or without a credit offer. */
/* Like the credit offer: an overview with an Edit link per part, and steps to edit them. One draft holds the
   schedule and the form; Save changes writes both, Cancel drops both. The on/off switch applies straight away. */
CR.ph.REG_STEPS = [[1, 'Schedule'], [2, 'Registration form'], [3, 'Review & save']];
CR.ph.regDraft = null;
CR.ph.startRegEdit = function (step) {
  CR.ph.regDraft = JSON.parse(JSON.stringify({ window: CR.reg.window, questions: CR.reg.questions }));
  CR.ph.regStep = step || 1;
  CR.ph.regTried = false;
  CR.ph.render();
  const el = document.getElementById('cr-registration');
  if (el) el.scrollIntoView({ block: 'nearest' });
};
CR.ph.cancelRegEdit = function () { CR.ph.regDraft = null; CR.ph.render(); };
CR.ph.goRegStep = function (n) { CR.ph.regStep = n; CR.ph.render(); };
CR.ph.regErrors = function () {
  const w = CR.ph.regDraft.window, o = CR.ph.regOpensDate(w), c = CR.ph.regClosesDate(w);
  return o && c && c < o ? ['Registration closes before it opens.'] : [];
};
CR.ph.saveReg = function () {
  CR.ph.regTried = true;
  if (CR.ph.regErrors().length) { CR.ph.regStep = 1; CR.ph.render(); return; }
  CR.reg.window = CR.ph.regDraft.window;
  CR.reg.questions = CR.ph.regDraft.questions;
  CR.ph.regDraft = null;
  toast('Registration saved');
  CR.changed();
};

CR.ph.regScheduleText = function (w) {
  const o = CR.ph.regOpensDate(w), c = CR.ph.regClosesDate(w);
  const opens = w.opens.mode === 'now' ? 'Opens now' : 'Opens ' + CR.ph.fmtD(o) + (w.opens.mode === 'before' ? ' (' + w.opens.days + ' days before the shoot)' : '');
  const closes = w.closes.mode === 'none' ? 'no end date' : 'closes ' + CR.ph.fmtD(c) +
    (w.closes.mode === 'before' ? ' (' + w.closes.days + ' days before the shoot)' : w.closes.mode === 'after' ? ' (' + w.closes.days + ' days after the shoot)' : '');
  return opens + ' · ' + closes;
};
CR.ph.regSummaryHTML = function (w, qs, onEdit) {
  const row = (n, label, body) => '<div class="cr-ov-row">' +
    '<div class="cr-ov-label"><span class="cr-ov-num">' + n + '</span>' + label + '</div>' +
    '<div class="cr-ov-body">' + body + '</div>' +
    '<button class="cr-ov-edit" onclick="' + onEdit(n) + '">Edit</button></div>';
  return '<div class="cr-ov">' +
    row(1, 'Schedule', CR.ph.regStatusHTML(w) + '<div class="cr-muted" style="margin-top:4px;">' + CR.ph.regScheduleText(w) + '</div>') +
    row(2, 'Registration form', 'Parent or guardian: ' + CORE_FIELDS_REG.map(f => f.label + (f.canDisable ? '' : ' (required)')).join(' · ') +
      '<div style="margin-top:4px;"><b>' + qs.length + (qs.length === 1 ? ' question' : ' questions') + ' for each child:</b> ' +
      qs.map(q => escHtml(q.label) + (q.required ? ' (required)' : '')).join(', ') + '</div>') +
  '</div>';
};

CR.ph.registrationCardHTML = function () {
  const head = '<div class="cr-offer-head"><div><div class="detail-card-header" style="margin:0;">Registration</div>' +
      '<div class="cr-offer-sub">Families register from the registration link and get matched to their gallery. Works with or without credit.</div></div>' +
      '<div class="cr-offer-head-right">' + CR.ph.exportHTML('card') +
        (CR.ph.regDraft ? '' : '<button class="btn btn-ghost" onclick="CR.ph.startRegEdit(1)">Edit registration</button>') +
        CR.ph.regSwitchHTML(CR.reg.on) + '</div></div>';
  if (!CR.ph.regDraft) {
    return '<div class="detail-card" id="cr-registration">' + head +
      CR.ph.regSummaryHTML(CR.reg.window, CR.reg.questions, n => 'CR.ph.startRegEdit(' + n + ')') + CR.ph.feeRowHTML() + '</div>';
  }
  const d = CR.ph.regDraft, n = CR.ph.regStep, errs = CR.ph.regTried ? CR.ph.regErrors() : [];
  const nav = CR.ph.REG_STEPS.map(s => '<button class="cr-stepnav-item' + (s[0] === n ? ' on' : ' done') + (s[0] === 1 && CR.ph.regErrors().length ? ' bad' : '') + '" onclick="CR.ph.goRegStep(' + s[0] + ')">' +
    '<span class="cr-stepnav-num">' + s[0] + '</span><span class="cr-stepnav-label">' + s[1].replace('&', '&amp;') + '</span></button>').join('<i class="cr-stepnav-line"></i>');
  const body = n === 1
    ? '<div class="cr-section-sub">When the registration link accepts registrations. Outside these dates families see when registration opens, or that it has closed.</div>' +
      '<div id="cr-reg-timeline">' + CR.ph.timelineHTML() + '</div>' + CR.ph.regScheduleHTML()
    : n === 2 ? CR.ph.questionsHTML(d.questions)
    : '<div class="cr-section-sub">Check the registration before you save. Changes apply to the registration link straight away.</div>' +
      CR.ph.regSummaryHTML(d.window, d.questions, k => 'CR.ph.goRegStep(' + k + ')') +
      '<button class="btn btn-ghost-sm cr-preview-btn" onclick="CR.cl.openPreview(\'register\', CR.offer)"><i class="fa-regular fa-eye"></i> Preview registration page</button>';
  return '<div class="detail-card cr-edit" id="cr-registration">' + head +
    '<div class="cr-stepnav">' + nav + '</div>' +
    '<div class="cr-step-title">Step ' + n + ' of 3 · ' + CR.ph.REG_STEPS[n - 1][1].replace('&', '&amp;') + '</div>' +
    body +
    '<div class="cr-err cr-foot-err">' + errs.join(' ') + '</div>' +
    '<div class="cr-edit-foot cr-step-foot"><div><button class="btn btn-ghost" onclick="CR.ph.cancelRegEdit()">Cancel</button></div>' +
      '<div class="cr-step-foot-right">' + (n < 3 ? '<button class="btn btn-ghost" onclick="CR.ph.goRegStep(' + (n + 1) + ')">Next: ' + CR.ph.REG_STEPS[n][1].replace('&', '&amp;') + ' <i class="fa-solid fa-chevron-right"></i></button>' : '') +
      '<button class="btn btn-brand" onclick="CR.ph.saveReg()">Save changes</button></div></div>' +
  '</div>';
};

CR.ph.questionsHTML = function (qs) {
  const rows = qs.map((q, i) =>
    '<div class="cr-q-row">' +
      '<span class="cr-q-num">' + (i + 1) + '</span>' +
      '<input class="f-input cr-q-label" value="' + escHtml(q.label) + '" aria-label="Question ' + (i + 1) + '" oninput="CR.ph.setQ(\'' + q.id + '\',\'label\',this.value)">' +
      '<select class="f-input cr-q-type" aria-label="Answer type" onchange="CR.ph.setQ(\'' + q.id + '\',\'type\',this.value,true)">' +
        CR.ph.qTypes.map(t => '<option value="' + t[0] + '"' + (q.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>').join('') +
      '</select>' +
      '<label class="cr-q-req"><input type="checkbox"' + (q.required ? ' checked' : '') + ' onchange="CR.ph.setQ(\'' + q.id + '\',\'required\',this.checked)"> Required</label>' +
      '<button class="cr-icon-btn" title="Remove question" onclick="CR.ph.removeQ(\'' + q.id + '\')"><i class="fa-solid fa-xmark"></i></button>' +
      (q.type === 'choice' ? '<div class="cr-q-options"><span>Options</span><input class="f-input" value="' + escHtml(q.options.join(', ')) + '" placeholder="Separate options with commas" oninput="CR.ph.setQ(\'' + q.id + '\',\'options\',this.value)"></div>' : '') +
    '</div>').join('');
  return '<div class="cr-section"><div class="cr-section-title">Registration form</div>' +
      '<div class="cr-section-sub">Parent or guardian first: ' + CORE_FIELDS_REG.map(f => f.label + (f.canDisable ? '' : ' (required)')).join(' · ') +
      '. The primary contact’s email holds the credit; they confirm it with an access code to spend it. Then these questions, asked for each child.</div></div>' +
    '<div class="cr-section" style="border-top:0; margin-top:0; padding-top:0;"><div class="cr-section-title">Questions for each child <span class="cr-muted">' + qs.length + ' · no limit</span></div>' +
      rows +
      '<div class="cr-q-foot"><button class="btn btn-ghost-sm" onclick="CR.ph.addQ()"><i class="fa-solid fa-plus"></i> Add question</button>' +
      '<span class="cr-muted">Answer types: text, choice, date. <span class="cr-placeholder">[more field types]</span></span></div>' +
    '</div>';
};

/* Typing in a question updates it quietly; type and removal re-render. */
/* Questions save as they're edited, like the other registration settings. */
CR.ph.qs = function () { return CR.ph.regDraft ? CR.ph.regDraft.questions : CR.reg.questions; };
CR.ph.setQ = function (id, key, v, rerender) {
  const q = CR.ph.qs().find(x => x.id === id);
  if (!q) return;
  if (key === 'options') q.options = v.split(',').map(x => x.trim()).filter(Boolean);
  else q[key] = v;
  if (key === 'type' && v === 'choice' && !q.options.length) q.options = [];
  if (rerender) CR.ph.render();
};
CR.ph.addQ = function () {
  CR.ph.qs().push({ id: 'q' + CR.reg.nextId++, label: 'New question', type: 'text', required: false, options: [] });
  CR.ph.render();
};
CR.ph.removeQ = function (id) {
  const qs = CR.ph.qs();
  qs.splice(qs.findIndex(q => q.id === id), 1);
  CR.ph.render();
};

/* ── Credit emails (decided 2026-11-05): the pre-order invite, who reminders go to, the balance variable ──
   Faked: nothing is sent; a send or schedule is recorded. Recipient counts are sample figures. */
CR.ph.inviteSend = function (when) {
  const o = CR.ph.opensDate(CR.offer.window);
  CR.emails.invite = when === 'now' ? { state: 'sent', date: CR.demoToday() } : { state: 'scheduled', date: o };
  toast(when === 'now' ? 'Invite recorded as sent (not sent in the prototype)' : 'Invite scheduled for ' + CR.ph.fmtD(o));
  CR.changed();
};
CR.ph.inviteCancel = function () { CR.emails.invite = { state: 'none', date: null }; CR.changed(); };
CR.ph.previewInvite = function () {
  const c = CR_DATA.clients.find(x => CR.registered[x.id] && !CR.summary(x.id).face) || CR_DATA.clients[0];
  CR.cl.open(c.id, 'emailInvite');
};
CR.ph.emailsCardHTML = function () {
  const inv = CR.emails.invite, opens = CR.ph.opensDate(CR.offer.window), live = CR.offer.status === 'published';
  const who = CR.ph.audienceText(CR.offer).toLowerCase();
  const status = inv.state === 'sent' ? '<span class="chip chip-teal">Sent ' + CR.ph.fmtD(inv.date) + '</span>'
    : inv.state === 'scheduled' ? '<span class="chip chip-gray">Scheduled for ' + CR.ph.fmtD(inv.date) + '</span>' : '';
  const reminder = [['notPreordered', 'Has not pre-ordered'], ['notOrdered', 'Has not ordered'], ['all', 'Everyone registered']];
  return '<div class="detail-card" id="cr-emails">' +
    '<div class="detail-card-header" style="margin:0;">Credit emails</div>' +
    '<div class="cr-offer-sub">Invite families to pre-order and remind the ones who haven’t. Nothing is sent from the prototype.</div>' +
    '<div class="cr-mail-row"><div class="cr-mail-main"><b>Pre-order invite</b> ' + status +
        '<small>To registered ' + who + ' <span class="cr-placeholder">[sample count]</span> · with a link to buy credit</small></div>' +
      '<div class="cr-mail-actions">' +
        (inv.state === 'none'
          ? '<button class="btn btn-ghost-sm"' + (live ? ' onclick="CR.ph.inviteSend(\'now\')"' : ' disabled title="Publish the offer first"') + '>Send now</button>' +
            '<button class="btn btn-ghost-sm"' + (live ? ' onclick="CR.ph.inviteSend(\'schedule\')"' : ' disabled title="Publish the offer first"') + '>Schedule for when pre-order opens (' + CR.ph.fmtD(opens) + ')</button>'
          : '<button class="btn btn-ghost-sm" onclick="CR.ph.inviteCancel()">' + (inv.state === 'scheduled' ? 'Cancel schedule' : 'Undo (demo)') + '</button>') +
        '<button class="btn btn-ghost-sm" onclick="CR.ph.previewInvite()"><i class="fa-regular fa-eye"></i> Preview</button>' +
      '</div></div>' +
    '<div class="cr-mail-row"><div class="cr-mail-main"><b>Reminders before credit sales close</b>' +
        '<small>“Has not pre-ordered” is families without credit; “Has not ordered” is families without a gallery order. They’re separate filters.</small></div>' +
      '<div class="cr-mail-actions"><label class="cr-muted">Recipients <select class="f-input cr-select" onchange="CR.emails.reminderTo=this.value; CR.changed()">' +
        reminder.map(r => '<option value="' + r[0] + '"' + (CR.emails.reminderTo === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') + '</select></label></div></div>' +
    '<div class="cr-mail-row"><div class="cr-mail-main"><b>Credit balance in email templates</b>' +
        '<small>Insert <code class="cr-var">{credit balance}</code> in any email. It’s hidden for recipients with no credit.</small></div></div>' +
  '</div>';
};

/* ── Registration fee (ecom meeting 2026-11-05): paid in one checkout with any credit, after the credit offer. Robert's
   prototype has no fee setting, so the amount is a sample. ── */
CR.ph.feeRowHTML = function () {
  const f = CR.reg.fee;
  return '<div class="toggle-row cr-fee-row"><div>' +
      '<div class="toggle-row-title">Registration fee</div>' +
      '<div class="toggle-row-desc">' + (f.on ? CR.money(f.amount) + ' <span class="cr-placeholder">[sample registration fee]</span> per registration. ' : '') +
        'Families see the credit offer before paying it, and pay the fee and any credit in one checkout.</div>' +
    '</div><button class="toggle' + (f.on ? ' on' : '') + '" onclick="CR.reg.fee.on=!CR.reg.fee.on; CR.changed()" aria-label="Registration fee"></button></div>';
};

/* ── Correct email (ecom meeting 2026-11-05): the photographer fixes the email on a family's credit, for that same
   family only (not a transfer). Every change is logged. The family then confirms the new email with the access code.
   Faked: the log lives in demo state; a users reset puts the sample email back. ── */
CR.ph.emailFix = null;   /* clientId being corrected */
CR.ph.startEmailFix = function (id) { CR.ph.emailFix = id; CR.ph.emailFixErr = ''; CR.ph.refreshFam(); };
CR.ph.correctEmailHTML = function (id) {
  const log = (CR.emailLog[id] || []).map(l =>
    '<div class="cr-email-log-row"><b>' + escHtml(l.from) + ' → ' + escHtml(l.to) + '</b>' +
      '<span>' + escHtml(l.who) + ' · ' + CR.fmtDate(l.date) + (l.reason ? ' · ' + escHtml(l.reason) : '') + '</span></div>').join('');
  const logHTML = log ? '<div class="cr-email-log"><div class="cr-export-label">Email changes</div>' + log + '</div>' : '';
  if (CR.ph.emailFix !== id) {
    return '<div><button class="btn btn-ghost-sm cr-fix-btn" onclick="event.stopPropagation(); CR.ph.startEmailFix(\'' + id + '\')"><i class="fa-regular fa-pen-to-square"></i> Correct email</button></div>' + logHTML;
  }
  return '<div class="cr-email-fix" onclick="event.stopPropagation()">' +
      '<div class="cr-export-label">Correct email</div>' +
      '<div class="cr-muted" style="margin-bottom:6px;">Same family only: the credit stays with them under the corrected address.</div>' +
      '<label class="cr-fix-field"><span>Current email</span><input class="f-input" value="' + escHtml(CR.client(id).email) + '" readonly></label>' +
      '<label class="cr-fix-field"><span>New email</span><input class="f-input" id="cr-fix-new" type="email"></label>' +
      '<label class="cr-fix-field"><span>Reason</span><input class="f-input" id="cr-fix-reason" placeholder="For example: typo at purchase, family asked by phone"></label>' +
      (CR.ph.emailFixErr ? '<div class="cr-err">' + CR.ph.emailFixErr + '</div>' : '') +
      '<div class="cr-guard-actions"><button class="btn btn-ghost-sm" onclick="CR.ph.emailFix=null; CR.ph.refreshFam()">Cancel</button>' +
        '<button class="btn btn-ghost-sm cr-btn-warn" onclick="CR.ph.saveEmailFix(\'' + id + '\')">Save email</button></div>' +
    '</div>' + logHTML;
};
CR.ph.saveEmailFix = function (id) {
  const c = CR.client(id), to = (document.getElementById('cr-fix-new').value || '').trim(), reason = (document.getElementById('cr-fix-reason').value || '').trim();
  const err = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to) ? 'Check the email address.'
    : to.toLowerCase() === c.email.toLowerCase() ? 'That’s the current email.'
    : CR.cl.byEmail(to) ? 'Another family uses that email. Credit can’t move between families.'
    : !reason ? 'Add a reason for the log.' : '';
  if (err) {
    CR.ph.emailFixErr = err; CR.ph.refreshFam();
    document.getElementById('cr-fix-new').value = to; document.getElementById('cr-fix-reason').value = reason;
    return;
  }
  const row = (JOBS.riverside.contacts || []).find(r => r[2] === c.email);
  if (row) row[2] = to;
  (CR.emailLog[id] = CR.emailLog[id] || []).push({ who: CR_DATA.photographer.name, date: CR.todayISO(), from: c.email, to: to, reason: reason });
  c.email = to;
  delete CR.loggedIn[id];   /* the family confirms the new email with the access code */
  CR.ph.emailFix = null;
  toast('Email corrected · ' + c.name.split(' ')[0] + ' confirms it with an access code next time');
  CR.changed();
};
