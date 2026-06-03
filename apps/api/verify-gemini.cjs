// Quick check that GEMINI_API_KEY works against the same AI Studio endpoint the
// GeminiAdapter uses. Run:  node verify-gemini.cjs   (after setting the key in .env)
const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!key) {
  console.log('✗ GEMINI_API_KEY is not set. Add it to apps/api/.env and re-run.');
  process.exit(2);
}

(async () => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Reply with exactly this and nothing else: EduFlow ↔ Gemini link OK' }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 30, thinkingConfig: { thinkingBudget: 0 } },
  };
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
  } catch (e) {
    console.log('✗ network error:', e.message);
    process.exit(1);
  }
  if (!res.ok) {
    const txt = await res.text();
    console.log(`✗ HTTP ${res.status}:`, txt.slice(0, 400));
    if (res.status === 400 || res.status === 403) console.log('  → key likely invalid/disabled, or the Generative Language API is not enabled for it.');
    if (res.status === 404) console.log(`  → model "${model}" not found for this key; try GEMINI_MODEL=gemini-2.5-flash or gemini-1.5-flash.`);
    process.exit(1);
  }
  const j = await res.json();
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const usage = j.usageMetadata || {};
  console.log('✓ Gemini is LIVE');
  console.log(`  model    : ${model}`);
  console.log(`  latency  : ${Date.now() - t0} ms`);
  console.log(`  tokens   : prompt=${usage.promptTokenCount ?? '?'} output=${usage.candidatesTokenCount ?? '?'}`);
  console.log(`  reply    : ${JSON.stringify(text.trim())}`);
})().catch((e) => { console.log('✗ error:', e.message); process.exit(1); });
