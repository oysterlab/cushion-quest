// Chiptune music sequencer + synthesized SFX (Web Audio, no files).
(() => {
  let ctx = null, master, musicBus, sfxBus, noiseBuf;
  let muted = false;
  try { muted = localStorage.getItem("cushion-muted") === "1"; } catch (_) {}

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.42; musicBus.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) { // "C4", "F#3", "Bb2"
    const m = /^([A-G])([#b]?)(\d)$/.exec(n);
    if (!m) return 0;
    const semi = NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (+m[3] + 1) * 12;
    return 440 * Math.pow(2, (semi - 69) / 12);
  }

  function osc(type, f, t, dur, vol, bus, opts = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    if (opts.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 6; lg.gain.value = f * 0.012; l.connect(lg).connect(o.frequency);
      l.start(t + 0.08); l.stop(t + dur + 0.05);
    }
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur * (opts.hold ?? 0.6)));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, bus, hp = 1000, lp = 12000, sweep) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const h = ctx.createBiquadFilter(); h.type = "highpass"; h.frequency.value = hp;
    const l = ctx.createBiquadFilter(); l.type = "lowpass"; l.frequency.setValueAtTime(lp, t);
    if (sweep) l.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(h).connect(l).connect(g).connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ---- Music --------------------------------------------------------------
  // Each track: bpm, steps per bar = 16 (16th notes). Patterns are space-separated tokens,
  // one per 16th: note name, "-" = hold, "." = rest. Drums: k=kick s=snare h=hat.
  const P = s => s.trim().split(/\s+/);
  const TRACKS = {
    town: { bpm: 138, loop: true,
      lead: P(`E5 - G5 - A5 - G5 E5 D5 - E5 - C5 - - .  E5 - G5 - A5 - C6 - B5 - A5 - G5 - - .
               A5 - G5 - E5 - D5 C5 D5 - E5 - G5 - - .  E5 - D5 - C5 - D5 - E5 - D5 - C5 - - .
               E5 - G5 - A5 - G5 E5 D5 - E5 - C5 - - .  E5 - G5 - A5 - C6 - D6 - C6 - A5 - - .
               G5 - A5 - C6 - A5 G5 E5 - G5 - D5 - E5 -  C5 - - - - - . . G4 - A4 - B4 - . .`),
      bass: P(`C3 . C3 . G3 . C3 . A2 . A2 . E3 . A2 .  F2 . F2 . C3 . F2 . G2 . G2 . D3 . G2 .
               F2 . F2 . C3 . F2 . C3 . C3 . G3 . C3 .  F2 . F2 . G2 . G2 . C3 . G2 . C3 . . .
               C3 . C3 . G3 . C3 . A2 . A2 . E3 . A2 .  F2 . F2 . C3 . F2 . G2 . G2 . D3 . G2 .
               F2 . F2 . C3 . F2 . E2 . E2 . A2 . E2 .  F2 . G2 . C3 . . . . G2 . . . G2 . . .`),
      arp:  P(`C4 E4 G4 E4 C4 E4 G4 E4 A3 C4 E4 C4 A3 C4 E4 C4  F3 A3 C4 A3 F3 A3 C4 A3 G3 B3 D4 B3 G3 B3 D4 B3`),
      drum: P(`k . h . s . h . k . k . s . h h`),
    },
    rooftop: { bpm: 150, loop: true,
      lead: P(`A4 - C5 - E5 - A5 - G5 - E5 - D5 - E5 -  F5 - E5 - D5 - C5 - D5 - B4 - G4 - - -
               A4 - C5 - E5 - A5 - B5 - C6 - B5 - A5 -  G5 - E5 - F5 - D5 - E5 - - - . . . .
               F5 - - - E5 - D5 - C5 - - - D5 - E5 -  F5 - G5 - A5 - G5 - E5 - - - . . . .
               F5 - E5 - D5 - C5 - B4 - C5 - D5 - B4 -  A4 - - - - - . . E5 - D5 - C5 - B4 -`),
      bass: P(`A2 . A3 . A2 . A3 . A2 . A3 . A2 . G2 .  F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .
               A2 . A3 . A2 . A3 . G2 . G3 . G2 . G3 .  F2 . F3 . G2 . G3 . A2 . A3 . A2 . . .
               D3 . D3 . D3 . D3 . C3 . C3 . C3 . C3 .  F2 . F2 . G2 . G2 . A2 . A2 . E2 . E2 .
               D3 . D3 . C3 . C3 . B2 . B2 . E3 . E3 .  A2 . A3 . A2 . A3 . E2 . E3 . E2 . E3 .`),
      arp:  P(`A3 C4 E4 A4 A3 C4 E4 A4 F3 A3 C4 F4 G3 B3 D4 G4`),
      drum: P(`k . h k s . h . k . h k s . h s`),
    },
    // chapter 2: a lilting garden tune in the same family as the town theme (same opening motif, brighter, lighter drums)
    garden: { bpm: 126, loop: true,
      lead: P(`G5 - E5 - G5 - C6 - B5 - A5 - G5 - - .  A5 - F5 - A5 - D6 - C6 - B5 - A5 - - .
               G5 - E5 - G5 - C6 - E6 - D6 - C6 - - .  B5 - G5 - A5 - B5 - C6 - - - . . . .
               E6 - - - D6 - C6 - B5 - A5 - G5 - - .  F5 - A5 - C6 - A5 - G5 - - - . . . .
               E5 - G5 - C6 - E6 - D6 - B5 - G5 - A5 -  C6 - - - - - . . G5 - A5 - B5 - . .`),
      bass: P(`C3 . G3 . E3 . G3 . F2 . C3 . A2 . C3 .  D3 . A3 . F3 . A3 . G2 . D3 . B2 . D3 .
               C3 . G3 . E3 . G3 . A2 . E3 . C3 . E3 .  F2 . C3 . G2 . D3 . C3 . G3 . C3 . . .`),
      arp:  P(`E4 G4 C5 G4 E4 G4 C5 G4 F4 A4 C5 A4 F4 A4 C5 A4  D4 F4 A4 F4 D4 F4 A4 F4 G4 B4 D5 B4 G4 B4 D5 B4`),
      drum: P(`k . . . h . . . s . . . h . h .`),
    },
    boss: { bpm: 168, loop: true,
      lead: P(`E5 . E5 . F5 - E5 . D#5 - E5 - . . B4 .  E5 . E5 . G5 - F5 . E5 - D5 - . . B4 .
               C5 - D5 - E5 - F5 - G5 - F5 - E5 - D5 -  E5 - - - B4 - - - E4 - - - . . . .
               A5 . A5 . G5 - F5 . E5 - F5 - . . C5 .  A5 . A5 . B5 - A5 . G#5 - E5 - . . E5 .
               F5 - E5 - D5 - C5 - B4 - C5 - D5 - B4 -  E5 - - - E5 . E5 . E5 - - - . . . .`),
      bass: P(`E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 D2 D2 D3 D2  C2 C2 C3 C2 C2 C2 C3 C2 B1 B1 B2 B1 B1 B1 B2 B1`),
      arp:  P(`E4 G4 B4 E5 E4 G4 B4 E5 C4 E4 G4 C5 B3 D#4 F#4 B4`),
      drum: P(`k h s h k k s h k h s h k k s s`),
    },
    // chapter 3: bubbly evening laundry (F major, a little swing)
    laundry: { bpm: 132, loop: true,
      lead: P(`F5 - A5 - C6 - A5 - G5 - F5 - E5 - G5 -  F5 - - - C5 - - . D5 - E5 - F5 - G5 -
               A5 - Bb5 - C6 - A5 - G5 - E5 - C5 - E5 -  F5 - - - - - . . C6 - Bb5 - A5 - G5 -`),
      bass: P(`F2 . C3 . F2 . C3 . C2 . G2 . C2 . G2 .  Bb2 . F3 . Bb2 . F3 . C3 . G2 . C3 . E2 .`),
      arp:  P(`F4 A4 C5 A4 F4 A4 C5 A4 E4 G4 C5 G4 E4 G4 C5 G4`),
      drum: P(`k . h . s . h h k . h . s . h .`),
    },
    // chapter 4: sly tiptoe through the gold vault (D minor)
    vault: { bpm: 116, loop: true,
      lead: P(`D5 . F5 . A5 - . . G#5 . A5 . . . . .  D5 . F5 . A5 - . . C6 - Bb5 - A5 - . .
               G5 . Bb5 . D6 - . . C6 . Bb5 . A5 - . .  F5 - E5 - D5 - E5 - F5 - A5 - D5 - . .`),
      bass: P(`D2 . . D3 . . A2 . D2 . . D3 . . A2 .  Bb1 . . Bb2 . . F2 . A1 . . A2 . . E2 .`),
      arp:  P(`D4 F4 A4 D5 A4 F4 D4 F4 Bb3 D4 F4 Bb4 A3 C#4 E4 A4`),
      drum: P(`k . . h . . s . k . h . s . . h`),
    },
    // chapter 5: a lullaby in the starlit tower (G major, swaying)
    night: { bpm: 96, loop: true,
      lead: P(`B4 - - D5 - - G5 - - - - - F#5 - E5 -  D5 - - - B4 - - - A4 - - - - - . .
               C5 - - E5 - - A5 - - - - - G5 - F#5 -  E5 - - - D5 - - - G4 - - - - - . .`),
      bass: P(`G2 . . . D3 . . . G2 . . . D3 . . .  C3 . . . G2 . . . D3 . . . D2 . . .`),
      arp:  P(`G3 B3 D4 B3 G3 B3 D4 B3 C4 E4 G4 E4 D4 F#4 A4 F#4`),
      drum: P(`k . . . . . h . . . . . h . . .`),
    },
    // chapter 6: dawn march to the throne (C major)
    throne: { bpm: 144, loop: true,
      lead: P(`C5 - G4 - C5 - E5 - G5 - - - E5 - C5 -  D5 - - - G4 - - - B4 - D5 - G5 - - -
               A5 - G5 - F5 - E5 - F5 - G5 - A5 - C6 -  B5 - G5 - D6 - - - C6 - - - . . . .`),
      bass: P(`C3 . C3 G2 C3 . C3 G2 G2 . G2 D3 G2 . G2 D3  F2 . F2 C3 F2 . F2 C3 G2 . G2 D3 C3 . C3 .`),
      arp:  P(`C4 E4 G4 C5 G3 B3 D4 G4 F3 A3 C4 F4 G3 B3 D4 G4`),
      drum: P(`k . h . s . h . k k h . s . h s`),
    },
    // the greedy king (C minor, fast)
    final: { bpm: 176, loop: true,
      lead: P(`C5 . C5 . Eb5 - D5 . C5 - G4 - . . G4 .  Ab4 . Ab4 . C5 - Bb4 . Ab4 - G4 - . . . .
               C5 - Eb5 - G5 - Ab5 - G5 - F5 - Eb5 - D5 -  C5 - - - G5 - - - C6 - - - . . . .`),
      bass: P(`C2 C2 C3 C2 C2 C2 C3 C2 Ab1 Ab1 Ab2 Ab1 Bb1 Bb1 Bb2 Bb1`),
      arp:  P(`C4 Eb4 G4 C5 C4 Eb4 G4 C5 Ab3 C4 Eb4 Ab4 Bb3 D4 F4 Bb4`),
      drum: P(`k h s h k k s h k h s h k k s s`),
    },
  };

  let cur = null, timer = null, nextT = 0, step = 0, tempoMul = 1;
  function scheduleStep(tr, i, t, sd) {
    const L = tr.lead[i % tr.lead.length], B = tr.bass[i % tr.bass.length];
    const A = tr.arp[i % tr.arp.length], D = tr.drum[i % tr.drum.length];
    const len = (pat, k) => { let n = 1; while (pat[(k + n) % pat.length] === "-" && n < 16) n++; return n; };
    if (L && L !== "-" && L !== ".") osc("square", freq(L), t, sd * len(tr.lead, i) * 0.95, 0.085, musicBus, { vib: len(tr.lead, i) > 3 });
    if (B && B !== "-" && B !== ".") osc("triangle", freq(B), t, sd * len(tr.bass, i) * 0.9, 0.3, musicBus, { hold: 0.8 });
    if (A && A !== "-" && A !== ".") osc("square", freq(A), t, sd * 0.9, 0.03, musicBus, { hold: 0.2 });
    if (D === "k") osc("sine", 140, t, 0.12, 0.5, musicBus, { slide: 45 });
    if (D === "s") noise(t, 0.12, 0.22, musicBus, 1200, 7000);
    if (D === "h") noise(t, 0.04, 0.08, musicBus, 7000, 14000);
  }
  function pump() {
    if (!cur) return;
    const sd = 60 / (cur.bpm * tempoMul) / 4;
    if (nextT < ctx.currentTime - 0.05) nextT = ctx.currentTime + 0.05; // timer was throttled: skip, don't burst
    while (nextT < ctx.currentTime + 0.15) {
      if (!cur.loop && step >= cur.lead.length) { stopMusic(); return; }
      scheduleStep(cur, step, nextT, sd);
      nextT += sd; step++;
    }
  }
  function playMusic(name) {
    init(); if (!ctx) return;
    stopMusic();
    cur = TRACKS[name]; step = 0; tempoMul = 1; nextT = ctx.currentTime + 0.06;
    timer = setInterval(pump, 40); pump();
  }
  function stopMusic() { cur = null; clearInterval(timer); timer = null; }
  function setTempo(m) { tempoMul = m; }

  // One-shot jingles (melody list of [note, beats])
  function jingle(notes, bpm = 160, type = "square", vol = 0.1) {
    init(); if (!ctx) return 0;
    let t = ctx.currentTime + 0.03; const b = 60 / bpm;
    for (const [n, beats] of notes) {
      if (n !== ".") {
        for (const x of n.split("+")) osc(type, freq(x), t, b * beats * 0.95, vol, sfxBus, { vib: beats >= 1 });
      }
      t += b * beats;
    }
    return (t - ctx.currentTime) * 1000;
  }
  const JINGLES = {
    ready: [["C5", .5], ["E5", .5], ["G5", .5], ["C6", 1]],
    clear: [["G4", .5], ["C5", .5], ["E5", .5], ["G5", .5], ["E5", .5], ["G5", .5], ["C6+E5", 2]],
    gameover: [["E5", 1], ["D5", 1], ["C5", 1], ["B4", .5], ["A4", .5], ["G#4", 1], ["A4", 2]],
    chapter: [["C5", .5], ["C5", .5], ["C5", .5], ["C5", 1], ["Ab4", 1], ["Bb4", 1], ["C5", .5], [".", .5], ["Bb4", .5], ["C6+E5", 3]],
    warning: [["A5", .5], ["E5", .5], ["A5", .5], ["E5", .5], ["A5", .5], ["E5", .5], ["A5", .5], ["E5", .5]],
  };

  // ---- SFX ----------------------------------------------------------------
  let suckNode = null;
  const S = {
    jump() { osc("square", 300, ctx.currentTime, 0.16, 0.09, sfxBus, { slide: 760 }); },
    land() { noise(ctx.currentTime, 0.06, 0.12, sfxBus, 200, 1500); },
    capture() { const t = ctx.currentTime; osc("square", 520, t, 0.08, 0.1, sfxBus, { slide: 1200 }); osc("square", 1040, t + 0.06, 0.08, 0.08, sfxBus); },
    shoot() { const t = ctx.currentTime; osc("sawtooth", 900, t, 0.18, 0.1, sfxBus, { slide: 160 }); noise(t, 0.1, 0.15, sfxBus, 800, 6000, 900); },
    hit(combo = 0) { const t = ctx.currentTime, f = 440 * Math.pow(2, Math.min(combo, 8) / 6); osc("square", f, t, 0.08, 0.12, sfxBus); osc("square", f * 1.5, t + 0.07, 0.12, 0.1, sfxBus); noise(t, 0.08, 0.15, sfxBus, 2000, 9000); },
    pop() { osc("sine", 600, ctx.currentTime, 0.1, 0.15, sfxBus, { slide: 1400 }); },
    item() { const t = ctx.currentTime; osc("square", 1318, t, 0.05, 0.07, sfxBus); osc("square", 1760, t + 0.05, 0.1, 0.07, sfxBus); },
    bonus() { const t = ctx.currentTime; [784, 988, 1175, 1568].forEach((f, i) => osc("square", f, t + i * 0.05, 0.08, 0.07, sfxBus)); },
    hurt() { const t = ctx.currentTime; osc("square", 700, t, 0.5, 0.12, sfxBus, { slide: 90 }); },
    sock() { osc("triangle", 900, ctx.currentTime, 0.1, 0.08, sfxBus, { slide: 500 }); },
    throwp() { osc("triangle", 300, ctx.currentTime, 0.2, 0.15, sfxBus, { slide: 700 }); },
    slam() { const t = ctx.currentTime; osc("sine", 110, t, 0.45, 0.6, sfxBus, { slide: 35 }); noise(t, 0.4, 0.35, sfxBus, 60, 900, 120); },
    bossHit() { const t = ctx.currentTime; noise(t, 0.2, 0.35, sfxBus, 300, 5000, 600); osc("square", 220, t, 0.25, 0.14, sfxBus, { slide: 70 }); },
    explode() { const t = ctx.currentTime; noise(t, 0.9, 0.45, sfxBus, 40, 4000, 80); osc("sine", 90, t, 0.8, 0.5, sfxBus, { slide: 30 }); },
    tick() { osc("square", 1600, ctx.currentTime, 0.03, 0.05, sfxBus); },
    start() { const t = ctx.currentTime; [523, 659, 784, 1047, 1319].forEach((f, i) => osc("square", f, t + i * 0.06, 0.12, 0.08, sfxBus)); },
    blip() { osc("square", 880 + Math.random() * 120, ctx.currentTime, 0.03, 0.03, sfxBus); },
    whistle() { const t = ctx.currentTime; osc("sine", 1800, t, 0.18, 0.12, sfxBus, { slide: 2600 }); osc("sine", 2600, t + 0.2, 0.25, 0.12, sfxBus, { slide: 1700 }); },
    oneup() { jingle([["E6", .25], ["G6", .25], ["E7", .25], ["C7", .25], ["D7", .25], ["G7", .5]], 200, "square", 0.07); },
  };

  function suck(on) {
    if (!ctx) return;
    if (on && !suckNode) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 2.5;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 9; lg.gain.value = 500;
      lfo.connect(lg).connect(bp.frequency);
      const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.08);
      s.connect(bp).connect(g).connect(sfxBus); s.start(); lfo.start();
      suckNode = { s, lfo, g };
    } else if (!on && suckNode) {
      const { s, lfo, g } = suckNode; suckNode = null;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
      s.stop(ctx.currentTime + 0.08); lfo.stop(ctx.currentTime + 0.08);
    }
  }

  function setPaused(p) { if (!ctx) return; if (p) ctx.suspend(); else ctx.resume(); }
  document.addEventListener("visibilitychange", () => { const g = window.__game && window.__game.game; setPaused(document.hidden || !!(g && g.scene === "play" && g.paused)); });
  window.Sound = {
    init, playMusic, stopMusic, setTempo, suck, setPaused,
    jingle: name => JINGLES[name] ? jingle(JINGLES[name], name === "warning" ? 220 : 170) : 0,
    sfx(name, arg) { init(); if (ctx && S[name]) S[name](arg); },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem("cushion-muted", muted ? "1" : "0"); } catch (_) {}
      if (master) master.gain.value = muted ? 0 : 0.8;
      return muted;
    },
    get muted() { return muted; },
  };
})();
