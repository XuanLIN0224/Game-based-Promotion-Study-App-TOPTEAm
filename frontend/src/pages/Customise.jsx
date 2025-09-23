import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";  
import "./Home.css";

export default function Customise() {
  const navigate = useNavigate();
  const BASE = import.meta.env.BASE_URL || "/";

  const [group, setGroup] = useState("");
  const [breed, setBreed] = useState("");
  const [score, setScore] = useState(0);       
  const [numPetfood, setPetfood] = useState(0); 

  useEffect(() => {
    api("/auth/me")
      .then((data) => {
        setScore(data?.score || 0);
        setPetfood(data?.numPetFood || 0);
        setGroup(data?.group || "default");
        setBreed(data?.breed?.name || "");
      })
      .catch((err) => console.error("Failed to fetch /auth/me:", err));
  }, []);

  // breedImages logic from Home.jsx
  const breedImages = {
    dog: {
      "Border Collie": `${BASE}icons/home/BorderCollie.gif`,
      Dachshund: `${BASE}icons/home/Dachshund.gif`,
      Samoyed: `${BASE}icons/home/Samoyed.gif`,
      "Toy Poodle": `${BASE}icons/home/Poodle.gif`,
      default: `${BASE}icons/home/main.gif`,
    },
    cat: {
      "Golden British": `${BASE}icons/home/golden_british_cat.gif`,
      Bombay: `${BASE}icons/home/Bombay_cat.gif`,
      Ragdoll: `${BASE}icons/home/ragdoll_cat.gif`,
      Siamese: `${BASE}icons/home/Siamese_cat.gif`,
      default: `${BASE}icons/home/main.gif`,
    },
  };

  // group-specific icons (score + feed)
  const groupIcons = {
    default: {
      coin: `${BASE}icons/default/moneybag_icon.png`,
      feed: `${BASE}icons/default/feed.png`,
    },
    dog: {
      coin: `${BASE}icons/dog/coin.png`,
      feed: `${BASE}icons/dog/bone.png`,
    },
    cat: {
      coin: `${BASE}icons/cat/coin.png`,
      feed: `${BASE}icons/cat/fish.png`,
    },
  };
  const icons = groupIcons[group] ?? groupIcons.default;

  // example accessories (for testing)
  //image size 1200 x 1200
  const accessories = [
    { key: "cat ear", title: "cat ear", imageUrl: `${BASE}customise/cat_ear.png`, price: 7, purchased: true },
    { key: "bear ear", title: "bear ear", imageUrl: `${BASE}customise/bear_ear.png`, price: 7, purchased: false },
  ];

  return (
    <div className="page">
      {/* Left nav + Score/Petfood */}
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img
            src={`${BASE}icons/home/home.png`}
            className="icon"
            alt="Home"
            onError={(e) => {
              e.currentTarget.src = `${BASE}icons/default/home.png`;
            }}
          />
          <p className="iconcaption">Home</p>
        </div>

        {/* Score + Petfood */}
        <div className="scorePad">
          <div
            className="pagelinkicon"
            style={{ display: "flex", flexDirection: "row", gap: "10px" }}
          >
            <img src={icons.coin} className="icon" alt="Score" />
            <p className="iconcaption">{score}</p>
          </div>
          <div
            className="pagelinkicon"
            style={{ display: "flex", flexDirection: "row", gap: "10px" }}
          >
            <img src={icons.feed} className="icon" alt="Feed" />
            <p className="iconcaption">{numPetfood}</p>
          </div>
        </div>
      </div>

      <h1 className="title">Customise</h1>

      {/* Pet image */}
      <div className="content" style={{ textAlign: "center", marginBottom: "30px" }}>
        <img
          src={
            (breedImages[group] && breedImages[group][breed]) ||
            (breedImages[group] && breedImages[group].default) ||
            `${BASE}icons/home/main.gif`
          }
          alt={breed || group || "default"}
          className="pic"
          style={{ maxWidth: "300px" }}
        />
      </div>

      {/* Accessories list */}
      <div className="content" style={{ padding: "20px" }}>
        <h2>Available Accessories</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center" }}>
          {accessories.map((acc) => (
          <div
            key={acc.key}
            style={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "10px",
              width: "180px",
              textAlign: "center",    
              display: "flex",
              flexDirection: "column",
              alignItems: "center",   
            }}
          >
              <img src={acc.imageUrl} alt={acc.title} style={{ width: "100px", height: "100px" }} />
              <h3 style={{ margin: "10px 0 5px" }}>{acc.title}</h3>
              <p style={{ margin: "0 0 5px" }}>
                <img src={icons.coin} alt="Price" style={{ width: "20px", verticalAlign: "middle" }} /> {acc.price}
              </p>
              <p style={{ margin: "0 0 10px" }}>
                {acc.purchased ? "✅ Owned" : "❌ Not Owned"}
              </p>
              <button
                disabled={!acc.purchased}
                style={{
                  display: "inline-block",    
                  padding: "6px 16px",
                  fontSize: "14px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  background: acc.purchased ? "#f1da66" : "#ddd",
                  cursor: acc.purchased ? "pointer" : "not-allowed",
                  marginTop: "8px",
                  marginBottom: "5px",        
                }}
              >
                Wear
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
