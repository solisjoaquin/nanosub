/**
 * Speech Recognition Service
 * Encapsulates the Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * for real-time streaming audio transcription.
 */

class SpeechService {
  constructor(options = {}) {
    this.lang = options.lang || 'en-US';
    this.recognition = null;
    this.isListening = false;
    this.shouldRestart = false;
    
    // Callbacks
    this.onStart = options.onStart || (() => {});
    this.onEnd = options.onEnd || (() => {});
    this.onError = options.onError || (() => {});
    this.onResult = options.onResult || (() => {});

    this._initRecognition();
  }

  isSupported() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  _initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.lang;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      this.onResult({
        interim: interimTranscript.trim(),
        final: finalTranscript.trim(),
        rawEvent: event
      });
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      // 'no-speech' is common and normal during pauses; don't trigger fatal error
      if (event.error !== 'no-speech') {
        this.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto-restart if user still wants to listen and it wasn't manually stopped
      if (this.shouldRestart) {
        try {
          this.recognition.start();
        } catch (e) {
          console.error('Error restarting speech recognition:', e);
          this.shouldRestart = false;
          this.onEnd();
        }
      } else {
        this.onEnd();
      }
    };
  }

  start() {
    if (!this.recognition) {
      this._initRecognition();
      if (!this.recognition) {
        this.onError('speech_not_supported');
        return;
      }
    }

    if (this.isListening) return;

    this.shouldRestart = true;
    try {
      this.recognition.start();
    } catch (e) {
      console.error('Could not start speech recognition:', e);
    }
  }

  stop() {
    this.shouldRestart = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Error stopping speech recognition:', e);
      }
    }
    this.isListening = false;
  }

  setLanguage(langCode) {
    this.lang = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
      if (this.isListening) {
        // Restart with new language
        this.recognition.stop();
      }
    }
  }
}

// Export to global scope
window.SpeechService = SpeechService;
