/* =========================================================
   Audio — sons procedurais (Web Audio API)
   Sem arquivos externos. Volumes calibrados pra ficarem
   discretos: ouvidos em headphones por horas sem cansar.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const Audio = {
    ctx: null,
    masterGain: null,
    enabled: true,
    noiseBuffer: null,
    pinkBuffer: null,
    brownBuffer: null,
    lastPlay: {},
  };

  Audio.init = function () {
    if (Audio.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    Audio.ctx = new Ctx();
    Audio.masterGain = Audio.ctx.createGain();
    Audio.masterGain.gain.value = 0.32;
    // Cadeia simples: master -> low-pass -> destino
    // (sem feedback loop — o anterior podia saturar/silenciar o ctx)
    const masterFilter = Audio.ctx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.value = 5500;
    masterFilter.Q.value = 0.5;
    Audio.masterGain.connect(masterFilter);
    masterFilter.connect(Audio.ctx.destination);

    Audio.noiseBuffer = makeNoiseBuffer(Audio.ctx, 0.5, 'white');
    Audio.pinkBuffer  = makeNoiseBuffer(Audio.ctx, 0.5, 'pink');
    Audio.brownBuffer = makeNoiseBuffer(Audio.ctx, 0.5, 'brown');

    // Resume robusto: visibilitychange, focus, e qualquer interação do user
    const resume = () => Audio.resume();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
    window.addEventListener('focus', resume);
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
    window.addEventListener('touchstart', resume);
  };

  Audio.resume = function () {
    if (Audio.ctx && Audio.ctx.state !== 'running') {
      try { Audio.ctx.resume(); } catch (e) {}
    }
  };

  function makeNoiseBuffer(ctx, durationSec, type) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * durationSec, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'pink')      { data[i] = (last + 0.02 * w) / 1.02; last = data[i]; data[i] *= 3.5; }
      else if (type === 'brown'){ data[i] = (last + 0.01 * w) / 1.01 * 3.5; last = data[i]; }
      else                      { data[i] = w; }
    }
    return buf;
  }

  function pickBuffer(type) {
    if (type === 'pink')  return Audio.pinkBuffer;
    if (type === 'brown') return Audio.brownBuffer;
    return Audio.noiseBuffer;
  }

  function playNoise({ duration = 0.15, freq = 800, type = 'white', volume = 0.15, q = 1, attack = 0.005 }) {
    const ctx = Audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = pickBuffer(type);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter); filter.connect(gain); gain.connect(Audio.masterGain);
    src.start(now); src.stop(now + duration + 0.05);
    // libera nodes pra evitar acumulação no contexto
    src.onended = () => {
      try { src.disconnect(); filter.disconnect(); gain.disconnect(); } catch (e) {}
    };
  }

  function playTone({ freq = 440, freqEnd = null, duration = 0.10, type = 'sine', volume = 0.10 }) {
    const ctx = Audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(0.01, freqEnd), now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(Audio.masterGain);
    osc.start(now); osc.stop(now + duration + 0.05);
    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect(); } catch (e) {}
    };
  }

  // throttle: só toca o mesmo som de novo após `gap` segundos
  function canPlay(name, gap) {
    if (!gap) return true;
    const t = performance.now() / 1000;
    if ((Audio.lastPlay[name] || 0) + gap > t) return false;
    Audio.lastPlay[name] = t;
    return true;
  }

  Audio.play = function (name, opts = {}) {
    if (!Audio.enabled || !Audio.ctx) return;
    // ctx pode ter ido pra suspended/interrupted — tenta retomar.
    // Se ainda não rodando, agenda o play pra depois do resume.
    if (Audio.ctx.state !== 'running') {
      try {
        Audio.ctx.resume().then(() => {
          if (Audio.ctx.state === 'running') Audio.play(name, opts);
        }).catch(() => {});
      } catch (e) {}
      return;
    }
    if (opts.gap && !canPlay(name, opts.gap)) return;
    const v = opts.volume != null ? opts.volume : 1;

    switch (name) {
      case 'place':
        playNoise({ duration: 0.08, freq: 700, type: 'brown', volume: 0.18 * v });
        break;
      case 'break_dirt':
        playNoise({ duration: 0.14, freq: 500, type: 'brown', volume: 0.22 * v });
        break;
      case 'break_stone':
        playNoise({ duration: 0.18, freq: 1200, type: 'white', volume: 0.20 * v });
        break;
      case 'break_wood':
        playNoise({ duration: 0.16, freq: 700, type: 'brown', volume: 0.22 * v });
        break;
      case 'break_glass':
        playNoise({ duration: 0.22, freq: 3500, type: 'white', volume: 0.25 * v });
        playTone({ freq: 1800, freqEnd: 900, duration: 0.14, type: 'triangle', volume: 0.10 * v });
        break;
      case 'break_leaves':
        playNoise({ duration: 0.14, freq: 1800, type: 'white', volume: 0.16 * v });
        break;
      case 'pickup':
        playTone({ freq: 880,  duration: 0.05, type: 'sine', volume: 0.08 * v });
        setTimeout(() => playTone({ freq: 1320, duration: 0.06, type: 'sine', volume: 0.07 * v }), 50);
        break;
      case 'step':
        playNoise({ duration: 0.05, freq: 280, type: 'brown', volume: 0.08 * v });
        break;
      case 'jump':
        playTone({ freq: 200, freqEnd: 110, duration: 0.10, type: 'square', volume: 0.05 * v });
        break;
      case 'splash':
        playNoise({ duration: 0.30, freq: 1500, type: 'pink', volume: 0.18 * v });
        playTone({ freq: 500, freqEnd: 200, duration: 0.22, type: 'sine', volume: 0.06 * v });
        break;
      case 'fireball':
        playNoise({ duration: 0.20, freq: 500, type: 'pink', volume: 0.18 * v, attack: 0.02 });
        playTone({ freq: 130, freqEnd: 80, duration: 0.20, type: 'sawtooth', volume: 0.10 * v });
        break;
      case 'explosion':
        playNoise({ duration: 0.40, freq: 200, type: 'brown', volume: 0.32 * v, attack: 0.005 });
        playNoise({ duration: 0.25, freq: 70, type: 'brown', volume: 0.18 * v });
        break;
      case 'fizz':
        playNoise({ duration: 0.40, freq: 4500, type: 'white', volume: 0.18 * v });
        break;
      case 'rat_squeak':
        playTone({ freq: 1100, freqEnd: 750, duration: 0.07, type: 'sine', volume: 0.08 * v });
        break;
      case 'rat_hurt':
        playTone({ freq: 600, freqEnd: 200, duration: 0.12, type: 'square', volume: 0.10 * v });
        break;
      case 'cat_meow':
        playTone({ freq: 380, freqEnd: 700, duration: 0.18, type: 'sawtooth', volume: 0.16 * v });
        setTimeout(() => playTone({ freq: 700, freqEnd: 350, duration: 0.20, type: 'sawtooth', volume: 0.13 * v }), 90);
        break;
      case 'cat_hiss':
        playNoise({ duration: 0.28, freq: 3500, type: 'pink', volume: 0.18 * v });
        break;
      case 'click':
        playTone({ freq: 950, duration: 0.03, type: 'square', volume: 0.07 * v });
        break;
      case 'craft':
        playTone({ freq: 700, duration: 0.04, type: 'square', volume: 0.10 * v });
        setTimeout(() => playTone({ freq: 1100, duration: 0.05, type: 'square', volume: 0.10 * v }), 50);
        setTimeout(() => playTone({ freq: 1500, duration: 0.06, type: 'square', volume: 0.10 * v }), 100);
        break;
      case 'door':
        playNoise({ duration: 0.22, freq: 200, type: 'brown', volume: 0.20 * v });
        playTone({ freq: 90, freqEnd: 60, duration: 0.22, type: 'sawtooth', volume: 0.06 * v });
        break;
      case 'hurt':
        playNoise({ duration: 0.14, freq: 700, type: 'pink', volume: 0.16 * v });
        playTone({ freq: 320, freqEnd: 120, duration: 0.12, type: 'sawtooth', volume: 0.10 * v });
        break;
      case 'eat':
        playNoise({ duration: 0.12, freq: 600, type: 'brown', volume: 0.18 * v });
        setTimeout(() => playNoise({ duration: 0.10, freq: 600, type: 'brown', volume: 0.16 * v }), 130);
        break;
      case 'select':
        playTone({ freq: 600, duration: 0.02, type: 'square', volume: 0.05 * v });
        break;
    }
  };

  Audio.breakSoundFor = function (blockId) {
    if (blockId == null) return 'break_dirt';
    if (blockId === 1 || blockId === 2 || blockId === 11) return 'break_dirt';
    if (blockId === 3 || blockId === 21 || (blockId >= 14 && blockId <= 19) || blockId === 22 || blockId === 23) return 'break_stone';
    if (blockId === 4 || blockId === 12 || blockId === 13 || blockId === 20) return 'break_wood';
    if (blockId === 5) return 'break_leaves';
    if (blockId === 9) return 'break_glass';
    if (blockId === 10) return 'door';
    return 'break_dirt';
  };

  Game.audio = Audio;
})();
