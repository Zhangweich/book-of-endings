// Forwards the site's counting requests to Supabase, whose own domain is blocked in mainland China.
// Only the requests the site makes are allowed; everything else is refused.
const UPSTREAM = 'https://bozfultqxellehhtefga.supabase.co';
const ALLOWED = new Set(['POST /rest/v1/submissions', 'GET /rest/v1/choice_counts', 'GET /rest/v1/participant_total', 'GET /rest/v1/community_paths']);
const ORIGINS = ['https://endings.weichenzhang.com', 'http://127.0.0.1:8769', 'http://localhost:8000'];
const FORWARDED = ['apikey', 'authorization', 'content-type', 'prefer'];
const MAX_BODY = 20000;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    const cors = {
      'access-control-allow-origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': FORWARDED.join(', '),
      'access-control-max-age': '86400',
      vary: 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
    if (!ALLOWED.has(`${request.method} ${url.pathname}`)) return new Response('Not found', {status: 404, headers: cors});
    const body = request.method === 'POST' ? await request.text() : undefined;
    if (body && body.length > MAX_BODY) return new Response('Too large', {status: 413, headers: cors});
    const headers = new Headers();
    for (const name of FORWARDED) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const upstream = await fetch(UPSTREAM + url.pathname + url.search, {method: request.method, headers, body});
    const response = new Response(upstream.body, {status: upstream.status, headers: {'content-type': upstream.headers.get('content-type') || 'text/plain'}});
    for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
    return response;
  }
};
