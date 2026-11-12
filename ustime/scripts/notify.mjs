// Servidor GRATIS de notificaciones: se ejecuta con GitHub Actions cada pocos minutos (no necesita plan Blaze).
// Uso:  node scripts/notify.mjs --prefix ""        (producción)
//       node scripts/notify.mjs --prefix test_      (pruebas)
//       node scripts/notify.mjs --prefix test_ --dry          (solo muestra qué enviaría)
//       node scripts/notify.mjs --prefix test_ --now 2026-11-10T19:00:00Z --dry   (simula la hora del servidor)
//       node scripts/notify.mjs --prefix test_ --test-push    (envía “🔔 prueba” a todos los dispositivos registrados)
//       node scripts/notify.mjs --fixture datos.json          (sin Firebase: planifica a partir de un archivo)
import fs from 'node:fs'
import { planNotifications } from '../src/notifyplan.js'

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true] : null)).filter(Boolean))
const prefix = typeof args.prefix === 'string' ? args.prefix : '', dry = !!args.dry, now = args.now ? Date.parse(args.now) : Date.now()
const log = (...m) => console.log(`[notify${prefix ? ':' + prefix : ''}]`, ...m)

if (args.fixture) {
  const f = JSON.parse(fs.readFileSync(args.fixture, 'utf8'))
  for (const c of f.couples) { const plan = planNotifications({ now, ...c }); log(`pareja ${c.couple.id}: ${plan.length} aviso(s)`); plan.forEach((p) => log(' •', p.kind, '→', p.uids.join(','), '|', p.title, '|', p.body)) }
  process.exit(0)
}

const { default: admin } = await import('firebase-admin')
if (!process.env.FIREBASE_SERVICE_ACCOUNT) { console.error('Falta el secreto FIREBASE_SERVICE_ACCOUNT'); process.exit(1) }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
const db = admin.firestore(), msg = admin.messaging()
const FP = admin.firestore.FieldPath

async function send(uid, tokens, n) {
  if (dry) { log('  (simulado)', uid, n.title); return }
  const r = await msg.sendEachForMulticast({ tokens, data: { title: n.title, body: n.body, tag: n.tag || 'ustime', url: n.url || '/' }, webpush: { headers: { Urgency: 'high', TTL: '86400' } } })
  const dead = tokens.filter((_, i) => !r.responses[i].success && /registration-token-not-registered|invalid-argument|invalid-registration/.test(r.responses[i].error?.code || ''))
  if (dead.length) await db.doc(`${prefix}pushTokens/${uid}`).set({ tokens: admin.firestore.FieldValue.arrayRemove(...dead) }, { merge: true })
  log(`  → ${uid}: ${r.successCount} ok, ${r.failureCount} fallos`)
}

const pushDocs = Object.fromEntries((await db.collection(`${prefix}pushTokens`).get()).docs.map((d) => [d.id, d.data()]))
if (args['test-push']) {
  for (const [uid, p] of Object.entries(pushDocs)) if (p.tokens?.length) await send(uid, p.tokens, { title: '🔔 Prueba de UsTime', body: 'Si ves esto, las notificaciones push funcionan 🎉', tag: 'test' })
  process.exit(0)
}
const couples = await db.collection(`${prefix}couples`).get()
let total = 0
for (const cd of couples.docs) {
  const couple = { id: cd.id, ...cd.data() }, cid = cd.id
  const [ev, jar, games] = await Promise.all(['events', 'jar', 'games'].map(async (s) => (await db.collection(`${prefix}couples/${cid}/${s}`).get()).docs.map((d) => ({ id: d.id, ...d.data() }))))
  const users = {}
  for (const uid of couple.members || []) { const u = (await db.doc(`${prefix}users/${uid}`).get()).data() || {}, p = pushDocs[uid] || {}; users[uid] = { username: u.username, tz: p.tz, prefs: p.prefs, tokens: p.tokens || [] } }
  const plan = planNotifications({ now, couple, events: ev, jar, games, users })
  const updates = []
  for (const n of plan) { for (const uid of n.uids) await send(uid, users[uid].tokens, n); updates.push(new FP('notified', n.key), now); total++ }
  const old = Object.entries(couple.notified || {}).filter(([, t]) => now - t > 30 * 864e5).flatMap(([k]) => [new FP('notified', k), admin.firestore.FieldValue.delete()])
  if (!dry && (updates.length || old.length)) await cd.ref.update(...updates, ...old)
  if (plan.length) log(`pareja ${cid}: ${plan.length} aviso(s)`)
}
log(`listo · ${total} aviso(s)${dry ? ' (simulación, no se envió nada)' : ''}`)
