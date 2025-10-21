import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import "./Home.css";
import "./Rank.css";

const BASE = import.meta.env.BASE_URL || '/';
const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

const breedImages = {
  dog: {
    "Border Collie": `${BASE}icons/home/BorderCollie.gif`,
    "Dachshund": `${BASE}icons/home/Dachshund.gif`,
    "Samoyed": `${BASE}icons/home/Samoyed.gif`,
    "Toy Poodle": `${BASE}icons/home/Poodle.gif`,
    default: `${BASE}icons/home/main.gif`,
  },
  cat: {
    "Golden British": `${BASE}icons/home/golden_british_cat.gif`,
    "Bombay": `${BASE}icons/home/Bombay_cat.gif`,
    "Ragdoll": `${BASE}icons/home/ragdoll_cat.gif`,
    "Siamese": `${BASE}icons/home/Siamese_cat.gif`,
    default: `${BASE}icons/home/main.gif`,
  },
};

export default function Rank() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [breedMap, setBreedMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const [rankRes, breedsRes] = await Promise.all([
          fetch(`${API_BASE}/rank/top`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }),
          fetch(`${API_BASE}/breeds`)
        ]);

        if (!rankRes.ok) throw new Error(`HTTP ${rankRes.status} (/rank/top)`);
        if (!breedsRes.ok) throw new Error(`HTTP ${breedsRes.status} (/breeds)`);

        const [rankData, breeds] = await Promise.all([rankRes.json(), breedsRes.json()]);

        const map = {};
        (Array.isArray(breeds) ? breeds : []).forEach(b => {
          if (b && b._id) map[String(b._id)] = { name: b.name, group: b.group };
        });
        setBreedMap(map);

        setRows(Array.isArray(rankData) ? rankData : []);
      } catch (e) {
        setErr(e.message || "load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function getBreedName(breed) {
    if (!breed) return "";
    if (typeof breed === "string") {
      return breedMap[breed]?.name || breed;
    }
    if (typeof breed === "object") return breed.name || "";
    return "";
  }

  function resolveGroup(u) {
    if (u?.group === "dog" || u?.group === "cat") return u.group;
    if (typeof u?.breed === "string") return breedMap[u.breed]?.group || null;
    if (typeof u?.breed === "object") return u.breed.group || null;
    return null;
  }

  function getBreedImageSrc(group, breedName) {
    const g = group === "dog" ? "dog" : group === "cat" ? "cat" : null;
    if (!g) return `${BASE}icons/home/main.gif`;
    const table = breedImages[g] || {};
    return table[breedName] || table.default || `${BASE}icons/home/main.gif`;
  }

  return (
    <div className="page">
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img src={`${BASE}icons/home/home.png`} className="icon" alt="Home" />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1 className="title">Leaderboard</h1>

      {!loading && !err && rows.length > 0 && (
        <ul className="rank-list">
          {rows.map((u, i) => {
            const breedName = getBreedName(u.breed);
            const group = resolveGroup(u);
            const imgSrc = getBreedImageSrc(group, breedName);

            return (
              <li key={u._id || i} className="rank-item">
                <img src={imgSrc} alt={breedName || group || "pet"} className="rank-avatar" />
                <span className="rank-text">{i + 1}. {u.username} - {u.score}</span>
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}