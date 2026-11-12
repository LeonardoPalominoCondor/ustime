# UsTime 💞

PWA (se instala en el celular desde el navegador). Costo: **$0** con los planes gratuitos de Firebase y TMDB.

## 1. Requisitos
- Node.js 18+ (nodejs.org)
- Cuenta de Google

## 2. TMDB (catálogo, cartelera y plataformas)
1. Crea cuenta en https://www.themoviedb.org
2. Configuración > API > solicita una API Key (uso personal).
3. Copia la "API Key (v3 auth)".

## 3. Firebase (login con Google + base de datos)
1. https://console.firebase.google.com > Agregar proyecto (puedes desactivar Analytics).
2. **Authentication** > Comenzar > Método de acceso > activa **Google**.
3. **Firestore Database** > Crear base de datos > modo producción.
4. En la pestaña **Reglas** pega el contenido de `firestore.rules` y publica (¡si actualizas desde la versión anterior, vuelve a pegarlas: hay reglas nuevas para agenda y preguntas!).
5. Configuración del proyecto > Tus apps > **Web (</>)** > registra la app y copia los valores de configuración.

## 4. Variables de entorno
Copia `.env.example` a `.env` y rellena los valores de Firebase y TMDB.

## 5. Probar en tu computadora
```
npm install
npm run dev
```
Abre la URL que aparece. Con `--host` también puedes abrirla desde tu celular (misma red wifi).

## 6. Publicarla gratis (para usarla en el celular)
Opción Firebase Hosting:
```
npm install -g firebase-tools
firebase login
firebase init hosting     # carpeta pública: dist | SPA: sí
npm run build
firebase deploy
```
Luego en Authentication > Configuración > Dominios autorizados verifica que esté tu dominio `*.web.app`.
Usa ese mismo dominio como `VITE_FIREBASE_AUTH_DOMAIN` para que el login funcione bien en móviles.

## 7. Instalar en el celular
Abre la URL en Chrome (Android) o Safari (iPhone) > menú > "Añadir a pantalla de inicio".

## 8. Primer uso
1. Entran los dos con Google y crean su perfil (avatar + usuario).
2. Uno toca "Crear nuestro espacio" y le pasa el código de 6 letras al otro.
3. El otro lo escribe en "Ya tengo un código".

## Privacidad ("solo para nosotros")
Las reglas de Firestore solo dejan leer/escribir la lista a los 2 miembros del espacio.
Cuando ya estén los dos unidos, nadie más puede entrar (el espacio admite máximo 2 personas).

## Estructura
- `src/App.jsx` login, perfil, pareja, navegación
- `src/screens.jsx` pantallas (Inicio, Buscar, Descubrir, Lista, Logros, Perfil, Ficha)
- `src/tmdb.js` API de películas, moods y plataformas
- `src/db.js` guardado en Firestore
- `src/achievements.js` lista de logros (agrega los tuyos aquí)

## Novedades (v2)
- Puntuación con medios íconos (escala 10), a ciegas, con Match (±1 punto) y bonus.
- Fecha de visión + Línea de tiempo en pareja.
- Agenda de pareja con íconos, citas con foto y "Agendar velada" desde una película pendiente.
- Mascota: huevos (racha de 30 días o 50 títulos con armonía >80%), eclosión 24/48/72 h, 3 fases (nv. 5 y 15), XP, monedas, tienda, Santuario y límite de 10.
- Pregunta del día (cuenta para la racha).

### Decisiones para mantener el costo en $0
- **Fotos de las citas**: Firebase Storage ya exige plan de pago, así que cada foto se reduce (~60 KB) y se guarda dentro de Firestore. Si algún día suben muchas fotos, conviene migrar a Storage.
- **Notificaciones push**: requieren Cloud Functions (plan Blaze, con tarjeta). Por ahora los mensajes de la mascota aparecen **dentro de la app** (globo de diálogo). Más adelante se pueden añadir.
- **Puntuación "a ciegas"**: se oculta en la interfaz. Como no hay servidor, alguien con conocimientos técnicos podría ver los datos en la consola; para una pareja es más que suficiente.

## Cambiar el ícono de la app
Todos los íconos están en la carpeta `public/`. **Reemplaza los archivos manteniendo el mismo nombre y tamaño**:

| Archivo | Tamaño | Uso |
|---|---|---|
| `icon-512.png` | 512×512 | Ícono principal (instalación, APK) |
| `icon-192.png` | 192×192 | Ícono de instalación |
| `icon-maskable-512.png` | 512×512 | Android lo recorta en círculo/cuadrado: deja el dibujo dentro del 80% central |
| `icon-180.png` | 180×180 | iPhone |
| `icon.svg` | cualquiera | Favicon de la pestaña |

Luego: `npm run build` y `firebase deploy`. Si ya instalaste la app, desinstálala y vuelve a instalarla para ver el ícono nuevo.
Para el APK, vuelve a generarlo en PWABuilder después de subir el ícono.

## Generar el APK (sin Play Store)
Lo más fácil y gratis es **PWABuilder**, que empaqueta la web ya publicada:
1. Publica la app (paso 6) y verifica que abre en `https://TU-PROYECTO.web.app`.
2. Entra a https://www.pwabuilder.com, pega esa URL y pulsa **Start**.
3. Ve a **Package for stores > Android** y elige **Other Android / APK** (opción de instalación directa).
4. Pon nombre **UsTime**, deja el ID de paquete que sugiere (ej. `app.web.tuproyecto.twa`) y descarga el ZIP.
5. Dentro viene el `.apk` firmado y un archivo `assetlinks.json`. Copia `assetlinks.json` a `public/.well-known/assetlinks.json`, haz `npm run build` y `firebase deploy` (así la app abre sin barra del navegador).
6. Pasa el `.apk` al celular y ábrelo (activa "Instalar apps desconocidas" para tu gestor de archivos).
Guarda bien el archivo de firma (keystore) que viene en el ZIP: lo necesitarás para actualizar el APK.
El login con Google funciona porque la app corre sobre Chrome (no en un WebView).
