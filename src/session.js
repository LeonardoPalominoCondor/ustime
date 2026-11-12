import { signOut } from 'firebase/auth'
import { auth } from './firebase'
// Cierre de sesión voluntario: se recuerda para no mostrar el aviso de “sesión expirada”.
export const logout = () => { sessionStorage.setItem('ustime_manual', '1'); return signOut(auth) }
