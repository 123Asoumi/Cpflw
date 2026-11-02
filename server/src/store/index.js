/**
 * CampusFlow data store — NO DATABASE.
 *
 * All data lives in memory and is persisted to a local JSON file
 * (server/data/store.json) so it survives restarts. Every read/write goes
 * through this module, so swapping it for Prisma/SQLite later only means
 * re-implementing the functions below.
 *
 * Collections mirror the future database entities:
 * users, students, professors, classes, courses, enrollments, evaluations,
 * grades, timetable, activities, registrations, notifications,
 * announcements, activityLog, settings.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildSeed } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.CAMPUSFLOW_DATA_DIR || path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const PERSIST = process.env.CAMPUSFLOW_PERSIST !== 'false';

export const COLLECTIONS = [
  'users', 'students', 'professors', 'classes', 'courses', 'enrollments',
  'evaluations', 'grades', 'timetable', 'activities', 'registrations',
  'notifications', 'announcements', 'activityLog',
];

let state = null;
let saveTimer = null;

function load() {
  if (PERSIST && fs.existsSync(DATA_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      for (const c of COLLECTIONS) state[c] ||= [];
      return;
    } catch (err) {
      console.warn('[store] fichier illisible, régénération des données de démo :', err.message);
    }
  }
  state = buildSeed();
  persistNow();
}

function persistNow() {
  if (!PERSIST) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function schedulePersist() {
  if (!PERSIST) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 50);
}

export function reset() {
  state = buildSeed();
  persistNow();
}

function db() {
  if (!state) load();
  return state;
}

export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

/* ---------- Generic repository helpers ---------- */
export function all(collection) {
  return db()[collection];
}

export function find(collection, predicate) {
  return db()[collection].find(predicate) || null;
}

export function byId(collection, id) {
  return db()[collection].find((r) => r.id === id) || null;
}

export function where(collection, predicate) {
  return db()[collection].filter(predicate);
}

export function insert(collection, data) {
  const record = { id: uid(), createdAt: now(), updatedAt: now(), ...data };
  db()[collection].push(record);
  schedulePersist();
  return record;
}

export function update(collection, id, patch) {
  const rec = byId(collection, id);
  if (!rec) return null;
  Object.assign(rec, patch, { updatedAt: now() });
  schedulePersist();
  return rec;
}

export function remove(collection, id) {
  const list = db()[collection];
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  schedulePersist();
  return true;
}

export function removeWhere(collection, predicate) {
  const list = db()[collection];
  const keep = list.filter((r) => !predicate(r));
  const removed = list.length - keep.length;
  db()[collection] = keep;
  if (removed) schedulePersist();
  return removed;
}

export function getSettings() {
  return db().settings;
}

export function updateSettings(patch) {
  Object.assign(db().settings, patch);
  schedulePersist();
  return db().settings;
}

export function flush() {
  clearTimeout(saveTimer);
  persistNow();
}
