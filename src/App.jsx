import { useEffect, useMemo, useState } from "react";
import { Brain, CheckSquare, LogOut, MessageCircle, Plus, Sparkles, Trash2 } from "lucide-react";
import { api, supabase } from "./lib";
import Auth from "./components/Auth";

function Sidebar({ tab, setTab, user }) {
  const items = [
    ["chat", MessageCircle, "Asistente"],
    ["tasks", CheckSquare, "Tareas"],
    ["memory", Brain, "Memoria"]
  ];
  return <aside className="sidebar">
    <div className="wordmark"><div className="logo mini">N</div><b>NEXO</b></div>
    <nav>{items.map(([id,Icon,label]) => (
      <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={18}/>{label}</button>
    ))}</nav>
    <div className="side-bottom">
      <div className="plan-card"><Sparkles size={17}/><div><b>Plan Free</b><small>Actualiza cuando quieras</small></div></div>
      <div className="profile"><div className="avatar">{(user?.user_metadata?.name || user?.email || "U")[0].toUpperCase()}</div><div><b>{user?.user_metadata?.name || "Usuario"}</b><small>{user?.email}</small></div></div>
      <button onClick={()=>supabase.auth.signOut()}><LogOut size={17}/>Salir</button>
    </div>
  </aside>
}

function Chat({ user }) {
  const [messages, setMessages] = useState([
    {role:"assistant", content:`Hola ${user?.user_metadata?.name || ""}. Soy NEXO. Puedo ayudarte a organizar tareas, recordar información y pensar contigo. ¿Qué necesitas hoy?`}
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(e) {
    e?.preventDefault();
    const v = text.trim(); if (!v || loading) return;
    setMessages(m=>[...m,{role:"user",content:v}]); setText(""); setLoading(true);
    try {
      const data = await api("/chat", {method:"POST", body:JSON.stringify({message:v, history:messages.slice(-8)})});
      setMessages(m=>[...m,{role:"assistant",content:data.reply}]);
    } catch(e) {
      setMessages(m=>[...m,{role:"assistant",content:"No pude responder: "+e.message}]);
    } finally { setLoading(false); }
  }

  return <section className="page chat-page">
    <header><div><small>ASISTENTE PERSONAL</small><h1>¿En qué trabajamos hoy?</h1></div><span className="status">● En línea</span></header>
    <div className="chat-stream">
      {messages.map((m,i)=><div key={i} className={`bubble ${m.role}`}>{m.content}</div>)}
      {loading && <div className="bubble assistant typing">Pensando…</div>}
    </div>
    <form className="composer" onSubmit={send}>
      <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Escribe lo que necesitas..." />
      <button className="send">➤</button>
    </form>
  </section>
}

function Tasks() {
  const [items,setItems]=useState([]); const [title,setTitle]=useState("");
  async function load(){ try{setItems((await api("/tasks")).tasks||[])}catch{} }
  useEffect(()=>{load()},[]);
  async function add(e){e.preventDefault();if(!title.trim())return;await api("/tasks",{method:"POST",body:JSON.stringify({title})});setTitle("");load()}
  async function toggle(t){await api(`/tasks/${t.id}`,{method:"PATCH",body:JSON.stringify({completed:!t.completed})});load()}
  async function del(id){await api(`/tasks/${id}`,{method:"DELETE"});load()}
  return <section className="page">
    <header><div><small>PRODUCTIVIDAD</small><h1>Mis tareas</h1></div></header>
    <form className="add-row" onSubmit={add}><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nueva tarea..." /><button className="primary"><Plus size={18}/>Agregar</button></form>
    <div className="list">{items.length===0&&<div className="empty">No tienes tareas. Crea la primera.</div>}
      {items.map(t=><div className={`task ${t.completed?"done":""}`} key={t.id}><button className="check" onClick={()=>toggle(t)}>{t.completed?"✓":""}</button><span>{t.title}</span><button className="icon danger" onClick={()=>del(t.id)}><Trash2 size={16}/></button></div>)}
    </div>
  </section>
}

function Memory() {
  const [items,setItems]=useState([]); const [content,setContent]=useState("");
  async function load(){try{setItems((await api("/memories")).memories||[])}catch{}}
  useEffect(()=>{load()},[]);
  async function add(e){e.preventDefault();if(!content.trim())return;await api("/memories",{method:"POST",body:JSON.stringify({content})});setContent("");load()}
  async function del(id){await api(`/memories/${id}`,{method:"DELETE"});load()}
  return <section className="page">
    <header><div><small>CONTEXTO PERSONAL</small><h1>Memoria</h1><p className="muted">Tú decides qué puede recordar NEXO.</p></div></header>
    <form className="add-row" onSubmit={add}><input value={content} onChange={e=>setContent(e.target.value)} placeholder="Ej.: Prefiero entrenar por la noche" /><button className="primary"><Plus size={18}/>Recordar</button></form>
    <div className="memory-grid">{items.length===0&&<div className="empty">Todavía no has guardado recuerdos.</div>}
      {items.map(m=><article className="memory-card" key={m.id}><Brain size={19}/><p>{m.content}</p><button className="icon danger" onClick={()=>del(m.id)}><Trash2 size={16}/></button></article>)}
    </div>
  </section>
}

export default function App() {
  const [session,setSession]=useState(null); const [tab,setTab]=useState("chat");
  useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session)); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s)); return()=>subscription.unsubscribe()},[]);
  if(!session) return <Auth/>;
  return <div className="shell"><Sidebar tab={tab} setTab={setTab} user={session.user}/><main className="content">{tab==="chat"?<Chat user={session.user}/>:tab==="tasks"?<Tasks/>:<Memory/>}</main></div>
}
