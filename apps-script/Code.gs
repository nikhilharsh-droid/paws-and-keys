// Paws & Keys save script.
// It keeps each player's progress in this Google Sheet, so the game can load it on any computer.
// Deploy as a web app: Execute as "Me", Who has access "Anyone".

const MAX_LEN = 45000;        // one Sheet cell holds up to 50,000 characters
const MAX_PLAYERS = 12;
const KEEP_BACKUPS = 500;     // newest backup rows to keep
const BACKUP_EVERY_MIN = 15;  // at most one backup per player this often

function doGet() {
  return json_({ ok: true, players: readPlayers_() });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad request' }); }
  if (!body || body.app !== 'pawsandkeys') return json_({ ok: false, error: 'bad request' });
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (body.action === 'save') return json_(save_(body.player));
    if (body.action === 'delete') return json_(remove_(body.id));
    return json_({ ok: false, error: 'unknown action' });
  } finally {
    lock.releaseLock();
  }
}

function sheet_(name, header) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
  return sh;
}
function players_() { return sheet_('Players', ['id', 'name', 'updated', 'saved at', 'data']); }
function backups_() { return sheet_('Backups', ['saved at', 'id', 'name', 'what', 'data']); }

function readPlayers_() {
  const sh = players_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, 5).getValues()
    .map(r => { try { return JSON.parse(r[4]); } catch (e) { return null; } })
    .filter(Boolean);
}

function validId_(id) { return typeof id === 'string' && /^p[a-z0-9]{4,40}$/.test(id); }

function save_(p) {
  if (!p || typeof p !== 'object' || !validId_(p.id) || typeof p.name !== 'string' || !p.name || p.name.length > 40 ||
      typeof p.updated !== 'number' || typeof p.coins !== 'number' || typeof p.lessons !== 'object' || typeof p.avatar !== 'object') {
    return { ok: false, error: 'bad player' };
  }
  const data = JSON.stringify(p);
  if (data.length > MAX_LEN) return { ok: false, error: 'too big' };
  const sh = players_();
  const n = sh.getLastRow() - 1;
  const ids = n > 0 ? sh.getRange(2, 1, n, 1).getValues().map(r => r[0]) : [];
  const i = ids.indexOf(p.id);
  if (i >= 0) {
    const cur = sh.getRange(i + 2, 1, 1, 5).getValues()[0];
    if (Number(cur[2]) > p.updated) {
      let have = null; try { have = JSON.parse(cur[4]); } catch (e) {}
      return { ok: false, stale: true, player: have };
    }
    sh.getRange(i + 2, 1, 1, 5).setValues([[p.id, p.name, p.updated, new Date(), data]]);
  } else {
    if (ids.length >= MAX_PLAYERS) return { ok: false, error: 'too many players' };
    sh.appendRow([p.id, p.name, p.updated, new Date(), data]);
  }
  backup_(p.id, p.name, 'save', data, false);
  return { ok: true };
}

function remove_(id) {
  if (!validId_(id)) return { ok: false, error: 'bad id' };
  const sh = players_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return { ok: true };
  const rows = sh.getRange(2, 1, n, 5).getValues();
  const i = rows.findIndex(r => r[0] === id);
  if (i >= 0) { backup_(id, rows[i][1], 'deleted', rows[i][4], true); sh.deleteRow(i + 2); }
  return { ok: true };
}

function backup_(id, name, what, data, always) {
  const props = PropertiesService.getScriptProperties();
  const key = 'bk_' + id, last = Number(props.getProperty(key) || 0), now = Date.now();
  if (!always && now - last < BACKUP_EVERY_MIN * 60000) return;
  props.setProperty(key, String(now));
  const sh = backups_();
  sh.appendRow([new Date(), id, name, what, data]);
  const extra = sh.getLastRow() - 1 - KEEP_BACKUPS;
  if (extra > 0) sh.deleteRows(2, extra);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
