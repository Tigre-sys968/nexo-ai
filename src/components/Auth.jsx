import { useState } from "react";
import { supabase } from "../lib";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setMsg("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name } }
        });
        if (error) throw error;
        setMsg("Cuenta creada. Revisa tu correo si Supabase exige confirmación.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setMsg(e.message);
    } finally { setLoading(false); }
  }

  return (
    <main className="auth-page">
      <section className="brand-panel">
        <div className="logo">N</div>
        <h1>NEXO AI</h1>
        <p>La IA que organiza tu vida y recuerda lo importante por ti.</p>
        <div className="feature-chips">
          <span>Memoria personal</span><span>Tareas</span><span>Chat IA</span><span>Objetivos</span>
        </div>
      </section>
      <section className="auth-card">
        <div>
          <small>BIENVENIDO A NEXO</small>
          <h2>{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h2>
          <p className="muted">Tu espacio personal inteligente.</p>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>Nombre<input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre" required /></label>
          )}
          <label>Correo<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" required /></label>
          <label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required /></label>
          <button className="primary" disabled={loading}>{loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}</button>
        </form>
        {msg && <div className="notice">{msg}</div>}
        <button className="link-btn" onClick={()=>setMode(mode==="login"?"signup":"login")}>
          {mode==="login" ? "¿No tienes cuenta? Regístrate" : "Ya tengo una cuenta"}
        </button>
      </section>
    </main>
  );
}
