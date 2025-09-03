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


  {/* Home Page Breed Images */}
  const breedImages = {

    // Dog Breeds
    dog: {
      "Border Collie": "/icons/home/BorderCollie.gif",
      "Dachshund": "/icons/home/Dachshund.gif",
      "Samoyed": "/icons/home/Samoyed.gif",
      "Toy Poodle": "/icons/home/Poodle.gif",
      default: "/icons/main.gif"
      },

    // Cat Breeds
    cat: {
      "Golden British": "/icons/home/golden_british_cat.gif",
      "Bombay": "/icons/home/Bombay_cat.gif",
      "Ragdoll": "/icons/home/ragdoll_cat.gif",
      "Siamese": "/icons/home/Siamese_cat.gif",
      default: "/icons/main.gif"
    }
  };

  {/* Group Icons */}
  const groupIcons = {

    default: {
      backpack: "/icons/default/backpack.png",
      feed: "/icons/default/feed.png",
      coin: "/icons/default/moneybag_icon.png",
      scan: "/icons/default/scan_icon.png",
      rank: "/icons/default/rank.png",
      settings: "/icons/default/setting_icon.png",
      quiz: "/icons/default/question_icon.png",
      shop: "/icons/default/shop_icon.png",
      customise: "/icons/default/customise.png",
    },

    dog:{
      backpack: "/icons/dog/backpack.png",
      feed: "/icons/dog/bone.png",
      coin: "/icons/dog/coin.png",
      scan: "/icons/dog/scan.png",
      rank: "/icons/dog/rank.png",
      settings: "/icons/dog/settings.png",
      quiz: "/icons/dog/quiz.png",
      shop: "/icons/dog/shop.png",
      customise: "/icons/dog/customise.png"
    },

    cat: {
      backpack: "/icons/cat/backpack.png",
      feed: "/icons/cat/bone.png",
      coin: "/icons/cat/coin.png",
      scan: "/icons/cat/scan.png",
      rank: "/icons/cat/rank.png",
      settings: "/icons/cat/settings.png",
      quiz: "/icons/cat/quiz.png",
      shop: "/icons/cat/shop.png",
      customise: "/icons/cat/customise.png"
    }

  }

  const icons = groupIcons[group] ?? groupIcons.default;


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
        {/* Backpack */}
        <div className="pagelinkicon">
          <img
            src={ icons.backpack }
            className="icon"
            alt="Backpack"
            onClick={() => navigate("/backpack")}
          />
          <p className="iconcaption">Backpack</p>
        </div>

        <div className="scorePad">
          {/* Money */}
          <div className="pagelinkicon"
            style={{display: "flex", flexDirection: "row", gap: "10px"}}>
            <img
              src={ icons.coin }
              className="icon"
              alt="Money"
            />
            <p className="iconcaption">{score}</p>
          </div>
          
          {/* Bones/Fishes */}
          <div className="pagelinkicon"
            style={{display: "flex", flexDirection: "row", gap: "10px"}}>
            <img
              src={ icons.feed }
              className="icon"
              alt="Feed"
            />
            <p className="iconcaption">{score}</p>
          </div>
        </div>
      </div>

      <div className="rightside">
        {/* Scan */}
        <div className="pagelinkicon">
          <img
            src={ icons.scan }
            className="icon"
            alt="Scan"
            onClick={() => navigate("/scan")}
          />
          <p className="iconcaption">Scan</p>
        </div>

        {/* Rank */}
        <div className="pagelinkicon">
          <img
            src={ icons.rank }
            className="icon"
            alt="Rank"
            onClick={() => navigate("/rank")}
          />
          <p className="iconcaption">Rank</p>
        </div>

        {/* Settings */}
        <div className="pagelinkicon">
          <img
            src={ icons.settings }
            className="icon"
            alt="Settings"
            onClick={() => navigate("/settings")}
          />
          <p className="iconcaption">Settings</p>
        </div>
      </div>

      {/* Main Image */}
      <section 
        className="content" 
        style={{textAlign: "center"}} 
        onClick={() => navigate("/game")}
      >
        <h1 className="title1">PowerUp</h1>
        <h1 className="title2">O O S D</h1>

        <img
          src={
            (breedImages[group] && breedImages[group][breed]) ||
            (breedImages[group] && breedImages[group].default) ||
            "/icons/home/main.gif"
          }
          alt={breed || group || "default"}
          className="pic"
        />

        <p className="line">Click or tap anywhere to play...</p>
      </section>

      <div className="downpad">
        {/* Quiz */}
        <button onClick={() => navigate("/quiz")}>
          <img
            src={ icons.quiz }
            className="icon"
            alt="Quiz"
          />
          <div className="buttoncaption">Quiz</div>
        </button>
        
        {/* Shop */}
        <button onClick={() => navigate("/shop")}>
          <img
            src={ icons.shop }
            className="icon"
            alt="Shop"
            onClick={() => navigate("/shop")}
          />
          <div className="buttoncaption">Shop</div>
        </button>

        {/* Customise */}
        <button onClick={() => navigate("/customise")}>
          <img
            src={ icons.customise }
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
