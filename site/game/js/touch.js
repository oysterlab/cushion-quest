// Touch controls for phones / foldables.
//  * layout is picked from the screen shape: side gutters (phone landscape) or a control deck under the game
//    (portrait, foldables like Galaxy Z Fold) — whichever leaves the game bigger; tiny screens fall back to an overlay.
//  * left: floating jog dial (left/right; pull down & hold = drop through the ledge)
//  * right: JUMP (tap short / hold high) and the big VACUUM button (hold = suck, tap = fire when loaded)
//  * the vacuum button mirrors the tank: ammo pips around the rim, orange→red when a thief is about to escape
//  * haptics on capture / fire / hit (Android; iOS Safari has no web vibration)
// Input is fed to the game as the same keyboard events it already understands.
(() => {
  const params = new URLSearchParams(location.search);
  const coarse = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  if (!coarse && !params.has("touch")) return;

  const ESCAPE_WARN = 240, ESCAPE_T = 360; // keep in sync with game.js
  const NO_ESCAPE = ["pillow", "paper", "water"]; // ammo that never escapes the tank (captured thieves, incl. "cloud" sheep, do)
  const canEscape = it => !NO_ESCAPE.includes(it.type);
  const key = (code, down) => dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, key: code, bubbles: true }));
  const held = {};
  const hold = (code, on) => { if (!!held[code] === on) return; held[code] = on; key(code, on); };
  const tap = code => { hold(code, false); hold(code, true); setTimeout(() => hold(code, false), 50); };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (_) {} };

  // ---- DOM ------------------------------------------------------------------
  const css = document.createElement("style");
  css.textContent = `
  * { -webkit-tap-highlight-color: transparent; }
  html, body { touch-action: none; overscroll-behavior: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  body.touch { display: block; }
  body.touch #game { position: absolute; margin: 0; box-shadow: none; }
  .tc { position: absolute; z-index: 5; }
  .tc-zone { position: absolute; }

  /* ---- arcade control panel (bottom deck) ---- */
  .tc-deck { position: absolute; overflow: hidden;
    background: repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 2px, transparent 2px 9px), linear-gradient(180deg, #1d2270 0%, #121650 45%, #0b0d2a 100%);
    border-top: 4px solid #0b0d1f; box-shadow: inset 0 3px 0 #e8b23a, inset 0 6px 0 #8a5a12, inset 0 14px 18px rgba(0,0,0,.45); }
  .tc-deck i { position: absolute; width: 10px; height: 10px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ffe9a8, #b07a1a 60%, #4a2f06); box-shadow: 0 1px 0 #000; }

  /* ---- jog: recessed well with a groove + cherry ball-top lever ---- */
  .tc-jog-base { position: absolute; width: 150px; height: 150px; margin: -75px 0 0 -75px; border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle at 50% 40%, #232868 0 52%, #161a4a 60%, #0d1033 70%);
    box-shadow: 0 0 0 4px #0b0d1f, 0 0 0 7px #d9a12e, 0 0 0 10px #0b0d1f, inset 0 8px 16px rgba(0,0,0,.6), 0 8px 14px rgba(0,0,0,.45);
    transition: opacity .15s; }
  .tc-jog-base.idle { opacity: .72; }
  .tc-groove { position: absolute; left: 22px; right: 22px; top: 50%; height: 22px; margin-top: -11px; border-radius: 11px;
    background: linear-gradient(#05061a, #1a1f55); box-shadow: inset 0 3px 5px rgba(0,0,0,.8), 0 1px 0 rgba(255,255,255,.12); }
  .tc-chev { position: absolute; top: 50%; width: 0; height: 0; margin-top: -10px; border: 10px solid transparent; opacity: .5; transition: opacity .08s, filter .08s; }
  .tc-chev.l { left: 2px; border-right: 14px solid #ffd23a; border-left: 0; }
  .tc-chev.r { right: 2px; border-left: 14px solid #ffd23a; border-right: 0; }
  .tc-chev.d { top: auto; bottom: 6px; left: 50%; margin: 0 0 0 -9px; border: 9px solid transparent; border-top: 12px solid #7ff0ff; border-bottom: 0; }
  .tc-chev.on { opacity: 1; filter: drop-shadow(0 0 6px currentColor) drop-shadow(0 0 4px #fff3b0); }
  .tc-jog-shaft { position: absolute; width: 18px; margin-left: -9px; border-radius: 9px; pointer-events: none; transform-origin: 50% 100%;
    background: linear-gradient(90deg, #6b6f86, #e8ebf5 45%, #8a8ea6); box-shadow: 0 0 0 3px #0b0d1f; }
  .tc-jog-knob { position: absolute; width: 66px; height: 66px; margin: -33px 0 0 -33px; border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle at 34% 28%, #fff 0 7%, #ffb3bd 13%, #ff3f5e 38%, #c3112f 72%, #6d0718 100%);
    box-shadow: 0 0 0 4px #0b0d1f, 0 10px 14px rgba(0,0,0,.5), inset -6px -8px 12px rgba(80,0,20,.55); }

  /* ---- arcade push buttons: metal bezel + plastic cap with real travel ---- */
  .tc-btn { position: absolute; border-radius: 50%;
    background: radial-gradient(circle at 50% 35%, #3b4183 0%, #1a1e55 62%, #0b0d2a 100%);
    box-shadow: 0 0 0 4px #0b0d1f, 0 0 0 7px #d9a12e, 0 0 0 10px #0b0d1f, 0 10px 16px rgba(0,0,0,.5); }
  .tc-cap { position: absolute; inset: 11%; border-radius: 50%; display: grid; place-items: center;
    box-shadow: 0 0 0 4px #0b0d1f, 0 9px 0 0 var(--skirt), 0 9px 0 4px #0b0d1f, 0 14px 10px rgba(0,0,0,.5);
    transform: translateY(-7px); transition: transform .045s ease-out, box-shadow .045s ease-out; }
  .tc-cap::before { content: ""; position: absolute; left: 18%; right: 18%; top: 9%; height: 30%; border-radius: 50%;
    background: linear-gradient(rgba(255,255,255,.85), rgba(255,255,255,0)); pointer-events: none; }
  .tc-cap::after { content: ""; position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 -8px 10px rgba(0,0,0,.25), inset 0 4px 4px rgba(255,255,255,.35); pointer-events: none; }
  .tc-btn.down .tc-cap { transform: translateY(1px); box-shadow: 0 0 0 4px #0b0d1f, 0 2px 0 0 var(--skirt), 0 2px 0 4px #0b0d1f, 0 3px 4px rgba(0,0,0,.5); }
  .tc-btn.down .tc-cap::before { opacity: .55; }
  .tc-slide .tc-cap { --skirt: #6a3fa8; background: radial-gradient(circle at 50% 30%, #f1e2ff 0%, #c79bff 35%, #8f5ae0 70%, #5e2fa8 100%); }
  .tc-jump .tc-cap { --skirt: #0d4f86; background: radial-gradient(circle at 50% 30%, #d6f7ff 0%, #5fd6ff 35%, #1c97e0 70%, #1270a8 100%); }
  .tc-vac .tc-cap { --skirt: #7d0c19; background: radial-gradient(circle at 50% 30%, #ffe0e4 0%, #ff6f86 35%, #e8213f 70%, #a3121c 100%); transition: transform .045s, box-shadow .045s, background .2s; }
  .tc-vac.loaded .tc-cap { --skirt: #9a4a06; background: radial-gradient(circle at 50% 30%, #fffbe0 0%, #ffe46b 35%, #ffb300 70%, #e8590c 100%); }
  .tc-vac.warn .tc-cap { animation: tcwarn .24s steps(2) infinite; }
  @keyframes tcwarn { 50% { filter: brightness(1.35) saturate(1.3); } }
  .tc-icon { position: relative; z-index: 1; width: 50%; height: 50%; pointer-events: none; filter: drop-shadow(0 3px 0 rgba(11,13,31,.55)); }
  .tc-vac.sucking .tc-swirl { animation: tcspin .32s linear infinite; transform-origin: 0 0; }
  @keyframes tcspin { to { transform: rotate(-360deg); } }
  .tc-name { position: absolute; left: 50%; top: 100%; margin-top: 16px; transform: translateX(-50%); white-space: nowrap; pointer-events: none;
    font: 15px "Titan One", sans-serif; letter-spacing: .5px; color: #ffd23a; -webkit-text-stroke: 4px #0b0d1f; paint-order: stroke fill; }
  .tc-ammo { position: absolute; inset: -26px; width: calc(100% + 52px); height: calc(100% + 52px); pointer-events: none; overflow: visible; }

  .tc-small { position: absolute; width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center;
    background: linear-gradient(#2a30a0, #14185a); box-shadow: 0 0 0 3px #0b0d1f, 0 0 0 5px #d9a12e, 0 0 0 7px #0b0d1f, 0 5px 0 4px #0b0d1f;
    color: #fff6d8; font: 15px "Titan One", sans-serif; -webkit-text-stroke: 3px #0b0d1f; paint-order: stroke fill; }
  .tc-small:active { transform: translateY(3px); }
  `;
  document.head.appendChild(css);
  document.body.classList.add("touch");
  const canvas = document.getElementById("game");
  const mk = (cls, parent = document.body, html = "") => { const e = document.createElement("div"); e.className = cls; e.innerHTML = html; parent.appendChild(e); return e; };

  const deck = mk("tc tc-deck", document.body, "<i></i><i></i><i></i><i></i>");
  const jogZone = mk("tc tc-zone");
  const jogBase = mk("tc-jog-base idle", jogZone, '<div class="tc-groove"></div><div class="tc-chev l"></div><div class="tc-chev r"></div><div class="tc-chev d"></div>');
  const shaft = mk("tc-jog-shaft", jogZone);
  const knob = mk("tc-jog-knob", jogZone);
  const chev = { l: jogBase.querySelector(".l"), r: jogBase.querySelector(".r"), d: jogBase.querySelector(".d") };
  const jumpBtn = mk("tc tc-btn tc-jump", document.body,
    '<div class="tc-cap"><svg class="tc-icon" viewBox="-20 -20 40 40"><g fill="#fff" stroke="#0b0d1f" stroke-width="3.2" stroke-linejoin="round">' +
    '<path d="M0 -15 L13 -2 H6 V6 H-6 V-2 H-13 Z"/><path d="M-9 10 H9 V15 H-9 Z"/></g></svg></div><div class="tc-name">JUMP</div>');
  const vacBtn = mk("tc tc-btn tc-vac", document.body,
    '<svg viewBox="-80 -80 160 160" class="tc-ammo"></svg>' +
    '<div class="tc-cap"><svg class="tc-icon" viewBox="-20 -20 40 40">' +
    '<g class="tc-swirl" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round"><path d="M0 -15 A15 15 0 0 1 15 0"/><path d="M0 15 A15 15 0 0 1 -15 0"/><path d="M-15 0 A15 15 0 0 1 -10.6 -10.6"/><path d="M15 0 A15 15 0 0 1 10.6 10.6"/><circle r="5" fill="#fff" stroke="none"/></g>' +
    '<g class="tc-shoot" style="display:none" fill="#fff" stroke="#0b0d1f" stroke-width="3" stroke-linejoin="round"><path d="M0 -16 L4 -6 L15 -7 L7 1 L12 12 L1 6 L-8 14 L-6 3 L-16 -2 L-5 -5 Z"/></g>' +
    '</svg></div><div class="tc-name">SUCK</div>');
  const ammo = vacBtn.querySelector(".tc-ammo"), vacName = vacBtn.querySelector(".tc-name");
  const slideBtn = mk("tc tc-btn tc-slide", document.body,
    '<div class="tc-cap"><svg class="tc-icon" viewBox="-20 -20 40 40"><g fill="#fff" stroke="#0b0d1f" stroke-width="3" stroke-linejoin="round">' +
    '<path d="M-15 6 H8 L15 -2 V8 H-15 Z"/><path d="M-12 -6 H2 M-14 -12 H-2" fill="none" stroke-linecap="round"/></g></svg></div><div class="tc-name">SLIDE</div>');
  const pauseBtn = mk("tc tc-small", document.body, "II");
  const skipBtn = mk("tc tc-small tc-skip", document.body, "SKIP");
  skipBtn.style.width = "72px";
  skipBtn.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); tap("Escape"); });

  // ---- layout ---------------------------------------------------------------
  let layout = "side", jogHome = { x: 0, y: 0 };
  function place(el, x, y, w, h) { Object.assign(el.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" }); }
  // every button wears a 10px bezel ring (box-shadow) outside its box: RING keeps rings off the edges / each other
  const RING = 10, EDGE = RING + 2, PAIR_GAP = 2 * RING + 4;
  function relayout() {
    const vw = innerWidth, vh = innerHeight, DECK = 210, GUT = 120;
    let big = Math.round(Math.min(118, Math.max(92, vh * 0.2))), small = Math.round(big * 0.72), sm2 = Math.round(small * 0.86);
    // side gutter: wide enough for JUMP + SLIDE side by side (and the vacuum), within a cap so the game stays big;
    // whatever doesn't fit is handled by shrinking the two small buttons to the gutter below
    const natural = (vw - Math.min(vh * 4 / 3, vw)) / 2, needG = small + sm2 + PAIR_GAP + 2 * EDGE;
    const GW = Math.round(Math.max(natural, GUT, Math.min(needG, vw * 0.225)));
    const sideW = Math.min(vh * 4 / 3, vw - 2 * GW), bottomW = Math.min(vw, (vh - DECK) * 4 / 3), fullW = Math.min(vw, vh * 4 / 3);
    layout = Math.max(sideW, bottomW) >= fullW * 0.62 ? (bottomW > sideW ? "bottom" : "side") : "overlay";
    let gw, gx, gy;
    if (layout === "side") { gw = sideW; gx = (vw - gw) / 2; gy = (vh - gw * 3 / 4) / 2; }
    else if (layout === "bottom") { gw = bottomW; gx = (vw - gw) / 2; gy = Math.min(28, Math.max(0, (vh - DECK - gw * 3 / 4) / 2)); }
    else { gw = fullW; gx = (vw - gw) / 2; gy = (vh - gw * 3 / 4) / 2; }
    const gh = gw * 3 / 4;
    Object.assign(canvas.style, { left: gx + "px", top: gy + "px", width: gw + "px", height: gh + "px" });
    const fitPair = avail => { // shrink JUMP/SLIDE so both (plus the gap between their rings) fit in `avail` px
      if (small + sm2 + PAIR_GAP > avail) { small = Math.floor((avail - PAIR_GAP) / 1.86); sm2 = Math.round(small * 0.86); }
    };
    deck.style.display = layout === "bottom" ? "" : "none";
    let zone; // control area rectangle
    if (layout === "side") {
      const g = gx;
      place(jogZone, 0, 0, g, vh);
      jogHome = { x: g / 2, y: vh * 0.66 };
      zone = { x: gx + gw, w: g, y: 0, h: vh };
      big = Math.min(big, Math.floor(g - 2 * EDGE));
      fitPair(g - 2 * EDGE);
      place(vacBtn, Math.min(zone.x + (g - big) / 2 + 6, vw - EDGE - big), vh * 0.66 - big / 2, big, big);
      // jump and slide side by side above the vacuum button, centred in the gutter
      const ty = vh * 0.66 - big / 2 - small - 64, x0 = zone.x + (g - small - PAIR_GAP - sm2) / 2;
      place(jumpBtn, x0, ty, small, small);
      place(slideBtn, x0 + small + PAIR_GAP, ty + (small - sm2) / 2, sm2, sm2);
    } else if (layout === "bottom") {
      const top = gy + gh;
      place(deck, 0, top, vw, vh - top);
      const rv = deck.querySelectorAll("i"), dh = vh - top;
      [[72, 18], [vw - 24, 18], [14, dh - 24], [vw - 24, dh - 24]].forEach(([x, y], i) => Object.assign(rv[i].style, { left: x + "px", top: y + "px" }));
      let jogW = vw * 0.5;
      const cy = top + (vh - top) / 2 + 4;
      jogHome = { x: Math.min(vw * 0.22, 170), y: cy - top };
      const rx = vw - big - Math.max(28, vw * 0.06);
      if (vw < 600) { // narrow (phone portrait): stack jump above the vacuum button, slide beside jump — all right of the jog
        const jogMin = Math.round(vw * 0.42), lo = jogMin + EDGE, hi = vw - EDGE;
        fitPair(hi - lo);
        const gap = 64, span = big + small + gap, y0 = top + Math.max(18, (vh - top - span) / 2 - 10);
        let jx = rx + (big - small) / 2 - 14, sx = jx - PAIR_GAP - sm2;
        if (sx < lo) { sx = lo; jx = sx + sm2 + PAIR_GAP; }
        place(jumpBtn, jx, y0, small, small);
        place(vacBtn, rx, y0 + small + gap, big, big);
        place(slideBtn, sx, y0 + (small - sm2) / 2 + 6, sm2, sm2);
        jogW = Math.min(jogW, sx - EDGE);
        jogHome.y = y0 + small + gap + big / 2 - top;
      } else {
        place(vacBtn, rx, cy - big / 2, big, big);
        place(jumpBtn, rx - small - 30, cy - small / 2 + 16, small, small);
        place(slideBtn, rx - small - sm2 - 64, cy - sm2 / 2 + 30, sm2, sm2);
      }
      place(jogZone, 0, top, jogW, vh - top);
    } else {
      place(jogZone, 0, vh * 0.35, vw * 0.4, vh * 0.65);
      jogHome = { x: 110, y: vh * 0.65 - 100 };
      place(vacBtn, vw - big - 22, vh - big - 26, big, big);
      place(jumpBtn, vw - big - small - 44, vh - small - 36, small, small);
      place(slideBtn, vw - big - small - sm2 - 64, vh - sm2 - 30, sm2, sm2);
      [vacBtn, jumpBtn, slideBtn].forEach(b => b.style.opacity = ".78");
    }
    // the LED arc only rises above the vacuum button (sideways it stays inside the bezel ring), so give its svg
    // exactly that footprint — same scale as before (viewBox 160 over big+52 px), drawn with overflow visible
    const sc = (big + 52) / 160, AP = 26;
    Object.assign(ammo.style, { inset: "auto", left: "0", top: -AP + "px", width: big + "px", height: big + AP + "px" });
    ammo.setAttribute("viewBox", `${(-big / 2 / sc).toFixed(2)} ${(-(big / 2 + AP) / sc).toFixed(2)} ${(big / sc).toFixed(2)} ${((big + AP) / sc).toFixed(2)}`);
    if (layout !== "overlay") [vacBtn, jumpBtn, slideBtn].forEach(b => b.style.opacity = "");
    if (layout === "bottom") place(pauseBtn, 16, gy + gw * 3 / 4 + 20, 44, 44); // deck top-left: clear of the HUD and both buttons
    else place(pauseBtn, vw - 56, 10, 44, 44);
    place(skipBtn, vw - 86, 10, 72, 44);
    const jogSize = Math.round(Math.max(112, Math.min(150, (layout === "side" ? gx : vw * 0.42) - 24)));
    Object.assign(jogBase.style, { width: jogSize + "px", height: jogSize + "px", margin: `${-jogSize / 2}px 0 0 ${-jogSize / 2}px` });
    const ks = Math.round(jogSize * 0.44);
    Object.assign(knob.style, { width: ks + "px", height: ks + "px", margin: `${-ks / 2}px 0 0 ${-ks / 2}px` });
    resetJog();
  }
  // lever: the ball sits on a shaft rising from the well centre, so it reads as a real stick when pushed
  function setKnob(cx, cy, dx, dy) {
    Object.assign(knob.style, { left: cx + dx + "px", top: cy + dy - 6 + "px" });
    const len = Math.hypot(dx, dy - 6);
    Object.assign(shaft.style, { left: cx + "px", top: cy - len + "px", height: len + "px", transform: `rotate(${Math.atan2(dx, -(dy - 6))}rad)` });
  }
  function lightChev(dir, down) { chev.l.classList.toggle("on", dir < 0); chev.r.classList.toggle("on", dir > 0); chev.d.classList.toggle("on", down); }
  function resetJog() {
    Object.assign(jogBase.style, { left: jogHome.x + "px", top: jogHome.y + "px" });
    setKnob(jogHome.x, jogHome.y, 0, 0);
    jogBase.classList.add("idle"); lightChev(0, false);
  }
  addEventListener("resize", relayout);
  addEventListener("orientationchange", () => setTimeout(relayout, 200));

  // ---- jog dial ---------------------------------------------------------------
  // floating: the dial re-centres wherever the thumb lands; horizontal deflection = walk, pull down & hold = drop
  let jog = null;
  const R = 44, DEAD = 12;
  jogZone.addEventListener("pointerdown", e => {
    e.preventDefault();
    const G0 = window.__game && __game.game;
    // outside gameplay (and on the game-over screen) the dial area is just "tap to continue"
    if (G0 && (G0.scene !== "play" || G0.phase === "gameover")) { tap("Enter"); return; }
    jogZone.setPointerCapture(e.pointerId);
    const r = jogZone.getBoundingClientRect();
    jog = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, r, dir: 0, downAt: 0, dropped: false };
    Object.assign(jogBase.style, { left: jog.ox + "px", top: jog.oy + "px" }); jogBase.classList.remove("idle");
    moveJog(e);
  });
  jogZone.addEventListener("pointermove", e => { if (jog && e.pointerId === jog.id) moveJog(e); });
  const endJog = e => { if (!jog || e.pointerId !== jog.id) return; jog = null; hold("ArrowLeft", false); hold("ArrowRight", false); hold("ArrowDown", false); resetJog(); };
  jogZone.addEventListener("pointerup", endJog); jogZone.addEventListener("pointercancel", endJog);
  function moveJog(e) {
    let dx = e.clientX - jog.r.left - jog.ox, dy = e.clientY - jog.r.top - jog.oy;
    const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    setKnob(jog.ox, jog.oy, dx, dy);
    const dir = dx < -DEAD ? -1 : dx > DEAD ? 1 : 0;
    if (dir !== jog.dir) { jog.dir = dir; if (dir) buzz(6); }
    hold("ArrowLeft", dir < 0); hold("ArrowRight", dir > 0);
    const down = dy > R * 0.7 && Math.abs(dx) < R * 0.75;
    hold("ArrowDown", down); lightChev(dir, down);
    if (down && !jog.downAt) jog.downAt = performance.now();
    if (!down) { jog.downAt = 0; jog.dropped = false; }
  }

  // ---- buttons -------------------------------------------------------------------
  function button(el, code, onDown) {
    let id = null;
    el.addEventListener("pointerdown", e => { e.preventDefault(); el.setPointerCapture(e.pointerId); id = e.pointerId; el.classList.add("down"); buzz(8); hold(code, true); onDown && onDown(); });
    const up = e => { if (e.pointerId !== id) return; id = null; el.classList.remove("down"); hold(code, false); };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  }
  button(jumpBtn, "KeyZ");
  button(slideBtn, "KeyC");
  button(vacBtn, "KeyX");
  pauseBtn.addEventListener("pointerdown", e => { e.preventDefault(); tap("KeyP"); });
  // first touch anywhere: audio unlock + fullscreen + landscape lock where the browser allows it
  addEventListener("pointerdown", () => {
    const de = document.documentElement;
    if (!document.fullscreenElement && de.requestFullscreen) de.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
  }, { once: true });

  // ---- feedback loop: mirror the tank on the vacuum button, drive haptics ----------------
  let lastTank = 0, lastHp = null, lastDrop = 0;
  const NS = "http://www.w3.org/2000/svg";
  // five LED segments on an arc above the vacuum button: lit per captured thief, cyan → yellow → flashing red
  function drawRing(tank) {
    let out = "";
    for (let i = 0; i < 5; i++) {
      const a0 = -Math.PI / 2 + (i - 2.5) * 0.36 + 0.03, a1 = a0 + 0.3, R = 66;
      const p = a => `${(Math.cos(a) * R).toFixed(1)} ${(Math.sin(a) * R).toFixed(1)}`;
      const it = tank[i], warn = it && canEscape(it) && it.t >= ESCAPE_WARN, blink = warn && Math.floor(performance.now() / 120) % 2;
      const col = !it ? "#2a2f66" : !canEscape(it) ? "#fff4d6" : warn ? (blink ? "#ff2d45" : "#ff9a1f") : it.t > ESCAPE_WARN * 0.6 ? "#ffe14d" : "#4ddcff";
      const d = `M ${p(a0)} A ${R} ${R} 0 0 1 ${p(a1)}`;
      out += `<path d="${d}" stroke="#0b0d1f" stroke-width="15" stroke-linecap="round" fill="none"/>` +
             `<path d="${d}" stroke="${col}" stroke-width="8" stroke-linecap="round" fill="none"${it ? ` style="filter:drop-shadow(0 0 5px ${col})"` : ""}/>`;
    }
    ammo.innerHTML = out;
  }
  function loop() {
    const g = window.__game, P = g && g.P, G = g && g.game;
    if (P && G && G.scene === "play") {
      const tank = P.tank || [];
      const loaded = tank.length > 0, warn = tank.some(it => canEscape(it) && it.t >= ESCAPE_WARN);
      vacBtn.classList.toggle("loaded", loaded); vacBtn.classList.toggle("warn", warn); vacBtn.classList.toggle("sucking", !!P.sucking);
      vacBtn.querySelector(".tc-swirl").style.display = loaded ? "none" : "";
      vacBtn.querySelector(".tc-shoot").style.display = loaded ? "" : "none";
      vacName.textContent = loaded ? "SHOOT" : "SUCK";
      drawRing(tank);
      if (tank.length > lastTank) buzz(18);            // slurp!
      if (tank.length < lastTank && P.shootPose) buzz(30); // fire
      if (lastHp != null && G.hp < lastHp) buzz([50, 40, 50]);
      lastTank = tank.length; lastHp = G.hp;
      // pull down & hold on the jog = drop through the ledge (no button combo needed)
      if (jog && jog.downAt && !jog.dropped && performance.now() - jog.downAt > 140 && P.onGround && P.row > 0 && performance.now() - lastDrop > 300) {
        jog.dropped = true; lastDrop = performance.now(); tap("KeyZ"); buzz(10);
      }
    } else { drawRing([]); vacBtn.classList.remove("loaded", "warn", "sucking"); lastTank = 0; }
    pauseBtn.style.display = G && G.scene === "play" ? "" : "none";
    skipBtn.style.display = G && G.scene === "ending" ? "" : "none";
    requestAnimationFrame(loop);
  }
  relayout(); requestAnimationFrame(loop);
  window.__touch = { get layout() { return layout; } };
})();
