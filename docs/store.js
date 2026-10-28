import {assess, frameworkVersion} from './framework.js?v=0.5.8';

// Keeps a person's choices on their device and sends their latest set to the counting service.
// The service counts only each participant's most recent submission; emails are never read back.
const KEY = 'book-of-endings:me';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function memoryStorage() {
  const m = new Map();
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }};
}
function deviceStorage() {
  try { globalThis.localStorage.getItem(KEY); return globalThis.localStorage; } catch { return memoryStorage(); }
}
const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

export function validateContact({nickname = '', email = ''}) {
  const errors = [];
  if (nickname.trim().length > 40) errors.push('nickname');
  const mail = email.trim();
  if (mail && (mail.length > 254 || !EMAIL.test(mail))) errors.push('email');
  return errors;
}

export function submissionPayload(me, language = 'zh') {
  const r = assess(me.answers, me.stop);
  const stop = r.status === 'proposal' ? {type: 'proposal', question: r.current.id, at: r.proposal.at, label: r.proposal.label, reason: r.proposal.reason}
    : r.status === 'uncertain' ? {type: 'uncertain', question: r.current.id} : null;
  return {
    participant_id: me.id,
    nickname: me.nickname.trim() || null,
    email: me.email.trim() || null,
    answers: r.steps.map(s => ({question: s.question.id, option: s.option.id})),
    stop,
    endpoint: r.endpoint?.id || null,
    framework: frameworkVersion,
    language
  };
}

// Rows from the public count view: {question, option, people}; option "+uncertain" / "+proposal" marks a stop.
export function summarizeCounts(rows, totalRows) {
  const options = {}, questions = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const n = Number(row?.people) || 0;
    if (typeof row?.question !== 'string' || typeof row?.option !== 'string') continue;
    options[`${row.question}:${row.option}`] = n;
    questions[row.question] = (questions[row.question] || 0) + n;
  }
  return {status: 'ok', people: Number(totalRows?.[0]?.people) || 0, options, questions};
}

export function createStore({storage = deviceStorage(), fetch = globalThis.fetch?.bind(globalThis), backend = null, timeout = 6000} = {}) {
  function load() {
    let saved = null;
    try { saved = JSON.parse(storage.getItem(KEY)); } catch {}
    const ok = saved && typeof saved === 'object' && typeof saved.id === 'string' && saved.id.length <= 64;
    return {
      id: ok ? saved.id : newId(),
      nickname: ok ? text(saved.nickname, 40) : '',
      email: ok ? text(saved.email, 254) : '',
      answers: ok && Array.isArray(saved.answers) ? saved.answers.slice(0, 20) : [],
      stop: ok && saved.stop && typeof saved.stop === 'object' ? saved.stop : null,
      submittedAt: ok ? text(saved.submittedAt, 40) : ''
    };
  }
  let me = load();
  function save(patch = {}) {
    me = {...me, ...patch};
    try { storage.setItem(KEY, JSON.stringify(me)); } catch {}
    return me;
  }
  async function request(path, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(`${backend.url.replace(/\/$/, '')}/rest/v1/${path}`, {
        ...init, signal: controller.signal,
        headers: {apikey: backend.anonKey, Authorization: `Bearer ${backend.anonKey}`, 'Content-Type': 'application/json', ...init.headers}
      });
    } finally { clearTimeout(timer); }
  }
  async function submit({nickname = '', email = '', language = 'zh'} = {}) {
    const errors = validateContact({nickname, email});
    if (errors.length) return {status: 'invalid', errors};
    save({nickname: nickname.trim(), email: email.trim()});
    if (!backend || !fetch) return {status: 'offline'};
    try {
      const res = await request('submissions', {method: 'POST', headers: {Prefer: 'return=minimal'}, body: JSON.stringify(submissionPayload(me, language))});
      if (!res.ok) return {status: 'error'};
      save({submittedAt: new Date().toISOString()});
      return {status: 'counted'};
    } catch { return {status: 'error'}; }
  }
  async function counts() {
    if (!backend || !fetch) return {status: 'offline'};
    try {
      const [rows, total] = await Promise.all([
        request('choice_counts?select=question,option,people'),
        request('participant_total?select=people')
      ]);
      if (!rows.ok || !total.ok) return {status: 'error'};
      return summarizeCounts(await rows.json(), await total.json());
    } catch { return {status: 'error'}; }
  }
  return {me: () => me, save, submit, counts, online: Boolean(backend)};
}
