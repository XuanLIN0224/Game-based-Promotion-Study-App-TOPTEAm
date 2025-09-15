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
        videoRef.current.setAttribute("playsinline", true); // iOS fix
        videoRef.current.play();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const scan = () => {
          if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            // Force square capture
            const size = 400; // 👈 square size
            canvas.width = size;
            canvas.height = size;

            // Draw center square region of video
            const minDim = Math.min(videoRef.current.videoWidth, videoRef.current.videoHeight);
            const sx = (videoRef.current.videoWidth - minDim) / 2;
            const sy = (videoRef.current.videoHeight - minDim) / 2;

            ctx.drawImage(
              videoRef.current,
              sx, sy, minDim, minDim, // source rect (center square of video)
              0, 0, size, size        // destination rect (scaled square)
            );

            const imageData = ctx.getImageData(0, 0, size, size);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
              setQrResult(code.data);
              console.log("QR Code:", code.data);
            }
          }
          requestAnimationFrame(scan);
        };

        scan();
      }
    });

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

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

      <div className="content" style={{ textAlign: "center" }}>
        <video
          ref={videoRef}
          style={{
            width: "350px",
            height: "350px",
            objectFit: "cover",   // force square cropping
            border: "2px solid #4CAF50",
            borderRadius: "8px"
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {qrResult ? (
          <p style={{ marginTop: "20px" }}>
            QR Code: <b>{qrResult}</b>
          </p>
        ) : (
          <p style={{ marginTop: "20px" }}>📷 Please scan your QR code here </p>
        )}
      </div>
    </div>
  );
}
