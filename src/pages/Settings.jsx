import { useNavigate } from "react-router-dom";

export default function Settings(){

    const navigate = useNavigate();
    
    return (
        <section className="page">

            <div className="leftside">

                <div className="pagelinkicon" onClick={() => navigate("/")}>
                    <img
                    src={`icons/home.png`}
                    className="icon"
                    alt="Home"
                    />
                    <p className="iconcaption">Home</p>
                </div>
            </div>


            <h1>Settings</h1>
        </section>
    );
}