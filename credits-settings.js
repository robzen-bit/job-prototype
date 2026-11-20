/* Selling settings: the job's Selling & Registration tab, and the new-job wizard's Ecommerce step (Robert renders the
   wizard from his Ecommerce pane). In a job, Robert's Settings › Ecommerce pane now only points to the tab: price
   list, credit sales and package-first checkout for the job live there, next to credits and registration.
   There is no standard selling switch (decided 2026-11-05): the shop is always open, and a minimum order can apply to
   families without credit. Package-first checkout; the price list guard.
   The price list's own settings (minimum order, package required) live in the price list editor, not on the job: a
   price list is shared by every job that uses it (2026-11-05). The job tab shows them read-only.
   Robert's pre-order discount, "No shipping fee" and "Packages only" are removed. His globals keep working for the
   rest of his code with new meanings: preorderOn = credit sales on, prePackagesOnly = package-first checkout. */
CR.set = { pendingPL: null, guard: '' };

CR.set.isRiverside = function () { return uiCtx === 'settings' && loadedJobKey === 'riverside'; };
CR.set.key = function () { return uiCtx === 'settings' ? loadedJobKey : 'wizard'; };
CR.set.creditOn = function () { return CR.set.isRiverside() ? CR.settings.creditSalesOn : preorderOn; };
CR.set.pkgFirst = function () { return CR.set.isRiverside() ? CR.settings.packageFirstCheckout : prePackagesOnly; };
CR.set.offerLive = function () { return CR.set.isRiverside() && CR.offer.status === 'published'; };
CR.set.priceLists = function () { return [CR_DATA.priceList.name].concat(PRICE_LISTS.filter(p => p !== CR_DATA.priceList.name)); };

/* Riverside's switches live on CR.settings (the Credits tab uses them too); mirror them into Robert's globals. */
CR.set.sync = function () {
  if (!CR.set.isRiverside()) return;
  preorderOn = CR.settings.creditSalesOn;
  prePackagesOnly = CR.settings.packageFirstCheckout;
};

const crRobertLoadJobSettings = loadJobSettings;
loadJobSettings = function (j) {
  crRobertLoadJobSettings(j);
  if (j.key === 'riverside' && !ecomPriceList) { ecomPriceList = CR_DATA.priceList.name; ecomPLTouched = true; }
  CR.set.pendingPL = null;
  CR.set.guard = '';
  CR.set.changingPL = false;
  CR.set.sync();
  CR.ph.render();   /* openJob() builds the tab before it loads the job's settings: draw the Selling card again */
};


/* ── Pane ── */
ecomPaneHTML = function () {
  return '<div id="wz-ecom-headline" style="font-size:13px; color:var(--text-2); line-height:1.65; margin:0 0 12px;"></div>' +
    '<div class="f-label" style="margin-bottom:6px;">Price List</div>' +
    '<select class="f-input" id="wz-ecom-pricelist" onchange="onEcomPriceListChange()"></select>' +
    '<div id="cr-ecom-body"></div>';
};

renderEcomStep = function () {
  const mount = document.getElementById(ecomMountId());
  if (!mount) return;
  const other = document.getElementById(uiCtx === 'settings' ? 'wiz-ecom-mount' : 'set-ecom-mount');
  if (other) other.innerHTML = '';
  if (uiCtx === 'settings') { mount.innerHTML = CR.set.movedHTML(); return; }   /* job settings: moved to the tab */
  mount.innerHTML = ecomPaneHTML();
  /* Robert's: follow the preset until the user makes their own pick */
  if (!ecomPLTouched) ecomPriceList = presetPriceList();
  const fromPreset = presetPriceList();
  /* Riverside's price list comes from the credits sample, not a preset, so the preset sentence would be wrong there. */
  if (CR.set.isRiverside()) document.getElementById('wz-ecom-headline').style.display = 'none';
  else document.getElementById('wz-ecom-headline').innerHTML = fromPreset
    ? 'You chose to use the <b>' + escHtml(wizActivePreset()) + '</b> preset. This preset included the price list shown below. However, if you’d like to use a different price list, you can select a different price list from the dropdown below.'
    : 'You chose to use the <b>' + escHtml(wizActivePreset()) + '</b> preset. This preset did not include a price list. Would you like to add a price list for this job? If so, please select one from the dropdown below.';
  CR.set.paintSelect();
  paintEcomEnablement();
};

CR.set.paintSelect = function () {
  const sel = document.getElementById('wz-ecom-pricelist');
  if (!sel) return;
  sel.innerHTML = '<option value=""' + (!ecomPriceList ? ' selected' : '') + '>Please select a price list</option>' +
    CR.set.priceLists().map(pl => '<option' + (pl === ecomPriceList ? ' selected' : '') + '>' + pl + '</option>').join('');
};

paintEcomEnablement = function () {
  if (uiCtx === 'settings') { persistJobSettings(); CR.ph.render(); return; }   /* the Selling card in the tab */
  const body = document.getElementById('cr-ecom-body');
  if (body) body.innerHTML = CR.set.bodyHTML();
};

/* Robert's Settings › Ecommerce pane in a job: a pointer to the tab that now holds these settings. */
CR.set.movedHTML = function () {
  return '<div class="cr-moved"><i class="fa-solid fa-arrow-right-arrow-left"></i><div>' +
    '<b>Selling settings have moved</b>' +
    '<span>Price list, credit sales and package-first checkout are in the job’s Selling &amp; Registration tab, next to credits and registration.</span>' +
    '<button class="btn btn-ghost-sm" onclick="switchJobTabById(\'tab-preorders\')">Open Selling &amp; Registration</button>' +
  '</div></div>';
};

/* The Selling card at the top of the Selling & Registration tab, for every job. */
CR.set.sellingCardHTML = function () {
  if (uiCtx !== 'settings') return '';
  return '<div class="detail-card" id="cr-selling">' +
    '<div class="detail-card-header" style="margin:0;">Selling</div>' +
    '<div class="cr-offer-sub">What clients can buy on this job, and the price list it comes from.</div>' +
    '<div class="f-label" style="margin:14px 0 6px;">Price List</div>' +
    (!ecomPriceList || CR.set.changingPL || CR.set.pendingPL !== null
      ? '<div class="cr-pl-change"><select class="f-input" id="wz-ecom-pricelist" onchange="onEcomPriceListChange()">' +
          '<option value=""' + (!ecomPriceList ? ' selected' : '') + '>Please select a price list</option>' +
          CR.set.priceLists().map(pl => '<option' + (pl === ecomPriceList ? ' selected' : '') + '>' + pl + '</option>').join('') +
        '</select>' + (ecomPriceList ? '<button class="btn btn-ghost-sm" onclick="CR.set.startChange(false)">Cancel</button>' : '') + '</div>'
      : '') +
    CR.set.bodyHTML() +
  '</div>';
};

/* Switching the price list under a live offer warns first. */
onEcomPriceListChange = function () {
  const v = fval('wz-ecom-pricelist');
  if (CR.set.offerLive() && v !== ecomPriceList) {
    CR.set.pendingPL = v;
    CR.set.paintSelect();
    paintEcomEnablement();
    return;
  }
  ecomPriceList = v;
  ecomPLTouched = true;
  CR.set.changingPL = false;
  paintEcomEnablement();
};

CR.set.confirmSwitch = function (yes) {
  if (yes) { ecomPriceList = CR.set.pendingPL; ecomPLTouched = true; toast('Price list changed to ' + ecomPriceList); }
  CR.set.pendingPL = null;
  CR.set.changingPL = false;
  CR.set.paintSelect();
  paintEcomEnablement();
};
/* In the tab, the chosen price list shows as one card; "Change" swaps in the dropdown. */
CR.set.startChange = function (on) { CR.set.changingPL = on; CR.set.guard = ''; paintEcomEnablement(); };

/* Robert's handlers for removed controls: kept harmless in case anything still calls them. */
togglePreorder = function () { CR.set.toggleCredit(); };
updateDiscountWarn = function () {};
onPreCheckChange = function () {};

CR.set.toggleCredit = function () {
  if (!ecomPriceList) return;
  if (CR.set.isRiverside()) { CR.settings.creditSalesOn = !CR.settings.creditSalesOn; CR.changed(); }
  else { preorderOn = !preorderOn; paintEcomEnablement(); }
};
/* Price list settings, edited only in the price list editor (below). Package required and Only sell packages are
   mutually exclusive (ADO 85337): turning one on turns the other off. */
CR.set.togglePkgFirstPL = function () {
  CR.settings.pkgFirstPriceList = !CR.settings.pkgFirstPriceList;
  if (CR.settings.pkgFirstPriceList && CR.settings.pkgOnlyPriceList) { CR.settings.pkgOnlyPriceList = false; toast('Only sell packages turned off'); }
  CR.changed();
};
CR.set.togglePkgOnlyPL = function () {
  CR.settings.pkgOnlyPriceList = !CR.settings.pkgOnlyPriceList;
  if (CR.settings.pkgOnlyPriceList && CR.settings.pkgFirstPriceList) { CR.settings.pkgFirstPriceList = false; toast('Package required before checkout turned off'); }
  CR.changed();
};
/* The rule checkout follows: the job's setting when it's on, otherwise the price list's ([precedence: pending]). */
CR.set.pkgFirstEffective = function () { return !!(CR.settings.packageFirstCheckout || CR.settings.pkgFirstPriceList); };
CR.set.togglePkgFirst = function () {
  if (CR.set.isRiverside()) { CR.settings.packageFirstCheckout = !CR.settings.packageFirstCheckout; CR.changed(); }
  else { prePackagesOnly = !prePackagesOnly; paintEcomEnablement(); }
};

CR.set.editPriceList = function () {
  if (CR.set.offerLive()) { CR.set.guard = CR.set.guard === 'edit' ? '' : 'edit'; paintEcomEnablement(); }
  else if (CR.set.isRiverside() && ecomPriceList === CR_DATA.priceList.name) CR.set.openPL();
  else toast('Opening price list…');
};
CR.set.deletePriceList = function () {
  if (CR.set.offerLive()) { CR.set.guard = 'delete'; paintEcomEnablement(); }
  else toast('Deleting price lists isn’t part of this prototype');
};
CR.set.closeGuard = function () { CR.set.guard = ''; paintEcomEnablement(); };

/* What a price list change touches on this job, from the ledger and the offer. */
CR.set.impactText = function () {
  const f = CR.jobFigures(), n = CR.offer.examples.length;
  return 'the margin view, ' + (n ? n + ' example product' + (n === 1 ? '' : 's') + ' clients see, ' : '') +
    'and what ' + f.clientsWithBalance + ' clients holding ' + CR.money(f.outstanding) + ' of credit can buy';
};

CR.set.bodyHTML = function () {
  const hasPL = !!ecomPriceList, live = CR.set.offerLive();
  const credit = CR.set.creditOn();
  const ctx = uiCtx === 'settings' ? 'tab' : 'wizard';
  let html = '';

  if (CR.set.pendingPL !== null) {
    html += '<div class="ecom-warn cr-guard"><i class="fa-solid fa-triangle-exclamation"></i><div>' +
      '<b>' + escHtml(ecomPriceList) + ' is used by this job’s live credit offer.</b> Switching to ' +
      (CR.set.pendingPL ? escHtml(CR.set.pendingPL) : 'no price list') + ' changes ' + CR.set.impactText() + '. Families keep their credit; only what it can buy changes.' +
      '<div class="cr-guard-actions"><button class="btn btn-ghost-sm" onclick="CR.set.confirmSwitch(false)">Keep ' + escHtml(ecomPriceList) + '</button>' +
      '<button class="btn btn-ghost-sm cr-btn-warn" onclick="CR.set.confirmSwitch(true)">Switch anyway</button></div></div></div>';
  }

  const inTab = ctx === 'tab' && !CR.set.changingPL && CR.set.pendingPL === null;
  if (hasPL && (ctx === 'wizard' || inTab)) {
    const known = ecomPriceList === CR_DATA.priceList.name;
    html += '<div class="cr-pl-card"' + (ctx === 'tab' ? ' style="margin-top:0;"' : '') + '>' +
      '<div class="cr-pl-icon"><i class="fa-solid fa-tags"></i></div>' +
      '<div class="cr-pl-main"><b>' + escHtml(ecomPriceList) + '</b>' +
        '<small>' + (known ? CR_DATA.priceList.items.length + ' items · ' + CR_DATA.priceList.packages.length + ' packages' : 'Price list') +
        (live ? ' · <span class="cr-pl-live"><i class="fa-solid fa-lock"></i> Used by a live credit offer</span>' : '') + '</small></div>' +
      (ctx === 'tab' ? '<button class="btn btn-ghost-sm" onclick="CR.set.startChange(true)">Change</button>' +
        '<button class="btn btn-ghost-sm" onclick="CR.set.editPriceList()">Edit</button>' +
        '<button class="btn btn-ghost-sm" onclick="CR.set.deletePriceList()">Delete</button>' : '') +
    '</div>';
    if (CR.set.guard === 'delete') {
      html += '<div class="cr-block"><i class="fa-solid fa-ban"></i><div><b>' + escHtml(ecomPriceList) + ' can’t be deleted.</b> ' +
        'A live credit offer on this job uses it, and clients hold credit to spend on it.' +
        '<div class="cr-guard-actions"><button class="btn btn-ghost-sm" onclick="CR.set.closeGuard()">OK</button></div></div></div>';
    }
    if (CR.set.guard === 'edit') {
      html += '<div class="ecom-warn cr-guard"><i class="fa-solid fa-triangle-exclamation"></i><div>' +
        '<b>Editing ' + escHtml(ecomPriceList) + ' affects this job’s live credit offer:</b> ' + CR.set.impactText() + '. ' +
        'Price changes apply to every job using this price list. Families keep their credit; only what it can buy changes.' +
        '<div class="cr-guard-actions"><button class="btn btn-ghost-sm" onclick="CR.set.closeGuard()">Cancel</button>' +
        '<button class="btn btn-ghost-sm cr-btn-warn" onclick="CR.set.closeGuard(); CR.set.openPL()">Open price list</button></div></div></div>';
    }
  } else if (!hasPL) {
    html += '<div class="toggle-row-desc" style="color:var(--orange); margin-top:8px;">Select a price list above to sell on this job.</div>';
  }

  /* In the tab the credit offer sits right below, so only the wizard needs a pointer to it. */
  const creditStatus = ctx === 'wizard' ? 'You’ll set amounts, bonuses and example products in the job’s Selling &amp; Registration tab after creating the job.' : '';

  html += '<div class="cr-ecom-box' + (hasPL ? '' : ' ecom-disabled') + '">' +
    '<div class="toggle-row"><div>' +
      '<div class="toggle-row-title">Credit sales <span class="cr-placeholder">[name pending]</span></div>' +
      '<div class="toggle-row-desc">Clients buy credit before picture day and spend it on anything in the price list, across as many orders as they like.</div>' +
      (creditStatus ? '<div class="toggle-row-desc cr-credit-status">' + creditStatus + '</div>' : '') +
    '</div><button class="toggle' + (hasPL && credit ? ' on' : '') + '" onclick="CR.set.toggleCredit()"></button></div>' +
  '</div>';

  if (hasPL) html += '<div class="toggle-row-desc" style="margin-top:8px;">Clients can always buy from their gallery at price list prices once photos are ready.</div>';

  /* Package-first checkout is a selling rule: it applies to every order, paid with credit or not. Two settings in two
     places: on the job (here) and on the price list (price list editor). How they interact is open
     ([precedence: pending]); the prototype applies the job's when it's on, otherwise the price list's. */
  const plName = ecomPriceList || 'the price list';
  html += '<div class="ecom-nest' + (hasPL ? '' : ' ecom-disabled') + '">' +
    '<div class="f-label" style="margin-bottom:2px;">Checkout</div>' +
    '<label class="ecom-check" style="border-top:0;"><input type="checkbox"' + (CR.set.pkgFirst() ? ' checked' : '') + ' onchange="CR.set.togglePkgFirst()">' +
      '<span><b>Package-first checkout on this job</b><small>Checkout needs at least one package in the cart. Single items stay available. Applies to every order on this job.</small></span></label>' +
  '</div>' +
    (CR.set.isRiverside() && hasPL ? CR.set.fromPLHTML(plName) : '');
  return html;
};

/* Wizard review: Robert's Ecommerce row still talks about pre-orders; rewrite it in credit terms. */
const crRobertBuildReview = buildReview;
buildReview = function () {
  const out = crRobertBuildReview.apply(this, arguments);
  document.querySelectorAll('#wz-review .review-row').forEach(row => {
    const key = row.querySelector('.review-key'), val = row.querySelector('.review-val');
    if (!key || key.textContent !== 'Ecommerce' || !val || !ecomPriceList) return;
    val.textContent = ecomPriceList + ' · Credit sales ' + (preorderOn ? 'on' : 'off') + (prePackagesOnly ? ' · Package-first checkout' : '');
  });
  return out;
};

/* What the price list says, read-only on the job tab, with a link to edit it there. */
CR.set.fromPLHTML = function (plName) {
  const m = CR.settings.minOrder, onOff = v => '<b>' + (v ? 'On' : 'Off') + '</b>';
  return '<div class="cr-from-pl">' +
    '<div class="cr-from-pl-head"><span class="f-label" style="margin:0;">From the price list · ' + escHtml(plName) + '</span>' +
      '<button class="cl-link cr-from-pl-edit" onclick="CR.set.openPL()">Edit in price list</button></div>' +
    '<div>Package required before checkout: ' + onOff(CR.settings.pkgFirstPriceList) + ' <span class="cr-placeholder">[precedence: pending]</span></div>' +
    '<div>Only sell packages: ' + onOff(CR.settings.pkgOnlyPriceList) + '</div>' +
    '<div>Minimum order for families without credit: <b>' + (m.on && m.amount > 0 ? CR.money(m.amount) : 'Off') + '</b></div>' +
  '</div>';
};

/* ── Price list editor (2026-11-05). Robert's prototype has none, so this is a small one in his modal style: the price
   list's own settings, plus its products read-only. Settings apply as they change. ── */
CR.set.openPL = function () {
  let el = document.getElementById('cr-pl-editor');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cr-pl-editor';
    el.className = 'modal-overlay';
    el.onclick = e => { if (e.target === el) CR.set.closePL(); };
    document.body.appendChild(el);
  }
  el.classList.add('open');
  CR.set.plOpen = true;
  CR.set.renderPL();
};
CR.set.closePL = function () {
  const el = document.getElementById('cr-pl-editor');
  if (el) el.classList.remove('open');
  CR.set.plOpen = false;
};
CR.set.setMin = function (v) { CR.settings.minOrder.amount = Math.max(0, parseFloat(v) || 0); CR.changed(); };
CR.set.toggleMin = function () { CR.settings.minOrder.on = !CR.settings.minOrder.on; CR.changed(); };
CR.set.renderPL = function () {
  const el = document.getElementById('cr-pl-editor');
  if (!el || !CR.set.plOpen) return;
  const pl = CR_DATA.priceList, m = CR.settings.minOrder, live = CR.offer.status === 'published';
  el.innerHTML = '<div class="modal cr-pl-modal">' +
    '<div class="modal-header"><div><div class="modal-title">' + escHtml(pl.name) + '</div><div class="modal-subtitle">Price list</div></div>' +
      '<button class="modal-close" onclick="CR.set.closePL()"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="modal-body">' +
      '<div class="cr-note"><i class="fa-solid fa-circle-info"></i> Used by 1 job' + (live ? ' with a live credit offer' : '') + ' (' + escHtml(CR_DATA.job.name) + '). Changes here apply to every job using this price list.</div>' +
      '<div class="f-label" style="margin:16px 0 4px;">Settings</div>' +
      '<label class="ecom-check" style="border-top:0;"><input type="checkbox"' + (CR.settings.pkgFirstPriceList ? ' checked' : '') + ' onchange="CR.set.togglePkgFirstPL()">' +
        '<span><b>Package required before checkout</b><small>Single items stay available; checkout needs at least one package in the cart. Applies to regular selling and credits on every job using this price list. A job can also require it on its own <span class="cr-placeholder">[precedence: pending]</span>.</small></span></label>' +
      '<label class="ecom-check"><input type="checkbox"' + (CR.settings.pkgOnlyPriceList ? ' checked' : '') + ' onchange="CR.set.togglePkgOnlyPL()">' +
        '<span><b>Only sell packages</b><small>Clients can buy packages only. <span class="cr-placeholder">[only sell packages: pending]</span> (in the prototype the shop lists packages only).</small></span></label>' +
      '<div class="cr-muted cr-pl-excl">Package required and Only sell packages can’t both be on. Turning one on turns the other off.</div>' +
      '<label class="ecom-check"><input type="checkbox"' + (m.on ? ' checked' : '') + ' onchange="CR.set.toggleMin()">' +
        '<span><b>Minimum order for families without credit</b><small>Families who bought credit never have a minimum. Counted on products only: shipping doesn’t count.</small>' +
        (m.on ? '<span class="cr-min-amount"><span>$</span><input class="f-input" type="number" min="1" step="1" value="' + m.amount + '" aria-label="Minimum order amount" onchange="CR.set.setMin(this.value)"></span>' : '') +
      '</span></label>' +
      '<div class="f-label" style="margin:18px 0 4px;">Products <span class="cr-demo-tag">Product editing isn’t part of the prototype</span></div>' +
      '<div class="cr-pl-products">' +
        pl.packages.map(p => '<div class="cr-pl-prod"><span><b>' + escHtml(p.name) + '</b><small>Package · ' + CR.ph.pkgContents(p) + '</small></span><span>' + CR.money(p.price) + '</span></div>').join('') +
        pl.items.map(i => '<div class="cr-pl-prod"><span><b>' + escHtml(i.name) + '</b></span><span>' + CR.money(i.price) + '</span></div>').join('') +
      '</div>' +
    '</div>' +
    '<div class="modal-footer"><button class="btn btn-brand" onclick="CR.set.closePL()">Done</button></div>' +
  '</div>';
};

CR.onChange(function () { CR.set.sync(); CR.set.renderPL(); });
