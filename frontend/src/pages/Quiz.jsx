import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const BASE = import.meta.env.BASE_URL || '/';

export default function Quiz () {
  const nav = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState({ allowed: 1, used: 0, left: 1 });
  const [answers, setAnswers] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [booster, setBooster] = useState({ active:false, until:null });

  async function load() {
    const data = await api('/quiz/today');
    if (!data || !data.quiz) {
        setMsg('No quiz today (weekend). See you Monday!');
        setQuiz(null);
        return;
    }
    setQuiz(data.quiz || null);
    setAttempts(data.attempts);
    setBooster({ active: !!data.boosterActive, until: data.boosterExpiresAt });
    setAnswers(Array.from({length: data.quiz?.questions?.length || 0}, ()=>null));
    setResult(null);
    setMsg('');
  }

  useEffect(()=>{ load().catch(e=>setMsg(e.message)); }, []);

  async function useExtra() {
    setBusy(true); setMsg('');
    try {
      const r = await api('/quiz/attempts/use-extra', { method: 'POST' });
      setAttempts(r.attempts);
      setMsg('+1 attempt granted.');
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!quiz) return;
    if (answers.some(a => a === null)) { setMsg('Please answer all questions'); return; }
    setBusy(true); setMsg('');
    try {
      const r = await api('/quiz/attempt', { method:'POST', body:{ answers }});
      setResult(r);
      setAttempts(a => ({ ...a, used: a.used + 1, left: Math.max(0, a.left - 1) }));
      setMsg(`You got ${r.correct}/${r.total}. +${r.award} score ${r.boosterApplied ? '(booster ×2)' : ''}`);
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  if (!quiz) {
    return (
      <div className="page">
        <div className="leftside">
          <div className="pagelinkicon" onClick={() => nav("/")}>
            <img src={`${BASE}icons/home/home.png` || `${BASE}icons/default/home.png`} className="icon" alt="Home"/>
            <p className="iconcaption">Home</p>
          </div>
        </div>
        <h1 className="title">Quiz</h1>
        <div className="content" style={{}}>No quiz available for today. Ask your teacher to generate one.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => nav("/")}>
          <img src={`${BASE}icons/home/home.png` || `${BASE}icons/default/home.png`} className="icon" alt="Home"/>
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1 className="title">Quiz</h1>
      <button className="btn" onClick={() => nav('/student/archive')}>Student Quiz Archive</button>

      <div className="content" style={{maxWidth: 900}}>
        {msg && <div className="auth-ok" style={{marginBottom:10}}>{msg}</div>}

        <div style={{display:'flex', gap:12, marginBottom:12}}>
            <div className="pill">Attempts Left: <b>{attempts.left}</b></div>
            {booster.active && <div className="pill">🔥 Booster active</div>}
            {result && result.correct === 0 && attempts.left === 0 && (
                <button className="btn" onClick={useExtra} disabled={busy}>Use Extra Attempt</button>
            )}
        </div>

        <ol style={{display:'grid', gap:16, paddingLeft:20, paddingRight:20}}>
          {quiz.questions.map((q, idx) => (
            <li key={idx} style={{border:'1px solid rgba(255,255,255,0.2)', borderRadius:12, padding:12}}>
              <div style={{fontWeight:700, marginBottom:8}}>{q.stem}</div>
              <div style={{display:'grid', gap:6}}>
                {q.choices.map((c, i) => (
                  <label key={i} style={{display:'flex', gap:8, alignItems:'center'}}>
                    <input
                      type="radio"
                      name={`q${idx}`}
                      checked={answers[idx] === i}
                      onChange={() => setAnswers(a => { const copy=[...a]; copy[idx]=i; return copy; })}
                    />
                    <span>{c}</span>
                    {result && (
                      <span style={{marginLeft:8, opacity:0.8}}>
                        {result.correctIndexes[idx] === i ? '✅' : (answers[idx] === i ? '❌' : '')}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <div style={{marginTop:12}}>
          <button className="btn primary" onClick={submit} disabled={busy || attempts.left <= 0}>
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}