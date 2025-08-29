import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./Home.css";

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
            src={`${import.meta.env.BASE_URL}icons/backpack_icon.png`}
            className="icon"
            alt="Backpack"
            onClick={() => navigate("/backpack")}
          />
          <p className="iconcaption">Backpack</p>
        </div>

        <div className="pagelinkicon">
          <img
            src={`${import.meta.env.BASE_URL}icons/moneybag_icon.png`}
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
            src={`${import.meta.env.BASE_URL}icons/scan_icon.png`}
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
            src={`${import.meta.env.BASE_URL}icons/rank_icon.png`}
            className="icon"
            alt="Rank"
            onClick={() => navigate("/rank")}
          />
          <p className="iconcaption">Rank</p>
        </div>

        {/* Settings */}
        <div className="pagelinkicon">
          <img
            src={`${import.meta.env.BASE_URL}icons/settings_icon.png`}
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

        <img className="pic" src={`${import.meta.env.BASE_URL}icons/main_logo.png`} alt="logo"/>

        <p className="line">Click or tap anywhere to play...</p>
      </section>

      <div className="downpad">
        <button onClick={() => navigate("/quiz")}>
          <img
            src={`${import.meta.env.BASE_URL}icons/question_icon.png`}
            className="icon"
            alt="Quiz"
          />
          <div className="buttoncaption">Quiz</div>
        </button>

        <button onClick={() => navigate("/shop")}>
          <img
            src={`${import.meta.env.BASE_URL}icons/shop_icon.png`}
            className="icon"
            alt="Shop"
            onClick={() => navigate("/shop")}
          />
          <div className="buttoncaption">Shop</div>
        </button>

        <button onClick={() => navigate("/customise")}>
          <img
            src={`${import.meta.env.BASE_URL}icons/customise.png`}
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
