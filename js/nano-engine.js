/**
 * Gemini Nano & Translator Engine
 * Integrates Chrome's on-device AI capabilities:
 * 1. window.LanguageModel (Prompt API with Gemini Nano)
 * 2. window.Translator (Built-in AI Translation API)
 * 3. Fallback engine with streaming simulation & dictionary/remote translation
 */

class NanoEngine {
  constructor(options = {}) {
    this.sourceLang = options.sourceLang || 'en';
    this.targetLang = options.targetLang || 'es';
    
    // Engine mode: 'prompt-api' | 'translator-api' | 'fallback'
    this.activeMode = 'unknown';
    this.session = null;
    this.translator = null;
    
    // Status callbacks
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onDownloadProgress = options.onDownloadProgress || (() => {});

    // Cache of translations for repeated sentences
    this.cache = new Map();
  }

  /**
   * Detect and initialize the best available on-device AI engine.
   */
  async initialize() {
    this.onStatusChange({ status: 'checking', message: 'Comprobando Gemini Nano en el navegador...' });

    // 1. Try Native Translator API (Chrome Built-in AI)
    if ('Translator' in window) {
      try {
        const avail = await window.Translator.availability({
          sourceLanguage: this.sourceLang,
          targetLanguage: this.targetLang
        });

        if (avail === 'available' || avail === 'readily') {
          await this._initTranslatorAPI();
          this.activeMode = 'translator-api';
          this.onStatusChange({
            status: 'ready',
            mode: 'translator-api',
            message: 'Gemini Nano (Translator API) Listo'
          });
          return 'translator-api';
        } else if (avail === 'downloadable' || avail === 'downloading' || avail === 'after-download') {
          this.activeMode = 'translator-api';
          this.onStatusChange({
            status: 'downloadable',
            mode: 'translator-api',
            message: 'Modelo descargable. Haz clic para descargar.'
          });
          return 'translator-api';
        }
      } catch (e) {
        console.warn('Translator API check failed, checking Prompt API...', e);
      }
    }

    // 2. Try Prompt API with Gemini Nano (LanguageModel / ai.languageModel)
    const LM = window.LanguageModel || (window.ai && window.ai.languageModel);
    if (LM) {
      try {
        const avail = typeof LM.availability === 'function' ? await LM.availability() : 'available';
        if (avail !== 'no' && avail !== 'unavailable') {
          await this._initPromptAPI(LM);
          this.activeMode = 'prompt-api';
          this.onStatusChange({
            status: 'ready',
            mode: 'prompt-api',
            message: 'Gemini Nano (Prompt API) Listo'
          });
          return 'prompt-api';
        }
      } catch (e) {
        console.warn('LanguageModel init failed:', e);
      }
    }

    // 3. Fallback Engine
    this.activeMode = 'fallback';
    this.onStatusChange({
      status: 'fallback',
      mode: 'fallback',
      message: 'Modo Simulado / Fallback (Flags no detectadas)'
    });
    return 'fallback';
  }

  async _initTranslatorAPI() {
    if (this.translator) {
      try { this.translator.destroy(); } catch (_) {}
    }

    this.translator = await window.Translator.create({
      sourceLanguage: this.sourceLang,
      targetLanguage: this.targetLang,
      monitor: (m) => {
        m.addEventListener('downloadprogress', (e) => {
          const pct = Math.round((e.loaded / (e.total || 1)) * 100);
          this.onDownloadProgress(pct);
        });
      }
    });
  }

  async _initPromptAPI(LM) {
    if (this.session) {
      try { this.session.destroy(); } catch (_) {}
    }

    const langNameMap = {
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      pt: 'Portuguese',
      it: 'Italian',
      ja: 'Japanese',
      zh: 'Chinese'
    };

    const targetName = langNameMap[this.targetLang] || 'Spanish';

    const systemPrompt = `You are a high-speed real-time speech translation engine. Translate the given English speech into ${targetName} naturally and accurately. Output ONLY the translated text with no greetings, no explanations, and no quotes.`;

    this.session = await LM.create({
      systemPrompt: systemPrompt,
      initialPrompts: [{ role: 'system', content: systemPrompt }],
      monitor: (m) => {
        m.addEventListener('downloadprogress', (e) => {
          const pct = Math.round((e.loaded / (e.total || 1)) * 100);
          this.onDownloadProgress(pct);
        });
      }
    });
  }

  async setTargetLanguage(newLang) {
    if (this.targetLang === newLang) return;
    this.targetLang = newLang;

    // Reset sessions
    if (this.translator) {
      try { this.translator.destroy(); } catch (_) {}
      this.translator = null;
    }
    if (this.session) {
      try { this.session.destroy(); } catch (_) {}
      this.session = null;
    }

    await this.initialize();
  }

  /**
   * Real-time streaming translation.
   * Calls onChunk(partialTranslatedText) as new tokens arrive.
   */
  async translateStreaming(text, onChunk) {
    if (!text || !text.trim()) return '';

    const cleanText = text.trim();
    const cacheKey = `${this.targetLang}:${cleanText.toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      onChunk(cached);
      return cached;
    }

    try {
      // Option 1: Native Translator API
      if (this.activeMode === 'translator-api' && this.translator) {
        if (typeof this.translator.translateStreaming === 'function') {
          let accumulated = '';
          const stream = this.translator.translateStreaming(cleanText);
          for await (const chunk of stream) {
            accumulated += chunk;
            onChunk(accumulated);
          }
          this.cache.set(cacheKey, accumulated);
          return accumulated;
        } else {
          const res = await this.translator.translate(cleanText);
          onChunk(res);
          this.cache.set(cacheKey, res);
          return res;
        }
      }

      // Option 2: Native Prompt API with Gemini Nano
      if (this.activeMode === 'prompt-api' && this.session) {
        let accumulated = '';
        if (typeof this.session.promptStreaming === 'function') {
          const stream = this.session.promptStreaming(cleanText);
          for await (const chunk of stream) {
            accumulated += chunk;
            onChunk(accumulated);
          }
        } else {
          accumulated = await this.session.prompt(cleanText);
          onChunk(accumulated);
        }
        this.cache.set(cacheKey, accumulated);
        return accumulated;
      }
    } catch (err) {
      console.warn('Native translation error, falling back:', err);
    }

    // Option 3: Fallback translation with realistic streaming
    const fallbackResult = await this._fallbackTranslate(cleanText, onChunk);
    this.cache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  /**
   * Resilient fallback translation engine for development and testing.
   */
  async _fallbackTranslate(text, onChunk) {
    const translations = {
      es: {
        "hello": "Hola",
        "nice to meet you": "un placer conocerte",
        "hello, nice to meet you. i am testing real-time translation with gemini nano in my browser.": "Hola, encantado de conocerte. Estoy probando la traducción en tiempo real con Gemini Nano en mi navegador.",
        "could you please tell me where the nearest train station is located?": "¿Podría indicarme dónde se encuentra la estación de tren más cercana, por favor?",
        "artificial intelligence running locally on device guarantees total privacy and zero server latency.": "La inteligencia artificial que corre localmente en el dispositivo garantiza total privacidad y cero latencia de servidor.",
        "welcome to the future of real-time speech translation!": "¡Bienvenido al futuro de la traducción de voz en tiempo real!",
        "where is the next bus stop, please?": "¿Dónde está la próxima parada de autobús, por favor?",
        "good morning": "Buenos días",
        "good afternoon": "Buenas tardes",
        "good night": "Buenas noches",
        "how are you": "¿Cómo estás?",
        "thank you very much": "Muchas gracias",
        "yes": "Sí",
        "no": "No",
        "what is your name": "¿Cómo te llamas?"
      },
      fr: {
        "hello": "Bonjour",
        "nice to meet you": "enchanté de vous rencontrer",
        "hello, nice to meet you. i am testing real-time translation with gemini nano in my browser.": "Bonjour, ravi de vous rencontrer. Je teste la traduction en temps réel avec Gemini Nano dans mon navigateur.",
        "could you please tell me where the nearest train station is located?": "Pourriez-vous me dire où se trouve la gare la plus proche, s'il vous plaît ?",
        "artificial intelligence running locally on device guarantees total privacy and zero server latency.": "L'intelligence artificielle exécutée localement sur l'appareil garantit une confidentialité totale et une latence serveur nulle.",
        "welcome to the future of real-time speech translation!": "Bienvenue dans le futur de la traduction vocale en temps réel !"
      },
      de: {
        "hello": "Hallo",
        "hello, nice to meet you. i am testing real-time translation with gemini nano in my browser.": "Hallo, freut mich Sie kennenzulernen. Ich teste die Echtzeitübersetzung mit Gemini Nano in meinem Browser.",
        "could you please tell me where the nearest train station is located?": "Könnten Sie mir bitte sagen, wo sich der nächste Bahnhof befindet?",
        "artificial intelligence running locally on device guarantees total privacy and zero server latency.": "Künstliche Intelligenz, die lokal auf dem Gerät läuft, garantiert vollständige Privatsphäre und null Serverlatenz."
      },
      pt: {
        "hello": "Olá",
        "hello, nice to meet you. i am testing real-time translation with gemini nano in my browser.": "Olá, muito prazer em conhecê-lo. Estou testando a tradução em tempo real com Gemini Nano no meu navegador.",
        "could you please tell me where the nearest train station is located?": "Você poderia me dizer onde fica a estação de trem mais próxima, por favor?",
        "artificial intelligence running locally on device guarantees total privacy and zero server latency.": "A inteligência artificial executada localmente no dispositivo garante privacidade total e zero latência do servidor."
      },
      it: {
        "hello": "Ciao",
        "hello, nice to meet you. i am testing real-time translation with gemini nano in my browser.": "Ciao, piacere di conoscerti. Sto testando la traduzione in tempo reale con Gemini Nano nel mio browser.",
        "could you please tell me where the nearest train station is located?": "Potresti dirmi dove si trova la stazione ferroviaria più vicina, per favore?"
      },
      ja: {
        "hello": "こんにちは",
        "hello, nice to meet you. i am testing real-time translation with gemini nano in my browser.": "こんにちは、はじめまして。ブラウザ内でGemini Nanoを使ったリアルタイム翻訳をテストしています。",
        "could you please tell me where the nearest train station is located?": "最寄りの駅はどこにあるか教えていただけますか？",
        "welcome to the future of real-time speech translation!": "リアルタイム音声翻訳の未来へようこそ！"
      },
      zh: {
        "hello": "你好",
        "hello, nice to meet you. i am testing real-time translation with gemini nano in my browser.": "你好，很高兴认识你。我正在浏览器中测试 Gemini Nano 的实时翻译。",
        "could you please tell me where the nearest train station is located?": "请问最近的火车站位于哪里？"
      }
    };

    const targetDict = translations[this.targetLang] || translations.es;
    const lower = text.toLowerCase().trim();

    let fullResult = targetDict[lower];

    // If not in static dict, attempt public translation or intelligent word mapping
    if (!fullResult) {
      try {
        // Lightweight translation fetch with 1.5s timeout for fast response
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${this.targetLang}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.responseData && data.responseData.translatedText) {
            fullResult = data.responseData.translatedText;
          }
        }
      } catch (_) {
        // Ignore network timeout or offline
      }
    }

    if (!fullResult) {
      // Dynamic fallback marker
      fullResult = `[${this.targetLang.toUpperCase()}] ${text}`;
    }

    // Stream the result word-by-word with small delay to emulate Gemini Nano streaming tokens
    const words = fullResult.split(' ');
    let current = '';
    for (let i = 0; i < words.length; i++) {
      current += (i > 0 ? ' ' : '') + words[i];
      onChunk(current);
      await new Promise(r => setTimeout(r, 40));
    }

    return fullResult;
  }

  destroy() {
    if (this.session) {
      try { this.session.destroy(); } catch (_) {}
      this.session = null;
    }
    if (this.translator) {
      try { this.translator.destroy(); } catch (_) {}
      this.translator = null;
    }
  }
}

// Export to global scope
window.NanoEngine = NanoEngine;
