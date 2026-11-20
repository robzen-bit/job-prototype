/* Photographer, after the sale: Reports › Orders on the Riverside job.
   An order paid with credit is a normal order with extra fields: credit applied, card charged, source credit offer.
   Credit orders are tagged and filterable, credit and card amounts are separate columns, registration answers are
   optional columns. Approving an order pays it out: the credit part proportionally (see CR.creditPayouts), the card
   part in full. Robert's other jobs keep his Orders table unchanged. */
CR.rep = { paid: 'all', cols: {}, colsOpen: false };

CR.rep.mount = function () {
  const pane = document.getElementById('rep-orders');
  const el = document.createElement('div');
  el.id = 'cr-orders';
  el.hidden = true;
  pane.appendChild(el);
  CR.onChange(CR.rep.render);
};

/* Robert's openJob() and his filters call renderOrders(); on Riverside the credits table replaces his. */
const crRobertRenderOrders = renderOrders;
renderOrders = function () {
  crRobertRenderOrders();
  CR.rep.render();
};

CR.rep.isRiverside = function () { return currentJob && currentJob.key === 'riverside'; };
CR.rep.open = function () {
  switchJobTabById('tab-reports');
  const tab = document.querySelector('#tab-reports .subtab[onclick*="rep-orders"]');
  if (tab) switchReport(tab, 'rep-orders');
  CR.rep.render();
};

/* Credit orders from the ledger, then Robert's generated gallery orders (card only) for the rest of the job.
   His package pre-orders are left out: credits replace them. */
CR.rep.rows = function () {
  const credit = CR.orders.map(o => {
    const c = CR.client(o.clientId) || { name: '—' };
    const red = CR.events.find(e => e.type === 'redemption' && e.orderId === o.id);
    const gid = o.galleryId || (red && red.galleryId) || (c.galleries || [])[0];
    const g = CR_DATA.galleries.find(x => x.id === gid);
    const ans = ((CR.answers[o.clientId] || []).find(a => a.galleryId === gid) || {}).values || {};
    return {
      id: '#' + o.id.replace('o-', ''), order: o, date: o.date || (red && red.date), customer: c.name, gallery: g ? g.name : '—',
      folder: g ? g.folder : '—', answers: ans, credit: o.creditApplied || 0, card: o.cardCharged || 0, total: o.total
    };
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const card = ORDERS.filter(o => !o.pre).map(o => ({
    id: o.id, robert: o, dateText: fmtDate(o), customer: o.customer, gallery: o.gallery, folder: o.folder, answers: {},
    credit: 0, card: o.amt, total: o.amt
  }));
  return credit.concat(card);
};

/* ── Shortfall (decided 2026-11-05, explore): an order whose lab cost and fees exceed the money held for the credit
   spent on it. The photographer is asked first: accept and their account is charged the difference plus the Stripe
   fee, or decline and the order is cancelled and the family's credit restored. Depends on the zero-profit release.
   Faked: the amount is a fixed sample on one order (#1042). ── */
CR.rep.pendingShortfall = function () { return CR.orders.filter(o => o.shortfall && !o.shortfallDecision && o.status !== 'cancelled'); };
CR.rep.shortfall = function (orderId, accept) {
  const o = CR.orders.find(x => x.id === orderId);
  if (!o) return;
  o.shortfallDecision = accept ? 'accepted' : 'declined';
  if (accept) { toast('Charged ' + CR.money(o.shortfall) + ' + Stripe fee · order #' + orderId.replace('o-', '') + ' proceeds'); CR.changed(); return; }
  o.status = 'cancelled';
  toast('Order #' + orderId.replace('o-', '') + ' cancelled · ' + CR.money(o.creditApplied) + ' credit back to ' + CR.client(o.clientId).name);
  if (o.creditApplied) CR.add({ type: 'adjustment', clientId: o.clientId, amount: o.creditApplied, orderId: o.id, note: 'Order #' + o.id.replace('o-', '') + ' cancelled · credit back' });
  else CR.changed();
};
CR.rep.shortfallText = function (o) {
  return 'Order #' + o.id.replace('o-', '') + ' costs ' + CR.money(o.shortfall) + ' more than the credit held for it. Charge your account ' + CR.money(o.shortfall) + ' plus <span class="cr-placeholder">[Stripe fee]</span>?';
};
CR.rep.shortfallHTML = function () {
  return CR.rep.pendingShortfall().map(o =>
    '<div class="ecom-warn cr-guard cr-shortfall"><i class="fa-solid fa-triangle-exclamation"></i><div>' +
      '<b>' + CR.rep.shortfallText(o) + '</b> ' + escHtml(CR.client(o.clientId).name) + ' paid less for this credit than the order costs to make. ' +
      'Declining cancels the order and gives the family their ' + CR.money(o.creditApplied) + ' of credit back' + (o.cardCharged ? '; the ' + CR.money(o.cardCharged) + ' card payment is refunded' : '') + '.' +
      '<div class="cr-guard-actions"><button class="btn btn-ghost-sm" onclick="CR.rep.shortfall(\'' + o.id + '\', false)">Decline</button>' +
      '<button class="btn btn-ghost-sm cr-btn-warn" onclick="CR.rep.shortfall(\'' + o.id + '\', true)">Accept</button></div></div></div>').join('');
};

CR.rep.statusHTML = function (r) {
  if (r.robert) return r.robert.status === 'Completed' ? '<span class="chip chip-teal">Completed</span>' : '<span class="chip chip-gray">Processing</span>';
  if (r.order.status === 'cancelled') return '<span class="chip chip-gray">Cancelled by photographer</span>';
  const sf = r.order.shortfall ? (r.order.shortfallDecision === 'accepted'
    ? '<div class="cr-rep-sub">You covered ' + CR.money(r.order.shortfall) + ' + <span class="cr-placeholder">[Stripe fee]</span></div>'
    : !r.order.shortfallDecision ? '<span class="chip chip-orange">Needs your decision</span> ' : '') : '';
  if (sf && !r.order.shortfallDecision) return sf;
  if (r.order.status === 'approved') return '<span class="chip chip-teal">Approved</span>' + sf;
  /* Standard 30-day approval window from the order date. */
  const due = r.date ? CR.dateFor(r.date) : null;
  if (due) due.setDate(due.getDate() + 30);
  return '<span class="chip chip-gray">Awaiting approval</span>' + (due ? '<div class="cr-rep-sub">Approve by ' + CR.ph.fmtD(due) + '</div>' : '') + sf;
};
CR.rep.payoutHTML = function (r) {
  if (r.robert) return r.robert.status === 'Completed' ? CR.money(r.total) : '<span class="cr-muted">on approval</span>';
  if (r.order.status === 'cancelled') return '<span class="cr-muted">—</span>';
  const p = CR.orderPayout(r.order), approved = r.order.status === 'approved';
  const split = r.credit ? '<div class="cr-rep-sub">' + CR.money(p.credit) + ' for ' + CR.money(r.credit) + ' credit' + (p.card ? ' + ' + CR.money(p.card) + ' card' : '') + '</div>' : '';
  return (approved ? '<b>' + CR.money(p.total) + '</b>' : '<span class="cr-muted">' + CR.money(p.total) + ' on approval</span>') + split;
};

CR.rep.approve = function (orderId) {
  const o = CR.orders.find(x => x.id === orderId), p = CR.orderPayout(o);
  CR.approve(orderId);
  toast('Order #' + orderId.replace('o-', '') + ' approved · ' + CR.money(p.total) + ' paid out' + (p.credit ? ', ' + CR.money(p.credit) + ' of it from secured funds' : ''));
};
CR.rep.setPaid = function (v) { CR.rep.paid = v; CR.rep.render(); };
CR.rep.toggleCol = function (id) { CR.rep.cols[id] = !CR.rep.cols[id]; CR.rep.render(); };
CR.rep.toggleColsMenu = function () { CR.rep.colsOpen = !CR.rep.colsOpen; CR.rep.render(); };

CR.rep.render = function () {
  const el = document.getElementById('cr-orders');
  if (!el) return;
  const pane = document.getElementById('rep-orders');
  const on = CR.rep.isRiverside();
  el.hidden = !on;
  /* Robert's filter row and table stay for every other job. */
  [pane.querySelector(':scope > .filter-row'), pane.querySelector(':scope > .gallery-table-wrap')].forEach(x => { if (x) x.style.display = on ? 'none' : ''; });
  if (!on) return;
  const all = CR.rep.rows();
  const rows = all.filter(r => CR.rep.paid === 'all' || (CR.rep.paid === 'credit' ? r.credit > 0 : r.credit === 0));
  const creditRows = all.filter(r => r.credit > 0);
  const awaiting = creditRows.filter(r => r.order.status !== 'approved' && r.order.status !== 'cancelled').length;
  const qs = CR.reg.questions.filter(q => CR.rep.cols[q.id]);
  const show = rows.slice(0, 50);
  const sum = (list, k) => list.reduce((t, r) => t + r[k], 0);
  const tag = r => r.credit && r.card ? '<span class="chip chip-orange">Credit</span> <span class="chip chip-gray">+ card</span>'
    : r.credit ? '<span class="chip chip-orange">Credit</span>' : '<span class="cr-muted">Card</span>';
  el.innerHTML = CR.rep.shortfallHTML() +
    '<div class="cr-rep-strip">' +
      '<span><b>' + creditRows.length + '</b> orders paid with credit</span>' +
      '<span>Credit applied <b>' + CR.money(sum(creditRows, 'credit')) + '</b></span>' +
      '<span>Card on those orders <b>' + CR.money(sum(creditRows, 'card')) + '</b></span>' +
      '<span>' + (awaiting ? '<b>' + awaiting + '</b> awaiting approval' : 'All approved') + '</span>' +
    '</div>' +
    '<div class="filter-row">' +
      '<div class="filter-field"><span class="filter-label">Paid with</span>' +
        '<select class="filter-select" onchange="CR.rep.setPaid(this.value)">' +
          [['all', 'All orders'], ['credit', 'Credit'], ['card', 'Card only']].map(o => '<option value="' + o[0] + '"' + (CR.rep.paid === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
        '</select></div>' +
      '<div class="cr-export"><button class="filter-clear cr-cols-btn" onclick="CR.rep.toggleColsMenu()"><i class="fa-solid fa-table-columns"></i> Registration answers' +
        (qs.length ? ' · ' + qs.length : '') + ' <i class="fa-solid fa-chevron-down" style="font-size:9px;"></i></button>' +
        (CR.rep.colsOpen ? '<div class="cr-export-menu cr-cols-menu"><div class="cr-export-label">Show as columns</div>' +
          CR.reg.questions.map(q => '<label><input type="checkbox"' + (CR.rep.cols[q.id] ? ' checked' : '') + ' onchange="CR.rep.toggleCol(\'' + q.id + '\')"> ' + escHtml(q.label) + '</label>').join('') +
        '</div>' : '') + '</div>' +
      '<span class="filter-count">' + rows.length + ' of ' + all.length + ' orders</span>' +
      '<button class="filter-clear" onclick="toast(\'Exporting orders with the columns shown…\')"><i class="fa-solid fa-download"></i> Export</button>' +
    '</div>' +
    '<div class="gallery-table-wrap cr-rep-wrap"><table class="gallery-table cr-rep">' +
      '<thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Gallery</th>' +
        qs.map(q => '<th>' + escHtml(q.label) + '</th>').join('') +
        '<th>Paid with</th><th class="cr-num">Credit</th><th class="cr-num">Card</th><th class="cr-num">Total</th><th>Status</th><th class="cr-num">Payout</th><th></th></tr></thead>' +
      '<tbody>' + show.map(r =>
        '<tr' + (r.credit ? ' class="cr-rep-credit"' : '') + '>' +
          '<td style="font-weight:600; color:var(--text);">' + r.id + '</td>' +
          '<td class="modified-cell">' + (r.dateText || (r.date ? CR.fmtDate(r.date) : '—')) + '</td>' +
          '<td>' + escHtml(r.customer) + '</td>' +
          '<td><a class="gallery-name-link">' + escHtml(r.gallery) + '</a></td>' +
          qs.map(q => '<td class="type-cell">' + escHtml(r.answers[q.id] || '—') + '</td>').join('') +
          '<td>' + tag(r) + '</td>' +
          '<td class="cr-num">' + (r.credit ? CR.money(r.credit) : '—') + '</td>' +
          '<td class="cr-num">' + (r.card ? CR.money(r.card) : '—') + '</td>' +
          '<td class="cr-num" style="font-weight:600; color:var(--text);">' + CR.money(r.total) + '</td>' +
          '<td>' + CR.rep.statusHTML(r) + '</td>' +
          '<td class="cr-num">' + CR.rep.payoutHTML(r) + '</td>' +
          '<td>' + (r.order && r.order.status === 'awaiting approval' && !(r.order.shortfall && !r.order.shortfallDecision) ? '<button class="btn btn-ghost-sm" onclick="CR.rep.approve(\'' + r.order.id + '\')">Approve</button>' : '') + '</td>' +
        '</tr>').join('') +
      '</tbody></table>' +
      '<div class="orders-foot"><span>Showing ' + show.length + ' of ' + rows.length + ' orders</span><b>' + rows.length + ' orders · ' + CR.money(sum(rows, 'total')) + '</b></div>' +
    '</div>';
};

CR.rep.mount();
