const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

async function supabaseFetch(env, path, token, options = {}) {
  const headers = {
    "apikey": env.SUPABASE_PUBLISHABLE_KEY,
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers
  });
}

async function chat(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: "Falta OPENAI_API_KEY en Cloudflare." }, 500);
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return json({ error: "Faltan variables de Supabase en Cloudflare." }, 500);
  }

  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Debes iniciar sesión." }, 401);
  const token = auth.slice(7);

  const body = await request.json();
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  const memory = typeof body.memory === "string" ? body.memory.slice(0, 6000) : "";

  const system = [
    "Eres NEXO, un asistente personal en español.",
    "Sé práctico, claro, amable y directo.",
    "Ayuda a organizar tareas, objetivos, estudio, trabajo, finanzas personales y planificación.",
    "No inventes datos personales del usuario.",
    memory ? `Memoria proporcionada por el usuario:\n${memory}` : ""
  ].filter(Boolean).join("\n\n");

  const model = env.OPENAI_MODEL;
  if (!model) return json({ error: "Falta OPENAI_MODEL en Cloudflare." }, 500);

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        ...messages.map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: String(m.content).slice(0, 8000) }]
        }))
      ],
      max_output_tokens: 900
    })
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    return json({ error: data?.error?.message || "OpenAI rechazó la solicitud." }, upstream.status);
  }

  return json({ text: data.output_text || "No pude generar una respuesta." });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);

    if (url.pathname === "/api/health") return json({ ok: true, app: "NEXO AI" });

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try { return await chat(request, env); }
      catch (e) { return json({ error: e?.message || "Error interno." }, 500); }
    }

    return env.ASSETS.fetch(request);
  }
};
