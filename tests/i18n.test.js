import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {languages, resolveLocale, formatMessage, sourceIndex} from '../docs/locale-core.js';
import {journeyRecord, journeyMarkdown} from '../docs/framework.js';
const read = code => JSON.parse(readFileSync(new URL(`../docs/locales/${code}.json`, import.meta.url), 'utf8'));
const source = read('zh');
const CJK = /[　-〿㐀-鿿＀-￯]/;

test('Chinese and English cover the same messages with matching placeholders', () => {
  assert.deepEqual(languages.map(l => l.code), ['zh', 'en']);
  const keys = Object.keys(source).sort();
  for (const {code} of languages) {
    const target = read(code);
    assert.deepEqual(Object.keys(target).sort(), keys, code);
    for (const key of keys) {
      assert.ok(typeof target[key] === 'string' && target[key].trim(), `${code}:${key}`);
      assert.deepEqual((target[key].match(/\{\d+\}/g) || []).sort(), (source[key].match(/\{\d+\}/g) || []).sort(), `${code}:${key}`);
    }
  }
});

test('every Chinese string in the page and scripts has a catalog entry', () => {
  const known = new Set(Object.values(source).map(s => s.trim()));
  const found = new Set();
  const dir = new URL('../docs/', import.meta.url);
  const html = readFileSync(new URL('index.html', dir), 'utf8').replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
  for (const m of html.matchAll(/\b(?:content|placeholder|aria-label|title|alt)="([^"]*)"/g)) found.add(m[1].trim());
  for (const part of html.replace(/<[^>]+>/g, '\u0000').split('\u0000')) found.add(part.trim());
  for (const f of readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'locale-core.js')) {
    for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) found.add(m[1].trim());
  }
  const missing = [...found].filter(s => s && CJK.test(s) && !known.has(s));
  assert.deepEqual(missing, []);
});

test('language selection only permits supported locales', () => {
  assert.equal(resolveLocale('en-US', 'zh'), 'en');
  assert.equal(resolveLocale('../../file', 'en'), 'en');
  assert.equal(resolveLocale(null, 'fr'), 'zh');
});

test('placeholder values are literal and never recursively interpolated', () => {
  assert.equal(formatMessage('Hi {0}; {1}', ['{1}', '<script>']), 'Hi {1}; <script>');
});

test('an English export translates structure but keeps the author proposal as written', () => {
  const en = read('en'), index = sourceIndex(source);
  const translate = (s, ...args) => formatMessage(en[index.get(s)] || s, args);
  const record = journeyRecord({answers: [{question: 'exist', option: 'yes'}], stop: {type: 'proposal', label: '我的新分支', reason: '原文理由'}});
  const out = journeyMarkdown(record, translate);
  assert.ok(out.includes('# My tree of endings'));
  assert.ok(out.includes('In 1–5 centuries, will humanity still exist? — Still exists'));
  assert.ok(out.includes('我的新分支'));
  assert.ok(out.includes('原文理由'));
  assert.ok(!out.includes('## 我的选择'));
});
