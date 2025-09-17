import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";

export default function Scan() {
  const navigate = useNavigate();
  const BASE = import.meta.env.BASE_URL || "/";
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [qrResult, setQrResult] = useState("");

  useEffect(() => {
    const constraints = { video: { facingMode: "environment" } };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true);
        videoRef.current.play();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const scan = () => {
          if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            canvas.height = videoRef.current.videoHeight;
            canvas.width = videoRef.current.videoWidth;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code && code.data !== qrResult) {
              setQrResult(code.data);
              console.log("QR Code:", code.data);

              // Call backend to add score
              fetch("http://localhost:5001/api/user/scan", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`, // assuming you store JWT in localStorage
                },
                body: JSON.stringify({ code: code.data }),
              })
                .then((res) => res.json())
                .then((data) => {
                  console.log("Score updated:", data);
                  alert(`✅ Scanned! Your new score: ${data.score}`);
                })
                .catch((err) => console.error("Scan error:", err));
            }
          }
          requestAnimationFrame(scan);
        };

        scan();
      }
    });

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, [qrResult]);

    return (
    <div className="page">
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img
            src={`${BASE}icons/home/home.png`}
            className="icon"
            alt="Home"
            onError={(e) => {
              e.currentTarget.src = `${BASE}icons/default/home.png`;
            }}
          />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1 className="title">Scan</h1>

      {/* Scanner block moved down */}
      <div
        className="content"
        style={{
          textAlign: "center",
          position: "relative",
          display: "inline-block",
          marginTop: "40px", // 👈 moves scanner down
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: "350px",
            height: "350px",
            objectFit: "cover",
            border: "2px solid #0f0",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Green scanning bar (thicker) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            background: "limegreen",
            animation: "scan 2s linear infinite",
          }}
        />

        {qrResult ? (
          < p style={{ marginTop: "20px" }}>
             QR Code: <b>{qrResult}</b>
          </p>
        ) : (
          <p style={{ marginTop: "20px" }}>📷 Scan your QR code here</p>
        )}
      </div>
    </div>
  );

}
