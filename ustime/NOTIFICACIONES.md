# Notificaciones en el teléfono (gratis, sin plan de pago)

## Cómo funciona
```
 Tu app ──(token del dispositivo)──▶ Firestore: pushTokens/{tú}   (solo tú lo lees)
 GitHub Actions (cada 30 min) ──▶ scripts/notify.mjs ──▶ decide qué avisar ──▶ Firebase Cloud Messaging ──▶ tu teléfono
```
FCM es gratis. No se usa Cloud Functions (que exige plan Blaze): el “servidor” es un trabajo programado de GitHub Actions.

## Qué avisa
| Aviso | Cuándo |
|---|---|
| 📅 Plan cercano | A la hora del recordatorio que elegiste; sin recordatorio: a las 9:00 del día del plan |
| 🥚 Huevo nuevo / 🐣 listo para eclosionar | Al ganar un huevo / cuando termina la cuenta atrás |
| 🔥 Racha en peligro | Entre 20:00 y 23:00 si llevan ≥ 2 días y hoy no hicieron nada |
| 🐾 Mascota | Hambre < 20 o muy sucia (de 8:00 a 22:00, máx. cada 6 h) |
| 💌 Frasco | Cuando tu pareja te deja una nota (no se muestra el texto) |
| 🎮 Juegos | Cuando te toca jugar |
Sin sonido entre 23:00 y 7:00 (salvo recordatorios de planes). Cada persona elige qué recibir en **Más → Perfil → 🔔 Notificaciones**.

## Configuración (una vez)
1. **Clave web push**: Firebase → Configuración del proyecto → **Cloud Messaging** → *Certificados push web* → **Generar par de claves**. Copia la clave a `VITE_FIREBASE_VAPID_KEY`. Copia el **ID del remitente** a `VITE_FIREBASE_SENDER_ID`.
2. **Cuenta de servicio**: Configuración → **Cuentas de servicio** → *Generar nueva clave privada* → pega **todo el JSON** como secreto `FIREBASE_SERVICE_ACCOUNT` en GitHub. ¡Nunca lo subas al repositorio!
3. Vuelve a publicar la app (producción y/o sitio de pruebas) y **pega de nuevo `firestore.rules`** (hay reglas para `pushTokens`).
4. En el teléfono: Más → Perfil → **Activar en este dispositivo** → acepta el permiso → **Enviar prueba** (notificación local).

## Probar en PRUEBAS (sin tocar producción)
1. Entra al sitio de pruebas (`…-test.web.app`) y activa las notificaciones ahí (se guardan en `test_pushTokens`).
2. GitHub → Actions → **Notificaciones push → Run workflow** → `target = test`, `mode = test-push`: te llega “🔔 Prueba de UsTime”.
3. Crea un plan para dentro de 20 min con recordatorio “A la hora” y ejecuta el workflow (`target = test`). O simula la hora: `now = 2026-11-10T19:00:00Z`.
4. `mode = dry` solo escribe en el registro lo que **enviaría**. En el panel 🛠 hay un botón “¿Qué enviaría el servidor ahora?”.
5. En tu PC: `npm run notify:fixture` ejecuta el planificador con datos de ejemplo, sin Firebase.

## Pasar a PRODUCCIÓN
Mismos pasos pero en el sitio real. El workflow programado ya procesa **producción y pruebas** en cada ejecución (colecciones distintas).

## Límites honestos
- **No es instantáneo**: GitHub ejecuta el trabajo cada ~30 min (puede retrasarse). Para más precisión usa repo público con `*/10`, o un cron externo gratuito (cron-job.org) que dispare el workflow.
- **iPhone**: solo funciona con la app instalada en la pantalla de inicio (iOS 16.4+).
- **APK (PWABuilder)**: activa “notification delegation” al generarlo; usa Chrome por dentro, así que reciben el mismo push.
- Si desinstalas la app o revocas el permiso, el token se limpia solo en el siguiente envío.
