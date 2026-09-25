/**
 * NanoSub - Real-Time Subtitle & Hidden Context Audio Summarizer
 * 1. Top Card: Live English speech transcription (Web Speech API)
 * 2. Middle Card: Real-time translated subtitle (Chrome Translator API / Gemini Nano)
 * 3. Bottom Card: Periodic Smart Notes from hidden audio buffer (Gemini Nano Prompt/Summarizer API)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const sourceBox = document.getElementById('source-box');
  const targetBox = document.getElementById('target-box');
  const summaryNotesBox = document.getElementById('summary-notes-box');

  const finalSourceText = document.getElementById('final-source-text');
  const interimSourceText = document.getElementById('interim-source-text');
  const translatedText = document.getElementById('translated-text');

  const micToggleBtn = document.getElementById('mic-toggle-btn');
  const micStatusLabel = document.getElementById('mic-status-label');
  const targetLanguageSelect = document.getElementById('target-language-select');
  const targetFlag = document.getElementById('target-flag');
  const modelStatusText = document.getElementById('model-status-text');

  // Smart Notes DOM
  const bufferCounterBadge = document.getElementById('buffer-counter-badge');
  const bufferCountText = document.getElementById('buffer-count-text');
  const forceNoteBtn = document.getElementById('force-note-btn');
  const notesFeed = document.getElementById('notes-feed');

  const flagMap = {
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    pt: '🇵🇹',
    it: '🇮🇹',
    ja: '🇯🇵',
    zh: '🇨🇳'
  };

  // Hidden Context State (stores spoken audio transcripts without displaying raw history)
  let hiddenAudioBuffer = [];
  let debounceTimer = null;
  let silenceCommitTimer = null;
  let lastInterimText = '';
  let isGeneratingNote = false;

  const SENTENCES_THRESHOLD = 3; // Auto-generate a note every 3 spoken sentences
  const AUTO_SUMMARY_INTERVAL_MS = 20000; // Or every 20 seconds if there is pending audio in buffer

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

  // 2. Helper to store spoken phrase silently into hidden buffer
  function pushToHiddenBuffer(sentence) {
    const clean = (sentence || '').trim();
    if (!clean || clean.length < 3) return;

    // Avoid duplicate consecutive entries
    if (hiddenAudioBuffer.length > 0 && hiddenAudioBuffer[hiddenAudioBuffer.length - 1] === clean) {
      return;
    }

    hiddenAudioBuffer.push(clean);
    updateBufferBadge();

    // Trigger automatic note generation if sentence threshold reached
    if (hiddenAudioBuffer.length >= SENTENCES_THRESHOLD && !isGeneratingNote) {
      generateSmartNote('auto-threshold');
    }
  }

  function updateBufferBadge() {
    const count = hiddenAudioBuffer.length;
    bufferCountText.textContent = `Contexto oculto: ${count} ${count === 1 ? 'frase' : 'frases'}`;
    if (count > 0) {
      bufferCounterBadge.classList.add('has-context');
    } else {
      bufferCounterBadge.classList.remove('has-context');
    }
  }

  // Periodic background timer: generates a note every 20s if there's accumulated speech
  setInterval(() => {
    if (hiddenAudioBuffer.length > 0 && !isGeneratingNote) {
      generateSmartNote('auto-timer');
    }
  }, AUTO_SUMMARY_INTERVAL_MS);

  // 3. Generate Smart Note with Gemini Nano
  async function generateSmartNote(triggerReason = 'manual') {
    if (isGeneratingNote) return;

    // Take current hidden buffer, or fallback to active screen text if triggered manually
    let batchToSummarize = [...hiddenAudioBuffer].filter(s => s && s.trim().length > 2);
    if (batchToSummarize.length === 0) {
      const currentScreenSpeech = finalSourceText.textContent || lastInterimText;
      const isValidSpeech = currentScreenSpeech && 
        currentScreenSpeech.trim().length > 3 && 
        !currentScreenSpeech.includes('Habla ahora') && 
        !currentScreenSpeech.includes('Presiona') &&
        !currentScreenSpeech.includes('comienza en');

      if (isValidSpeech) {
        batchToSummarize = [currentScreenSpeech.trim()];
      } else if (triggerReason === 'manual') {
        batchToSummarize = [
          'We are demonstrating on-device real-time speech translation and automated note taking with Gemini Nano.',
          'The audio is captured privately and processed 100% on the local device without sending transcripts to the cloud.'
        ];
      } else {
        return;
      }
    }

    // Clear hidden buffer immediately for the next cycle (Sliding/Reset Window)
    hiddenAudioBuffer = [];
    updateBufferBadge();
    isGeneratingNote = true;
    summaryNotesBox.classList.add('thinking');

    // Remove empty placeholder if present
    const emptyState = document.getElementById('notes-empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    // Create new Note Item in the feed
    const noteItem = document.createElement('div');
    noteItem.className = 'note-item';

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const metaEl = document.createElement('div');
    metaEl.className = 'note-meta';

    const badgeEl = document.createElement('span');
    badgeEl.className = 'note-badge';
    badgeEl.textContent = `✨ Nota Gemini Nano (${batchToSummarize.length} ${batchToSummarize.length === 1 ? 'frase' : 'frases'} de audio)`;

    const timeEl = document.createElement('span');
    timeEl.textContent = timeStr;

    metaEl.appendChild(badgeEl);
    metaEl.appendChild(timeEl);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'note-body';
    bodyEl.textContent = 'Sintetizando lo más importante del audio...';

    noteItem.appendChild(metaEl);
    noteItem.appendChild(bodyEl);

    notesFeed.prepend(noteItem);

    try {
      await nanoEngine.summarizeAudioContext(batchToSummarize, (streamChunk) => {
        bodyEl.textContent = streamChunk;
      });
    } catch (err) {
      console.error('Error generating smart note:', err);
      bodyEl.textContent = 'No se pudo generar el resumen en este momento.';
    } finally {
      isGeneratingNote = false;
      summaryNotesBox.classList.remove('thinking');
    }
  }

  // 4. Initialize Web Speech API
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
      micStatusLabel.textContent = 'Hablar';
      sourceBox.classList.remove('listening');
    },
    onResult: ({ interim, final }) => {
      clearTimeout(silenceCommitTimer);

      if (final) {
        lastInterimText = '';
        finalSourceText.textContent = final;
        interimSourceText.textContent = '';

        // 1) Translate live subtitle
        translateSubtitle(final);

        // 2) Save silently into hidden context buffer for Gemini Nano summarizer
        pushToHiddenBuffer(final);
      } else if (interim) {
        lastInterimText = interim;
        finalSourceText.textContent = '';
        interimSourceText.textContent = interim;

        // Debounced live translation while speaking
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          translateSubtitle(interim);
        }, 180);

        // If speaker pauses for 3.5s without Web Speech emitting isFinal, commit interim to hidden buffer
        silenceCommitTimer = setTimeout(() => {
          if (lastInterimText) {
            pushToHiddenBuffer(lastInterimText);
            lastInterimText = '';
          }
        }, 3500);
      }
    }
  });

  // 5. Stream translation to middle subtitle box
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

  // 6. Controls
  micToggleBtn.addEventListener('click', async () => {
    await nanoEngine.ensureReady();

    if (speechService.isListening) {
      speechService.stop();
    } else {
      speechService.start();
    }
  });

  forceNoteBtn.addEventListener('click', async () => {
    await nanoEngine.ensureReady();
    generateSmartNote('manual');
  });

  targetLanguageSelect.addEventListener('change', async (e) => {
    const lang = e.target.value;
    targetFlag.textContent = flagMap[lang] || '🌐';
    await nanoEngine.setTargetLanguage(lang);

    const activeText = finalSourceText.textContent || interimSourceText.textContent;
    if (activeText && !activeText.includes('Presiona') && !activeText.includes('Habla ahora')) {
      translateSubtitle(activeText);
    }
  });
});
