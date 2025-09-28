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

export default function Shop () {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [qtyMap, setQtyMap] = useState({});
  const [busyKey, setBusyKey] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [list, me] = await Promise.all([
          api('/shop/catalog'),
          api('/auth/me')
        ]);
        setCatalog(list || []);
        setBalance(me?.score || 0);
        // default qty per item
        const q = {};
        (list || []).forEach(i => q[i.key] = LABELS[i.key]?.step || 1);
        setQtyMap(q);
      } catch (e) {
        setErr(e.message || "Failed to load catalog");
      }
    })();
  }, []);

  function setQty(key, val) {
    setQtyMap(s => ({ ...s, [key]: Math.max(1, Math.min(99, Number(val) || 1)) }));
  }

  async function buy(key) {
    setErr(""); setOk("");
    const qty = qtyMap[key] ?? 1;
    setBusyKey(key);
    try {
      const resp = await api('/shop/purchase', { method: 'POST', body: { itemKey: key, qty }});
      setOk(`Purchased ${LABELS[key]?.title || key} x${qty}. Remaining this week: ${resp.remaining}`);
      setBalance(resp?.user?.score ?? resp?.score ?? balance); // backend returns updated score
      // refresh catalog to update "remaining"
      const list = await api('/shop/catalog');
      setCatalog(list || []);
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

      <h1 className="title">Shop</h1>

      <div className="content">
        {err && <div className="auth-error">{err}</div>}
        {ok && <div className="auth-ok">{ok}</div>}

        <div className={s.balanceInfo}>
          <strong>Balance (Score):</strong> {balance}
        </div>

        {catalog.length === 0 ? (
          <div>Loading catalog…</div>
        ) : (
          <ul className={s.catalogList}>
            {catalog.map(item => {
              const meta = LABELS[item.key] || { title: item.key, desc: '' };
              const remaining = item.remaining ?? item.weeklyLimit;
              const qty = qtyMap[item.key] ?? 1;
              const total = (item.price || 0) * qty;
              const insufficient = total > balance || remaining <= 0;

              return (
                <li key={item.key} >
                  {/* Item Descrption */}
                  <div>
                    <div className={s.itemTitle}>{meta.title}</div>
                    <div className={s.itemDesc}>{meta.desc}</div>
                    <div className={s.itemInfo}>
                      Price: <b>{item.price}</b> · Weekly limit: {item.weeklyLimit} · Used: {item.used} · Remaining: <b>{remaining}</b>
                    </div>
                  </div>

                  {/* User Input Area */}
                  <div className={s.textbar}>
                    {/* Number Input By User */}
                    <div className={s.qtyBox}>
                      <input
                        className={s.qtyInput}
                        type="number"
                        min={1}
                        max={remaining || 99}
                        value={qty}
                        onChange={(e)=>setQty(item.key, e.target.value)}
                      />
                    </div>

                    {/* Extra Info */}
                    <div className={`${s.itemTotal} ${insufficient ? s.insufficient : s.sufficient}`}>
                      Total: <b>{total}</b>
                      {insufficient && <div className={s.itemUnable}>Unable to buy</div>}
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <button
                    className={`btn secondary ${s.btnRow}`}
                    onClick={()=>buy(item.key)}
                    disabled={busyKey === item.key || insufficient}
                    // style={{height:36}}
                  >
                    {busyKey === item.key ? 'Purchasing…' : 'Buy'}
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