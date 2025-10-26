import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import s from "./Backpack.module.css";

const BASE = import.meta.env.BASE_URL || '/';

const LABELS = {
  extra_attempt: { title: "Extra Quiz Attempt", hint: "Use to get +1 attempt" },
  lecture_qr: { title: "Lecture QR Code", hint: "Show QR during lecture" },
  lollies_voucher: { title: "Lollies Voucher", hint: "Claim in workshop" },
  // if you later store pet_food in inventory instead of a counter:
  pet_food: { title: "Pet Food", hint: "Feed your pet" },
  quiz_booster_today: { title: "Quiz Booster for today", hint: "double quiz score for today." },
};

export default function Backpack () {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [me, setMe] = useState(null);
  const [busyKey, setBusyKey] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    // load inventory + me (for numPetFood, etc.)
    (async () => {
      try {
        const [inv, meResp] = await Promise.all([
          api('/inventory'),
          api('/auth/me')
        ]);
        setInventory(inv || []);
        setMe(meResp || null);
      } catch (e) {
        setErr(e.message || "Failed to load inventory");
      }
    })();
  }, []);

  const totalPetFood = me?.numPetFood ?? 0;

  async function useItem(key, qty = 1) {
    setErr("");
    setBusyKey(key);
    try {
      await api('/inventory/use', { method: 'POST', body: { key, qty }});

    if (key === 'extra_attempt') {
      await api('/quiz/attempts/use-extra', { method: 'POST' });
    }

      const inv = await api('/inventory');
      setInventory(inv || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="page">

      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img src={`${BASE}icons/home/home.png` || `${BASE}icons/default/home.png`} className="icon" alt="Home" />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1 className="title">Backpack</h1>

      <div className="content">
        {err && <div className="auth-error" style={{maxWidth: 520}}>{err}</div>}

        {/* Feed Info */}
        <div className={s.feedInfo}>
          <strong>Pet Food:</strong> {totalPetFood}
        </div>

        {inventory.length === 0 ? (
          <div>No items yet. Visit the <span className="linklike" onClick={()=>navigate('/shop')}>Shop</span> to get some.</div>
        ) : (
          // Backpack Listing
          <ul className={s.backpackList}>
            {inventory.map((it) => {
              const meta = LABELS[it.key] || { title: it.key, hint: "" };
              const canUse = it.key === 'extra_attempt' || it.key === 'lecture_qr' || it.key === 'lollies_voucher' || it.key === 'pet_food' || it.key === 'quiz_booster_today';
              return (
                // Item Info
                <li key={it.key} >
                  <div className={s.itemInfo}>
                    <div className={s.itemTitle}>{meta.title}</div>
                    <div className={s.itemHint}>{meta.hint}</div>
                  </div>

                  {/* Quantity Info and Use Button */}
                  <div className={s.itemAction}>
                    <div className={s.itemQty}>Qty: <b>{it.qty}</b></div>
                    {canUse && it.qty > 0 && (
                      <button
                        className={`btn secondary ${s.btnRow}`}
                        onClick={()=>useItem(it.key, 1)}
                        disabled={busyKey === it.key}
                      >
                        {busyKey === it.key ? 'Using…' : 'Use'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}