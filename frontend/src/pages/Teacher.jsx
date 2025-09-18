import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

function fmt(d) {
  const pad = n => String(n).padStart(2,'0');
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
}

export default function Teacher() {
  const nav = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [weeks, setWeeks] = useState([]);
  const [meta, setMeta] = useState({}); // {1:{title,notes},...}
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [autoGen, setAutoGen] = useState(false);

  async function load() {
    const cfg = await api('/teacher/quiz-config');
    setStartDate(cfg.startDate || '');
    setWeeks(cfg.weeks || []);
    setAutoGen(!!cfg.autoGenerate);
    const m = {};
    (cfg.weeks || []).forEach(w => m[w.weekIndex] = { title: w.title || '', notes: w.notes || '' });
    setMeta(m);
  }

  useEffect(() => {
    (async ()=> {
      const me = await api('/auth/me');
      if (me?.isStudent) { nav('/', { replace:true }); return; }
      await load();
    })();
  }, []);

  async function saveStart() {
    setBusy(true); setMsg('');
    try {
      const r = await api('/teacher/quiz-config/start-date', { method: 'PATCH', body: { startDate }});
      setStartDate(r.startDate);
      setMsg('Start date saved.');
    } catch (e) {
      setMsg(e.message);
    } finally { setBusy(false); }
  }

  async function saveAutoGen(next) {
    setBusy(true); setMsg('');
    try {
      const r = await api('/teacher/quiz-config/auto-generate', { method: 'PATCH', body: { autoGenerate: next }});
      setAutoGen(!!r.autoGenerate);
      setMsg(`Auto-generate ${r.autoGenerate ? 'enabled' : 'disabled'}.`);
    } catch (e) {
      setMsg(e.message);
    } finally { setBusy(false); }
  }

  async function saveMeta(weekIndex) {
    setBusy(true); setMsg('');
    try {
      await api(`/teacher/quiz-config/${weekIndex}/meta`, { method:'PATCH', body: meta[weekIndex] });
      setMsg(`Week ${weekIndex} meta saved.`);
      await load();
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  async function uploadPDF(weekIndex, file) {
    if (!file) return;
    setBusy(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${import.meta.env.VITE_API_BASE}/teacher/quiz-config/${weekIndex}/pdf`, {
        method:'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Upload failed');
      setMsg(`Week ${weekIndex} PDF uploaded`);
      await load();
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  async function generate(weekIndex) {
    setBusy(true); setMsg('');
    try {
      const r = await api(`/teacher/quiz-config/${weekIndex}/generate`, { method:'POST', body:{ /* date: optional, numQuestions:5 */ }});
      setMsg(`Generated quiz for ${r.date} (week ${weekIndex})`);
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="leftside">
        <div className="pagelinkicon" onClick={()=>nav('/')}>
          <img src="icons/home.png" className="icon" alt="Home"/>
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1 className="title">Teacher Console</h1>
      <div style={{ margin: '8px 0 16px 0', display: 'flex', gap: 8 }}>
        <button className="btn" onClick={() => nav('/teacher/events')}>
          Open Events (Cats vs Dogs)
        </button>
      </div>

      <div className="content" style={{maxWidth: 980}}>
        {msg && <div className="auth-ok" style={{marginBottom:10}}>{msg}</div>}

        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
          <label><b>Start Date (YYYY-MM-DD):</b></label>
          <input value={startDate || ''} onChange={e=>setStartDate(e.target.value)} placeholder="2025-03-03"
                 style={{height:34, borderRadius:8, padding:'0 8px'}} />
          <button className="btn primary" onClick={saveStart} disabled={busy}>Save</button>
        </div>

        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
          <label><b>Auto-generate (Mon–Fri):</b></label>
          <input type="checkbox" checked={autoGen} onChange={e => saveAutoGen(e.target.checked)} />
          <span style={{opacity:0.8}}>Generate daily quiz automatically based on Start Date and uploaded PDFs</span>
        </div>

        <div style={{display:'grid', gap:12}}>
          {[...Array(12)].map((_,i)=> {
            const w = weeks.find(x => x.weekIndex === i+1) || {};
            const m = meta[i+1] || { title:'', notes:'' };
            return (
              <div key={i+1} style={{border:'1px solid rgba(255,255,255,0.2)', borderRadius:12, padding:12, background:'rgba(255,255,255,0.06)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                  <div><b>Week {i+1}</b> {w.pdfName ? <span style={{opacity:0.8}}> · PDF: {w.pdfName}</span> : <span style={{opacity:0.6}}> · No PDF</span>}</div>
                  <div style={{display:'flex', gap:8}}>
                    <button className="btn" onClick={()=>saveMeta(i+1)} disabled={busy}>Save Meta</button>
                    <button className="btn primary" onClick={()=>generate(i+1)} disabled={busy}>Generate Quiz</button>
                  </div>
                </div>
                <div style={{display:'grid', gap:8}}>
                  <input placeholder="Title" value={m.title} onChange={e=>setMeta(s=>({ ...s, [i+1]: { ...s[i+1], title:e.target.value }}))}
                         style={{height:34, borderRadius:8, padding:'0 8px'}} />
                  <textarea placeholder="Teacher notes to guide Gemini (optional)" rows={3}
                            value={m.notes} onChange={e=>setMeta(s=>({ ...s, [i+1]: { ...s[i+1], notes:e.target.value }}))}
                            style={{borderRadius:8, padding:'8px'}} />
                  <div>
                    <input type="file" accept="application/pdf" onChange={e=>uploadPDF(i+1, e.target.files?.[0])} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}