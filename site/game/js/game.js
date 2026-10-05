// 내 쿠션 내놔! — Chapter 1 (stages 1–5). Single-screen vacuum-and-throw arcade platformer.
(() => {
  "use strict";
  // Chunky arcade scale: 15 columns of 64px, a floor and three ledge tiers 164px apart.
  const W = 960, H = 720, T = 64, COLS = 15;
  const RES = Math.min(2, Math.max(1, Math.ceil((devicePixelRatio || 1) * Math.min(innerWidth, innerHeight * 4 / 3) / 960 * 4) / 4));
  const TIER_Y = [656, 492, 328, 164], FLOOR_Y = TIER_Y[0], SLAB = 64;
  const canvas = document.getElementById("game");
  canvas.width = W * RES; canvas.height = H * RES;
  let ctx = canvas.getContext("2d"); // swapped temporarily while baking cached text sprites
  ctx.imageSmoothingQuality = "high";

  const params = new URLSearchParams(location.search);
  const DEBUG = params.has("debug");
  const SPEED = Math.max(1, Math.min(8, +params.get("speed") || 1)); // QA fast-forward
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  // ---- Assets --------------------------------------------------------------
  const MAN = window.ASSET_MANIFEST || {};
  const SPR = {}, BG = {};
  const loads = [];
  function load(src) {
    const im = new Image();
    loads.push(new Promise(r => { im.onload = r; im.onerror = r; }));
    im.src = src; return im;
  }
  for (const [name, info] of Object.entries(MAN)) {
    if (info.frames) SPR[name] = info.frames.map(([w, h], i) => ({ img: load(`assets/sprites/${name}_${i}.webp`), w, h }));
    else if (info.src) BG[name] = load(info.src);
  }
  const fr = (name, i) => (SPR[name] || [])[i];
  // white hit-flash version of a frame, built once on first use (ctx.filter is far too slow per frame)
  function flashOf(f) {
    if (f.flash) return f.flash;
    const c = document.createElement("canvas"); c.width = f.img.naturalWidth; c.height = f.img.naturalHeight;
    const g = c.getContext("2d"); g.drawImage(f.img, 0, 0);
    g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(255,250,235,.82)"; g.fillRect(0, 0, c.width, c.height);
    return (f.flash = c);
  }

  function drawSprite(name, i, x, y, o = {}) {
    const f = fr(name, i); if (!f || !f.img.complete || !f.img.naturalWidth) return;
    const s = o.scale ?? 1, w = f.w * s, h = f.h * s;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    if (o.sy || o.sx) ctx.scale(o.sx || 1, o.sy || 1);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const ay = o.center ? h / 2 : h; // feet anchor by default
    ctx.drawImage(o.flash ? flashOf(f) : f.img, -w / 2, -ay, w, h);
    ctx.restore();
  }

  const ARC = '"Titan One", "Black Han Sans", sans-serif';
  const GRAD = {
    gold: ["#fffbd0", "#ffe14d", "#ffb300", "#e8590c"],
    white: ["#ffffff", "#ffffff", "#e3e7ff", "#a9b1d6"],
    pink: ["#ffe3f6", "#ff9de2", "#ff5fb8", "#c21d78"],
    cyan: ["#e9fdff", "#7ff0ff", "#2fc4e8", "#1270a8"],
    red: ["#ffe0d6", "#ff8a6a", "#ff4430", "#a3121c"],
    green: ["#efffe6", "#9dff7a", "#3fd14a", "#13792b"],
  };
  // Stroked/gradient arcade lettering is expensive to rasterise, so each distinct string+style is
  // rendered once into a small canvas and blitted afterwards (alpha is applied at blit time).
  const textCache = new Map();
  // a late web-font load must not leave fallback-font sprites in the cache
  if (document.fonts) document.fonts.addEventListener("loadingdone", () => textCache.clear());
  function text(str, x, y, o = {}) {
    if (o.live) return rawText(str, x, y, o);
    const { alpha, ...style } = o;
    const key = str + "\u0001" + JSON.stringify(style);
    let t = textCache.get(key);
    if (!t) {
      const size = (o.size || 20) * (o.font ? 1 : 1.35), pad = Math.ceil(size * 0.5) + 8;
      const m = document.createElement("canvas"), mg = m.getContext("2d");
      mg.font = `${o.weight || ""} ${size}px ${o.font || ARC}`;
      const tw = mg.measureText(str).width, w = Math.ceil(tw) + pad * 2, h = Math.ceil(size * 1.45) + pad * 2;
      m.width = w * RES; m.height = h * RES; mg.scale(RES, RES);
      const prev = ctx; ctx = mg;
      rawText(str, pad, pad + size * 1.0, { ...style, align: "left", base: "alphabetic" });
      ctx = prev;
      t = { c: m, w, h, tw, pad, base: pad + size * 1.0, size };
      textCache.set(key, t);
      if (textCache.size > 400) textCache.delete(textCache.keys().next().value);
    }
    const al = o.align || "left";
    const x0 = x - t.pad - (al === "center" ? t.tw / 2 : al === "right" ? t.tw : 0);
    const y0 = y - t.base + (o.base === "middle" ? t.size * 0.36 : 0);
    if (alpha != null) { ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(t.c, x0, y0, t.w, t.h); ctx.restore(); }
    else ctx.drawImage(t.c, x0, y0, t.w, t.h);
  }
  function rawText(str, x, y, o = {}) {
    ctx.save();
    const size = (o.size || 20) * (o.font ? 1 : 1.35); // latin defaults to the chunky arcade face
    ctx.font = `${o.weight || ""} ${size}px ${o.font || ARC}`;
    ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "alphabetic";
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const stroke = o.stroke ?? (o.font ? 0 : Math.max(4, size * 0.2));
    ctx.lineJoin = "round";
    if (o.shadow !== false) {
      const d = o.sh ?? Math.max(2, size * 0.08);
      ctx.fillStyle = ctx.strokeStyle = o.shadowColor || "#0b0d1f";
      if (stroke) { ctx.lineWidth = stroke; ctx.strokeText(str, x + d, y + d); }
      ctx.fillText(str, x + d, y + d);
    }
    if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = o.strokeColor || "#0b0d1f"; ctx.strokeText(str, x, y); }
    let fill = o.color || "#fff";
    const gname = o.grad || ({ "#ffd23a": "gold", "#fff": "white", "#ffe14d": "gold", "#7ff0ff": "cyan", "#ff7ad9": "pink", "#ff9de2": "pink", "#ff5a4e": "red", "#7dff7a": "green" })[fill];
    if (gname && !o.flat) {
      const top = o.base === "middle" ? y - size * 0.5 : y - size * 0.8, bot = o.base === "middle" ? y + size * 0.4 : y + size * 0.1;
      const g = ctx.createLinearGradient(0, top, 0, bot), c = GRAD[gname];
      g.addColorStop(0, c[0]); g.addColorStop(0.35, c[1]); g.addColorStop(0.7, c[2]); g.addColorStop(1, c[3]);
      fill = g;
    }
    ctx.fillStyle = fill; ctx.fillText(str, x, y);
    ctx.restore();
  }
  const KR = '"Black Han Sans", "Do Hyeon", sans-serif';
  const KR2 = '"Do Hyeon", sans-serif';

  // ---- Input ---------------------------------------------------------------
  const keys = {}, pressed = {};
  const MAP = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", KeyZ: "jump", Space: "jump",
    KeyX: "fire", KeyC: "slide", ShiftLeft: "slide", ShiftRight: "slide", Enter: "start", KeyP: "pause", Escape: "skip", KeyM: "mute" };
  addEventListener("keydown", e => {
    const k = MAP[e.code]; if (!k) return;
    e.preventDefault();
    Sound.init();
    if (!keys[k]) pressed[k] = true;
    keys[k] = true;
  });
  addEventListener("keyup", e => { const k = MAP[e.code]; if (k) keys[k] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; if (game.scene === "play" && !game.paused) { game.paused = true; Sound.suck(false); Sound.setPaused(true); } });
  canvas.addEventListener("pointerdown", e => {
    Sound.init(); pressed.start = true;
    const r = canvas.getBoundingClientRect(); game.tap = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  });
  const anyPress = () => pressed.start || pressed.jump || pressed.fire;

  // ---- Persistent ----------------------------------------------------------
  let hiScore = 50000;
  try { hiScore = Math.max(hiScore, +localStorage.getItem("cushion-hi") || 0); } catch (_) {}
  function saveHi() { try { localStorage.setItem("cushion-hi", String(hiScore)); } catch (_) {} }
  let saved = 0;
  try { saved = +localStorage.getItem("cushion-progress") || 0; } catch (_) {}
  const stageLabel = i => `${LEVELS[i].chapter}-${LEVELS[i].n}`;
  let stamps = {};
  try { stamps = JSON.parse(localStorage.getItem("cushion-stamps") || "{}"); } catch (_) {}
  function saveStamp(ch) { stamps[ch] = 1; try { localStorage.setItem("cushion-stamps", JSON.stringify(stamps)); } catch (_) {} }
  function saveProgress(i) { if (i > saved) { saved = i; try { localStorage.setItem("cushion-progress", String(i)); } catch (_) {} } }

  // ---- Game state ----------------------------------------------------------
  const game = {
    scene: "boot", t: 0, stage: 0, score: 0, hp: 5, maxHp: 5, paused: false,
    shake: 0, flash: 0, slow: 0, wipe: null, banner: null, dialog: null,
    nextLife: 30000, deaths: 0, bossSeen: {},
  };
  let L = null; // current level runtime
  let P = null; // player
  let enemies = [], balls = [], items = [], shots = [], parts = [], waves = [], boss = null;
  let platformLayer = null;

  // tier 0 is the floor (always solid); tiers 1..3 come from the level strings
  const solid = (c, r) => !!L && r >= 0 && r < TIER_Y.length && c >= 0 && c < COLS && (r === 0 || L.tiers[r][c] === "#");
  function rowHasSpan(r, x0, x1) {
    for (let c = Math.floor(x0 / T); c <= Math.floor(x1 / T); c++) if (solid(c, r)) return true;
    return false;
  }

  // Generic body vs one-way platforms. Body: x (center), y (feet), vx, vy, hw, onGround, row, ignoreRow
  function physics(b, grav = 0.6, maxFall = 11) {
    b.vy = Math.min(b.vy + grav, maxFall);
    const yp = b.y;
    b.x += b.vx; b.y += b.vy;
    if (b.wrap) { if (b.x < 0) b.x += W; else if (b.x >= W) b.x -= W; }
    else b.x = clamp(b.x, b.hw, W - b.hw);
    b.onGround = false;
    if (b.vy >= 0) {
      const span = b.hw * 0.55;
      for (let r = TIER_Y.length - 1; r >= 0; r--) { // highest ledge first
        const ty = TIER_Y[r];
        if (r === b.ignoreRow || ty < yp - 0.01 || ty > b.y) continue;
        if (rowHasSpan(r, b.x - span, b.x + span)) { b.y = ty; b.vy = 0; b.onGround = true; b.row = r; break; }
      }
    }
    if (b.y > H + 80) { b.y = -40; b.vy = 0; } // safety wrap
    return b.onGround;
  }

  // ---- Particles -----------------------------------------------------------
  function puff(x, y, n = 6, color = "rgba(255,248,230,.9)", spd = 2.2) {
    for (let i = 0; i < n; i++) parts.push({ k: "dust", x, y, vx: rand(-spd, spd), vy: rand(-1.6, -0.2), life: 0, max: rand(18, 30), r: rand(6, 12), color });
  }
  function stars(x, y, n = 8) {
    for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n + rand(-.2, .2), s = rand(3, 6);
      parts.push({ k: "star", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(22, 34), r: rand(5, 9), color: ["#ffe14d", "#fff", "#ff9de2", "#7ff0ff"][i % 4] }); }
  }
  function feathers(x, y, n = 10) {
    for (let i = 0; i < n; i++) parts.push({ k: "feather", x, y, vx: rand(-3, 3), vy: rand(-5, -1), life: 0, max: rand(40, 70), r: rand(5, 9), rot: rand(0, 6), color: "#fffaf0" });
  }
  function popText(x, y, str, color = "#fff", size = 18) {
    // keep inside the screen and stack popups that spawn on top of each other
    const half = (/[가-힣]/.test(str) ? size * 0.6 : size * 0.45) * [...str].length + 12;
    x = clamp(x, half, W - half); y = Math.max(y, 130);
    for (let pass = 0; pass < 6; pass++) {
      const hit = parts.find(q => q.k === "text" && q.life < 40 && Math.abs(q.x - x) < half + 20 && Math.abs(q.y - y) < size + 8);
      if (!hit) break; y = hit.y - size - 10;
    }
    parts.push({ k: "text", x, y, vx: 0, vy: -1.1, life: 0, max: 55, str, color, size });
  }
  function addScore(n, x, y, color) {
    game.score += n;
    if (x != null) popText(x, y, String(n), color || "#ffe14d");
    if (game.score >= game.nextLife) { game.nextLife += 50000; heal(1, true); }
    if (game.score > hiScore) hiScore = game.score;
  }

  // ---- Hearts --------------------------------------------------------------
  const LINES = window.SCRIPT || {};
  const BL = () => LINES.boss || {};
  function heal(n, bonus) {
    const before = game.hp;
    game.hp = Math.min(game.maxHp, game.hp + n);
    if (game.hp > before) { Sound.sfx("oneup"); game.heartPop = 30; popText(P.x, P.y - 150, bonus ? "HEART UP!" : "+♥", "#ff7ad9", 24); }
    else addScore(1000, P.x, P.y - 150, "#ff9de2");
  }

  // ---- Player --------------------------------------------------------------
  function makePlayer() {
    return { x: W / 2, y: FLOOR_Y, vx: 0, vy: 0, hw: 28, h: 100, dir: 1, onGround: true, row: 0, ignoreRow: -1, wrap: true,
      state: "normal", t: 0, inv: 120, tank: [], sucking: false, shootQ: 0, shootCd: 0, shootPose: 0, walkT: 0, dropT: 0, landSquash: 0 };
  }
  // the paw-shaped mouth of the handheld vacuum
  const nozzle = () => ({ x: P.x + P.dir * 66, y: P.y - 47 });
  const MAX_TANK = 5, BEAM = 180, JUMP = -14.9;
  const HELP = params.has("help");                     // assist mode: more hearts, no escapes
  const ESCAPE_T = 360, ESCAPE_WARN = 240;              // captured thieves try to escape after 6s (warning from 4s)
  // per-sheet correction so every pose shows the cat at the same body size (measured by sprite area)
  const SHEET_SCALE = {}; // cat_b / cat_c are size-matched to cat_a in tools/process.py

  function inBeam(x, y, pad = 0) {
    const n = nozzle(), dx = (x - n.x) * P.dir;
    return dx > -30 && dx < BEAM + pad && Math.abs(y - n.y) < 36 + dx * 0.2 + pad;
  }

  // One heart per hit. A hit knocks the cat back and gives a short invincibility; only the last heart
  // triggers the arcade "pop up and fall off the screen" death.
  function hurtPlayer(from) {
    if (P.state !== "normal" || P.inv > 0 || P.slideT > 0 || DEBUG && params.has("god")) return;
    if (boss && boss.hp <= 0) return; // the boss is going down: nothing can hurt the cat any more
    game.hp--; game.deaths++; game.heartHit = 24;
    P.sucking = false; Sound.suck(false); P.t = 0;
    game.shake = 10; Sound.sfx("hurt"); stars(P.x, P.y - 60, 8);
    // any hit knocks the tank loose: captured thieves burst back out in all directions
    if (P.tank.length) {
      P.tank.forEach((item, i) => releaseFromTank(item, (i % 2 ? 1 : -1) * rand(3, 6)));
      enemies.slice(-P.tank.length).forEach(e => { e.angry = 0; });
      popText(P.x, P.y - 150, "놓쳤다!", "#ff5a4e", 24);
      P.tank = []; P.shootQ = 0;
    }
    if (game.hp > 0) {
      const away = from != null ? Math.sign(P.x - from) || -P.dir : -P.dir;
      P.state = "hit"; P.vx = away * 5; P.vy = -7; P.onGround = false;
      if (game.hp === 1 && LINES.heartLow) say(LINES.heartLow);
      return;
    }
    P.state = "hurt"; P.vy = -10; P.vx = -P.dir * 2.5;
  }
  // short speech bubble over the cat's head
  function say(str, who) { const o = who || P; if (!str) return; parts = parts.filter(q => !(q.k === "bubble" && q.who === o)); parts.push({ k: "bubble", x: o.x, y: o.y - (o === P ? 160 : o.talkH || 330), str, life: 0, max: 130, who: o }); }

  function updatePlayer() {
    const p = P; p.t++;
    if (p.inv > 0) p.inv--;
    if (p.landSquash > 0) p.landSquash--;
    if (p.state === "hurt") { // last heart: classic arcade death — pop up, fall off the screen
      if (boss && boss.hp <= 0) { Object.assign(p, makePlayer(), { x: clamp(p.x, 60, W - 60), inv: 120 }); game.hp = 1; puff(p.x, p.y, 10); return; }
      p.vy += 0.5; p.y += p.vy; p.x += p.vx;
      if (p.t > 80) return startGameOver();
      return;
    }
    if (p.state === "hit") { // knocked back, then back in control with a blink
      physics(p); p.vx *= 0.9;
      if (p.t > 22 && p.onGround) { p.state = "normal"; p.inv = 100; }
      return;
    }
    if (p.state === "respawn") {
      physics(p);
      if (p.onGround) { p.state = "normal"; puff(p.x, p.y, 8); Sound.sfx("land"); }
      return;
    }
    if (p.celebrate) { // stage clear / boss down: hop, then wink or yawn and nap
      const c = p.celebrate; c.t++;
      if (c.t === 2 && p.onGround) { p.vy = -9; p.onGround = false; Sound.sfx("jump"); }
      if (c.t === 4 || c.t === 24) stars(p.x, p.y - 120, 8);
      p.vx *= 0.8; physics(p);
      if (c.mode === "boss" && c.t > 150 && c.t % 40 === 0) parts.push({ k: "text", x: p.x + 40 + rand(-6, 6), y: p.y - 110, vx: 0.4, vy: -0.8, life: 0, max: 70, str: "Z", color: "#cfe3ff", size: 22 });
      p.sucking = false; Sound.suck(false);
      return;
    }
    const ctl = game.inputLock ? {} : keys;
    const press = game.inputLock ? {} : pressed;
    if (p.slideCd > 0) p.slideCd--;
    if (press.slide) p.slideBuf = 9;
    if (p.slideBuf > 0) p.slideBuf--;
    if (p.slideBuf > 0 && p.onGround && !p.slideT && !p.slideCd && !p.sucking && !p.shootQ) {
      p.slideBuf = 0;
      if (ctl.left) p.dir = -1; else if (ctl.right) p.dir = 1;
      p.slideT = 24; p.slideCd = 40; Sound.sfx("throwp"); puff(p.x - p.dir * 20, p.y, 5);
    }
    if (p.slideT > 0) {
      p.slideT--;
      p.vx = p.dir * (p.slideT > 6 ? 9.2 : 9.2 * p.slideT / 6); // fixed distance, eases out at the end
      if (p.slideT % 3 === 0) puff(p.x - p.dir * 30, p.y, 1, "rgba(255,248,230,.85)", 1.2);
      physics(p); p.walkT += 0.3;
      return;
    }
    // horizontal
    if (p.doze > 0) { p.doze--; if (p.doze % 18 === 0) parts.push({ k: "text", x: p.x + 30, y: p.y - 120, vx: 0.4, vy: -0.7, life: 0, max: 40, str: "z", color: "#cfe3ff", size: 18 }); }
    const accel = p.sucking ? 0.35 : 0.9, top = p.sucking ? 1.5 : p.doze > 0 ? 1.6 : 4.2;
    if (ctl.left) { p.vx = Math.max(p.vx - accel, -top); if (!p.sucking) p.dir = -1; }
    else if (ctl.right) { p.vx = Math.min(p.vx + accel, top); if (!p.sucking) p.dir = 1; }
    else p.vx *= p.onGround ? 0.62 : 0.9;
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
    // jump / drop-through
    if (press.jump && p.onGround) {
      if (ctl.down && p.row > 0) { p.ignoreRow = p.row; p.dropT = 14; p.onGround = false; p.vy = 1; }
      else { p.vy = JUMP; p.onGround = false; Sound.sfx("jump"); puff(p.x, p.y, 4); }
    }
    if (!ctl.jump && p.vy < -5) p.vy = -5; // variable jump height
    if (p.dropT > 0 && --p.dropT === 0) p.ignoreRow = -1;
    const was = p.onGround;
    physics(p);
    if (p.onGround && !was && p.t > 2) { p.landSquash = 8; puff(p.x, p.y, 3); }
    if (p.onGround && p.ignoreRow >= 0 && p.row !== p.ignoreRow && p.dropT <= 0) p.ignoreRow = -1;
    p.walkT += Math.abs(p.vx) * 0.1;

    // vacuum / shoot: hold to suck, press again to throw what you caught
    if (press.fire) {
      if (p.tank.length && p.shootQ === 0) { p.shootQ = p.tank.length; p.shootCd = 0; }
      else if (!p.tank.length) p.sucking = true;
    }
    if (!ctl.fire) p.sucking = false;
    if (p.tank.length >= MAX_TANK) p.sucking = false;
    if (p.shootQ > 0) { p.sucking = false; if (--p.shootCd <= 0) { fireBall(); p.shootQ--; p.shootCd = 7; } }
    if (p.shootPose > 0) p.shootPose--;
    if (p.recoil > 0) p.recoil--;
    if (p.gulp > 0) p.gulp--;
    updateTank();
    // vacuuming takes effort: the cat slowly gets dragged and kicks up dust
    if (p.sucking) { p.suckT = (p.suckT || 0) + 1; if (p.onGround && p.suckT % 9 === 0) puff(p.x - p.dir * 34, p.y, 2, "rgba(255,248,230,.85)", 1.5); }
    else p.suckT = 0;
    if (Math.abs(p.vx) < 0.4 && p.onGround && !p.sucking && !p.shootPose) p.idleT = (p.idleT || 0) + 1; else p.idleT = 0;
    Sound.suck(p.sucking);
    if (p.sucking && game.t % 3 === 0) {
      const n = nozzle(), d = rand(60, BEAM);
      parts.push({ k: "suckdot", x: n.x + p.dir * d, y: n.y + rand(-1, 1) * (30 + d * 0.18), tx: n.x, ty: n.y, life: 0, max: 16, r: rand(3, 5), color: "#fff" });
    }
  }

  function captureFx(type, n, frame, dir) {
    Sound.sfx("capture"); stars(n.x, n.y, 8);
    parts.push({ k: "slurp", type, f: frame ?? 0, x: n.x + P.dir * 40, y: n.y, tx: n.x, ty: n.y, dir: dir || 1, life: 0, max: 9 });
    parts.push({ k: "ring", x: n.x, y: n.y, life: 0, max: 14, r: 10, color: "#ffffff" });
    P.gulp = 12;
  }
  // a captured thief bursts back out of the nozzle (escape, or when the cat is knocked out)
  function releaseFromTank(item, vx) {
    if (["pillow", "paper", "water"].includes(item.type)) return;
    if (item.type === "cloud") item = { ...item, type: "sheep" };
    const n = P ? nozzle() : { x: W / 2, y: FLOOR_Y - 50 };
    spawnEnemy(item.type, 0); const e = enemies[enemies.length - 1];
    Object.assign(e, { x: clamp(n.x, 40, W - 40), y: n.y + 30, vx: vx ?? P.dir * 5, vy: -8, state: "popout", t: 0, drawScale: 0.25, dir: P.dir });
    if (item.shield === false) e.shield = false;
    stars(n.x, n.y, 10); parts.push({ k: "ring", x: n.x, y: n.y, life: 0, max: 16, r: 14, color: "#ffe14d" });
    Sound.sfx("pop");
  }
  function updateTank() {
    for (const it of P.tank) it.t++;
    const out = HELP ? -1 : P.tank.findIndex(it => !["pillow", "paper", "water"].includes(it.type) && it.t >= ESCAPE_T);
    if (out >= 0 && P.state === "normal" && !P.shootQ) {
      const [it] = P.tank.splice(out, 1);
      releaseFromTank(it);
      const e = enemies[enemies.length - 1]; if (e) e.angry = 360;
      popText(P.x, P.y - 150, "탈출!", "#ff5a4e", 26); game.shake = Math.max(game.shake, 5); P.gulp = 10;
    }
    P.rattle = !HELP && P.tank.some(it => !["pillow", "paper", "water"].includes(it.type) && it.t >= ESCAPE_WARN);
    if (P.rattle && game.t % 14 === 0) Sound.sfx("tick");
  }

  function fireBall() {
    const n = nozzle(), item = P.tank.pop(); if (!item) return;
    balls.push({ type: item.type, x: n.x + P.dir * 12, y: n.y + 38, vx: P.dir * 11, vy: -2, hw: 34, R: 42, onGround: false, row: -1, ignoreRow: -1,
      dir: P.dir, rot: 0, bounces: 0, life: 0, combo: 0, hits: 0, power: 1 });
    P.shootPose = 12; P.recoil = 10; P.vx -= P.dir * 1.6;
    Sound.sfx("shoot"); game.shake = Math.max(game.shake, 3);
    stars(n.x, n.y, 6); parts.push({ k: "ring", x: n.x, y: n.y, life: 0, max: 12, r: 12, color: "#fff4d6" }); puff(n.x, n.y, 4);
  }

  // ---- Enemies -------------------------------------------------------------
  const front = e => (P.x - e.x) * e.dir > 0; // is the cat in front of this enemy?
  const EDEF = {
    goblin:  { speed: 1.4, walk: [0, 1, 2, 1], stun: 3, hw: 26 },
    raccoon: { speed: 2.1, walk: [0, 1, 2, 1], stun: 4, leap: 3, hw: 30 },
    bunny:   { speed: 1.2, walk: [0, 1, 2, 1], stun: 4, thr: 3, hw: 26 },
    // ch2: carries a quilted cushion as a shield. The bell can't pull it from the front —
    // lure it into a charge, then grab it while it pants, or slip behind it. A bubble to the shield knocks it away.
    shield:  { speed: 1.25, walk: [0, 1, 2, 1], stun: 5, hw: 30, ch: 2,
      blocks: e => e.shield && front(e) && !["tired", "dazed", "pulled"].includes(e.state),
      onBubble(e, b) { if (e.shield && b.dir === -e.dir && e.state !== "tired") { e.shield = false; e.state = "dazed"; e.t = -60; e.vx = b.dir * 3; e.vy = -5; stars(e.x, e.y - 60, 8); popText(e.x, e.y - 120, "방패 날아감!", "#ffd23a", 20); Sound.sfx("bossHit"); return false; } } },
    // ch2: a padded button doll. Its zipper feet grip the floor, so it can only be pulled in while flipped over.
    // It rolls at you when level with the cat and flips when it hits a wall — or when a bubble bumps it.
    button:  { speed: 0.9, walk: [0, 1], stun: 4, hw: 26, ch: 2,
      blocks: e => !["flipped", "dazed", "pulled"].includes(e.state),
      onBubble(e, b) { if (e.state !== "flipped" && e.state !== "dazed") { flipButton(e); return false; } } },
  };
  // shield-like guards share one behaviour (front blocks the vacuum, charge -> panting opening, a ball to the front knocks it off)
  const guardFront = (label) => ({
    blocks: e => e.shield && front(e) && !["tired", "dazed", "pulled", "boast"].includes(e.state),
    onBubble(e, b) { if (e.shield && b.dir === -e.dir && e.state !== "tired" && e.state !== "boast") { e.shield = false; e.type = "goblin"; e.state = "dazed"; e.t = -60; e.vx = b.dir * 3; e.vy = -5; stars(e.x, e.y - 60, 8); popText(e.x, e.y - 120, label, "#ffd23a", 20); Sound.sfx("bossHit"); return false; } },
  });
  Object.assign(EDEF, {
    // ch3: towel-wrapped raccoon — first pull only wrings out the water (water ammo), then it is an ordinary raccoon
    wetcoon:  { speed: 1.0, walk: [0, 1, 2, 1], stun: 4, hw: 32, ch: 3, peel: e => { e.type = "raccoon"; return "water"; }, peelText: "물방울 탄 GET!" },
    // ch3: foam hat soaks up the first ball (or the first pull); a water ball goes straight through
    foamgob:  { speed: 1.3, walk: [0, 1, 2, 1], stun: 5, hw: 26, ch: 3, peel: e => { e.type = "goblin"; burstFoam(e); return ""; },
      onBubble(e, b) { if (b.type !== "water") { e.type = "goblin"; burstFoam(e); e.state = "dazed"; e.t = 0; return false; } } },
    // ch4: hides in a box; peeks out when the cat comes close (only then can it be pulled or hit). A ball knocks the lid open.
    boxbun:   { speed: 0.8, walk: [0, 1], stun: 4, hw: 30, ch: 4,
      blocks: e => e.state === "boxed",
      onBubble(e, b) { if (e.state === "boxed") { e.state = "peek"; e.t = -90; stars(e.x, e.y - 60, 6); Sound.sfx("pop"); return false; } } },
    // ch4: price-tag goblin — the tag blocks the vacuum from the front, except while it boasts with the tag held high
    taggob:   { speed: 1.3, walk: [0, 1, 2, 1], stun: 4, hw: 28, ch: 4, guard: true, charge: 4.8, tiredFrame: 3, chargeFrame: 5, ...guardFront("값표 날아감!") },
    // ch5: lullaby sheep scatters sleepy notes; pulled in it becomes a cloud ball
    sheep:    { speed: 0.9, walk: [0, 1, 2, 1], stun: 4, hw: 32, ch: 5 },
    // ch5: bat sleeps up high, swoops when the cat passes underneath, and can only be caught after it lands
    bat:      { speed: 0, walk: [0], stun: 4, hw: 26, ch: 5, fly: true,
      blocks: e => !["landed", "dazed", "pulled"].includes(e.state),
      onBubble(e) { if (!["landed", "dazed"].includes(e.state)) return false; } },
    // ch6: royal guard with a blanket cape — a faster shield goblin
    guard:    { speed: 1.5, walk: [0, 1, 2, 1], stun: 5, hw: 30, ch: 6, guard: true, charge: 6.2, tiredFrame: 4, chargeFrame: 3, ...guardFront("망토 날아감!") },
    // ch6: raccoon under a load of pillows — first pull takes the pillows (big pillow ammo), then it runs fast
    pillowcoon: { speed: 1.0, walk: [0, 1, 2, 1], stun: 4, hw: 32, ch: 6, peel: e => { e.type = "raccoon"; e.angry = 900; return "pillow"; }, peelText: "베개 탄 GET!" },
  });
  EDEF.shield.guard = true; EDEF.shield.charge = 4.6; EDEF.shield.tiredFrame = 3; EDEF.shield.chargeFrame = 0;
  function burstFoam(e) { for (let i = 0; i < 8; i++) parts.push({ k: "dust", x: e.x + rand(-20, 20), y: e.y - 90 + rand(-10, 10), vx: rand(-2, 2), vy: rand(-2, 0), life: 0, max: 30, r: rand(6, 12), color: "rgba(235,250,255,.9)" }); Sound.sfx("pop"); popText(e.x, e.y - 120, "거품 퐁!", "#bff4ff", 18); }
  function flipButton(e) { e.state = "flipped"; e.t = 0; e.vx = 0; e.vy = -6; e.onGround = false; Sound.sfx("land"); stars(e.x, e.y - 40, 6); }
  function spawnEnemy(type, col, fromBoss) {
    const d = EDEF[type];
    enemies.push({ type, shield: !!d.guard, x: col * T + T / 2, y: -60 - rand(0, 40), vx: 0, vy: 0, hw: d.hw, dir: Math.random() < 0.5 ? -1 : 1,
      onGround: false, row: -1, ignoreRow: -1, state: "enter", t: 0, jumpCd: rand(90, 200), act: rand(80, 180), edge: false, anim: rand(0, 10), fromBoss });
  }

  function updateEnemy(e) {
    const lv = LEVELS[game.stage], ramp = 1 + ((lv.n || 1) - 1) * 0.06 + ((lv.chapter || 1) - 1) * 0.08;
    const d = EDEF[e.type], sp = Math.min(4, d.speed * ramp * (game.hurry ? 1.2 : 1) * (e.angry > 0 ? 1.3 : 1));
    e.t++;
    if (e.angry > 0) e.angry--;
    if (e.state === "popout") { // bursting out of the nozzle: elastic grow, then a short daze
      physics(e); e.vx *= 0.96;
      if (e.t > 16 && e.onGround) { e.state = "dazed"; e.t = 20; }
      return;
    }
    if (e.state === "dead") {
      e.vy += 0.5; e.x += e.vx; e.y += e.vy; e.rot += 0.3 * Math.sign(e.vx || 1);
      if (e.x < 20 || e.x > W - 20) e.vx *= -1;
      if (e.t > 34 && e.vy > 0) { dropItem(e.x, e.y - 20); e.gone = true; }
      return;
    }
    // vacuum pull
    // once caught, a thief stays caught while the button is held (wider margin = no in/out flicker)
    const blocked = EDEF[e.type].blocks && EDEF[e.type].blocks(e);
    if (blocked && P.sucking && P.state === "normal" && e.state !== "enter" && inBeam(e.x, e.y - 45)) {
      e.blockT = (e.blockT || 0) + 1; P.beamStop = Math.min(P.beamStop ?? BEAM, Math.abs(e.x - nozzle().x) - 20);
      if (e.blockT % 10 === 1) { stars(e.x - e.dir * 10, e.y - 50, 3); Sound.sfx("tick"); }
      if (e.blockT === 20) popText(e.x, e.y - 120, e.type === "button" ? "꽉!" : "팅!", "#cfd3ff", 22);
    } else e.blockT = 0;
    if (!blocked && P.sucking && P.state === "normal" && e.state !== "enter" && inBeam(e.x, e.y - 45, e.state === "pulled" ? 50 : 0)) {
      e.state = "pulled"; e.pullT = (e.pullT || 0) + 1; e.dir = P.x > e.x ? 1 : -1;
      const n = nozzle(), dx = n.x - e.x, dy = n.y - (e.y - 45), dist = Math.hypot(dx, dy);
      // tug of war: first the thief digs its heels in and barely budges (feet on the ground, struggling),
      // then it loses its grip and the pull eases in hard — slow, slow, then *slurp*
      const RESIST = e.type === "raccoon" ? 52 : 44;
      const k = clamp((e.pullT - RESIST) / 34, 0, 1);
      e.resist = 1 - k;
      if (e.pullT < RESIST) {
        // dragged in little scuffs — but never closer than a short distance from the mouth while still resisting
        if (dist > 70) e.x += Math.sign(dx) * (0.35 + Math.sin(e.pullT * 0.9) * 0.55);
        if (e.pullT % 6 === 0 && e.onGround) puff(e.x - Math.sign(dx) * 20, e.y, 1, "rgba(255,248,230,.8)", 1);
      } else {
        const sp2 = 0.6 + 15 * k * k * k; // ease-in
        e.x += dx / dist * Math.min(sp2, dist); e.y += dy / dist * Math.min(sp2, dist) * 0.9;
      }
      e.vx = e.vy = 0;
      if (dist < 70 && e.pullT >= RESIST + 4 && d.peel) { // first pull only strips the outer layer
        const ammo = d.peel(e); e.state = "dazed"; e.t = 0; e.pullT = 0; e.vx = -e.dir * 3; e.vy = -6;
        if (ammo && P.tank.length < MAX_TANK) { P.tank.push({ type: ammo, t: 0 }); captureFx(ammo, n); popText(n.x, n.y - 70, d.peelText || "GET!", "#7ff0ff", 20); }
        else if (ammo) popText(n.x, n.y - 70, "탱크 FULL!", "#ff9b6b", 20);
        return;
      }
      if (dist < 46 && e.pullT >= RESIST + 10) { // captured: slurped into the nozzle (only after the tug-of-war)
        e.gone = true; P.tank.push({ type: e.type === "sheep" ? "cloud" : e.type, t: 0, shield: e.shield }); captureFx(e.type, n, enemyFrame(e), e.dir);
        popText(n.x, n.y - 44, P.tank.length >= MAX_TANK ? "FULL!" : "GET!", "#7ff0ff", 20);
      }
      return;
    }
    if (e.state === "pulled") { e.state = "dazed"; e.t = 0; e.pullT = Math.min(e.pullT, 14); e.resist = 0; }
    if (e.state === "dazed") { physics(e); if (e.onGround) e.vx *= 0.8; if (e.t > 45 && e.onGround) { e.state = e.type === "boxbun" ? "boxed" : "walk"; e.t = 0; } return; }
    if (e.state === "enter") {
      if (d.fly) { // bats flap in to a perch near the top of the screen
        e.perchY = e.perchY ?? (100 + Math.random() * 10); e.homeX = e.homeX ?? e.x; e.y += (e.perchY - e.y) * 0.06; e.vy = 0;
        if (Math.abs(e.y - e.perchY) < 3) { e.state = "hang"; e.t = 0; }
        return;
      }
      physics(e, 0.45, 7);
      if (e.onGround) { const near = Math.abs(P.x - e.x) < 80 && Math.abs(P.y - e.y) < 60; e.state = e.type === "boxbun" ? "boxed" : near ? "dazed" : "walk"; e.t = 0; puff(e.x, e.y, 4); }
      return;
    }
    if (e.type === "bat") return updateBat(e);
    if (e.type === "boxbun" && ["boxed", "peek"].includes(e.state)) return updateBox(e, sp);
    if (e.state === "throw") {
      physics(e);
      if (e.t === 16) { shots.push({ k: "sock", x: e.x + e.dir * 40, y: e.y - 58, vx: e.dir * 4.8, vy: 0, rot: 0, life: 0 }); Sound.sfx("sock"); }
      if (e.t > 30) { e.state = "walk"; e.t = 0; }
      return;
    }
    if (e.state === "charge") { // guards rush forward behind their shield/tag/cape
      e.anim += 0.4; e.vx = e.dir * (d.charge || 4.6);
      if (e.t % 5 === 0) puff(e.x - e.dir * 24, e.y, 1);
      const ahead = e.x + e.dir * (e.hw + 4);
      if (e.t > 75 || ahead < e.hw || ahead > W - e.hw || !rowHasSpan(e.row, ahead - 2, ahead + 2)) { e.state = "tired"; e.t = 0; e.vx = 0; Sound.sfx("land"); }
      physics(e); return;
    }
    if (e.state === "tired") { // panting with the shield lowered — the opening
      e.vx = 0; physics(e);
      if (e.t % 24 === 0) parts.push({ k: "text", x: e.x + e.dir * 24, y: e.y - 100, vx: 0.3, vy: -0.6, life: 0, max: 40, str: "헥", color: "#fff", size: 14 });
      if (e.t > 125) { e.state = "walk"; e.t = 0; e.dir *= -1; }
      return;
    }
    if (e.state === "roll") { // button soldier bowls at the cat
      e.vx = e.dir * 5.4; e.spin = (e.spin || 0) + e.dir * 0.35;
      const ahead = e.x + e.dir * (e.hw + 4);
      if (ahead < e.hw || ahead > W - e.hw || e.t > 150) { flipButton(e); e.vx = -e.dir * 2; return; }
      if (!rowHasSpan(e.row, ahead - 2, ahead + 2)) { e.state = "fall"; }
      physics(e); return;
    }
    if (e.state === "fall") { physics(e); if (e.onGround) flipButton(e); return; }
    if (e.state === "flipped") { physics(e); if (e.onGround) e.vx *= 0.8; if (e.t > 230) { e.state = "walk"; e.t = 0; puff(e.x, e.y, 4); } return; }

    // walk / AI
    e.anim += sp * 0.09;
    if (e.type === "taggob" && e.shield && e.onGround && (e.boastCd = (e.boastCd ?? rand(120, 200)) - 1) <= 0) { // proudly shows off its tag
      e.state = "boast"; e.t = 0; e.boastCd = rand(200, 300); e.vx = 0;
    }
    if (e.state === "boast") { physics(e); if (e.t % 30 === 1) stars(e.x, e.y - 130, 3); if (e.t > 80) { e.state = "walk"; e.t = 0; } return; }
    if (e.type === "sheep" && e.onGround && (e.singCd = (e.singCd ?? rand(90, 160)) - 1) <= 0) { e.state = "sing"; e.t = 0; e.singCd = rand(220, 320); }
    if (e.state === "sing") {
      e.vx = 0; physics(e);
      if (e.t % 22 === 8 && e.t < 70) { shots.push({ k: "note", x: e.x + e.dir * 30, y: e.y - 80, vx: (P.x > e.x ? 1 : -1) * 1.8, vy: -0.4, life: 0, seed: rand(0, 6) }); Sound.sfx("blip"); }
      if (e.t > 80) { e.state = "walk"; e.t = 0; }
      return;
    }
    if (e.onGround && d.guard && e.shield && Math.abs(P.y - e.y) < 30 && front(e) && Math.abs(P.x - e.x) < 330 && (e.chargeCd = (e.chargeCd || 60) - 1) <= 0 && P.state === "normal") {
      e.state = "charge"; e.t = 0; e.chargeCd = 160; Sound.sfx("whistle"); popText(e.x, e.y - 120, "돌격!", "#ff9b3d", 20); return;
    }
    if (e.onGround && e.type === "button" && Math.abs(P.y - e.y) < 30 && Math.abs(P.x - e.x) < 420 && (e.rollCd = (e.rollCd || 90) - 1) <= 0 && P.state === "normal") {
      e.dir = P.x > e.x ? 1 : -1; e.state = "roll"; e.t = 0; e.rollCd = 200; Sound.sfx("throwp"); return;
    }
    if (e.onGround) {
      e.vx = e.dir * sp;
      const ahead = e.x + e.dir * (e.hw + 2);
      if (ahead < e.hw || ahead > W - e.hw) e.dir *= -1;
      else if (!rowHasSpan(e.row, ahead - 2, ahead + 2)) {
        if (!e.edge) { e.edge = true; if (e.row === 0 || Math.random() < 0.5) e.dir *= -1; }
      } else e.edge = false;
      // climb toward the player
      if (--e.jumpCd <= 0) {
        e.jumpCd = rand(100, 220) / (game.hurry ? 1.6 : 1);
        const up = P.y < e.y - 80, r2 = e.row + 1;
        if (up && r2 < TIER_Y.length && rowHasSpan(r2, e.x - 70, e.x + 70)) { e.vy = JUMP; e.vx = e.dir * sp * 0.6; e.onGround = false; e.jumpPose = 30; }
        else if (e.type === "raccoon" && Math.random() < 0.5) { e.dir = P.x > e.x ? 1 : -1; e.vy = -10; e.vx = e.dir * 4.4; e.onGround = false; e.jumpPose = 30; }
        else if (P.y > e.y + 80 && e.row > 0 && Math.random() < 0.5) { e.ignoreRow = e.row; e.dropT = 16; e.vy = 1; e.onGround = false; }
        else if (Math.random() < 0.35) e.dir = P.x > e.x ? 1 : -1;
      }
      // bunny throws socks when level with the player
      if (e.type === "bunny" && --e.act <= 0 && Math.abs(P.y - e.y) < 30 && (P.x - e.x) * e.dir > 0 && Math.abs(P.x - e.x) < 560 && P.state === "normal") {
        e.state = "throw"; e.t = 0; e.vx = 0; e.act = rand(120, 220); return;
      }
    }
    if (e.dropT > 0 && --e.dropT === 0) e.ignoreRow = -1;
    if (e.jumpPose > 0) e.jumpPose--;
    physics(e);
    if (e.onGround && e.ignoreRow >= 0 && e.row !== e.ignoreRow) e.ignoreRow = -1;
  }

  function updateBox(e, sp) {
    physics(e);
    if (e.state === "boxed") {
      e.anim += sp * 0.08; if (e.onGround) e.vx = e.dir * sp;
      const ahead = e.x + e.dir * (e.hw + 2);
      if (ahead < e.hw || ahead > W - e.hw || (e.onGround && !rowHasSpan(e.row, ahead - 2, ahead + 2))) e.dir *= -1;
      if (Math.abs(P.x - e.x) < 210 && Math.abs(P.y - e.y) < 60 && P.state === "normal") { e.state = "peek"; e.t = 0; e.vx = 0; Sound.sfx("tick"); }
      if (e.onGround && e.row > 0 && P.y > e.y + 80 && Math.random() < 0.004) { e.ignoreRow = e.row; e.dropT = 16; e.onGround = false; e.vy = 1; }
      if (e.dropT > 0 && --e.dropT === 0) e.ignoreRow = -1;
    } else if (e.state === "peek") { e.vx = 0; if (e.t > 150) { e.state = "boxed"; e.t = 0; } }
  }
  function updateBat(e) {
    if (e.state === "hang") {
      e.y = e.perchY + Math.sin(game.t * 0.05 + e.anim) * 3;
      if (e.t % 50 === 0) parts.push({ k: "text", x: e.x + 14, y: e.y - 40, vx: 0.3, vy: -0.5, life: 0, max: 40, str: "z", color: "#e8e6ff", size: 14 });
      if (Math.abs(P.x - e.x) < 120 && P.y > e.y + 40 && e.t > 60 && P.state === "normal") { e.state = "wake"; e.t = 0; Sound.sfx("whistle"); popText(e.x, e.y + 20, "!", "#ffd23a", 26); }
      return;
    }
    if (e.state === "wake") { if (e.t > 34) { e.state = "swoop"; e.t = 0; e.tx = P.x; e.dir = P.x > e.x ? 1 : -1; e.landRow = P.onGround ? P.row : Math.max(0, TIER_Y.findLastIndex(y => y >= P.y - 1)); } return; }
    if (e.state === "swoop") {
      e.vx = clamp((e.tx - e.x) * 0.05, -6, 6); e.vy = 6.5; e.x += e.vx; const yp = e.y; e.y += e.vy;
      for (let r = e.landRow ?? 0; r >= 0; r--) if (yp <= TIER_Y[r] && e.y >= TIER_Y[r] && rowHasSpan(r, e.x - 10, e.x + 10)) { e.y = TIER_Y[r]; e.row = r; e.state = "landed"; e.t = 0; e.onGround = true; e.vx = 0; puff(e.x, e.y, 5); Sound.sfx("land"); stars(e.x, e.y - 30, 4); break; }
      if (P.state === "normal" && Math.abs(P.x - e.x) < 44 && Math.abs((P.y - 50) - (e.y - 30)) < 50) hurtPlayer(e.x);
      return;
    }
    if (e.state === "landed") { physics(e); e.vx = 0; if (e.t > 300) { e.state = "rise"; e.t = 0; } return; }
    if (e.state === "rise") { e.y += (e.perchY - e.y) * 0.05; e.x += ((e.homeX ?? e.x) - e.x) * 0.05; if (Math.abs(e.y - e.perchY) < 4) { e.state = "hang"; e.t = 0; } return; }
    if (e.state === "walk") { e.state = "rise"; e.t = 0; } // after a daze it flies back up
  }
  function killEnemy(e, ball) {
    e.state = "dead"; e.t = 0; e.vx = Math.sign(ball.vx || 1) * rand(2, 4); e.vy = -9; e.rot = 0;
    ball.combo++; ball.hits = ball.combo; ball.power = ball.combo > 0 ? 2 : 1;
    const pts = Math.min(200 * Math.pow(2, ball.combo - 1), 12800);
    addScore(pts, e.x, e.y - 90);
    if (ball.combo >= 2) popText(e.x, e.y - 122, `${ball.combo} COMBO!`, "#ff7ad9", 22);
    Sound.sfx("hit", ball.combo); stars(e.x, e.y - 45, 12); game.shake = Math.max(game.shake, 5);
  }
  // ---- Balls (thrown thieves roll along the ground and bounce off the walls) ----
  function updateBall(b) {
    b.life++; b.rot += b.vx * 0.035;
    const vxBefore = b.vx;
    physics(b, 0.55, 11);
    if ((b.x <= b.hw + 0.5 && vxBefore < 0) || (b.x >= W - b.hw - 0.5 && vxBefore > 0)) {
      b.vx = -vxBefore; b.dir = Math.sign(b.vx); b.bounces++; Sound.sfx("land"); stars(b.x, b.y - 34, 5);
    }
    if (b.life % 2 === 0) { // soft aurora wake + a few sparkles
      parts.push({ k: "trail", x: b.x, y: b.y - 38, vx: 0, vy: 0, life: 0, max: 16, r: 34, color: ["#7ff0ff", "#b98bff", "#ff9de2", "#8ff5d6"][(b.life / 2) % 4] });
      if (b.life % 6 === 0) parts.push({ k: "star", x: b.x + rand(-30, 30), y: b.y - 38 + rand(-30, 30), vx: -Math.sign(b.vx) * 0.8, vy: rand(-1, 0), life: 0, max: 20, r: 5, color: "#ffffff" });
    }
    for (const e of enemies) {
      if (e.gone || ["dead", "enter", "popout"].includes(e.state)) continue;
      const reach = b.type === "pillow" ? 84 : 56; // pillow balls are big and sweep wide
      if (Math.abs(e.x - b.x) < reach && Math.abs((e.y - 45) - (b.y - 36)) < reach + 4) {
        if (e.skipBall === b) continue;
        const def = EDEF[e.type];
        b.dir = Math.sign(b.vx) || b.dir;
        if (b.type !== "cloud" && def.onBubble && def.onBubble(e, b) === false) { e.skipBall = b; continue; } // shield knocked off / button flipped / foam popped
        killEnemy(e, b);
      }
    }
    if (boss && boss.ballHook && boss.ballHook(b)) return;
    if (boss && boss.hittable() && boss.box && boss.box({ x: b.x, y: b.y - 36, R: 42 })) {
      if (boss.hit(b)) { b.gone = true; stars(b.x, b.y - 36, 14); dropItem(b.x, b.y - 40); return; }
      b.vx = -b.vx * 0.8; b.x += Math.sign(b.vx) * 30; b.bounces++; // deflected by a shield
    }
    if (b.bounces >= 2 || b.life > 260) {
      b.gone = true; Sound.sfx("pop"); stars(b.x, b.y - 36, 12);
      addScore(100, b.x, b.y - 70); dropItem(b.x, b.y - 40);
    }
  }

  // ---- Items ---------------------------------------------------------------
  const ITEM_PTS = [100, 300, 200, 500, 400, 150, 700, 1000];
  function dropItem(x, y) {
    const heart = game.hp < game.maxHp && Math.random() < 0.07;
    const k = heart ? 8 : Math.random() < 0.08 ? 7 : Math.floor(rand(0, 7));
    items.push({ k, x: clamp(x, 40, W - 40), y, vx: rand(-1.5, 1.5), vy: -6, hw: 24, onGround: false, row: -1, ignoreRow: -1, life: 0, bob: rand(0, 6) });
  }
  function updateItem(it) {
    it.life++;
    if (!it.onGround) physics(it, 0.45, 8); else it.vx = 0;
    if (it.onGround && !rowHasSpan(it.row, it.x - 10, it.x + 10)) it.onGround = false;
    if (it.life > 600) it.gone = true;
    if (P.state === "normal" && Math.abs(it.x - P.x) < 46 && Math.abs((it.y - 26) - (P.y - 50)) < 60) {
      it.gone = true; stars(it.x, it.y - 26, 6);
      if (it.k === 8) heal(1); else { addScore(ITEM_PTS[it.k], it.x, it.y - 56, "#7dff7a"); Sound.sfx("item"); }
    }
  }

  // ---- Projectiles (socks, pillows) & shockwaves --------------------------
  function updateShot(s) {
    s.life++;
    if (s.k === "sock") { s.x += s.vx; s.rot += 0.3; if (s.x < -20 || s.x > W + 20) s.gone = true; }
    if (s.k === "note") {
      s.x += s.vx; s.y += s.vy + Math.sin(s.life * 0.12 + s.seed) * 0.8; if (s.life > 300 || s.x < -20 || s.x > W + 20) s.gone = true;
      if (P.state === "normal" && !P.slideT && Math.abs(s.x - P.x) < 34 && Math.abs(s.y - (P.y - 50)) < 50) { s.gone = true; P.doze = 70; Sound.sfx("blip"); popText(P.x, P.y - 150, "꾸벅…", "#cfe3ff", 22); }
      if (P.sucking && P.state === "normal" && inBeam(s.x, s.y)) { s.gone = true; Sound.sfx("pop"); }
      return;
    }
    if (s.k === "paper") { s.y += 1.25; s.x += Math.sin(s.life * 0.06 + s.seed) * 2.2; s.rot = Math.sin(s.life * 0.08 + s.seed) * 0.7; if (s.y > FLOOR_Y) { s.gone = true; puff(s.x, FLOOR_Y, 2); } }
    if (s.k === "tag") { s.x += s.vx; s.rot = Math.sin(s.life * 0.3) * 0.3; if (s.x < -30 || s.x > W + 30) s.gone = true; }
    if (s.k === "pillow" || s.k === "coin") {
      s.vy += 0.32; s.x += s.vx; s.y += s.vy; s.rot += 0.12;
      if (s.vy > 0) { // bursts on whichever ledge it falls onto
        const yp = s.y - s.vy;
        for (let r = 0; r < TIER_Y.length; r++) {
          if ((r === 0 || s.life > 20) && yp <= TIER_Y[r] && s.y >= TIER_Y[r] && rowHasSpan(r, s.x - 6, s.x + 6)) { s.gone = true; if (s.k === "coin") stars(s.x, TIER_Y[r] - 10, 4); else feathers(s.x, TIER_Y[r] - 10); Sound.sfx("land"); break; }
        }
      }
      if (s.x < -40 || s.x > W + 40) s.gone = true;
    }
    if (P.sucking && P.state === "normal" && inBeam(s.x, s.y)) { // the vacuum eats projectiles too
      const n = nozzle(); s.x += (n.x - s.x) * 0.3; s.y += (n.y - s.y) * 0.3;
      if (Math.hypot(n.x - s.x, n.y - s.y) < 40) {
        s.gone = true; addScore(50, n.x, n.y - 44, "#7ff0ff");
        // the boss's pillows become ammo you can throw right back at him
        if (s.k === "pillow" && P.tank.length < MAX_TANK) { captureFx("pillow", n); P.tank.push({ type: "pillow", t: 0 }); popText(n.x, n.y - 70, "베개 탄 GET!", "#7ff0ff", 20); }
        else if ((s.k === "paper" || s.k === "tag") && P.tank.length < MAX_TANK) { captureFx("paper", n); P.tank.push({ type: "paper", t: 0 }); popText(n.x, n.y - 70, s.k === "tag" ? "값표 탄 GET!" : "서류 탄 GET!", "#7ff0ff", 20); }
        else Sound.sfx("pop");
      }
      return;
    }
    if (P.state === "normal" && Math.abs(s.x - P.x) < 36 && Math.abs(s.y - (P.y - 50)) < 48) {
      if (s.k === "paper") { s.gone = true; if (P.tank.length < MAX_TANK) { P.tank.push({ type: "paper", t: 0 }); Sound.sfx("item"); popText(P.x, P.y - 150, "서류 탄 GET!", "#7ff0ff", 20); } return; }
      hurtPlayer(s.x); s.gone = true;
    }
  }
  function updateWave(w) {
    w.x += w.dir * (w.k === "foam" ? 5.2 : 7); w.life++;
    if (w.life % 3 === 0) puff(w.x, FLOOR_Y, 2, w.k === "foam" ? "rgba(225,245,255,.9)" : "rgba(230,210,180,.85)", 1.2);
    if (w.x < -40 || w.x > W + 40) w.gone = true;
    if (P.state === "normal" && P.onGround && P.row === 0 && Math.abs(P.x - w.x) < 38) hurtPlayer(w.x);
  }

  // ---- Boss: 도둑 두목 빅고블 ---------------------------------------------------
  function makeBoss() {
    const b = {
      x: 740, y: -320, vx: 0, vy: 0, dir: -1, hp: 12, maxHp: 12, state: "wait", t: 0, inv: 0, frame: 0,
      lastSummon: -999, act: 0, hitFlash: 0, talkCd: 0,
      name: "빅고블", portrait: ["boss", 0, 0.55, 92],
      hittable() { return ["taunt", "walk", "guard", "crouch", "leap", "recover", "stunned", "throw", "summon", "hurt"].includes(this.state) && this.inv <= 0; },
      box(b) { return Math.abs(this.x - b.x) < 112 && b.y > this.y - 280 && b.y < this.y + 20; },
      // returns false when the hit is blocked (ball bounces off the sack shield)
      hit(ball) {
        const combo = ball.power > 1 || ball.hits > 0, stunned = this.state === "stunned";
        if (this.state === "guard" && Math.sign(ball.vx) === -this.dir && !combo) { // a single small bubble pops on the sack
          Sound.sfx("tick"); stars(this.x + this.dir * 70, this.y - 120, 6); popText(this.x + this.dir * 60, this.y - 200, "팅!", "#cfd3ff", 26);
          if (this.talkCd <= 0 && BL().guard) { say(BL().guard, this); this.talkCd = 300; }
          return false;
        }
        let dmg = (combo ? 2 : 1) * (stunned ? 2 : 1);
        if (this.state === "guard") { dmg = 1; popText(this.x, this.y - 330, "GUARD BREAK!", "#ffd23a", 26); }
        const before = this.hp;
        this.hp = Math.max(0, this.hp - dmg); this.inv = 30; this.hitFlash = 14; Sound.sfx("bossHit"); game.shake = 9 + dmg * 2;
        addScore(1000 * dmg, this.x, this.y - 290, "#ff9b3d");
        if (dmg > 1) popText(this.x, this.y - 330, `×${dmg} CRITICAL!`, "#ff7ad9", 26);
        if (this.hp <= 0) { this.state = "dying"; this.t = 0; game.slow = 60; Sound.stopMusic(); Sound.suck(false); if (BL().defeat) say(BL().defeat, this); return true; }
        if (this.state === "guard") { this.state = "stunned"; this.t = 20; }
        else if (!stunned && this.state !== "leap") { this.state = "hurt"; this.t = 0; this.vx = Math.sign(ball.vx) * 3; }
        if (before > this.maxHp / 2 && this.hp <= this.maxHp / 2) { if (BL().phase2) say(BL().phase2, this); this.talkCd = 200; }
        else if (this.talkCd <= 0 && BL().hurt && Math.random() < 0.5) { say(BL().hurt[Math.floor(rand(0, BL().hurt.length))], this); this.talkCd = 260; }
        return true;
      },
    };
    return b;
  }
  // ---- Boss 2: the King's Messenger (herald) ----------------------------------
  // Dive-bomber with a giant stamp. Read the shadow, step aside, and the stamp sinks into the floor:
  // it is stuck, rump up, for a moment — that is when a bubble lands. Minions fly in to keep the ammo coming.
  const HL = () => LINES.boss2 || {};
  function makeHerald() {
    return {
      kind: "herald", name: "왕의 전령", portrait: ["herald", 0, 0.62, 62], talkH: 170,
      x: W + 120, y: 120, vx: 0, vy: 0, dir: -1, hp: 9, maxHp: 9, state: "wait", t: 0, inv: 0, frame: 0, hitFlash: 0, talkCd: 0,
      lastSummon: -999, dives: 0, aimX: W / 2,
      hittable() { return this.state === "stuck" && this.inv <= 0; },
      box(b) { return Math.abs(this.x - b.x) < 96 && b.y > this.y - 170 && b.y < this.y + 20; },
      hit(ball) {
        const dmg = ball.power;
        this.hp = Math.max(0, this.hp - dmg); this.inv = 8; this.hitFlash = 14; Sound.sfx("bossHit"); game.shake = 8 + dmg * 2;
        addScore(1000 * dmg, this.x, this.y - 200, "#ff9b3d");
        if (dmg > 1) popText(this.x, this.y - 240, `×${dmg} CRITICAL!`, "#ff7ad9", 26);
        if (this.hp <= 0) { this.state = "dying"; this.t = 0; game.slow = 60; Sound.stopMusic(); Sound.suck(false); if (HL().defeat) say(HL().defeat, this); return true; }
        const half = this.hp <= this.maxHp / 2;
        if (half && !this.p2) { this.p2 = true; if (HL().phase2) say(HL().phase2, this); this.talkCd = 220; game.tip = { str: "빨라진 급강하는 슬라이딩으로 피하자!", t: 0 }; }
        else if (this.talkCd <= 0 && HL().hurt) { say(HL().hurt[Math.floor(rand(0, HL().hurt.length))], this); this.talkCd = 240; }
        if (this.state === "stuck") { this.stuckBonus = Math.min((this.stuckBonus || 0) + 15, 45); this.hitFlash = 10; } // a volley lands while it's stuck
        else { this.state = "hurt"; this.t = 0; }
        return true;
      },
    };
  }
  function updateHerald() {
    const b = boss; b.t++;
    if (b.inv > 0) b.inv--; if (b.hitFlash > 0) b.hitFlash--; if (b.talkCd > 0) b.talkCd--;
    const p2 = b.hp <= b.maxHp / 2, flap = () => { b.frame = Math.floor(game.t / 6) % 2; };
    const HOVER_Y = 290;
    switch (b.state) {
      case "wait": return;
      case "enter": flap(); b.x += (720 - b.x) * 0.05; b.y += (HOVER_Y - b.y) * 0.05; if (b.t > 70) { b.state = "idle"; } return;
      case "idle": flap(); b.y = HOVER_Y + Math.sin(game.t * 0.08) * 8; return;
      case "hover":
        flap(); b.dir = P.x > b.x ? 1 : -1;
        b.x += (b.aimX - b.x) * 0.025; b.y = HOVER_Y + Math.sin(game.t * 0.08) * 10;
        if (b.t % 70 === 1) b.aimX = clamp(P.x + rand(-260, 260), 140, W - 140);
        if (b.t === 40) dropPapers(b); // the forms it scatters are the player's ammo
        if (b.t > (p2 ? 80 : 120)) {
          const minions = enemies.filter(e => e.state !== "dead").length;
          if (minions < 2 && game.t - b.lastSummon > 240) { b.state = "summon"; b.t = 0; b.lastSummon = game.t; }
          else { b.state = "aim"; b.t = 0; Sound.sfx("whistle"); }
        }
        return;
      case "summon":
        flap();
        if (b.t === 8) { const l = HL().summon; say(l ? l[Math.floor(rand(0, l.length))] : "접수 지원 바람!", b); Sound.sfx("whistle"); }
        if (b.t === 36) { spawnEnemy("goblin", 4, true); spawnEnemy("goblin", 10, true); } // plain thieves on the side ledges = easy ammo
        if (b.t > 70) { b.state = "hover"; b.t = 0; }
        return;
      case "aim": // telegraph: rise, lock over the cat, stamp raised; a shadow grows on the floor
        b.frame = 2; if (b.t < (p2 ? 22 : 34)) b.x += (P.x - b.x) * 0.08; b.y += (340 - b.y) * 0.1; b.shadowX = b.x; // stops tracking just before the dive
        if (b.t > (p2 ? 34 : 46)) { b.state = "dive"; b.t = 0; b.vy = 2; b.retarget = p2; Sound.sfx("jump"); }
        return;
      case "dive":
        b.frame = 3; b.vy = Math.min(b.vy + 1.4, 26); b.y += b.vy;
        if (b.retarget && b.y > 220) { b.retarget = false; b.x += clamp(P.x - b.x, -30, 30); b.shadowX = b.x; popText(b.x, b.y - 160, "앗, 저기다!", "#fff", 20); }
        if (P.state === "normal" && Math.abs(P.x - b.x) < 58 && P.y > b.y - 160 && P.y - 90 < b.y) hurtPlayer(b.x);
        if (b.y >= FLOOR_Y) {
          b.y = FLOOR_Y; b.state = "stuck"; b.t = 0; b.dives++; game.shake = 16; Sound.sfx("slam");
          puff(b.x, b.y, 16, "rgba(230,210,180,.9)", 5); parts.push({ k: "ink", x: b.x, y: FLOOR_Y + 4, life: 0, max: 300 });
                if (b.dives <= 2 && HL().stuck) say(HL().stuck, b);
        }
        return;
      case "stuck": // the opening: stamp buried, tugging with its back turned
        b.frame = 4; b.x += Math.sin(b.t * 0.9) * 0.8;
        if (b.t > (p2 ? 130 : 170) + (b.stuckBonus || 0)) { b.state = "rise"; b.t = 0; b.stuckBonus = 0; puff(b.x, b.y, 8); }
        return;
      case "hurt":
        b.frame = 5; if (b.t > 24) { b.state = "rise"; b.t = 0; }
        return;
      case "rise": flap(); b.y += (HOVER_Y - b.y) * 0.08; if (b.t > 40) { b.state = "hover"; b.t = 0; } return;
      case "dying":
        b.frame = 5; b.y += (FLOOR_Y - b.y) * 0.1;
        if (b.t % 8 === 0) { stars(b.x + rand(-60, 60), b.y - rand(40, 160), 8); Sound.sfx("hit", b.t / 8); }
        if (b.t > 100) { b.state = "down"; b.t = 0; b.y = FLOOR_Y; game.flash = 14; game.shake = 18; Sound.sfx("explode");
          for (let i = 0; i < 8; i++) dropItem(b.x + rand(-140, 140), b.y - rand(80, 220));
          for (let i = 0; i < 14; i++) parts.push({ k: "paper", x: b.x + rand(-80, 80), y: b.y - rand(60, 200), vx: rand(-3, 3), vy: rand(-6, -2), rot: rand(0, 6), life: 0, max: 120 }); }
        return;
      case "down": b.frame = 6; return;
    }
  }
  function dropPapers(b) {
    const n = b.hp <= b.maxHp / 2 ? 3 : 2;
    for (let i = 0; i < n; i++) shots.push({ k: "paper", x: b.x + (i - (n - 1) / 2) * 120, y: b.y - 60, vx: 0, vy: 1, rot: rand(0, 6), life: 0, seed: rand(0, 6) });
    Sound.sfx("throwp");
  }
  function drawHerald() {
    const b = boss;
    if (["aim", "dive"].includes(b.state) && b.shadowX != null) { // landing shadow grows as the dive approaches
      const k = b.state === "aim" ? clamp(b.t / 46, 0, 1) : 1;
      ctx.save(); ctx.fillStyle = `rgba(120,20,40,${0.18 + 0.25 * k})`; ctx.beginPath(); ctx.ellipse(b.shadowX, FLOOR_Y - 2, 30 + 40 * k, 9 + 6 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,80,90,${0.5 + 0.4 * Math.sin(game.t * 0.6)})`; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    }
    if (b.inv > 0 && b.state !== "dying" && Math.floor(b.t / 3) % 2 && !b.hitFlash) return;
    const shakeX = b.state === "dying" ? rand(-4, 4) : 0;
    const down = b.frame === 6 && fr("herald_down", 0);
    drawSprite(down ? "herald_down" : "herald", down ? 0 : b.frame, b.x + shakeX, b.y + 4, { flip: b.dir > 0, flash: b.hitFlash > 0 && b.hitFlash % 4 < 2 });
    if (b.state === "stuck") { // little "!" so the opening reads instantly
      const s = 1 + Math.max(0, Math.sin(game.t * 0.3)) * 0.2;
      text("!", b.x, b.y - 190, { size: 40 * s, align: "center", color: "#ffd23a" });
    }
  }

  // ==== Bosses 3-6 share a small toolkit ====================================
  const BX = n => LINES[n] || {};
  const pick = a => a && a.length ? a[Math.floor(rand(0, a.length))] : "";
  function bossCore(o) {
    return Object.assign({ x: 720, y: -320, vx: 0, vy: 0, dir: -1, state: "wait", t: 0, inv: 0, frame: 0, hitFlash: 0, talkCd: 0, lastSummon: -999, flinch: 0, squash: 0 }, o);
  }
  function bossDamage(b, dmg, top) {
    const Lb = BX(b.lines);
    b.hp = Math.max(0, b.hp - dmg); b.inv = 10; b.hitFlash = 14; b.flinch = 18; Sound.sfx("bossHit"); game.shake = 8 + dmg * 2;
    addScore(1000 * dmg, b.x, b.y - top, "#ff9b3d");
    if (dmg > 1) popText(b.x, b.y - top - 40, `×${dmg} CRITICAL!`, "#ff7ad9", 26);
    if (b.hp <= 0) { b.state = "dying"; b.t = 0; game.slow = 60; Sound.stopMusic(); Sound.suck(false); say(Lb.defeat, b); return; }
    if (!b.p2 && b.hp <= b.maxHp / 2) { b.p2 = true; say(Lb.phase2, b); b.talkCd = 220; }
    else if (b.talkCd <= 0 && Lb.hurt) { say(pick(Lb.hurt), b); b.talkCd = 240; }
  }
  function bossDeflect(x, y, msg) { Sound.sfx("tick"); stars(x, y, 6); popText(x, y - 50, msg || "팅!", "#cfd3ff", 26); }
  function bossContact(b, hw, h) { if (P.state === "normal" && Math.abs(P.x - b.x) < hw && P.y > b.y - h && P.y - 90 < b.y) hurtPlayer(b.x); }
  function bossSummon(b, list) {
    if (b.t === 10) { Sound.sfx("whistle"); say(pick(BX(b.lines).summon), b); b.talkCd = 200; }
    if (b.t === 40) list.forEach(([type, col]) => spawnEnemy(type, col, true));
  }
  const alive = type => enemies.filter(e => e.state !== "dead" && (!type || e.type === type)).length;
  const hasAmmo = t => P.tank.some(i => i.type === t) || balls.some(x => x.type === t);
  function bossTick(b) {
    b.t++; if (b.inv > 0) b.inv--; if (b.hitFlash > 0) b.hitFlash--; if (b.talkCd > 0) b.talkCd--; if (b.flinch > 0) b.flinch--;
    switch (b.state) {
      case "wait": return true;
      case "drop":
        b.vy += 0.8; b.y += b.vy; b.frame = b.fDrop ?? 0;
        if (b.y >= FLOOR_Y) { b.y = FLOOR_Y; b.vy = 0; b.state = "landed"; b.t = 0; game.shake = 18; Sound.sfx("slam"); puff(b.x, b.y, 20, "rgba(230,210,180,.9)", 5); }
        return true;
      case "landed": b.frame = b.fIdle ?? 0; if (b.t > 20) { b.state = "idle"; b.t = 0; } return true;
      case "walkin": b.frame = (b.walkF || [0])[Math.floor(b.t / 10) % (b.walkF || [0]).length]; b.dir = -1; b.x += (720 - b.x) * 0.04; if (Math.abs(b.x - 720) < 4) { b.state = "idle"; b.t = 0; } return true;
      case "idle": b.frame = b.fIdle ?? 0; return true;
      case "dying":
        b.frame = b.fDying; b.vx = 0;
        if (b.y < FLOOR_Y) b.y = Math.min(FLOOR_Y, b.y + 6);
        if (b.t % 8 === 0) { stars(b.x + rand(-90, 90), b.y - rand(60, b.top || 220), 10); Sound.sfx("hit", b.t / 8); }
        if (b.t > 110) { b.state = "down"; b.t = 0; b.y = FLOOR_Y; game.flash = 14; game.shake = 20; Sound.sfx("explode");
          for (let i = 0; i < 10; i++) dropItem(b.x + rand(-160, 160), b.y - rand(80, 260));
          feathers(b.x, b.y - 110, 30); b.onDown && b.onDown(); }
        return true;
      case "down": b.frame = b.fDown; return true;
    }
    return false;
  }
  function drawBossSprite(b) {
    if (b.inv > 0 && !["dying", "down"].includes(b.state) && Math.floor(b.t / 3) % 2 && !b.hitFlash) return;
    const shakeX = b.state === "dying" ? rand(-4, 4) : (b.shiver ? rand(-b.shiver, b.shiver) : 0);
    let sx = 1, sy = 1;
    if (["idle", "taunt"].includes(b.state)) sy = 1 + Math.sin(game.t * 0.18) * 0.02;
    if (b.flinch > 12) { sx = 1.06; sy = 0.94; }
    const flip = b.faceRight ? b.dir < 0 : b.dir > 0, sc = b.kind === "king" && b.phase === 1 ? b.scale : 1;
    drawSprite(b.sheet, b.frame, b.x + shakeX, b.y + 4, { flip, sx: sx * sc, sy: sy * sc, flash: b.hitFlash > 0 && b.hitFlash % 4 < 2 });
  }

  // ---- Boss 3: 빨래대장 뽀송너굴 (laundry chief) -------------------------------
  // Towel armour makes every ball bounce ("뽀송!") — except a WATER ball, which soaks the towels off.
  // Wet-laundry raccoons are the water supply; he calls more whenever the cat has none.
  function makeWash() {
    return bossCore({ kind: "wash", lines: "boss3", sheet: "washboss", name: "뽀송너굴", portrait: ["washboss", 3, 0.45, 100], hp: 10, maxHp: 10,
      armor: true, bareT: 0, top: 250, talkH: 300, fIdle: 0, fDrop: 6, fDying: 4, fDown: 5, music: "boss", calm: "laundry",
      tip: "젖은빨래 너구리를 빨아 물방울 탄! 수건 갑옷에 맞혀!",
      hittable() { return !["dying", "down"].includes(this.state) && this.inv <= 0; },
      box(b) { return Math.abs(this.x - b.x) < 104 && b.y > this.y - 240 && b.y < this.y + 20; },
      hit(ball) {
        const Lb = BX(this.lines);
        if (this.armor) {
          if (ball.type !== "water") {
            bossDeflect(this.x + Math.sign(ball.x - this.x) * 70, this.y - 130, "뽀송!");
            if (this.talkCd <= 0 && Lb.guard) { say(Lb.guard, this); this.talkCd = 320; }
            if (!game.washHint) { game.washHint = true; game.tip = { str: "보통 구슬은 튕겨! 물방울 탄이 필요해", t: 0 }; }
            return false;
          }
          this.armor = false; this.bareT = 480; this.state = "bare"; this.t = 0; game.shake = 12; Sound.sfx("explode");
          for (let i = 0; i < 16; i++) parts.push({ k: "dust", x: this.x + rand(-80, 80), y: this.y - rand(40, 200), vx: rand(-3, 3), vy: rand(-3, 0), life: 0, max: 40, r: rand(8, 16), color: "rgba(235,250,255,.95)" });
          popText(this.x, this.y - 300, "수건 갑옷 벗겨짐!", "#7ff0ff", 26); say(Lb.armorOff, this); this.talkCd = 200;
          if (!game.washTip2) { game.washTip2 = true; game.tip = { str: "지금이야! 아무 구슬이나 맞혀!", t: 0 }; }
          bossDamage(this, 1, 290); return true;
        }
        bossDamage(this, ball.power, 290); return true;
      },
    });
  }
  function updateWash() {
    const b = boss; if (bossTick(b)) return;
    const p2 = b.hp <= b.maxHp / 2, face = () => { b.dir = P.x > b.x ? 1 : -1; };
    b.shiver = 0;
    switch (b.state) {
      case "taunt": b.frame = 0; face(); if (b.t > 50) chooseWash(); break;
      case "walk": b.frame = 0; face(); b.x += b.dir * (p2 ? 1.6 : 1.2); if (b.t > 80) chooseWash(); break;
      case "foam": // scrub: a wave of suds runs along the floor (jump it or slide through)
        b.frame = b.t < 30 ? 6 : 1; face(); b.shiver = b.t < 30 ? 2 : 0;
        if (b.t === 30) { waves.push({ k: "foam", x: b.x + b.dir * 110, dir: b.dir, life: 0 }); if (p2) waves.push({ k: "foam", x: b.x - b.dir * 110, dir: -b.dir, life: 0 }); Sound.sfx("throwp"); }
        if (b.t > 70) chooseWash(); break;
      case "crouch": b.frame = 6; face(); b.shiver = 3; if (b.t === 2) popText(b.x, b.y - 280, "빙글빙글~!", "#bff4ff", 22);
        if (b.t > (p2 ? 32 : 44)) { b.state = "spin"; b.t = 0; Sound.sfx("whistle"); } break;
      case "spin": // washtub spin across the room: slide under it
        b.frame = 2; b.x += b.dir * (p2 ? 8 : 7); if (b.t % 4 === 0) parts.push({ k: "dust", x: b.x - b.dir * 60, y: b.y - rand(20, 160), vx: -b.dir * 2, vy: rand(-1, 1), life: 0, max: 24, r: rand(8, 14), color: "rgba(225,245,255,.85)" });
        if (b.x <= 130 || b.x >= W - 130) { b.state = "dizzy"; b.t = 0; game.shake = 12; Sound.sfx("slam"); stars(b.x, b.y - 200, 8); } break;
      case "dizzy": b.frame = 4; if (b.t > 70) chooseWash(); break;
      case "summon": b.frame = 0; bossSummon(b, [["wetcoon", P.x < W / 2 ? 12 : 2]].concat(alive() < 1 ? [["goblin", 7]] : [])); if (b.t > 70) chooseWash(); break;
      case "bare": // towels gone: shy, shuffles away — every ball hurts now
        b.frame = b.flinch > 0 ? 4 : 3; b.dir = P.x > b.x ? -1 : 1; b.x += b.dir * 0.7;
        if (b.bareT % 60 === 0 && b.bareT < 200) popText(b.x, b.y - 270, "…추워!", "#bff4ff", 20);
        if (--b.bareT <= 0) { b.state = "dress"; b.t = 0; } break;
      case "dress": b.frame = 0; if (b.t === 1) { b.armor = true; puff(b.x, b.y - 100, 14, "rgba(235,250,255,.95)", 4); say(BX(b.lines).armorOn, b); b.talkCd = 200; } if (b.t > 40) chooseWash(); break;
    }
    b.x = clamp(b.x, 120, W - 120);
    if (["walk", "spin", "foam", "crouch", "taunt"].includes(b.state) && P.row === 0) bossContact(b, 88, 230);
  }
  function chooseWash() {
    const b = boss; b.t = 0;
    const water = alive("wetcoon") > 0 || hasAmmo("water");
    if (!water && game.t - b.lastSummon > 150) { b.state = "summon"; b.lastSummon = game.t; return; }
    if (alive() < 2 && game.t - b.lastSummon > 320) { b.state = "summon"; b.lastSummon = game.t; return; }
    const r = Math.random();
    b.state = r < 0.38 ? "foam" : r < 0.68 ? "crouch" : r < 0.9 ? "walk" : "taunt";
  }

  // ---- Boss 4: 감정관 금딱토끼 (appraiser in a glass case) ---------------------
  // The case shrugs off balls. Roll a ball over one of the golden scale pans by the walls:
  // the lid pops open for a few seconds — the wall bounce sends the same ball straight back in.
  const PLATES = [72, W - 72];
  function makeAppraiser() {
    return bossCore({ kind: "appraiser", lines: "boss4", sheet: "appraiser", name: "금딱토끼", portrait: ["appraiser", 0, 0.5, 58], hp: 8, maxHp: 8,
      x: W / 2, open: 0, plates: [0, 0], top: 260, talkH: 320, fIdle: 0, fDrop: 0, fDying: 4, fDown: 5, music: "boss", calm: "vault",
      tip: "구슬을 벽 쪽 저울로! 뚜껑이 열리면 공격!",
      hittable() { return !["dying", "down", "drop", "wait"].includes(this.state) && this.inv <= 0; },
      box(b) { return Math.abs(this.x - b.x) < 84 && b.y > this.y - 260 && b.y < this.y + 20; },
      ballHook(ball) { // scale pans on the floor by each wall
        if (ball.y < FLOOR_Y - 4 || ["dying", "down"].includes(this.state)) return false;
        PLATES.forEach((px, i) => {
          if (Math.abs(ball.x - px) < 46 && ball.plated !== i) {
            ball.plated = i; this.plates[i] = 30; Sound.sfx("bonus"); stars(px, FLOOR_Y - 20, 8);
            if (!this.open) { this.open = this.p2 ? 170 : 210; this.state = "opened"; this.t = 0; Sound.sfx("pop"); say(BX(this.lines).open, this); this.talkCd = 200; popText(this.x, this.y - 400, "뚜껑 열림!", "#ffd23a", 26); }
            else this.open = Math.max(this.open, 120);
          }
        });
        return false;
      },
      hit(ball) {
        if (!this.open) { // glass: the ball bounces off (and uses up a bounce — aim at the wall pans)
          bossDeflect(this.x + Math.sign(ball.x - this.x) * 60, this.y - 140, "팅!");
          if (!game.apprHint) { game.apprHint = true; game.tip = { str: "유리는 단단해! 양옆 저울에 구슬을 굴려!", t: 0 }; }
          return false;
        }
        bossDamage(this, ball.power, 300); return true;
      },
    });
  }
  function updateAppraiser() {
    const b = boss;
    b.plates = b.plates.map(v => Math.max(0, v - 1));
    if (bossTick(b)) return;
    const p2 = b.hp <= b.maxHp / 2; b.dir = P.x > b.x ? 1 : -1;
    if (b.open > 0 && b.state !== "dying") {
      b.open--; b.frame = 2;
      if (b.open === 0) { b.state = "taunt"; b.t = 0; Sound.sfx("land"); popText(b.x, b.y - 330, "철컥!", "#cfd3ff", 22); }
      return;
    }
    switch (b.state) {
      case "taunt": b.frame = b.t < 30 ? 6 : 0; if (b.t > (p2 ? 50 : 70)) chooseAppraiser(); break;
      case "coins": // a handful of gold coins in arcs toward the cat
        b.frame = b.t < 20 ? 0 : 1;
        if (b.t === 20 || (p2 && b.t === 44)) {
          const n = 3; for (let i = 0; i < n; i++) { const tx = P.x + (i - 1) * 110, sx = b.x + b.dir * 50, sy = b.y - 200, air = 54 + i * 4;
            shots.push({ k: "coin", x: sx, y: sy, vx: (tx - sx) / air, vy: (P.y - 40 - sy - 0.5 * 0.32 * air * air) / air, rot: 0, life: 0 }); }
          Sound.sfx("item");
        }
        if (b.t > 70) chooseAppraiser(); break;
      case "tag": // a price tag skims along the floor: jump it, slide it, or vacuum it for ammo
        b.frame = b.t < 18 ? 6 : 1;
        if (b.t === 18) { shots.push({ k: "tag", x: b.x + b.dir * 70, y: FLOOR_Y - 46, vx: b.dir * 4.6, vy: 0, rot: 0, life: 0 }); Sound.sfx("sock"); }
        if (b.t > 50) chooseAppraiser(); break;
      case "summon": b.frame = 6; bossSummon(b, [["boxbun", 3], ["goblin", 12]].concat(p2 ? [["taggob", 7]] : [])); if (b.t > 70) chooseAppraiser(); break;
    }
  }
  function chooseAppraiser() {
    const b = boss; b.t = 0;
    const catchable = enemies.filter(e => e.state !== "dead" && e.row === 0).length;
    if (catchable < 2 && game.t - b.lastSummon > 260 && P.tank.length < 2) { b.state = "summon"; b.lastSummon = game.t; return; }
    const r = Math.random(); b.state = r < 0.45 ? "tag" : r < 0.85 ? "coins" : "taunt";
  }
  function drawPlates() {
    const b = boss;
    PLATES.forEach((px, i) => {
      const press = b.plates[i] > 0 ? 6 : 0, glow = b.open > 0 ? 0.9 : 0.4 + Math.sin(game.t * 0.1) * 0.2;
      ctx.save();
      ctx.fillStyle = "#8a5a12"; ctx.fillRect(px - 4, FLOOR_Y - 40, 8, 40);
      ctx.fillStyle = `rgba(255,220,90,${glow * 0.35})`; ctx.beginPath(); ctx.ellipse(px, FLOOR_Y - 10 + press, 58, 18, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(0, FLOOR_Y - 26, 0, FLOOR_Y); g.addColorStop(0, "#fff0a0"); g.addColorStop(1, "#d99a1c");
      ctx.fillStyle = g; ctx.strokeStyle = "#5a3606"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(px, FLOOR_Y - 14 + press, 44, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      if (!b.open && b.state !== "down" && b.state !== "dying" && Math.floor(game.t / 30) % 2) text("▼", px, FLOOR_Y - 46, { size: 18, align: "center", color: "#ffd23a" });
    });
  }

  // ---- Boss 5: 베개기사 몽실 (sleepy sheep knight) -----------------------------
  // Helmet on, balls only ring his lullaby bell. Two rings (or one cloud ball) stop the bell:
  // he pulls the helmet off to yawn — that's the opening.
  function makeKnight() {
    return bossCore({ kind: "knight", lines: "boss5", sheet: "knight", name: "몽실", portrait: ["knight", 3, 0.55, 86], hp: 9, maxHp: 9, x: W + 140, y: FLOOR_Y,
      faceRight: true, rings: 0, openT: 0, top: 230, talkH: 270, fIdle: 0, fDying: 4, fDown: 5, walkF: [0], music: "boss", calm: "night",
      tip: "몽실 등의 종을 구슬로 두 번! 구름 탄은 한 방!",
      hittable() { return !["dying", "down", "walkin", "wait"].includes(this.state) && this.inv <= 0; },
      box(b) { return Math.abs(this.x - b.x) < 90 && b.y > this.y - 220 && b.y < this.y + 20; },
      hit(ball) {
        if (this.state !== "open") {
          this.rings += ball.type === "cloud" ? 2 : 1; Sound.sfx("bonus"); stars(this.x + 40, this.y - 150, 8);
          popText(this.x, this.y - 260, this.rings >= 2 ? "종이 멈췄다!" : "댕!", "#ffd23a", 26);
          if (this.rings >= 2) { this.state = "open"; this.t = 0; this.openT = this.p2 ? 220 : 260; this.rings = 0; say(BX(this.lines).open, this); this.talkCd = 200;
            if (!game.knightTip2) { game.knightTip2 = true; game.tip = { str: "헬멧을 벗었다! 지금 맞혀!", t: 0 }; } }
          return true;
        }
        bossDamage(this, ball.power, 270); return true;
      },
    });
  }
  function updateKnight() {
    const b = boss; if (bossTick(b)) return;
    const p2 = b.hp <= b.maxHp / 2, face = () => { b.dir = P.x > b.x ? 1 : -1; };
    b.shiver = 0;
    switch (b.state) {
      case "taunt": b.frame = 0; face(); if (b.t > 50) chooseKnight(); break;
      case "walk": b.frame = 0; face(); b.x += b.dir * (p2 ? 1.5 : 1.1); if (b.t > 90) chooseKnight(); break;
      case "lullaby": // rings the bell: a drift of sleepy notes (they make you doze, they never cost a heart)
        b.frame = 1; face();
        if (b.t % 14 === 4 && b.t < 60) { const k = (b.t / 14) | 0; for (const s of [-1, 1]) shots.push({ k: "note", x: b.x + s * 40, y: b.y - 60 - k * 22, vx: s * (1.6 + k * 0.4), vy: rand(-0.5, 0.5), life: 0, seed: rand(0, 6) }); Sound.sfx("blip"); }
        if (b.t > 80) chooseKnight(); break;
      case "crouch": b.frame = 6; face(); b.shiver = 3; if (b.t === 2) popText(b.x, b.y - 250, "돌격… 쿨…", "#cfe3ff", 22);
        if (b.t > (p2 ? 34 : 46)) { b.state = "lance"; b.t = 0; Sound.sfx("whistle"); } break;
      case "lance": // pillow-lance charge across the floor: slide through it
        b.frame = 2; b.x += b.dir * (p2 ? 8.6 : 7.6); if (b.t % 4 === 0) puff(b.x - b.dir * 60, b.y, 2);
        if (b.x <= 120 || b.x >= W - 120) { b.state = "doze"; b.t = 0; game.shake = 10; Sound.sfx("slam"); } break;
      case "recover": b.frame = 0; if (b.t > 30) chooseKnight(); break;
      case "doze": b.frame = 6; if (b.t % 30 === 0) parts.push({ k: "text", x: b.x + 30, y: b.y - 200, vx: 0.4, vy: -0.7, life: 0, max: 40, str: "z", color: "#cfe3ff", size: 20 }); if (b.t > 60) chooseKnight(); break;
      case "open": b.frame = b.flinch > 0 ? 4 : 3; if (b.t % 40 === 0) parts.push({ k: "text", x: b.x + 30, y: b.y - 180, vx: 0.4, vy: -0.7, life: 0, max: 40, str: "하암", color: "#cfe3ff", size: 16 });
        if (--b.openT <= 0) { b.state = "recover"; b.t = 0; puff(b.x, b.y - 150, 8); popText(b.x, b.y - 250, "헬멧 착용!", "#cfd3ff", 20); } break;
      case "summon": b.frame = 1; bossSummon(b, [["sheep", P.x < W / 2 ? 12 : 2]].concat(alive() < 1 ? [["goblin", 7]] : [])); if (b.t > 70) chooseKnight(); break;
    }
    b.x = clamp(b.x, 110, W - 110);
    if (["walk", "lance", "crouch", "taunt"].includes(b.state) && P.row === 0) bossContact(b, 80, 210);
  }
  function chooseKnight() {
    const b = boss; b.t = 0;
    if ((alive() < 2 && game.t - b.lastSummon > 300) || (alive("sheep") === 0 && !hasAmmo("cloud") && P.tank.length < 2 && game.t - b.lastSummon > 200)) { b.state = "summon"; b.lastSummon = game.t; return; }
    const r = Math.random(); b.state = r < 0.35 ? "lullaby" : r < 0.7 ? "crouch" : r < 0.9 ? "walk" : "taunt";
  }

  // ---- Boss 6: 욕심쟁이 왕 (the greedy king) ---------------------------------
  // Phase 1: he lords it over a tower of cushions. Three support cushions at the bottom (button marks):
  // knock each one out with balls (2 hits each) and the throne comes down.
  // Phase 2: he charges in his cape — slide past, and when the cape snags he is open.
  const SUPPORTS = [372, 480, 588];
  function makeKing() {
    return bossCore({ kind: "king", lines: "boss6", sheet: "king", name: "욕심쟁이 왕", portrait: ["king", 0, 0.42, 84, -22], hp: 12, maxHp: 12, x: W / 2, y: 312, scale: 0.86,
      sup: SUPPORTS.map(x => ({ x, hp: 2, hit: 0 })), phase: 1, top: 260, talkH: 250, fIdle: 0, fDying: 5, fDown: 6, music: "final", calm: "throne",
      tip: "왕좌 아래 받침 세 개를 구슬로 부숴!",
      hittable() { return this.phase === 2 && ["snag", "throw", "dazed"].includes(this.state) && this.inv <= 0; },
      box(b) { return Math.abs(this.x - b.x) < 110 && b.y > this.y - 250 && b.y < this.y + 20; },
      ballHook(ball) {
        if (this.phase === 1) {
          if (ball.y < FLOOR_Y - 8) return false;
          for (const s of this.sup) {
            if (s.hp <= 0 || Math.abs(ball.x - s.x) > 62) continue;
            const d = Math.min(s.hp, ball.power); s.hp -= d; s.hit = 16; ball.gone = true;
            this.hp -= d; this.hitFlash = 10; Sound.sfx("bossHit"); game.shake = 8; stars(s.x, FLOOR_Y - 40, 12); feathers(s.x, FLOOR_Y - 40, 8);
            addScore(1000 * d, s.x, FLOOR_Y - 120, "#ff9b3d");
            if (s.hp <= 0) { popText(s.x, FLOOR_Y - 150, "받침 와르르!", "#ffd23a", 24); Sound.sfx("explode"); this.shake = 20; if (this.sup.every(q => q.hp > 0 || q === s) && this.sup.filter(q => q.hp <= 0).length === 1) say(BX(this.lines).wobble, this); }
            if (this.sup.every(q => q.hp <= 0)) { this.state = "collapse"; this.t = 0; Sound.stopMusic(); say(BX(this.lines).collapse, this); this.talkCd = 200; }
            return true;
          }
          return false;
        }
        return false;
      },
      hit(ball) {
        if (this.state !== "snag" && this.state !== "dazed") { // throwing: belly is open, but only a little
          if (this.state === "throw") { bossDamage(this, 1, 280); return true; }
          bossDeflect(this.x, this.y - 150, "팅!"); return false;
        }
        bossDamage(this, ball.power, 280); return true;
      },
    });
  }
  function updateKing() {
    const b = boss; if (bossTick(b)) return;
    if (b.shake > 0) b.shake--;
    b.sup.forEach(s => { if (s.hit > 0) s.hit--; });
    const face = () => { b.dir = P.x > b.x ? 1 : -1; };
    if (b.phase === 1) {
      if (b.state !== "collapse") b.y = 312 + Math.sin(game.t * 0.05) * 3 + (3 - b.sup.filter(s => s.hp > 0).length) * 10; face();
      switch (b.state) {
        case "taunt": b.frame = 0; if (b.t > 80) chooseKing(); break;
        case "throw": // pillows: inhale them and they become big pillow balls
          b.frame = b.t < 20 ? 0 : 1;
          if (b.t === 20) { const tx = P.x, ty = P.y - 45, sx = b.x + b.dir * 60, sy = b.y - 220, air = 62;
            shots.push({ k: "pillow", x: sx, y: sy, vx: (tx - sx) / air, vy: (ty - sy - 0.5 * 0.32 * air * air) / air, rot: 0, life: 0 }); Sound.sfx("throwp"); }
          if (b.t > 84) chooseKing(); break;
        case "coins":
          b.frame = b.t < 20 ? 0 : 2;
          if (b.t === 20) { for (let i = 0; i < 3; i++) { const tx = P.x + (i - 1) * 140, sx = b.x, sy = b.y - 160, air = 56 + i * 4;
            shots.push({ k: "coin", x: sx, y: sy, vx: (tx - sx) / air, vy: (P.y - 40 - sy - 0.5 * 0.32 * air * air) / air, rot: 0, life: 0 }); } Sound.sfx("item"); }
          if (b.t > 92) chooseKing(); break;
        case "summon": b.frame = 0; bossSummon(b, [["guard", 1], ["pillowcoon", 13]]); if (b.t > 70) chooseKing(); break;
        case "collapse": break;
      }
      if (b.state === "collapse") { // the throne comes down, the king tumbles to the floor
        b.frame = 5; b.collapseK = clamp(b.t / 70, 0, 1);
        if (b.t % 6 === 0) feathers(rand(260, 700), rand(200, 600), 4);
        if (b.t === 1) { game.shake = 22; Sound.sfx("explode"); enemies.forEach(e => { if (e.state !== "dead") { e.state = "dead"; e.t = 0; e.vy = -8; e.vx = rand(-3, 3); e.rot = 0; } }); shots = []; }
        if (b.t > 30) { b.vy = (b.vy || -4) + 0.6; b.y = Math.min(FLOOR_Y, b.y + b.vy); }
        if (b.y >= FLOOR_Y && b.t > 40) { b.y = FLOOR_Y; b.vy = 0; b.state = "dazed"; b.t = 0; b.phase = 2; b.p2 = true; game.shake = 18; Sound.sfx("slam"); puff(b.x, b.y, 24, "rgba(255,240,220,.9)", 6); Sound.playMusic("final"); Sound.setTempo(1.1);
          game.tip = { str: "망토 돌진은 슬라이딩! 망토가 걸리면 공격!", t: 0 }; }
      }
      return;
    }
    switch (b.state) {
      case "dazed": b.frame = 5; if (b.t > 90) { say(BX(b.lines).phase2, b); b.talkCd = 220; chooseKing(); } break;
      case "walk": b.frame = 3; face(); b.x += b.dir * 1.5; if (b.t > 80) chooseKing(); break;
      case "stomp": b.frame = 7; face(); b.shiver = b.t > 10 ? 3 : 0; if (b.t === 2) popText(b.x, b.y - 260, "개굴!", "#ff9b3d", 24);
        if (b.t > 40) { b.state = "charge"; b.t = 0; b.shiver = 0; Sound.sfx("whistle"); } break;
      case "charge": b.frame = 4; b.x += b.dir * 8.4; if (b.t % 3 === 0) puff(b.x - b.dir * 80, b.y, 2);
        if (b.x <= 130 || b.x >= W - 130) { b.state = "snag"; b.t = 0; game.shake = 14; Sound.sfx("slam"); say(BX(b.lines).snag, b); b.talkCd = 260; stars(b.x, b.y - 180, 10); } break;
      case "snag": b.frame = b.flinch > 0 ? 5 : 6; b.dir = b.x < W / 2 ? -1 : 1; if (b.t > 200) { b.state = "recover"; b.t = 0; puff(b.x, b.y, 8); } break;
      case "recover": b.frame = 3; if (b.t > 30) chooseKing(); break;
      case "throw": b.frame = b.t < 20 ? 3 : 1; face();
        if (b.t === 24) { const tx = P.x, ty = P.y - 45, sx = b.x + b.dir * 60, sy = b.y - 300, air = 58;
          shots.push({ k: "pillow", x: sx, y: sy, vx: (tx - sx) / air, vy: (ty - sy - 0.5 * 0.32 * air * air) / air, rot: 0, life: 0 }); Sound.sfx("throwp"); }
        if (b.t > 60) chooseKing(); break;
      case "summon": b.frame = 0; bossSummon(b, [["pillowcoon", P.x < W / 2 ? 13 : 1]]); if (b.t > 70) chooseKing(); break;
    }
    b.x = clamp(b.x, 120, W - 120);
    if (["walk", "charge", "stomp"].includes(b.state) && P.row === 0) bossContact(b, 96, 230);
  }
  function chooseKing() {
    const b = boss; b.t = 0;
    if (b.phase === 1) {
      if (alive() < 2 && game.t - b.lastSummon > 300) { b.state = "summon"; b.lastSummon = game.t; return; }
      const r = Math.random(); b.state = r < 0.5 ? "throw" : r < 0.72 ? "coins" : "taunt"; return;
    }
    if (alive() < 1 && game.t - b.lastSummon > 420) { b.state = "summon"; b.lastSummon = game.t; return; }
    const r = Math.random(); b.state = r < 0.5 ? "stomp" : r < 0.8 ? "throw" : "walk";
  }
  function drawThrone() {
    const b = boss; if (b.phase === 2 && b.state !== "collapse") return;
    const k = b.state === "collapse" ? b.collapseK : 0, broken = b.sup.filter(q => q.hp <= 0);
    const tilt = broken.reduce((a, q) => a + Math.sign(q.x - 480) * 0.035, 0) + (broken.length === 2 ? 0.02 : 0);
    const sh = b.shake > 0 ? rand(-3, 3) : 0;
    ctx.save(); ctx.globalAlpha = 1 - k * 0.85;
    ctx.translate(480 + sh + tilt * 120, FLOOR_Y + 6 + k * 120); ctx.rotate(tilt + k * 0.5 * (Math.sign(tilt) || 1));
    drawSprite("throne", 0, 0, 0, { scale: 0.92 });
    ctx.restore();
    b.sup.forEach(s => { // the three supports: big round button marks that shake when hit
      if (s.hp <= 0 || b.state === "collapse") return;
      const jx = s.hit > 0 ? rand(-4, 4) : 0, y = FLOOR_Y - 40;
      ctx.save(); ctx.translate(s.x + jx, y);
      ctx.fillStyle = s.hp === 1 ? "#ff9b6b" : "#ffd23a"; ctx.strokeStyle = "#5a2a06"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#5a2a06"; for (const [dx, dy] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) { ctx.beginPath(); ctx.arc(dx, dy, 3.5, 0, Math.PI * 2); ctx.fill(); }
      if (s.hp === 1) { ctx.strokeStyle = "#5a2a06"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -16); ctx.lineTo(-2, -2); ctx.lineTo(-10, 8); ctx.stroke(); }
      ctx.restore();
      if (Math.floor(game.t / 26) % 2 && b.state !== "collapse") text("▼", s.x, FLOOR_Y - 70, { size: 16, align: "center", color: "#ffd23a" });
    });
  }
  const BOSS_KINDS = {
    wash: { make: makeWash, update: updateWash },
    appraiser: { make: makeAppraiser, update: updateAppraiser, back: drawPlates },
    knight: { make: makeKnight, update: updateKnight },
    king: { make: makeKing, update: updateKing, back: drawThrone },
  };
  function updateBossIntroGeneric(t) {
    const b = boss, seen = game.bossSeen[game.stage];
    if (t === 1) {
      Sound.playMusic(b.calm || "garden"); Sound.setTempo(1.05);
      if (b.kind === "knight") { b.state = "walkin"; b.t = 0; }
      else if (b.kind === "king") { b.state = "idle"; b.t = 0; }
      else { b.state = "drop"; b.t = 0; b.vy = 0; }
    }
    if (b.state === "idle" && !L.introDone && t > 30) {
      L.introDone = true;
      const warn = () => { game.banner = { a: "WARNING!", b: b.name, t: 0, warn: true, life: 150 }; Sound.stopMusic(); Sound.jingle("warning"); L.warnAt = game.phaseT; game.bossSeen[game.stage] = true; };
      if (seen) warn();
      else game.dialog = makeDialog(toLines(BX(b.lines).intro || [{ who: b.name, text: "…" }]), warn);
    }
    if (L.warnAt && game.phaseT === L.warnAt + 150) {
      game.banner = null; game.phase = "fight"; game.inputLock = false;
      Sound.playMusic(b.music || "boss"); b.state = "taunt"; b.t = 0; b.lastSummon = game.t - 120;
      game.tipsSeen = game.tipsSeen || {};
      if (!game.tipsSeen[b.kind]) { game.tipsSeen[b.kind] = true; game.tip = { str: b.tip, t: 0 }; }
      ({ wash: [["wetcoon", 2], ["goblin", 12]], appraiser: [["boxbun", 3], ["goblin", 11]], knight: [["sheep", 2], ["goblin", 12]], king: [["pillowcoon", 1], ["goblin", 13]] })[b.kind].forEach(([ty, c]) => spawnEnemy(ty, c));
    }
  }
  const phase2 = () => boss.hp <= boss.maxHp / 2;
  function updateBoss() {
    if (boss.kind === "herald") return updateHerald();
    if (BOSS_KINDS[boss.kind]) return BOSS_KINDS[boss.kind].update();
    const b = boss; b.t++;
    if (b.inv > 0) b.inv--;
    if (b.hitFlash > 0) b.hitFlash--;
    if (b.talkCd > 0) b.talkCd--;
    const face = () => { b.dir = P.x > b.x ? 1 : -1; };
    const sp = phase2() ? 1.45 : 1;
    switch (b.state) {
      case "wait": return;
      case "drop":
        b.vy += 0.8; b.y += b.vy; b.frame = 2;
        if (b.y >= FLOOR_Y) { b.y = FLOOR_Y; b.vy = 0; b.state = "landed"; b.t = 0; game.shake = 18; Sound.sfx("slam"); puff(b.x, b.y, 20, "rgba(230,210,180,.9)", 5); }
        return;
      case "landed": b.frame = 1; if (b.t > 20) { b.state = "idle"; b.frame = 0; } return;
      case "idle": b.frame = 0; return; // held during the intro dialogue
      case "taunt":
        b.frame = 0; face();
        if (b.t > 50 / sp) chooseBossMove();
        break;
      case "walk":
        b.frame = 0; face(); b.x += b.dir * 1.8 * sp;
        if (b.t > 70) chooseBossMove();
        break;
      case "crouch": b.frame = 1; if (b.t > 22 / sp) {
          b.state = "leap"; b.t = 0; b.vy = -15.5; face();
          const air = 2 * 15.5 / 0.7; b.vx = clamp((P.x - b.x) / air, -7, 7) * (phase2() ? 1.1 : 1); Sound.sfx("jump");
        } break;
      case "leap":
        b.frame = 2; b.vy += 0.7; b.x += b.vx; b.y += b.vy;
        if (b.y >= FLOOR_Y) {
          // landing knocks the wind out of him: the punish window (damage x2)
          b.y = FLOOR_Y; b.state = "stunned"; b.t = 0; game.shake = 16; Sound.sfx("slam"); puff(b.x, b.y, 18, "rgba(230,210,180,.9)", 5);
          if (b.talkCd <= 0 && BL().stunned && Math.random() < 0.45) { say(BL().stunned, b); b.talkCd = 300; }
          waves.push({ x: b.x - 100, dir: -1, life: 0 }, { x: b.x + 100, dir: 1, life: 0 });
        } break;
      case "recover": b.frame = 1; if (b.t > 40) chooseBossMove(); break;
      case "stunned": b.frame = 7; b.waking = b.t > (phase2() ? 64 : 80) - 20; if (b.t > (phase2() ? 64 : 80)) { b.state = "recover"; b.t = 0; b.waking = false; } break;
      case "guard": // phase 2: shuffles toward you behind the sack; front hits bounce off
        b.frame = 6; face(); b.x += b.dir * 1.3 * sp;
        if (b.t > 110) chooseBossMove();
        break;
      case "throw":
        b.frame = b.t < 18 ? 0 : 3; face();
        if (b.t === 18) {
          const n = 1; // one pillow per throw
          for (let i = 0; i < n; i++) {
            const tx = P.x + (i - (n - 1) / 2) * 130, ty = P.y - 45, sx = b.x + b.dir * 56, sy = b.y - 250;
            const air = 58 + i * 6, vx = (tx - sx) / air, vy = (ty - sy - 0.5 * 0.32 * air * air) / air;
            shots.push({ k: "pillow", x: sx, y: sy, vx, vy, rot: 0, life: 0 });
          }
          Sound.sfx("throwp");
        }
        if (b.t > 52 / sp) chooseBossMove();
        break;
      case "summon":
        b.frame = 0;
        if (b.t === 10) { Sound.sfx("whistle"); const l = BL().summon; say(l ? l[Math.floor(rand(0, l.length))] : "얘들아!", b); }
        if (b.t === 40) { spawnEnemy("goblin", Math.random() < 0.5 ? 1 : 13, true); if (phase2()) spawnEnemy(Math.random() < 0.5 ? "raccoon" : "bunny", 7, true); else spawnEnemy("goblin", 7, true); }
        if (b.t > 70) chooseBossMove();
        break;
      case "hurt":
        b.frame = 4; b.x += b.vx; b.vx *= 0.9;
        if (b.t === 1) { b.squash = 10; }
        if (b.t > 26) chooseBossMove();
        break;
      case "dying":
        b.frame = 4;
        if (b.t % 8 === 0) { stars(b.x + rand(-100, 100), b.y - rand(60, 260), 10); feathers(b.x + rand(-90, 90), b.y - rand(60, 230), 5); Sound.sfx("hit", b.t / 8); }
        if (b.t > 110) { b.state = "down"; b.t = 0; game.flash = 14; game.shake = 20; Sound.sfx("explode");
          for (let i = 0; i < 12; i++) dropItem(b.x + rand(-160, 160), b.y - rand(80, 280));
          feathers(b.x, b.y - 110, 50); }
        return;
      case "down": b.frame = 5; return;
    }
    b.x = clamp(b.x, 120, W - 120);
    if (!["stunned", "recover", "hurt"].includes(b.state) && P.state === "normal" && Math.abs(P.x - b.x) < 92 && P.y > b.y - 240 && P.y - 90 < b.y) hurtPlayer(b.x);
  }
  function chooseBossMove() {
    const b = boss; b.t = 0;
    const minions = enemies.filter(e => e.state !== "dead").length;
    if (minions < 2 && game.t - b.lastSummon > 240) { b.state = "summon"; b.lastSummon = game.t; return; }
    const r = Math.random();
    if (phase2()) b.state = r < 0.35 ? "crouch" : r < 0.65 ? "throw" : r < 0.9 ? "guard" : "taunt";
    else b.state = r < 0.4 ? "crouch" : r < 0.75 ? "throw" : r < 0.92 ? "walk" : "taunt";
  }

  // ---- Level setup ---------------------------------------------------------
  function buildPlatformLayer() {
    const c = document.createElement("canvas"); c.width = W * RES; c.height = H * RES;
    const g = c.getContext("2d"); g.scale(RES, RES); g.imageSmoothingQuality = "high";
    const piece = (i, x, y) => {
      const f = fr(L.tiles, i);
      if (f && f.img.naturalWidth) { g.filter = L.slabFilter || "none"; g.drawImage(f.img, x, y, T, SLAB); g.filter = "none"; }
      else { g.fillStyle = "#c99a52"; g.fillRect(x, y, T, SLAB); }
    };
    for (let r = TIER_Y.length - 1; r >= 0; r--) {
      for (let col = 0; col < COLS; col++) {
        if (!solid(col, r) || solid(col - 1, r)) continue;
        let end = col; while (solid(end + 1, r)) end++;
        const y = TIER_Y[r], x0 = col * T, x1 = (end + 1) * T;
        // soft contact shadow under the slab
        const sh = g.createLinearGradient(0, y + SLAB - 6, 0, y + SLAB + 18);
        sh.addColorStop(0, "rgba(20,10,30,.45)"); sh.addColorStop(1, "rgba(20,10,30,0)");
        g.fillStyle = sh; g.fillRect(x0 + 6, y + SLAB - 6, x1 - x0 - 12, 24);
        if (L.rim) { g.fillStyle = L.rim; g.fillRect(x0 + 6, y - 3, x1 - x0 - 12, 4); }
        for (let k = col; k <= end; k++) {
          // end caps on ledges that stop mid-screen; the floor runs edge to edge
          const left = k === col && (r > 0 || k > 0) && col > 0, right = k === end && end < COLS - 1;
          piece(left ? 0 : right ? 3 : 1 + ((k * 3 + r) % 2), k * T, y);
        }
      }
    }
    return c;
  }

  function startStage(i) {
    game.stage = i;
    const def = LEVELS[i];
    L = { ...def, tiers: [null, ...def.tiers], t: 0, spawnQ: def.spawns.map(s => ({ type: s[0], col: s[1], at: s[2] + 70 })), respawnX: W / 2, clearT: -1, startScore: game.score };
    P = makePlayer(); P.inv = 0;
    if (["appraiser", "king"].includes(def.boss)) P.x = 200;
    game.maxHp = HELP ? 7 : 5; game.hp = game.maxHp; game.deathsAtStart = game.deaths; L.startScore = game.score;
    saveProgress(i);
    enemies = []; balls = []; items = []; shots = []; parts = []; waves = [];
    boss = def.boss === "herald" ? makeHerald() : BOSS_KINDS[def.boss] ? BOSS_KINDS[def.boss].make() : def.boss ? makeBoss() : null;
    L.stamp = def.stamp && !stamps[def.chapter] ? { x: def.stamp[0] * T + T / 2, y: TIER_Y[def.stamp[1]], got: false } : null;
    game.hurry = false; game.inputLock = true; game.banner = null; game.dialog = null; game.tip = null;
    platformLayer = buildPlatformLayer();
    game.scene = "play"; game.phase = def.boss ? "bossIntro" : "ready"; game.phaseT = 0;
    if (!def.boss) { Sound.playMusic(def.music); }
    else { Sound.stopMusic(); L.spawnQ = []; }
  }

  // ---- Play scene ----------------------------------------------------------
  function updatePlay() {
    L.t++; game.phaseT++;
    const ph = game.phase;
    if (ph === "ready") {
      if (game.phaseT === 1) { game.banner = { a: `STAGE ${stageLabel(game.stage)}`, b: (LINES.stageStart || [])[game.stage] || "READY?", t: 0 }; Sound.jingle("ready"); }
      if (game.phaseT === 100) { game.banner = { a: "GO!", t: 0, big: true }; game.inputLock = false; P.inv = 90; }
      if (game.phaseT === 150) { game.banner = null; game.phase = "fight"; if (L.tip) game.tip = { str: L.tip, t: 0 }; }
    }
    if (ph === "bossIntro") updateBossIntro();
    // spawns
    for (const s of L.spawnQ) {
      if (!s.done && L.t >= s.at - 30 && L.t % 6 === 0) parts.push({ k: "star", x: s.col * T + T / 2 + rand(-10, 10), y: 96, vx: 0, vy: 1.5, life: 0, max: 20, r: 5, color: "#fff6c0" });
      if (!s.done && L.t >= s.at) { s.done = true; spawnEnemy(s.type, s.col); }
    }

    updatePlayer();
    P.beamStop = null; enemies.forEach(updateEnemy); balls.forEach(updateBall); items.forEach(updateItem); shots.forEach(updateShot); waves.forEach(updateWave);
    if (boss) updateBoss();
    if (boss && boss.hp <= 0 && !L.bossBeaten) { // clear the field the moment the boss is beaten
      L.bossBeaten = true; shots = []; waves = [];
      enemies.forEach(e => { if (e.state !== "dead") { e.state = "dead"; e.t = 0; e.vy = -8; e.vx = rand(-3, 3); e.rot = 0; addScore(200, e.x, e.y - 90); } });
    }
    // player vs enemies
    if (P.state === "normal") for (const e of enemies) {
      if (["walk", "throw", "charge", "roll"].includes(e.state) && Math.abs(e.x - P.x) < e.hw + P.hw - 10 && Math.abs((e.y - 45) - (P.y - 50)) < 56) { hurtPlayer(e.x); break; }
    }
    if (L.stamp && !L.stamp.got && P.state === "normal" && Math.abs(P.x - L.stamp.x) < 44 && Math.abs(P.y - L.stamp.y) < 60) {
      L.stamp.got = true; saveStamp(L.chapter); Sound.sfx("oneup"); stars(L.stamp.x, L.stamp.y - 40, 14);
      popText(L.stamp.x, L.stamp.y - 120, "반송 도장 GET!", "#ff7ad9", 24);
      game.tip = { str: `반송 도장 ${stampCount()}/5 · 다 모으면 좋은 일이?`, t: 0 };
    }
    enemies = enemies.filter(e => !e.gone); balls = balls.filter(b => !b.gone); items = items.filter(i => !i.gone);
    shots = shots.filter(s => !s.gone); waves = waves.filter(w => !w.gone);

    // no timer, no invincible chaser: after a minute the remaining thieves get cross and speed up
    if (!boss && ph === "fight" && L.t === 60 * 60 && enemies.length) {
      game.hurry = true; game.banner = { a: "도둑들이 화났다!", t: 0, warn: true, life: 100, kr: true }; Sound.setTempo(1.2); Sound.sfx("whistle");
    }

    // stage clear check
    if (ph === "fight" && !boss && L.spawnQ.every(s => s.done) && enemies.length === 0 && balls.length === 0 && !P.tank.length && !P.shootQ && P.state === "normal") {
      game.phase = "clear"; game.phaseT = 0; Sound.suck(false);
    }
    if (ph === "clear") {
      if (game.phaseT === 70) { Sound.stopMusic(); Sound.jingle("clear"); game.inputLock = true; P.sucking = false;
        P.celebrate = { t: 0, mode: "stage" };
        const q = (LINES.stageClear || [])[game.stage]; if (q) setTimeout(() => say(q), 0);
        const secs = Math.floor(L.t / 60), tb = Math.max(0, 60 - secs) * 100, nm = game.deathsAtStart === game.deaths ? 5000 : 0;
        game.banner = { a: "STAGE CLEAR!", t: 0, tally: [["TIME BONUS", tb], ["NO MISS", nm]], life: 9999 };
        game.pendingBonus = tb + nm; }
      if (game.phaseT === 150 && game.pendingBonus) { addScore(game.pendingBonus); Sound.sfx("bonus"); game.pendingBonus = 0; }
      if (game.phaseT > 260 || (game.phaseT > 170 && anyPress())) {
        game.phase = "out";
        const next = game.stage + 1, beat = L.after && (CHAPTERS[L.chapter].after || {})[L.after];
        wipeTo(() => beat ? playPanels(beat, () => startIntermission(next)) : startIntermission(next));
      }
    }
    // boss defeated
    if (boss && boss.state === "down" && boss.t === 60) {
      game.inputLock = true; P.sucking = false; P.celebrate = { t: 0, mode: "boss" }; Sound.jingle("chapter");
      enemies.forEach(e => { if (e.state !== "dead") { e.state = "dead"; e.t = 0; e.vy = -8; e.vx = rand(-3, 3); e.rot = 0; } });
      shots = []; waves = [];
      game.banner = { a: "BOSS DEFEATED!", t: 0, life: 9999 };
      saveProgress(game.stage + 1);
    }
    if (boss && boss.state === "down" && boss.t === 260) wipeTo(() => chapterEnd(game.stage));

    if (game.slow > 0) game.slow--;
  }

  function updateBossIntro() {
    const t = game.phaseT;
    if (boss.kind === "herald") return updateHeraldIntro(t);
    if (BOSS_KINDS[boss.kind]) return updateBossIntroGeneric(t);
    if (t === 1 && game.bossSeen[game.stage]) { boss.state = "drop"; boss.vy = 0; L.handed = true; L.bossHasCushion = true; }
    if (game.bossSeen[game.stage] && boss.state === "idle" && !L.warnAt) {
      game.banner = { a: "WARNING!", b: "도둑 두목 빅고블", t: 0, warn: true, life: 150 }; Sound.jingle("warning"); L.warnAt = game.phaseT;
    }
    if (t === 1 && !game.bossSeen[game.stage]) { L.carrier = { x: -60, y: FLOOR_Y, t: 0 }; Sound.playMusic("rooftop"); Sound.setTempo(1.1); }
    const c = L.carrier;
    if (c && !c.gone) {
      c.t++;
      if (c.x < 560) c.x += 4.4;
      else if (!c.waiting) { c.waiting = true; boss.state = "drop"; boss.vy = 0; Sound.stopMusic(); }
      if (c.t % 6 === 0 && c.x < 560) puff(c.x - 30, c.y, 1);
    }
    if (boss.state === "idle" && !L.handed) {
      L.handed = true; c.gone = true; stars(c.x, c.y - 100, 12); Sound.sfx("pop"); L.bossHasCushion = true;
      game.dialog = makeDialog((BL().intro || [
        { who: "빅고블", text: "크하하! 이 최고급 쿠션은 왕께 바칠 물건이다!" },
        { who: "냥이", text: "…그거 내 거야." },
      ]).map(l => ({ who: l.who || undefined, text: l.text, narr: !l.who })), () => {
        game.banner = { a: "WARNING!", b: "도둑 두목 빅고블", t: 0, warn: true, life: 150 };
        Sound.jingle("warning"); L.warnAt = game.phaseT; game.bossSeen[game.stage] = true;
      });
    }
    if (L.warnAt && game.phaseT === L.warnAt + 150) {
      game.banner = null; game.phase = "fight"; game.inputLock = false;
      Sound.playMusic("boss"); if (boss.hp > 0) { boss.state = "taunt"; boss.t = 0; } boss.lastSummon = game.t - 200;
      if (!game.gobTipShown) { game.gobTipShown = true; game.tip = { str: "점프해 내려찍을 땐 C(보라 버튼) 슬라이딩으로 빠져나가!", t: 0 }; }
      spawnEnemy("goblin", 1); spawnEnemy("goblin", 13);
    }
  }

  function updateHeraldIntro(t) {
    const seen = game.bossSeen[game.stage];
    if (t === 1) { boss.state = "enter"; boss.t = 0; Sound.playMusic("garden"); Sound.setTempo(1.1); }
    if (boss.state === "idle" && !L.introDone) {
      L.introDone = true;
      const warn = () => { game.banner = { a: "WARNING!", b: boss.name, t: 0, warn: true, life: 150 }; Sound.stopMusic(); Sound.jingle("warning"); L.warnAt = game.phaseT; game.bossSeen[game.stage] = true; };
      if (seen) warn();
      else game.dialog = makeDialog((HL().intro || [{ who: "왕의 전령", text: "끼햐햐! 접수 마감이다!" }]).map(l => ({ who: l.who || undefined, text: l.text, narr: !l.who })), warn);
    }
    if (L.warnAt && game.phaseT === L.warnAt + 150) {
      game.banner = null; game.phase = "fight"; game.inputLock = false;
      Sound.playMusic("boss"); boss.state = "hover"; boss.t = 0; boss.lastSummon = game.t;
      if (!game.bossTipShown) { game.bossTipShown = true; game.tip = { str: "도장이 박히면 공격! 서류도 탄이 돼!", t: 0 }; }
      spawnEnemy("goblin", 2); spawnEnemy("goblin", 12);
    }
  }

  // ---- Dialogue box --------------------------------------------------------
  function makeDialog(lines, done) { return { lines, i: 0, n: 0, t: 0, done }; }
  function updateDialog() {
    const d = game.dialog; if (!d) return;
    const line = d.lines[d.i]; d.t++;
    const full = [...line.text].length;
    if (d.n < full) { if (d.t % 2 === 0) { d.n++; if (d.n % 2) Sound.sfx("blip"); } }
    const adv = pressed.jump || pressed.fire || pressed.start;
    if (adv && d.n < full) { d.n = full; return; }
    if ((adv && d.t > 8) || d.t > full * 2 + 120) {
      d.i++; d.n = 0; d.t = 0;
      if (d.i >= d.lines.length) { game.dialog = null; d.done && d.done(); }
    }
  }
  function drawDialog() {
    const d = game.dialog; if (!d) return;
    const top = game.scene === "ending" && CUT && (CUT.panels[CUT.i] || {}).top;
    const right = game.scene === "ending" && CUT && (CUT.panels[CUT.i] || {}).box === "right";
    const line = d.lines[d.i], x = right ? W - 600 : 40, w = right ? 560 : W - 80, h = 128;
    const highBoss = boss && ["herald", "king"].includes(boss.kind), bossTalks = highBoss && line.who && line.who !== "냥이";
    const y = top ? 44 : right ? H - 170 : game.scene === "play" && (!highBoss || (line.who === "냥이")) && !bossTalks ? 134 : H - 170;
    ctx.save();
    ctx.fillStyle = "rgba(11,13,31,.55)"; roundRect(x + 8, y + 8, w, h, 14); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#2a30a0"); g.addColorStop(1, "#14185a");
    ctx.fillStyle = g; roundRect(x, y, w, h, 14); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = "#0b0d1f"; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = "#fff6d8"; roundRect(x + 4, y + 4, w - 8, h - 8, 11); ctx.stroke();
    if (line.who) {
      ctx.font = `24px ${KR}`; const tw = ctx.measureText(line.who).width + 32;
      ctx.fillStyle = "#ffd23a"; roundRect(x + 24, y - 20, tw, 38, 8); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#0b0d1f"; ctx.stroke();
      text(line.who, x + 40, y + 9, { font: KR, size: 22, color: "#0b0d1f", shadow: false });
    }
    text([...line.text].slice(0, d.n).join(""), x + 36, y + 76, { font: KR2, size: 34, color: "#fffaf0", sh: 2, live: true });
    if (d.n >= [...line.text].length && Math.floor(game.t / 20) % 2) {
      ctx.fillStyle = "#ffd23a"; ctx.beginPath(); ctx.moveTo(x + w - 46, y + h - 34); ctx.lineTo(x + w - 26, y + h - 34); ctx.lineTo(x + w - 36, y + h - 22); ctx.fill();
    }
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  // ---- Drawing: play -------------------------------------------------------
  // Backgrounds are composed ONCE into a screen-sized canvas (scale + dim + optional platforms) and then
  // blitted 1:1 every frame. Re-scaling a 1920x1440 image each frame with high-quality smoothing was the
  // main cause of frame drops on the later stages.
  const layerCache = new Map();
  function bgLayer(name, dim = 0, sc = 1, withPlatforms = null) {
    const key = `${name}|${dim}|${sc}|${withPlatforms ? "p" + game.stage : ""}`;
    let c = layerCache.get(key);
    if (c) return c;
    c = document.createElement("canvas"); c.width = W * RES; c.height = H * RES;
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.scale(RES, RES);
    const im = BG[name];
    // scale anchored to the top so a background's painted ground strip lines up with the floor slabs
    if (im && im.naturalWidth) g.drawImage(im, (W - W * sc) / 2, 0, W * sc, H * sc); else { g.fillStyle = "#223"; g.fillRect(0, 0, W, H); }
    if (dim) { g.fillStyle = `rgba(8,8,24,${dim})`; g.fillRect(0, 0, W, H); }
    if (withPlatforms) g.drawImage(withPlatforms, 0, 0, W, H);
    if (layerCache.size > 12) layerCache.delete(layerCache.keys().next().value);
    layerCache.set(key, c);
    return c;
  }
  function drawBg(name, dim = 0, sc = 1, withPlatforms = null) {
    ctx.drawImage(bgLayer(name, dim, sc, withPlatforms), 0, 0, W, H);
  }

  // Suction: a mint wind vortex — curling air streams spiral into the paw-shaped vacuum mouth.
  // Starts no wider than the mouth, flares out slowly. Drawn solid into an offscreen layer, then faded at both
  // ends with one gradient mask, so strokes stay continuous (no beads / slice seams).
  const MOUTH = 15; // half-height of the vacuum mouth
  let beamLayer = null;
  function drawBeam() {
    if (!P.sucking || P.state !== "normal") return;
    const n = nozzle(), dir = P.dir, t = game.t, L = BEAM, PAD = 70, stop = clamp(P.beamStop ?? BEAM, 30, BEAM);
    if (!beamLayer) { beamLayer = document.createElement("canvas"); beamLayer.width = (L + 20) * RES; beamLayer.height = PAD * 2 * RES; }
    const g = beamLayer.getContext("2d");
    g.setTransform(RES, 0, 0, RES, 0, 0); g.clearRect(0, 0, L + 20, PAD * 2);
    const cy = PAD, half = d => MOUTH + (d / L) * (d / L) * 26;
    // soft air cone
    g.fillStyle = "rgba(180,255,230,.34)"; g.beginPath(); g.moveTo(0, cy - half(0));
    for (let d = 0; d <= L; d += 10) g.lineTo(d, cy - half(d));
    for (let d = L; d >= 0; d -= 10) g.lineTo(d, cy + half(d));
    g.fill();
    // curling streams (helix seen from the side), phase-scrolling toward the mouth
    g.lineCap = "round"; g.lineJoin = "round";
    for (let k = 0; k < 4; k++) {
      const ph = k * 1.57, amp = 0.5 + k * 0.14;
      g.beginPath();
      for (let d = L; d >= 0; d -= 4) { const y = cy + Math.sin(d * 0.05 + t * 0.32 + ph) * half(d) * amp; d === L ? g.moveTo(d, y) : g.lineTo(d, y); }
      g.strokeStyle = "rgba(20,90,80,.35)"; g.lineWidth = 8 - k; g.stroke();
      g.strokeStyle = k % 2 ? "#ffffff" : "#8ff5d6"; g.lineWidth = 4.5 - k * 0.8; g.stroke();
    }
    // little dashes of air rushing in
    g.strokeStyle = "#fff"; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const d = L - ((t * 5 + i * 31) % L), y = cy + Math.sin(i * 2.3 + t * 0.2) * half(d) * 0.75;
      g.beginPath(); g.moveTo(d, y); g.lineTo(d + 16, y + (y - cy) * 0.12); g.stroke();
    }
    // fade mask: quick fade-in at the mouth, long fade-out at the far end
    g.globalCompositeOperation = "destination-in";
    const m = g.createLinearGradient(0, 0, L, 0);
    m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(0.07, "#000"); m.addColorStop(0.55, "#000"); m.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = m; g.fillRect(0, 0, L + 20, PAD * 2);
    g.globalCompositeOperation = "source-over";
    ctx.save(); ctx.translate(n.x - dir * 12, n.y - PAD); if (dir < 0) ctx.scale(-1, 1); // starts just inside the vacuum mouth
    if (stop < L) { // blocked: clip the stream at the shield and spray sparks there
      ctx.beginPath(); ctx.rect(0, 0, stop, PAD * 2); ctx.clip();
      if (game.t % 4 === 0) stars(n.x + dir * stop, n.y + rand(-14, 14), 1);
    }
    ctx.drawImage(beamLayer, 0, 0, L + 20, PAD * 2); ctx.restore();
  }

  const elastic = k => k >= 1 ? 1 : 1 - Math.pow(2, -9 * k) * Math.cos(k * 10.5);
  function playerFrame() {
    const p = P, c = p.celebrate;
    if (p.slideT > 0) return ["cat_b", 1];
    if (p.state === "hurt" || p.state === "hit") return ["cat_b", 5];
    if (c) {
      if (c.t < 46) return ["cat_c", 0];                          // victory hop, paws up
      if (c.mode === "stage") return ["cat_c", c.t < 130 ? 1 : 2]; // smug wink, then a yawn
      return ["cat_c", c.t < 140 ? 2 : 3];                         // boss: yawn, then fall asleep
    }
    if (p.shootPose > 0) return ["cat_b", 4];
    if (p.sucking) return ["cat_b", 2 + (Math.floor(p.suckT / 7) % 2)]; // braced / straining
    if (!p.onGround) return ["cat_b", p.vy < 0 ? 0 : 1];
    if (Math.abs(p.vx) > 0.4) return ["cat_a", 1 + Math.floor(p.walkT) % 4];
    if (p.idleT > 420 && (p.idleT - 420) % 600 < 80) return ["cat_c", 2];   // bored: big yawn
    if (p.t % 190 < 7 || p.doze > 0) return ["cat_c", 4];                   // blink / dozing
    return ["cat_a", 0];
  }
  function drawPlayer() {
    const p = P;
    if (p.inv > 0 && p.state === "normal" && Math.floor(p.t / 4) % 2) return;
    const [sheet, f] = playerFrame();
    let sx = 1, sy = 1, ox = 0, oy = 0, rot = 0;
    if (sheet === "cat_a" && f === 0) sy = 1 + Math.sin(game.t * 0.08) * 0.015;               // breathing
    if (sheet === "cat_a" && f > 0) { oy = -Math.abs(Math.sin(p.walkT * Math.PI / 2)) * 4; rot = Math.sin(p.walkT * Math.PI / 2) * 0.05; }
    if (!p.onGround && p.state === "normal" && !p.celebrate) { const k = clamp(-p.vy / 14, -0.6, 1); sy = 1 + k * 0.07; sx = 1 - k * 0.05; }
    if (p.landSquash > 0) { const k = p.landSquash / 8; sy = 1 - k * 0.14; sx = 1 + k * 0.1; }
    if (p.sucking) { rot = -p.dir * (0.05 + Math.sin(game.t * 0.9) * 0.015); ox = Math.sin(game.t * 1.9) * 1.2; }
    if (p.recoil > 0) { const k = p.recoil / 10; ox -= p.dir * k * 14; sx *= 1 + k * 0.12; sy *= 1 - k * 0.08; }
    if (p.gulp > 0) { const k = Math.sin((12 - p.gulp) / 12 * Math.PI); sy *= 1 + k * 0.1; sx *= 1 - k * 0.04; }
    if (p.rattle && p.state === "normal") ox += Math.sin(game.t * 2.3) * 2.2;
    if (p.state === "hit") rot = -Math.sign(p.vx || 1) * 0.25;
    if (p.slideT > 0) { sy = 0.72; sx = 1.18; rot = p.dir * 0.35; oy = 6;
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) { const yy = p.y - 18 - i * 20, x0 = p.x - p.dir * (50 + i * 12); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 - p.dir * 36, yy); ctx.stroke(); }
      ctx.restore(); }
    const opts = { flip: p.dir < 0, sx, sy, rot, scale: SHEET_SCALE[sheet] || 1 };
    drawSprite(sheet, f, p.x + ox, p.y + oy + 2, opts);
    if (p.x < 80) drawSprite(sheet, f, p.x + W + ox, p.y + oy + 2, opts);
    else if (p.x > W - 80) drawSprite(sheet, f, p.x - W + ox, p.y + oy + 2, opts);
    // tank pips: cyan when fresh, orange then flashing red as the thief is about to break out
    if (p.tank.length && p.state === "normal") {
      for (let i = 0; i < MAX_TANK; i++) {
        const it = p.tank[i], x = p.x - (MAX_TANK - 1) * 12 + i * 24, y = p.y - 150;
        const warn = it && !["pillow", "paper", "water"].includes(it.type) && it.t >= ESCAPE_WARN, blink = warn && Math.floor(game.t / 5) % 2;
        const col = !it ? null : ["pillow", "paper", "water"].includes(it.type) ? "#fff8e8" : warn ? (blink ? "#ff3b3b" : "#ffb02e") : it.t > ESCAPE_WARN * 0.6 ? "#ffd84d" : "#2fc4e8";
        ctx.beginPath(); ctx.arc(x, y, warn ? 8.5 : 7.5, 0, Math.PI * 2);
        if (col) { const og = ctx.createRadialGradient(x - 2, y - 3, 1, x, y, 9); og.addColorStop(0, "#fff"); og.addColorStop(1, col); ctx.fillStyle = og; }
        else ctx.fillStyle = "rgba(11,13,31,.45)";
        ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#0b0d1f"; ctx.stroke();
      }
    }
  }

  function enemyFrame(e) {
    const d = EDEF[e.type];
    if (d.guard && e.type !== "shield") {
      if (["pulled", "dazed", "dead"].includes(e.state) || !e.shield) return d.stun;
      if (e.state === "boast") return 3;
      if (e.state === "tired") return d.tiredFrame;
      if (e.state === "charge") return d.chargeFrame;
      return d.walk[Math.floor(e.anim) % d.walk.length];
    }
    if (e.type === "boxbun") { if (e.state === "boxed" || e.state === "enter") return Math.floor(e.anim) % 2; if (e.state === "peek") return e.t < 0 ? 3 : 2; if (e.state === "pulled") return 3; return 4; }
    if (e.type === "bat") return ({ hang: 0, wake: 1, swoop: 2, rise: 2, landed: 3, pulled: 3 })[e.state] ?? 4;
    if (e.type === "sheep" && e.state === "sing") return 3;
    if (e.type === "foamgob" && e.state === "pulled") return 3;
    if (e.type === "shield") {
      if (["pulled", "dazed", "dead"].includes(e.state) || !e.shield) return 5;
      if (e.state === "tired") return 3;
      if (e.blockT > 0) return 4;
      return d.walk[Math.floor(e.anim) % d.walk.length];
    }
    if (e.type === "button") {
      if (e.state === "roll" || e.state === "fall") return 2;
      if (e.state === "flipped" || e.state === "pulled") return 3;
      if (["dazed", "dead"].includes(e.state)) return 4;
      return d.walk[Math.floor(e.anim * 1.5) % 2];
    }
    if (["pulled", "dazed", "dead"].includes(e.state)) return d.stun;
    if (e.state === "throw") return d.thr;
    if (!e.onGround && e.type === "raccoon") return d.leap;
    if (!e.onGround && e.state !== "enter") return d.walk[1];
    return d.walk[Math.floor(e.anim) % d.walk.length];
  }
  function drawEnemy(e) {
    const f = enemyFrame(e);
    const o = { flip: e.dir < 0 };
    if (e.state === "dead") { drawSprite(e.type, f, e.x, e.y - 45, { ...o, rot: e.rot, center: true }); return; }
    // size eases toward a target that depends only on distance to the nozzle -> no popping
    const n = P ? nozzle() : null;
    const near = e.state === "pulled" && n ? 1 - clamp(Math.hypot(n.x - e.x, n.y - (e.y - 45)) / BEAM, 0, 1) : 0;
    if (e.state === "popout") e.drawScale = 0.25 + 0.75 * elastic(e.t / 16);
    else e.drawScale = (e.drawScale ?? 1) + ((1 - near * 0.5) - (e.drawScale ?? 1)) * 0.25;
    if (e.state === "pulled") { // stretched toward the nozzle, flailing, spinning faster as it gets close
      const toward = Math.sign(n.x - e.x) || 1, flail = Math.sin(game.t * (0.5 + near * 0.6) + e.anim) * (0.12 + near * 0.35);
      const r = e.resist || 0; // digging in: leaning away from the nozzle, legs scrambling, body tugged long
      const lean = -toward * 0.24 * r + Math.sin(game.t * 2.1) * 0.05 * r;
      const frame = r > 0.3 ? EDEF[e.type].walk[Math.floor(game.t / 3) % EDEF[e.type].walk.length] : f;
      drawSprite(e.type, frame, e.x + Math.sin(game.t * 1.7) * (1.5 + r * 1.5), e.y - near * 30, { ...o, center: false, scale: e.drawScale,
        flip: r > 0.3 ? toward > 0 : o.flip, // faces away, trying to run
        sx: 1 + near * 0.55 + r * 0.1, sy: 1 - near * 0.28 - r * 0.05, rot: (1 - r) * (flail + toward * near * 0.5) + lean });
      if (game.t % 4 === 0) parts.push({ k: "suckdot", x: e.x, y: e.y - 50, tx: n.x, ty: n.y, life: 0, max: 12, r: 4, color: "#ffe9a8" });
      return;
    }
    if (e.state === "popout") {
      const k = e.t / 16, st = 1 - elastic(k);
      drawSprite(e.type, EDEF[e.type].stun, e.x, e.y + 2, { ...o, scale: e.drawScale, sx: 1 + st * 0.5, sy: 1 - st * 0.3, rot: (1 - k) * 2.2 * Math.sign(e.vx || 1) });
      return;
    }
    const hop = e.type === "bunny" && e.onGround && e.state === "walk" ? -Math.abs(Math.sin(e.anim * Math.PI / 2)) * 8 : 0;
    if (e.type === "button" && (e.state === "roll" || e.state === "fall")) { drawSprite(e.type, 2, e.x, e.y - 34, { center: true, rot: e.spin || 0 }); return; }
    if (e.state === "charge") {
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) { const yy = e.y - 30 - i * 22, x0 = e.x - e.dir * (40 + ((game.t * 9 + i * 17) % 40)); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 - e.dir * 30, yy); ctx.stroke(); }
      ctx.restore();
      drawSprite(e.type, f, e.x, e.y + 2, { ...o, rot: e.dir * 0.18 }); return;
    }
    const walking = e.state === "walk" && e.onGround;
    const bob = walking && e.type !== "bunny" ? -Math.abs(Math.sin(e.anim * Math.PI / 2)) * 3 : 0;
    drawSprite(e.type, f, e.x, e.y + hop + bob + 2, { ...o, scale: e.drawScale, rot: walking ? Math.sin(e.anim * Math.PI / 2) * 0.06 : 0 });
    if (e.state === "dazed") drawDizzy(e.x, e.y - 104);
    if (e.angry > 0 && e.state === "walk") { // little anger mark over an escaped thief
      const ax = e.x + e.dir * 22, ay = e.y - 112 + Math.sin(game.t * 0.3) * 2, s = 1 + Math.max(0, Math.sin(game.t * 0.3)) * 0.2;
      ctx.save(); ctx.translate(ax, ay); ctx.scale(s, s); ctx.strokeStyle = "#ff2d2d"; ctx.lineWidth = 4; ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(3, -3); ctx.quadraticCurveTo(9, -3, 9, -9); ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawDizzy(x, y) {
    for (let i = 0; i < 3; i++) {
      const a = game.t * 0.15 + i * 2.1;
      drawStar(x + Math.cos(a) * 26, y + Math.sin(a) * 7, 8, "#ffe14d");
    }
  }
  function drawStar(x, y, r, color) {
    ctx.save(); ctx.translate(x, y); ctx.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "#0b0d1f"; ctx.stroke(); ctx.restore();
  }
  function drawBall(b) {
    const cx = b.x, cy = b.y - 38, w = 1, R = 44, ph = b.rot;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(w, 2 - w);
    const body = ctx.createRadialGradient(-R * 0.3, -R * 0.32, R * 0.1, 0, 0, R);
    body.addColorStop(0, "rgba(255,255,255,.35)"); body.addColorStop(0.7, "rgba(200,240,255,.18)"); body.addColorStop(1, "rgba(170,200,255,.38)");
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // captives tumble inside, arranged around the centre
    if (b.type === "pillow") drawSprite("items", 3, cx, cy, { rot: ph, center: true, scale: 1.9 });
    else if (b.type === "paper") { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ph); drawPaper(0, -6, 0); drawPaper(6, 4, 0.7); drawPaper(-6, 6, -0.6); ctx.restore(); }
    else if (b.type === "water") { // a sloshing water drop
      ctx.save(); ctx.translate(cx, cy); const wv = Math.sin(game.t * 0.4) * 3;
      const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, 30); g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, "#9fe6ff"); g.addColorStop(1, "#2f9fd8");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 26 + wv, 26 - wv, ph, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#0b3a5a"; ctx.stroke(); ctx.restore();
      if (b.life % 3 === 0) parts.push({ k: "dust", x: b.x, y: b.y - 20, vx: rand(-1, 1), vy: rand(-2, 0), life: 0, max: 18, r: 5, color: "rgba(160,225,255,.9)" });
    }
    else if (b.type === "cloud") { // a sleepy cloud sheep curled into a ball
      drawSprite("sheep", EDEF.sheep.stun, cx, cy, { rot: ph, center: true, scale: 0.72 });
      if (b.life % 4 === 0) parts.push({ k: "dust", x: b.x - Math.sign(b.vx) * 30, y: b.y - 50, vx: 0, vy: -0.4, life: 0, max: 30, r: 10, color: "rgba(240,240,255,.85)" });
    }
    else drawSprite(b.type, EDEF[b.type].stun, cx, cy, { rot: ph, center: true, scale: 0.72 });
    ctx.save(); ctx.translate(cx, cy); ctx.scale(w, 2 - w);
    ctx.globalCompositeOperation = "screen";
    const aur = ctx.createConicGradient ? ctx.createConicGradient(ph, 0, 0) : null;
    if (aur) [["#7ff0ff", 0], ["#b98bff", .22], ["#ff9de2", .42], ["#fff3a0", .6], ["#8ff5d6", .8], ["#7ff0ff", 1]].forEach(([c, k]) => aur.addColorStop(k, c));
    ctx.lineWidth = 6; ctx.strokeStyle = aur || "#b98bff"; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(0, 0, R - 3, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, R - 8, ph, ph + 2.2); ctx.stroke();
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.ellipse(-R * 0.36, -R * 0.45, R * 0.25, R * 0.13, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(R * 0.4, R * 0.38, R * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // the paw-shaped "return to owner" stamp (optional collectible, one per chapter from ch2)
  function drawStampPickup(x, y) {
    const g = 0.6 + 0.4 * Math.sin(game.t * 0.1);
    ctx.save(); ctx.globalAlpha = 0.35 * g; ctx.fillStyle = "#ffe14d"; ctx.beginPath(); ctx.arc(x, y, 38 + g * 8, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5 * g; ctx.strokeStyle = "#fff6c0"; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const a = game.t * 0.02 + i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 44, y + Math.sin(a) * 44); ctx.lineTo(x + Math.cos(a) * 58, y + Math.sin(a) * 58); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#7a4a2a"; ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = 3; roundRect(-9, -26, 18, 22, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#c2183a"; roundRect(-22, -6, 44, 22, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff3e0"; ctx.beginPath(); ctx.ellipse(0, 7, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    for (const [dx, dy] of [[-10, 0], [-4, -3], [4, -3], [10, 0]]) { ctx.beginPath(); ctx.arc(dx, dy, 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function drawItem(it) {
    if (it.life > 480 && Math.floor(it.life / 5) % 2) return;
    const bob = it.onGround ? Math.sin((game.t + it.bob * 20) * 0.1) * 2 : 0;
    if (it.k === 8) drawSprite("hud2", 0, it.x, it.y + bob - 4, { scale: 1.15 + Math.sin(game.t * 0.2) * 0.08 });
    else drawSprite("items", it.k, it.x, it.y + bob);
  }
  function drawPaper(x, y, rot, a = 1) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = "#fffaf0"; ctx.strokeStyle = "#3a2a52"; ctx.lineWidth = 2.5; roundRect(-16, -20, 32, 40, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(60,50,90,.5)"; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-10, -11 + i * 7); ctx.lineTo(10, -11 + i * 7); ctx.stroke(); }
    ctx.fillStyle = "#d6303f"; ctx.beginPath(); ctx.arc(7, 12, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawNote(x, y, a = 1) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    ctx.fillStyle = "#e9e3ff"; ctx.strokeStyle = "#2a2a66"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(-4, 8, 8, 6, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillRect(3, -14, 3, 22); ctx.strokeRect(3, -14, 3, 22);
    ctx.beginPath(); ctx.moveTo(6, -14); ctx.quadraticCurveTo(16, -10, 12, -2); ctx.stroke();
    ctx.restore();
  }
  function drawShot(s) {
    if (s.k === "note") return drawNote(s.x, s.y, 0.95);
    if (s.k === "paper") return drawPaper(s.x, s.y, s.rot);
    if (s.k === "sock") drawSprite("items", 0, s.x, s.y, { rot: s.rot, center: true, scale: 0.85 });
    if (s.k === "pillow") drawSprite("items", 3, s.x, s.y, { rot: s.rot, center: true, scale: 1.4 });
    if (s.k === "coin") drawCoin(s.x, s.y, s.life);
    if (s.k === "tag") drawTag(s.x, s.y, s.rot);
  }
  function drawCoin(x, y, t) {
    const w = Math.abs(Math.cos(t * 0.25)) * 13 + 3;
    ctx.save(); ctx.fillStyle = "#ffcf3a"; ctx.strokeStyle = "#7a4a08"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, w, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.ellipse(x - w * 0.3, y - 6, w * 0.25, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function drawTag(x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = "#ffd23a"; ctx.strokeStyle = "#6b3f05"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-26, -14); ctx.lineTo(16, -14); ctx.lineTo(28, 0); ctx.lineTo(16, 14); ctx.lineTo(-26, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6b3f05"; ctx.beginPath(); ctx.arc(16, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-18, -4, 22, 3); ctx.fillRect(-18, 3, 14, 3); ctx.restore();
  }
  function drawWave(w) {
    if (w.k === "foam") {
      ctx.save();
      for (let i = 0; i < 6; i++) { const r = 14 + ((i * 7 + w.life) % 9); ctx.beginPath(); ctx.arc(w.x - w.dir * i * 14 + Math.sin(w.life * 0.3 + i) * 4, FLOOR_Y - 16 - (i % 3) * 14, r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(235,250,255,.9)"; ctx.fill(); ctx.strokeStyle = "rgba(120,190,230,.8)"; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore(); return;
    }
    ctx.save(); ctx.globalAlpha = 0.85;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(w.x - w.dir * i * 20, FLOOR_Y - 14 - i * 6, 32 - i * 7, 23 - i * 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = i ? "rgba(240,225,200,.8)" : "#fff3dc"; ctx.fill();
    }
    ctx.restore();
  }
  function drawBoss() {
    if (!boss || boss.state === "wait") return;
    if (boss.kind === "herald") return drawHerald();
    if (BOSS_KINDS[boss.kind]) { const K = BOSS_KINDS[boss.kind]; K.back && K.back(); if (boss.kind !== "king" || boss.state !== "wait") drawBossSprite(boss); return; }
    const b = boss;
    if (b.inv > 0 && b.state !== "dying" && Math.floor(b.t / 3) % 2 && !b.hitFlash) return;
    const shakeX = b.state === "dying" ? rand(-4, 4) : 0;
    let sy = 1;
    if (b.state === "taunt" || b.state === "idle") sy = 1 + Math.sin(game.t * 0.18) * 0.02;
    const bob = b.state === "walk" ? -Math.abs(Math.sin(b.t * 0.2)) * 6 : 0;
    let sx = 1;
    if (b.squash > 0) { const k = b.squash / 10; sx = 1 + k * 0.1; sy *= 1 - k * 0.1; b.squash--; }
    if (b.state === "stunned") sy *= 1 + Math.sin(game.t * 0.3) * 0.02;
    if (b.waking && Math.floor(game.t / 4) % 2) ctx.globalAlpha = 0.55; // about to wake up
    drawSprite("boss", b.frame, b.x + shakeX, b.y + bob + 4, { flip: b.dir > 0, sx, sy, flash: b.hitFlash > 0 && b.hitFlash % 4 < 2 });
    ctx.globalAlpha = 1;
    if (b.state === "stunned") { for (let i = 0; i < 4; i++) { const a = game.t * 0.15 + i * Math.PI / 2; drawStar(b.x + Math.cos(a) * 60, b.y - 250 + Math.sin(a) * 14, 11, "#ffe14d"); } }
    if (L.bossHasCushion && b.state !== "down") { // the stolen cushion rides on top of his sack
      const cx = b.x - b.dir * 70, cy = b.y - 226 + bob;
      if (fr("cushion", 2)) drawSprite("cushion", 2, cx, cy, { center: true, flip: b.dir > 0, rot: -b.dir * 0.12, scale: 1.05 });
      else drawCushion(cx, cy, 1.2, -b.dir * 0.25);
    }
  }
  function drawCushion(x, y, s = 1, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = "#0b0d1f"; roundRect(-34, -20, 68, 40, 16); ctx.fill();
    const g = ctx.createLinearGradient(0, -18, 0, 18); g.addColorStop(0, "#e2344a"); g.addColorStop(1, "#8f1020");
    ctx.fillStyle = g; roundRect(-31, -17, 62, 34, 13); ctx.fill();
    ctx.fillStyle = "#f5e6c8";
    ctx.beginPath(); ctx.ellipse(0, 4, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    for (const [dx, dy] of [[-9, -6], [-3, -10], [4, -10], [10, -6]]) { ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#ffd23a";
    for (const [dx, dy] of [[-33, -18], [33, -18], [-33, 18], [33, 18]]) { ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function drawParts() {
    for (const q of parts) {
      const a = 1 - q.life / q.max;
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
      if (q.k === "dust" || q.k === "trail") { ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (q.k === "trail" ? a : 1 + q.life / q.max), 0, Math.PI * 2); ctx.fillStyle = q.color; if (q.k === "trail") ctx.globalAlpha = a * 0.45; ctx.fill(); }
      if (q.k === "star") drawStar(q.x, q.y, q.r, q.color);
      if (q.k === "slurp") { // last instant of the capture: squeezed into the nozzle
        const k = q.life / q.max, x = q.x + (q.tx - q.x) * k, y = q.y + (q.ty - q.y) * k;
        ctx.globalAlpha = 1;
        if (q.type === "pillow") drawSprite("items", 3, x, y, { center: true, scale: 1.3 * (1 - k), rot: k * 6 });
        else if (q.type === "paper") drawPaper(x, y, k * 6, 1 - k);
        else if (!EDEF[q.type]) { ctx.fillStyle = q.type === "water" ? "#7fd8ff" : "#fff"; ctx.beginPath(); ctx.arc(x, y, 18 * (1 - k), 0, Math.PI * 2); ctx.fill(); }
        else drawSprite(q.type, EDEF[q.type].stun, x, y, { center: true, scale: 0.5 * (1 - k * 0.9), sx: 1 + k * 1.2, sy: 1 - k * 0.6, rot: k * 4 * q.dir });
      }
      if (q.k === "paper") drawPaper(q.x, q.y, q.rot, 1 - q.life / q.max);
      if (q.k === "ink") { ctx.globalAlpha = 0.55 * (1 - q.life / q.max); ctx.fillStyle = "#c2183a"; ctx.beginPath(); ctx.ellipse(q.x, q.y, 58, 12, 0, 0, Math.PI * 2); ctx.fill(); }
      if (q.k === "poof") { drawSprite(q.type, EDEF[q.type].stun, q.x, q.y, { rot: q.rot, center: true, scale: 0.8 }); }
      if (q.k === "ring") { ctx.beginPath(); ctx.arc(q.x, q.y, q.r + q.life * 3.2, 0, Math.PI * 2); ctx.lineWidth = 5 * a; ctx.strokeStyle = q.color; ctx.stroke(); }
      if (q.k === "bubble") { ctx.globalAlpha = clamp(Math.min(q.life / 6, (q.max - q.life) / 12), 0, 1); speechBubble(q.str, q.x, q.y, q.life); }
      if (q.k === "suckdot") { ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fillStyle = q.color; ctx.fill(); }
      if (q.k === "feather") { ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.beginPath(); ctx.ellipse(0, 0, q.r, q.r * 0.38, 0, 0, Math.PI * 2); ctx.fillStyle = q.color; ctx.fill(); ctx.strokeStyle = "rgba(11,13,31,.5)"; ctx.lineWidth = 1; ctx.stroke(); }
      if (q.k === "text") { const kr = /[가-힣]/.test(q.str); text(q.str, q.x, q.y, { size: kr ? q.size * 1.2 : q.size, align: "center", color: q.color, stroke: kr ? 7 : undefined, font: kr ? KR : undefined }); }
      ctx.restore();
    }
  }
  function speechBubble(str, x, y, life) {
    ctx.font = `26px ${KR2}`;
    const w = ctx.measureText(str).width + 34, h = 46, s = life < 8 ? elastic(life / 8) : 1;
    x = clamp(x, w / 2 + 8, W - w / 2 - 8); y = Math.max(y, 120);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "#fffdf4"; ctx.strokeStyle = "#0b0d1f"; ctx.lineWidth = 4;
    roundRect(-w / 2, -h, w, h, 18); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(4, 14); ctx.lineTo(10, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(-10, -6, 22, 6);
    ctx.fillStyle = "#1b1530"; ctx.textAlign = "center"; ctx.fillText(str, 0, -14);
    ctx.restore();
  }
  function updateParts() {
    for (const q of parts) {
      q.life++;
      if (q.k === "bubble") { if (q.who) { q.x = q.who.x; q.y = q.who.y - (q.who === P ? 160 : q.who.talkH || 330); } continue; }
      if (q.k === "slurp" || q.k === "ring") continue;
      if (q.k === "ink") continue;
      if (q.k === "paper") { q.vy = Math.min(q.vy + 0.15, 1.6); q.x += q.vx + Math.sin(q.life * 0.1) * 1.2; q.vx *= 0.97; q.y += q.vy; q.rot += 0.04; continue; }
      if (q.k === "poof") { q.vy += 0.5; q.x += q.vx; q.y += q.vy; q.rot += 0.25 * Math.sign(q.vx || 1); if (q.life > 34) { q.life = q.max; puff(q.x, q.y, 6); } continue; }
      if (q.k === "suckdot") { q.x += (q.tx - q.x) * 0.2; q.y += (q.ty - q.y) * 0.2; continue; }
      q.x += q.vx; q.y += q.vy;
      if (q.k === "dust") { q.vx *= 0.92; q.vy *= 0.92; }
      if (q.k === "star") { q.vy += 0.15; }
      if (q.k === "feather") { q.vy = Math.min(q.vy + 0.12, 1.2); q.vx *= 0.97; q.x += Math.sin(q.life * 0.15) * 0.8; q.rot += 0.05; }
    }
    parts = parts.filter(q => q.life < q.max);
  }

  // HUD: face badge + hearts (left), score with a cushion icon and best score (right), boss "stuffing" gauge.
  function drawHUD() {
    const actors = game.scene === "play" ? [P, ...enemies.filter(e => !(e.type === "bat" && ["hang", "wake", "rise", "enter"].includes(e.state))), ...(boss && boss.kind === "herald" ? [{ x: boss.x, y: boss.y - 90 }] : [])] : [];
    const under = (x0, x1) => actors.some(a => a && a.y < 230 && a.x > x0 && a.x < x1);
    game.hudFadeL = (game.hudFadeL ?? 1) + ((under(0, 340) ? 0.35 : 1) - (game.hudFadeL ?? 1)) * 0.15;
    game.hudFadeR = (game.hudFadeR ?? 1) + ((under(W - 300, W) ? 0.35 : 1) - (game.hudFadeR ?? 1)) * 0.15;
    game.hudFadeC = (game.hudFadeC ?? 1) + ((under(320, W - 280) ? 0.4 : 1) - (game.hudFadeC ?? 1)) * 0.15;
    ctx.save(); ctx.globalAlpha = game.hudFadeL;
    // badge plate
    ctx.save();
    ctx.fillStyle = "rgba(20,16,40,.55)"; roundRect(10, 10, 112 + game.maxHp * 40, 66, 33); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,240,214,.55)"; ctx.stroke();
    ctx.restore();
    if (fr("hud_face", 0)) drawSprite("hud_face", 0, 52, 70, { scale: 1.05 });
    for (let i = 0; i < game.maxHp; i++) {
      const full = i < game.hp, pop = (i === game.hp - 1 && game.heartPop) ? 1 + Math.sin(game.heartPop * 0.4) * 0.25 : 1;
      const lost = i === game.hp && game.heartHit ? 1 + game.heartHit * 0.03 : 1;
      const lowBeat = game.hp === 1 && i === 0 ? 1 + Math.max(0, Math.sin(game.t * 0.25)) * 0.18 : 1;
      if (fr("hud2", 0)) drawSprite("hud2", full ? 0 : 1, 108 + i * 40, 43, { center: true, scale: pop * lost * lowBeat });
    }
    ctx.restore();
    // score (cushion icon) and best
    ctx.save(); ctx.globalAlpha = game.hudFadeR;
    ctx.save(); ctx.fillStyle = "rgba(20,16,40,.55)"; roundRect(W - 268, 10, 258, 66, 33); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,240,214,.55)"; ctx.stroke(); ctx.restore();
    drawSprite("items", 3, W - 234, 44, { center: true, scale: 0.85 });
    text(String(game.score), W - 26, 50, { size: 26, color: "#fff", align: "right" });
    text(`BEST ${hiScore}`, W - 26, 70, { size: 11, color: "#ffd23a", align: "right" });
    ctx.restore();
    if (boss && (game.phase === "fight" || boss.state === "dying" || game.phase === "gameover")) { ctx.save(); ctx.globalAlpha = game.hudFadeC; drawBossBar(); ctx.restore(); }
  }
  // Boss gauge: sits in the HUD row between the two badges, same plate style. Portrait + name, red fill with a
  // white "damage lag" that drains after each hit, one notch per hit point, and a little shake when hit.
  function drawBossBar() {
    const b = boss, r = clamp(b.hp / b.maxHp, 0, 1);
    b.lagR = b.lagR == null ? r : b.lagR > r ? Math.max(r, b.lagR - 0.008) : r;
    const sh = b.hitFlash > 0 ? Math.sin(game.t * 2.5) * 3 : 0;
    const X = 336 + sh, Y = 10, Wd = 348, Hd = 66;
    ctx.save();
    ctx.fillStyle = "rgba(20,16,40,.55)"; roundRect(X, Y, Wd, Hd, 33); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,240,214,.55)"; ctx.stroke();
    // portrait: boss head clipped into a circle
    const px = X + 33, py = Y + 33;
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, 26, 0, Math.PI * 2); ctx.fillStyle = "#3a2a52"; ctx.fill(); ctx.clip();
    const [ps, pf, psc, pdy, pdx = 0] = b.portrait || ["boss", 0, 0.55, 92];
    drawSprite(ps, pf, px + 4 + pdx, py + pdy, { scale: psc, flash: b.hitFlash > 0 && b.hitFlash % 4 < 2 });
    ctx.restore();
    ctx.beginPath(); ctx.arc(px, py, 26, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = "#ffd23a"; ctx.stroke();
    // bar
    const bx = X + 70, by = Y + 34, bw = Wd - 90, bh = 20;
    ctx.fillStyle = "#1a1030"; roundRect(bx - 3, by - 3, bw + 6, bh + 6, 12); ctx.fill();
    if (b.lagR > r) { ctx.fillStyle = "#fff3e0"; roundRect(bx, by, bw * b.lagR, bh, 10); ctx.fill(); }
    if (r > 0) {
      const g = ctx.createLinearGradient(0, by, 0, by + bh);
      const low = r <= 0.5;
      g.addColorStop(0, low ? "#ffb36b" : "#ff8a7a"); g.addColorStop(0.5, low ? "#ff6a1f" : "#ff3d5a"); g.addColorStop(1, low ? "#c2410c" : "#b3123a");
      ctx.fillStyle = g; roundRect(bx, by, Math.max(bh, bw * r), bh, 10); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.4)"; roundRect(bx + 4, by + 3, Math.max(0, bw * r - 8), 5, 3); ctx.fill();
    }
    ctx.strokeStyle = "rgba(26,16,48,.6)"; ctx.lineWidth = 2;
    for (let i = 1; i < b.maxHp; i++) { const x = bx + bw * i / b.maxHp; ctx.beginPath(); ctx.moveTo(x, by + 2); ctx.lineTo(x, by + bh - 2); ctx.stroke(); }
    ctx.restore();
    text(b.name || "빅고블", bx, by - 6, { size: 20, font: KR, color: "#ffd23a", stroke: 6 });
    if (r <= 0.5 && b.hp > 0 && Math.floor(game.t / 20) % 2) text("ANGRY!", bx + bw, by - 6, { size: 12, color: "#ff5a4e", align: "right" });
  }

  function drawTip() { // one-line hint under the HUD for the first seconds of a stage that introduces a new rule
    const tp = game.tip; if (!tp || game.scene !== "play") return;
    tp.t++; if (tp.t > 360) { game.tip = null; return; }
    const a = clamp(Math.min(tp.t / 15, (360 - tp.t) / 30), 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `24px ${KR2}`;
    const w = ctx.measureText(tp.str).width + 60;
    ctx.fillStyle = "rgba(20,16,40,.78)"; roundRect(W / 2 - w / 2, 664, w, 46, 23); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,226,150,.8)"; ctx.stroke(); ctx.restore();
    text(tp.str, W / 2, 696, { size: 24, align: "center", font: KR2, color: "#fff6d8", alpha: a, stroke: 5 });
  }
  function drawBanner() {
    const b = game.banner; if (!b) return;
    b.t++;
    if (b.life && b.t > b.life) { game.banner = null; return; }
    const cy = H * 0.42;
    if (b.warn) {
      const a = 0.55 + Math.sin(b.t * 0.3) * 0.25;
      const bh = b.b ? 170 : 120;
      ctx.fillStyle = `rgba(200,20,40,${a * 0.55})`; ctx.fillRect(0, cy - 70, W, bh);
      ctx.save(); ctx.beginPath(); ctx.rect(0, cy - 70, W, bh); ctx.clip();
      ctx.fillStyle = "rgba(255,210,58,.85)";
      for (let x = -80 + (b.t * 4) % 60; x < W + 60; x += 60) { ctx.beginPath(); ctx.moveTo(x, cy - 70); ctx.lineTo(x + 30, cy - 70); ctx.lineTo(x + 10, cy - 58); ctx.lineTo(x - 20, cy - 58); ctx.fill();
        const yb = cy - 70 + bh; ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x + 30, yb); ctx.lineTo(x + 10, yb - 12); ctx.lineTo(x - 20, yb - 12); ctx.fill(); }
      ctx.restore();
    }
    if (!b.warn) {
      const bh = b.tally ? 220 : b.b ? 150 : 110, a = clamp(b.t / 8, 0, 1) * 0.5;
      const g = ctx.createLinearGradient(0, cy - 60, 0, cy - 60 + bh);
      g.addColorStop(0, "rgba(8,8,24,0)"); g.addColorStop(0.2, `rgba(8,8,24,${a})`); g.addColorStop(0.8, `rgba(8,8,24,${a})`); g.addColorStop(1, "rgba(8,8,24,0)");
      ctx.fillStyle = g; ctx.fillRect(0, cy - 60, W, bh);
    }
    const s = b.big ? 1 + Math.max(0, 0.6 - b.t * 0.05) : ease(b.t / 12);
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(s, s);
    text(b.a, 0, 0, { size: b.big ? 64 : 44, align: "center", color: b.warn ? "#fff" : "#ffd23a", grad: b.warn ? "red" : "gold", base: "middle", font: /[가-힣]/.test(b.a) ? KR : undefined, stroke: /[가-힣]/.test(b.a) ? 10 : undefined });
    if (b.b) text(b.b, 0, 62, { size: 34, align: "center", font: KR, color: "#fff", stroke: 9, base: "middle" });
    ctx.restore();
    if (b.tally) b.tally.forEach(([k, v], i) => {
      if (b.t < 40 + i * 20) return;
      text(k, W / 2 - 220, cy + 82 + i * 44, { size: 22, color: "#fff" });
      text(String(v), W / 2 + 220, cy + 82 + i * 44, { size: 22, align: "right", color: v ? "#7dff7a" : "#999" });
    });
  }

  function drawPlay() {
    drawBg(L.bg, L.dim ?? 0, L.bgScale || 1, platformLayer);
    items.forEach(drawItem);
    if (L.stamp && !L.stamp.got) drawStampPickup(L.stamp.x, L.stamp.y - 34 + Math.sin(game.t * 0.08) * 5);
    const bossOnTop = boss && ["stuck", "hurt", "dying", "down", "snag", "bare", "open", "opened"].includes(boss.state);
    if (!bossOnTop) drawBoss();
    enemies.forEach(e => e.state !== "pulled" && drawEnemy(e));
    if (L.carrier && !L.carrier.gone) drawCarrier(L.carrier.x, L.carrier.y, L.carrier.t);
    waves.forEach(drawWave);
    drawBeam();
    enemies.forEach(e => e.state === "pulled" && drawEnemy(e)); // caught thieves flail on top of the beam
    if (P.state !== "hurt") drawPlayer();
    balls.forEach(drawBall);
    shots.forEach(drawShot);
    if (P.state === "hurt") drawPlayer();
    if (bossOnTop) drawBoss();
    drawParts();
    drawHUD();
    drawTip();
    drawBanner();
    drawDialog();
    if (game.phase === "gameover") drawGameOver();
  }
  function drawCarrier(x, y, t) { drawSprite("goblin", 4 + (Math.floor(t / 6) % 2), x, y + 2); }

  // ---- Game over / continue ------------------------------------------------
  function startGameOver() {
    game.prevPhase = game.phase; game.phase = "gameover"; game.phaseT = 0; game.inputLock = true; Sound.stopMusic(); Sound.suck(false); Sound.jingle("gameover");
    P.state = "gone"; saveHi();
  }
  function drawGameOver() {
    const t = game.phaseT;
    ctx.fillStyle = `rgba(5,6,15,${Math.min(0.6, t / 40)})`; ctx.fillRect(0, 0, W, H);
    if (t > 20) text("한 번 더!", W / 2, H / 2 - 30, { size: 64, align: "center", font: KR, color: "#ffd23a", stroke: 12 });
    if (LINES.gameOver && t > 40) text(LINES.gameOver, W / 2, H / 2 + 40, { size: 28, align: "center", font: KR2, color: "#fff", stroke: 6 });
    if (t > 70 && Math.floor(game.t / 25) % 2) text(document.body.classList.contains("touch") ? "아무 버튼이나 눌러 다시 하기" : "PRESS START", W / 2, H / 2 + 120, { size: 22, align: "center", font: KR2, color: "#7ff0ff", stroke: 6 });
  }
  function updateGameOver() {
    game.phaseT++;
    if ((game.phaseT > 70 && anyPress()) || game.phaseT > 600) {
      if (game.wipe) return;
      Sound.sfx("start");
      if (boss && boss.hp > 0) { // boss fights continue where they were: the boss keeps the damage you dealt
        game.phase = "fight"; game.inputLock = false; game.hp = game.maxHp;
        Object.assign(P, makePlayer(), { inv: 180, x: W / 2 });
        shots = []; waves = []; stars(P.x, P.y - 60, 14); puff(P.x, P.y, 10);
        Sound.playMusic(boss.music || "boss");
        return;
      }
      game.score = L.startScore;
      wipeTo(() => startStage(game.stage));
    }
  }

  // ---- Title ---------------------------------------------------------------
  function startTitle() {
    game.scene = "title"; game.t0 = game.t; Sound.stopMusic(); game.menu = saved > 0 ? 1 : 0; game.titleWoke = 0; game.menuMoved = false;
    game.score = 0; game.hp = game.maxHp; game.nextLife = 30000; game.deaths = 0;
  }
  function updateTitle() {
    const allClear = saved >= LEVELS.length;
    const canContinue = saved > 0;
    if (canContinue && (pressed.left || pressed.right || pressed.up || pressed.down)) { game.menu = game.menu ? 0 : 1; game.menuMoved = true; Sound.sfx("blip"); }
    if (canContinue && game.tap && game.tap.y > H - 190 && game.tap.y < H - 90) game.menu = game.tap.x > W / 2 ? 1 : 0;
    if (pressed.start || pressed.jump || pressed.fire) {
      if (game.wipe) return;
      if (allClear && !game.titleWoke && !game.menuMoved) { game.titleWoke = game.t; Sound.sfx("blip"); return; } // the sleeping cat opens one eye first
      Sound.sfx("start");
      const from = canContinue && game.menu ? (allClear ? LEVELS.findIndex(l => l.chapter === LEVELS[LEVELS.length - 1].chapter) : saved) : 0;
      if (from === 0) { if (canContinue && !params.has("stage")) { wipeTo(() => { location.href = "intro.html?replay"; }); return; } wipeTo(() => startIntermission(0)); }
      else wipeTo(() => { game.deaths = 0; LEVELS[from].n === 1 ? playPanels(CHAPTERS[LEVELS[from].chapter].open, () => startIntermission(from)) : startIntermission(from); });
    }
    game.tap = null;
  }
  function drawTitle() {
    const tt = game.t - game.t0;
    const im = saved >= LEVELS.length && BG.title_clear && BG.title_clear.naturalWidth ? BG.title_clear : BG.title;
    if (im && im.naturalWidth) {
      const z = 1.04 + Math.sin(tt * 0.004) * 0.02;
      ctx.save(); ctx.imageSmoothingQuality = "low"; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -H / 2, W, H); ctx.restore();
    }
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(5,6,15,.35)"); g.addColorStop(0.45, "rgba(5,6,15,0)"); g.addColorStop(1, "rgba(5,6,15,.55)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const drop = ease(tt / 40);
    ctx.save(); ctx.translate(W / 2, 40 + 120 * drop);
    text("A CUSHION RESCUE STORY", 0, -66, { size: 14, align: "center", alpha: clamp((tt - 30) / 20, 0, 1) });
    ctx.font = `120px ${KR}`;
    const w1 = ctx.measureText("내 쿠션 ").width, w2 = ctx.measureText("내놔!").width, x0 = -(w1 + w2) / 2;
    text("내 쿠션 ", x0, 40, { size: 120, font: KR, color: "#ffd23a", stroke: 14, sh: 10, shadowColor: "#e8590c" });
    text("내놔!", x0 + w1, 40, { size: 120, font: KR, color: "#ff5a4e", stroke: 14, sh: 10, shadowColor: "#8f1020" });
    ctx.restore();
    if (tt > 50) {
      const ch = LEVELS[Math.min(saved, LEVELS.length - 1)].chapter;
      text(`CHAPTER ${ch} · ${CHAPTERS[ch].title}`, W / 2, 238, { size: 26, align: "center", font: KR, color: "#7ff0ff", stroke: 7 });
    }
    const allClear = saved >= LEVELS.length, canContinue = saved > 0;
    if (allClear && tt > 50) text(`ALL CLEAR! · 반송 도장 ${stampCount()} / 5`, W / 2, 274, { size: 22, align: "center", font: KR, color: "#ff9de2", stroke: 6 });
    if (canContinue && tt > 70) {
      const lastCh = LEVELS[LEVELS.length - 1].chapter;
      const opts = ["처음부터", allClear ? `${lastCh}장 다시` : `이어하기 ${stageLabel(saved)}`];
      opts.forEach((o, i) => { const on = (game.menu || 0) === i, x = W / 2 + (i ? 150 : -150);
        ctx.save(); ctx.fillStyle = on ? "rgba(20,14,48,.88)" : "rgba(20,14,48,.6)"; roundRect(x - 124, H - 164, 248, 56, 28); ctx.fill();
        ctx.lineWidth = on ? 4 : 2; ctx.strokeStyle = on ? "#ffd23a" : "rgba(207,211,255,.5)"; ctx.stroke(); ctx.restore();
        text((on && Math.floor(tt / 20) % 2 ? "▶ " : "  ") + o, x, H - 126, { size: 28, align: "center", font: KR, color: on ? "#ffd23a" : "#cfd3ff", stroke: 7 }); });
    } else if (tt > 70 && Math.floor(tt / 28) % 2) text("PRESS START", W / 2, H - 120, { size: 24, align: "center", stroke: 8 });
    const touchUI = document.body.classList.contains("touch");
    text(touchUI ? "다이얼: 이동   파랑: 점프   보라: 슬라이딩   빨강 꾹: 흡입 / 탭: 발사"
                 : "←→ 이동   Z 점프   C 슬라이딩   X 꾹: 흡입 · X 톡: 발사   ↓+Z 내려가기   P 일시정지", W / 2, H - 60, { size: 20, align: "center", font: KR2, color: "#e9e4ff", sh: 2 });
    text(`HI ${String(hiScore).padStart(7, "0")}`, W / 2, H - 24, { size: 12, align: "center", color: "#ff9de2" });
    if (allClear && game.titleWoke && game.t - game.titleWoke < 120) { ctx.save(); ctx.globalAlpha = clamp((120 - (game.t - game.titleWoke)) / 20, 0, 1); speechBubble("…응?", W * 0.42, H * 0.5, game.t - game.titleWoke); ctx.restore(); }
  }

  // ---- Intermission: the thief runs off with the cushion -------------------
  // who carries the cushion across each chapter's intermission
  const CARRIER = { 1: { s: "goblin", f: [4, 5] }, 2: { s: "herald", f: [0, 1], fly: true, flip: true }, 3: { s: "wetcoon", f: [0, 1, 2, 1], cushion: 120 },
    4: { s: "taggob", f: [0, 1, 2, 1], cushion: 120 }, 5: { s: "bat", f: [1], fly: true, cushion: -5 }, 6: { s: "guard", f: [0, 1, 2, 1], cushion: 118 } };
  function startIntermission(i) {
    game.scene = "inter"; game.interStage = i; game.interT = 0; Sound.stopMusic();
    if (i === 0) { game.deaths = 0; game.bossSeen = {}; }
    game.deathsAtStart = game.deaths;
    parts = [];
  }
  function updateInter() {
    const t = ++game.interT;
    if (t === 20) Sound.jingle("ready");
    if (t > 40 && t % 7 === 0 && t < 230) puff(-60 + (t - 40) * 5.6 - 30, 648, 1);
    updateParts();
    if ((t > 270 || (t > 50 && anyPress())) && !game.wipe) wipeTo(() => startStage(game.interStage));
  }
  function drawInter() {
    const i = game.interStage, lv = LEVELS[i], t = game.interT;
    drawBg(lv.bg, 0.45, lv.bgScale || 1);
    const gs = ctx.createLinearGradient(0, 470, 0, 700); gs.addColorStop(0, "rgba(5,6,15,0)"); gs.addColorStop(0.5, "rgba(5,6,15,.5)"); gs.addColorStop(1, "rgba(5,6,15,.2)");
    ctx.fillStyle = gs; ctx.fillRect(0, 470, W, 250);
    const gx = -60 + (t - 40) * 5.6, cx = -60 + (t - 90) * 5.2;
    if (lv.dog) drawSprite("dog", cx > 700 ? 1 : 0, 830, 654, {}); // the neighbour puppy whose blanket was taken
    if (t > 40) {
      const cr = CARRIER[lv.chapter] || CARRIER[1], fy = cr.fly ? 590 + Math.sin(t * 0.12) * 14 : 652;
      drawSprite(cr.s, cr.f[Math.floor(t / 5) % cr.f.length], gx, fy, { flip: !!cr.flip });
      if (cr.cushion) drawSprite("cushion", 2, gx, fy - cr.cushion + Math.sin(t * 0.4) * 3, { center: true, scale: 0.8, rot: Math.sin(t * 0.2) * 0.1 });
    }
    if (t > 90) {
      drawSprite("cat_a", 1 + Math.floor(t / 4) % 4, cx, 654 - Math.abs(Math.sin(t * 0.4)) * 5, { rot: Math.sin(t * 0.4) * 0.05 });
    }
    const il = ((LINES.intermission || [])[i] || {}).lines || [{ who: "냥이", text: "…거기 서." }];
    const at = l => l.who === "냥이" ? [cx, 502] : l.who === "멍멍이" ? [830, 520] : [gx, (CARRIER[lv.chapter] || {}).fly ? 420 : 470];
    ctx.save();
    il.slice(0, 2).forEach((l, k) => { // first line 55–150, second 130–250, each over its speaker
      const t0 = k ? 130 : 55, t1 = k ? 250 : 150, [bx, by] = at(l);
      if (t > t0 && t < t1 && bx > -40 && bx < W + 40) { ctx.globalAlpha = clamp(Math.min((t - t0) / 6, (t1 - t) / 10), 0, 1); speechBubble(l.text, bx, by, t - t0); }
    });
    if (lv.dog && t > 20 && t < 120) { ctx.globalAlpha = clamp(Math.min((t - 20) / 6, (120 - t) / 10), 0, 1); speechBubble("…내 담요.", 830, 540, t - 20); }
    ctx.restore();
    drawParts();
    const s = ease((t - 6) / 18);
    ctx.save(); ctx.globalAlpha = clamp(t / 12, 0, 1); ctx.translate(W / 2, 220); ctx.scale(s, s);
    if (lv.n === 1) text(`CHAPTER ${lv.chapter} · ${CHAPTERS[lv.chapter].title}`, 0, -110, { size: 30, align: "center", font: KR, color: "#7ff0ff", stroke: 8 });
    text(lv.boss ? "BOSS STAGE" : `STAGE ${stageLabel(i)}`, 0, -20, { size: 52, align: "center", color: "#ffd23a", stroke: 12, sh: 6, shadowColor: "#e8590c" });
    text(lv.name, 0, 56, { size: 48, align: "center", font: KR, stroke: 10 });
    text(lv.en, 0, 104, { size: 16, align: "center", color: "#cfd3ff" });
    ctx.restore();
  }

  // ---- Ending cutscene -----------------------------------------------------
  const toLines = arr => (arr || []).map(l => ({ who: l.who || undefined, text: l.text, narr: !l.who }));
  const endLines = (i, fallback) => toLines(((LINES.ending || [])[i] || {}).lines || fallback);
  // chapter metadata + painted panels (camera move + overlay particles from cutfx.js)
  const CHAPTERS = {
    1: { title: "성 아랫마을", en: "CASTLE TOWN", next: "폭신 정원",
      end: [
        { img: "end1", top: true, cam: [1.12, 1.0, 20, -10], lines: endLines(0, [{ who: "냥이", text: "…드디어. 내 쿠션." }]),
          fx: { fx: [{ type: "glow", x: .535, y: .16, r: .18 }, { type: "feathers", n: 18 }, { type: "sparkles", n: 10, x0: .45, y0: .02, w: .3, h: .3 }] } },
        { img: "end2", cam: [1.0, 1.12, -10, 10], flash: true, lines: endLines(1, [{ who: "냥이", text: "…귀찮아." }]),
          fx: { fx: [{ type: "glow", x: .23, y: .16, r: .16, color: "rgba(220,235,255,.45)", speed: .03 }, { type: "sparkles", n: 16, x0: 0, y0: 0, w: 1, h: .45 }] } } ] },
    2: { title: "폭신 정원", en: "FLUFFY GARDEN", next: "뽀송 세탁소",
      open: [ { img: "c2_open", top: true, cam: [1.0, 1.1, 0, 12], lines: toLines((LINES.ch2 || {}).open),
          fx: { fx: [{ type: "sparkles", n: 14, x0: .1, y0: 0, w: .8, h: .5 }, { type: "feathers", n: 10 }] } } ],
      end: [ { img: "c2_end", cam: [1.1, 1.0, -12, 0], lines: toLines((LINES.ch2 || {}).end),
          fx: { fx: [{ type: "orbit", x: .3, y: .55, r: .05, n: 3 }, { type: "sparkles", n: 10, x0: .5, y0: .3, w: .4, h: .4 }] } } ] },
    3: { title: "뽀송 세탁소", en: "STEAMY LAUNDRY", next: "금딱 보물창고",
      open: [ { img: "c3_open", top: true, cam: [1.0, 1.1, 0, 60], lines: toLines((LINES.ch3 || {}).open),
          fx: { fx: [{ type: "bubble", x: .2, y: .7 }, { type: "bubble", x: .8, y: .6 }, { type: "motes", n: 18, x0: 0, y0: .1, w: 1, h: .8 }] } } ],
      after: { memory: [ { img: "c3_memory", cam: [1.04, 1.12, 0, 0], tempo: 0.6, lines: toLines((LINES.ch3 || {}).memory),
          fx: { fx: [{ type: "glow", x: .5, y: .45, r: .3, color: "rgba(255,220,160,.35)", speed: .03 }, { type: "motes", n: 14, x0: .1, y0: .1, w: .8, h: .8 }] } } ] },
      end: [ { img: "c3_end", cam: [1.1, 1.0, -12, 0], lines: toLines((LINES.ch3 || {}).end),
          fx: { fx: [{ type: "bubble", x: .3, y: .7 }, { type: "sparkles", n: 12, x0: .55, y0: .1, w: .4, h: .5 }] } } ] },
    4: { title: "금딱 보물창고", en: "GOLDEN VAULT", next: "별빛 침실탑",
      open: [ { img: "c4_open", cam: [1.0, 1.1, 10, 8], lines: toLines((LINES.ch4 || {}).open),
          fx: { fx: [{ type: "sparkles", n: 22, x0: 0, y0: 0, w: 1, h: .7 }, { type: "glow", x: .5, y: .4, r: .2, color: "rgba(255,220,120,.3)" }] } } ],
      end: [ { img: "c4_end", cam: [1.1, 1.0, 0, -10], lines: toLines((LINES.ch4 || {}).end),
          fx: { fx: [{ type: "sparkles", n: 18, x0: .4, y0: 0, w: .6, h: .6 }, { type: "orbit", x: .3, y: .6, r: .05, n: 3 }] } } ] },
    5: { title: "별빛 침실탑", en: "STARLIGHT TOWER", next: "쿠션 왕좌",
      open: [ { img: "c5_open", top: true, cam: [1.0, 1.1, 0, 10], lines: toLines((LINES.ch5 || {}).open),
          fx: { fx: [{ type: "sparkles", n: 26, x0: 0, y0: 0, w: 1, h: .5 }, { type: "zzz", x: .25, y: .55 }] } } ],
      after: { choice: [ { img: "c5_choice", top: true, cam: [1.0, 1.08, 0, 0], tempo: 0.6, lines: toLines((LINES.ch5 || {}).choice),
          fx: { fx: [{ type: "motes", n: 16, x0: 0, y0: 0, w: 1, h: .7 }, { type: "glow", x: .7, y: .2, r: .2, color: "rgba(200,220,255,.3)", speed: .02 }] } } ] },
      end: [ { img: "c5_end", cam: [1.08, 1.0, 0, 10], lines: toLines((LINES.ch5 || {}).end),
          fx: { fx: [{ type: "zzz", x: .3, y: .5 }, { type: "rays", x: .8, y: .3 }, { type: "sparkles", n: 10, x0: .5, y0: 0, w: .5, h: .4 }] } } ] },
    6: { title: "쿠션 왕좌", en: "THE CUSHION THRONE", next: "",
      open: [ { img: "c6_open", box: "right", cam: [1.12, 1.0, 0, 30], lines: toLines((LINES.ch6 || {}).open),
          fx: { fx: [{ type: "feathers", n: 14 }, { type: "rays", x: .5, y: .1 }] } } ],
      end: ["end_a", "end_b", "end_c", "end_d", "end_e"].map((img, i) => ({ img, music: "town", tempo: 0.7, top: true,
        cam: [[1.0, 1.1, 0, 10], [1.08, 1.0, -10, 0], [1.0, 1.08, 0, 0], [1.0, 1.06, 10, 0], [1.0, 1.12, 0, 0]][i],
        lines: toLines(((LINES.finale || [])[i] || {}).lines || [{ text: "…" }]),
        fx: { fx: [[{ type: "feathers", n: 20 }, { type: "sparkles", n: 10, x0: .3, y0: .2, w: .4, h: .4 }], [{ type: "rays", x: .85, y: .2 }, { type: "zzz", x: .45, y: .5 }],
          [{ type: "zzz", x: .5, y: .55 }, { type: "motes", n: 12, x0: 0, y0: 0, w: 1, h: .6 }], [{ type: "motes", n: 14, x0: .2, y0: .1, w: .6, h: .6 }], [{ type: "glow", x: .5, y: .5, r: .25, color: "rgba(255,230,170,.3)", speed: .02 }]][i] } })),
      epilogue: [ { img: "epilogue", top: true, music: "town", tempo: 0.7, cam: [1.0, 1.08, 0, 0], lines: toLines((LINES.epilogue || {}).lines),
          fx: { fx: [{ type: "zzz", x: .45, y: .45 }, { type: "motes", n: 12, x0: 0, y0: 0, w: 1, h: .6 }] } } ] },
  };
  const allPanels = c => [...(c.open || []), ...(c.end || []), ...Object.values(c.after || {}).flat(), ...(c.epilogue || [])];
  for (const c of Object.values(CHAPTERS)) for (const p of allPanels(c)) p.anim = window.CutFX && BG[p.img] ? CutFX.create(BG[p.img], p.fx) : null;
  const stampCount = () => [2, 3, 4, 5, 6].filter(c => stamps[c]).length;
  let CUT = null; // { panels, i, done }
  function playPanels(panels, done) {
    if (!panels || !panels.length) return done();
    game.scene = "ending"; game.endT = 0; CUT = { panels, i: 0, done };
    Sound.stopMusic(); Sound.playMusic(panels[0].music || "town"); Sound.setTempo(panels[0].tempo || 0.8);
    game.dialog = makeDialog(panels[0].lines.length ? panels[0].lines : [{ text: "…" , narr: true }], nextPanel);
  }
  function nextPanel() {
    CUT.i++; game.endT = 0;
    if (CUT.i < CUT.panels.length) {
      if (CUT.panels[CUT.i].flash) { game.flash = 12; Sound.sfx("shoot"); }
      game.dialog = makeDialog(CUT.panels[CUT.i].lines, nextPanel);
    } else { game.dialog = null; const d = CUT.done; wipeTo(d); }
  }
  function chapterEnd(stage) {
    const ch = LEVELS[stage].chapter, next = stage + 1;
    const end = CHAPTERS[ch].end.concat(next >= LEVELS.length && stampCount() >= 5 ? CHAPTERS[ch].epilogue || [] : []);
    playPanels(end, () => {
      if (next >= LEVELS.length) { game.cleared = true; try { localStorage.setItem("cushion-clear", "1"); } catch (_) {} return startFinal(); }
      const nch = LEVELS[next].chapter;
      playPanels(CHAPTERS[nch].open, () => startIntermission(next));
    });
  }
  function startEnding() { chapterEnd(LEVELS.findIndex(l => l.chapter === 1 && l.boss)); }
  function drawEnding() {
    if (!CUT) return;
    const p = CUT.panels[Math.min(CUT.i, CUT.panels.length - 1)], im = BG[p.img], k = clamp(game.endT / 600, 0, 1);
    const [z0, z1, dx, dy] = p.cam, z = z0 + (z1 - z0) * k;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    if (im && im.naturalWidth) {
      ctx.save(); ctx.imageSmoothingQuality = "low"; ctx.translate(W / 2 + dx * k, H / 2 + dy * k); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(im, 0, 0, W, H);
      if (p.anim) p.anim.draw(ctx, W, H, game.endT);
      ctx.restore();
    }
    const d = game.dialog;
    if (d && d.lines[d.i].narr) { // same footprint as the speech box, quieter styling
      const line = d.lines[d.i];
      const by = p.top ? 30 : H - 170, bx = p.box === "right" ? W - 600 : 40, bw = p.box === "right" ? 560 : W - 80;
      ctx.fillStyle = "rgba(5,6,20,.8)"; roundRect(bx, by, bw, 128, 14); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,246,214,.35)"; ctx.stroke();
      text([...line.text].slice(0, d.n).join(""), bx + bw / 2, by + 76, { size: p.box === "right" ? 28 : 32, align: "center", font: KR2, live: true });
    } else drawDialog();
  }
  function startFinal() { game.scene = "final"; game.finalT = 0; saveHi(); Sound.stopMusic(); Sound.jingle("chapter"); }
  function drawFinal() {
    const t = game.finalT, lastCh = LEVELS[LEVELS.length - 1].chapter;
    if (lastCh === 6) return drawTheEnd(t);
    drawBg(`bg${lastCh}_5` in BG ? `bg${lastCh}_5` : "bg4", 0.62);
    const s = ease(t / 24);
    ctx.save(); ctx.translate(W / 2, 200); ctx.scale(s, s);
    text(`CHAPTER ${lastCh} CLEAR!`, 0, 0, { size: 46, align: "center", color: "#ffd23a", stroke: 12, sh: 6, shadowColor: "#e8590c" });
    ctx.restore();
    if (t > 30) text(CHAPTERS[lastCh].title, W / 2, 260, { size: 36, align: "center", font: KR, stroke: 8 });
    if (t > 60) { text("SCORE", W / 2 - 160, 350, { size: 22 }); text(String(game.score).padStart(7, "0"), W / 2 + 160, 350, { size: 22, align: "right", color: "#7dff7a" }); }
    if (t > 80) { text("HI", W / 2 - 160, 394, { size: 22, color: "#ff9de2" }); text(String(hiScore).padStart(7, "0"), W / 2 + 160, 394, { size: 22, align: "right" }); }
    if (t > 110) { text("TO BE CONTINUED…", W / 2, 480, { size: 22, align: "center", color: "#7ff0ff" });
      text(`CHAPTER ${lastCh + 1} · ${CHAPTERS[lastCh].next}`, W / 2, 524, { size: 30, align: "center", font: KR, color: "#cfd3ff", stroke: 6 }); }
    if (t > 160 && Math.floor(t / 28) % 2) text("PRESS START", W / 2, H - 80, { size: 20, align: "center" });
    if (t > 40) drawSprite("cat_c", t < 140 ? 0 : t < 260 ? 1 : 3, 150, 690 - (t < 140 ? Math.abs(Math.sin(t * 0.12)) * 30 : 0), { scale: 1.1 });
  }

  function drawTheEnd(t) {
    const im = BG.title_clear || BG.end_e;
    if (im && im.naturalWidth) { ctx.save(); ctx.imageSmoothingQuality = "low"; const z = 1.02 + t * 0.00008; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -H / 2, W, H); ctx.restore(); }
    ctx.fillStyle = `rgba(5,6,15,${clamp(t / 60, 0, 0.45)})`; ctx.fillRect(0, 0, W, H);
    const s = ease(t / 30);
    ctx.save(); ctx.translate(W / 2, 96); ctx.scale(s, s);
    text("THE END", 0, 0, { size: 64, align: "center", color: "#ffd23a", stroke: 14, sh: 8, shadowColor: "#e8590c" });
    ctx.restore();
    if (t > 50) text("오늘도, 내 쿠션에서.", W / 2, 160, { size: 38, align: "center", font: KR, stroke: 9 });
    if (t > 90) { text("SCORE", W / 2 - 170, 214, { size: 22 }); text(String(game.score).padStart(7, "0"), W / 2 + 170, 214, { size: 22, align: "right", color: "#7dff7a" }); }
    if (t > 110) { text("HI", W / 2 - 170, 250, { size: 22, color: "#ff9de2" }); text(String(hiScore).padStart(7, "0"), W / 2 + 170, 250, { size: 22, align: "right" }); }
    if (t > 130) { const n = stampCount(); text(`반송 도장 ${n} / 5`, W / 2, 302, { size: 28, align: "center", font: KR, color: n >= 5 ? "#ff9de2" : "#cfd3ff", stroke: 7 });
      if (n < 5) text("도장을 모두 모으면… 그 뒷이야기가?", W / 2, 340, { size: 22, align: "center", font: KR2, color: "#e9e4ff", stroke: 5 }); }
    if (t > 180 && Math.floor(t / 28) % 2) text("PRESS START", W / 2, H - 60, { size: 20, align: "center" });
  }

  // ---- Transitions ---------------------------------------------------------
  function wipeTo(fn) { if (game.wipe) return; game.wipe = { t: 0, dur: 26, fn, phase: "close" }; }
  function updateWipe() {
    const w = game.wipe; if (!w) return;
    w.t++;
    if (w.phase === "close" && w.t >= w.dur) { w.fn && w.fn(); w.phase = "open"; w.t = 0; }
    else if (w.phase === "open" && w.t >= w.dur) game.wipe = null;
  }
  function drawWipe() {
    const w = game.wipe; if (!w) return;
    const k = w.phase === "close" ? 1 - ease(w.t / w.dur) : ease(w.t / w.dur);
    const cx = P && game.scene === "play" ? P.x : W / 2, cy = P && game.scene === "play" ? P.y - 40 : H / 2;
    const R = Math.hypot(W, H) * k;
    ctx.save(); ctx.fillStyle = "#05060f"; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2, true); ctx.fill("evenodd"); ctx.restore();
  }

  // ---- Main loop -----------------------------------------------------------
  function update() {
    game.t++;
    if (pressed.mute) Sound.toggleMute();
    if (game.scene === "play" && pressed.pause && !game.wipe && game.phase !== "gameover") { game.paused = !game.paused; Sound.suck(false); Sound.setPaused(game.paused); }
    if (game.paused) { for (const k in pressed) pressed[k] = false; return; }
    updateWipe();
    if (game.dialog) updateDialog();
    switch (game.scene) {
      case "title": updateTitle(); break;
      case "inter": updateInter(); break;
      case "play":
        if (game.phase === "gameover") { updateGameOver(); updateParts(); break; }
        if (game.slow > 0 && game.t % 3) { updateParts(); break; }
        if (!game.dialog || game.phase !== "bossIntro") updatePlay(); else { game.phaseT++; updatePlayerIdle(); }
        updateParts();
        break;
      case "ending": game.endT++; if (pressed.skip && !game.wipe && CUT) { game.dialog = null; CUT.i = CUT.panels.length; wipeTo(CUT.done); } break;
      case "final": game.finalT++; if (game.finalT > 160 && pressed.start && !game.wipe) wipeTo(startTitle); break;
    }
    if (game.shake > 0) game.shake *= 0.86, game.shake < 0.3 && (game.shake = 0);
    if (game.heartPop > 0) game.heartPop--;
    if (game.heartHit > 0) game.heartHit--;
    if (game.flash > 0) game.flash--;
    for (const k in pressed) pressed[k] = false;
  }
  function updatePlayerIdle() { if (boss) updateBoss(); }

  function draw() {
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.fillStyle = "#05060f"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (game.shake) ctx.translate(rand(-game.shake, game.shake), rand(-game.shake, game.shake));
    switch (game.scene) {
      case "boot": text("LOADING…", W / 2, H / 2, { size: 20, align: "center" }); break;
      case "title": drawTitle(); break;
      case "inter": drawInter(); break;
      case "play": drawPlay(); break;
      case "ending": drawEnding(); break;
      case "final": drawFinal(); break;
    }
    ctx.restore();
    if (game.flash) { ctx.fillStyle = `rgba(255,255,255,${game.flash / 14})`; ctx.fillRect(0, 0, W, H); }
    drawWipe();
    if (game.paused) {
      ctx.fillStyle = "rgba(5,6,15,.6)"; ctx.fillRect(0, 0, W, H);
      text("PAUSE", W / 2, H / 2, { size: 40, align: "center", color: "#ffd23a", stroke: 8 });
      text(document.body.classList.contains("touch") ? "II 버튼: 계속하기" : "P: 계속하기", W / 2, H / 2 + 50, { size: 24, align: "center", font: KR2 });
    }
    if (Sound.muted) text("MUTE", W - 16, H - 14, { size: 10, align: "right", color: "#8d93c9" });
  }

  // frame timing (shown with ?fps, read by QA through __game.perf)
  const perf = { upd: 0, drw: 0, fps: 60, frames: 0, _n: 0, _t0: 0 };
  const SHOW_FPS = params.has("fps");
  let last = 0, acc = 0;
  function frame(now) {
    if (!last) last = now, perf._t0 = now;
    acc += Math.min(100, now - last); last = now;
    const step = 1000 / 60;
    const t0 = performance.now();
    while (acc >= step) { for (let i = 0; i < SPEED; i++) update(); acc -= step; }
    const t1 = performance.now();
    draw();
    const t2 = performance.now();
    perf.upd = perf.upd * 0.95 + (t1 - t0) * 0.05; perf.drw = perf.drw * 0.95 + (t2 - t1) * 0.05;
    perf.frames++; perf._n++;
    if (now - perf._t0 >= 1000) { perf.fps = perf._n * 1000 / (now - perf._t0); perf._n = 0; perf._t0 = now; }
    if (SHOW_FPS) {
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(W - 230, H - 30, 230, 30);
      ctx.fillStyle = "#7dff7a"; ctx.font = "14px monospace";
      ctx.fillText(`${perf.fps.toFixed(0)}fps u${perf.upd.toFixed(1)} d${perf.drw.toFixed(1)}ms p${parts.length}`, W - 222, H - 10);
    }
    requestAnimationFrame(frame);
  }

  // ---- Boot ----------------------------------------------------------------
  Promise.all([Promise.all(loads), document.fonts ? document.fonts.ready : 0, new Promise(r => setTimeout(r, 1500)).then(() => 0)].slice(0, 2)).then(() => {
    const st = params.get("stage");
    if (st != null) { game.deathsAtStart = 0; startStage(clamp(+st - 1, 0, LEVELS.length - 1)); }
    else if (params.has("chapter")) { // direct chapter entry (chapter select page): the chapter's opening panels, then its first stage
      const c = clamp(+params.get("chapter") || 1, 1, 6), from = LEVELS.findIndex(l => l.chapter === c);
      startTitle(); game.deaths = 0; game.bossSeen = {};
      if (from <= 0) startIntermission(0); else playPanels(CHAPTERS[c].open, () => startIntermission(from));
    }
    else if (params.has("ending")) startEnding();
    else if (params.has("new")) { startTitle(); startIntermission(0); }
    else startTitle();
  });
  requestAnimationFrame(frame);

  // test / QA hooks
  window.__game = {
    game, perf, get parts() { return parts; }, get shots() { return shots; }, get P() { return P; }, get enemies() { return enemies; }, get boss() { return boss; }, get balls() { return balls; }, get items() { return items; },
    startStage, startEnding, startTitle, startIntermission,
    panels(ch, part = "open") { const c = CHAPTERS[ch]; playPanels(part === "open" || part === "end" || part === "epilogue" ? c[part] : c.after[part], startTitle); },
    killAll() { enemies.forEach(e => { e.gone = true; }); L && L.spawnQ.forEach(s => s.done = true); },
    damageBoss(n = 1) { // debug/QA: lands n "fair" hits, opening each boss's defence first
      for (let i = 0; i < n && boss && boss.hp > 0; i++) {
        if (boss.kind === "king" && boss.phase === 1) { const s = boss.sup.find(q => q.hp > 0); if (s) boss.ballHook({ x: s.x, y: FLOOR_Y, power: 1 }); continue; }
        if (boss.kind === "appraiser") boss.open = boss.open || 200;
        if (boss.kind === "knight" && boss.state !== "open") boss.hit({ vx: 1, power: 1, hits: 0, type: "cloud" });
        if (boss.kind === "king" && boss.state !== "snag") { boss.state = "snag"; boss.t = 0; }
        boss.hit({ vx: 1, power: 1, hits: 0, type: "water" });
      } },
  };
})();
