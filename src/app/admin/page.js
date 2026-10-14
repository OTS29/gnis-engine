'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';

const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 };
const input = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' };
const btn = (bg = '#2563eb') => ({ background: bg, color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' });
const th = { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: '#6b7280', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' };
const td = { padding: '10px', borderBottom: '1px solid #f3f4f6', fontSize: 13, verticalAlign: 'top' };

const call = async (url, method = 'GET', body) => {
  try {
    const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    return { ...j, status: r.status };
  } catch { return { ok: false, error: 'Network error', status: 0 }; }
};
const day = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : 'never');
const daysAgo = (v) => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86400000) : null);

function Stat({ label, value, sub }) {
  return (
    <div style={{ ...box, marginBottom: 0, flex: '1 1 150px' }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>}
    </div>
  );
}

function Bars({ rows, labelKey, valueKey }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  if (!rows.length) return <div style={{ fontSize: 13, color: '#6b7280' }}>Nothing yet.</div>;
  return rows.map((r) => (
    <div key={r[labelKey]} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
      <div style={{ width: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r[labelKey]}</div>
      <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 6, height: 14 }}><div style={{ width: `${(r[valueKey] / max) * 100}%`, background: '#2563eb', height: 14, borderRadius: 6 }} /></div>
      <div style={{ width: 32, textAlign: 'right', fontWeight: 600 }}>{r[valueKey]}</div>
    </div>
  ));
}

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [state, setState] = useState('loading'); // loading | ok | denied
  const [ov, setOv] = useState(null);
  const [users, setUsers] = useState([]);
  const [log, setLog] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('best');
  const [open, setOpen] = useState(null);
  const [edit, setEdit] = useState({});
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [del, setDel] = useState('');
  const [planSel, setPlanSel] = useState({ plan: 'pro', months: 1 });
  const [add, setAdd] = useState({ email: '', name: '', role: 'client', country: '', skill: '', password: '' });

  const load = async () => {
    const [o, u] = await Promise.all([call('/api/admin/overview'), call('/api/admin/users')]);
    if (o.status === 401 || o.status === 403 || u.status === 403) { setState('denied'); return; }
    if (o.ok) setOv(o);
    if (u.ok) setUsers(u.data || []);
    setState('ok');
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'log') call('/api/admin/log').then((j) => j.ok && setLog(j.data || [])); }, [tab]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = users.filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (status === 'active' && u.suspended) return false;
      if (status === 'deactivated' && !u.suspended) return false;
      if (status === 'paying' && !u.plan_active) return false;
      if (status === 'inactive') { const d = daysAgo(u.last_login_at); if (!(d === null || d >= 30)) return false; }
      if (!s) return true;
      return [u.name, u.email, u.skill, u.country, u.region, u.slug].some((v) => String(v || '').toLowerCase().includes(s));
    });
    const by = {
      best: (a, b) => b.score - a.score,
      newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      login: (a, b) => new Date(b.last_login_at || 0) - new Date(a.last_login_at || 0),
    }[sort];
    return [...list].sort(by);
  }, [users, q, role, status, sort]);

  const pick = (u) => {
    if (open === u.id) { setOpen(null); return; }
    setOpen(u.id); setEdit({ name: u.name || '', country: u.country || '', skill: u.skill || '' }); setNote(u.admin_note || ''); setMsg(''); setDel('');
  };
  const act = async (u, body, okMsg) => {
    setMsg('Working…');
    const j = await call('/api/admin/users', 'PATCH', { id: u.id, ...body });
    if (j.ok) { setMsg(j.password ? `${okMsg} Temporary password: ${j.password} (shown once, give it to the user and ask them to change it).` : okMsg); load(); }
    else setMsg(j.error || 'Something went wrong');
  };
  const remove = async (u) => {
    setMsg('Deleting…');
    const j = await call('/api/admin/users', 'DELETE', { id: u.id, confirm: del });
    if (j.ok) { setOpen(null); setMsg(''); load(); } else setMsg(j.error || 'Could not delete');
  };
  const create = async (e) => {
    e.preventDefault(); setMsg('Adding…');
    const j = await call('/api/admin/users', 'POST', add);
    if (j.ok) { setMsg(`Added ${j.user.email}. Temporary password: ${j.password} (shown once).`); setAdd({ email: '', name: '', role: 'client', country: '', skill: '', password: '' }); load(); }
    else setMsg(j.error || 'Could not add');
  };

  if (state === 'loading') return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Loading…</div>;
  if (state === 'denied') return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 520 }}>
      <h2>Admins only</h2>
      <p>You need to be logged in with an admin account to open this page. If this is your account, make sure it is set as admin in the database, then log out and log in again.</p>
      <a href="/" style={{ color: '#2563eb' }}>Back to the home page</a>
    </div>
  );

  const t = ov?.totals || {};
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 18 }}>GNIS admin</strong>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/api/admin/export" style={{ ...btn('#16a34a'), textDecoration: 'none' }}>Download Excel</a>
          <a href="/dashboard" style={{ ...btn('#6b7280'), textDecoration: 'none' }}>My dashboard</a>
        </span>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[['overview', 'Overview'], ['users', `Users (${users.length})`], ['add', 'Add user'], ['log', 'Activity log']].map(([id, l]) => (
            <button key={id} onClick={() => { setTab(id); setMsg(''); }} style={{ ...btn(tab === id ? '#111827' : '#fff'), color: tab === id ? '#fff' : '#111827', border: '1px solid #e5e7eb' }}>{l}</button>
          ))}
        </div>

        {tab === 'overview' && ov && (<>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <Stat label="Total users" value={t.users} sub={`${t.pros} pros · ${t.clients} clients · ${t.admins} admin`} />
            <Stat label="New in 7 days" value={t.new7} sub={`${t.new30} in 30 days`} />
            <Stat label="Active in 30 days" value={t.active30} sub="logged in recently" />
            <Stat label="Paying plans" value={t.paying} />
            <Stat label="Websites live" value={t.published} sub={`${t.withSite} created`} />
            <Stat label="Bookings / orders" value={`${t.bookings} / ${t.orders}`} />
            <Stat label="Deactivated" value={t.suspended} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ ...box, flex: '1 1 300px' }}><strong>Sign-ups by month</strong><div style={{ marginTop: 10 }}><Bars rows={ov.monthly} labelKey="month" valueKey="n" /></div></div>
            <div style={{ ...box, flex: '1 1 300px' }}><strong>Users by country</strong><div style={{ marginTop: 10 }}><Bars rows={ov.byCountry.slice(0, 10)} labelKey="name" valueKey="n" /></div></div>
            <div style={{ ...box, flex: '1 1 300px' }}><strong>Professionals by trade</strong><div style={{ marginTop: 10 }}><Bars rows={ov.byProfession.slice(0, 10)} labelKey="name" valueKey="n" /></div></div>
          </div>
          <div style={{ ...box }}>
            <strong>Best users right now</strong>
            <div style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>Score = bookings + 2 × orders + page views ÷ 20.</div>
            {[...users].filter((u) => u.role === 'pro').sort((a, b) => b.score - a.score).slice(0, 5).map((u, i) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i ? '1px solid #f3f4f6' : 0, fontSize: 14 }}>
                <span>{i + 1}. {u.name || u.email} <span style={{ color: '#6b7280' }}>· {u.skill || 'no trade'}</span></span>
                <span><b>{u.score}</b> <span style={{ color: '#6b7280', fontSize: 12 }}>({u.bookings} bookings, {u.orders} orders, {u.views} views)</span></span>
              </div>
            ))}
          </div>
        </>)}

        {tab === 'users' && (<>
          <div style={{ ...box, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input style={{ ...input, flex: '2 1 220px', width: 'auto' }} placeholder="Search name, email, trade, country or site…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select style={{ ...input, flex: '1 1 110px', width: 'auto' }} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="all">All roles</option><option value="pro">Professionals</option><option value="client">Clients</option><option value="admin">Admins</option>
            </select>
            <select style={{ ...input, flex: '1 1 130px', width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Any status</option><option value="active">Active</option><option value="paying">Paying</option><option value="inactive">Inactive 30+ days</option><option value="deactivated">Deactivated</option>
            </select>
            <select style={{ ...input, flex: '1 1 130px', width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="best">Best first</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="login">Last login</option>
            </select>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Showing {shown.length} of {users.length}</div>
          <div style={{ ...box, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <thead><tr>{['User', 'Role', 'Country', 'Plan', 'Bookings', 'Orders', 'Views', 'Score', 'Joined', 'Last login'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {shown.map((u) => (<Fragment key={u.id}>
                  <tr onClick={() => pick(u)} style={{ cursor: 'pointer', background: open === u.id ? '#eff6ff' : u.suspended ? '#fef2f2' : '#fff' }}>
                    <td style={td}><b>{u.name || '(no name)'}</b>{u.suspended && <span style={{ color: '#b91c1c', fontSize: 11 }}> · deactivated</span>}<div style={{ color: '#6b7280', fontSize: 12 }}>{u.email}</div></td>
                    <td style={td}>{u.role}</td>
                    <td style={td}>{u.country || u.region || '-'}</td>
                    <td style={td}>{u.plan_active ? (u.plan === 'biz' ? 'Business' : 'Professional') : 'Starter'}</td>
                    <td style={td}>{u.bookings}</td><td style={td}>{u.orders}</td><td style={td}>{u.views}</td><td style={td}><b>{u.score}</b></td>
                    <td style={td}>{day(u.created_at)}</td><td style={td}>{day(u.last_login_at)}</td>
                  </tr>
                  {open === u.id && (
                    <tr><td colSpan={10} style={{ ...td, background: '#f9fafb' }}>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 260px' }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>Details</div>
                          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                            {u.skill && <div>Trade: {u.skill}{u.rate ? ` (${u.rate})` : ''}</div>}
                            {u.address && <div>Address: {u.address} {u.postcode}</div>}
                            {u.verification_method && <div>ID type: {u.verification_method}</div>}
                            {u.slug && <div>Website: <a href={`/site/${u.slug}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>/site/{u.slug}</a> ({u.published ? 'live' : 'offline'})</div>}
                          </div>
                          <div style={{ fontWeight: 700, margin: '12px 0 6px' }}>Edit</div>
                          <input style={{ ...input, marginBottom: 6 }} placeholder="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <input style={input} placeholder="Country (e.g. NG)" value={edit.country} onChange={(e) => setEdit({ ...edit, country: e.target.value })} />
                            <input style={input} placeholder="Trade" value={edit.skill} onChange={(e) => setEdit({ ...edit, skill: e.target.value })} />
                          </div>
                          <button style={btn()} onClick={() => act(u, { action: 'edit', ...edit }, 'Saved.')}>Save changes</button>
                        </div>
                        <div style={{ flex: '1 1 260px' }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>Private note</div>
                          <textarea style={{ ...input, minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only admins can see this" />
                          <button style={{ ...btn('#374151'), marginTop: 6 }} onClick={() => act(u, { action: 'note', note }, 'Note saved.')}>Save note</button>
                          <div style={{ fontWeight: 700, margin: '14px 0 6px' }}>Give a plan <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(now: {u.plan_active ? (u.plan === 'biz' ? 'Business' : 'Professional') : 'Starter'})</span></div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <select style={input} value={planSel.plan} onChange={(e) => setPlanSel({ ...planSel, plan: e.target.value })}><option value="pro">Professional</option><option value="biz">Business</option><option value="starter">Back to Starter</option></select>
                            <select style={input} value={planSel.months} onChange={(e) => setPlanSel({ ...planSel, months: e.target.value })}><option value="1">1 month</option><option value="3">3 months</option><option value="12">12 months</option></select>
                          </div>
                          <button style={{ ...btn('#7c3aed'), marginTop: 6 }} onClick={() => act(u, { action: 'plan', ...planSel }, 'Plan updated.')}>Apply plan</button>
                          <div style={{ fontWeight: 700, margin: '14px 0 6px' }}>Role</div>
                          <select style={input} value={u.role} onChange={(e) => act(u, { action: 'role', role: e.target.value }, 'Role changed. They need to log in again.')}>
                            <option value="pro">Professional</option><option value="client">Client</option><option value="admin">Admin</option>
                          </select>
                        </div>
                        <div style={{ flex: '1 1 260px' }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>Help and remove</div>
                          <button style={btn('#d97706')} onClick={() => confirm(`Issue a new temporary password for ${u.email}? Their old password stops working.`) && act(u, { action: 'reset_password' }, 'Password reset.')}>Reset password</button>
                          <div style={{ height: 8 }} />
                          {u.suspended
                            ? <button style={btn('#16a34a')} onClick={() => act(u, { action: 'unsuspend' }, 'Reactivated. Their site stays offline until they save it again.')}>Reactivate</button>
                            : <button style={btn('#6b7280')} onClick={() => confirm(`Deactivate ${u.email}? They cannot log in and their website goes offline. You can reverse this.`) && act(u, { action: 'suspend' }, 'Deactivated.')}>Deactivate (reversible)</button>}
                          <div style={{ fontSize: 12, color: '#b91c1c', margin: '14px 0 6px', fontWeight: 700 }}>Delete permanently</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Removes the account, website, bookings, orders and plan records. Download the Excel first if you need a copy. Type their email to confirm.</div>
                          <input style={{ ...input, marginBottom: 6 }} placeholder={u.email} value={del} onChange={(e) => setDel(e.target.value)} />
                          <button style={btn('#dc2626')} disabled={del.trim().toLowerCase() !== String(u.email).toLowerCase()} onClick={() => remove(u)}>Delete forever</button>
                        </div>
                      </div>
                      {msg && <div style={{ marginTop: 10, fontSize: 13, color: '#111827', background: '#fef9c3', borderRadius: 8, padding: 8, wordBreak: 'break-word' }}>{msg}</div>}
                    </td></tr>
                  )}
                </Fragment>))}
                {!shown.length && <tr><td colSpan={10} style={{ ...td, color: '#6b7280' }}>No users match.</td></tr>}
              </tbody>
            </table>
          </div>
        </>)}

        {tab === 'add' && (
          <form onSubmit={create} style={{ ...box, maxWidth: 520 }}>
            <strong>Add a user</strong>
            <div style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>Leave the password empty and we make a temporary one for you to pass on.</div>
            <input style={{ ...input, marginBottom: 8 }} type="email" required placeholder="Email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
            <input style={{ ...input, marginBottom: 8 }} placeholder="Name" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select style={input} value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}><option value="client">Client</option><option value="pro">Professional</option><option value="admin">Admin</option></select>
              <input style={input} placeholder="Country (e.g. GB)" value={add.country} onChange={(e) => setAdd({ ...add, country: e.target.value })} />
            </div>
            <input style={{ ...input, marginBottom: 8 }} placeholder="Trade (for professionals)" value={add.skill} onChange={(e) => setAdd({ ...add, skill: e.target.value })} />
            <input style={{ ...input, marginBottom: 10 }} placeholder="Password (optional, 8+ characters)" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} />
            <button style={btn()} type="submit">Add user</button>
            {msg && <div style={{ marginTop: 10, fontSize: 13, background: '#fef9c3', borderRadius: 8, padding: 8, wordBreak: 'break-word' }}>{msg}</div>}
          </form>
        )}

        {tab === 'log' && (
          <div style={{ ...box, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead><tr>{['When', 'Admin', 'Action', 'User', 'Detail'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {log.map((l) => <tr key={l.id}><td style={td}>{l.at}</td><td style={td}>{l.admin_email}</td><td style={td}>{l.action}</td><td style={td}>{l.target_email || '-'}</td><td style={td}>{l.detail}</td></tr>)}
                {!log.length && <tr><td colSpan={5} style={{ ...td, color: '#6b7280' }}>No admin actions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
