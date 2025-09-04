// import { useEffect, useRef, useState } from 'react';
import { useNavigate } from "react-router-dom";

export default function Scan() {
//   const videoRef = useRef(null);
//   const [err, setErr] = useState('');

//   useEffect(() => {
//     (async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
//         videoRef.current.srcObject = stream;
//         await videoRef.current.play();
//       } catch (e) {
//         setErr('Camera permission denied or not available.');
//       }
//     })();
//     return () => {
//       const s = videoRef.current?.srcObject;
//       s && s.getTracks().forEach(t => t.stop());
//     };
//   }, []);

  return (
    <section className="page">



      <h1>Scan</h1>



      {/* {err && <p>{err}</p>}
      <video ref={videoRef} style={{ width: '100%', maxWidth: 480 }} playsInline muted /> */}
      {/* For QR/barcodes, later integrate a decoder (e.g., a ZXing-based package) */}
    </section>
  );
}
