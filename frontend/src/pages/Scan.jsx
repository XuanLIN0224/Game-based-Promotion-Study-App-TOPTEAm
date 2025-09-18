import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";

export default function Scan() {
  const navigate = useNavigate();
  const BASE = import.meta.env.BASE_URL || "/";
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [qrResult, setQrResult] = useState("");
  const [score, setScore] = useState(0);
  const [group, setGroup] = useState("");

  // fetch current user 
  useEffect(() => {
    fetch("http://localhost:5001/api/auth/me", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setScore(data?.score || 0);
        setGroup(data?.group || "default");
      })
      .catch((err) => console.error("Failed to fetch /auth/me:", err));
  }, []);

  // Group icons 
  const groupIcons = {
    default: { coin: `${BASE}icons/default/moneybag_icon.png` },
    dog: { coin: `${BASE}icons/dog/coin.png` },
    cat: { coin: `${BASE}icons/cat/coin.png` },
  };
  const icons = groupIcons[group] ?? groupIcons.default;

  // Handle QR code scan result
  const handleScanResult = (code) => {
    if (code && code !== qrResult) {
      setQrResult(code);
      console.log("QR Code:", code);

      fetch("http://localhost:5001/api/user/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          setScore(data.score); // update score
          alert(`✅ Scanned! Your new score: ${data.score}`);
        })
        .catch((err) => console.error("Scan error:", err));
    }
  };

  // QR scanning effect (camera)
  useEffect(() => {
    let stream;
    let animationId;
    let isActive = true;

    const constraints = { video: { facingMode: "environment" } };

    navigator.mediaDevices.getUserMedia(constraints).then((s) => {
      stream = s;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true);
        videoRef.current.play();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const scan = () => {
          if (!isActive) return; // stop loop if unmounted
          if (videoRef.current?.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            canvas.height = videoRef.current.videoHeight;
            canvas.width = videoRef.current.videoWidth;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) handleScanResult(code.data);
          }
          animationId = requestAnimationFrame(scan);
        };

        scan();
      }
    });

    return () => {
      isActive = false;
      if (animationId) cancelAnimationFrame(animationId);
      // stop using camera when leaving the page immeiatly
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // close camera

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleScanResult(code.data);
        } else {
          alert("❌ No QR code found in this image");
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page">
      {/* Left nav */}
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

      {/* Score Pad */}
      <div className="scorePad">
        <div
          className="pagelinkicon"
          style={{ display: "flex", flexDirection: "row", gap: "10px" }}
        >
          <img src={icons.coin} className="icon" alt="Score" />
          <p className="iconcaption">{score}</p>
        </div>
      </div>

      <h1 className="title">Scan</h1>

      {/* Scanner */}
      <div
        className="content"
        style={{
          textAlign: "center",
          position: "relative",
          display: "inline-block",
          marginTop: "20px",
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: "350px",
            height: "350px",
            objectFit: "cover",
            border: "2px solid rgba(83, 248, 83, 1)",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Green scanning bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "4px",
            background: "limegreen",
            animation: "scan 2s linear infinite",
          }}
        />

        {qrResult ? (
          <p style={{ marginTop: "20px" }}>
            QR Code: <b>{qrResult}</b>
          </p>
        ) : (
          <p style={{ marginTop: "20px" }}>📷 Scan your QR code here</p>
        )}
      </div>

      {/* Upload button */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <label
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: "rgba(241, 218, 102, 1)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Upload QR from device
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </label>
      </div>
    </div>
  );
}
