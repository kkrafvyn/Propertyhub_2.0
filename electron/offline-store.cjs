const path = require("path");
const fs = require("fs");

let db = null;
let jsonStorePath = null;
let useJsonFallback = false;

function ensureJsonStore() {
  if (!jsonStorePath) return { outbox: [], drafts: [], conflicts: [] };
  if (!fs.existsSync(jsonStorePath)) {
    const empty = { outbox: [], drafts: [], conflicts: [] };
    fs.writeFileSync(jsonStorePath, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(jsonStorePath, "utf8"));
}

function writeJsonStore(store) {
  if (!jsonStorePath) return;
  fs.writeFileSync(jsonStorePath, JSON.stringify(store, null, 2));
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      entityType TEXT NOT NULL,
      organizationId TEXT NOT NULL,
      payload TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      lastError TEXT,
      baseUpdatedAt TEXT,
      status TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conflicts (
      id TEXT PRIMARY KEY,
      outboxId TEXT NOT NULL,
      entityType TEXT NOT NULL,
      organizationId TEXT NOT NULL,
      localPayload TEXT NOT NULL,
      serverSnapshot TEXT NOT NULL,
      detectedAt TEXT NOT NULL,
      resolvedAt TEXT
    );
  `);
}

function init(userDataPath) {
  const sqlitePath = path.join(userDataPath, "offline.sqlite");
  jsonStorePath = path.join(userDataPath, "offline-store.json");

  try {
    const Database = require("better-sqlite3");
    db = new Database(sqlitePath);
    initSchema();
    useJsonFallback = false;
    return { backend: "sqlite", path: sqlitePath };
  } catch {
    useJsonFallback = true;
    ensureJsonStore();
    return { backend: "json", path: jsonStorePath };
  }
}

function filterByOrg(rows, organizationId) {
  if (!organizationId) return rows;
  return rows.filter((row) => row.organizationId === organizationId);
}

function listOutbox(organizationId) {
  if (useJsonFallback) {
    const store = ensureJsonStore();
    return filterByOrg(store.outbox || [], organizationId);
  }

  const rows = db.prepare("SELECT * FROM outbox ORDER BY createdAt ASC").all();
  const parsed = rows.map((row) => ({
    ...row,
    payload: JSON.parse(row.payload),
    attempts: Number(row.attempts || 0),
  }));
  return filterByOrg(parsed, organizationId);
}

function upsertOutbox(entry) {
  if (useJsonFallback) {
    const store = ensureJsonStore();
    const outbox = store.outbox || [];
    const index = outbox.findIndex((row) => row.id === entry.id);
    if (index >= 0) outbox[index] = entry;
    else outbox.push(entry);
    store.outbox = outbox;
    writeJsonStore(store);
    return entry;
  }

  db.prepare(`
    INSERT INTO outbox (id, entityType, organizationId, payload, createdAt, updatedAt, attempts, lastError, baseUpdatedAt, status)
    VALUES (@id, @entityType, @organizationId, @payload, @createdAt, @updatedAt, @attempts, @lastError, @baseUpdatedAt, @status)
    ON CONFLICT(id) DO UPDATE SET
      entityType=excluded.entityType,
      organizationId=excluded.organizationId,
      payload=excluded.payload,
      updatedAt=excluded.updatedAt,
      attempts=excluded.attempts,
      lastError=excluded.lastError,
      baseUpdatedAt=excluded.baseUpdatedAt,
      status=excluded.status
  `).run({
    ...entry,
    payload: JSON.stringify(entry.payload),
    attempts: entry.attempts ?? 0,
    lastError: entry.lastError ?? null,
    baseUpdatedAt: entry.baseUpdatedAt ?? null,
    status: entry.status ?? "pending",
  });
  return entry;
}

function removeOutbox(id) {
  if (useJsonFallback) {
    const store = ensureJsonStore();
    store.outbox = (store.outbox || []).filter((row) => row.id !== id);
    writeJsonStore(store);
    return;
  }
  db.prepare("DELETE FROM outbox WHERE id = ?").run(id);
}

function saveDraft(draft) {
  if (useJsonFallback) {
    const store = ensureJsonStore();
    const drafts = store.drafts || [];
    const index = drafts.findIndex((row) => row.id === draft.id);
    if (index >= 0) drafts[index] = draft;
    else drafts.push(draft);
    store.drafts = drafts;
    writeJsonStore(store);
    return draft;
  }

  db.prepare(`
    INSERT INTO drafts (id, payload) VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET payload=excluded.payload
  `).run(draft.id, JSON.stringify(draft));
  return draft;
}

function getDraft(id) {
  if (useJsonFallback) {
    const store = ensureJsonStore();
    return (store.drafts || []).find((row) => row.id === id) || null;
  }

  const row = db.prepare("SELECT payload FROM drafts WHERE id = ?").get(id);
  return row ? JSON.parse(row.payload) : null;
}

function listDrafts() {
  if (useJsonFallback) {
    const store = ensureJsonStore();
    return store.drafts || [];
  }

  const rows = db.prepare("SELECT payload FROM drafts").all();
  return rows.map((row) => JSON.parse(row.payload));
}

function listConflicts(organizationId) {
  if (useJsonFallback) {
    const store = ensureJsonStore();
    return filterByOrg(store.conflicts || [], organizationId).filter((row) => !row.resolvedAt);
  }

  const rows = db
    .prepare("SELECT * FROM conflicts WHERE resolvedAt IS NULL ORDER BY detectedAt DESC")
    .all();
  const parsed = rows.map((row) => ({
    ...row,
    localPayload: JSON.parse(row.localPayload),
    serverSnapshot: JSON.parse(row.serverSnapshot),
  }));
  return filterByOrg(parsed, organizationId);
}

function recordConflict(conflict) {
  if (useJsonFallback) {
    const store = ensureJsonStore();
    const conflicts = store.conflicts || [];
    conflicts.push(conflict);
    store.conflicts = conflicts;
    writeJsonStore(store);
    return conflict;
  }

  db.prepare(`
    INSERT INTO conflicts (id, outboxId, entityType, organizationId, localPayload, serverSnapshot, detectedAt, resolvedAt)
    VALUES (@id, @outboxId, @entityType, @organizationId, @localPayload, @serverSnapshot, @detectedAt, @resolvedAt)
  `).run({
    ...conflict,
    localPayload: JSON.stringify(conflict.localPayload),
    serverSnapshot: JSON.stringify(conflict.serverSnapshot),
    resolvedAt: conflict.resolvedAt ?? null,
  });
  return conflict;
}

function resolveConflict(id) {
  if (useJsonFallback) {
    const store = ensureJsonStore();
    store.conflicts = (store.conflicts || []).map((row) =>
      row.id === id ? { ...row, resolvedAt: new Date().toISOString() } : row,
    );
    writeJsonStore(store);
    return;
  }

  db.prepare("UPDATE conflicts SET resolvedAt = ? WHERE id = ?").run(
    new Date().toISOString(),
    id,
  );
}

module.exports = {
  init,
  listOutbox,
  upsertOutbox,
  removeOutbox,
  saveDraft,
  getDraft,
  listDrafts,
  listConflicts,
  recordConflict,
  resolveConflict,
};
