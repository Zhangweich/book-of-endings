import test from 'node:test';
import assert from 'node:assert/strict';
import relay from '../relay/worker.js';

const site = 'https://endings.weichenzhang.com';
const api = 'https://endings-api.weichenzhang.com';

function withUpstream(fn) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({url, init});
    return new Response('[{"people":3}]', {status: 200, headers: {'content-type': 'application/json', 'access-control-allow-origin': '*'}});
  };
  return fn(calls).finally(() => { globalThis.fetch = original; });
}

test('the site’s requests are forwarded with their headers and body', () => withUpstream(async calls => {
  const post = await relay.fetch(new Request(`${api}/rest/v1/submissions`, {
    method: 'POST', body: '{"a":1}',
    headers: {origin: site, apikey: 'k', authorization: 'Bearer k', 'content-type': 'application/json', prefer: 'return=minimal', cookie: 'secret=1'}
  }));
  assert.equal(post.status, 200);
  assert.equal(calls[0].url, 'https://bozfultqxellehhtefga.supabase.co/rest/v1/submissions');
  assert.equal(calls[0].init.body, '{"a":1}');
  assert.equal(calls[0].init.headers.get('apikey'), 'k');
  assert.equal(calls[0].init.headers.get('prefer'), 'return=minimal');
  assert.equal(calls[0].init.headers.get('cookie'), null, 'unrelated headers are dropped');
  assert.equal(post.headers.get('access-control-allow-origin'), site);

  const counts = await relay.fetch(new Request(`${api}/rest/v1/choice_counts?select=question,option,people`, {headers: {origin: site}}));
  assert.equal(calls[1].url, 'https://bozfultqxellehhtefga.supabase.co/rest/v1/choice_counts?select=question,option,people');
  assert.deepEqual(await counts.json(), [{people: 3}]);
  await relay.fetch(new Request(`${api}/rest/v1/participant_total?select=people`));
  await relay.fetch(new Request(`${api}/rest/v1/community_paths?select=id,label`));
  assert.equal(calls[3].url, 'https://bozfultqxellehhtefga.supabase.co/rest/v1/community_paths?select=id,label');
  assert.equal(calls.length, 4);
}));

test('anything else is refused without reaching the database', () => withUpstream(async calls => {
  for (const [method, path] of [['GET', '/rest/v1/submissions'], ['DELETE', '/rest/v1/submissions'], ['POST', '/rest/v1/rpc/anything'], ['POST', '/rest/v1/community_paths'], ['GET', '/rest/v1/proposals_for_review'], ['GET', '/auth/v1/user'], ['GET', '/']]) {
    const res = await relay.fetch(new Request(`${api}${path}`, {method}));
    assert.equal(res.status, 404, `${method} ${path}`);
  }
  const big = await relay.fetch(new Request(`${api}/rest/v1/submissions`, {method: 'POST', body: 'x'.repeat(20001)}));
  assert.equal(big.status, 413);
  assert.equal(calls.length, 0);
}));

test('browsers get a preflight answer, and unknown origins are not echoed', async () => {
  const pre = await relay.fetch(new Request(`${api}/rest/v1/submissions`, {method: 'OPTIONS', headers: {origin: site}}));
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get('access-control-allow-headers'), /apikey/);
  const other = await relay.fetch(new Request(`${api}/rest/v1/submissions`, {method: 'OPTIONS', headers: {origin: 'https://evil.example'}}));
  assert.equal(other.headers.get('access-control-allow-origin'), site);
});
