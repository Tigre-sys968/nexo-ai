import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const API_URL = import.meta.env.VITE_API_URL || "/api";

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

function Auth({ onDone }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!supabase) return setMsg("Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.");
    setBusy(true); setMsg("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw error;
        if (!data.session) setMsg("Cuenta creada. Revisa tu correo si Supabase solicita confirmación.");
        else onDone(data.session.user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onDone(data.user);
      }
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  return <div className="auth-wrap">
    <div className="auth-card">
      <div className="brand big">NEXO<span>AI</span></div>
      <p className="muted">Tu asistente personal para pensar, organizar y avanzar.</p>
      <div className="tabs">
        <button className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Entrar</button>
        <button className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>Crear cuenta</button>
      </div>
      <form onSubmit={submit}>
        {mode==="signup" && <input placeholder="Tu nombre" value={name} onChange={e=>setName(e.target.value)} />}
        <input type="email" placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña (mín. 6 caracteres)" value={password} onChange={e=>setPassword(e.target.value)} minLength="6" required />
        <button className="primary full" disabled={busy}>{busy ? "Cargando..." : mode==="login" ? "Entrar a NEXO" : "Crear mi cuenta"}</button>
      </form>
      {msg && <div className="notice">{msg}</div>}
      <small className="muted">MVP: chat, memoria y tareas. Las funciones premium se pueden añadir después.</small>
    </div>
  </div>
}

function App({ user }) {
  const [tab, setTab] = useState("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem("nexo_messages") || "[]"));
  const [memory, setMemory] = useState(() => localStorage.getItem("nexo_memory") || "");
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem("nexo_tasks") || "[]"));
  const [busy, setBusy] = useState(false);

  useEffect(()=>localStorage.setItem("nexo_messages", JSON.stringify(messages.slice(-50))),[messages]);
  useEffect(()=>localStorage.setItem("nexo_memory", memory),[memory]);
  useEffect(()=>localStorage.setItem("nexo_tasks", JSON.stringify(tasks)),[tasks]);

  const greeting = useMemo(()=>({
    role:"assistant",
    content:`Hola${user.user_metadata?.name ? " " + user.user_metadata.name : ""}. Soy NEXO. ¿Qué quieres organizar hoy?`
  }),[user]);

  useEffect(()=>{ if(messages.length===0) setMessages([greeting]); },[messages.length,greeting]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next = [...messages, {role:"user", content:text}];
    setMessages(next); setBusy(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${API_URL}/chat`, {
        method:"POST",
        headers: { "Content-Type":"application/json", "Authorization":`Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: next.slice(-20), memory })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo conectar con NEXO.");
      setMessages(m=>[...m,{role:"assistant",content:data.text}]);
    } catch(e) {
      setMessages(m=>[...m,{role:"assistant",content:`⚠️ ${e.message}`}]);
    } finally { setBusy(false); }
  }

  function addTask() {
    const title = prompt("¿Qué tarea quieres guardar?");
    if (title?.trim()) setTasks(t=>[...t,{id:crypto.randomUUID(),title:title.trim(),done:false}]);
  }

  async function logout() { await supabase.auth.signOut(); }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand">NEXO<span>AI</span></div>
      <button className={tab==="chat"?"nav active":"nav"} onClick={()=>setTab("chat")}>💬 Asistente</button>
      <button className={tab==="tasks"?"nav active":"nav"} onClick={()=>setTab("tasks")}>✅ Tareas</button>
      <button className={tab==="memory"?"nav active":"nav"} onClick={()=>setTab("memory")}>🧠 Memoria</button>
      <div className="side-bottom">
        <div className="plan"><b>FREE</b><span>25 mensajes/día</span></div>
        <div className="user">{user.email}</div>
        <button className="logout" onClick={logout}>Salir</button>
      </div>
    </aside>

    <main className="main">
      {tab==="chat" && <section className="chat">
        <header><div><h1>¿En qué trabajamos hoy?</h1><p className="muted">NEXO recuerda lo que guardes y te ayuda a convertir ideas en acciones.</p></div><span className="status">● En línea</span></header>
        <div className="messages">
          {messages.map((m,i)=><div key={i} className={m.role==="user"?"bubble user-bubble":"bubble assistant-bubble"}>{m.content}</div>)}
          {busy && <div className="bubble assistant-bubble">Pensando…</div>}
        </div>
        <div className="composer"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Escribe lo que necesitas…"/><button className="send" onClick={send} disabled={busy}>➤</button></div>
      </section>}

      {tab==="tasks" && <section className="panel"><header><div><h1>Mis tareas</h1><p className="muted">Pequeños pasos que mantienen tus objetivos en movimiento.</p></div><button className="primary" onClick={addTask}>+ Nueva tarea</button></header>
        <div className="list">{tasks.length===0 ? <div className="empty">No tienes tareas. Crea la primera.</div> : tasks.map(t=><div className="task" key={t.id}><input type="checkbox" checked={t.done} onChange={()=>setTasks(x=>x.map(a=>a.id===t.id?{...a,done:!a.done}:a))}/><span className={t.done?"done":""}>{t.title}</span><button onClick={()=>setTasks(x=>x.filter(a=>a.id!==t.id))}>×</button></div>)}</div>
      </section>}

      {tab==="memory" && <section className="panel"><header><div><h1>Memoria de NEXO</h1><p className="muted">Escribe cosas que quieras que NEXO tenga en cuenta al conversar contigo.</p></div></header>
        <textarea className="memory" value={memory} onChange={e=>setMemory(e.target.value)} placeholder={"Ejemplo:\nTrabajo de 8:00 a 16:00.\nEstoy intentando ahorrar.\nPrefiero respuestas directas."}/>
        <div className="notice">La memoria de este MVP se guarda en tu navegador. En la siguiente versión la conectamos permanentemente a Supabase.</div>
      </section>}
    </main>
  </div>
}

function Root() {
  const [user,setUser] = useState(null);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    if(!supabase){setLoading(false);return;}
    supabase.auth.getSession().then(({data})=>{setUser(data.session?.user || null);setLoading(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>setUser(session?.user||null));
    return ()=>subscription.unsubscribe();
  },[]);

  if(loading) return <div className="loading">Cargando NEXO…</div>;
  return user ? <App user={user}/> : <Auth onDone={setUser}/>;
}

createRoot(document.getElementById("root")).render(<Root />);
