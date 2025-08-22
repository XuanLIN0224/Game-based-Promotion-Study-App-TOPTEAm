import React from "react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";

function Home() {
  const [score, setScore] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api('/auth/me')
      .then(data => setScore(data?.score || 0))
      .catch(err => console.error('Failed to fetch score:', err));
  }, []);

  return (
    <div>
      {/* other JSX */}
      <div className="pagelinkicon">
        <img
          src="/icons/moneybag_icon.png"
          className="icon"
          alt="Money"
        />
        <p className="iconcaption">{score}</p>
      </div>
      {/* other JSX */}
    </div>
  );
}

export default Home;