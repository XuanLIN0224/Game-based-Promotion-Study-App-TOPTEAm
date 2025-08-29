import { useNavigate } from "react-router-dom";

export default function Quiz () {

    const navigate = useNavigate();

    return (
        <div className="page">
            <div className="leftside">

            <div className="pagelinkicon" onClick={() => navigate("/")}>
                <img
                src={`${import.meta.env.BASE_URL}icons/home.png`}
                className="icon"
                alt="Home"
                />
                <p className="iconcaption">Home</p>
            </div>


            <img
                src={`${import.meta.env.BASE_URL}icons/moneybag_icon.png`}
                className="icon"
                alt="Money"
            />
        </div>

            <h1 className="title">Quiz</h1>
            <div className="content">Hi there is nothing</div>
        </div>
    );
}