/* Emails, rendered as screens inside the client phone. No real email is sent. Every email states the current balance. */
CR.em = {};

CR.em.frameHTML = function (subject, bodyHTML) {
  const c = CR.cl.client();
  return '<div class="em">' +
    '<div class="em-head">' +
      '<div class="em-from"><span class="em-avatar">' + CR_DATA.photographer.studio.split(' ').map(w => w[0]).join('') + '</span>' +
        '<div><b>' + CR_DATA.photographer.studio + '</b><small>to ' + escHtml(c.email) + '</small></div></div>' +
      '<div class="em-subject">' + subject + '</div>' +
    '</div>' +
    '<div class="em-body">' + bodyHTML + '</div>' +
    /* Known families get a link to their account (the email link logs them in). */
    (c.id && (CR.registered[c.id] || CR.summary(c.id).face > 0) ? '<div class="em-foot"><button class="cl-link" onclick="CR.au.fromEmail(\'account\')"><i class="fa-regular fa-user"></i> Your account: credit and orders</button></div>' : '') +
  '</div>';
};

/* The main button of a credit email. The link proves the email, so it logs the family in directly: no code, no
   password (decided 2026-11-05). Without credit there's nothing to unlock: straight to the page. */
CR.em.ctaHTML = function (label, ret) {
  const s = CR.summary(CR.cl.clientId);
  return '<button class="cl-btn" onclick="' + (s.face > 0 ? 'CR.au.fromEmail' : 'CR.cl.go') + '(\'' + ret + '\')">' + label + '</button>';
};

/* The pre-order invite is out once the photographer sent it, or scheduled it and credit is now on sale. */
CR.em.inviteOut = function () {
  const st = CR.emails.invite.state;
  return CR.offer.status === 'published' && (st === 'sent' || (st === 'scheduled' && CR.cl.offerState() === 'open'));
};

/* The pre-order invite (Credit emails card, decided 2026-11-05), sent to the chosen audience. Imported contacts
   (preview option) get the same email with their details filled in. */
CR.em.inviteHTML = function () {
  const a = (CR.answers[CR.cl.clientId] || [])[0], child = a && a.values.q1 ? a.values.q1.split(' ')[0] : 'your child';
  const best = CR.cl.bestAmount();
  return CR.em.frameHTML('Buy credit for ' + escHtml(child) + '’s picture day',
    '<p>Hi ' + escHtml(CR.cl.first()) + ',</p>' +
    '<p>Picture day for ' + CR_DATA.job.name + ' is ' + CR.ph.fmtD(CR.shootDate()) + '. You can buy credit now and choose photos once you’ve seen them.</p>' +
    (best ? '<p><b>Pay ' + CR.money(best.paid) + ', get ' + CR.money(best.face) + ' to spend.</b></p>' : '') +
    '<button class="cl-btn" onclick="CR.cl.go(\'offer\')">Buy credit</button>' +
    '<p class="em-fine">' + (CR.imported[CR.cl.clientId] ? 'Sent to ' + CR_DATA.photographer.studio + '’s contact list. Your details are already filled in.' : 'Sent to registered ' + CR.em.audienceText() + '.') + '<br><span class="cr-placeholder">[client terms]</span></p>');
};
CR.em.audienceText = function () {
  return { parents: 'parents and guardians', students: 'students', everyone: 'families' }[CR.offer.audience || 'parents'];
};

/* Registration confirmation (decided 2026-11-05): also for families who register with only an email, no credit. */
CR.em.registeredHTML = function () {
  const kids = CR.answers[CR.cl.clientId] || [], s = CR.summary(CR.cl.clientId), open = CR.cl.offerState() === 'open';
  return CR.em.frameHTML('You’re registered for ' + CR_DATA.job.name,
    '<p>Hi' + (CR.cl.first() ? ' ' + escHtml(CR.cl.first()) : '') + ',</p>' +
    '<p>You’re registered for picture day on ' + CR.ph.fmtD(CR.shootDate()) + ' at ' + CR_DATA.job.location + '.</p>' +
    (kids.length ? '<table class="em-table">' + kids.map(k => '<tr><td>' + escHtml(k.values.q1 || 'Child') + '</td><td>' + escHtml(k.values.q2 || '') + '</td></tr>').join('') + '</table>' : '') +
    '<p>We’ll email you when photos are ready.</p>' +
    (s.face > 0 ? CR.em.balanceBox(s) : '') +
    (!s.face && open ? '<p>You can buy credit now and choose photos once you’ve seen them.</p>' : '') +
    (!s.face && open ? '<button class="cl-btn" onclick="CR.cl.go(\'offer\')">Buy credit</button>' : CR.em.ctaHTML('Open your gallery link', 'gallery')) +
    '<p class="em-fine">Registered with ' + escHtml(CR.cl.client().email) + '.</p>');
};

CR.em.balanceBox = function (s) {
  return '<div class="em-balance"><small>Your credit balance</small><b>' + CR.money(s.balance) + '</b></div>';
};

CR.em.purchaseHTML = function () {
  const s = CR.summary(CR.cl.clientId);
  /* The latest purchase; the balance box shows everything pooled. */
  const p = CR.eventsFor(CR.cl.clientId).filter(e => e.type === 'purchase').pop() || { paid: s.paid, face: s.face };
  return CR.em.frameHTML('Your ' + CR.money(p.face) + ' credit for ' + CR_DATA.job.name,
    '<p>Hi ' + escHtml(CR.cl.first()) + ',</p>' +
    '<p>Thanks for buying credit. It’s ready to spend once picture day photos are in your gallery.</p>' +
    CR.em.balanceBox(s) +
    '<table class="em-table">' +
      '<tr><td>You paid</td><td>' + CR.money(p.paid) + '</td></tr>' +
      '<tr><td>Credit to spend</td><td>' + CR.money(p.face) + (p.face > p.paid ? ' (includes ' + CR.money(p.face - p.paid) + ' bonus)' : '') + '</td></tr>' +
      '<tr><td>Where</td><td>' + CR.cl.whereText() + '</td></tr>' +
      '<tr><td>Expires</td><td><span class="cr-placeholder">[expiry period]</span></td></tr>' +
    '</table>' +
    '<p>We’ll email you when photos are ready. The link in that email logs you in, and your credit applies at checkout. No password needed.</p>' +
    CR.em.ctaHTML('View your gallery', 'gallery') +
    '<p class="em-fine">Picture day: ' + CR.ph.fmtD(CR.shootDate()) + ' · ' + CR_DATA.job.location + '<br><span class="cr-placeholder">[client terms]</span></p>');
};

/* Photos ready: the link opens the family's gallery directly. States the balance when the family bought credit. */
CR.em.photosHTML = function () {
  const s = CR.summary(CR.cl.clientId);
  const g = CR.st.gallery(), who = g ? escHtml(CR.st.first(g)) + '’s' : 'Your';   /* one child per gallery link */
  return CR.em.frameHTML(who + ' picture day photos are ready',
    '<p>Hi ' + escHtml(CR.cl.first()) + ',</p>' +
    '<p>' + who + ' photos from ' + CR_DATA.job.name + ' are ready to view.</p>' +
    (s.face > 0 ? CR.em.balanceBox(s) +
      (s.balance > 0 ? '<p>This link logs you in and your credit applies at checkout. Spend it on anything in the gallery, across as many orders as you like.</p>' : '') : '') +
    CR.em.ctaHTML('View photos', 'gallery') +
    (s.balance > 0 ? '<p class="em-fine">Credit expires after <span class="cr-placeholder">[expiry period]</span>.</p>' : ''));
};

/* After an order: what was bought, how it was paid, and the credit left (the remainder). */
CR.em.orderHTML = function () {
  const o = CR.st.order(), s = CR.summary(CR.cl.clientId);
  const counts = {};
  o.items.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  let rows = Object.keys(counts).map(id => { const p = CR.ph.product(id), n = counts[id];
    return '<tr><td>' + (n > 1 ? n + ' × ' : '') + p.name + '</td><td>' + CR.money(p.price * n) + '</td></tr>'; }).join('');
  if (o.shipping) rows += '<tr><td>Shipping</td><td>' + CR.money(o.shipping) + '</td></tr>';
  return CR.em.frameHTML('Order #' + o.id.replace('o-', '') + (s.face ? ' · ' + CR.money(s.balance) + ' credit left' : ' confirmed'),
    '<p>Hi ' + escHtml(CR.cl.first()) + ',</p>' +
    '<p>Thanks for your order. ' + CR_DATA.photographer.studio + ' will get it ready.</p>' +
    '<table class="em-table">' + rows +
      '<tr><td><b>Order total</b></td><td><b>' + CR.money(o.total) + '</b></td></tr>' +
      (o.creditApplied ? '<tr><td>Paid with credit</td><td>' + CR.money(o.creditApplied) + '</td></tr>' : '') +
      '<tr><td>Paid by card</td><td>' + CR.money(o.cardCharged) + '</td></tr>' +
    '</table>' +
    (s.face ? CR.em.balanceBox(s) + (s.balance > 0
      ? '<p>Spend the rest on anything in the gallery, across as many orders as you like.</p>'
      : '<p>You’ve used all your credit.</p>') : '') +
    CR.em.ctaHTML(s.balance > 0 ? 'Spend the rest' : 'View photos', 'gallery') +
    (s.balance > 0 ? '<p class="em-fine">Credit expires after <span class="cr-placeholder">[expiry period]</span>.</p>' : ''));
};

/* Unspent credit reminder: sent to families who still hold a balance once photos are available. */
CR.em.reminderHTML = function () {
  const s = CR.summary(CR.cl.clientId);
  return CR.em.frameHTML('You still have ' + CR.money(s.balance) + ' of credit to spend',
    '<p>Hi ' + escHtml(CR.cl.first()) + ',</p>' +
    '<p>Your picture day photos from ' + CR_DATA.job.name + ' are ready, and you still have credit to spend.</p>' +
    CR.em.balanceBox(s) +
    '<p>Spend it on anything in the gallery, across as many orders as you like.</p>' +
    CR.em.ctaHTML('Spend your credit', 'gallery') +
    '<p class="em-fine">Credit expires after <span class="cr-placeholder">[expiry period]</span>.</p>');
};
