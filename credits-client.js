/* Client screens, shown in a 390px phone over the photographer prototype. Mobile first: on a real phone the frame
   fills the screen. Spending credit needs the email confirmed with the access code (no password): see "Access code"
   in credits-store.js. A family can buy credit more than once while the window is open; purchases pool into one
   balance (decided 2026-11-05).
   Optional credit: register (form → "You're registered"), then buy credit if they want (offer → payment → confirmation).
   Mandatory credit: details → buy credit → payment; the family is registered only once payment goes through.
   The registration link is anonymous (no login): the page never knows who is visiting. A family that is already
   registered finds out after submitting, on "You're already registered".
   Preview mode is the photographer's "what clients see": a blank form, the offer being edited, nothing saved or paid. */
CR.cl = { isOpen: false, clientId: null, screen: 'register', form: null, amountIdx: -1, error: '', previewOffer: null };

CR.cl.mount = function () {
  const el = document.createElement('div');
  el.id = 'cr-client';
  el.className = 'cr-client';
  el.hidden = true;
  document.body.appendChild(el);
  CR.onChange(function () { if (CR.cl.isOpen) CR.cl.render(); });
};

CR.cl.isPreview = function () { return !!CR.cl.previewOffer; };
/* The photographer's preview shows the registration form being edited. */
CR.cl.questions = function () { return CR.cl.isPreview() && CR.ph.regDraft ? CR.ph.regDraft.questions : CR.reg.questions; };
CR.cl.off = function () { return CR.cl.previewOffer || CR.offer; };
CR.cl.client = function () {
  return CR.cl.isPreview() ? { id: null, name: '', email: '', galleries: [] } : CR.client(CR.cl.clientId);
};
CR.cl.first = function () { return CR.cl.isPreview() ? '' : CR.cl.client().name.split(' ')[0]; };
CR.cl.thanks = function () { return CR.cl.first() ? 'Thanks, ' + escHtml(CR.cl.first()) + '. ' : 'Thanks. '; };
CR.cl.childName = function (galleryId) {
  const g = CR_DATA.galleries.find(x => x.id === galleryId);
  return g ? g.name.split(', ')[1] : '';
};

/* A demo client, live: registering and paying change the prototype's state. */
CR.cl.open = function (clientId, screen) {
  CR.cl.previewOffer = null;
  CR.cl.clientId = clientId;
  CR.cl.form = CR.cl.formFor(clientId);
  CR.cl.start(screen || 'register');
};
/* A family that isn't in the sample data: blank form. It becomes a test user once it submits. */
CR.cl.openNew = function () {
  const c = CR.addNewFamily();
  CR.cl.previewOffer = null;
  CR.cl.clientId = c.id;
  CR.cl.form = { first: '', last: '', email: '', phone: '', children: [{ galleryId: null, values: {} }] };
  CR.cl.start(CR.reg.on ? 'register' : 'gallery');   /* registration off: the gallery link (or a link the photographer sends) */
  CR.changed();
};

/* The photographer's preview of what a new family sees, with the offer as it stands (a draft while editing). */
CR.cl.openPreview = function (screen, offer) {
  if (screen === 'register' && !CR.reg.on) screen = 'offer';   /* registration off: the gallery link opens the offer */
  CR.cl.previewOffer = JSON.parse(JSON.stringify(offer || CR.offer));
  CR.cl.clientId = null;
  CR.cl.form = { first: '', last: '', email: '', phone: '', children: [{ galleryId: null, values: {} }] };
  CR.cl.start(screen || 'register');
};
CR.cl.start = function (screen) {
  CR.cl.addingTo = false;
  CR.cl.justRegistered = false;
  CR.cl.amountIdx = -1;
  CR.cl.error = '';
  CR.cl.lastPurchase = null;
  CR.cl.feeJustPaid = 0;
  CR.cl.isOpen = true;
  CR.cl.go(screen);
};
CR.cl.close = function () {
  CR.cl.isOpen = false;
  CR.cl.previewOffer = null;
  document.getElementById('cr-client').hidden = true;
  const c = CR.cl.clientId && CR.client(CR.cl.clientId);
  if (c && c.isNew && !CR.registered[c.id] && !CR.eventsFor(c.id).length) {   /* a new family that never submitted */
    CR_DATA.clients = CR_DATA.clients.filter(x => x.id !== c.id);
    CR.changed();
  }
};
CR.cl.go = function (screen) {
  if (screen === 'offer' && CR.cl.screen !== 'pay') CR.cl.offerBack = CR.cl.screen;   /* where "Back" on the offer returns to */
  CR.cl.screen = screen;
  CR.cl.error = '';
  CR.cl.render();
  const body = document.getElementById('cr-phone-body');
  if (body) body.scrollTop = 0;
};

/* Where a test user can enter the client side right now, as they would in real life: the registration link is public;
   the gallery link and the emails exist only once the family is registered (or has bought, or photos are in).
   The first entry is the one that fits the moment best. */
CR.cl.entries = function (id) {
  /* With registration off, families reach the job through the gallery link (or a link the photographer sends) and
     are known once they've bought credit. */
  const bought = CR.summary(id).face > 0, reg = !!CR.registered[id] || bought, photos = CR.phase === 'photos_available';
  const list = [];
  /* Imported contact (preview option): the photographer's invitation email opens the offer, details filled in. */
  if (CR.imported[id] && !bought && !photos) list.push(['emailInvite', 'Invitation email']);
  /* The pre-order invite (Credit emails card), once sent or scheduled and credit is on sale. */
  else if (!CR.imported[id] && !bought && !photos && CR.registered[id] && CR.em.inviteOut()) list.push(['emailInvite', 'Invite email']);
  if (reg && photos) list.push(['emailPhotos', 'Photos-ready email']);
  if (reg || !CR.reg.on) list.push(['gallery', 'Gallery link']);
  if (reg) list.push(['account', 'Account']);
  if (CR.registered[id] && CR.reg.on) list.push(['emailRegistered', 'Registration email']);
  if (bought) list.push(['emailPurchase', 'Purchase email']);
  if (CR.orders.some(o => o.clientId === id)) list.push(['emailOrder', 'Order email']);
  if (photos && CR.summary(id).balance > 0) list.push(['emailReminder', 'Reminder email']);
  list.push(['register', 'Registration link']);
  return list;
};

/* The registration form, prefilled with the demo client's details so the demo moves quickly. */
CR.cl.formFor = function (clientId) {
  const c = CR.client(clientId), parts = c.name.split(' ');
  const contact = (JOBS.riverside.contacts || []).find(r => r[2] === c.email);
  return {
    first: parts[0], last: parts.slice(1).join(' '), email: c.email, phone: contact && contact[3] !== '—' ? contact[3] : '',
    children: (CR.answers[clientId] || []).slice(0, 1).map(a => ({ galleryId: a.galleryId, date: a.date, values: Object.assign({}, a.values) }))
  };
};

/* Can a client buy credit right now? A preview always shows the offer as clients will see it once on sale. */
CR.cl.offerState = function () {
  const o = CR.cl.off();
  if (CR.cl.isPreview()) return o.amounts.length ? 'open' : 'none';
  if (o.status !== 'published' || !CR.settings.creditSalesOn) return 'none';
  const today = CR.demoToday(), opens = CR.ph.opensDate(o.window), closes = CR.ph.closesDate(o.window);
  if (opens && today < opens) return 'before';
  if (closes && today > closes) return 'closed';
  return 'open';
};
CR.cl.isImported = function () { return !CR.cl.isPreview() && !!CR.imported[CR.cl.clientId]; };
/* An imported contact is known: their details are shown, not asked for. */
CR.cl.knownDetailsHTML = function () {
  const c = CR.cl.client(), a = (CR.answers[c.id] || [])[0];
  return '<div class="cl-known"><div class="cl-group-label" style="margin-top:0;">Your details</div>' +
    '<b>' + escHtml(c.name) + '</b> · ' + escHtml(c.email) +
    (a ? '<div>For ' + escHtml(a.values.q1 || '') + (a.values.q2 ? ' · ' + escHtml(a.values.q2) : '') + '</div>' : '') +
    '<small>From ' + CR_DATA.photographer.studio + '’s contact list.</small></div>';
};
CR.cl.hasCredit = function () { return !CR.cl.isPreview() && CR.summary(CR.cl.clientId).face > 0; };
CR.cl.isRegistered = function () { return !CR.cl.isPreview() && !!CR.registered[CR.cl.clientId]; };
/* Mandatory only applies while credit is on sale; outside the window families register without it. */
/* Mandatory credit needs registration on: with registration off there's nothing to make it part of. */
CR.cl.mandatory = function () { return CR.reg.on && CR.cl.off().registration.purchaseRequired && CR.cl.offerState() === 'open'; };
/* Registration fee (ecom meeting 2026-11-05): the credit offer comes before the fee is paid, and the fee and any credit
   go through one checkout. Robert's prototype has no fee setting: a sample $10. The fee is not credit: it never enters
   the ledger. */
CR.cl.feeDue = function () { return CR.reg.on && CR.reg.fee.on && !CR.cl.isRegistered() && !CR.cl.addingTo; };
CR.cl.feeHTML = function () { return CR.money(CR.reg.fee.amount) + ' <span class="cr-placeholder">[sample registration fee]</span>'; };

/* ── Frame ── */
CR.cl.render = function () {
  const el = document.getElementById('cr-client');
  if (!el) return;
  el.hidden = false;
  const screens = {
    register: CR.cl.registerHTML, registered: CR.cl.registeredHTML, already: CR.cl.alreadyHTML, offer: CR.cl.offerHTML, pay: CR.cl.payHTML,
    confirm: CR.cl.confirmHTML, gallery: CR.cl.galleryHTML, emailPurchase: CR.em.purchaseHTML, emailPhotos: CR.em.photosHTML,
    checkout: CR.st.checkoutHTML, orderDone: CR.st.orderDoneHTML, emailOrder: CR.em.orderHTML, account: CR.st.accountHTML, emailReminder: CR.em.reminderHTML,
    emailInvite: CR.em.inviteHTML, emailRegistered: CR.em.registeredHTML, login: CR.st.loginHTML, code: CR.st.codeHTML, finish: CR.st.finishHTML
  };
  /* A demo reset can remove the order a confirmation or order email is showing: fall back to the gallery. */
  if ((CR.cl.screen === 'orderDone' || CR.cl.screen === 'emailOrder') && !CR.st.order()) CR.cl.screen = 'gallery';
  const isEmail = CR.cl.screen.indexOf('email') === 0;
  const url = isEmail ? 'Mail' : ['gallery', 'account', 'login', 'code', 'finish'].indexOf(CR.cl.screen) >= 0 ? CR.cl.galleryLink()
    : (['register', 'registered', 'already'].indexOf(CR.cl.screen) >= 0 ? CR_DATA.job.registrationLink : 'zenfol.io/checkout');
  const who = CR.cl.isPreview()
    ? '<i class="fa-regular fa-eye"></i> Preview · what clients see <span class="cr-demo-tag">Nothing is saved or charged</span>'
    : '<i class="fa-solid fa-mobile-screen"></i> Client view · <b>' + escHtml(CR.cl.client().name) + '</b> <span class="cr-demo-tag">Demo</span>';
  const prev = document.getElementById('cr-phone-body'), top = prev ? prev.scrollTop : 0;   /* adding to the cart keeps the place */
  el.innerHTML =
    '<div class="cr-client-scrim" onclick="CR.cl.close()"></div>' +
    '<div class="cr-client-stage">' +
      '<div class="cr-client-bar"><span>' + who + '</span>' +
        '<button onclick="CR.cl.close()" title="Close"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="cr-phone">' +
        '<div class="cr-phone-url"><i class="fa-solid ' + (isEmail ? 'fa-envelope' : 'fa-lock') + '"></i> ' + url + '</div>' +
        '<div class="cr-phone-body" id="cr-phone-body">' + screens[CR.cl.screen]() + '</div>' +
      '</div>' +
    '</div>';
  document.getElementById('cr-phone-body').scrollTop = top;
};

CR.cl.headerHTML = function () {
  return '<div class="cl-head">' +
    '<div class="cl-studio">' + CR_DATA.photographer.studio + '</div>' +
    '<div class="cl-job">' + CR_DATA.job.name + '</div>' +
    '<div class="cl-meta"><i class="fa-regular fa-calendar"></i> Picture day ' + CR.ph.fmtD(CR.shootDate()) + ' · ' + CR_DATA.job.location + '</div>' +
  '</div>';
};

/* The client-facing step indicator. Mandatory: Your details, Buy credit. Optional: Register, Buy credit. */
CR.cl.stepsHTML = function (active) {
  if (!CR.reg.on || (CR.cl.offerState() !== 'open' && !CR.cl.feeDue()) || CR.cl.hasCredit()) return '';
  const steps = CR.cl.feeDue() ? ['Your details', 'Pay'] : CR.cl.mandatory() ? ['Your details', 'Buy credit'] : ['Register', 'Buy credit'];
  return '<div class="cl-steps">' + steps.map((s, i) =>
    '<div class="cl-step' + (i + 1 === active ? ' on' : i + 1 < active ? ' done' : '') + '"><span>' + (i + 1 < active ? '<i class="fa-solid fa-check"></i>' : i + 1) + '</span>' + s + '</div>').join('<div class="cl-step-line"></div>') +
  '</div>';
};

CR.cl.bestAmount = function () {
  return CR.cl.off().amounts.slice().sort((a, b) => (b.face - b.paid) - (a.face - a.paid))[0];
};

/* ── 1. Register ── */
CR.cl.registerHTML = function () {
  if (!CR.cl.isPreview() && CR.ph.regState() !== 'open') return CR.cl.regClosedHTML();
  const f = CR.cl.form, state = CR.cl.offerState(), mandatory = CR.cl.mandatory();
  const field = (label, key, type, req) =>
    '<label class="cl-field"><span>' + label + (req ? '' : ' <i>optional</i>') + '</span>' +
    '<input class="cl-input" type="' + (type || 'text') + '" value="' + escHtml(f[key] || '') + '" oninput="CR.cl.form.' + key + '=this.value"></label>';
  /* One child per registration in the prototype; siblings register again (see open decisions). */
  const children = '<div class="cl-child"><div class="cl-child-head">Child</div>' +
      CR.cl.questions().map(q => CR.cl.questionHTML(q, 0)).join('') + '</div>';
  const note = CR.cl.feeDue()
    ? '<div class="cl-note"><i class="fa-solid fa-tag"></i> Registering costs ' + CR.cl.feeHTML() + '.' +
      (state === 'open' ? (mandatory ? ' It includes buying credit to spend on photos, in the same payment.' : ' You can add credit to spend on photos in the same payment.') : '') + '</div>'
    : mandatory
    ? '<div class="cl-note"><i class="fa-solid fa-tag"></i> Registering for this job includes buying credit to spend on photos. You’re registered once payment goes through.</div>'
    : state === 'open' ? '<div class="cl-note"><i class="fa-solid fa-tag"></i> After you register, you can buy credit to spend on photos.</div>' : '';
  return CR.cl.headerHTML() + CR.cl.stepsHTML(1) +
    '<div class="cl-section-title">' + (CR.cl.addingTo ? 'Add a child' : 'Register for picture day') + '</div>' +
    '<div class="cl-sub">So we can match your photos to the right gallery.</div>' +
    (CR.cl.addingTo ? '' : note) +
    '<div class="cl-group-label">Parent or guardian</div>' +
    '<div class="cl-row2">' + field('First name', 'first', 'text', false) + field('Last name', 'last', 'text', false) + '</div>' +
    field('Email', 'email', 'email', true) +
    CR.cl.studentFillHTML() +
    field('Phone', 'phone', 'tel', false) +
    /* With several contact blocks, the primary contact receives the credit (decided 2026-11-05). */
    (state === 'open' && !CR.cl.addingTo ? '<div class="cl-fine cl-primary-note"><i class="fa-solid fa-wallet"></i> The primary contact receives the credit.</div>' : '') +
    children +
    (CR.cl.error ? '<div class="cl-error">' + CR.cl.error + '</div>' : '') +
    '<button class="cl-btn" onclick="CR.cl.submitRegistration()">' + (CR.cl.addingTo ? 'Add child' : mandatory || CR.cl.feeDue() ? 'Continue' : 'Register') + '</button>' +
    '<div class="cl-fine">We’ll email you at this address.</div>';
};

/* The registration link outside its schedule (or with registration off). */
CR.cl.regClosedHTML = function () {
  const st = CR.ph.regState(), w = CR.reg.window;
  const title = st === 'before' ? 'Registration opens ' + CR.ph.fmtD(CR.ph.regOpensDate(w))
    : st === 'closed' ? 'Registration has closed' : 'Registration isn’t open';
  const sub = st === 'before' ? 'Come back then to register for picture day.'
    : st === 'closed' ? 'Registration closed on ' + CR.ph.fmtD(CR.ph.regClosesDate(w)) + '. Already registered? Use the link in your email to see your registration and photos.'
    : 'Please check with ' + CR_DATA.photographer.studio + '.';
  return CR.cl.headerHTML() +
    '<div class="cl-done" style="padding-top:8px;"><div class="cl-done-icon cl-done-info"><i class="fa-regular fa-calendar"></i></div>' +
    '<div class="cl-section-title" style="text-align:center;">' + title + '</div>' +
    '<div class="cl-sub" style="text-align:center;">' + sub + '</div></div>';
};

CR.cl.questionHTML = function (q, ci) {
  const v = CR.cl.form.children[ci].values[q.id] || '';
  const label = '<span>' + escHtml(q.label) + (q.required ? '' : ' <i>optional</i>') + '</span>';
  const on = 'CR.cl.setAnswer(' + ci + ',\'' + q.id + '\',this.value)';
  if (q.type === 'choice') {
    return '<label class="cl-field">' + label + '<select class="cl-input" onchange="' + on + '">' +
      '<option value="">Choose…</option>' + q.options.map(o => '<option' + (o === v ? ' selected' : '') + '>' + escHtml(o) + '</option>').join('') +
      '</select></label>';
  }
  return '<label class="cl-field">' + label + '<input class="cl-input" type="' + (q.type === 'date' ? 'date' : 'text') + '" value="' + escHtml(v) + '" oninput="' + on + '"></label>';
};

CR.cl.setAnswer = function (ci, qid, v) { CR.cl.form.children[ci].values[qid] = v; };

CR.cl.submitRegistration = function () {
  if (CR.cl.isPreview()) { CR.cl.go(CR.cl.mandatory() || (CR.cl.feeDue() && CR.cl.offerState() === 'open') ? 'offer' : CR.cl.feeDue() ? CR.cl.feeOnly() : 'registered'); return; }
  const f = CR.cl.form;
  const missing = [];
  if (!/.+@.+\..+/.test(f.email || '')) missing.push('your email');
  f.children.forEach((ch, ci) => CR.cl.questions().forEach(q => {
    if (q.required && !(ch.values[q.id] || '').trim()) missing.push(q.label.toLowerCase());
  }));
  if (missing.length) { CR.cl.error = 'Please add ' + missing.join(', ') + '.'; CR.cl.render(); return; }
  if (CR.cl.addingTo) {   /* adding a sibling to an existing registration */
    CR.answers[CR.cl.clientId] = (CR.answers[CR.cl.clientId] || []).concat(f.children.map(ch => ({ galleryId: ch.galleryId || CR.cl.matchGallery(ch.values.q1), date: CR.todayISO(), values: Object.assign({}, ch.values) })));
    CR.cl.addingTo = false;
    CR.cl.form.children = CR.answers[CR.cl.clientId].map(a => ({ galleryId: a.galleryId, date: a.date, values: Object.assign({}, a.values) }));
    CR.cl.go('registered');
    CR.changed();
    return;
  }
  /* Already registered with this email: say so instead of registering twice. */
  const known = CR_DATA.clients.find(c => c.id !== CR.cl.clientId && c.email.toLowerCase() === f.email.trim().toLowerCase() && CR.registered[c.id]) ||
    (CR.registered[CR.cl.clientId] ? CR.client(CR.cl.clientId) : null);
  if (known) { CR.cl.clientId = known.id; CR.cl.go('already'); return; }
  const me = CR.cl.client();
  if (me.isNew) {   /* a new family takes the name and email they typed */
    me.email = f.email.trim();
    me.name = ((f.first || '') + ' ' + (f.last || '')).trim() || me.name;
  }
  CR.cl.saveAnswers();
  if (CR.cl.mandatory()) { CR.cl.go('offer'); return; }   /* registered at payment */
  if (CR.cl.feeDue()) { if (CR.cl.offerState() === 'open') CR.cl.go('offer'); else CR.cl.go(CR.cl.feeOnly()); return; }   /* the offer before the fee */
  CR.cl.register();
  CR.cl.go('registered');
};
CR.cl.saveAnswers = function () {
  /* A registration submitted now is dated today. */
  CR.answers[CR.cl.clientId] = CR.cl.form.children.map(ch => ({ galleryId: ch.galleryId || CR.cl.matchGallery(ch.values.q1), date: CR.registered[CR.cl.clientId] && ch.date ? ch.date : CR.todayISO(), values: Object.assign({}, ch.values) }));
};
CR.cl.register = function () { CR.registered[CR.cl.clientId] = true; CR.changed(); };

/* ── 2. Registered, then the invitation to buy credit ── */
CR.cl.registeredHTML = function () {
  const state = CR.cl.offerState(), has = CR.cl.hasCredit(), o = CR.cl.off();
  const kids = CR.cl.kidsHTML(CR.cl.form.children);
  let next;
  if (has) {
    next = CR.cl.authed()
      ? '<div class="cl-banner cl-banner-ok"><i class="fa-solid fa-circle-check"></i><div><b>Your ' + CR.money(CR.balance(CR.cl.clientId)) + ' of credit is waiting.</b> ' +
        'We’ll email you a link to spend it when photos are ready.</div></div>' + CR.cl.addMoreHTML()
      : '<div class="cl-banner cl-banner-ok"><i class="fa-solid fa-circle-check"></i><div><b>This email has credit for this job.</b> ' + CR.cl.creditPromptText() + '</div></div>' + CR.cl.addMoreHTML();
  } else if (state === 'open') {
    const best = CR.cl.bestAmount();
    next = '<div class="cl-next">' +
      '<div class="cl-banner-eyebrow">Next: buy credit</div>' +
      '<div class="cl-banner-title">Pay ' + CR.money(best.paid) + ', get ' + CR.money(best.face) + ' to spend</div>' +
      '<div class="cl-banner-text">Buy credit now and choose photos once you’ve seen them.</div>' +
      '<button class="cl-btn" onclick="CR.cl.go(\'offer\')">Buy credit</button>' +
      '<button class="cl-btn-text" onclick="CR.cl.notNow()">Not now</button>' +
    '</div>';
  } else if (state === 'before') {
    next = '<div class="cl-note"><i class="fa-regular fa-clock"></i> Credit goes on sale ' + CR.ph.fmtD(CR.ph.opensDate(o.window)) + '. We’ll email you.</div>';
  } else {
    next = '<div class="cl-note"><i class="fa-regular fa-envelope"></i> We’ll email you when photos are ready.</div>';
  }
  return CR.cl.headerHTML() + CR.cl.stepsHTML(has || state !== 'open' ? 0 : 2) +
    '<div class="cl-done" style="padding-top:8px;"><div class="cl-done-icon"><i class="fa-solid fa-check"></i></div>' +
    '<div class="cl-section-title" style="text-align:center;">You’re registered</div>' +
    '<div class="cl-sub" style="text-align:center;">' + CR.cl.thanks() + 'We’ll email ' + (CR.cl.form.email ? escHtml(CR.cl.form.email) : 'you') + ' when photos are ready.</div></div>' +
    kids + next;
};

CR.cl.kidsHTML = function (children) {
  return children.map((ch, i) => {
    const g = CR_DATA.galleries.find(x => x.id === ch.galleryId);
    return '<div class="cl-kid"><i class="fa-regular fa-user"></i><span><b>' + escHtml(ch.values.q1 || 'Child ' + (i + 1)) + '</b>' +
      (g ? g.folder + ' · photos go to their gallery' : 'Matched to a gallery after picture day') + '</span></div>';
  }).join('');
};

/* A family submits the form again with an email that's already registered. */
CR.cl.alreadyHTML = function () {
  const s = CR.summary(CR.cl.clientId), state = CR.cl.offerState();
  /* The registration link is anonymous (anyone can type an email), so the amount isn't shown here. */
  const next = s.balance > 0
    ? '<div class="cl-banner cl-banner-ok"><i class="fa-solid fa-circle-check"></i><div><b>This email has credit for this job.</b> ' + CR.cl.creditPromptText() + '</div></div>' + CR.cl.addMoreHTML()
    : state === 'open'
      ? '<div class="cl-next"><div class="cl-banner-eyebrow">You haven’t bought credit yet</div>' +
        '<div class="cl-banner-title">Pay ' + CR.money(CR.cl.bestAmount().paid) + ', get ' + CR.money(CR.cl.bestAmount().face) + ' to spend</div>' +
        '<button class="cl-btn" onclick="CR.cl.go(\'offer\')">Buy credit</button></div>'
      : '<div class="cl-note"><i class="fa-regular fa-envelope"></i> We’ll email you when photos are ready.</div>';
  return CR.cl.headerHTML() +
    '<div class="cl-done" style="padding-top:8px;"><div class="cl-done-icon cl-done-info"><i class="fa-solid fa-user-check"></i></div>' +
    '<div class="cl-section-title" style="text-align:center;">You’re already registered</div>' +
    '<div class="cl-sub" style="text-align:center;">' + escHtml(CR.client(CR.cl.clientId).email) + ' is registered for this job with:</div></div>' +
    CR.cl.kidsHTML(CR.answers[CR.cl.clientId] || []) + next +
    '<button class="cl-btn-ghost" onclick="CR.cl.addToRegistration()"><i class="fa-solid fa-plus"></i> Add a child to this registration</button>';
};

/* ── Gallery link: personal. Before photos it holds the credit offer or the waiting balance; once photos
   are in it opens the galleries with the balance visible. ── */
CR.cl.galleryLink = function () {
  if (CR.cl.isPreview()) return 'zenfol.io/g/…';   /* the photographer's preview has no family */
  const c = CR.cl.client(), g = c.galleries[0];
  return 'zenfol.io/g/' + (g ? g.replace(/^g-/, '') : c.id.replace(/^c-/, ''));
};
CR.cl.galleryHTML = function () {
  const s = CR.summary(CR.cl.clientId), state = CR.cl.offerState(), o = CR.cl.off();
  const kids = CR.answers[CR.cl.clientId] || [];
  if (CR.phase !== 'photos_available') {
    /* Registration off, credit on sale: the gallery link opens the offer directly. */
    if (!CR.reg.on && s.balance <= 0 && state === 'open') return CR.cl.offerHTML();
    let next;
    if (s.balance > 0 && !CR.cl.authed()) next = '<div class="cl-banner cl-banner-ok"><i class="fa-solid fa-circle-check"></i><div><b>You have credit for this job.</b> ' + CR.cl.creditPromptText() +
      ' <button class="cl-link" onclick="CR.au.start(\'gallery\')">Log in</button></div></div>';
    else if (s.balance > 0) next = '<div class="cl-banner cl-banner-ok"><i class="fa-solid fa-circle-check"></i><div><b>You have ' + CR.money(s.balance) + ' of credit.</b> You can spend it here once photos are ready.</div></div>' +
      CR.cl.addMoreHTML();
    else if (state === 'open') next = '<div class="cl-next"><div class="cl-banner-eyebrow">Buy credit before photos are ready</div>' +
      '<div class="cl-banner-title">Pay ' + CR.money(CR.cl.bestAmount().paid) + ', get ' + CR.money(CR.cl.bestAmount().face) + ' to spend</div>' +
      '<div class="cl-banner-text">Choose photos once you’ve seen them.</div>' +
      '<button class="cl-btn" onclick="CR.cl.go(\'offer\')">Buy credit</button></div>';
    else if (state === 'before') next = '<div class="cl-note"><i class="fa-regular fa-clock"></i> Credit goes on sale ' + CR.ph.fmtD(CR.ph.opensDate(o.window)) + '. We’ll email you.</div>';
    else if (state === 'closed') next = '<div class="cl-note"><i class="fa-regular fa-calendar-xmark"></i> Credit sales closed ' + CR.ph.fmtD(CR.ph.closesDate(o.window)) + '. You can still buy photos once they’re ready.</div>';
    else next = '<div class="cl-note"><i class="fa-regular fa-envelope"></i> We’ll email you when photos are ready.</div>';
    return CR.cl.headerHTML() + CR.st.accountLinkHTML() +
      '<div class="cl-section-title">Hi ' + escHtml(CR.cl.first()) + '</div>' +
      '<div class="cl-sub">Photos from picture day will appear here. We’ll email you when they’re ready.</div>' +
      CR.cl.kidsHTML(kids) + next;
  }
  return CR.st.galleryHTML();   /* photos are in: the store, see credits-store.js */
};

/* Before login the amount isn't shown: the family is asked to log in with their email and a code to see and spend it. */
CR.cl.creditPromptText = function () {
  return 'Log in with your email to see it: we’ll send you a code, no password needed. You can spend it once photos are ready.';
};
/* Buying more (decided 2026-11-05): only while the purchase window is open; the new credit adds to the balance. */
CR.cl.addMoreHTML = function () {
  return CR.cl.offerState() === 'open' ? '<button class="cl-btn-ghost" onclick="CR.cl.go(\'offer\')"><i class="fa-solid fa-plus"></i> Add more credit</button>' : '';
};

/* Matching a registered child to their gallery happens after picture day in the real product. The prototype matches
   by name straight away when the family has a gallery for that child ("Smith, Ava" for "Ava Smith"), so a sibling
   added in the demo can be spent on in their own gallery. */
CR.cl.matchGallery = function (name) {
  const c = CR.client(CR.cl.clientId), n = (name || '').trim().toLowerCase();
  if (!c || !n) return null;
  const g = CR_DATA.galleries.find(x => (c.galleries || []).indexOf(x.id) >= 0 && x.name.split(', ').reverse().join(' ').toLowerCase() === n);
  return g ? g.id : null;
};

/* The form again, with the parent's details kept and one new child card. Prefilled with the family's next child from
   the sample data, so the demo moves quickly. */
CR.cl.addToRegistration = function () {
  CR.cl.addingTo = true;
  const c = CR.client(CR.cl.clientId), taken = (CR.answers[CR.cl.clientId] || []).map(a => a.galleryId);
  const next = CR_DATA.galleries.find(x => (c.galleries || []).indexOf(x.id) >= 0 && taken.indexOf(x.id) < 0);
  CR.cl.form.children = [next ? { galleryId: next.id, values: { q1: next.name.split(', ').reverse().join(' '), q2: next.folder } } : { galleryId: null, values: {} }];
  CR.cl.go('register');
};

CR.cl.notNow = function () {
  const close = CR.ph.closesDate(CR.cl.off().window);
  const body = document.querySelector('#cr-phone-body .cl-next');
  if (body) body.outerHTML = '<div class="cl-note"><i class="fa-solid fa-tag"></i> You can buy credit later from the gallery link' +
    (close ? ' until ' + CR.ph.fmtD(close) : '') + '. <button class="cl-link" onclick="CR.cl.go(\'offer\')">Buy credit now</button></div>';
};

/* ── 3. Buy credit ── */
/* The offer has four layouts (Demo control › Preview options, meeting 2026-11-04). A is today's. None may suggest the
   client buys a fixed package: every amount is credit to spend on anything in the gallery.
   A: amounts, then example products. B: packages first ("What your credit buys"), then amounts.
   C: each amount lists what it covers. D: amounts set from packages, labelled by package, with the credit line. */
CR.cl.offerHTML = function () {
  const o = CR.cl.off(), layout = CR.cl.layout(o);
  const card = (a, i, title, sub, extra) =>
    '<button class="cl-amount' + (CR.cl.amountIdx === i ? ' on' : '') + '" onclick="CR.cl.pickAmount(' + i + ')">' +
      '<span class="cl-radio"></span>' +
      '<span class="cl-amount-main"><b>' + title + '</b><small>' + sub + '</small></span>' +
      (a.face > a.paid ? '<span class="cl-bonus">+' + CR.money(a.face - a.paid) + ' bonus</span>' : '') +
    '</button>' + (extra || '');
  const plain = (a, i) => card(a, i, 'Get ' + CR.money(a.face) + ' to spend', 'You pay ' + CR.money(a.paid));
  let cards;
  if (layout === 'C') {
    cards = o.amounts.map((a, i) => {
      const opts = CR.cl.covers(a.face);
      const extra = opts.length ? '<div class="cl-covers"><span>' + CR.money(a.face) + ' to spend: ' + opts.map(c => c.text).join(', or ') + '</span>' +
        '<details><summary>What’s in them</summary>' + CR.cl.uniquePkgs(opts).map(pk => '<div><b>' + pk.name + '</b> ' + CR.money(pk.price) + '<br><small>' + pk.sub + '</small></div>').join('') + '</details></div>' : '';
      return '<div class="cl-amount-wrap">' + plain(a, i) + extra + '</div>';
    }).join('');
  } else if (layout === 'D') {
    cards = o.amounts.map((a, i) => {
      const pk = a.pkgId && CR.ph.product(a.pkgId);
      if (!pk) return '<div class="cl-amount-wrap">' + plain(a, i) + '</div>';
      return '<div class="cl-amount-wrap">' + card(a, i, pk.name + ', pre-order ' + CR.money(a.paid), pk.sub) +
        '<div class="cl-credit-line"><i class="fa-solid fa-wallet"></i> Paid as ' + CR.money(a.face) + ' credit you can spend on this package or anything else in the gallery.</div></div>';
    }).join('');
  } else {
    cards = o.amounts.map(plain).join('');
  }
  const pkgs = CR.ph.examplesOf(o).map(p =>
    '<div class="cl-pkg">' + CR.ph.thumbHTML(p.id, o) +
      '<div class="cl-pkg-main"><b>' + p.name + '</b>' + (p.kind === 'package' ? (p.desc ? '<small class="cl-pkg-desc">' + escHtml(p.desc) + '</small>' : '') + '<small>' + p.sub + '</small>' : '') + '</div>' +
      '<span>' + CR.money(p.price) + '</span></div>').join('');
  const kids = CR.cl.form.children.map(ch => ch.values.q1).filter(Boolean);
  const examples = title => pkgs ? '<div class="cl-group-label">' + title + '</div><div class="cl-sub" style="margin-top:-4px;">Popular choices from ' + CR_DATA.photographer.studio + '. Examples only; you can pick anything.</div>' + pkgs : '';
  /* With a registration fee and optional credit, the family can pay the fee alone. */
  const feeOnly = CR.cl.feeDue() && !CR.cl.mandatory() ? '<button class="cl-amount' + (CR.cl.amountIdx === -2 ? ' on' : '') + '" onclick="CR.cl.pickAmount(-2)">' +
      '<span class="cl-radio"></span><span class="cl-amount-main"><b>Registration only</b><small>No credit for now</small></span></button>' : '';
  const amounts = (cards || '<div class="cl-note">No amounts set yet.</div>') + feeOnly +
    '<div class="cl-fine cl-taxline">Tax and shipping are added at checkout.</div>';
  const fallback = CR.prev.layout === 'D' && layout !== 'D' && CR.cl.isPreview()
    ? '<div class="cl-note"><i class="fa-solid fa-circle-info"></i> Layout D needs amounts set from packages (setup step 1). Showing layout A.</div>' : '';
  const body = layout === 'B' ? examples('What your credit buys') + '<div class="cl-group-label">Choose an amount</div>' + amounts
    : layout === 'C' || layout === 'D' ? amounts
    : amounts + examples('What credit could buy');
  /* Credit the family already holds (decided 2026-11-05): the amount once logged in, a login prompt before that. */
  const s = CR.cl.isPreview() ? { face: 0, balance: 0 } : CR.summary(CR.cl.clientId), more = s.face > 0;
  const held = !more ? '' : CR.cl.authed()
    ? '<div class="cl-credit-bar cl-offer-held"><span><i class="fa-solid fa-wallet"></i> Your credit <small>new credit adds to it</small></span><b>' + CR.money(s.balance) + '</b></div>'
    : '<div class="cl-note"><i class="fa-solid fa-wallet"></i> <span>This email has credit for this job. <button class="cl-link" onclick="CR.au.start(\'offer\')">Log in</button> to see it. New credit adds to it.</span></div>';
  return CR.cl.headerHTML() + CR.cl.stepsHTML(2) + fallback + held +
    '<div class="cl-section-title">' + (more ? 'Add more credit' : 'Buy credit') + '</div>' +
    '<div class="cl-sub">Credit is money to spend on photos once they’re ready' + (kids.length > 1 ? ', in ' + kids.join('’s and ') + '’s galleries' : '') +
      '. You choose what to buy after you’ve seen them, across as many orders as you like.</div>' +
    (CR.cl.isImported() ? CR.cl.knownDetailsHTML() : '') +
    (CR.cl.feeDue() ? '<div class="cl-note"><i class="fa-solid fa-tag"></i> Your registration fee of ' + CR.cl.feeHTML() + ' is paid in the same checkout.</div>' : '') +
    body +
    '<div class="cl-fine" style="text-align:left; margin:14px 0 4px;">Credit expires after <span class="cr-placeholder">[expiry period]</span>. <span class="cr-placeholder">[client terms]</span></div>' +
    (CR.cl.error ? '<div class="cl-error">' + CR.cl.error + '</div>' : '') +
    '<button class="cl-btn" onclick="CR.cl.toPay()">Continue to payment</button>' +
    ((CR.cl.mandatory() || CR.cl.feeDue()) && !CR.cl.isRegistered()
      ? '<div class="cl-fine">' + (CR.cl.mandatory() ? 'Buying credit is part of registering for this job. ' : '') + 'You’re registered once payment goes through.</div>' +
        '<button class="cl-btn-text" onclick="CR.cl.go(\'register\')">Back to your details</button>'
      : !CR.reg.on && ['account'].indexOf(CR.cl.offerBack) < 0 ? ''   /* registration off: the offer is the gallery link's page */
      : '<button class="cl-btn-text" onclick="CR.cl.go(\'' + (CR.cl.offerBack || 'registered') + '\')">Back</button>');
};
/* Layout D needs package-based amounts; without them it shows as A. */
CR.cl.layout = function (o) {
  const l = CR.prev.layout;
  return l === 'D' && !o.amounts.some(a => a.pkgId) ? 'A' : l;
};
/* Layout C: what an amount covers. Combinations of distinct packages that fit, where no further package fits, best
   first; at most two, each with what's left over. */
CR.cl.covers = function (face) {
  const pk = CR.ph.products().filter(p => p.kind === 'package');
  const sets = [];
  const walk = (start, pick, sum) => {
    let grew = false;
    for (let i = start; i < pk.length; i++) if (sum + pk[i].price <= face) { grew = true; walk(i + 1, pick.concat(pk[i]), sum + pk[i].price); }
    if (!grew && pick.length && !pk.some(p => pick.indexOf(p) < 0 && sum + p.price <= face)) sets.push({ pick: pick, sum: sum });
  };
  walk(0, [], 0);
  return sets.sort((a, b) => b.sum - a.sum).slice(0, 2).map(x => ({
    pkgs: x.pick, text: x.pick.slice().sort((p, q) => q.price - p.price).map(p => p.name.split(' — ')[0]).join(' plus ') + (face - x.sum > 0 ? ' (' + CR.money(face - x.sum) + ' left over)' : '')
  }));
};
CR.cl.uniquePkgs = function (opts) {
  const out = [];
  opts.forEach(o => o.pkgs.forEach(p => { if (out.indexOf(p) < 0) out.push(p); }));
  return out;
};
CR.cl.pickAmount = function (i) { CR.cl.amountIdx = i; CR.cl.error = ''; CR.cl.render(); };
CR.cl.toPay = function () {
  if (CR.cl.amountIdx === -2 && CR.cl.feeDue() && !CR.cl.mandatory()) { CR.cl.go('pay'); return; }
  if (CR.cl.amountIdx < 0) { CR.cl.error = 'Choose an amount.'; CR.cl.render(); return; }
  if (!CR.cl.audienceOK()) {
    CR.cl.error = 'Pre-order is for parents and guardians. Use the email the photographer has on file. <span class="cr-placeholder">[audience message: pending]</span>';
    CR.cl.render(); return;
  }
  CR.cl.go('pay');
};

/* ── 4. Payment ── */
/* One checkout: the registration fee (if due) and the credit (if picked) as separate lines. */
CR.cl.feeOnly = function () { CR.cl.amountIdx = -2; return 'pay'; };
CR.cl.payTotal = function () {
  const a = CR.cl.off().amounts[CR.cl.amountIdx];
  return (a ? a.paid : 0) + (CR.cl.feeDue() ? CR.reg.fee.amount : 0);
};
CR.cl.payHTML = function () {
  const a = CR.cl.off().amounts[CR.cl.amountIdx], fee = CR.cl.feeDue();
  return CR.cl.headerHTML() + CR.cl.stepsHTML(2) +
    '<div class="cl-section-title">Payment</div>' +
    '<div class="cl-summary">' +
      (fee ? '<div class="cl-sum-row"><span>Registration fee</span><b>' + CR.cl.feeHTML() + '</b></div>' : '') +
      (a ? '<div class="cl-sum-row"><span>Credit' + (fee ? '' : ' to spend') + '</span><b>' + CR.money(a.paid) + '</b></div>' +
        (fee || a.face > a.paid ? '<div class="cl-sum-row cl-green"><span>To spend on photos</span><span>' + CR.money(a.face) + (a.face > a.paid ? ' · includes +' + CR.money(a.face - a.paid) + ' bonus' : '') + '</span></div>' : '') : '') +
      '<div class="cl-sum-row cl-total"><span>You pay today</span><b>' + CR.money(CR.cl.payTotal()) + '</b></div>' +
    '</div>' +
    (CR.cl.needsDetails() ? CR.cl.detailsHTML() : a && CR.cl.needsConfirm() ? CR.cl.confirmEmailHTML() : '') +
    '<div class="cl-group-label">Card</div>' +
    '<div class="cl-card-fake"><i class="fa-regular fa-credit-card"></i> Card payment form <span class="cr-demo-tag">Not real in the prototype</span></div>' +
    (CR.cl.error ? '<div class="cl-error">' + CR.cl.error + '</div>' : '') +
    (CR.cl.needsConfirm() && a ? '' : '<div class="cl-group-label">Receipt</div>' +
      '<div class="cl-sub" style="margin:0 0 14px;">We’ll send the receipt to <b>' + (CR.cl.form.email ? escHtml(CR.cl.form.email) : 'your email') + '</b>.' + (a ? ' Your credit is held against this email.' : '') + '</div>') +
    '<button class="cl-btn" onclick="CR.cl.pay()">Pay ' + CR.money(CR.cl.payTotal()) + '</button>' +
    '<button class="cl-btn-text" onclick="CR.cl.go(\'offer\')">Back</button>';
};
/* Registration off: the purchase form asks for the details registration would have given. */
CR.cl.needsDetails = function () { return !CR.reg.on && !CR.cl.isRegistered(); };
CR.cl.detailsHTML = function () {
  const f = CR.cl.form;
  const field = (label, key, type) => '<label class="cl-field"><span>' + label + '</span>' +
    '<input class="cl-input" type="' + type + '" value="' + escHtml(f[key] || '') + '" oninput="CR.cl.form.' + key + '=this.value"></label>';
  return '<div class="cl-group-label">Your details</div>' +
    '<div class="cl-row2">' + field('First name', 'first', 'text') + field('Last name', 'last', 'text') + '</div>' +
    field('Email', 'email', 'email') +
    CR.cl.confirmFieldHTML() +
    '<label class="cl-field cl-field-pending"><span>Student <span class="cr-placeholder">[student details: pending]</span></span>' +
      '<input class="cl-input" disabled placeholder="Not decided yet"></label>';
};
/* Confirm email (ecom meeting 2026-11-05): the credit lives on this email for months, so it's typed twice and the
   format is checked. Not asked when the email is already known: logged in, or an imported contact. */
CR.cl.needsConfirm = function () { return !CR.cl.authed() && !CR.cl.isImported(); };
CR.cl.confirmFieldHTML = function () {
  const f = CR.cl.form;
  return '<label class="cl-field"><span>Confirm email</span><input class="cl-input" type="email" autocomplete="off" value="' + escHtml(f.confirm || '') + '" oninput="CR.cl.form.confirm=this.value"></label>' +
    (CR.cl.isPreview() ? '' : '<button class="cr-demo-fill" onclick="CR.cl.form.confirm=CR.cl.form.email; CR.cl.render()">Demo: confirm email</button>');
};
CR.cl.confirmEmailHTML = function () {
  const f = CR.cl.form;
  return '<div class="cl-group-label">Your email</div>' +
    '<div class="cl-sub" style="margin:-4px 0 8px;">Your credit is held against this email, and the receipt goes there.</div>' +
    '<label class="cl-field"><span>Email</span><input class="cl-input" type="email" value="' + escHtml(f.email || '') + '" oninput="CR.cl.form.email=this.value"></label>' +
    CR.cl.confirmFieldHTML();
};
CR.cl.emailError = function () {
  const f = CR.cl.form, e = (f.email || '').trim(), c = (f.confirm || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'Check the email address.';
  if (e.toLowerCase() !== c.toLowerCase()) return 'The emails don’t match.';
  return '';
};
CR.cl.pay = function () {
  if (CR.cl.isPreview()) { toast('Preview only: no payment is taken'); return; }
  const a = CR.cl.off().amounts[CR.cl.amountIdx], fee = CR.cl.feeDue();
  if (a && CR.cl.needsConfirm()) {
    const err = CR.cl.emailError();
    if (err) { CR.cl.error = err; CR.cl.render(); return; }
  }
  if (CR.cl.needsDetails()) {
    const f = CR.cl.form;
    if (!(f.first || '').trim() || !/.+@.+\..+/.test(f.email || '')) { CR.cl.error = 'Please add your name and email.'; CR.cl.render(); return; }
    const me = CR.cl.client();
    if (me.isNew) { me.email = f.email.trim(); me.name = (f.first.trim() + ' ' + (f.last || '').trim()).trim(); }
  }
  CR.cl.lastPurchase = a ? { paid: a.paid, face: a.face, more: CR.summary(CR.cl.clientId).face > 0 } : null;
  CR.cl.feeJustPaid = fee ? CR.reg.fee.amount : 0;
  if (CR.cl.client().isNew && CR.cl.form.email) CR.cl.client().email = CR.cl.form.email.trim();
  /* With registration off, buying credit doesn't register the family: the credit stands on its own. */
  CR.cl.justRegistered = CR.reg.on && !CR.registered[CR.cl.clientId];
  /* With mandatory credit, this payment is what completes the registration. */
  if (CR.reg.on) CR.registered[CR.cl.clientId] = true;
  CR.cl.go('confirm');
  if (a) CR.add({ type: 'purchase', clientId: CR.cl.clientId, paid: a.paid, face: a.face });
  else CR.changed();
};

/* Where the credit can be spent, in the client's words. */
CR.cl.whereText = function () {
  const kids = CR.cl.client().galleries.map(CR.cl.childName).filter(Boolean);
  return 'Any gallery in ' + CR_DATA.job.name + (kids.length ? ', including ' + kids.join('’s and ') + '’s' : '');
};

/* ── 5. Confirmation ── */
CR.cl.confirmHTML = function () {
  const s = CR.summary(CR.cl.clientId), justReg = CR.cl.justRegistered;
  const feeRow = CR.cl.feeJustPaid ? '<div class="cl-sum-row"><span>Registration fee paid</span><b>' + CR.money(CR.cl.feeJustPaid) + '</b></div>' : '';
  if (!CR.cl.lastPurchase && CR.cl.feeJustPaid) {   /* the fee alone, no credit */
    return '<div class="cl-done"><div class="cl-done-icon"><i class="fa-solid fa-check"></i></div>' +
        '<div class="cl-section-title" style="text-align:center;">You’re registered</div>' +
        '<div class="cl-sub" style="text-align:center;">' + CR.cl.thanks() + 'We’ll email you when photos are ready.</div></div>' +
      CR.cl.kidsHTML(CR.answers[CR.cl.clientId] || []) +
      '<div class="cl-summary">' + feeRow + '</div>' +
      (CR.cl.offerState() === 'open' ? '<div class="cl-note"><i class="fa-solid fa-tag"></i> You can buy credit later from the gallery link.</div>' : '');
  }
  const p = CR.cl.lastPurchase || { paid: s.paid, face: s.face };   /* this purchase; the balance pools every purchase */
  return '<div class="cl-done"><div class="cl-done-icon"><i class="fa-solid fa-check"></i></div>' +
      '<div class="cl-section-title" style="text-align:center;">' + (justReg ? 'You’re registered' : 'You have ' + CR.money(s.balance) + ' of credit') + '</div>' +
      '<div class="cl-sub" style="text-align:center;">' + CR.cl.thanks() + (justReg
        ? 'You have ' + CR.money(s.balance) + ' of credit, ready for picture day.'
        : p.more ? 'Your new credit is added to what you already had.' : 'Your credit is ready for picture day.') + '</div></div>' +
    (justReg ? CR.cl.kidsHTML(CR.answers[CR.cl.clientId] || []) : '') +
    '<div class="cl-summary">' + feeRow +
      '<div class="cl-sum-row"><span>' + (feeRow ? 'Credit: you paid' : 'You paid') + '</span><b>' + CR.money(p.paid) + '</b></div>' +
      '<div class="cl-sum-row"><span>Credit to spend</span><b>' + CR.money(p.face) + '</b></div>' +
      (p.face > p.paid ? '<div class="cl-sum-row cl-green"><span>Bonus included</span><span>+' + CR.money(p.face - p.paid) + '</span></div>' : '') +
      (p.more ? '<div class="cl-sum-row cl-total"><span>Your credit now</span><b>' + CR.money(s.balance) + '</b></div>' : '') +
    '</div>' +
    '<div class="cl-facts">' +
      '<div><i class="fa-solid fa-images"></i><span><b>Where to spend it</b>' + CR.cl.whereText() + '. On anything in the gallery, across as many orders as you like.</span></div>' +
      '<div><i class="fa-regular fa-envelope"></i><span><b>When</b>We’ll email you when photos are ready.</span></div>' +
      '<div><i class="fa-regular fa-clock"></i><span><b>Expiry</b>Credit expires after <span class="cr-placeholder">[expiry period]</span>. <span class="cr-placeholder">[client terms]</span></span></div>' +
    '</div>' +
    '<div class="cl-note"><i class="fa-regular fa-user"></i> To spend it, use the link in your emails, or log in with your email and a code. No password needed.</div>' +
    '<button class="cl-btn" style="margin-top:12px;" onclick="CR.cl.go(\'emailPurchase\')"><i class="fa-regular fa-envelope"></i> See the confirmation email</button>';
};

/* Who can pre-order (decided 2026-11-05): the audience the photographer chose. The sample job's contacts have parent
   and student audiences; Tom's son Aiden has a student email in the sample data. */
CR.cl.audienceOK = function () {
  if (CR.cl.isPreview()) return true;
  const aud = CR.cl.off().audience || 'parents', email = (CR.cl.form.email || CR.cl.client().email || '').trim().toLowerCase();
  if (aud === 'everyone') return true;
  const student = (CR_DATA.studentContacts || []).some(x => x.email.toLowerCase() === email);
  return aud === 'students' ? student : !student;
};
CR.cl.studentFillHTML = function () {
  const st = (CR_DATA.studentContacts || []).find(x => x.clientId === CR.cl.clientId);
  return st && !CR.cl.isPreview() ? '<button class="cr-demo-fill" onclick="CR.cl.form.email=\'' + st.email + '\'; CR.cl.render()">Demo: use ' + escHtml(st.name.split(' ')[0]) + '’s student email</button>' : '';
};

CR.cl.mount();
