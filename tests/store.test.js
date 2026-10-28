import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore, memoryStorage, validateContact, submissionPayload, summarizeCounts} from '../docs/store.js';

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
