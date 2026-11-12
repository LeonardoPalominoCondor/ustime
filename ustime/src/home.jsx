import React, { useContext, useEffect, useState } from 'react'
import { Ctx } from './ctx.js'
import { Avatar } from './avatar.jsx'
import { PetArt } from './petart.jsx'
import { Bar } from './ui.jsx'
import { useTick } from './hooks'
import { occurrences } from './events.js'
import * as G from './game.js'
import { getCfg } from './clock'

const Tile = ({ icon, title, sub, onClick, color }) => <button className="tile" style={{ '--c': color }} onClick={onClick}><span>{icon}</span><b>{title}</b><small>{sub}</small></button>

export function Inicio() {
  const { profile, members, partnerUid, uids, couple, entries, events, jar = [], user, game: g, go, openEvent, openMail, unread } = useContext(Ctx)
  const jarUnread = jar.filter((n) => n.to === user.uid && !n.readAt).length
  const t = useTick(15000)
  const partner = partnerUid ? members[partnerUid] : null
  const loadingPartner = partnerUid && !partner
  const pet = g && G.activePet(g)
  const mood = pet && G.moodOf(pet, t, getCfg().decay ?? 1)
  const from = G.dayOf(t)
  const upcoming = occurrences(events, from, G.dayOf(t + 90 * 864e5)).filter((e) => e.status === 'planned').slice(0, 3)
  const seen = entries.filter((e) => e.status === 'visto').length
  const streak = g ? G.streakInfo(g.days, t).n : 0
  const ms = G.missionsFor(from), prog = g?.missions.date === from ? g.missions : { progress: {}, claimed: {} }
  const doneM = ms.filter((m) => prog.claimed[m.id] || (prog.progress[m.key] || 0) >= m.goal).length
  const memories = seen + events.filter((e) => e.status === 'done' || e.done).length
  return (
    <>
      <header className="hero-home">
        <div className="duo">{<Avatar p={profile} size={56} />}{partner ? <Avatar p={partner} size={56} /> : <span className="av ghost-av">?</span>}</div>
        <div>
          <h1>{loadingPartner ? <>Hola, {profile.username}</> : partner ? <>Hola, <span style={{ color: profile.color }}>{profile.username}</span> y <span style={{ color: partner.color }}>{partner.username}</span></> : <>Hola, {profile.username}</>}</h1>
          <p className="muted">{partner ? 'Su espacio compartido 💞' : <>Esperando a tu pareja · código <b className="gold">{couple.id}</b></>}</p>
        </div>
      </header>
      {!partner && !loadingPartner && <div className="panel hint-p">💌 Comparte el código <b>{couple.id}</b> con tu pareja. Cuando se una, aquí verás sus nombres y podrán puntuar a ciegas.</div>}
      {g && (
        <button className="homepet" onClick={() => go('pets')} aria-label="Ir a la mascota">
          {pet ? <><div className="hp-art"><PetArt type={pet.type} stage={pet.stage} mood={mood.mood} anim={pet.sleeping ? 'sleep' : 'idle'} equip={G.equipOf(pet)} size={120} /></div>
            <div><b>{pet.name}</b><small className="muted">Nv. {G.levelOf(pet.xp)} · {G.STAGE_LABEL[pet.stage]}</small>
              <Bar label="Hambre" icon="🍽️" v={mood.needs.hunger} /><Bar label="Ánimo" icon="🎈" v={mood.needs.fun} />
              {mood.mood === 'sad' && <small className="hint">Te necesita: {G.NEED_LABEL[mood.lowest].toLowerCase()} baja</small>}</div></>
            : <><div className="hp-art"><span className="bigemoji">🥚</span></div><div><b>Tienen un huevo esperando</b><small className="muted">Pónganle nombre e incúbenlo</small></div></>}
        </button>
      )}
      <div className="stats"><div><b>🔥 {streak}</b><small>racha</small></div><div><b>{seen}</b><small>títulos</small></div><div><b>{memories}</b><small>recuerdos</small></div><div><b>{doneM}/3</b><small>misiones</small></div></div>
      <h2>Accesos</h2>
      <div className="tiles">
        <Tile icon="📅" title="Calendario" sub={upcoming[0] ? `${upcoming[0].icon} ${upcoming[0].title}` : 'Agenda un plan'} color="#FF9F43" onClick={() => go('agenda')} />
        <Tile icon="🎞️" title="Recuerdos" sub={`${memories} momentos`} color="#9B7BFF" onClick={() => go('more', 'mem')} />
        <Tile icon="🎬" title="Cine" sub="Cartelera y descubrir" color="#FF4F8B" onClick={() => go('cine')} />
        <Tile icon="🐾" title="Mascotas" sub={pet ? `${pet.name} · nivel ${G.levelOf(pet.xp)}` : 'Su huevo'} color="#5BD6A0" onClick={() => go('pets')} />
        <Tile icon="🎮" title="Juegos" sub="20 juegos de a dos" color="#4DD4E6" onClick={() => go('games')} />
        <Tile icon="🫙" title="Frasco" sub={jarUnread ? `${jarUnread} mensaje${jarUnread > 1 ? 's' : ''} sin leer 💌` : 'Mensajes para leer cuando lo necesites'} color="#FFC857" onClick={() => go('more', 'jar')} />
        <Tile icon="📝" title="Notas" sub="Ideas y pendientes" color="#8BD450" onClick={() => go('more', 'notes')} />
        <Tile icon="👤" title="Perfil" sub="Avatares y marcos" color="#E27BFF" onClick={() => go('more', 'me')} />
      </div>
      {!!upcoming.length && <><h2>Próximos planes</h2>{upcoming.map((e) => <button key={e.key} className="evchip planned" style={{ '--c': e.color }} onClick={() => openEvent(e.id)}><span>{e.icon}</span><b>{e.title}</b><small>{new Date(e.date + 'T12:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })} {e.time}</small></button>)}</>}
    </>
  )
}
