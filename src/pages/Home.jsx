import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./Home.css";

const BASE = import.meta.env.BASE_URL || '/';

function Home() {
  const [score, setScore] = useState(0);
  const [group, setGroup] = useState('');
  const [breed, setBreed] = useState('');
  const [username, setUsername] = useState('');
  const [boosterExpiresAt, setBoosterExpiresAt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api('/auth/me')
      .then(data => {
        if (data && data.isStudent === false) {
          navigate('/teacher', { replace: true });
          console.log('Redirecting to /teacher because user is not a student');
          return; // stop setting student-specific state
        }
        setScore(data?.score || 0);
        setGroup(data?.group || '');
        setBreed(data?.breed?.name || '');
        setUsername(data?.username || '');
        setBoosterExpiresAt(data?.boosterExpiresAt || null);
      })
      .catch(err => console.error('Failed to fetch /auth/me:', err));
  }, []);

  const boosterActive = boosterExpiresAt ? new Date(boosterExpiresAt) > new Date() : false;
  const boosterUntil = boosterActive ? new Date(boosterExpiresAt).toLocaleTimeString() : null;

  return (
    <main className="page">
      {/* User summary */}
      <div className="user-summary">
        <p className="iconcaption">User: {username || '—'}</p>
        <p className="iconcaption">Group: {group || '—'}</p>
        <p className="iconcaption">Breed: {breed || '—'}</p>
      </div>

      {/* Active effects */}
      <div style={{ position:'absolute', top: 60, left: '50%', transform:'translateX(-50%)', zIndex:5, display:'flex', gap:10 }}>
        {boosterActive && (
          <div style={{padding:'6px 10px', borderRadius:999, background:'rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.2)'}}>
            🔥 Quiz Booster active until <b>{boosterUntil}</b>
          </div>
        )}
      </div>

      <div className="leftside">
        <div className="pagelinkicon">
          <img
            src={`${BASE}icons/backpack_icon.png`}
            className="icon"
            alt="Backpack"
            onClick={() => navigate("/backpack")}
          />
          <p className="iconcaption">Backpack</p>
        </div>

        <div className="pagelinkicon">
          <img
            src={`${BASE}icons/moneybag_icon.png`}
            className="icon"
            alt="Money"
          />
          <p className="iconcaption">{score}</p>
        </div>
      </div>

      <div className="rightside">
        {/* Scan */}
        <div className="pagelinkicon">
          <img
            src={`${BASE}icons/scan_icon.png`}
            className="icon"
            alt="Scan"
            style={{ filter: "invert(1)" }}
            onClick={() => navigate("/scan")}
          />
          <p className="iconcaption">Scan</p>
        </div>

        {/* Rank */}
        <div className="pagelinkicon">
          <img
            src={`${BASE}icons/rank_icon.png`}
            className="icon"
            alt="Rank"
            onClick={() => navigate("/rank")}
          />
          <p className="iconcaption">Rank</p>
        </div>

        {/* Settings */}
        <div className="pagelinkicon">
          <img
            src={`${BASE}icons/setting_icon.png`}
            className="icon"
            alt="Settings"
            onClick={() => navigate("/settings")}
          />
          <p className="iconcaption">Settings</p>
        </div>
      </div>

      <section 
        className="content" 
        style={{textAlign: "center"}} 
        onClick={() => navigate("/game")}
      >
        <h1 className="title1">PowerUp</h1>
        <h1 className="title2">O O S D</h1>

        <img className="pic" src={`${BASE}icons/main_logo.png`} alt="logo"/>

        <p className="line">Click or tap anywhere to play...</p>
      </section>

      <div className="downpad">
        <button onClick={() => navigate("/quiz")}>
          <img
            src={`${BASE}icons/question_icon.png`}
            className="icon"
            alt="Quiz"
          />
          <div className="buttoncaption">Quiz</div>
        </button>

        <button onClick={() => navigate("/shop")}>
          <img
            src={`${BASE}icons/shop_icon.png`}
            className="icon"
            alt="Shop"
            onClick={() => navigate("/shop")}
          />
          <div className="buttoncaption">Shop</div>
        </button>

        <button onClick={() => navigate("/customise")}>
          <img
            src={`${BASE}icons/customise.png`}
            className="icon"
            alt="Customise"
          />
          <div className="buttoncaption">Customise</div>
        </button>
      </div>
    </main>
  );
}

export default Home;
