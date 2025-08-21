// import useStore from '../state/store';
// import PetDisplay from '../components/PetDisplay';
// import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
//   const { coins, bones, fish, resetDailyIfNewDay } = useStore();
//   resetDailyIfNewDay(); // simple client check on load
  const navigate = useNavigate();

  return (
    
    <main className="page">
        
        <div className="leftside">

            <div className="pagelinkicon">
                <img
                src="/icons/backpack_icon.png"
                className="icon"
                alt="Backpack"
                onClick={() => navigate("/backpack")}
                />
                <p className="iconcaption">Backpack</p>
            </div>


            <img
                src="/icons/moneybag_icon.png"
                className="icon"
                alt="Money"
            />
        </div>

        <div className="rightside">
            {/* Scan */}
            <div className="pagelinkicon">
                <img
                    src="/icons/scan_icon.png"
                    className="icon"
                    alt="Scan"
                    style={{ filter: "invert(1)" }}
                    onClick={() => navigate("/scan")}
                />
                <p className="iconcaption">Scan</p>
            </div>

            {/* Rank */}
            <div className="pagelinkicon">
                <img
                    src="/icons/rank.png"
                    className="icon"
                    alt="Rank"
                    onClick={() => navigate("/rank")}
                />
                <p className="iconcaption">Rank</p>
            </div>

            {/* Settings */}
            <div className="pagelinkicon">
                <img
                    src="/icons/setting_icon.png"
                    className="icon"
                    alt="Settings"
                    onClick={() => navigate("/settings")}
                />
                <p className="iconcaption">Settings</p>
            </div>
        </div>


        <section 
            className="content" 
            style={{textAlign: "center"}} 
            onClick={() => navigate("/game")}>

            <h1 className="title1" >
                PowerUp
            </h1>
             <h1 className="title2">
                O O S D
            </h1>

            <img className="pic" 
            src="/icons/main_logo.png"/>

            
           <p className="line">Click or tap anywhere to play...</p>

        </section>

        <div className="downpad">
            <button onClick={() => navigate("/quiz")}>
                <img
                    src="/icons/question_icon.png"
                    className="icon"
                    alt="Quiz"
                    // style={{ cursor: "pointer", width: "80px", margin: "10px" }}
                />
                <div className="buttoncaption">Quiz</div>
            </button>

            <button onClick={() => navigate("/shop")}>
                <img
                    src="/icons/shop_icon.png"
                    className="icon"
                    alt="Shop"
                    // style={{ cursor: "pointer", width: "50px", margin: "10px" }}
                    onClick={() => navigate("/shop")}
                />
                <div className="buttoncaption">Shop</div>
            </button>

            <button onClick={() => navigate("/customise")}>
                <img
                    src="/icons/customise.png"
                    className="icon"
                    alt="Customise"
                    // style={{ cursor: "pointer", width: "80px", margin: "10px" }}
                />
                <div className="buttoncaption">Customise</div>
            </button>   

        </div>

    </main>
  );
}

export default Home
