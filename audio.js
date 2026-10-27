/**
 * Звуковой движок Web Audio API для викторины «День рождения Интернета»
 * Чистый программный синтез звука без внешних MP3-файлов.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("web_quiz_muted") === "true";
    this.initialized = false;
  }

  init() {
    if (this.initialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("web_quiz_muted", this.muted ? "true" : "false");
    if (!this.muted) {
      this.ensureContext();
      this.playTone(523.25, 0.08, "sine", 0.15); // C5 notification
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // Вспомогательный метод для воспроизведения простой тональности
  playTone(freq, duration = 0.1, type = "sine", volume = 0.1) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio error catch
    }
  }

  // Звук клика по кнопке
  playClick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  // Звук наведения на плитку (hover)
  playHover() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.04);

      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  // Звук открытия вопроса
  playOpenQuestion() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(329.63, now); // E4
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.18); // E5

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(493.88, now); // B4
      osc2.frequency.exponentialRampToValueAtTime(987.77, now + 0.18); // B5

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.22);
      osc2.stop(now + 0.22);
    } catch (e) {}
  }

  // Победный звук (правильный ответ: восходящее кибер-арпеджио C5 -> E5 -> G5 -> C6)
  playCorrect() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const notes = [
        { f: 523.25, t: 0.0, d: 0.12 }, // C5
        { f: 659.25, t: 0.08, d: 0.14 }, // E5
        { f: 783.99, t: 0.16, d: 0.16 }, // G5
        { f: 1046.5, t: 0.24, d: 0.35 }  // C6
      ];

      notes.forEach(({ f, t, d }) => {
        const now = this.ctx.currentTime + t;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + d);
      });
    } catch (e) {}
  }

  // Звук ошибки (неверный ответ: низкий электронный диссонанс)
  playWrong() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Две частоты для создания диссонанса ошибки
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(180, now);
      osc1.frequency.linearRampToValueAtTime(120, now + 0.28);

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(170, now);
      osc2.frequency.linearRampToValueAtTime(110, now + 0.28);

      // Фильтр низких частот для мягкого бархатистого звучания
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(700, now);
      filter.frequency.linearRampToValueAtTime(300, now + 0.28);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } catch (e) {}
  }

  // Финальные праздничные фанфары (завершение викторины)
  playFanfare() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      // Аккордовая прогрессия кибер-фанфар
      const chords = [
        { time: 0.0, freqs: [392.00, 523.25, 659.25], dur: 0.2 }, // G4, C5, E5
        { time: 0.22, freqs: [392.00, 523.25, 659.25], dur: 0.2 },
        { time: 0.44, freqs: [440.00, 554.37, 659.25], dur: 0.2 }, // A4, C#5, E5
        { time: 0.68, freqs: [523.25, 659.25, 783.99, 1046.50], dur: 0.8 } // C-maj triumphal
      ];

      chords.forEach(({ time, freqs, dur }) => {
        freqs.forEach((freq) => {
          const now = this.ctx.currentTime + time;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.1 / freqs.length, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + dur);
        });
      });
    } catch (e) {}
  }
}

// Экспортируем глобальный экземпляр
window.sound = new SoundEngine();
