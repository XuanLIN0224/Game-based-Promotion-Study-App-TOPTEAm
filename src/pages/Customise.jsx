import { useNavigate } from "react-router-dom";

export default function Customise () {

    const navigate = useNavigate();

    return (
        <div className="page">

            <div className="leftside">

                <div className="pagelinkicon" onClick={() => navigate("/")}>
                    <img
                    src="icons/home.png"
                    className="icon"
                    alt="Home"
                    />
                    <p className="iconcaption">Home</p>
                </div>
            </div>


            <h1 className="title">Customise</h1>
            <div className="content">Hi there is nothing</div>
        </div>
    );
}