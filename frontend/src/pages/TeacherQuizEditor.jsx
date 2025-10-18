import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

function asArray(x) { return Array.isArray(x) ? x : []; }

// More robust normalization for questions from DB/generators
function normalizeQuestions(questions) {
  return asArray(questions).map((raw) => {
    // If question is a plain string in DB
    if (typeof raw === 'string') {
      return { text: raw, options: [], answerIndex: 0 };
    }

    const q = raw || {};

    // Prefer common text keys, fallback chain covers many generators/DB shapes
    const text = (
      q.text ??
      q.question ??
      q.prompt ??
      q.content ??
      q.title ??
      q.stem ??
      ''
    );

    // Map options/choices variants
    let options = asArray(q.options ?? q.choices ?? q.answers ?? q.variants ?? []);

    // Compute answer index from several possible shapes
    let answerIndex = 0;
    if (typeof q.answerIndex === 'number') {
      answerIndex = q.answerIndex;
    } else if (typeof q.correctIndex === 'number') {
      answerIndex = q.correctIndex;
    } else if (typeof q.correctOption === 'string' && options.length) {
      const idx = options.findIndex((o) => String(o).trim() === String(q.correctOption).trim());
      answerIndex = idx >= 0 ? idx : 0;
    }

    return { text, options, answerIndex };
  });
}

export default function TeacherQuizEditor() {
  const nav = useNavigate();
  const [list, setList] = useState([]);       // quizzes
  const [cursor, setCursor] = useState(null); // for pagination
  const [editing, setEditing] = useState(null); // quiz object

  useEffect(() => {
    (async () => {
      const me = await api('/auth/me');
      if (me?.isStudent) { nav('/', { replace:true }); return; }
      await fetchMore(true);
    })();
  }, []);

  async function fetchMore(reset=false) {
    const qs = !reset && cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const data = await api(`/teacher/quizzes${qs}`);
    if (reset) setList(data);
    else setList(prev => [...prev, ...data]);
    if (Array.isArray(data) && data.length) setCursor(data[data.length - 1].date);
  }

  function openEdit(q) {
    setEditing({
      _id: q._id,
      date: q.date,
      weekIndex: q.weekIndex,
      questions: normalizeQuestions(q.questions),
    });
  }

  function updateQ(i, patch) {
    setEditing(s => {
      const next = { ...s, questions: s.questions.slice() };
      next.questions[i] = { ...next.questions[i], ...patch };
      return next;
    });
  }

  async function save() {
    if (!editing) return;
    await api(`/teacher/quizzes/${editing._id}`, {
      method: 'PATCH',
      body: { questions: editing.questions }
    });
    // update list in place
    setList(prev => prev.map(q => q._id === editing._id ? { ...q, questions: editing.questions } : q));
    setEditing(null);
  }

  async function removeQuiz(quiz) {
    if (!quiz) return;
    const wk = quiz.weekIndex;
    if (!window.confirm(`Delete ALL quizzes in week ${wk}? This cannot be undone.`)) return;
    await api(`/teacher/quizzes/week/${wk}`, { method: 'DELETE' });
    setList(prev => prev.filter(x => x.weekIndex !== wk));
    setEditing(s => (s && s.weekIndex === wk ? null : s));
  }

  return (
    <div style={{ padding: '16px', maxWidth: 960, margin: '0 auto' }}>
      <h2>Teacher · Edit Quizzes</h2>
      <div style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => nav('/teacher')}>Back</button>
      </div>

      {/* Quiz list */}
      <div style={{ display:'grid', gap:12 }}>
        {list.map(q => (
          <div key={q._id} style={{ border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, padding:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <strong>{q.date}</strong>
              <div style={{ opacity:.8 }}>Week {q.weekIndex ?? '-'}</div>
              <div>
                <button className="btn" onClick={() => openEdit(q)}>Edit</button>
                <button
                  className="btn"
                  style={{ marginLeft: 8, background: 'rgba(220, 53, 69, 0.15)', borderColor: 'rgba(220, 53, 69, 0.4)' }}
                  onClick={() => removeQuiz(q)}
                  aria-label={`Delete week ${q.weekIndex} quizzes`}
                  title={`Delete all quizzes of week ${q.weekIndex}`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {list.length >= 50 && (
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => fetchMore(false)}>Load More</button>
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'grid', placeItems:'start center', padding:24, zIndex:1000 }}>
          <div style={{ width:'min(960px, 100%)', maxHeight:'90vh', overflowY:'auto',
                        background:'rgba(10,10,14,0.8)', border:'1px solid rgba(255,255,255,0.12)',
                        borderRadius:12, padding:16, color:'#eaeaea' }}>
            <h3>Edit Quiz — {editing.date} (Week {editing.weekIndex ?? '-'})</h3>
            <div style={{ display:'grid', gap:12 }}>
              {editing.questions.map((q, i) => (
                <div key={i} style={{ border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:12 }}>
                  <div style={{ fontWeight:600, marginBottom:8 }}>Q{i+1}</div>
                  <textarea
                    value={q.text}
                    onChange={e=>updateQ(i, { text:e.target.value })}
                    placeholder="Question text"
                    rows={3}
                    style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px',
                             border:'1px solid rgba(255,255,255,0.12)', borderRadius:8,
                             background:'rgba(255,255,255,0.06)', color:'#eaeaea',
                             lineHeight: 1.35, resize: 'vertical' }}
                  />
                  <div style={{ display:'grid', gap:6, marginTop:8 }}>
                    {q.options.map((opt, k) => (
                      <div key={k} style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <input
                          type="radio"
                          name={`answer-${i}`}
                          checked={q.answerIndex === k}
                          onChange={()=>updateQ(i, { answerIndex: k })}
                        />
                        <input
                          value={opt}
                          onChange={e=>{
                            const next = q.options.slice();
                            next[k] = e.target.value;
                            updateQ(i, { options: next });
                          }}
                          placeholder={`Option ${k+1}`}
                          style={{ flex:1, boxSizing:'border-box', padding:'8px 10px',
                                   border:'1px solid rgba(255,255,255,0.12)', borderRadius:8,
                                   background:'rgba(255,255,255,0.06)', color:'#eaeaea' }}
                        />
                        {/* add/remove option buttons */}
                        <button className="btn btn-sm" onClick={()=>{
                          const next = q.options.slice(); next.splice(k,1);
                          let idx = q.answerIndex;
                          if (k === q.answerIndex) idx = 0;
                          else if (k < q.answerIndex) idx = Math.max(0, q.answerIndex - 1);
                          updateQ(i, { options: next, answerIndex: idx });
                        }}>–</button>
                        {k === q.options.length - 1 && q.options.length < 6 && (
                          <button className="btn btn-sm" onClick={()=>{
                            updateQ(i, { options:[...q.options, 'New option'] });
                          }}>+</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn" onClick={()=>setEditing(null)}>Cancel</button>
              <button className="btn primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}