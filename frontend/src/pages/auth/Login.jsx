import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../../api/client';
import './Auth.css';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /* Triggered when the user clicks "Log in" button */
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const resp = await api('/auth/login', {
        method: 'POST',
        body: { email, password, remember }
      });
      setToken(resp.token);
      const me = await api('/auth/me');
      if (me?.isStudent === false) {
        nav('/teacher', { replace: true });
      } else {
        nav('/', { replace: true });
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Welcome back</h2>
        <form onSubmit={onSubmit} className="auth-form">
          <label>Email</label>
          <input className="auth-input" type="email" value={email}
                 onChange={e=>setEmail(e.target.value)} required maxLength={50}/>
          <label>Password</label>
          <input className="auth-input" type={showPassword ? "text" : "password"} value={password}
                 onChange={e=>setPassword(e.target.value)} required/>
          {err && <div className="auth-error">{err}</div>}
          <label className="remember-row">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            Show password
          </label>
          <label className="remember-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Keep me logged in for a week
          </label>
          <button className="btn primary" disabled={busy}>{busy?'Logging in...':'Log in'}</button>
        </form>

        <div className="auth-actions">
          <Link to="/register/step1">Create account</Link>
          <Link to="/forgot">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}