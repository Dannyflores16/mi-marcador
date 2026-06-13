// ─────────────────────────────────────────
// src/firebase.js
//
// CÓMO OBTENER TUS VALORES:
// 1. Ve a https://console.firebase.google.com
// 2. Clic "Agregar proyecto" → nombre → Crear
// 3. Build → Realtime Database → Crear base de datos
//    → Modo de prueba → Habilitar
// 4. ⚙️ Configuración del proyecto → General
//    → Tus apps → clic en </>  → Registrar app
// 5. Copia el firebaseConfig que aparece
// 6. Pega los valores abajo reemplazando cada "TU_..."
// ─────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getDatabase }   from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyA5N4NGzl-AE6cUegN2eiJkr5-U6TEe3gY",
  authDomain:        "mi-marcador.firebaseapp.com",
  databaseURL:       "https://mi-marcador-default-rtdb.firebaseio.com",
  projectId:         "mi-marcador",
  storageBucket:     "mi-marcador.firebasestorage.app",
  messagingSenderId: "1083375859136",
  appId:             "1:1083375859136:web:778626403b0b32987fc425",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);