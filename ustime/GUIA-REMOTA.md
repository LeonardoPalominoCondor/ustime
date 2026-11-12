# Trabajar desde cualquier lugar (y probar sin tocar producción)

## 1 · Subir tu carpeta a GitHub (una sola vez, en tu PC)
1. Instala Git (git-scm.com) y crea una cuenta en github.com. Crea un repositorio **privado** vacío llamado `ustime`.
2. En la carpeta del proyecto:
```
git init -b main
git add .
git commit -m "UsTime v4"
git remote add origin https://github.com/TU_USUARIO/ustime.git
git push -u origin main
git checkout -b develop
git push -u origin develop
```
`.env` y `.env.test` **no se suben** (están en `.gitignore`): tus claves se quedan contigo.

## 2 · Editar en tiempo real desde cualquier dispositivo
| Opción | Cómo | Para qué |
|---|---|---|
| **github.dev** | Abre tu repo en GitHub y pulsa la tecla **.** | Editar código desde el navegador (celular o tablet incluidos). Sin terminal |
| **Codespaces** | Repo → **Code → Codespaces → Create** | VS Code completo en la nube con terminal; ya trae Node y Java (`.devcontainer/`). 60 h/mes gratis |
| **Tu PC** | `git pull` / `git push` | Mantener todo sincronizado |
Siempre: edita → `git commit` → `git push`. En otro lugar: `git pull`.

## 3 · Modo pruebas en la nube (recomendado)
Un **segundo sitio de Firebase Hosting** ejecuta el build de pruebas y usa las colecciones `test_*` de tu mismo proyecto. Producción no se toca.
1. `firebase hosting:sites:create TU-PROYECTO-test`
2. Edita `.firebaserc` (cambia `TU-PROYECTO-ID`) o ejecuta:
   `firebase target:apply hosting prod TU-PROYECTO` y `firebase target:apply hosting test TU-PROYECTO-test`
3. Firebase → Authentication → Configuración → **Dominios autorizados**: agrega `TU-PROYECTO-test.web.app`.
4. GitHub → Settings → Secrets and variables → Actions → crea: `FIREBASE_SERVICE_ACCOUNT`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_SENDER_ID`, `VITE_FIREBASE_VAPID_KEY`, `VITE_TMDB_KEY`.
5. Flujo diario: trabaja en la rama **develop** → al hacer `push`, GitHub corre las pruebas y publica en **`TU-PROYECTO-test.web.app`** (con la franja amarilla “MODO PRUEBAS” y el botón 🛠). Pruébalo en tu celular.
6. Cuando todo esté bien: fusiona `develop` en `main` → se publica en **producción**.

**Alternativa con Codespaces:** crea `.env.test` (copia `.env.test.example`) con `VITE_USE_EMULATOR=false` y tus claves, ejecuta `npm run dev:test`, abre el puerto 5173 (ponlo “Public”) en tu celular y agrega `*.app.github.dev` a los dominios autorizados de Firebase Auth. (El emulador local de Firebase solo sirve si abres el Codespace con VS Code de escritorio.)

## 4 · Comprobación automática
Cada `push` ejecuta `npm test`, compila producción y **falla si el build de producción contiene herramientas de prueba**.
