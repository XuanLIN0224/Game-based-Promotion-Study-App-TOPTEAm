import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Rank() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);

    useEffect(() => {
    (async () => {
        try {
        const res = await fetch("/api/rank/top");
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
        } catch (e) {
        console.error(e);
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

            <ul>
                {rows.map((u, i) => (
                <li key={u._id}>{i + 1}. {u.username} - {u.score}</li>
                ))}
            </ul>
        </div>
    );
}