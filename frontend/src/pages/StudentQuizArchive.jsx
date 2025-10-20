import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

function asArray(x){ return Array.isArray(x) ? x : []; }
// ISO Monday (YYYY-MM-DD) of *this* week; used to hide current week's quizzes
function currentWeekMondayISO() {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const monday = new Date(now);
  const diffToMonday = day === 0 ? -6 : 1 - day; // if Sun, go back 6; else 1-day
  monday.setDate(now.getDate() + diffToMonday);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function normalizeQuestions(questions) {
  return asArray(questions).map((raw) => {
    // If DB stored question as plain string
    if (typeof raw === 'string') {
      return { text: raw, options: [], answerIndex: 0 };
    }

    const q = raw || {};
    const text = (
      q.text ??
      q.question ??
      q.prompt ??
      q.content ??
      q.title ??
      q.stem ??
      ''
    );

    const options = asArray(q.options ?? q.choices ?? q.answers ?? q.variants ?? []);

    let answerIndex = 0;
    if (typeof q.answerIndex === 'number') answerIndex = q.answerIndex;
    else if (typeof q.correctIndex === 'number') answerIndex = q.correctIndex;
    else if (typeof q.correctOption === 'string' && options.length) {
      const idx = options.findIndex(o => String(o).trim() === String(q.correctOption).trim());
      answerIndex = idx >= 0 ? idx : 0;
    }

    return { text, options, answerIndex };
  });
}

export default function StudentQuizArchive() {
  const nav = useNavigate();
  const [list, setList] = useState([]);

  useEffect(() => {
    (async () => {
      const me = await api('/auth/me');
      if (!me?.isStudent) { nav('/teacher', { replace:true }); return; }
      // You can reuse the same teacher endpoint or create a public one:
      const qs = await api('/quiz/archive'); // <- fallback route if you prefer a student-safe list
      // Only keep quizzes strictly before the Monday of current week
      const cutoff = currentWeekMondayISO();
      setList(asArray(qs).filter(it => typeof it?.date === 'string' && it.date < cutoff));
    })();
  }, []);

  return (
    <div style={{ padding:'16px', maxWidth: 960, margin:'0 auto' }}>
      <h2>My Quiz Archive</h2>
      {list.length === 0 && (
        <div style={{opacity:.8, marginBottom:8}}>No past quizzes yet. Quizzes from the current week are hidden.</div>
      )}
      <div className="leftside">
        <button className="btn" onClick={() => nav('/student/quiz')}>Back to quiz</button>
      </div>
      <div style={{ display:'grid', gap:12 }}>
        {list.map(q => {
          const normalized = normalizeQuestions(q.questions);
          return (
            <div key={q._id} style={{ border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, padding:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <strong>{q.date}</strong>
                <span style={{ opacity:.8 }}>Week {q.weekIndex ?? '-'}</span>
              </div>
              <div style={{ display:'grid', gap:10, marginTop:8 }}>
                {normalized.map((qq, i) => (
                  <div key={i} style={{ border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:10 }}>
                    <div style={{ fontWeight:600, marginBottom:6 }}>Q{i+1}. {qq.text}</div>
                    <ol type="A" style={{ margin:0, paddingLeft:18 }}>
                      {qq.options.map((opt, k) => (
                        <li key={k} style={{ marginBottom:4, opacity: qq.answerIndex === k ? 1 : 0.8 }}>
                          {opt} {qq.answerIndex === k && <b style={{ marginLeft:8 }}>(Answer)</b>}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}