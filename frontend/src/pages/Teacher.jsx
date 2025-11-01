import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

import s from './teacher.module.css';

// --- Helper functions for date math ---
function pad(n){ return String(n).padStart(2,'0'); }
function addDays(dateStr, days){
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
// Add days to startDateStr, considering breakWeek
function addDaysWithBreak(startDateStr, weekIndex, dayIndex, breakWeek) {
  if (!startDateStr) return '';
  const extraWeeks = (Number.isInteger(breakWeek) && breakWeek >= 1 && breakWeek <= 12 && weekIndex > breakWeek) ? 1 : 0;
  const days = ((weekIndex - 1 + extraWeeks) * 7) + dayIndex;
  return addDays(startDateStr, days);
}

export default function Teacher() {
  const nav = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [weeks, setWeeks] = useState([]);
  const [meta, setMeta] = useState({}); // {1:{title,notes},...}
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [autoGen, setAutoGen] = useState(false);
  const [difficultyByWeekDay, setDifficultyByWeekDay] = useState({}); // {1:{0:'medium',1:'medium',2:'medium',3:'medium',4:'medium'}}
  const [selectedDayByWeek, setSelectedDayByWeek] = useState({}); // {1:0, 2:0, ...} 0..4 -> Mon..Fri
  const [breakWeek, setBreakWeek] = useState(null); // 1..12 or null

  async function load() {
    const cfg = await api('/teacher/quiz-config');
    setStartDate(cfg.startDate || '');
    setWeeks(cfg.weeks || []);
    setAutoGen(!!cfg.autoGenerate);
    setBreakWeek(Number.isInteger(cfg.breakWeek) ? cfg.breakWeek : null);
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
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  async function saveAutoGen(next) {
    setBusy(true); setMsg('');
    try {
      const r = await api('/teacher/quiz-config/auto-generate', { method: 'PATCH', body: { autoGenerate: next }});
      setAutoGen(!!r.autoGenerate);
      setMsg(`Auto-generate ${r.autoGenerate ? 'enabled' : 'disabled'}.`);
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  async function saveBreakWeek(next) {
    setBusy(true); setMsg('');
    try {
      const r = await api('/teacher/quiz-config/break-week', { method:'PATCH', body:{ breakWeek: next } });
      setBreakWeek(Number.isInteger(r.breakWeek) ? r.breakWeek : null);
      setMsg(r.breakWeek ? `Break week set to Week ${r.breakWeek}` : 'Break week cleared');
      // 🔄 Immediately reload to refresh scheduled Mondays
      await load();
    } catch(e) { setMsg(e.message); }
    finally { setBusy(false); }
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

  async function generate(weekIndex, dayIndex) { // dayIndex: 0..4 for Mon..Fri
    setBusy(true); setMsg('');
    try {
      const dayMap = difficultyByWeekDay[weekIndex] || {};
      const difficulty = dayMap?.[dayIndex] || 'medium';

      // If startDate is configured, compute the concrete date for this week/day
      // startDate is the Monday of week 1 (as used by backend weekIndexForDate)
      const date = startDate ? addDaysWithBreak(startDate, weekIndex, dayIndex, breakWeek) : undefined;

      const r = await api(`/teacher/quiz-config/${weekIndex}/generate`, {
        method:'POST',
        body:{mode:'day', difficulty, ...(date ? { date } : {}) }
      });
      setMsg(`Generated quiz for ${r.date} (week ${weekIndex}, ${['Mon','Tue','Wed','Thu','Fri'][dayIndex]}) [${difficulty}]`);
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  // Generate quizzes for the whole week (Mon-Fri)
  async function generateWeek(weekIndex) {
    setBusy(true); setMsg('');
    try {
      const r = await api(`/teacher/quiz-config/${weekIndex}/generate`, {
        method:'POST',
        body:{ mode:'week', difficulty:'medium', numQuestions:5 }
      });
      setMsg(`Generated week ${weekIndex} quizzes (Monday: ${r?.date || (startDate ? addDaysWithBreak(startDate, weekIndex, 0, breakWeek) : 'N/A')})`);
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className={`page ${s.teacherPage}`}>
      <div className="leftside">
        <div style={{ margin: '8px 0 16px 0', display: 'flex', gap: 8, flexWrap:'wrap' }}>
          <button className={s.btn} onClick={() => nav('/teacher/events')}>Open Events (Cats vs Dogs)</button>
          <button className={s.btn} onClick={() => nav('/teacher/quizzes')}>Edit Quizzes</button>
          <button className={s.btn} onClick={() => nav('/teacher/settings')}>Settings</button>
          <button className={s.btn} onClick={() => nav('/teacher/qr')}>QR code</button>
        </div>
      </div>

      <div style={{ marginTop:30 }}>
        <h1 className="title" >Teacher Console</h1>
      </div>
      <div className="content" style={{maxWidth: 980}}>
        {msg && <div className="auth-ok" style={{marginBottom:10}}>{msg}</div>}

        <div className={s.teacherRow} style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
          <label><b>Start Date (YYYY-MM-DD):</b></label>
          <input value={startDate || ''} onChange={e=>setStartDate(e.target.value)} placeholder="2025-03-03"
                 className={s.teacherField} style={{height:34, borderRadius:8, padding:'0 8px'}} />
          <button className={`${s.btn} ${s.primary}`} onClick={saveStart} disabled={busy}>Save</button>
        </div>

        <div className={s.teacherRow} style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
          <label><b>Auto-generate (Mon–Fri):</b></label>
          <input type="checkbox" checked={autoGen} onChange={e => saveAutoGen(e.target.checked)} />
          <span style={{opacity:0.8}}>Generate daily quiz automatically based on Start Date and uploaded PDFs</span>
        </div>

        <div className={s.teacherRow} style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
          <label><b>Mid-semester break week:</b></label>
          <select
            value={breakWeek ?? ''}
            onChange={e => {
              const v = e.target.value === '' ? null : Number(e.target.value);
              // 💡 Optimistic UI update so the Monday dates update immediately
              setBreakWeek(v);
              saveBreakWeek(v);
            }}
            className={s.teacherField}
            style={{height:34, borderRadius:8, padding:'0 8px', width:180}}
          >
            <option value=''>None</option>
            {Array.from({length:12}, (_,i)=>i+1).map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
          <span style={{opacity:0.8}}>Weeks after this will shift by +1 week for generation.</span>
        </div>

        <div style={{display:'grid', gap:12}}>
          {[...Array(12)].map((_,i)=> {
            const weekIdx = i+1;
            const w = weeks.find(x => x.weekIndex === weekIdx) || {};
            const m = meta[weekIdx] || { title:'', notes:'' };
            const shifted = Number.isInteger(breakWeek) && weekIdx > breakWeek;
            const monday = startDate ? addDaysWithBreak(startDate, weekIdx, 0, breakWeek) : null;
            return (
              <div key={weekIdx} className={s.teacherCard} style={{border:'1px solid rgba(255,255,255,0.2)', borderRadius:12, padding:12, background:'rgba(255,255,255,0.06)'}}>
                <div className={s.teacherCard__head} style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                  <div>
                    <b>Week {weekIdx}</b> {w.pdfName ? <span style={{opacity:0.8}}> · PDF: {w.pdfName}</span> : <span style={{opacity:0.6}}> · No PDF</span>}
                    <div style={{fontSize:12, opacity:0.8}}>
                      {startDate ? (
                        <>
                          Scheduled Monday: {monday} {shifted ? <span style={{opacity:0.8}}> (shifted +1w due to break)</span> : null}
                        </>
                      ) : (
                        <>Scheduled Monday: <span style={{opacity:0.6}}>Set Start Date</span></>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      {/* Weekday selector */}
                      {/* <select
                        value={(selectedDayByWeek[weekIdx] ?? 0)}
                        onChange={e => setSelectedDayByWeek(prev => ({ ...prev, [weekIdx]: Number(e.target.value) }))}
                        className={s.btn}
                        style={{ padding:'4px 6px' }}
                        aria-label="Select weekday"
                      >
                        <option value={0}>Mon</option>
                        <option value={1}>Tue</option>
                        <option value={2}>Wed</option>
                        <option value={3}>Thu</option>
                        <option value={4}>Fri</option>
                      </select> */}

                      {/* Difficulty selector for the chosen day */}
                      <select
                        value={(difficultyByWeekDay[weekIdx]?.[(selectedDayByWeek[weekIdx] ?? 0)]) || 'medium'}
                        onChange={e => {
                          const dIdx = selectedDayByWeek[weekIdx] ?? 0;
                          setDifficultyByWeekDay(prev => ({
                            ...prev,
                            [weekIdx]: { ...(prev[weekIdx] || {}), [dIdx]: e.target.value }
                          }));
                        }}
                        className={s.btn}
                        style={{ padding:'4px 6px' }}
                        aria-label="Select difficulty"
                      >
                        <option value="easy">easy</option>
                        <option value="medium">medium</option>
                        <option value="difficult">difficult</option>
                      </select>

                      {/* Single generate button */}
                      {/* <button
                        className={s.btn}
                        onClick={() => generate(weekIdx, (selectedDayByWeek[weekIdx] ?? 0))}
                        disabled={busy}
                        title="Generate selected day's quiz"
                        style={{ padding:'4px 10px', whiteSpace:'nowrap' }}
                      >
                        Generate
                      </button> */}
                      {/* Generate Week button */}
                      <button
                        className={s.btn}
                        onClick={() => generateWeek(weekIdx)}
                        disabled={busy}
                        title="Generate all weekdays' quizzes"
                        style={{ padding:'4px 10px', whiteSpace:'nowrap' }}
                      >
                        Generate Week
                      </button>
                    </div>
                    <button className={s.btn} onClick={()=>saveMeta(weekIdx)} disabled={busy}>Save Meta</button>
                  </div>
                </div>
                <div style={{display:'grid', gap:8}}>
                  <input placeholder="Title" value={m.title} onChange={e=>setMeta(s=>({ ...s, [weekIdx]: { ...s[weekIdx], title:e.target.value }}))}
                         className={s.teacherField} style={{height:34, borderRadius:8, padding:'0 8px'}} />
                  <textarea placeholder="Teacher notes to guide Gemini (optional)" rows={3}
                            value={m.notes} onChange={e=>setMeta(s=>({ ...s, [weekIdx]: { ...s[weekIdx], notes:e.target.value }}))}
                            className={s.teacherField} style={{borderRadius:8, padding:'8px'}} />
                  <div>
                    <input type="file" accept="application/pdf" onChange={e=>uploadPDF(weekIdx, e.target.files?.[0])} />
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