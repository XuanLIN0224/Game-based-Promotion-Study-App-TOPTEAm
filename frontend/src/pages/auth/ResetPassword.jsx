import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import './Auth.css';

export default function ResetPassword() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const presetEmail = sp.get('email') || '';
  const [email, setEmail] = useState(presetEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(()=>{ setEmail(presetEmail); }, [presetEmail]);

  const onSubmit = async (e)=>{
    e.preventDefault();
    setErr('');
    setOk('');
    setBusy(true);
    try {
      await api('/auth/reset-password', {
        method:'POST',
        body:{ email, code, newPassword }
      });
      setOk('Password reset successfully. You can log in now.');
      setTimeout(()=> nav('/login', { replace:true }), 800);
    } catch(e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <form onSubmit={onSubmit} className="auth-form">
          <label>Email</label>
          <input className="auth-input" type="email" value={email}
                 onChange={e=>setEmail(e.target.value)} required/>
          <label>Verification code</label>
          <input className="auth-input" value={code}
                 onChange={e=>setCode(e.target.value)} inputMode="numeric" maxLength={6} required/>
          <label>New password</label>
          <input className="auth-input" type="password" value={newPassword}
                 onChange={e=>setNewPassword(e.target.value)} required/>
          {err && <div className="auth-error">{err}</div>}
          {ok && <div className="auth-ok">{ok}</div>}
          <button className="btn primary" disabled={busy}>
            {busy?'Resetting...':'Reset password'}
          </button>
        </form>
        <div className="auth-actions">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}