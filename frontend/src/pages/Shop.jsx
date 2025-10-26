import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import s from "./Shop.module.css";

const BASE = import.meta.env.BASE_URL || '/';

export const LABELS = {
  extra_attempt: { title: "Extra Quiz Attempt", desc: "Grants +1 quiz attempt", step: 1 },
  quiz_booster_today: { title: "Quiz Booster (Today)", desc: "Double quiz score until midnight", step: 1 },
  lecture_qr: { title: "Lecture QR Code", desc: "Get a QR to show during lecture", step: 1 },
  pet_food: { title: "Pet Food", desc: "Adds pet food to your account", step: 5 },
  lollies_voucher: { title: "Lollies Voucher", desc: "Redeem during workshop", step: 1 },
};

const shopImages = {
  extra_attempt: `${BASE}icons/shop/extra_quiz_attempt.png`,
  quiz_booster_today: `${BASE}icons/shop/quiz_booster.png`,
  lecture_qr: `${BASE}icons/shop/lecture_QR_Code.png`,
  lollies_voucher: `${BASE}icons/shop/lollie_voucher.png`,
  pet_food: `${BASE}icons/default/feed.png`,
};

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

export default function Shop() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [qtyMap, setQtyMap] = useState({});
  const [busyKey, setBusyKey] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [balance, setBalance] = useState(0);
  const [group, setGroup] = useState("");
  const [numPetfood, setPetfood] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [list, me] = await Promise.all([
          api("/shop/catalog"),
          api("/auth/me"),
        ]);
        setCatalog(list || []);
        setBalance(me?.score || 0);
        setGroup(me?.group || "");
        setPetfood(me?.numPetFood || 0);
        // Default quantity
        const q = {};
        (list || []).forEach((i) => (q[i.key] = LABELS[i.key]?.step || 1));
        setQtyMap(q);
      } catch (e) {
        setErr(e.message || "Failed to load catalog");
      }
    })();
  }, []);

  function setQty(key, val) {
    setQtyMap((s) => ({
      ...s,
      [key]: Math.max(1, Math.min(99, Number(val) || 1)),
    }));
  }

  async function buy(key) {
    setErr("");
    setOk("");
    const qty = qtyMap[key] ?? 1;
    setBusyKey(key);
    try {
      const resp = await api("/shop/purchase", {
        method: "POST",
        body: { itemKey: key, qty },
      });
      setOk(
        `Purchased ${LABELS[key]?.title || key} x${qty}. Remaining this week: ${
          resp.remaining
        }`
      );
      setBalance(resp?.user?.score ?? resp?.score ?? balance);
      const list = await api("/shop/catalog");
      setCatalog(list || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyKey("");
    }
  }

  const icons = groupIcons[group] ?? groupIcons.default;

  return (
    <div className="page">
      {/* Left Sidebar */}
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
            <p className="iconcaption">{balance}</p>
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

      {/* Page Title */}
      <h1 className="title">Shop</h1>

      <div className="content">
        {err && <div className="auth-error">{err}</div>}
        {ok && <div className="auth-ok">{ok}</div>}

        {catalog.length === 0 ? (
          <div>Loading catalog…</div>
        ) : (
          <ul className={s.catalogList}>
            {catalog.map((item) => {
              const meta = LABELS[item.key] || { title: item.key, desc: "" };
              const remaining = item.remaining ?? item.weeklyLimit;
              const qty = qtyMap[item.key] ?? 1;
              const total = (item.price || 0) * qty;
              const insufficient = total > balance || remaining <= 0;

              return (
                <li key={item.key}>
                  {/* Item Image */}

                  {/* Item Description */}
                  <div>
                    <div className={s.itemTitle}>{meta.title}</div>
                    <div className={s.itemDesc}>{meta.desc}</div>
                    <div className={s.itemInfo}>
                      Price: <b>{item.price}</b> · Weekly limit: {item.weeklyLimit} · Used:{" "}
                      {item.used} · Remaining: <b>{remaining}</b>
                    </div>
                  </div>

                  {/* Quantity + Total */}
                  <div className={s.textbar}>
                    <div className={s.qtyBox}>
                      <input
                        className={s.qtyInput}
                        type="number"
                        min={1}
                        max={remaining || 99}
                        value={qty}
                        onChange={(e) => setQty(item.key, e.target.value)}
                      />
                    </div>
                    <div
                      className={`${s.itemTotal} ${
                        insufficient ? s.insufficient : s.sufficient
                      }`}
                    >
                      Total: <b>{total}</b>
                      {insufficient && (
                        <div className={s.itemUnable}>Unable to buy</div>
                      )}
                    </div>
                  </div>

                  {/* Buy Button */}
                  <button
                    className={`btn secondary ${s.btnRow}`}
                    onClick={() => buy(item.key)}
                    disabled={busyKey === item.key || insufficient}
                  >
                    {busyKey === item.key ? "Purchasing…" : "Buy"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
