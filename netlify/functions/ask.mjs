/**
 * Private ask proxy. Prompts go only to PRIVATE_LLM_URL on your server.
 * Never calls Base44 or a public model.
 */
export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }
  const url = process.env.PRIVATE_LLM_URL;
  if (!url) {
    return new Response(JSON.stringify({
      error: 'not_configured',
      text: 'Private model is not configured. Set PRIVATE_LLM_URL on the host.',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }
  const prompt = String(body.prompt || '').slice(0, 4000);
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'empty prompt' }), { status: 400 });
  }
  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.PRIVATE_LLM_KEY ? { authorization: `Bearer ${process.env.PRIVATE_LLM_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: process.env.PRIVATE_LLM_MODEL || 'llama3.1',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });
  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: `private model ${upstream.status}` }), { status: 502 });
  }
  const data = await upstream.json();
  const text = data?.choices?.[0]?.message?.content || data?.response || data?.message?.content || data?.text || '';
  return new Response(JSON.stringify({ text: String(text || '').trim() }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
