import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import s from "./Customise.module.css"; // accessory styling
import "./Home.css"; // shared structure & title styling
import "../components/Button.css";

const BASE = import.meta.env.BASE_URL || "/";

function Customise() {
  const [group, setGroup] = useState("");
  const [breed, setBreed] = useState("");
  const [username, setUsername] = useState("");
  const [score, setScore] = useState(0);
  const [numPetfood, setPetfood] = useState(0);
  const [accessories, setAccessories] = useState([]);

  const navigate = useNavigate();

  // Fetch user & accessories
  useEffect(() => {
    api("/auth/me")
      .then((data) => {
        setGroup(data?.group || "");
        setBreed(data?.breed?.name || "");
        setUsername(data?.username || "");
        setScore(data?.score || 0);
        setPetfood(data?.numPetFood || 0);
      })
      .catch((err) => console.error("Failed to fetch /auth/me:", err));

    api("/accessories/items")
      .then(setAccessories)
      .catch((err) => console.error("Failed to fetch /accessories/items:", err));
  }, []);

  // Handle purchase
  const handlePurchase = async (itemName) => {
    try {
      const res = await api("/accessories/purchase/still", {
        method: "POST",
        body: { itemName },
      });

      if (res.message === "Purchase Successful!") {
        setScore(res.score);
        setAccessories((prev) =>
          prev.map((acc) =>
            acc.key === itemName ? { ...acc, owned: true, equipped: false } : acc
          )
        );
      } else {
        alert(res.message || "Purchase failed");
      }
    } catch (err) {
      console.error("Purchase error:", err);
      alert("Error purchasing item");
    }
  };

  // Handle wear/remove
  const handleEquip = async (itemName, equip) => {
    try {
      const res = await api("/accessories/equip", {
        method: "PATCH",
        body: { itemName, equip },
      });

      // Only one equipped at a time
      setAccessories((prev) =>
        prev.map((acc) =>
          acc.key === itemName
            ? { ...acc, equipped: !!equip }
            : { ...acc, equipped: false }
        )
      );
    } catch (err) {
      console.error("Equip error:", err);
      alert("Error equipping item");
    }
  };

  // Pet breed images
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
  // Accessory overlay GIFs per breed
  const accessoryPetImages = {
    cat_ear: {
      Bombay: `${BASE}accessory/cat_ear/catEar_Bombay.gif`,
      "Border Collie": `${BASE}accessory/cat_ear/catEar_BorderCollie.gif`,
      Dachshund: `${BASE}accessory/cat_ear/catEar_Dachshund.gif`,
      "Toy Poodle": `${BASE}accessory/cat_ear/catEar_Poodle.gif`,
      "Golden British": `${BASE}accessory/cat_ear/catEar_golden_british.gif`,
      Ragdoll: `${BASE}accessory/cat_ear/catEar_ragdoll.gif`,
      Samoyed: `${BASE}accessory/cat_ear/catEar_Samoyed.gif`,
      Siamese: `${BASE}accessory/cat_ear/catEar_Siamese.gif`,
    },
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

  // Group-specific icons
  const groupIcons = {
    default: {
      coin: `${BASE}icons/default/moneybag_icon.png`,
      feed: `${BASE}icons/default/feed.png`,
      home: `${BASE}icons/home/home.png`,
    },
    dog: {
      coin: `${BASE}icons/dog/coin.png`,
      feed: `${BASE}icons/dog/bone.png`,
      home: `${BASE}icons/home/home.png`,
    },
    cat: {
      coin: `${BASE}icons/cat/coin.png`,
      feed: `${BASE}icons/cat/fish.png`,
      home: `${BASE}icons/home/home.png`,
    },
  };

  const icons = groupIcons[group] ?? groupIcons.default;

  // Find which accessory is currently equipped
  const equipped = accessories.find((a) => a.equipped);

  // Determine which pet image to show
  let petImg;

  if (equipped && accessoryPetImages[equipped.key]) {
    petImg =
      accessoryPetImages[equipped.key][breed] ||
      `${BASE}icons/home/main.gif`;
  } else {
    petImg =
      (breedImages[group] && breedImages[group][breed]) ||
      (breedImages[group] && breedImages[group].default) ||
      `${BASE}icons/home/main.gif`;
  }

  const accessoryImages = {
    bear_ear: `${BASE}accessory/bear/bear_ear.gif`,
    cat_ear: `${BASE}accessory/cat_ear/cat_ear.GIF`,
    crown: `${BASE}accessory/crown/crown.GIF`
  };

  return (
    <div className="page">
      {/* Left nav and stats */}
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img
            src={icons.home}
            className="icon"
            alt="Home"
            onError={(e) => {
              e.currentTarget.src = `${BASE}icons/default/home.png`;
            }}
          />
          <p className="iconcaption">Home</p>
        </div>

        <div className="scorePad">
          <div
            className="pagelinkicon"
            style={{ display: "flex", flexDirection: "row", gap: "10px" }}
          >
            <img src={icons.coin} className="icon" alt="Money" />
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

      {/* Title */}
      <h1 className={s.title}>Customise</h1>

      {/* Pet image */}
      <div className={s.petPreview}>
        <img src={petImg} alt={breed || group || "default"} className={s.petImg} />
      </div>

      {/* Accessories grid */}
      <section className={s.accessoryGrid}>
        {accessories.map((item) => (
          <div key={item.key} className={s.accessoryCard}>
            <img
              src={accessoryImages[item.key] || `${BASE}icons/default/missing.png`}
              alt={item.title}
              className={s.accessoryImg}
            />
            <h4>{item.title}</h4>
            <p>
              <img
                src={icons.coin}
                alt="Price"
                style={{ width: "16px", verticalAlign: "middle" }}
              />{" "}
              {item.price}
            </p>

            {/* Purchase */}
            {item.owned ? (
              <button disabled className={s.disabledBtn}>
                Purchased
              </button>
            ) : (
              <button className={s.purchaseBtn} onClick={() => handlePurchase(item.key)}>
                Purchase
              </button>
            )}

            {/* Wear */}
            <button
              disabled={!item.owned}
              onClick={() => handleEquip(item.key, !item.equipped)}
              className={`${s.wearBtn} ${
                !item.owned
                  ? s.wearDisabled
                  : item.equipped
                  ? s.removeActive
                  : s.wearActive
              }`}
            >
              {!item.owned ? "Wear" : item.equipped ? "Remove" : "Wear"}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Customise;
