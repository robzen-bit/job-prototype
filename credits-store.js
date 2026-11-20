/* Client, after photos are ready: the store, checkout with credit and card, the order confirmation with the
   remainder. Opened from the photos-ready email or the gallery link. Credit applies only once the family is logged in
   (see "Access code" at the end of this file); a guest sees the store and pays by card. The shop is open to everyone:
   there's no standard selling switch (2026-11-05). Families without credit may have a minimum order.
   Kept to one child (the family's first gallery): a list of products, add and remove, checkout, and what the order
   does to the credit. Photo choice per item is not part of the prototype.
   A cart lives for one visit (closing the client view empties it). */
CR.st = { cart: [], lastOrderId: null };   /* cart: [{ productId, qty }] */

(function () {   /* every open of the client view is a new visit */
  const start = CR.cl.start;
  CR.cl.start = function (screen) { CR.st.cart = []; CR.st.childIdx = 0; CR.st.guestEmail = ''; CR.au.reset(); start(screen); };
})();

/* The child whose gallery this is: the family's first registered child with a gallery. */
CR.st.gallery = function () {
  const gs = (CR.answers[CR.cl.clientId] || []).map(a => CR_DATA.galleries.find(g => g.id === a.galleryId)).filter(Boolean);
  return gs[CR.st.childIdx || 0] || gs[0];   /* the account's "View photos" can open another child's gallery */
};
CR.st.first = function (g) { return g.name.split(', ')[1]; };
/* Credit is spendable only when logged in: a guest's balance is 0 everywhere in the store and checkout. */
CR.st.balance = function () { return CR.cl.authed() ? CR.balance(CR.cl.clientId) : 0; };
/* Minimum order (decided 2026-11-05): set on the price list, applies only to families who didn't buy credit. A guest
   counts as without credit until they log in. Counted on products only: shipping doesn't count (decided 2026-11-06). */
CR.st.minOrder = function () {
  const m = CR.settings.minOrder;
  if (!m || !m.on || !(m.amount > 0)) return 0;
  return CR.cl.authed() && CR.summary(CR.cl.clientId).face > 0 ? 0 : m.amount;
};
CR.st.minShort = function () { const m = CR.st.minOrder(); return m && CR.st.total() < m ? m - CR.st.total() : 0; };
CR.st.minHTML = function () {
  const short = CR.st.minShort();
  return short ? '<div class="cl-error cl-min">Minimum order ' + CR.money(CR.st.minOrder()) + '. Add ' + CR.money(short) + ' more to check out.</div>' : '';
};

/* ── Cart ── */
CR.st.qty = function (id) { const l = CR.st.cart.find(x => x.productId === id); return l ? l.qty : 0; };
CR.st.count = function () { return CR.st.cart.reduce((t, l) => t + l.qty, 0); };
CR.st.total = function () { return CR.st.cart.reduce((t, l) => t + CR.ph.product(l.productId).price * l.qty, 0); };   /* products only */
/* Shipping is part of the order total and credit pays for it like any product. Robert's prototype has no shipping
   amount setting, so the prototype uses one sample flat rate per order (see the shipping change note). */
CR.st.SHIPPING = 8;
CR.st.shipping = function () { return CR.st.cart.length ? CR.st.SHIPPING : 0; };
CR.st.hasPackage = function () { return CR.st.cart.some(l => CR.ph.product(l.productId).kind === 'package'); };
/* Package-first checkout (ADO 85337, aligned 2026-11-13): single items stay visible and addable; checkout is blocked
   while the cart holds single items and no package. A package alone, or a package plus single items, checks out. */
CR.st.pkgBlocked = function () { return CR.set.pkgFirstEffective() && CR.st.cart.length > 0 && !CR.st.hasPackage(); };
CR.st.PKG_MSG = 'A package is required to check out. Add a package to continue.';
CR.st.pkgMsgHTML = function () { return CR.st.pkgBlocked() ? '<div class="cl-error cl-pkg-req"><i class="fa-solid fa-box"></i> ' + CR.st.PKG_MSG + '</div>' : ''; };
/* Only sell packages (price list, mutually exclusive with package required): the shop lists packages only. What this
   means for credit is open ([only sell packages: pending]). */
CR.st.sellable = function (p) { return !(CR.settings.pkgOnlyPriceList && p.kind !== 'package'); };
CR.st.add = function (id) {
  const l = CR.st.cart.find(x => x.productId === id);
  if (l) l.qty++; else CR.st.cart.push({ productId: id, qty: 1 });
  CR.cl.render();
};
CR.st.less = function (id) {
  const l = CR.st.cart.find(x => x.productId === id);
  if (!l) return;
  l.qty--;
  CR.st.cart = CR.st.cart.filter(x => x.qty > 0);   /* removing the only package brings the checkout block back */
  CR.cl.render();
};
CR.st.removeLine = function (id) {
  const l = CR.st.cart.find(x => x.productId === id);
  if (l) { l.qty = 1; CR.st.less(id); }
};
/* What credit covers and what goes on the card: credit applies to the full total, products plus shipping.
   Anything credit doesn't cover goes on the card. */
CR.st.split = function () {
  const items = CR.st.total(), shipping = CR.st.shipping(), total = items + shipping, bal = CR.st.balance(), credit = Math.min(bal, total);
  return { items: items, shipping: shipping, total: total, before: bal, credit: credit, card: total - credit, left: bal - credit };
};

/* The +/− control on a product: "+" until it's in the cart, then "− n +". */
CR.st.stepperHTML = function (p) {
  const q = CR.st.qty(p.id);
  if (!q) return '<button class="cl-add" onclick="CR.st.add(\'' + p.id + '\')"' +
    ' aria-label="Add ' + p.name + '"><i class="fa-solid fa-plus"></i></button>';
  return '<span class="cl-stepper"><button onclick="CR.st.less(\'' + p.id + '\')" aria-label="One less"><i class="fa-solid fa-minus"></i></button>' +
    '<b>' + q + '</b><button onclick="CR.st.add(\'' + p.id + '\')" aria-label="One more"><i class="fa-solid fa-plus"></i></button></span>';
};

/* ── Store ── */
CR.st.creditBarHTML = function (s) {
  if (!CR.cl.authed()) return '<div class="cl-note"><i class="fa-solid fa-wallet"></i> <span>Bought credit? <button class="cl-link" onclick="CR.au.start(\'gallery\')">Log in to use it</button>.</span></div>';
  if (s.balance > 0) return '<div class="cl-credit-bar"><span><i class="fa-solid fa-wallet"></i> Your credit <small>applied at checkout</small></span><b>' + CR.money(s.balance) + '</b></div>';
  if (s.face > 0) return '<div class="cl-note"><i class="fa-solid fa-wallet"></i> You’ve used all your credit. You can still buy photos with a card.</div>';
  return '';
};
CR.st.galleryHTML = function () {
  const s = CR.summary(CR.cl.clientId), g = CR.st.gallery();
  const head = CR.cl.headerHTML() + CR.st.accountLinkHTML() + CR.st.creditBarHTML(s);
  if (!g) return head + '<div class="cl-note"><i class="fa-regular fa-hourglass-half"></i> Your photos are being matched to a gallery. We’ll email you when they’re ready.</div>';
  const who = '<div class="cl-gal-head"><b>' + CR.st.first(g) + '’s photos</b><small>' + g.folder + ' · ' + g.photos + ' photos</small></div>';
  const ex = CR.ph.examplesOf(CR.offer).filter(CR.st.sellable), exIds = ex.map(p => p.id);
  const rest = CR.ph.products().filter(p => exIds.indexOf(p.id) < 0 && CR.st.sellable(p));
  const n = CR.st.count();
  return head + who +
    (ex.length ? '<div class="cl-group-label">Popular choices</div>' +
      '<div class="cl-sub" style="margin-top:-4px;">Examples from ' + CR_DATA.photographer.studio + '.' + (CR.st.balance() > 0 ? ' Your credit buys anything below.' : '') + '</div>' +
      ex.map(CR.st.productHTML).join('') : '') +
    '<div class="cl-group-label">' + (ex.length ? 'Everything else' : 'Products') + '</div>' +
    rest.map(CR.st.productHTML).join('') +
    (n && CR.st.minShort() ? '<div class="cl-cartbar-min">Minimum order ' + CR.money(CR.st.minOrder()) + ' · add ' + CR.money(CR.st.minShort()) + ' more</div>' : '') +
    (n ? CR.st.pkgMsgHTML() + '<div class="cl-cartbar"><span><b>' + n + (n === 1 ? ' item' : ' items') + '</b> · ' + CR.money(CR.st.total()) + '</span>' +
      '<button' + (CR.st.pkgBlocked() ? ' disabled' : ' onclick="CR.cl.go(\'checkout\')"') + '>Checkout</button></div>' : '');
};
CR.st.productHTML = function (p) {
  return '<div class="cl-pkg">' + CR.ph.thumbHTML(p.id, CR.offer) +
    '<div class="cl-pkg-main"><b>' + p.name + '</b>' + (p.kind === 'package' ? (p.desc ? '<small class="cl-pkg-desc">' + escHtml(p.desc) + '</small>' : '') + '<small>' + p.sub + '</small>' : '') + '<small class="cl-price">' + CR.money(p.price) + '</small></div>' +
    CR.st.stepperHTML(p) +
  '</div>';
};

/* ── Checkout ── */
CR.st.checkoutHTML = function () {
  const g = CR.st.gallery(), sp = CR.st.split(), guest = !CR.cl.authed(), hasCredit = !guest && CR.summary(CR.cl.clientId).face > 0;
  const back = '<button class="cl-back" onclick="CR.cl.go(\'gallery\')"><i class="fa-solid fa-chevron-left"></i> Back to products</button>';
  if (!CR.st.cart.length) return back + '<div class="cl-section-title">Checkout</div><div class="cl-note" style="margin-top:12px;">Your cart is empty.</div>' +
    '<button class="cl-btn" onclick="CR.cl.go(\'gallery\')">Add products</button>';
  const blocked = CR.st.minShort() > 0 || CR.st.pkgBlocked();
  const lines = CR.st.cart.map(l => {
    const p = CR.ph.product(l.productId);
    return '<div class="cl-line">' + CR.ph.thumbHTML(p.id, CR.offer) +
      '<div class="cl-pkg-main"><b>' + p.name + '</b><small>' + CR.money(p.price) + (l.qty > 1 ? ' each' : '') + '</small>' +
        '<button class="cl-link cl-remove-link" onclick="CR.st.removeLine(\'' + p.id + '\')">Remove</button></div>' +
      '<div class="cl-line-right">' + CR.st.stepperHTML(p) + '<span>' + CR.money(p.price * l.qty) + '</span></div></div>';
  }).join('');
  const credit = sp.before > 0
    ? '<div class="cl-credit-calc">' +
        '<div class="cl-group-label" style="margin:0 0 6px;">Your credit</div>' +
        '<div class="cl-sum-row"><span>Credit now</span><b>' + CR.money(sp.before) + '</b></div>' +
        '<div class="cl-sum-row cl-green"><span>Used on this order</span><b class="cl-green">−' + CR.money(sp.credit) + '</b></div>' +
        '<div class="cl-sum-row cl-total"><span>Credit left after</span><b>' + CR.money(sp.left) + '</b></div>' +
      '</div>'
    : hasCredit ? '<div class="cl-note"><i class="fa-solid fa-wallet"></i> You’ve used all your credit. This order goes on your card.</div>' : '';
  return back +
    '<div class="cl-section-title">Checkout</div>' +
    '<div class="cl-sub">' + CR.st.count() + (CR.st.count() === 1 ? ' item' : ' items') + ' for ' + CR.st.first(g) + '</div>' +
    (guest ? CR.st.guestHTML() : '') +
    lines +
    '<div class="cl-summary">' +
      '<div class="cl-sum-row"><span>Items</span><b>' + CR.money(sp.items) + '</b></div>' +
      '<div class="cl-sum-row"><span>Shipping <span class="cr-placeholder">[sample shipping]</span></span><b>' + CR.money(sp.shipping) + '</b></div>' +
      '<div class="cl-sum-row"><span>Tax</span><span class="cr-placeholder">[tax]</span></div>' +
      '<div class="cl-sum-row cl-total"><span>Order total</span><b>' + CR.money(sp.total) + '</b></div>' +
      (sp.credit > 0 ? '<div class="cl-sum-row cl-green"><span><i class="fa-solid fa-wallet"></i> Paid with credit</span><b class="cl-green">−' + CR.money(sp.credit) + '</b></div>' : '') +
      '<div class="cl-sum-row cl-total"><span>Charged to card</span><b>' + CR.money(sp.card) + '</b></div>' +
    '</div>' +
    credit +
    (CR.cl.error ? '<div class="cl-error">' + CR.cl.error + '</div>' : '') +
    CR.st.minHTML() + CR.st.pkgMsgHTML() +
    (sp.card > 0 ? '<div class="cl-group-label">Card</div><div class="cl-card-fake"><i class="fa-regular fa-credit-card"></i> Card payment form <span class="cr-demo-tag">Not real in the prototype</span></div>' : '') +
    '<button class="cl-btn"' + (blocked ? ' disabled' : ' onclick="CR.st.placeOrder()"') + '>' +
      (sp.card > 0 ? 'Place order · pay ' + CR.money(sp.card) : 'Place order · paid with credit') + '</button>';
};

CR.st.placeOrder = function () {
  const sp = CR.st.split(), g = CR.st.gallery();
  if (CR.st.minShort() > 0 || CR.st.pkgBlocked()) return;
  if (!CR.cl.authed() && !/.+@.+\..+/.test(CR.st.guestEmail || '')) { CR.cl.error = 'Please add your email for the receipt.'; CR.cl.render(); return; }
  const id = 'o-' + (1043 + CR.orders.filter(o => o.placedInDemo).length);
  const items = [];
  CR.st.cart.forEach(l => { for (let i = 0; i < l.qty; i++) items.push(l.productId); });
  CR.orders.push({
    id: id, clientId: CR.cl.clientId, galleryId: g.id, placedInDemo: true, date: CR.todayISO(),
    items: items, shipping: sp.shipping, total: sp.total, creditApplied: sp.credit, cardCharged: sp.card, status: 'awaiting approval'
  });
  CR.st.cart = [];
  CR.st.lastOrderId = id;
  CR.cl.screen = 'orderDone';
  if (sp.credit > 0) CR.add({ type: 'redemption', clientId: CR.cl.clientId, amount: sp.credit, orderId: id, galleryId: g.id });
  else CR.changed();
  CR.cl.go('orderDone');
};

/* ── Order confirmation: the remainder is always shown ── */
CR.st.order = function () {
  const mine = CR.orders.filter(o => o.clientId === CR.cl.clientId);
  return mine.find(o => o.id === CR.st.lastOrderId) || mine[mine.length - 1];
};
CR.st.remainderHTML = function (s) {
  if (!s.face) return '';
  if (s.balance <= 0) return '<div class="cl-remainder used"><small>Credit left</small><b>' + CR.money(0) + '</b><span>You’ve used all your credit.</span></div>';
  return '<div class="cl-remainder"><small>Credit left</small><b>' + CR.money(s.balance) + '</b>' +
    '<span>Spend it on anything in the gallery, across as many orders as you like. Credit expires after <span class="cr-placeholder">[expiry period]</span>.</span></div>';
};
CR.st.orderDoneHTML = function () {
  const o = CR.st.order(), s = CR.summary(CR.cl.clientId);
  return '<div class="cl-done"><div class="cl-done-icon"><i class="fa-solid fa-check"></i></div>' +
      '<div class="cl-section-title" style="text-align:center;">Order placed</div>' +
      '<div class="cl-sub" style="text-align:center;">' + CR.cl.thanks() + 'Order #' + o.id.replace('o-', '') + ' is with ' + CR_DATA.photographer.studio + '.</div></div>' +
    '<div class="cl-summary">' +
      (o.shipping ? '<div class="cl-sum-row"><span>Items</span><b>' + CR.money(o.total - o.shipping) + '</b></div>' +
        '<div class="cl-sum-row"><span>Shipping</span><b>' + CR.money(o.shipping) + '</b></div>' : '') +
      '<div class="cl-sum-row"><span>Order total</span><b>' + CR.money(o.total) + '</b></div>' +
      (o.creditApplied ? '<div class="cl-sum-row cl-green"><span>Paid with credit</span><b class="cl-green">' + CR.money(o.creditApplied) + '</b></div>' : '') +
      '<div class="cl-sum-row"><span>Paid by card</span><b>' + CR.money(o.cardCharged) + '</b></div>' +
    '</div>' +
    CR.st.remainderHTML(s) +
    '<button class="cl-btn" onclick="CR.cl.go(\'gallery\')">' + (s.balance > 0 ? 'Spend the rest' : 'Back to the gallery') + '</button>' +
    '<button class="cl-btn-text" onclick="CR.cl.go(\'account\')"><i class="fa-regular fa-user"></i> See your orders</button>' +
    '<button class="cl-btn-text" style="margin-top:0;" onclick="CR.cl.go(\'emailOrder\')"><i class="fa-regular fa-envelope"></i> See the order email</button>';
};

/* ── Your account: the family's credit and orders. Reached after login (CR.cl.go sends a guest to login first). ── */
CR.st.accountLinkHTML = function () {
  if (!CR.cl.authed()) return '<button class="cl-account-link" onclick="CR.au.start(\'gallery\')"><i class="fa-regular fa-user"></i> Log in</button>';
  return '<button class="cl-account-link" onclick="CR.cl.go(\'account\')"><i class="fa-regular fa-user"></i> Your account</button>';
};
CR.st.openChild = function (i) { CR.st.childIdx = i; CR.st.cart = []; CR.cl.go('gallery'); };

CR.st.accountHTML = function () {
  const id = CR.cl.clientId, c = CR.client(id), s = CR.summary(id), ev = CR.eventsFor(id);
  const orders = CR.orders.filter(o => o.clientId === id).slice().reverse();
  const buys = ev.filter(e => e.type === 'purchase');
  const kids = CR.answers[id] || [];
  const photos = CR.phase === 'photos_available';
  /* Credit: what's available, how it was bought, and where it went. */
  let credit;
  if (s.face) {
    /* Credit history (ecom meeting 2026-11-05): every purchase, order paid with credit and credit given back, oldest
       first, with the balance after each. From the same ledger as checkout, so the figures always match. */
    let run = 0;
    const line = (e, what, amt) => { run += amt;
      return '<div class="cl-acc-line"><span>' + CR.fmtDate(e.date) + '</span><span>' + what + '<small class="cl-acc-run">Balance ' + CR.money(run) + '</small></span>' +
        '<b' + (amt > 0 ? ' class="cl-green"' : '') + '>' + (amt > 0 ? '+' : '−') + CR.money(Math.abs(amt)) + '</b></div>'; };
    const lines = ev.map(e => e.type === 'purchase' ? line(e, 'Bought credit: paid ' + CR.money(e.paid) + ', to spend ' + CR.money(e.face), e.face)
      : e.type === 'redemption' ? line(e, 'Order #' + e.orderId.replace('o-', ''), -e.amount)
      : e.type === 'adjustment' ? line(e, escHtml(e.note || 'Adjustment'), e.amount)
      : e.type === 'refund' ? line(e, 'Refund', -e.amount) : '').join('');
    /* Purchases pool into one balance (decided 2026-11-05): one line per purchase, one total. */
    const bought = buys.length === 1 ? 'Bought ' + CR.money(s.paid) + ' → ' + CR.money(s.face) + ' · ' + CR.fmtDate(buys[0].date)
      : buys.length + ' purchases · paid ' + CR.money(s.paid) + ' · ' + CR.money(s.face) + ' to spend';
    credit = '<div class="cl-acc-credit"><small>Credit available</small><b>' + CR.money(s.balance) + '</b>' +
        '<span>' + bought + ' · ' + CR.money(s.redeemed) + ' spent</span>' +
        (s.balance > 0 ? '<span>Expires after <span class="cr-placeholder">[expiry period]</span></span>' : '') + '</div>' +
      '<div class="cl-group-label" style="margin:14px 0 4px;">Credit history</div><div class="cl-acc-lines">' + lines + '</div>' +
      (s.balance > 0 ? '<div class="cl-fine" style="text-align:left; margin:6px 0 0;">Spend it on anything in the gallery, across as many orders as you like.</div>' : '') +
      (CR.cl.offerState() === 'open' ? '<button class="cl-btn-ghost" onclick="CR.cl.go(\'offer\')"><i class="fa-solid fa-plus"></i> Add more credit</button>' : '');
  } else {
    credit = '<div class="cl-note"><i class="fa-solid fa-wallet"></i> You haven’t bought credit.</div>' +
      (CR.cl.offerState() === 'open' ? '<button class="cl-btn-ghost" onclick="CR.cl.go(\'offer\')">Buy credit</button>' : '');
  }
  const orderHTML = o => {
    const counts = {};
    o.items.forEach(i => { counts[i] = (counts[i] || 0) + 1; });
    const date = o.date || ((ev.find(e => e.orderId === o.id) || {}).date);
    return '<div class="cl-acc-order">' +
      '<div class="cl-acc-order-head"><b>Order #' + o.id.replace('o-', '') + '</b><span>' + (date ? CR.fmtDate(date) : '') + ' · ' + (o.status === 'cancelled' ? 'Cancelled by photographer' : 'Placed <span class="cr-placeholder">[order status]</span>') + '</span></div>' +
      '<div class="cl-acc-items">' + Object.keys(counts).map(i => (counts[i] > 1 ? counts[i] + ' × ' : '') + CR.ph.product(i).name).join('<br>') +
        (o.shipping ? '<br>Shipping ' + CR.money(o.shipping) : '') + '</div>' +
      '<div class="cl-acc-split"><span>Total <b>' + CR.money(o.total) + '</b></span>' +
        (o.creditApplied ? '<span class="cl-green">Credit ' + CR.money(o.creditApplied) + '</span>' : '') +
        '<span>Card ' + CR.money(o.cardCharged) + '</span></div>' +
    '</div>';
  };
  const kidHTML = (k, i) => {
    const g = CR_DATA.galleries.find(x => x.id === k.galleryId);
    return '<div class="cl-kid"><i class="fa-regular fa-user"></i><span><b>' + escHtml(k.values.q1 || 'Child ' + (i + 1)) + '</b>' +
      (g ? g.folder : 'Matched to a gallery after picture day') + '</span>' +
      (photos && g ? '<button class="cl-link" style="margin-left:auto;" onclick="CR.st.openChild(' + i + ')">View photos</button>' : !photos ? '<small class="cl-acc-later">Photos after picture day</small>' : '') + '</div>';
  };
  return CR.cl.headerHTML() +
    '<div class="cl-section-title">Hi ' + escHtml(CR.cl.first()) + '</div>' +
    '<div class="cl-sub">' + escHtml(c.email) + ' · <button class="cl-link" onclick="CR.au.logOut()">Log out</button></div>' +
    '<div class="cl-group-label">Your credit</div>' + credit +
    '<div class="cl-group-label">Your orders</div>' +
    (orders.length ? orders.map(orderHTML).join('') : '<div class="cl-note"><i class="fa-solid fa-bag-shopping"></i> No orders yet.' + (photos ? '' : ' You can order once photos are ready.') + '</div>') +
    '<div class="cl-group-label">' + (kids.length === 1 ? 'Your child' : 'Your children') + '</div>' + kids.map(kidHTML).join('');
};

/* ── Guest checkout: an email for the receipt. If that email holds credit, a banner offers a code; it stays
   until payment. A guest who ignores it pays the full amount by card. ── */
CR.st.guestHTML = function () {
  const c = CR.cl.byEmail(CR.st.guestEmail), bal = c ? CR.balance(c.id) : 0;
  const me = CR.cl.client();
  const banner = bal > 0
    ? '<div class="cl-next cl-credit-found"><div class="cl-banner-title">Use your credit</div>' +
        '<div class="cl-banner-text">This email has credit for this job. Confirm it’s yours with a code and it applies to this order.</div>' +
        '<button class="cl-btn" onclick="CR.au.fromCheckout()">Send me a code</button></div>'
    : '';
  return '<label class="cl-field" style="margin-top:14px;"><span>Email</span>' +
      '<input class="cl-input" type="email" id="cl-guest-email" value="' + escHtml(CR.st.guestEmail || '') + '" placeholder="For your receipt" oninput="CR.st.setGuestEmail(this.value)"></label>' +
    (me.email ? '<button class="cr-demo-fill" onclick="CR.st.setGuestEmail(\'' + escHtml(me.email) + '\', true)">Demo: fill ' + escHtml(me.name.split(' ')[0]) + '’s email</button>' : '') +
    '<div id="cl-guest-banner">' + banner + '</div>' +
    '<div class="cl-fine" style="text-align:left; margin:0 0 4px;">Bought credit? <button class="cl-link" onclick="CR.au.start(\'checkout\')">Log in</button></div>';
};
/* Typing keeps focus: only the banner is redrawn. */
CR.st.setGuestEmail = function (v, redraw) {
  CR.st.guestEmail = v;
  if (redraw) { CR.cl.render(); return; }
  const was = document.getElementById('cl-guest-banner');
  if (!was) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = CR.st.guestHTML();
  was.innerHTML = tmp.querySelector('#cl-guest-banner').innerHTML;
};

/* ── Access code (decided 2026-11-05, replaces account creation from 2026-11-03) ──
   Credit is held against the email of the primary contact who paid. To spend it, the family confirms that email with
   the access code NextZen already uses for favorites: enter the email, get a link and a code, logged in. A password is
   optional, offered afterwards ("Finish your account"), never required.
   - credit email link: logs the family in directly (the link proves the email).
   - gallery login: email, then the code.
   - guest checkout: the banner above, then the code, back to checkout.
   Faked: any code is accepted; passwords are not checked; "has a password" is a demo setting (CR.accounts). */
CR.au = {};
CR.au.reset = function () { CR.au.email = ''; CR.au.result = null; CR.au.ret = 'gallery'; CR.au.who = null; CR.au.usePw = false; };
CR.au.reset();
CR.au.finishSeen = {};   /* "Finish your account" is offered once per visit */
CR.cl.authed = function () { return !CR.cl.isPreview() && !!CR.loggedIn[CR.cl.clientId]; };
CR.cl.byEmail = function (email) {
  const e = (email || '').trim().toLowerCase();
  return e ? CR_DATA.clients.find(c => c.email && c.email.toLowerCase() === e) : null;
};

/* The account screen is behind login. */
(function () {
  const go = CR.cl.go;
  CR.cl.go = function (screen) {
    if (screen === 'account' && !CR.cl.isPreview() && !CR.cl.authed()) { CR.au.reset(); CR.au.ret = 'account'; screen = 'login'; }
    go(screen);
  };
  const start = CR.cl.start;
  CR.cl.start = function (screen) { CR.au.finishSeen = {}; start(screen); };
})();

/* Entry points */
CR.au.start = function (ret) { CR.au.reset(); CR.au.ret = ret || 'gallery'; CR.cl.go('login'); };
/* A link in a credit email logs the family in: no code needed. */
CR.au.fromEmail = function (ret) {
  const id = CR.cl.clientId, was = CR.cl.authed();
  CR.loggedIn[id] = true;
  CR.cl.go(ret);
  if (!was) toast('Logged in from your email link');
  CR.changed();
};
CR.au.fromCheckout = function () {
  const c = CR.cl.byEmail(CR.st.guestEmail);
  CR.au.reset(); CR.au.ret = 'checkout'; CR.au.who = c.id; CR.au.email = c.email;
  CR.cl.go('code');
};

/* Logged in: the session belongs to whoever logged in (in the demo, normally the family whose view this is).
   No password yet: offer to finish the account, once per visit. */
CR.au.done = function () {
  const id = CR.au.who;
  CR.loggedIn[id] = true;
  CR.cl.clientId = id;
  const ret = CR.au.ret;
  toast('Logged in');
  if (!CR.accounts[id] && !CR.au.finishSeen[id]) { CR.au.finishSeen[id] = true; CR.cl.go('finish'); CR.changed(); return; }
  CR.au.reset();
  CR.cl.go(ret);
  CR.changed();
};
CR.au.finish = function (save) {
  if (save) { CR.accounts[CR.cl.clientId] = true; toast('Account saved · you can log in with your password or a code'); }
  const ret = CR.au.ret;
  CR.au.reset();
  CR.cl.go(ret);
  CR.changed();
};
CR.au.logOut = function () { delete CR.loggedIn[CR.cl.clientId]; CR.cl.go('gallery'); CR.changed(); };
CR.au.forgot = function () { toast('We’d email a link to reset the password (not in the prototype)'); };

CR.au.backHTML = function () {
  return '<button class="cl-back" onclick="CR.cl.go(\'' + (CR.au.ret === 'account' ? 'gallery' : CR.au.ret) + '\')"><i class="fa-solid fa-chevron-left"></i> Back</button>';
};
CR.au.passwordHTML = function (label) {
  return '<label class="cl-field"><span>' + label + '</span><input class="cl-input" type="password" placeholder="••••••••"></label>';
};

/* Gallery login: the email, then a code. The amount shows only once the family is logged in: before that anyone could
   have typed the email. */
CR.st.loginHTML = function () {
  const r = CR.au.result;
  const notFound = r === 'notfound'
    ? '<div class="cl-error" style="margin-top:0;">We couldn’t find that email for this job.</div>' +
      '<div class="cl-fine" style="text-align:left;">Bought credit with a different email? <span class="cr-placeholder">[support link]</span></div>' : '';
  return CR.au.backHTML() +
    '<div class="cl-section-title">Log in</div>' +
    '<div class="cl-sub">' + CR_DATA.photographer.studio + ' · ' + CR_DATA.job.name + '. We’ll email you a link and a code. No password needed.</div>' +
    '<label class="cl-field" style="margin-top:14px;"><span>Email</span><input class="cl-input" type="email" id="cl-login-email" value="' + escHtml(CR.au.email) + '" oninput="CR.au.email=this.value"></label>' +
    (CR.cl.client().email ? '<button class="cr-demo-fill" onclick="CR.au.email=\'' + escHtml(CR.cl.client().email) + '\'; CR.cl.render()">Demo: fill ' + escHtml(CR.cl.client().name.split(' ')[0]) + '’s email</button>' : '') +
    '<button class="cl-btn" onclick="CR.au.lookUp()">Send me a code</button>' +
    notFound;
};
CR.au.lookUp = function () {
  const c = CR.cl.byEmail(CR.au.email);
  CR.au.who = c ? c.id : null;
  if (!c) { CR.au.result = 'notfound'; CR.cl.render(); return; }
  CR.au.email = c.email;
  CR.cl.go('code');
};

/* The access code: the same flow as favorites. Any code works in the prototype. */
CR.st.codeHTML = function () {
  const pw = !!CR.accounts[CR.au.who];
  if (CR.au.usePw) {
    return CR.au.backHTML() +
      '<div class="cl-section-title">Log in with your password</div>' +
      '<div class="cl-sub">' + escHtml(CR.au.email) + '</div>' +
      CR.au.passwordHTML('Password') +
      '<button class="cl-link cl-forgot" onclick="CR.au.forgot()">Forgot password?</button>' +
      '<button class="cl-btn" onclick="CR.au.done()">Log in</button>' +
      '<button class="cl-btn-text" onclick="CR.au.usePw=false; CR.cl.render()">Use a code instead</button>' +
      '<div class="cl-fine">Passwords aren’t checked in the prototype.</div>';
  }
  return CR.au.backHTML() +
    '<div class="cl-section-title">Check your email</div>' +
    '<div class="cl-sub">We sent you a link and a code at <b>' + escHtml(CR.au.email) + '</b>. Tap the link, or enter the code here.</div>' +
    '<div class="cl-code">' + [0, 1, 2, 3, 4, 5].map(() => '<input class="cl-input" inputmode="numeric" maxlength="1" oninput="if(this.value&&this.nextElementSibling)this.nextElementSibling.focus()">').join('') + '</div>' +
    '<button class="cl-btn" onclick="CR.au.done()">Log in</button>' +
    '<button class="cl-btn-text" onclick="toast(\'A new code would be sent (not in the prototype)\')">Send a new code</button>' +
    (pw ? '<button class="cl-btn-text" style="margin-top:0;" onclick="CR.au.usePw=true; CR.cl.render()">Use your password instead</button>' : '') +
    '<div class="cl-fine"><span class="cr-demo-tag">Any code works in the prototype</span></div>';
};

/* Optional, after a code login: a name and a password. Dismissable; the access code always works. */
CR.st.finishHTML = function () {
  const c = CR.cl.client();
  return CR.cl.headerHTML() +
    '<div class="cl-banner cl-banner-ok"><i class="fa-solid fa-circle-check"></i><div><b>You’re logged in.</b>' + (CR.balance(c.id) > 0 ? ' Your credit applies at checkout.' : '') + '</div></div>' +
    '<div class="cl-next cl-acc-offer"><div class="cl-banner-eyebrow">Optional</div>' +
    '<div class="cl-banner-title">Finish your account</div>' +
    '<div class="cl-banner-text">Add a password if you’d like one. You can always log in with a code from your email instead.</div>' +
    '<label class="cl-field" style="margin-top:12px;"><span>Name</span><input class="cl-input" value="' + escHtml(c.name) + '"></label>' +
    CR.au.passwordHTML('Choose a password <i>optional</i>') +
    '<button class="cl-btn" onclick="CR.au.finish(true)">Save</button>' +
    '<button class="cl-btn-text" onclick="CR.au.finish(false)">Not now</button></div>';
};
