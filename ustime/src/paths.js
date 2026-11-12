// Separación producción / pruebas.
// TEST solo es true si el build se hizo con VITE_TEST_MODE=true. En producción Vite elimina todo el código de pruebas.
export const TEST = import.meta.env.VITE_TEST_MODE === 'true'
const P = TEST ? 'test_' : ''
export const USERS = P + 'users'
export const COUPLES = P + 'couples'
export const PUSH = P + 'pushTokens'
