import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

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
          <img src="icons/home.png" className="icon" alt="Home" />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1 className="title">Shop</h1>

      <div className="content" style={{maxWidth: 820}}>
        {err && <div className="auth-error">{err}</div>}
        {ok && <div className="auth-ok">{ok}</div>}

        <div style={{margin:'6px 0 14px 0', opacity:0.9}}>
          <strong>Balance (Score):</strong> {balance}
        </div>

        {catalog.length === 0 ? (
          <div>Loading catalog…</div>
        ) : (
          <ul style={{listStyle:'none', padding:0, display:'grid', gap:12}}>
            {catalog.map(item => {
              const meta = LABELS[item.key] || { title: item.key, desc: '' };
              const remaining = item.remaining ?? item.weeklyLimit;
              const qty = qtyMap[item.key] ?? 1;
              const total = (item.price || 0) * qty;
              const insufficient = total > balance || remaining <= 0;

              return (
                <li key={item.key} style={{display:'grid', gridTemplateColumns:'1fr auto auto auto', alignItems:'center', gap:12, padding:'12px 14px', border:'1px solid rgba(255,255,255,0.2)', borderRadius:12, background:'rgba(255,255,255,0.06)'}}>
                  <div>
                    <div style={{fontWeight:700}}>{meta.title}</div>
                    <div style={{opacity:0.85, fontSize:13}}>{meta.desc}</div>
                    <div style={{opacity:0.75, fontSize:12, marginTop:4}}>
                      Price: <b>{item.price}</b> · Weekly limit: {item.weeklyLimit} · Used: {item.used} · Remaining: <b>{remaining}</b>
                    </div>
                  </div>

                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <input
                      type="number"
                      min={1}
                      max={remaining || 99}
                      value={qty}
                      onChange={(e)=>setQty(item.key, e.target.value)}
                      style={{width:70, height:34, borderRadius:8, padding:'0 8px'}}
                    />
                  </div>

                  <div style={{minWidth:120, textAlign:'right', opacity: insufficient ? 0.85 : 1}}>
                    Total: <b>{total}</b>
                    {insufficient && <div style={{fontSize:12, color:'#ffb3b3'}}>Unable to buy</div>}
                  </div>

                  <button
                    className="btn primary"
                    onClick={()=>buy(item.key)}
                    disabled={busyKey === item.key || insufficient}
                    style={{height:36}}
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