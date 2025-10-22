import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../../api/client';
import m from './Auth.module.css';

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
    let ok = false;
    flushSync(() => {
      setErr('');
      setBusy(true);
    });
    try {
      const resp = await api('/auth/login', {
        method: 'POST',
        body: { email, password, remember }
      });
      setToken(resp.token);
      const me = await api('/auth/me');
      ok = true;
      if (me?.isStudent === false) {
        nav('/teacher', { replace: true });
      } else {
        nav('/', { replace: true });
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      // Keep a short delay on success so the disabled state is observable; fail fast on error.
      if (ok) {
        setTimeout(() => setBusy(false), 50);
      } else {
        setBusy(false);
      }
    }
  };

  return (
    <div className={`page ${m.authPage}`}>
      <div className={m.authCard}>
        <h2>Welcome back</h2>
        <form className="auth-form" onSubmit={onSubmit}>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    className="auth-input"
    type="email"
    required
    maxLength={50}
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />

  <label htmlFor="password">Password</label>
  <input
    id="password"
    className="auth-input"
    type={showPassword ? 'text' : 'password'}
    required
    value={password}
    onChange={(e) => setPassword(e.target.value)}
  />

  <label className="remember-row">
    <input
      type="checkbox"
      checked={showPassword}
      onChange={() => setShowPassword(!showPassword)}
    />
    Show password
  </label>

  <label className="remember-row">
    <input
      type="checkbox"
      checked={remember}
      onChange={() => setRemember(!remember)}
    />
    Keep me logged in for a week
  </label>

  <button className="btn primary" type="submit" disabled={busy}>
    {busy ? 'Logging in…' : 'Log in'}
  </button>
</form>
        {err && (
          <div className="auth-error" role="alert" aria-live="polite">
            {err}
          </div>
        )}

        <div className={m.authActions}>
          <Link to="/register/step1">Create account</Link>
          <Link to="/forgot">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}