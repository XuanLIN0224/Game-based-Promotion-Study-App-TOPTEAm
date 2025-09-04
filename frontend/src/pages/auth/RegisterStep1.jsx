import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import './Auth.css';

function GroupPicker({ value, onChange }) {
  const opts = [
    {key:'dog', label:'Dog person', img:'/icons/dog.png'},
    {key:'cat', label:'Cat person', img:'/icons/cat.png'},
  ];
  return (
    <div className="group-grid">
      {opts.map(o=>(
        <button type="button" key={o.key}
          className={`group-card ${value===o.key?'selected':''}`}
          onClick={()=>onChange(o.key)}>
          <img src={o.img} alt={o.label}/>
          <div>{o.label}</div>
        </button>
      ))}
    </div>
  );
}

export default function RegisterStep1() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    email:'', username:'', password:'', confirmPassword:'', group:'dog'
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onChange = (k,v)=> setForm(s=>({...s,[k]:v}));

  const onSubmit = async (e)=>{
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api('/auth/register/step1', { method:'POST', body: form });
      // 把 email & group 临时放 sessionStorage，给 Step2 用
      sessionStorage.setItem('registerEmail', form.email);
      sessionStorage.setItem('registerGroup', form.group);
      // 去 Step2
      nav('/register/step2', { replace:true });
    } catch(e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create your account</h2>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>Email</label>
          <input className="auth-input" type="email" required maxLength={50}
                 value={form.email} onChange={e=>onChange('email', e.target.value)}/>
          <label>Username</label>
          <input className="auth-input" required maxLength={50}
                 value={form.username} onChange={e=>onChange('username', e.target.value)}/>
          <label>Password</label>
          <input className="auth-input" type="password" required
                 value={form.password} onChange={e=>onChange('password', e.target.value)}/>
          <label>Confirm password</label>
          <input className="auth-input" type="password" required
                 value={form.confirmPassword} onChange={e=>onChange('confirmPassword', e.target.value)}/>

          <div className="block-label">Are you a dog person or a cat person?</div>
          <GroupPicker value={form.group} onChange={(g)=>onChange('group', g)} />

          {err && <div className="auth-error">{err}</div>}
          <button className="btn primary" disabled={busy}>{busy?'Next...':'Next'}</button>
        </form>

        <div className="auth-actions">
          <Link to="/login">Already have an account? Log in</Link>
        </div>
      </div>
    </div>
  );
}