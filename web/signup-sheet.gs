/**
 * Claude Meter signups → Google Sheet (Mac download emails + Windows waitlist).
 *
 * One-time setup (2 minutes):
 *   1. Create a Google Sheet (sheets.new), name it "Claude Meter signups".
 *   2. Extensions → Apps Script. Replace everything with this file. Save.
 *   3. Deploy → New deployment → type "Web app".
 *      Execute as: Me.  Who has access: Anyone.  Deploy → authorize.
 *   4. Copy the Web app URL (https://script.google.com/macros/s/…/exec) and put it in
 *      web/index.html:  <meta name="cm-signup" content="THAT_URL">  then: node web/build.mjs
 *
 * The site POSTs form-encoded fields: type (mac | windows), email, name, platform, ref,
 * and a hidden honeypot "company" that humans never fill.
 */
const SHEET_NAME = 'Signups';
const HEADER = ['Time', 'Type', 'Name', 'Email', 'Platform', 'Referrer'];

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.company) return json({ ok: true }); // bot filled the honeypot: pretend success, store nothing
  const email = String(p.email || '').trim().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'email' });
  const type = p.type === 'windows' ? 'windows' : 'mac';

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADER);
    sheet.appendRow([
      new Date(), type, cell(p.name, 100), cell(email, 200), cell(p.platform, 120), cell(p.ref, 300),
    ]);
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

// Visitor-supplied text must never be evaluated as a formula (=HYPERLINK(...), +cmd, etc.).
function cell(value, max) {
  const s = String(value || '').slice(0, max);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function json(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
