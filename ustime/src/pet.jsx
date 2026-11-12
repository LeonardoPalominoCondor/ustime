import React, { useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { Ctx } from './ctx.js'
import { saveAnswer } from './db'
import * as G from './game.js'

const useCtx = () => useContext(Ctx)
const useNow = () => { const [n, s] = useState(Date.now()); useEffect(() => { const t = setInterval(() => s(Date.now()), 30000); return () => clearInterval(t) }, []); return n }
const fmtLeft = (ms) => `${Math.floor(ms / 36e5)} h ${Math.floor((ms % 36e5) / 6e4)} min`
const fmtDate = (t) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
const Bar = ({ label, v, color }) => <div className="need"><small>{label}</small><div className="bar"><i style={{ width: v + '%', background: color }} /></div></div>

function PetStage({ pet }) {
  const lv = G.levelOf(pet.xp), ph = G.phaseOf(lv)
  const base = G.PETS.find((p) => p.id === pet.type)
  const bg = G.item(pet.bg)
  return (
    <div className="stage" style={{ background: bg?.css || 'var(--surface2)' }}>
      <div className={'pet ' + ph}>
        <span className="hat">{G.item(pet.head)?.emoji}</span>
        <span className="pbody">{base.emoji}</span>
        <span className="pface">{G.item(pet.face)?.emoji}</span>
        <span className="cloth">{G.item(pet.body)?.emoji}</span>
      </div>
    </div>
  )
}

function message(pet, events, g) {
  const t = G.today()
  const todayEv = events.find((e) => e.date === t && !e.done)
  if (G.hunger(pet) < 30) return '¡Tengo tanta hambre que me comería una pizza entera! Entren a darme de comer 🍕'
  if (G.clean(pet) < 30) return 'Huelo a calcetín viejo... ¿me dan un bañito? 🛁'
  if (todayEv) return `¡Papás, recuerden que hoy tienen agendado: ${todayEv.title}! ${todayEv.icon}`
  if (!events.some((e) => e.date > t && !e.done)) return `${pet.name} los extraña... ¿Cuándo van a tener su próxima cita? 💭`
  return ['¡Hola Papi/Mami! Me encanta cuando revisan sus fotos juntos ❤️', 'Hoy me dan ganas de peli, manta y palomitas 🍿', 'Los quiero mucho a los dos 💞'][new Date().getDate() % 3]
}

const QUESTIONS = ['¿Cuál fue tu momento favorito de esta semana juntos?', '¿Qué película te gustaría ver conmigo esta noche?', '¿Qué es lo que más te gusta de nuestras citas?', '¿Qué lugar te gustaría que visitemos?', '¿Cuál es tu recuerdo favorito de nosotros?', '¿Qué canción te recuerda a mí?', '¿Qué plan perfecto harías para un domingo?', '¿Qué es algo pequeño que te hizo feliz hoy?', '¿Qué serie podríamos maratonear este mes?', '¿Qué te gustaría que probemos juntos por primera vez?', '¿Qué comida elegirías para nuestra próxima cita?', '¿Qué cosa te hace reír de mí?', '¿Cuál fue tu primera impresión de mí?', '¿Qué película te hizo llorar y por qué?', '¿Qué meta te gustaría cumplir juntos este año?']

function DailyQ() {
  const { couple, user, partnerUid } = useCtx()
  const t = G.today()
  const q = QUESTIONS[Math.floor(Date.now() / 864e5) % QUESTIONS.length]
  const [ans, setAns] = useState({})
  const [text, setText] = useState('')
  useEffect(() => onSnapshot(doc(db, 'couples', couple.id, 'answers', t), (s) => setAns(s.data() || {})), [couple.id, t])
  const mine = ans[user.uid], theirs = ans[partnerUid]
  const send = async () => { await saveAnswer(couple.id, t, user.uid, text.trim()); G.award(couple.id, { activity: true }) }
  return (
    <div className="panel">
      <h3>Pregunta del día</h3>
      <p>{q}</p>
      {mine ? <>
        <p className="pnote">Tú: {mine}</p>
        {theirs ? <p className="pnote">Tu pareja: {theirs}</p> : <small className="muted">Su respuesta se mostrará cuando conteste.</small>}
      </> : <>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tu respuesta…" />
        <button className="btn" disabled={!text.trim()} onClick={send}>Responder</button>
      </>}
    </div>
  )
}

function PetTab({ g, pet, pets }) {
  const { couple, events } = useCtx()
  const [care, setCare] = useState(null)
  const [err, setErr] = useState('')
  const run = async (p) => { setErr(''); try { await p } catch (e) { setErr(e.message) } }
  if (!pet) return <p className="empty">Aún no tienen mascota. Ve a <b>Huevos</b>, incuben el huevo gratis y esperen a que eclosione 🥚</p>
  const lv = G.levelOf(pet.xp), ph = G.phaseOf(lv)
  const lo = G.xpForLevel(lv), hi = G.xpForLevel(lv + 1)
  const foods = G.SHOP.filter((i) => i.kind === (care === 'feed' ? 'food' : 'bath') && g.inv[i.id] > 0)
  const wear = g.owned.map(G.item).filter(Boolean)
  return (
    <>
      <PetStage pet={pet} />
      <div className="bubble">{message(pet, events, g)}</div>
      <h2 className="petname">{pet.name} <small className="muted">Nv. {lv} · {G.PHASE_LABEL[ph]}</small></h2>
      <div className="bar xp"><i style={{ width: ((pet.xp - lo) / (hi - lo)) * 100 + '%' }} /></div>
      <small className="muted">{pet.xp} XP · faltan {hi - pet.xp} para el nivel {lv + 1}</small>
      <Bar label="🍽️ Hambre" v={G.hunger(pet)} color="var(--gold)" />
      <Bar label="🛁 Limpieza" v={G.clean(pet)} color="#6bc8ff" />
      <div className="two">
        <button className="btn" onClick={() => setCare(care === 'feed' ? null : 'feed')}>🍽️ Alimentar</button>
        <button className="btn" onClick={() => setCare(care === 'bath' ? null : 'bath')}>🛁 Bañar</button>
      </div>
      {care && (
        <div className="chips">
          <button onClick={() => { run(G.care(couple.id, pet.id, care, null)); setCare(null) }}>{care === 'feed' ? '🥣 Croquetas (gratis)' : '💧 Agua (gratis)'}</button>
          {foods.map((i) => <button key={i.id} onClick={() => { run(G.care(couple.id, pet.id, care, i.id)); setCare(null) }}>{i.emoji} {i.name} ×{g.inv[i.id]}</button>)}
        </div>
      )}
      <small className="muted">Cuidarla da +5 XP (máx. 3 veces al día).</small>
      {err && <p className="error">{err}</p>}
      {!!wear.length && <>
        <h3>Vestuario</h3>
        <div className="chips">{wear.map((i) => {
          const ok = i.phases.includes(ph)
          return <button key={i.id} disabled={!ok} className={pet[i.slot] === i.id ? 'on' : ''} title={ok ? '' : 'Aún no puede usarlo'} onClick={() => run(G.equip(couple.id, pet.id, i.id))}>{i.emoji} {i.name}</button>
        })}</div>
      </>}
      {pets.length > 1 && <>
        <h3>Mascota principal</h3>
        <div className="chips">{pets.map((p) => <button key={p.id} className={p.id === g.activeId ? 'on' : ''} onClick={() => G.setActive(couple.id, p.id)}>{G.PETS.find((x) => x.id === p.type).emoji} {p.name}</button>)}</div>
      </>}
      <DailyQ />
    </>
  )
}

function Eggs({ g, pets }) {
  const { couple, entries, uids } = useCtx()
  const now = useNow()
  const [err, setErr] = useState('')
  const run = async (p) => { setErr(''); try { await p } catch (e) { setErr(e.message) } }
  const streak = G.streakInfo(g.days)
  const canStreak = streak.n >= 30 && streak.start !== g.claims.streakAt
  const h = G.harmony(entries, uids)
  const canHito = h.total >= 50 * ((g.claims.hito || 0) + 1) && h.pct > 80
  return (
    <>
      <h2>Huevos</h2>
      {!g.eggs.length && <p className="empty">No tienen huevos ahora. Consigan uno con una racha o un gran hito de cine 👇</p>}
      {g.eggs.map((e) => {
        const left = e.hatchAt ? e.hatchAt - now : null
        return (
          <div className="panel egg" key={e.id}>
            <span className="eggi">🥚</span>
            <div>
              <b>Huevo {G.RARITY[e.rarity].label.toLowerCase()}</b>
              <small className="muted">{e.from === 'inicial' ? 'Regalo de bienvenida' : e.from === 'streak' ? 'Por su racha de 30 días' : 'Por su gran hito de cine'}</small>
              {!e.hatchAt && <button className="btn" onClick={() => run(G.incubate(couple.id, e.id))}>Incubar ({G.RARITY[e.rarity].hours} h)</button>}
              {e.hatchAt && left > 0 && <p>⏳ Eclosiona en {fmtLeft(left)}</p>}
              {e.hatchAt && left <= 0 && <button className="btn" onClick={() => run(G.hatch(couple.id, e.id, (window.prompt('¿Cómo se llamará su mascota? (opcional)') || '').trim().slice(0, 16)))}>🐣 ¡Eclosionar!</button>}
            </div>
          </div>
        )
      })}
      {err && <p className="error">{err}</p>}
      <h3>Cómo conseguir huevos raros</h3>
      <div className="panel">
        <b>Opción A · Racha de pareja</b>
        <small className="muted">30 días seguidos con al menos 1 actividad (calificar, completar una cita o responder la pregunta del día).</small>
        <div className="bar"><i style={{ width: Math.min(100, (streak.n / 30) * 100) + '%' }} /></div>
        <small>{Math.min(streak.n, 30)}/30 días</small>
        <button className="btn" disabled={!canStreak} onClick={() => run(G.claimEgg(couple.id, 'streak', streak.start))}>Reclamar huevo</button>
      </div>
      <div className="panel">
        <b>Opción B · El gran hito de cine</b>
        <small className="muted">50 títulos puntuados por los dos con Armonía superior a 80% (Match = diferencia de hasta 1 punto).</small>
        <div className="bar"><i style={{ width: Math.min(100, (h.total / (50 * ((g.claims.hito || 0) + 1))) * 100) + '%' }} /></div>
        <small>{h.total}/{50 * ((g.claims.hito || 0) + 1)} títulos · Armonía {h.pct}%</small>
        <button className="btn" disabled={!canHito} onClick={() => run(G.claimEgg(couple.id, 'hito'))}>Reclamar huevo</button>
      </div>
      <p className="muted small">Probabilidad del huevo ganado: Común 70% (24 h) · Raro 25% (48 h) · Legendario 5% (72 h).</p>
      <h2>Nuestra familia ({pets.length}/{G.MAX_PETS})</h2>
      {!pets.length && <p className="muted">Aquí aparecerán sus mascotas.</p>}
      {pets.map((p) => {
        const lv = G.levelOf(p.xp)
        return (
          <div key={p.id} className="panel egg">
            <span className="eggi">{G.PETS.find((x) => x.id === p.type).emoji}</span>
            <div>
              <b>{p.name}</b><small className="muted">Nv. {lv} · {G.PHASE_LABEL[G.phaseOf(lv)]} · {G.RARITY[G.PETS.find((x) => x.id === p.type).rarity].label}</small>
              {pets.length >= G.MAX_PETS && lv >= 15 && <button className="btn ghost" onClick={() => window.confirm(`¿Dejar ir a ${p.name} a la naturaleza? Pasará al Santuario.`) && run(G.graduate(couple.id, p.id))}>🌿 Graduar / Dejar ir a la naturaleza</button>}
            </div>
          </div>
        )
      })}
    </>
  )
}

function Shop({ g }) {
  const { couple } = useCtx()
  const [err, setErr] = useState('')
  const cats = [...new Set(G.SHOP.map((i) => i.cat))]
  return (
    <>
      <h2>Tienda 🪙 {g.coins}</h2>
      <p className="muted small">Ganan monedas completando actividades y subiendo de nivel a la mascota.</p>
      {err && <p className="error">{err}</p>}
      {cats.map((c) => (
        <section key={c}>
          <h3>{c}</h3>
          <div className="shop">
            {G.SHOP.filter((i) => i.cat === c).map((i) => {
              const owned = i.kind === 'wear' && g.owned.includes(i.id)
              return (
                <button key={i.id} disabled={owned} onClick={async () => { setErr(''); try { await G.buy(couple.id, i.id) } catch (e) { setErr(e.message) } }}>
                  <span className="se">{i.emoji}</span><b>{i.name}</b>
                  <small>{owned ? '✓ Tienen' : `🪙 ${i.price}${g.inv[i.id] ? ` · ×${g.inv[i.id]}` : ''}`}</small>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}

function Sanctuary({ g }) {
  const list = g.pets.filter((p) => p.gradAt)
  return (
    <>
      <h2>El Santuario 🌿</h2>
      {!list.length && <p className="empty">Aquí vivirán para siempre las mascotas que dejen ir a la naturaleza cuando sean adultas.</p>}
      {list.map((p) => (
        <div key={p.id} className="panel egg">
          <span className="eggi">{G.PETS.find((x) => x.id === p.type).emoji}</span>
          <div><b>{p.name}</b><small className="muted">Nivel {G.levelOf(p.xp)} · Adoptada el {fmtDate(p.adoptedAt)} · Se fue al campo el {fmtDate(p.gradAt)}</small></div>
        </div>
      ))}
    </>
  )
}

export function PetScreen() {
  const { couple } = useCtx()
  const g = couple.game
  const [sec, setSec] = useState('pet')
  if (!g) return <div className="spinner" />
  const pets = g.pets.filter((p) => !p.gradAt)
  const pet = pets.find((p) => p.id === g.activeId) || null
  const streak = G.streakInfo(g.days)
  return (
    <>
      <header className="top"><h1>UsTime</h1><div className="wallet"><span>🔥 {streak.n}</span><span>🪙 {g.coins}</span></div></header>
      <div className="seg">{[['pet', 'Mascota'], ['eggs', 'Huevos'], ['shop', 'Tienda'], ['sanct', 'Santuario']].map(([k, l]) => <button key={k} className={sec === k ? 'on' : ''} onClick={() => setSec(k)}>{l}</button>)}</div>
      {sec === 'pet' && <PetTab g={g} pet={pet} pets={pets} />}
      {sec === 'eggs' && <Eggs g={g} pets={pets} />}
      {sec === 'shop' && <Shop g={g} />}
      {sec === 'sanct' && <Sanctuary g={g} />}
    </>
  )
}
