# Cómo probar UsTime antes de publicar

## 1. Pruebas automáticas (30 segundos)
```
npm install
npm test
```
Cubren: niveles y etapas, huevos (24/48/72 h, 70/25/5 %), necesidades por etapa, XP y límites diarios,
evolución (el pañal vuelve al inventario), inventario compartido, tienda, misiones, minijuegos,
crianza compartida sin pisarse, migración desde la v2, eventos repetidos (aniversarios), recordatorios,
línea de tiempo sin duplicados, y la interfaz real (Inicio, mascotas, calendario, borrar/reemplazar fotos, perfil, emojis).

## 2. Modo de pruebas (datos y cuentas falsas, tiempo acelerado)
1. Copia `.env.test.example` a `.env.test` (pon tu clave de TMDB si quieres buscar películas).
2. Necesitas **Java 11+** (para el emulador). En una terminal: `npm run emulators`  (UI del emulador: http://localhost:4000).
3. En otra terminal: `npm run dev:test` y abre la URL. Verás la franja amarilla **MODO PRUEBAS** y el botón 🛠.
4. En el login aparece la ventana del emulador: **“Add new account”** → crea cuentas falsas. No toca tu Firebase real.

### Probar dos cuentas (sincronización)
Ventana normal = cuenta A, ventana privada = cuenta B (ambas en la misma URL). A crea el espacio, B se une con el código.
Haz acciones en una y mira cómo se reflejan en la otra (mascota, buzón, fotos, puntuación a ciegas).

### Panel 🛠
| Sección | Para qué sirve |
|---|---|
| ⏱ Tiempo | +1 h / +6 h / +24 h / +7 d / +30 d: necesidades, huevos, rachas, recordatorios |
| ⚙️ Intervalos | Eclosión en 10 s o 1 min; necesidades ×10 / ×60. Solo afecta al build de pruebas |
| 🐾 Mascotas | Poner etapa bebé/niño/adulto, monedas, objetos, huevos, familia llena (10), racha de 30 días, reiniciar |
| 👥 Pareja | Acciones “como si fuera tu pareja” (si estás solo) |
| 🧪 Datos ficticios | Crea/borra títulos y planes reproducibles (semilla 42) |
| 🔐 Sesión | Usuario nuevo · sin vincular · sesión expirada · carga lenta · error de red |
| 📡 Red | Modo sin conexión, cerrar y reabrir, borrar datos locales |

## 3. Checklist manual (antes de cada publicación)
**Novedades v4**
- [ ] Calendario: elegir 5 fotos de golpe → se agregan juntas; con 10 ya no ofrece agregar; reemplazar y borrar siguen pidiendo confirmación.
- [ ] Botón/gesto «atrás»: cierra ventanas; en una pestaña distinta de Inicio vuelve a la anterior; en Inicio sale de la app.
- [ ] ✏️ renombrar mascota (también en Familia); el buzón registra el cambio.
- [ ] Tienda: categorías con scroll, vista previa con cuello/mano; objetos de etapa bebé se devuelven al evolucionar.
- [ ] Baño: frotar hasta cubrir de espuma → ducha → termina y suma limpieza. Cuarto: cepillar dientes (arrastrar) y luego dormir.
- [ ] Frasco: escribir una nota, verla caer en el frasco de la pareja; la pareja la abre y se marca leída; “Sacar una” y “Agitar”.
- [ ] Notas: agregar, marcar hecha, editar, borrar con confirmación (se ve en el otro teléfono).
- [ ] Juegos: con las dos cuentas, jugar 1 partida de cada tipo (por turnos, simultáneos y secretos); revancha.
- [ ] Notificaciones: activar, prueba local, workflow `test-push`, plan con recordatorio, racha en peligro (🛠 +24 h).

**Sesión**
- [ ] Abrir con sesión y pareja vinculadas → pasa de “Abriendo UsTime…” directo a Inicio (sin “Unan sus cuentas”).
- [ ] Cerrar y reabrir 5 veces (también en modo avión) → nunca aparece la pantalla de vinculación por error.
- [ ] 🛠 Usuario nuevo → pide perfil. Sin vincular → pide código. Sesión expirada → aviso claro.
- [ ] Error de red → pantalla con “Reintentar”.

**Calendario y fotos**
- [ ] Crear plan con categoría, emoji del selector (buscar “cohete”), color, recordatorio y repetición anual.
- [ ] Vistas Mes / Semana / Agenda; el aniversario aparece cada año con ✨.
- [ ] Subir 2 fotos → reemplazar una → eliminar otra (pide confirmación) → el otro dispositivo lo ve al instante.
- [ ] Marcar “Cumplido” con foto → +40 XP una sola vez (aunque cambies de estado y vuelvas).
- [ ] Editar plan y borrar plan.

**Recuerdos**
- [ ] La línea de tiempo muestra películas, series y planes (con fotos y descripción). Sin duplicados.
- [ ] Filtros funcionan; al tocar un elemento se abre su detalle.

**Perfil**
- [ ] Cambiar emoji/fondo/marco/color: la vista previa cambia antes de guardar; al guardar y reabrir se mantiene.
- [ ] Marcos bloqueados indican qué falta.

**Mascotas**
- [ ] Huevo: nombre (máx. 10) → incubar → cuenta atrás → eclosionar.
- [ ] Probar las 3 etapas (🛠): diseños y animaciones distintos; pañal solo en bebé; al evolucionar vuelve al inventario.
- [ ] Alimentar, bañar, acariciar, dormir, jugar: cada una anima, cambia la barra y se guarda.
- [ ] Dos cuentas alimentando/bañando a la vez → ambos cambios se conservan; el buzón muestra quién fue.
- [ ] Tienda: vista previa, comprar, equipar, quitar; el mismo objeto sirve a varias mascotas.
- [ ] Misiones diarias, bono de 100 XP, minijuegos (3 con recompensa completa por día).
- [ ] Llenar familia (10) → graduar adulta → aparece en el Santuario.
- [ ] “Reducir animaciones” en Perfil (o del sistema) desactiva los movimientos.

**Producción**
- [ ] `npm run build` (sin `--mode test`) → buscar “MODO PRUEBAS” en `dist/assets/*.js`: debe dar 0 resultados.
