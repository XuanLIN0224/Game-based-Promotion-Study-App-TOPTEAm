import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function TeacherQR() {
  const [sessionIndex, setSessionIndex] = useState(1);         // 1..24
  const [validDate, setValidDate] = useState('');              // YYYY-MM-DD
  const [validTime, setValidTime] = useState('');              // HH:MM
  const [validMinutes, setValidMinutes] = useState(40);        // default a class length
  const [qr, setQr] = useState(null);                          // { qrImage, validFrom, validUntil, code }
  const nav = useNavigate();

  async function generate() {
    const r = await api('/teacher/qrcode', {
      method: 'POST',
      body: { sessionIndex, validDate, validTime, validMinutes, type: 'attendance' }
    });
    setQr(r);
  }

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <h1>Generate QR code</h1>
      <div className="leftside">
        <div style={{ margin: '8px 0 16px 0', display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => nav('/teacher')}>
            Back to weekly quizzes
            </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <label>
          Session (1–24):
          <input
            type="number"
            min={1}
            max={24}
            value={sessionIndex}
            onChange={e => setSessionIndex(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          Date:
          <input
            type="date"
            value={validDate}
            onChange={e => setValidDate(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          Start time:
          <input
            type="time"
            value={validTime}
            onChange={e => setValidTime(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          Valid for (minutes):
          <input
            type="number"
            min={1}
            max={1440}
            value={validMinutes}
            onChange={e => setValidMinutes(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </label>

        <button onClick={generate} className="btn primary" style={{ width: 180 }}>
          Generate
        </button>
      </div>

      {qr && (
        <div style={{ marginTop: 20 }}>
          <img src={qr.qrImage} alt="QR Code" style={{ width: 240, background: '#fff', padding: 6, borderRadius: 6 }} />
          <p><b>Session:</b> {qr.sessionIndex}</p>
          <p><b>Valid from:</b> {new Date(qr.validFrom).toLocaleString()}</p>
          <p><b>Valid until:</b> {new Date(qr.validUntil).toLocaleString()}</p>
          <p style={{ opacity: 0.7, fontSize: 12 }}>Code: {qr.code}</p>
        </div>
      )}
    </div>
  );
}