/*
  There are three main functions in the Scan page:
   1. Scan a QR code through the camera
   2. Upload a QR file
   3. Update user's score (award attendance during lectures)
*/

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
// A JS library that decodes QR codes from raw pixel data
import jsQR from "jsqr";
import s from "./Scan.module.css";

export default function Scan() {
  const navigate = useNavigate();
  const BASE = import.meta.env.BASE_URL || "/";
  const videoRef = useRef(null);    // Points to the <video> element showing the camera
  const canvasRef = useRef(null);   // A hidden <canvas> used to grab frames from the video and feed pixel data to jsQR
  const streamRef = useRef(null);   // hold MediaStream so we can stop it on success
  const animRef = useRef(0);        // hold requestAnimationFrame id
  const hasScannedRef = useRef(false); // lock to prevent repeated submissions
  const [scanMsg, setScanMsg] = useState(""); // non-intrusive status message

  const [qrResult, setQrResult] = useState(""); // the QR that is decoded successfully
  const [score, setScore] = useState(0);
  const [group, setGroup] = useState("");   // For picking the correct coin icon

  // Fetch current user
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

  /** Handle successful QR code scan result */
  const handleScanResult = async (code) => {
    if (!code) return;
    if (hasScannedRef.current) return; // prevent duplicate submits
    hasScannedRef.current = true;
    setQrResult(code);
    setScanMsg("Submitting...");
    try {
      const res = await fetch("http://localhost:5001/api/user/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanMsg(data?.message || "Scan failed");
        hasScannedRef.current = false; // allow re-try on failure
      } else {
        setScore(data.score);
        setScanMsg(`✅ Scan successful! New score: ${data.score}`);
        // setScanMsg("✅ Scan successful");
        // stop scanning loop and camera
        if (animRef.current) cancelAnimationFrame(animRef.current);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      }
    } catch (err) {
      console.error("Scan error:", err);
      setScanMsg("Scan error");
      hasScannedRef.current = false;
    }
  };

  /** Function 1: Scan the QR code */
  // QR scanning effect (camera)--live scanning loop
  useEffect(() => {
    let isMounted = true;

    const constraints = { video: { facingMode: "environment" } };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((s) => {
        if (!isMounted) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.setAttribute("playsinline", true);
          videoRef.current.play();

          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");

          const scan = () => {
            if (!isMounted) return;
            if (hasScannedRef.current) return; // stop loop once scanned
            if (videoRef.current?.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              canvas.height = videoRef.current.videoHeight;
              canvas.width = videoRef.current.videoWidth;
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              if (code?.data) {
                handleScanResult(code.data);
                // do not schedule next frame; handleScanResult will stop stream
                return;
              } else {
                // do not alert; just update a gentle status text occasionally
                setScanMsg((prev) => prev || "Looking for QR...");
              }
            }
            animRef.current = requestAnimationFrame(scan);
          };

          scan();
        }
      })
      .catch((err) => {
        console.error("getUserMedia error:", err);
        setScanMsg("Camera permission denied");
      });

    return () => {
      isMounted = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      hasScannedRef.current = false;
    };
  }, []);

  /** Function 2: Upload the QR code file */
  // Handle file upload
  const handleFileUpload = (e) => {
    // Triggered when the user selects a file
    const file = e.target.files[0];
    if (!file) return;

    // Read the file
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Draw the read (and loaded) file on the canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Look for the QR pattern in the library
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          if (!hasScannedRef.current) {
            handleScanResult(code.data);
          }
        } else {
          setScanMsg("❌ No QR found in this image");
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`page ${s.page}`}>
      {/* Left nav */}
      {/* Left side nav */}
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img src={`${BASE}icons/home/home.png` || `${BASE}icons/default/home.png`} className="icon" alt="Home" />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      {/* Score pad */}
      <div className={s.scorePad}>
        <div className={s.score}>
          <img src={icons.coin} alt="Score" />
          <p>{score}</p>
        </div>
      </div>

      <h1 className={s.title}>Scan</h1>

      {/* Scanner */}
      <div className={s.content}>
        <video ref={videoRef} className={s.video} />
        <canvas ref={canvasRef} className={s.canvas} />
        <div className={s.scanBar} />

        <p className={s.qrText}>
          {qrResult ? <>QR Code: <b>{qrResult}</b></> : "📷 Scan your QR code here"}
          {scanMsg ? <><br />{scanMsg}</> : null}
        </p>
      </div>

      {/* Upload button */}
      <div className={s.uploadWrapper}>
        <label className={s.uploadLabel}>
          Upload QR from device
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className={s.uploadInput}
          />
        </label>
      </div>
    </div>
  );
}
