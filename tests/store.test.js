import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore, memoryStorage, validateContact, submissionPayload, summarizeCounts, cleanPaths} from '../docs/store.js';

const backend = {url: 'https://example.supabase.co/', anonKey: 'public-anon-key'};
const choices = [{question: 'exist', option: 'yes'}, {question: 'ruler', option: 'no'}, {question: 'settled', option: 'stable'}];

test('a participant keeps one id and their choices on this device', () => {
  const storage = memoryStorage();
  const first = createStore({storage});
  const id = first.me().id;
  first.save({answers: choices});
  const again = createStore({storage});
  assert.equal(again.me().id, id);
  assert.deepEqual(again.me().answers, choices);
});

test('broken or unavailable storage never stops the journey', () => {
  const broken = {getItem: () => '{not json', setItem: () => { throw new Error('full'); }};
  const store = createStore({storage: broken});
  assert.ok(store.me().id);
  assert.deepEqual(store.save({answers: choices}).answers, choices);
});

test('contact details are optional, bounded and checked', () => {
  assert.deepEqual(validateContact({}), []);
  assert.deepEqual(validateContact({nickname: '远方', email: 'a@b.cn'}), []);
  assert.deepEqual(validateContact({email: 'not-an-email'}), ['email']);
  assert.deepEqual(validateContact({nickname: 'x'.repeat(41)}), ['nickname']);
});

test('the payload holds only valid answers and records how the person stopped', () => {
  const me = {id: 'p1', nickname: ' 远方 ', email: '', answers: [...choices, {question: 'who', option: 'machine'}], stop: null};
  const p = submissionPayload(me, 'zh');
  assert.deepEqual(p.answers, choices);
  assert.equal(p.endpoint, 'childhood');
  assert.equal(p.nickname, '远方');
  assert.equal(p.email, null);
  assert.equal(p.stop, null);
  const proposed = submissionPayload({...me, answers: choices.slice(0, 1), stop: {type: 'proposal', label: '企业统治', reason: ''}});
  assert.deepEqual(proposed.stop, {type: 'proposal', question: 'ruler', at: 'root', label: '企业统治', reason: ''});
  assert.deepEqual(submissionPayload({...me, answers: [], stop: {type: 'uncertain'}}).stop, {type: 'uncertain', question: 'exist'});
});

test('without a counting service the choice is kept locally and reported as not counted', async () => {
  const store = createStore({storage: memoryStorage(), fetch: () => { throw new Error('must not call'); }});
  store.save({answers: choices});
  assert.deepEqual(await store.submit({nickname: 'a'}), {status: 'offline'});
  assert.equal(store.me().nickname, 'a');
  assert.deepEqual(await store.counts(), {status: 'offline'});
});

test('submitting sends one insert with the public key and remembers when it was counted', async () => {
  const calls = [];
  const fetch = async (url, init) => { calls.push({url, init}); return {ok: true}; };
  const store = createStore({storage: memoryStorage(), fetch, backend});
  store.save({answers: choices});
  assert.deepEqual(await store.submit({nickname: '远方', email: 'a@b.cn', language: 'en'}), {status: 'counted'});
  assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/submissions');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.apikey, 'public-anon-key');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.participant_id, store.me().id);
  assert.equal(body.email, 'a@b.cn');
  assert.equal(body.language, 'en');
  assert.ok(store.me().submittedAt);
  assert.deepEqual(await store.submit({email: 'bad'}), {status: 'invalid', errors: ['email']});
  assert.equal(calls.length, 1, 'invalid contact details are never sent');
});

test('a failing or hanging service is reported, not waited on forever', async () => {
  const down = createStore({storage: memoryStorage(), backend, fetch: async () => ({ok: false})});
  assert.deepEqual(await down.submit({}), {status: 'error'});
  const hang = createStore({storage: memoryStorage(), backend, timeout: 20, fetch: (url, {signal}) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))});
  assert.deepEqual(await hang.counts(), {status: 'error'});
});

test('counts add up per question, including stops, and ignore malformed rows', () => {
  const c = summarizeCounts([
    {question: 'exist', option: 'yes', people: 7}, {question: 'exist', option: 'no', people: 3},
    {question: 'ruler', option: '+uncertain', people: 2}, {question: 1, option: 'x', people: 9}, null
  ], [{people: 10}]);
  assert.equal(c.people, 10);
  assert.equal(c.options['exist:yes'], 7);
  assert.equal(c.questions.exist, 10);
  assert.equal(c.options['ruler:+uncertain'], 2);
  assert.equal(Object.keys(c.options).length, 3);
});

test('only well-formed approved paths attached to real nodes are shown', () => {
  const rows = [
    {id: 1, at: 'machine', label: ' 企业统治 ', label_en: 'Corporate rule', note: '', contributors: ['远方', '', 7]},
    {id: 2, at: 'nowhere', label: 'x', contributors: []},
    {id: '3', at: 'root', label: 'y'},
    {id: 4, at: 'root', label: '  '},
    {id: 5, at: 'changing', label: '<b>literal</b>', contributors: 'not a list'}
  ];
  const out = cleanPaths(rows);
  assert.deepEqual(out.map(p => p.id), [1, 5]);
  assert.equal(out[0].label, '企业统治');
  assert.deepEqual(out[0].contributors, ['远方']);
  assert.equal(out[1].label, '<b>literal</b>');
  assert.deepEqual(out[1].contributors, []);
  assert.deepEqual(cleanPaths(null), []);
});

test('approved paths are read through the service and never fail the page', async () => {
  const offline = createStore({storage: memoryStorage()});
  assert.deepEqual(await offline.paths(), []);
  const calls = [];
  const ok = createStore({storage: memoryStorage(), backend, fetch: async url => { calls.push(url); return {ok: true, json: async () => [{id: 1, at: 'pet', label: '数字宠物', contributors: ['a']}]}; }});
  assert.equal((await ok.paths())[0].label, '数字宠物');
  assert.match(calls[0], /\/rest\/v1\/community_paths\?select=id,at,label,label_en,note,contributors/);
  const down = createStore({storage: memoryStorage(), backend, fetch: async () => { throw new Error('blocked'); }});
  assert.deepEqual(await down.paths(), []);
});
