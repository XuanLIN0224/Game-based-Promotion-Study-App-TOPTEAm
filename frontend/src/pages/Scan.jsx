import { useNavigate } from "react-router-dom";

export default function Scan() {
  const navigate = useNavigate();
  const BASE = import.meta.env.BASE_URL || "/";

  return (
    <div className="page">
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img
            src={`${BASE}icons/home/home.png`}
            className="icon"
            alt="Home"
            onError={(e) => { e.currentTarget.src = `${BASE}icons/default/home.png`; }}
          />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1 className="title">Scan</h1>
      <div className="content">Hi there is nothing hehe</div>
    </div>
  );
}
