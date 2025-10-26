import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken } from '../../api/client';
import m from './Auth.module.css';

export default function RegisterStep2() {
  const nav = useNavigate();
  const email = sessionStorage.getItem('registerEmail');
  const group = sessionStorage.getItem('registerGroup');
  const [breeds, setBreeds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    api(`/breeds?group=${group}`)
      .then(setBreeds)
      .catch(e=>setErr(e.message));
  }, [email, group, nav]);

  const onSubmit = async (e)=>{
    e.preventDefault();
    if (!selected) { setErr('Please choose a breed'); return; }
    setErr('');
    setBusy(true);
    try {
      const resp = await api('/auth/register/step2', {
        method:'POST',
        body: { email, breedId: selected }
      });
      setToken(resp.token);
      const me = await api('/auth/me');
      if (me?.isStudent === false) nav('/teacher', { replace: true });
      else nav('/', { replace: true });
      // 清掉临时
      sessionStorage.removeItem('registerEmail');
      sessionStorage.removeItem('registerGroup');
      nav('/', { replace:true });
    } catch(e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`page ${m.authPage}`}>
      <div className={m.authCard}>
        <h2>Choose your {group === 'dog' ? 'puppy' : 'kitty'}</h2>
        <form onSubmit={onSubmit}>
          <div className={m.listPicker}>
            {breeds.map(b=>(
              <button key={b._id} type="button"
                className={`breed-card ${selected===b._id?'selected':''}`}
                onClick={()=>setSelected(b._id)}>
                {/* 可选显示图片：b.imageUrl */}
                <div className="breed-name">{b.name}</div>
              </button>
            ))}
          </div>
          {err && <div className={m.authError}>{err}</div>}
          <div className={m.actionsRow}>
            <button className="btn primary" disabled={busy}>
              {busy?'Creating...':'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}