
// Servidor GRATIS de notificaciones mediante GitHub Actions.
// Compatible con Firebase Admin SDK 14.x y Node.js 24.
//
// USO:
// Producción:
//   node scripts/notify.mjs
//
// Pruebas:
//   node scripts/notify.mjs --prefix test_
//
// Simulación sin enviar notificaciones:
//   node scripts/notify.mjs --prefix test_ --dry
//
// Simular una fecha:
//   node scripts/notify.mjs --prefix test_ --now 2026-11-10T19:00:00Z --dry
//
// Enviar push de prueba:
//   node scripts/notify.mjs --prefix test_ --test-push
//
// Ejecutar fixtures sin Firebase:
//   node scripts/notify.mjs --fixture datos.json

import fs from 'node:fs';

import { planNotifications } from '../src/notifyplan.js';

import { initializeApp, cert } from 'firebase-admin/app';
import {
  getFirestore,
  FieldPath,
  FieldValue
} from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// --------------------------------------------------
// ARGUMENTOS
// --------------------------------------------------

const args = Object.fromEntries(
  process.argv.slice(2)
    .map((a, i, all) =>
      a.startsWith('--')
        ? [
            a.slice(2),
            all[i + 1] && !all[i + 1].startsWith('--')
              ? all[i + 1]
              : true
          ]
        : null
    )
    .filter(Boolean)
);

const prefix = typeof args.prefix === 'string' ? args.prefix : '';
const dry = !!args.dry;

const tokenCollection = typeof args['token-collection'] === 'string'
  ? args['token-collection']
  : `${prefix}pushTokens`;

const now = args.now ? Date.parse(args.now) : Date.now();

const log = (...m) =>
  console.log(`[notify${prefix ? ':' + prefix : ''}]`, ...m);

// --------------------------------------------------
// VALIDAR FECHA
// --------------------------------------------------

if (Number.isNaN(now)) {
  console.error('Fecha inválida en --now');
  process.exit(1);
}

// --------------------------------------------------
// MODO FIXTURE: NO NECESITA FIREBASE
// --------------------------------------------------

if (args.fixture) {
  try {
    const f = JSON.parse(fs.readFileSync(args.fixture, 'utf8'));

    if (!Array.isArray(f.couples)) {
      throw new Error('El archivo debe contener un array couples.');
    }

    for (const c of f.couples) {
      const plan = planNotifications({
        now,
        ...c
      });

      log(`pareja ${c.couple.id}: ${plan.length} aviso(s)`);

      plan.forEach((p) => {
        log(
          ' •',
          p.kind,
          '→',
          (p.uids || []).join(','),
          '|',
          p.title,
          '|',
          p.body
        );
      });
    }

    process.exit(0);

  } catch (error) {
    console.error('Error ejecutando fixture:', error.message);
    process.exit(1);
  }
}

// --------------------------------------------------
// FIREBASE ADMIN SDK 14.x
// --------------------------------------------------

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('Falta la variable FIREBASE_SERVICE_ACCOUNT');
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch {
  console.error('FIREBASE_SERVICE_ACCOUNT no contiene JSON válido.');
  process.exit(1);
}

if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
  console.error('La cuenta de servicio no contiene los campos necesarios.');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);
const msg = getMessaging(app);

// --------------------------------------------------
// ENVÍO DE NOTIFICACIONES
// --------------------------------------------------

async function send(uid, tokens, n) {

  if (!tokens?.length) {
    log(`  → ${uid}: sin dispositivos registrados`);
    return;
  }

  // Firebase Multicast admite hasta 500 tokens por solicitud.
  // Dividimos automáticamente si hay más.

  for (let i = 0; i < tokens.length; i += 500) {

    const batch = tokens.slice(i, i + 500);

    if (dry) {
      log('  (simulado)', uid, n.title);
      continue;
    }

    const r = await msg.sendEachForMulticast({
      tokens: batch,

      data: {
        title: String(n.title || ''),
        body: String(n.body || ''),
        tag: String(n.tag || 'ustime'),
        url: String(n.url || '/')
      },

      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400'
        }
      }
    });

    const dead = batch.filter((_, index) => {
      const response = r.responses[index];

      return !response.success &&
        /registration-token-not-registered|invalid-argument|invalid-registration/
          .test(response.error?.code || '');
    });

    if (dead.length) {
      await db.doc(`${tokenCollection}/${uid}`).set(
        {
          tokens: FieldValue.arrayRemove(...dead)
        },
        { merge: true }
      );
    }

    log(
      `  → ${uid}: ${r.successCount} ok, ${r.failureCount} fallos`
    );
  }
}

// --------------------------------------------------
// OBTENER TOKENS
// --------------------------------------------------

const pushSnapshot = await db
  .collection(tokenCollection)
  .get();

log(`Colección de tokens: ${tokenCollection}`);
log(`Documentos encontrados: ${pushSnapshot.size}`);

for (const d of pushSnapshot.docs) {
  log(`UID: ${d.id} | Tokens: ${d.data().tokens?.length || 0}`);
}

const pushDocs = Object.fromEntries(
  pushSnapshot.docs.map((d) => [d.id, d.data()])
);

// --------------------------------------------------
// MODO TEST PUSH
// --------------------------------------------------

if (args['test-push']) {

  let enviados = 0;

  for (const [uid, p] of Object.entries(pushDocs)) {

    if (!p.tokens?.length) continue;

    await send(uid, p.tokens, {
      title: '🔔 Prueba de UsTime',
      body: 'Si ves esto, las notificaciones push funcionan 🎉',
      tag: 'test'
    });

    enviados++;
  }

  log(`Prueba finalizada · ${enviados} usuario(s) procesados`);

  process.exit(0);
}

// --------------------------------------------------
// PROCESAR PAREJAS
// --------------------------------------------------

const couplesSnapshot = await db
  .collection(`${prefix}couples`)
  .get();

let total = 0;

for (const cd of couplesSnapshot.docs) {

  const couple = {
    id: cd.id,
    ...cd.data()
  };

  const cid = cd.id;

  // Obtener eventos, frasco y juegos.

  const [ev, jar, games] = await Promise.all(
    ['events', 'jar', 'games'].map(async (s) => {

      const snapshot = await db
        .collection(`${prefix}couples/${cid}/${s}`)
        .get();

      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

    })
  );

  // Obtener usuarios y preferencias.

  const users = {};

  for (const uid of couple.members || []) {

    const [userSnapshot] = await Promise.all([
      db.doc(`${prefix}users/${uid}`).get()
    ]);

    const u = userSnapshot.data() || {};
    const p = pushDocs[uid] || {};

    users[uid] = {
      username: u.username,
      tz: p.tz,
      prefs: p.prefs,
      tokens: p.tokens || []
    };
  }

  // Planificar notificaciones.

  const plan = planNotifications({
    now,
    couple,
    events: ev,
    jar,
    games,
    users
  });

  const updates = [];

  // Enviar notificaciones.

  for (const n of plan) {

    for (const uid of n.uids || []) {

      const user = users[uid];

      if (!user) {
        log(`  → Usuario ${uid} no encontrado`);
        continue;
      }

      await send(uid, user.tokens, n);
    }

    updates.push(
      new FieldPath('notified', n.key),
      now
    );

    total++;
  }

  // Limpiar registros antiguos.

  const old = Object.entries(couple.notified || {})
    .filter(([, t]) => now - t > 30 * 864e5)
    .flatMap(([k]) => [
      new FieldPath('notified', k),
      FieldValue.delete()
    ]);

  // No actualizar Firestore en modo dry.

  if (!dry && (updates.length || old.length)) {
    await cd.ref.update(...updates, ...old);
  }

  if (plan.length) {
    log(`pareja ${cid}: ${plan.length} aviso(s)`);
  }
}

// --------------------------------------------------
// RESULTADO FINAL
// --------------------------------------------------

log(
  `listo · ${total} aviso(s)` +
  (dry ? ' (simulación, no se envió nada)' : '')
);
