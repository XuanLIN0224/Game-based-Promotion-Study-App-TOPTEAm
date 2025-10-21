import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { EventsAPI } from '../api/events';
// import "./Home.css";

function fmtDuration(ms) {
  if (ms <= 0) return 'Ended';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${ss}s`;
  return `${ss}s`;
}

function PercentBar({ pctCat, pctDog }) {
  const c = Math.max(0, Math.min(100, pctCat));
  const d = Math.max(0, Math.min(100, pctDog));
  return (
    <div style={{border:'1px solid #999', borderRadius:8, overflow:'hidden', display:'flex', height:20}}>
      <div style={{width:`${c}%`, background:'#5ec3ff'}} title={`Cat ${c}%`} />
      <div style={{width:`${d}%`, background:'#ff9db1'}} title={`Dog ${d}%`} />
    </div>
  );
}

export default function TeacherEvents() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [statusById, setStatusById] = useState({}); // id -> status

  const blank = useMemo(()=>({
    name: 'New Event',
    startAt: new Date(Date.now()+5*60*1000).toISOString().slice(0,16), // local ISO minutes
    endAt: new Date(Date.now()+7*24*3600*1000).toISOString().slice(0,16),
    hints: [
      { threshold: 100, title: 'Hint 1', content: '' },
      { threshold: 200, title: 'Hint 2', content: '' },
      { threshold: 400, title: 'Hint 3', content: '' },
    ],
    rewardScore: 200,
  }),[]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api('/auth/me');
        if (me?.isStudent) { nav('/', { replace: true }); return; }

        const list = await EventsAPI.listAll();
        if (!mounted) return;
        setEvents(list);
        for (const ev of list.slice(0,5)) {
          try {
            const st = await EventsAPI.getStatus(ev._id);
            if (!mounted) break;
            setStatusById(s => ({ ...s, [ev._id]: st }));
          } catch {}
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [nav]);

  function openNew() { setEditing({...blank}); }
  function openEdit(ev) {
    setEditing({
      _id: ev._id,
      name: ev.name,
      startAt: new Date(ev.startAt).toISOString().slice(0,16),
      endAt: new Date(ev.endAt).toISOString().slice(0,16),
      hints: ev.hints?.length ? ev.hints : blank.hints,
      rewardScore: ev.rewardScore ?? 200,
    });
  }

  async function save() {
    if (!editing) return;
    const payload = {
      name: editing.name,
      startAt: new Date(editing.startAt),
      endAt: new Date(editing.endAt),
      hints: editing.hints,
      rewardScore: (typeof editing.rewardScore === 'number' ? editing.rewardScore : 200),
    };
    if (editing._id) {
      const up = await EventsAPI.update(editing._id, payload);
      setEvents(evts => evts.map(e => e._id === up._id ? up : e));
    } else {
      const created = await EventsAPI.create(payload);
      setEvents(evts => [created, ...evts]);
    }
    setEditing(null);
  }

  async function remove(id) {
    if (!window.confirm('Delete this event?')) return;
    await EventsAPI.remove(id);
    setEvents(evts => evts.filter(e => e._id !== id));
  }

  return (
    <div style={{padding:'1rem'}}>
      <div className="leftside">
        <div style={{ margin: '8px 0 16px 0', display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => nav('/teacher')}>
            Back to weekly quizzes
            </button>
        </div>
      </div>
      <h2>Teacher Events</h2>
      <button onClick={openNew}>+ New Event</button>

      {/* list */}
      <div style={{marginTop:16, display:'grid', gap:12}}>
        {events.map(ev => {
          const st = statusById[ev._id];
          const running = st ? (st.now >= ev.startAt && st.now <= ev.endAt) : null;
          return (
            <div key={ev._id} style={{border:'1px solid #ddd', borderRadius:8, padding:12, minWidth:0}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                <strong>{ev.name}</strong>
                <div>
                  <button onClick={()=>openEdit(ev)}>Edit</button>{' '}
                  <button onClick={()=>remove(ev._id)} style={{color:'#c00'}}>Delete</button>
                </div>
              </div>
              <div style={{fontSize:13, opacity:0.8}}>
                <div>Start: {new Date(ev.startAt).toLocaleString()}</div>
                <div>End: {new Date(ev.endAt).toLocaleString()}</div>
                {st && <div>Time left: {fmtDuration(st.remainingMs)}</div>}
                {st?.winner && <div>Winner: <b>{st.winner}</b></div>}
              </div>

              {st && (
                <div style={{marginTop:8}}>
                  {st.winner ? (
                    <>
                      <PercentBar pctCat={st.final?.pctCat ?? 0} pctDog={st.final?.pctDog ?? 0} />
                      <div style={{display:'flex', gap:12, fontSize:13, marginTop:4}}>
                        <span>Cat (final): {st.final?.cat ?? 0} petfood ({st.final?.pctCat ?? 0}%)</span>
                        <span>Dog (final): {st.final?.dog ?? 0} petfood ({st.final?.pctDog ?? 0}%)</span>
                        <span>Total: {st.final?.total ?? 0}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <PercentBar pctCat={st.stats.pctCat} pctDog={st.stats.pctDog} />
                      <div style={{display:'flex', gap:12, fontSize:13, marginTop:4}}>
                        <span>Cat: {st.stats.cat} petfood ({st.stats.pctCat}%)</span>
                        <span>Dog: {st.stats.dog} petfood ({st.stats.pctDog}%)</span>
                        <span>Total: {st.stats.total}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {st && (
                <div style={{marginTop:8, fontSize:13}}>
                  <div><b>Unlocked</b> — Cat: {(st.unlockedByTeam?.cat ?? []).join(', ') || '-'}</div>
                  <div><b>Unlocked</b> — Dog: {(st.unlockedByTeam?.dog ?? []).join(', ') || '-'}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* editor */}
      {editing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'grid',
            placeItems: 'start center',
            padding: '24px'
          }}
        >
          <div
            style={{
              width: 'min(640px, calc(100vw - 32px))',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: 0,
              background: 'rgba(10,10,14,0.75)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              color: '#eaeaea'
            }}
          >
            <h3>{editing._id ? 'Edit Event' : 'New Event'}</h3>
            <div style={{ display:'grid', gap:12 }}>
              <label>Name<br/>
                <input
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    color: '#eaeaea'
                  }}
                />
              </label>
              <label style={{ display: 'block' }}>Reward Score (per winner)<br/>
                <input
                  type="number"
                  value={editing.rewardScore ?? 200}
                  onChange={e => setEditing({ ...editing, rewardScore: parseInt(e.target.value || '0', 10) })}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    color: '#eaeaea'
                  }}
                />
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ flex: 1 }}>Start<br/>
                  <input
                    type="datetime-local"
                    value={editing.startAt}
                    onChange={e => setEditing({ ...editing, startAt: e.target.value })}
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      color: '#eaeaea'
                    }}
                  />
                </label>
                <label style={{ flex: 1 }}>End<br/>
                  <input
                    type="datetime-local"
                    value={editing.endAt}
                    onChange={e => setEditing({ ...editing, endAt: e.target.value })}
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      color: '#eaeaea'
                    }}
                  />
                </label>
              </div>

              <div>
                <h4>Hints</h4>
                {editing.hints.map((h, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 8,
                      minWidth: 0
                    }}
                  >
                    <label>Threshold
                      <input
                        type="number"
                        value={h.threshold}
                        onChange={e => {
                          const v = parseInt(e.target.value || '0', 10);
                          const hints = editing.hints.slice();
                          hints[idx] = { ...h, threshold: v };
                          setEditing({ ...editing, hints });
                        }}
                        style={{
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          color: '#eaeaea'
                        }}
                      />
                    </label>
                    <div>
                      <input
                        placeholder="Title"
                        value={h.title}
                        onChange={e => {
                          const hints = editing.hints.slice();
                          hints[idx] = { ...h, title: e.target.value };
                          setEditing({ ...editing, hints });
                        }}
                        style={{
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          color: '#eaeaea',
                          marginBottom: 6
                        }}
                      />
                      <textarea
                        placeholder="Content (shown to unlocked team)"
                        value={h.content}
                        rows={3}
                        onChange={e => {
                          const hints = editing.hints.slice();
                          hints[idx] = { ...h, content: e.target.value };
                          setEditing({ ...editing, hints });
                        }}
                        style={{
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          color: '#eaeaea'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{marginTop:12, display:'flex', justifyContent:'flex-end', gap:8, flexWrap:'wrap'}}>
              <button
                onClick={() => setEditing(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#eaeaea',
                  whiteSpace: 'nowrap',
                  minWidth: 'auto'
                }}
              >Cancel</button>
              <button
                onClick={save}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#eaeaea',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  minWidth: 'auto'
                }}
              >Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}