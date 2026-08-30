const json = (data, status=200, origin="*") => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type":"application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":"Authorization, Content-Type",
    "Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS",
    "Vary":"Origin"
  }
});

async function sb(env, path, init={}, service=false) {
  const key = service ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_ANON_KEY;
  const headers = {
    apikey:key,
    Authorization:`Bearer ${key}`,
    "Content-Type":"application/json",
    ...(init.headers||{})
  };
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {...init, headers});
}

async function getUser(req, env) {
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token) return null;
  const r=await fetch(`${env.SUPABASE_URL}/auth/v1/user`,{
    headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`}
  });
  return r.ok ? r.json() : null;
}

async function getPlan(env,userId){
  const r=await sb(env,`profiles?id=eq.${userId}&select=plan`,{},true);
  const rows=await r.json();
  return rows?.[0]?.plan || "free";
}

async function checkUsage(env,userId,limit){
  const today=new Date().toISOString().slice(0,10);
  const r=await sb(env,`usage_daily?user_id=eq.${userId}&day=eq.${today}&select=messages`,{},true);
  const rows=await r.json();
  const used=rows?.[0]?.messages||0;
  if(used>=limit) return false;
  await sb(env,"usage_daily?on_conflict=user_id,day",{
    method:"POST",
    headers:{Prefer:"resolution=merge-duplicates"},
    body:JSON.stringify({user_id:userId,day:today,messages:used+1})
  },true);
  return true;
}

function pathParts(url){return new URL(url).pathname.split("/").filter(Boolean)}

export default {
  async fetch(req, env) {
    const origin=env.ALLOWED_ORIGIN || "*";
    if(req.method==="OPTIONS") return json({},204,origin);
    try{
      const user=await getUser(req,env);
      if(!user) return json({error:"No autorizado"},401,origin);
      const p=pathParts(req.url);

      if(p[0]==="tasks"){
        if(req.method==="GET"){
          const r=await sb(env,`tasks?user_id=eq.${user.id}&select=*&order=created_at.desc`,{},true);
          return json({tasks:await r.json()},200,origin);
        }
        if(req.method==="POST"){
          const body=await req.json();
          if(!body.title?.trim()) return json({error:"Título requerido"},400,origin);
          await sb(env,"tasks",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({user_id:user.id,title:body.title.trim().slice(0,300)})},true);
          return json({ok:true},201,origin);
        }
        if(p[1] && req.method==="PATCH"){
          const body=await req.json();
          await sb(env,`tasks?id=eq.${p[1]}&user_id=eq.${user.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({completed:!!body.completed})},true);
          return json({ok:true},200,origin);
        }
        if(p[1] && req.method==="DELETE"){
          await sb(env,`tasks?id=eq.${p[1]}&user_id=eq.${user.id}`,{method:"DELETE"},true);
          return json({ok:true},200,origin);
        }
      }

      if(p[0]==="memories"){
        if(req.method==="GET"){
          const r=await sb(env,`memories?user_id=eq.${user.id}&select=*&order=created_at.desc&limit=50`,{},true);
          return json({memories:await r.json()},200,origin);
        }
        if(req.method==="POST"){
          const body=await req.json();
          if(!body.content?.trim()) return json({error:"Contenido requerido"},400,origin);
          await sb(env,"memories",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({user_id:user.id,content:body.content.trim().slice(0,1000)})},true);
          return json({ok:true},201,origin);
        }
        if(p[1] && req.method==="DELETE"){
          await sb(env,`memories?id=eq.${p[1]}&user_id=eq.${user.id}`,{method:"DELETE"},true);
          return json({ok:true},200,origin);
        }
      }

      if(p[0]==="chat" && req.method==="POST"){
        const body=await req.json();
        const message=(body.message||"").trim();
        if(!message) return json({error:"Mensaje vacío"},400,origin);
        const plan=await getPlan(env,user.id);
        if(plan==="free"){
          const allowed=await checkUsage(env,user.id,Number(env.FREE_DAILY_MESSAGES||25));
          if(!allowed) return json({error:"Alcanzaste el límite gratuito de hoy."},429,origin);
        }

        const mr=await sb(env,`memories?user_id=eq.${user.id}&select=content&order=created_at.desc&limit=20`,{},true);
        const memories=await mr.json();
        const tr=await sb(env,`tasks?user_id=eq.${user.id}&completed=eq.false&select=title,due_at&order=created_at.desc&limit=15`,{},true);
        const tasks=await tr.json();

        const context = [
          "Eres NEXO, un asistente personal útil, claro y proactivo.",
          "Responde en el idioma del usuario.",
          "No afirmes haber realizado acciones que no ejecutaste.",
          "Usa los siguientes datos solo cuando sean relevantes.",
          `Memorias del usuario: ${memories.map(x=>x.content).join(" | ") || "ninguna"}`,
          `Tareas pendientes: ${tasks.map(x=>x.title).join(" | ") || "ninguna"}`,
          "Si el usuario expresa una preferencia o dato que convendría recordar, puedes sugerirle guardarlo en la sección Memoria."
        ].join("\n");

        const input=[
          ...(Array.isArray(body.history)?body.history.slice(-8):[]).map(x=>({
            role:x.role==="assistant"?"assistant":"user",
            content:String(x.content).slice(0,5000)
          })),
          {role:"user",content:message.slice(0,10000)}
        ];

        const or=await fetch("https://api.openai.com/v1/responses",{
          method:"POST",
          headers:{"Authorization":`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
          body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-5.6-luna",instructions:context,input,max_output_tokens:1200})
        });
        const data=await or.json();
        if(!or.ok) return json({error:data?.error?.message||"Error de IA"},502,origin);
        const reply=data.output_text || (data.output||[]).flatMap(o=>o.content||[]).find(c=>c.type==="output_text")?.text || "No pude generar una respuesta.";
        return json({reply},200,origin);
      }

      return json({error:"Ruta no encontrada"},404,origin);
    }catch(e){
      return json({error:e.message||"Error interno"},500,origin);
    }
  }
};
