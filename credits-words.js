/* Wording switch (Demo control › Preview options › Wording): "Credit" or "Session fee". Prototype aid only, not a
   product feature (meeting 2026-11-04: the legal name may differ from what volume photographers look for).
   One wording source: the phrase map below, applied as a text pass over the page after every change. Phrases come
   first so sentences stay grammatical; single words are the fallback. The strings in the code are not refactored.
   Never touched: the Demo control, form fields, [placeholders], and "credit card". Switching back restores the
   original text. */
CR.words = { orig: new WeakMap(), busy: false };

CR.words.FULL = 'Session fee with package inclusion';
CR.words.PHRASES = [
  [/credit card/gi, m => '\u0000' + m + '\u0000'],   /* protected, restored at the end */
  [/Unspent Credit Reminder/g, 'Unspent Session Fee Reminder'],
  [/Credit Automation/g, 'Session Fee Automation'],
  [/Add more credit/g, 'Pay more session fee'], [/new credit adds to it/g, 'new payments add to it'], [/New credit adds to it/g, 'New payments add to it'],
  [/Credit Reminder/g, 'Session Fee Reminder'],
  [/Credit Last Call/g, 'Session Fee Last Call'],
  [/Credit sales/g, 'Session fee sales'], [/credit sales/g, 'session fee sales'],
  [/Credit offer/g, 'Session fee offer'], [/credit offer/g, 'session fee offer'],
  [/Credit is money to spend/g, 'The session fee is money to spend'],
  [/Paid as (\$[\d,.]+) credit/g, 'Paid as a $1 session fee'],
  [/Buy credit/g, 'Pay session fee'], [/buy credit/g, 'pay the session fee'],
  [/Buying credit/g, 'Paying the session fee'], [/buying credit/g, 'paying the session fee'],
  [/Bought credit/g, 'Paid a session fee'], [/bought credit/g, 'paid a session fee'],
  [/Paid with credit/g, 'Paid with session fee'], [/paid with credit/g, 'paid with session fee'],
  [/Credit available/g, 'Session fee balance'],
  [/Credit left/g, 'Session fee balance left'], [/credit left/g, 'session fee balance left'],
  [/Credit now/g, 'Session fee balance now'],
  [/Credit to spend/g, 'Session fee to spend'],
  [/Credit sold/g, 'Session fees sold'], [/Credit redeemed/g, 'Session fees spent'],
  [/Your credit balance/g, 'Your session fee balance'], [/Your credit/g, 'Your session fee balance'], [/your credit/g, 'your session fee balance'],
  [/ of credit\b/g, ' in session fees'], [/ in credit\b/g, ' in session fees'], [/have credit to spend/g, 'have session fees to spend'],
  [/Credits\b/g, 'Session fees'], [/credits\b/g, 'session fees'],
  [/Credit\b/g, 'Session fee'], [/credit\b/g, 'session fee'],
  [/\u0000([^\u0000]*)\u0000/g, '$1']
];

CR.words.skip = function (el) {
  return !el || el.closest('#cr-demo, .cr-placeholder, input, textarea, select, script, style, .cr-demo-tag');
};
CR.words.swap = function (t) {
  if (/^\s*Credits\s*$/.test(t)) return t.replace('Credits', CR.words.FULL);   /* the card title takes the full term */
  return CR.words.PHRASES.reduce((s, p) => s.replace(p[0], p[1]), t);
};
CR.words.apply = function () {
  if (CR.words.busy) return;
  CR.words.busy = true;
  const on = CR.prev.words === 'session';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const orig = CR.words.orig.get(n);
    if (!on) { if (orig !== undefined) { n.nodeValue = orig; CR.words.orig.delete(n); } continue; }
    if (!/credit/i.test(n.nodeValue) || CR.words.skip(n.parentElement)) continue;
    const src = orig !== undefined && n.nodeValue === CR.words.swap(orig) ? orig : n.nodeValue;
    const out = CR.words.swap(src);
    if (out !== n.nodeValue) { CR.words.orig.set(n, src); n.nodeValue = out; }
  }
  document.title = on ? document.title.replace(/Credit/g, 'Session fee') : document.title;
  CR.words.busy = false;
};
/* Every render (ours or Robert's) runs the pass once the DOM settles. */
CR.words.queued = false;
CR.words.queue = function () {
  if (CR.words.queued || CR.words.busy) return;
  CR.words.queued = true;
  setTimeout(function () { CR.words.queued = false; CR.words.apply(); }, 0);
};
new MutationObserver(function () { if (!CR.words.busy && (CR.prev.words === 'session' || CR.words.dirty)) CR.words.queue(); })
  .observe(document.body, { childList: true, subtree: true, characterData: true });
CR.onChange(function () { CR.words.dirty = CR.prev.words === 'session'; CR.words.queue(); });
