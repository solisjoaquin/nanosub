/**
 * NanoSub - Minimalist Real-Time Subtitle Controller
 * Displays only the live English transcription (top) and translated subtitle (bottom).
 */

document.addEventListener('DOMContentLoaded', async () => {
  const sourceBox = document.getElementById('source-box');
  const targetBox = document.getElementById('target-box');
  const finalSourceText = document.getElementById('final-source-text');
  const interimSourceText = document.getElementById('interim-source-text');
  const translatedText = document.getElementById('translated-text');

  const micToggleBtn = document.getElementById('mic-toggle-btn');
  const micStatusLabel = document.getElementById('mic-status-label');
  const targetLanguageSelect = document.getElementById('target-language-select');
  const targetFlag = document.getElementById('target-flag');
  const modelStatusText = document.getElementById('model-status-text');

  const flagMap = {
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    pt: '🇵🇹',
    it: '🇮🇹',
    ja: '🇯🇵',
    zh: '🇨🇳'
  };

  let debounceTimer = null;

  // 1. Initialize Gemini Nano Engine
  const nanoEngine = new window.NanoEngine({
    sourceLang: 'en',
    targetLang: targetLanguageSelect.value,
    onStatusChange: (info) => {
      modelStatusText.textContent = info.mode === 'fallback'
        ? 'Gemini Nano (Simulado)'
        : 'Gemini Nano (Activo)';
    }
  });

  await nanoEngine.initialize();

  // 2. Initialize Web Speech API
  const speechService = new window.SpeechService({
    lang: 'en-US',
    onStart: () => {
      micToggleBtn.classList.add('recording');
      micStatusLabel.textContent = 'Escuchando...';
      sourceBox.classList.add('listening');
      if (!finalSourceText.textContent) {
        interimSourceText.textContent = 'Habla ahora en inglés...';
      }
    },
    onEnd: () => {
      micToggleBtn.classList.remove('recording');
      micStatusLabel.textContent = 'Iniciar Micrófono';
      sourceBox.classList.remove('listening');
    },
    onResult: ({ interim, final }) => {
      if (final) {
        // Show finalized sentence cleanly as a subtitle
        finalSourceText.textContent = final;
        interimSourceText.textContent = '';
        translateSubtitle(final);
      } else if (interim) {
        // Clear previous finished sentence when new speech starts
        finalSourceText.textContent = '';
        interimSourceText.textContent = interim;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          translateSubtitle(interim);
        }, 180);
      }
    }
  });

  // 3. Stream translation to lower subtitle box
  async function translateSubtitle(text) {
    if (!text || !text.trim()) return;

    targetBox.classList.add('translating');
    translatedText.classList.remove('placeholder');

    try {
      await nanoEngine.translateStreaming(text.trim(), (chunk) => {
        translatedText.textContent = chunk;
      });
    } finally {
      targetBox.classList.remove('translating');
    }
  }

  // 4. Controls
  micToggleBtn.addEventListener('click', () => {
    if (speechService.isListening) {
      speechService.stop();
    } else {
      speechService.start();
    }
  });

  targetLanguageSelect.addEventListener('change', async (e) => {
    const lang = e.target.value;
    targetFlag.textContent = flagMap[lang] || '🌐';
    await nanoEngine.setTargetLanguage(lang);

    const activeText = finalSourceText.textContent || interimSourceText.textContent;
    if (activeText && !activeText.includes('Haz clic en') && !activeText.includes('Habla ahora')) {
      translateSubtitle(activeText);
    }
  });
});
