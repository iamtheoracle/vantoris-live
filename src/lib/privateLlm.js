/**
 * Private operating model. The browser calls our proxy.
 * The proxy calls only PRIVATE_LLM_URL on your server.
 */
export async function askPrivateModel(prompt) {
  const res = await fetch('/.netlify/functions/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.text) throw new Error(data.error || 'Private model unavailable');
  return { ok: !data.error, text: data.text || data.error || '' };
}

export function privateLlmConfigured() {
  return true;
}
