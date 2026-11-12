import React, { useContext, useState } from 'react'
import { Ctx } from './ctx.js'
import { addNote, patchNote, removeNote } from './db'
import { Who } from './avatar.jsx'

export const NOTE_CATS = [['app', '💡', 'Sugerencia de la app'], ['pend', '📌', 'Pendiente'], ['cita', '💕', 'Idea de cita'], ['peli', '🎬', 'Para ver o hacer'], ['otro', '📝', 'Otro']]
const catOf = (id) => NOTE_CATS.find((c) => c[0] === id) || NOTE_CATS[4]

export function NotesScreen() {
  const { notes = [], couple, user } = useContext(Ctx)
  const [text, setText] = useState(''); const [cat, setCat] = useState('app'); const [f, setF] = useState('all'); const [st, setSt] = useState('open')
  const [edit, setEdit] = useState(null); const [del, setDel] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const run = async (fn) => { setErr(''); setBusy(true); try { await fn() } catch (e) { setErr(e.message || 'No se pudo guardar') } finally { setBusy(false) } }
  const list = notes.filter((n) => (f === 'all' || n.cat === f) && (st === 'all' || (st === 'done') === !!n.done)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return (
    <>
      <h1>Notas</h1>
      <p className="muted small">Ideas para mejorar la app, pendientes y planes. Las ven los dos en tiempo real.</p>
      <div className="panel">
        <div className="chips scroll">{NOTE_CATS.map(([id, ic, l]) => <button key={id} className={cat === id ? 'on' : ''} onClick={() => setCat(id)}>{ic} {l}</button>)}</div>
        <textarea rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe una idea, sugerencia o pendiente…" aria-label="Nueva nota" />
        <button className="btn" disabled={busy || text.trim().length < 2} onClick={() => run(async () => { await addNote(couple.id, { text: text.trim(), cat, by: user.uid }); setText('') })}>Agregar nota</button>
      </div>
      <div className="seg">{[['open', 'Abiertas'], ['done', 'Hechas'], ['all', 'Todas']].map(([k, l]) => <button key={k} className={st === k ? 'on' : ''} onClick={() => setSt(k)}>{l}</button>)}</div>
      <div className="chips scroll"><button className={f === 'all' ? 'on' : ''} onClick={() => setF('all')}>Todas</button>{NOTE_CATS.map(([id, ic]) => <button key={id} className={f === id ? 'on' : ''} onClick={() => setF(id)}>{ic} {notes.filter((n) => n.cat === id && !n.done).length}</button>)}</div>
      {err && <p className="error" role="alert">{err}</p>}
      {!list.length && <p className="empty">No hay notas aquí. ¿Qué le mejorarían a la app o a su vida juntos? 💭</p>}
      {list.map((n) => (
        <div key={n.id} className={'noteitem' + (n.done ? ' done' : '')}>
          <button className="check-b" aria-label={n.done ? 'Marcar como pendiente' : 'Marcar como hecha'} aria-pressed={!!n.done} onClick={() => run(() => patchNote(couple.id, n.id, { done: !n.done }))}>{n.done ? '✅' : '⬜'}</button>
          <div className="nbody">
            {edit?.id === n.id ? <><textarea rows={2} value={edit.text} maxLength={500} onChange={(e) => setEdit({ ...edit, text: e.target.value })} /><div className="two"><button className="btn small" disabled={edit.text.trim().length < 2} onClick={() => run(async () => { await patchNote(couple.id, n.id, { text: edit.text.trim() }); setEdit(null) })}>Guardar</button><button className="btn ghost small" onClick={() => setEdit(null)}>Cancelar</button></div></>
              : <p>{n.text}</p>}
            <small className="muted">{catOf(n.cat)[1]} {catOf(n.cat)[2]} · <Who uid={n.by} size={18} /> · {new Date(n.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</small>
            {del === n.id ? <div className="confirm"><b>¿Borrar esta nota?</b><div className="two"><button className="btn ghost small" onClick={() => setDel(null)}>Cancelar</button><button className="btn danger small" onClick={() => run(async () => { await removeNote(couple.id, n.id); setDel(null) })}>Sí, borrar</button></div></div>
              : edit?.id !== n.id && <div className="nacts"><button className="link" onClick={() => setEdit({ id: n.id, text: n.text })}>✏️ Editar</button><button className="link" onClick={() => setDel(n.id)}>🗑️ Borrar</button></div>}
          </div>
        </div>))}
    </>
  )
}
