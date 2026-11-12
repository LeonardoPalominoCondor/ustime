import React, { useContext, useEffect, useMemo, useState } from 'react'
import { logout } from './session.js'
import { Ctx } from './ctx.js'
import { saveProfile } from './db'
import { EmojiPicker } from './emoji.jsx'
import { Avatar, AV_BG, FRAMES, STICKERS, ACCENTS, isUnlocked, needText } from './avatar.jsx'
import { computeAchievements } from './achievements.js'
import { streakInfo, levelOf } from './gamecore.js'
import { now } from './clock'
import { enablePush, disablePush, savePrefs, localTest, pushSupported, DEFAULT_PREFS, PREF_LABELS } from './push.js'

export function useUnlockStats() {
  const { entries, events, uids, game } = useContext(Ctx)
  return useMemo(() => {
    const ach = computeAchievements(entries, uids, events, game, now()).filter((a) => a.done).length
    return { ach, streak: game ? streakInfo(game.days, now()).n : 0, petLevel: game ? Math.max(0, ...game.pets.map((p) => levelOf(p.xp))) : 0,
      titles: entries.filter((e) => e.status === 'visto').length, eventsDone: events.filter((e) => e.status === 'done' || e.done).length }
  }, [entries, events, uids, game])
}

// Editor con vista previa en vivo: nada se guarda hasta pulsar “Guardar”.
export function ProfileEditor({ initial, onSave, label = 'Guardar cambios', stats = {}, onCancel }) {
  const [p, setP] = useState({ username: '', avatar: '🐻', avBg: 'noche', frame: 'rosa', sticker: '', color: ACCENTS[0], ...initial })
  const [emoji, setEmoji] = useState(false)
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  const set = (k, v) => { setP((x) => ({ ...x, [k]: v })); setMsg('') }
  const dirty = JSON.stringify(p) !== JSON.stringify({ username: '', avatar: '🐻', avBg: 'noche', frame: 'rosa', sticker: '', color: ACCENTS[0], ...initial })
  const ok = p.username.trim().length >= 2
  const save = async () => { setBusy(true); setErr(''); try { await onSave({ ...p, username: p.username.trim() }); setMsg('✅ Perfil guardado') } catch (e) { setErr(e.message || 'No se pudo guardar') } finally { setBusy(false) } }
  const Opt = ({ it, cur, k, children }) => { const u = isUnlocked(it, stats); return <button className={'opt' + (cur === it.id ? ' on' : '') + (u ? '' : ' locked')} disabled={!u} title={u ? it.label : `Se desbloquea con ${needText(it)}`} onClick={() => set(k, it.id)}>{children}{!u && <small>🔒 {needText(it)}</small>}</button> }
  return (
    <>
      <div className="profile-preview" style={{ '--accent': p.color }}><Avatar p={p} size={112} className="pulse-in" /><h2 style={{ color: p.color }}>{p.username || 'Tu nombre'}</h2></div>
      <button className="btn ghost" onClick={() => setEmoji(!emoji)}>{p.avatar} Elegir emoji</button>
      {emoji && <EmojiPicker value={p.avatar} onPick={(e) => { set('avatar', e); setEmoji(false) }} />}
      <label>Nombre de usuario</label><input value={p.username} maxLength={20} onChange={(e) => set('username', e.target.value)} placeholder="Ej: osito_cine" />
      <h3>Fondo</h3><div className="opts">{AV_BG.map((b) => <Opt key={b.id} it={b} cur={p.avBg} k="avBg"><span className="sw" style={{ background: b.css }} /><small>{b.label}</small></Opt>)}</div>
      <h3>Marco</h3><div className="opts">{FRAMES.map((f) => <Opt key={f.id} it={f} cur={p.frame} k="frame"><Avatar p={{ ...p, frame: f.id }} size={44} /><small>{f.label}</small></Opt>)}</div>
      <h3>Decoración</h3><div className="opts">{STICKERS.map((s) => <Opt key={s.id || 'none'} it={s} cur={p.sticker} k="sticker"><span className="sw">{s.id || '∅'}</span><small>{s.id ? '' : 'Ninguna'}</small></Opt>)}</div>
      <h3>Color de tu nombre</h3><div className="swatches">{ACCENTS.map((c) => <button key={c} aria-label={'Color ' + c} className={p.color === c ? 'on' : ''} style={{ background: c }} onClick={() => set('color', c)} />)}</div>
      {err && <p className="error" role="alert">{err}</p>}{msg && <p className="okmsg" role="status">{msg}</p>}
      <button className="btn big" disabled={!ok || !dirty || busy} onClick={save}>{busy ? 'Guardando…' : label}</button>
      {onCancel && <button className="link" onClick={onCancel}>Cancelar</button>}
    </>
  )
}

export function ProfileScreen() {
  const { user, profile, couple, uids } = useContext(Ctx)
  const stats = useUnlockStats()
  const [calm, setCalm] = useState(localStorage.getItem('ustime_calm') === '1')
  const toggleCalm = () => { const v = !calm; setCalm(v); localStorage.setItem('ustime_calm', v ? '1' : '0'); document.documentElement.dataset.calm = v ? '1' : '' }
  return (
    <>
      <h1>Tu perfil</h1>
      <ProfileEditor initial={profile} stats={stats} onSave={(d) => saveProfile(user.uid, d)} />
      <div className="panel"><h3>Código de su espacio</h3><div className="code">{couple.id}</div><small className="muted">{uids.length < 2 ? 'Pásaselo a tu pareja para que se una.' : 'Ya están los dos conectados.'}</small></div>
      <Notifications uid={user.uid} />
      <div className="panel"><h3>Preferencias</h3>
        <label className="check"><input type="checkbox" checked={calm} onChange={toggleCalm} /> Reducir animaciones</label></div>
      <p className="muted small">Sesión: {user.email}</p>
      <button className="link" onClick={logout}>Cerrar sesión</button>
    </>
  )
}

function Notifications({ uid }) {
  const [state, setState] = useState({ ok: null, on: !!localStorage.getItem('ustime_push_token'), perm: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported' })
  const [prefs, setPrefs] = useState(() => { try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem('ustime_push_prefs')) } } catch { return DEFAULT_PREFS } })
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { pushSupported().then((ok) => setState((s) => ({ ...s, ok }))) }, [])
  const run = async (fn, ok) => { setBusy(true); setErr(''); setMsg(''); try { await fn(); ok && setMsg(ok) } catch (e) { setErr(e.message || 'No se pudo completar') } finally { setBusy(false); setState((s) => ({ ...s, on: !!localStorage.getItem('ustime_push_token'), perm: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported' })) } }
  const toggle = (k) => { const n = { ...prefs, [k]: !prefs[k] }; setPrefs(n); localStorage.setItem('ustime_push_prefs', JSON.stringify(n)); savePrefs(uid, n).catch(() => {}) }
  return (
    <div className="panel"><h3>🔔 Notificaciones</h3>
      {state.ok === false && <p className="hint">Este navegador no admite notificaciones push. En iPhone instala la app en la pantalla de inicio (iOS 16.4+).</p>}
      {state.perm === 'denied' && <p className="hint">Bloqueaste las notificaciones. Actívalas en los ajustes del navegador para este sitio.</p>}
      {!state.on ? <button className="btn" disabled={busy || state.ok === false} onClick={() => run(async () => { await enablePush(uid); await savePrefs(uid, prefs) }, '✅ Notificaciones activadas en este dispositivo')}>{busy ? 'Activando…' : 'Activar en este dispositivo'}</button>
        : <><p className="okmsg">✅ Activadas en este dispositivo</p><div className="two"><button className="btn ghost small" disabled={busy} onClick={() => run(localTest, 'Revisa tu barra de notificaciones')}>Enviar prueba</button><button className="btn ghost small" disabled={busy} onClick={() => run(() => disablePush(uid), 'Desactivadas')}>Desactivar</button></div></>}
      {Object.entries(PREF_LABELS).map(([k, l]) => <label key={k} className="check"><input type="checkbox" checked={!!prefs[k]} onChange={() => toggle(k)} /> {l}</label>)}
      {msg && <p className="okmsg" role="status">{msg}</p>}{err && <p className="error" role="alert">{err}</p>}
      <small className="muted">Los avisos llegan aunque la app esté cerrada. Pueden tardar unos minutos y no suenan entre las 23:00 y las 7:00.</small>
    </div>
  )
}
