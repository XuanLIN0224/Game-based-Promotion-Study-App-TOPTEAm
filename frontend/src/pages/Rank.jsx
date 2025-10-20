import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import styles from "./Rank.module.css";
import { api } from "../api/client";

const BASE = import.meta.env.BASE_URL || '/';
//const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

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

export default function Rank() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [breedMap, setBreedMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [rankData, breeds, users] = await Promise.all([
          api("/rank/top"),
          api("/breeds"),
        ]);

        const map = {};
        (Array.isArray(breeds) ? breeds : []).forEach(b => {
          if (b && b._id) map[String(b._id)] = { name: b.name, group: b.group };
        });
        setBreedMap(map);

        // Store the leaderboard for display
        setRows(Array.isArray(rankData) ? rankData : []);
      } catch (e) {
        setErr(e.message || "load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** Get the clean breed name for display */
  function getBreedName(breed) {
    if (!breed) return "";
    if (typeof breed === "string") {
      return breedMap[breed]?.name || breed;
    }
    if (typeof breed === "object") return breed.name || "";
    return "";
  }

  /** Figure out the character belongs to the cat or dog group */
  function resolveGroup(u) {
    if (u?.group === "dog" || u?.group === "cat") return u.group;
    if (typeof u?.breed === "string") return breedMap[u.breed]?.group || null;
    if (typeof u?.breed === "object") return u.breed.group || null;
    return null;
  }

  /** Choose the right image and the user's corresponding accessory for rendering */
  function getBreedImageSrc(group, breedName, accessoryKey) {
    const g = group === "dog" ? "dog" : group === "cat" ? "cat" : null;
    if (!g) return `${BASE}icons/home/main.gif`;

    // accessory override (per user)
    if (accessoryKey && breedImagesWithAccessories?.[accessoryKey]) {
      const accMap = breedImagesWithAccessories[accessoryKey];
      const src = accMap[breedName] || accMap.default || `${BASE}icons/home/main.gif`;
      console.log("Using accessory image:", { accessoryKey, breedName, src });
      return src;
    }

    // base breed
    const baseMap = breedImages[g] || {};
    const src = baseMap[breedName] || baseMap.default || `${BASE}icons/home/main.gif`;
    console.log("Using base breed image:", { group: g, breedName, src });
    return src;
  }


  return (
    <div className={styles.page}>
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img src={`${BASE}icons/home/home.png`} className="icon" alt="Home" />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1 className={styles.title}>Leaderboard</h1>

      {!loading && !err && rows.length > 0 && (
        <ul className={styles.rankList}>
          {rows.map((u, i) => {
            const breedName = getBreedName(u.breed);
            const group = resolveGroup(u);
            const imgSrc = getBreedImageSrc(group, breedName, u.equippedKey);

            return (
              <li key={u._id || i} className={styles.rankItem}>
                <img src={imgSrc} alt={breedName || group || "pet"} className={styles.rankAvatar} />
                <span className="rank-text">{i + 1}. {u.username} - {u.score}</span>
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}