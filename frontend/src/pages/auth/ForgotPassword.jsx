import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import m from './Auth.module.css';

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
    <div className={`page ${m.authPage}`}>
      <div className={m.authCard}>
        <h2>Forgot Password</h2>
        <form onSubmit={onSubmit} className={m.authForm}>
          <label>Email</label>
          <input className={m.authInput} type="email"
                 value={email} onChange={e=>setEmail(e.target.value)} required/>
          {err && <div className={m.authError}>{err}</div>}
          {msg && <div className={m.authInfo}>{msg}</div>}
          <button className="btn secondary" disabled={busy}>
            {busy?'Sending...':'Send code'}
          </button>
        </form>
        <div className={m.authActions}>
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}