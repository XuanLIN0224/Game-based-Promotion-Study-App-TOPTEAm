import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const LABELS = {
  extra_attempt: { title: "Extra Quiz Attempt", hint: "Use to get +1 attempt" },
  lecture_qr: { title: "Lecture QR Code", hint: "Show QR during lecture" },
  lollies_voucher: { title: "Lollies Voucher", hint: "Claim in workshop" },
  // if you later store pet_food in inventory instead of a counter:
  pet_food: { title: "Pet Food", hint: "Feed your pet" },
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
          <img src={`${import.meta.env.BASE_URL}icons/home.png`} className="icon" alt="Home" />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1 className="title">Backpack</h1>

      <div className="content">
        {err && <div className="auth-error" style={{maxWidth: 520}}>{err}</div>}

        <div style={{marginBottom: 12}}>
          <strong>Pet Food:</strong> {totalPetFood}
        </div>

        {inventory.length === 0 ? (
          <div>No items yet. Visit the <span className="linklike" onClick={()=>navigate('/shop')}>Shop</span> to get some.</div>
        ) : (
          <ul style={{listStyle: 'none', padding: 0, maxWidth: 640, display: 'grid', gap: 10}}>
            {inventory.map((it) => {
              const meta = LABELS[it.key] || { title: it.key, hint: "" };
              const canUse = it.key === 'extra_attempt' || it.key === 'lecture_qr' || it.key === 'lollies_voucher' || it.key === 'pet_food';
              return (
                <li key={it.key} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', border:'1px solid rgba(255,255,255,0.2)', borderRadius:12, background:'rgba(255,255,255,0.06)'}}>
                  <div>
                    <div style={{fontWeight:700}}>{meta.title}</div>
                    <div style={{opacity:0.8, fontSize:13}}>{meta.hint}</div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <div>Qty: <b>{it.qty}</b></div>
                    {canUse && it.qty > 0 && (
                      <button
                        className="btn primary"
                        onClick={()=>useItem(it.key, 1)}
                        disabled={busyKey === it.key}
                        style={{height:34}}
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