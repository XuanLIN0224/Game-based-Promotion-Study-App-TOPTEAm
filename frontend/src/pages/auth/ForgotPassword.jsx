import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import './Auth.css';

export default function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (e)=>{
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api('/auth/forgot-password', { method:'POST', body:{ email }});
      setMsg('If the email exists, a code has been sent.');
      // 跳去 reset
      nav(`/reset?email=${encodeURIComponent(email)}`);
    } catch(e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        <form onSubmit={onSubmit} className="auth-form">
          <label>Email</label>
          <input className="auth-input" type="email"
                 value={email} onChange={e=>setEmail(e.target.value)} required/>
          {err && <div className="auth-error">{err}</div>}
          {msg && <div className="auth-info">{msg}</div>}
          <button className="btn primary" disabled={busy}>
            {busy?'Sending...':'Send code'}
          </button>
        </form>
        <div className="auth-actions">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}