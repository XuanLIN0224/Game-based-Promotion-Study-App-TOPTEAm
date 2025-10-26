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
  const handleScanResult = (code) => {
    // Check whether the given code is valid and not duplicated (since one code could only be effective once for one user)
    // Defensive Check
    if (code && code !== qrResult) {
      setQrResult(code);
      console.log("QR Code:", code);

      // Send the code to the backend
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
          setScore(data.score); // Update score
          alert(`✅ Scanned! Your new score: ${data.score}`);
        })
        .catch((err) => console.error("Scan error:", err));
    }
  };

  /** Method 1: Scan the QR code */
  // QR scanning effect (camera)--live scanning loop
  useEffect(() => {
    let stream; // Store the camera's media stream (what the browser provides when call "getUserMedia")
    let animationId;    // Store the ID returned by "requestAnimationFrame", so we can stop it later
    let isActive = true;    // A flag that ensures we stop scanning when the component unmounts (preventing memory leaks and camera staying on)

    // Requests camera
    // Defin camera constraints--only video not audio
    const constraints = { video: { facingMode: "environment" } };

    // Ask for camera access
    // If granted, the live feed from the camera would be given back, it is a MediaStream object (s)
    navigator.mediaDevices.getUserMedia(constraints).then((s) => {
      stream = s;
      if (videoRef.current) {
        // Attach the camera's video stream to the <video> element via "srcObject"
        videoRef.current.srcObject = stream;
        // Prevent iPhone from automatically going fullscreen when playing a video
        videoRef.current.setAttribute("playsinline", true);
        // Start showing the video feed in the <video> element
        videoRef.current.play();
        // Now, the camera is live and displaying inside our component

        // Prepare the canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // The scanning loop
        const scan = () => {
          // Defensive Check
          if (!isActive) return; // Stop loop if unmounted
          // Check if the video is actually streaming frames, avoiding reading from a video before its ready
          if (videoRef.current?.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            // Synchronize the canvas size with the live video frame size
            canvas.height = videoRef.current.videoHeight;
            canvas.width = videoRef.current.videoWidth;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            // Extract all pixel data from the frame
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // Pass it to the library to look for a QR pattern
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            // If a QR code is recognized, pass and handle it further (adding points for the current user)
            if (code) {
              handleScanResult(code.data);
            } else {
              alert("❌ No QR code found in this image");
            }
          }
          // Call 'scan()' again for the next frame, creating an infinite loop
          animationId = requestAnimationFrame(scan);
        };

        // Start scanning
        scan();
      }
    });

    // Cleanup when leaving the Scan page--Close the camera, and end the live stream
    return () => {
      // Stop the scanning loop
      isActive = false;
      if (animationId) cancelAnimationFrame(animationId);
      // Stop using camera when leaving the page immediately
      if (videoRef.current) {
        videoRef.current.pause();   // Stop <video> element playback
        videoRef.current.srcObject = null;  // Detach the stream from the <video> element
      }
      if (stream) {
        // Turn off the camera hardware and free resources
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /** Method 2: Upload the QR code file */
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

        {qrResult ? (
          <p className={s.qrText}>
            QR Code: <b>{qrResult}</b>
          </p>
        ) : (
          <p className={s.qrText}>📷 Scan your QR code here</p>
        )}
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
