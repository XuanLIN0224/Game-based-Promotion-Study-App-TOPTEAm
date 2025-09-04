import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Rank() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5001/api/rank/top", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message || "load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="page">
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img src="/icons/home.png" className="icon" alt="Home" />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1 className="title">Leaderboard</h1>

      {loading && <p>Loading…</p>}
      {err && <p style={{ color: "red" }}>{err}</p>}
      {!loading && !err && rows.length === 0 && <p>暂无排行榜数据</p>}

      {!loading && !err && rows.length > 0 && (
        <ul style={{ listStyleType: "none", paddingLeft: 0, fontSize: "50px", fontFamily: "'SuperShiny', sans-serif", }}>
            {rows.map((u, i) => (
            <li key={u._id || i}>
                {i + 1}. {u.username} - {u.score}
            </li>
            ))}
        </ul>
      )}
    </div>
  );
}