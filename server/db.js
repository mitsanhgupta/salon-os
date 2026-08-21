/**
 * db.js — Minimal JSON-file data store for Salon OS.
 * Simple, dependency-free persistence. A real deployment would swap this
 * for Postgres/SQLite; the API layer is identical.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DB = {
  salon: null,
  users: [],
  customers: [],
  staff: [],
  services: [],
  appointments: [],
  conversations: [],
  payments: [],
  campaigns: [],
  actions: [],
  insights: [],
  meta: { seededAt: null, version: 1 }
};

let store = null;

function load() {
  if (store) return store;
  if (fs.existsSync(DB_FILE)) {
    try {
      store = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      store = JSON.parse(JSON.stringify(DEFAULT_DB));
    }
  } else {
    store = JSON.parse(JSON.stringify(DEFAULT_DB));
  }
  return store;
}

function save() {
  if (!store) return;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function reset() {
  store = JSON.parse(JSON.stringify(DEFAULT_DB));
  save();
  return store;
}

function db() {
  return store || load();
}

function nextId(table) {
  const arr = store[table] || [];
  return arr.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
}

function daysFromNow(n, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  if (hour !== undefined) { d.setHours(hour, minute || 0, 0, 0); }
  return d.toISOString();
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

module.exports = { db, load, save, reset, nextId, daysFromNow, fmtDate, fmtTime, DB_FILE };
