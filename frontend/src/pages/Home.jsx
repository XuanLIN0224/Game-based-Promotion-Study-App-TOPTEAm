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
  const [numPetfood, setPetfood] = useState('');
  const [accessories, setAccessories] = useState('');
  const [boosterExpiresAt, setBoosterExpiresAt] = useState(null);
  const navigate = useNavigate();

useEffect(() => {
  (async () => {
    try {
      const data = await api('/auth/me');

      if (data && data.isStudent === false) {
        navigate('/teacher', { replace: true });
        console.log('Redirecting to /teacher because user is not a student');
        return;
      }

      setScore(data?.score || 0);
      setGroup(data?.group || '');
      setBreed(data?.breed?.name || '');
      setUsername(data?.username || '');
      setPetfood(data?.numPetFood || 0);
      setBoosterExpiresAt(data?.boosterExpiresAt || null);

      await getAccessoryKeys();
    } catch (err) {
      console.error('Failed to fetch /auth/me:', err);
    }
  })();
}, []);


  const boosterActive = boosterExpiresAt ? new Date(boosterExpiresAt) > new Date() : false;
  const boosterUntil = boosterActive ? new Date(boosterExpiresAt).toLocaleTimeString() : null;

 /** Application of accessories */
  async function getAccessoryKeys() {
    try {
      const res = await api("/accessories/items");
      if (!Array.isArray(res)) {
        setAccessories('');
        return;
      }
      const equippedItem = res.find((item) => item?.owned?.equipped);
      setAccessories(equippedItem ? equippedItem.key : ''); // safe
    } catch (err) {
      console.error("Failed to fetch accessories:", err);
      setAccessories('');
    }
  }
  function pickMainSrc() {
    // try accessory first
    if (accessories && breedImagesWithAccessories[accessories]) {
      const accMap = breedImagesWithAccessories[accessories];
      const src = accMap[breed] || accMap.default || `${BASE}icons/home/main.gif`;
      console.log('Using accessory image:', { accessories, breed, src });
      return src;
    }

    // fallback to base breed
    const baseMap = breedImages[group];
    const src = (baseMap && (baseMap[breed] || baseMap.default)) || `${BASE}icons/home/main.gif`;
    console.log('Using base breed image:', { group, breed, src });
    return src;
  }

  /* Home Page Breed Images */
  const breedImages = {

    // Dog Breeds
    dog: {
      "Border Collie": `${BASE}icons/home/BorderCollie.gif`,
      "Dachshund": `${BASE}icons/home/Dachshund.gif`,
      "Samoyed": `${BASE}icons/home/Samoyed.gif`,
      "Toy Poodle": `${BASE}icons/home/Poodle.gif`,
      default: `${BASE}icons/home/main.gif`
      },

    // Cat Breeds
    cat: {
      "Golden British": `${BASE}icons/home/golden_british_cat.gif`,
      "Bombay": `${BASE}icons/home/Bombay_cat.gif`,
      "Ragdoll": `${BASE}icons/home/ragdoll_cat.gif`,
      "Siamese": `${BASE}icons/home/Siamese_cat.gif`,
      default: `${BASE}icons/home/main.gif`
    }
  };

  /* Home Page Breed Images with accessories */
  const breedImagesWithAccessories = {

    // Cat Ear
    cat_ear: {
      "Bombay": `${BASE}accessory/cat_ear/catEar_Bombay.gif`,
      "Border Collie": `${BASE}accessory/cat_ear/catEar_BorderCollie.gif`,
      "Dachshund": `${BASE}accessory/cat_ear/catEar_Dachshund.gif`,
      "Toy Poodle": `${BASE}accessory/cat_ear/catEar_Poodle.gif`,
      default: `${BASE}icons/home/main.gif`
      },

    // Bear Ear
    bear_ear: {
      Bombay: `${BASE}accessory/bear/bearEar_Bombay.gif`,
      "Border Collie": `${BASE}accessory/bear/bearEar_BorderCollie.gif`,
      Dachshund: `${BASE}accessory/bear/bearEar_dachshund.gif`,
      "Golden British": `${BASE}accessory/bear/bearEar_golden_british.gif`,
      "Toy Poodle": `${BASE}accessory/bear/bearEar_Poodle.gif`,
      Ragdoll: `${BASE}accessory/bear/bearEar_ragdoll.gif`,
      Samoyed: `${BASE}accessory/bear/bearEar_Samoyed.gif`,
      Siamese: `${BASE}accessory/bear/bearEar_Siamese.gif`,
    },

    // Crown
    crown: {
      Bombay: `${BASE}accessory/crown/crown_Bombay.gif`,
      "Border Collie": `${BASE}accessory/crown/crown_BorderCollie.gif`,
      Dachshund: `${BASE}accessory/crown/crown_dachshund.gif`,
      "Golden British": `${BASE}accessory/crown/crown_golden_british.gif`,
      "Toy Poodle": `${BASE}accessory/crown/crown_Poodle.gif`,
      Ragdoll: `${BASE}accessory/crown/crown_ragdoll.gif`,
      Samoyed: `${BASE}accessory/crown/crown_Samoyed.gif`,
      Siamese: `${BASE}accessory/crown/crown_Siamese.gif`,
    }
  };


  /* Group Icons */
  const groupIcons = {

    default: {
      backpack: `${BASE}icons/default/backpack.png`,
      feed: `${BASE}icons/default/feed.png`,
      coin: `${BASE}icons/default/moneybag_icon.png`,
      scan: `${BASE}icons/default/scan_icon.png`,
      rank: `${BASE}icons/default/rank.png`,
      settings: `${BASE}icons/default/setting_icon.png`,
      quiz: `${BASE}icons/default/question_icon.png`,
      shop: `${BASE}icons/default/shop_icon.png`,
      customise: `${BASE}icons/default/customise.png`,
    },

    dog:{
      backpack: `${BASE}icons/dog/backpack.png`,
      feed: `${BASE}icons/dog/bone.png`,
      coin: `${BASE}icons/dog/coin.png`,
      scan: `${BASE}icons/dog/scan.png`,
      rank: `${BASE}icons/dog/rank.png`,
      settings: `${BASE}icons/dog/settings.png`,
      quiz: `${BASE}icons/dog/quiz.png`,
      shop: `${BASE}icons/dog/shop.png`,
      customise: `${BASE}icons/dog/customise.png`
    },

    cat: {
      backpack: `${BASE}icons/cat/backpack.png`,
      feed: `${BASE}icons/cat/fish.png`,
      coin: `${BASE}icons/cat/coin.png`,
      scan: `${BASE}icons/cat/scan.png`,
      rank: `${BASE}icons/cat/rank.png`,
      settings: `${BASE}icons/cat/settings.png`,
      quiz: `${BASE}icons/cat/quiz.png`,
      shop: `${BASE}icons/cat/shop.png`,
      customise: `${BASE}icons/cat/customise.png`
    }

  }

  const icons = groupIcons[group] ?? groupIcons.default;
  console.log('Using breed image for breed:', breed, 'and group:', group);

  return (
    <main className="page">
      {/* User summary (Delete later, For Testing only) */}
      <div>
        <p className="iconcaption">User: {username || '—'}</p>  {/* The css is in the 'main.css' */}
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

      {/* Top left icons */}
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
            <p className="iconcaption">{numPetfood}</p>
          </div>
        </div>
      </div>

      {/* Top right icons */}
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

      {/* Middle Content */}
      <section 
        className="content" 
        style={{textAlign: "center"}} 
        onClick={() => navigate("/game")}
      >
        {/* Title of the Project */}
        <div className="title-wrap">
          <h1 className="title1">PowerUp</h1>
          <h1 className="title2">O O S D</h1>
        </div>

        {/* Main Image */}
        <img
          src={pickMainSrc()}
          alt={accessories ? `${breed} with ${accessories}` : (breed || group || "default")}
          className="pic"
        />

        <p className="line">Click or tap anywhere to play...</p>
      </section>

      {/* Bottom Buttons */}
      <div className="downpad">
        {/* Quiz */}
        <button 
          className="btn primary"
          onClick={() => navigate("/quiz")}>
          <img
            src={ icons.quiz }
            className="icon"
            alt="Quiz"
          />
          <div className="buttoncaption">Quiz</div>
        </button>
        
        {/* Shop */}
        <button 
          className="btn primary"
          onClick={() => navigate("/shop")}>
          <img
            src={ icons.shop }
            className="icon"
            alt="Shop"
            onClick={() => navigate("/shop")}
          />
          <div className="buttoncaption">Shop</div>
        </button>

        {/* Customise */}
        <button 
          className="btn primary"
          onClick={() => navigate("/customise")}>
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