# NanoSub - Subtítulos en Tiempo Real y Notas Inteligentes con Gemini Nano

**NanoSub** es una aplicación web de subtitulado en vivo y generación automática de notas impulsada al **100% por Inteligencia Artificial On-Device** dentro de Google Chrome, combinando la **Web Speech API**, la **Chrome Translator API** y el modelo **Gemini Nano** (`window.LanguageModel`).

Tanto la transcripción de voz, como la traducción instantánea y la síntesis de notas se ejecutan **localmente en tu dispositivo**, garantizando **cero costos de servidores de nube**, latencia ultra-baja y **privacidad absoluta**.

---

## 🌟 Arquitectura de 3 Componentes

La interfaz sigue un diseño minimalista de 3 tarjetas inspirado en el [Google Gemini AI Visual Design](https://design.google/library/gemini-ai-visual-design):

```
+-------------------------------------------------------------------------+
|  1. TARJETA SUPERIOR: Voz en Inglés (Web Speech API)                   |
|  Muestra únicamente la frase activa en curso (interim & final).         |
+-------------------------------------------------------------------------+
                                    |
                                    v (en tiempo real)
+-------------------------------------------------------------------------+
|  2. TARJETA CENTRAL: Subtítulo Traducido (Chrome Translator API)       |
|  Traduce palabra por palabra en streaming al idioma seleccionado.       |
+-------------------------------------------------------------------------+
                                    |
                                    v (en segundo plano)
+-------------------------------------------------------------------------+
|  3. TARJETA INFERIOR: Smart Notes (Gemini Nano Prompt API)             |
|  Buffer de contexto oculto -> Síntesis periódica de ideas clave.        |
+-------------------------------------------------------------------------+
```

1. **Tarjeta 1 (Audio / Transcripción en vivo):**
   - Captura la voz del micrófono usando la **Web Speech API** en modo continuo (`interimResults = true`).
   - Muestra sólo la frase que se está pronunciando en ese instante, evitando saturar la vista con párrafos de historial.
   - Cuenta con indicador de partículas con los cuatro colores de Google que ondula al hablar.

2. **Tarjeta 2 (Traducción en tiempo real):**
   - Utiliza la **Chrome Translator API** (`window.Translator`) para traducir en streaming con latencia de milisegundos.
   - Selector discreto de idioma destino: Español 🇪🇸, Francés 🇫🇷, Alemán 🇩🇪, Portugués 🇵🇹, Italiano 🇮🇹, Japonés 🇯🇵 o Chino 🇨🇳.
   - Si la Translator API no está disponible, conmuta automáticamente a **Gemini Nano (`LanguageModel`)**.

3. **Tarjeta 3 (Smart Notes con Contexto Oculto):**
   - **Contexto Oculto:** Todo lo que hablas se guarda de forma silenciosa en un buffer en memoria (`hiddenAudioBuffer`) sin mostrar transcripciones crudas en pantalla.
   - **Resumen Automático:** Cada **3 frases habladas** o cada **20 segundos**, **Gemini Nano** sintetiza el buffer acumulado y genera una nota concisa con las ideas principales.
   - **Gestión de Memoria Óptima:** Aplica el patrón *Base Session + Clone* para vaciar el contexto tras cada nota y mantener el consumo de RAM en niveles mínimos.
   - **Botón Manual (`✨ Generar nota ahora`):** Permite forzar la síntesis del contexto acumulado en cualquier momento para demostraciones en vivo.
   - **Filtro Anti-Chatter:** Sanitizador estricto que elimina respuestas conversacionales del LLM (*"Please provide..."*), asegurando que sólo se muestren viñetas limpias con las notas.

---

## 🎨 Diseño Visual: Google Gemini AI Style

- **Paleta de Colores:** Fondo obsidiana `#131314`, tarjetas de superficie `#1e1f20` y `#282a2c`.
- **Gemini Aurora Spectrum:** Resplandor ambiental y bordes dinámicos que se iluminan con el gradiente característico de Gemini (**Azul `#4285f4`**, **Púrpura `#9b72cf`** y **Coral `#d96570`**) durante el habla y la inferencia.
- **Tipografía Geométrica:** Fuentes Google *Outfit* y *Plus Jakarta Sans* con kerning ajustado para máxima legibilidad.
- **Formas Circulares y Cápsulas:** Bordes redondeados de `28px`, botones pill (`9999px`) y el ícono de estrella de 4 puntas oficial de Gemini.

---

## 🚀 Cómo Iniciar la Aplicación

### Opción A: Ejecución Local
1. Inicia el servidor estático local:
   ```bash
   python server.py
   ```
2. Abre Google Chrome en:
   **[http://localhost:3000](http://localhost:3000)**

*(El archivo `server.py` es únicamente un servidor HTTP local para cumplir con el requisito de contexto seguro `localhost` del navegador).*

### Opción B: Despliegue en Netlify / Vercel (Producción)
La aplicación es **100% frontend estático** (HTML, CSS y JavaScript vainilla sin dependencias ni compilación):
1. Arrastra la carpeta del proyecto a [Netlify Drop](https://app.netlify.com/drop).
2. ¡Listo! Netlify te otorgará una URL con **HTTPS automático**, necesario para que el navegador habilite el micrófono y las APIs de AI en producción.

---

## 🛠️ Activación de Gemini Nano y Translator en Chrome

Para ejecutar los modelos localmente en tu equipo:

1. **Requisitos:**
   - Google Chrome (versión 138+ o versiones Dev/Canary de 64-bit).
   - 16 GB+ de RAM y GPU con soporte DirectML/WebGPU.
   - Espacio disponible en disco (~22 GB de cuota libre en el perfil).

2. **Habilitar Flags en Chrome:**
   Escribe en la barra de direcciones de Chrome:
   - `chrome://flags/#prompt-api-for-gemini-nano` $\rightarrow$ **Enabled**
   - `chrome://flags/#optimization-guide-on-device-model` $\rightarrow$ **Enabled BypassPerfRequirement**
   - `chrome://flags/#translation-api` $\rightarrow$ **Enabled**

3. **Reiniciar Chrome:** Haz clic en **Relaunch**.

4. **Verificar Descarga del Modelo:**
   - Entra en `chrome://components`.
   - Busca **Optimization Guide On Device Model**.
   - Haz clic en **Check for update** para descargar Gemini Nano localmente.

> **Modo Fallback Inteligente:** Si abres NanoSub en un navegador donde estas flags aún no están configuradas, la aplicación detectará el entorno y activará un motor simulado con soporte de streaming, permitiéndote probar la interfaz completa y el flujo de audio sin errores.

---

## 📁 Estructura del Proyecto

```
gemini-nano-realtime-translator/
├── index.html          # Interfaz de 3 tarjetas (Audio -> Traducción -> Smart Notes)
├── styles.css          # Estilos inspirados en Google Gemini AI Visual Design
├── server.py           # Servidor local ligero para desarrollo en localhost:3000
├── js/
│   ├── speech.js       # Servicio Web Speech API (streaming de audio en vivo)
│   ├── nano-engine.js  # Motor de Chrome Built-in AI (Translator API + Gemini Nano + Sanitizador)
│   └── app.js          # Orquestador del buffer de contexto oculto y notas periódicas
└── README.md           # Documentación completa del proyecto
```
