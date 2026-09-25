# Nanosub - Traductor en Tiempo Real con Gemini Nano

Demostración de aplicación web de traducción en tiempo real procesada **100% en el navegador (On-Device)** utilizando:

1. **Gemini Nano** integrado en el navegador mediante las APIs de Built-in AI de Google Chrome (`window.LanguageModel` y `window.Translator`).
2. **Web Speech API** (`SpeechRecognition`) para capturar la voz del micrófono y transcribir el audio en tiempo real.
3. **Pantalla dividida en tiempo real**: Panel superior con la transcripción en inglés (con visualización de palabras intermedias y consolidadas) y panel inferior con la traducción en vivo generada por el LLM.

---

## 🚀 Cómo Iniciar la Demo

1. Abre una terminal en este directorio:
   ```bash
   python server.py
   ```
2. Abre tu navegador Google Chrome en:
   **[http://localhost:3000](http://localhost:3000)**

> **¿Por qué un servidor local?**
> Tanto la Web Speech API como las APIs de Chrome Built-in AI requieren un contexto seguro (`http://localhost` o `https://`) para otorgar permisos de micrófono y acceso al modelo.

---

## 🛠️ Activación de Gemini Nano en Google Chrome

Para ejecutar Gemini Nano nativamente en tu dispositivo:

1. **Requisitos:**
   - Google Chrome (versión 138+ o versiones Dev/Canary de 64-bit).
   - 16 GB+ de RAM y GPU con soporte para DirectML/WebGPU.
   - Espacio en disco disponible (~22 GB de cuota libre en el perfil).

2. **Flags de Chrome:**
   Escribe en la barra de direcciones de Chrome:
   - `chrome://flags/#prompt-api-for-gemini-nano` -> **Enabled**
   - `chrome://flags/#optimization-guide-on-device-model` -> **Enabled BypassPerfRequirement**
   - `chrome://flags/#translation-api` -> **Enabled**

3. **Reinicia el navegador:** Haz clic en **Relaunch**.

4. **Verificación de descarga del modelo:**
   - Entra en `chrome://components`.
   - Busca **Optimization Guide On Device Model**.
   - Haz clic en **Check for update** para forzar la descarga de Gemini Nano localmente.

### Modo Fallback / Simulación

Si abres la aplicación en un navegador donde las flags de Gemini Nano aún no estén activadas, la aplicación detectará automáticamente esta situación y activará el **Modo Fallback Inteligente**. Esto te permite validar todo el flujo de micrófono, transcripción continua, visualización dividida y traducción inmediata sin errores.

---

## 📁 Estructura del Proyecto

```
gemini-nano-realtime-translator/
├── index.html          # Interfaz principal de pantalla dividida y controles
├── styles.css          # Estilos modernos con modo oscuro, Glassmorphism y animaciones
├── server.py           # Servidor HTTP local en Python para localhost:3000
├── js/
│   ├── speech.js       # Servicio Web Speech API (interim y final transcripts)
│   ├── nano-engine.js  # Motor de Gemini Nano (LanguageModel, Translator y Fallback)
│   └── app.js          # Controlador que orquesta voz -> traducción en streaming
└── README.md           # Documentación y guía de uso
```

---

## 💡 Cómo Usar la Aplicación

1. **Prueba con Micrófono:**
   - Haz clic en **"Iniciar Micrófono"**.
   - Concede permisos de micrófono en Chrome si te lo solicita.
   - Habla en inglés (por ejemplo: _"Good morning, how are you today?"_).
   - Observa cómo en el panel superior aparece el texto en inglés en tiempo real y el panel inferior genera la traducción inmediata.

2. **Prueba Rápida con Chips (Sin Micrófono):**
   - Si estás en un entorno ruidoso o quieres verificar inmediatamente la traducción, haz clic en cualquiera de los botones de **"Frases de prueba rápida"**.
   - Simulará la llegada progresiva de voz y la traducción en streaming.

3. **Cambio de Idioma:**
   - Usa el selector desplegable para traducir a **Español, Francés, Alemán, Portugués, Italiano, Japonés o Chino**.
