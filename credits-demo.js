/* Demo control: prototype only, never part of the product. Four independent parts:
   1. Moment in time: where the Riverside job is (sets the job phase and the demo's "today").
   2. Preview options: offer layout, how the family arrives, wording (meeting 2026-11-04).
   3. Test users: each user's live status, the state they start in, and buttons to open or reset them.
   4. Resets: users and settings reset separately, so the photographer settings survive a users reset. */
CR.demo = { open: false };

CR.demo.mount = function () {
  const el = document.createElement('div');
  el.id = 'cr-demo';
  el.className = 'cr-demo';
  document.body.appendChild(el);
  CR.demo.render();
  CR.onChange(CR.demo.render);
};

CR.demo.toggle = function () {
  CR.demo.open = !CR.demo.open;
  CR.demo.render();
};

CR.demo.fmt = function (d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

CR.demo.momentHTML = function () {
  const w = CR.windowOffsets();
  const plus = n => { const d = CR.shootDate(); d.setDate(d.getDate() + n); return CR.demo.fmt(d); };
  return '<div class="cr-demo-sec"><div class="cr-demo-sec-title"><span>1</span> Moment in time</div>' +
    '<div class="cr-demo-sec-sub">Picture day ' + CR.demo.fmt(CR.shootDate()) + ' · credit on sale ' + plus(w.opens) + ' – ' + plus(w.closes) + '</div>' +
    CR.MOMENTS.map(m =>
      '<label class="cr-demo-radio' + (CR.moment === m[0] ? ' on' : '') + '">' +
        '<input type="radio" name="cr-moment"' + (CR.moment === m[0] ? ' checked' : '') + ' onchange="CR.setMoment(\'' + m[0] + '\')">' +
        '<span>' + m[1] + '</span><small>Today: ' + CR.demo.fmt(CR.demoToday(m[0])) + '</small>' +
      '</label>').join('') +
    '<div class="cr-demo-regline">Registration: ' + (CR.reg.on ? 'on · ' + CR.ph.regStatusText() : 'off') + '</div>' +
  '</div>';
};

/* Preview options: switches for showing photographers alternatives. Defaults are today's version. */
CR.demo.PREVIEW = [
  ['Offer layout', 'layout', 'CR.setLayout', [['A', 'A · Current'], ['B', 'B · Packages first'], ['C', 'C · Connected'], ['D', 'D · Package-priced']]],
  ['Family arrives', 'arrival', 'CR.setArrival', [['anonymous', 'Anonymous registration'], ['imported', 'Imported contact'], ['off', 'Registration off']]],
  ['Wording', 'words', 'CR.setWords', [['credit', 'Credit'], ['session', 'Session fee']]]
];
CR.demo.previewHTML = function () {
  const hint = { imported: 'Dana Smith is the imported contact: open her Invitation email.', off: 'The gallery link opens the offer; families buy with name and email.' };
  return '<div class="cr-demo-sec"><div class="cr-demo-sec-title"><span>2</span> Preview options</div>' +
    '<div class="cr-demo-sec-sub">Alternatives to show photographers. The first option is today’s version.</div>' +
    CR.demo.PREVIEW.map(g => '<div class="cr-demo-opt"><div class="cr-demo-opt-label">' + g[0] + '</div><div class="cr-demo-chips">' +
      g[3].map(o => '<button class="' + (CR.prev[g[1]] === o[0] ? 'on' : '') + '" onclick="' + g[2] + '(\'' + o[0] + '\')">' + o[1] + '</button>').join('') + '</div>' +
      (g[1] === 'arrival' && hint[CR.prev.arrival] ? '<div class="cr-demo-opt-hint">' + hint[CR.prev.arrival] + '</div>' : '') +
      (g[1] === 'layout' && CR.prev.layout === 'D' ? '<div class="cr-demo-opt-hint">Set the amounts in setup step 1 › Set amounts from packages.</div>' : '') +
    '</div>').join('') +
  '</div>';
};

CR.demo.eventsText = function (id) {
  return CR.eventsFor(id).map(e => e.type === 'purchase'
    ? 'Bought ' + CR.money(e.paid) + ' for ' + CR.money(e.face) + ' · ' + CR.fmtDate(e.date)
    : e.type.charAt(0).toUpperCase() + e.type.slice(1) + ' ' + CR.money(e.amount) + ' · ' + CR.fmtDate(e.date)).join('<br>');
};

CR.demo.usersHTML = function () {
  const rows = CR_DATA.clients.map(c => {
    const st = CR.userStatus(c.id), ini = c.name.split(' ').map(p => p[0]).join('').slice(0, 2);
    const kids = c.galleries.length ? c.galleries.length + (c.galleries.length === 1 ? ' child' : ' children') : '';
    const opts = CR.startOptions(c), start = CR.startOf(c.id);
    const events = CR.demo.eventsText(c.id);
    return '<div class="cr-demo-user">' +
      '<div class="cr-demo-user-head">' +
        '<span class="cr-demo-ini">' + ini + '</span>' +
        '<span class="cr-demo-user-name"><b>' + escHtml(c.name) + '</b><small>' + (kids || 'Added during testing') + '</small></span>' +
        '<span class="cr-demo-status s-' + st.key + '">' + st.text + '</span>' +
      '</div>' +
      (events ? '<div class="cr-demo-events">' + events + '</div>' : '') +
      '<div class="cr-demo-user-actions">' +
        (opts.length > 1
          ? '<label class="cr-demo-start">Starts as <select onchange="CR.setUserStart(\'' + c.id + '\', this.value)">' +
              opts.map(o => '<option value="' + o[0] + '"' + (o[0] === start ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>'
          : '<span class="cr-demo-start"></span>') +
        (c.isNew ? '' : '<label class="cr-demo-start cr-demo-acc" title="Everyone logs in with an access code; a password is optional">Password <select onchange="CR.setUserAccount(\'' + c.id + '\', this.value === \'yes\')">' +
          '<option value="no"' + (CR.accounts[c.id] ? '' : ' selected') + '>None</option>' +
          '<option value="yes"' + (CR.accounts[c.id] ? ' selected' : '') + '>Set</option></select></label>') +
        '<button class="cr-demo-mini" title="Back to the starting state" onclick="CR.resetUser(\'' + c.id + '\')"><i class="fa-solid fa-rotate-left"></i></button>' +
      '</div>' +
      '<div class="cr-demo-entries">' + CR.cl.entries(c.id).map((e, i) =>
        '<button class="cr-demo-entry' + (i === 0 ? ' main' : '') + '" onclick="CR.cl.open(\'' + c.id + '\', \'' + e[0] + '\')">' + e[1] + '</button>').join('') + '</div>' +
    '</div>';
  }).join('');
  return '<div class="cr-demo-sec"><div class="cr-demo-sec-title"><span>3</span> Test users</div>' +
    '<div class="cr-demo-sec-sub">Open what the family has right now: links and emails change with the moment and their state. The dark one fits best.</div>' +
    rows +
    '<button class="cr-demo-new" onclick="CR.cl.openNew()"><i class="fa-solid fa-plus"></i> New family <small>blank registration form</small></button>' +
  '</div>';
};

CR.demo.resetsHTML = function () {
  const btn = (fn, icon, label, hint) =>
    '<button class="cr-demo-reset" onclick="' + fn + '"><i class="fa-solid ' + icon + '"></i><span><b>' + label + '</b><small>' + hint + '</small></span></button>';
  return '<div class="cr-demo-sec"><div class="cr-demo-sec-title"><span>4</span> Reset</div>' +
    btn('CR.resetUsers(); toast(\'Test users reset · settings kept\')', 'fa-users', 'Reset all users', 'Back to their starting states. Your settings stay.') +
    btn('CR.resetSettings(false); toast(\'Settings reset to the sample\')', 'fa-sliders', 'Reset settings', 'Credit offer, switches and questions back to the sample. Users stay.') +
    btn('CR.resetSettings(true); toast(\'Credit offer emptied\')', 'fa-eraser', 'Empty credit offer', 'Set up the offer from scratch. Users stay.') +
    '<div class="cr-demo-foot">Reloading the page resets everything.</div>' +
  '</div>';
};

CR.demo.render = function () {
  const el = document.getElementById('cr-demo');
  if (!el) return;
  if (!CR.demo.open) {
    el.innerHTML = '<button class="cr-demo-pill" onclick="CR.demo.toggle()"><i class="fa-solid fa-sliders"></i> Demo control</button>';
    return;
  }
  const prev = el.querySelector('.cr-demo-panel');
  const scroll = prev ? prev.scrollTop : 0;
  el.innerHTML =
    '<div class="cr-demo-panel">' +
      '<div class="cr-demo-head">' +
        '<div><div class="cr-demo-eyebrow">Prototype only</div><div class="cr-demo-title">Demo control</div></div>' +
        '<button class="cr-demo-close" onclick="CR.demo.toggle()" title="Close"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>' +
      CR.demo.momentHTML() + CR.demo.previewHTML() + CR.demo.usersHTML() + CR.demo.resetsHTML() +
    '</div>';
  el.querySelector('.cr-demo-panel').scrollTop = scroll;
};

CR.demo.mount();
