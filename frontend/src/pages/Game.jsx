// at top of Game.jsx
import { useEffect, useState } from 'react';
import { EventsAPI } from '../api/events';
import { useNavigate } from "react-router-dom";
import styles from "./Game.module.css";

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

  const navigate = useNavigate();

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

  /** UI Part */
  return (
    <>
      {/* Left side nav */}
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img src={`icons/home/home.png` || `icons/default/home.png`} className="icon" alt="Home" />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      {/* The card */}
      <div className={styles.card}>
        {/* The evet header */}
        <div className={styles.cardHeader}>
          <b>{ev.name}</b>
          <span>Ends: {new Date(ev.endAt).toLocaleString()}</span>
        </div>

        {/* The evet states--show the winning team */}
        <div className={styles.stats}>
          <PercentBar pctCat={data.stats.pctCat} pctDog={data.stats.pctDog} />
            <div className={styles.percentRow}>
              <span>Cat: {data.stats.cat} petfood ({data.stats.pctCat}%)</span>
              <span>Dog: {data.stats.dog} petfood ({data.stats.pctDog}%)</span>
              <span>Total: {data.stats.total}</span>
            </div>
        </div>

        {/* The evet hints for the winning team */}
        <div className={styles.hints}>
          <b className={styles.hintsTitle}>Hints</b>
          <div className={styles.hintsGrid}>
            {data.hints.map((h, i) => (
              <div key={i} className={styles.hintCard}>
                <div className={styles.hintHeader}>
                  <span className={styles.hintTitle}>{h.title || `Hint ${i + 1}`}</span>
                  <span className={styles.hintNeed}>Need {h.threshold} petfood</span>
                </div>

                <div
                  className={[
                    styles.hintContent,
                    h.unlocked ? styles.unlockedSelect : styles.lockedBlur,
                    ].join(" ")}
                >
                  {h.unlocked ? (h.content || "(No content)") : "Locked"}
                </div>

                {!h.unlocked && (
                  <div className={styles.lockedNote}> (Your team has not reached this threshold.) </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// then inside Game page component's JSX where you want it:
//<EventWidget />
export default function Game() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <EventWidget />
      {/* TODO: Keep the rest of your Game page UI below if you have other widgets */}
    </div>
  );
}