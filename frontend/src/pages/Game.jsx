// at top of Game.jsx
import { useEffect, useState } from 'react';
import { EventsAPI } from '../api/events';

function PercentBar({ pctCat, pctDog }) {
  return (
    <div style={{border:'1px solid #999', borderRadius:8, overflow:'hidden', display:'flex', height:16}}>
      <div style={{width:`${pctCat}%`, background:'#5ec3ff'}} title={`Cat ${pctCat}%`} />
      <div style={{width:`${pctDog}%`, background:'#ff9db1'}} title={`Dog ${pctDog}%`} />
    </div>
  );
}

function EventWidget() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const d = await EventsAPI.getActive();
      if (mounted) setData(d);
    })();
    const t = setInterval(async () => {
      const d = await EventsAPI.getActive();
      setData(d);
    }, 15000); // refresh every 15s
    return () => { mounted=false; clearInterval(t); };
  }, []);

  if (!data || !data.event) return (
    <div style={{border:'1px solid #ddd', borderRadius:8, padding:12, marginBottom:12}}>
      <b>No active event</b>
    </div>
  );

  const ev = data.event;

  return (
    <div style={{border:'1px solid #ddd', borderRadius:8, padding:12, marginBottom:12}}>
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <b>{ev.name}</b>
        <span>Ends: {new Date(ev.endAt).toLocaleString()}</span>
      </div>

      <div style={{marginTop:8}}>
        <PercentBar pctCat={data.stats.pctCat} pctDog={data.stats.pctDog} />
        <div style={{display:'flex', gap:12, fontSize:12, marginTop:4}}>
          <span>Cat: {data.stats.cat} petfood ({data.stats.pctCat}%)</span>
          <span>Dog: {data.stats.dog} petfood ({data.stats.pctDog}%)</span>
          <span>Total: {data.stats.total}</span>
        </div>
      </div>

      <div style={{marginTop:12}}>
        <b>Hints</b>
        <div style={{display:'grid', gap:8, marginTop:6}}>
          {data.hints.map((h, i) => (
            <div key={i} style={{border:'1px solid #eee', borderRadius:6, padding:8}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span>{h.title || `Hint ${i+1}`}</span>
                <span style={{fontSize:12, opacity:0.7}}>Need {h.threshold} petfood</span>
              </div>
              <div style={{
                marginTop:6,
                filter: h.unlocked ? 'none' : 'blur(4px)',
                userSelect: h.unlocked ? 'text' : 'none',
                minHeight: 18
              }}>
                {h.unlocked ? (h.content || '(No content)') : 'Locked'}
              </div>
              {!h.unlocked && <div style={{fontSize:12, opacity:0.7, marginTop:4}}>(Your team has not reached this threshold.)</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// then inside Game page component's JSX where you want it:
{/* <EventWidget /> */}
export default function Game() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <EventWidget />
      {/* TODO: Keep the rest of your Game page UI below if you have other widgets */}
    </div>
  );
}