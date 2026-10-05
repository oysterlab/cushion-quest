// CutFX — gives still cutscene paintings a little life.
//  * regions: a soft-edged (feathered ellipse) crop of the painting redrawn with a small transform
//    (breathe = squash around a pivot, bob = drift/tilt) so a character can breathe or float.
//  * fx: particle/overlay layers (zzz, feathers, sparkles, dust, speed lines, orbiting stars, glow, bubble).
// All coordinates are fractions of the painting (0..1), so the effects follow any camera move.
(() => {
  const TAU = Math.PI * 2;
  function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

  function makeRegion(img, r) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const x0 = Math.max(0, (r.x - r.rx) * iw), y0 = Math.max(0, (r.y - r.ry) * ih);
    const x1 = Math.min(iw, (r.x + r.rx) * iw), y1 = Math.min(ih, (r.y + r.ry) * ih);
    const w = Math.round(x1 - x0), h = Math.round(y1 - y0);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.drawImage(img, x0, y0, w, h, 0, 0, w, h);
    // feathered elliptical mask: solid core, soft rim, so the redraw blends into the original
    g.globalCompositeOperation = "destination-in";
    g.save(); g.translate(w / 2, h / 2); g.scale(1, h / w);
    const m = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(0.68, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = m; g.fillRect(-w / 2, -w / 2, w, w); g.restore();
    return { c, fx: x0 / iw, fy: y0 / ih, fw: w / iw, fh: h / ih };
  }

  function drawZ(ctx, x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${s}px "Titan One", "Black Han Sans", sans-serif`;
    ctx.lineWidth = s * 0.22; ctx.strokeStyle = "#1b2050"; ctx.strokeText("Z", x, y);
    ctx.fillStyle = "#e8f2ff"; ctx.fillText("Z", x, y); ctx.restore();
  }
  function star(ctx, x, y, r, color, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = Math.max(1, r * 0.18); ctx.strokeStyle = "#1b1530"; ctx.stroke(); ctx.restore();
  }
  function sparkle(ctx, x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.fillStyle = "#fffbe0";
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r); ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill(); ctx.restore();
  }

  function create(img, def = {}) {
    let regions = null;
    const regionDefs = def.regions || [], fxDefs = def.fx || [];
    return {
      draw(ctx, W, H, t) { // t in frames (60/s)
        if (!img || !img.naturalWidth) return;
        if (!regions) regions = regionDefs.map(r => ({ ...r, ...makeRegion(img, r) }));
        for (const r of regions) {
          const sp = r.speed || 0.05, ph = Math.sin(t * sp + (r.phase || 0));
          const px = (r.px ?? r.x) * W, py = (r.py ?? (r.y + r.ry)) * H;
          ctx.save();
          ctx.translate(px, py);
          if (r.kind === "bob") { ctx.translate(Math.sin(t * sp * 0.7 + 1) * (r.dx || 0) * W, ph * (r.amp || 0.006) * H); ctx.rotate(ph * (r.rot || 0)); }
          else { const a = r.amp || 0.02; ctx.scale(1 - ph * a * 0.5, 1 + ph * a); if (r.rot) ctx.rotate(ph * r.rot); }
          ctx.drawImage(r.c, r.fx * W - px, r.fy * H - py, r.fw * W, r.fh * H);
          ctx.restore();
        }
        for (const f of fxDefs) drawFx(ctx, f, W, H, t);
      },
    };
  }

  function drawFx(ctx, f, W, H, t) {
    const n = f.n || 10, X = f.x * W, Y = f.y * H;
    switch (f.type) {
      case "zzz": for (let i = 0; i < 3; i++) { const k = ((t * 0.008 + i / 3) % 1); drawZ(ctx, X + k * 0.06 * W + Math.sin(k * 6) * 6, Y - k * 0.14 * H, (22 + k * 40) * (W / 960), Math.sin(k * Math.PI)); } break;
      case "bubble": { const k = (Math.sin(t * 0.06) + 1) / 2, r = (6 + k * 14) * (W / 960);
        ctx.save(); ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fillStyle = "rgba(200,235,255,.45)"; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.stroke(); ctx.beginPath(); ctx.arc(X - r * 0.35, Y - r * 0.35, r * 0.22, 0, TAU); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore(); break; }
      case "feathers": for (let i = 0; i < n; i++) { const sp = 0.0016 + hash(i) * 0.002, k = (t * sp + hash(i + 9)) % 1;
          const x = (f.x0 ?? 0) * W + hash(i + 3) * (f.w ?? 1) * W + Math.sin(t * 0.04 + i) * 22, y = (f.y0 ?? -0.05) * H + k * (f.h ?? 1.1) * H;
          ctx.save(); ctx.globalAlpha = 0.9 * Math.sin(k * Math.PI); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.05 + i) * 0.9);
          ctx.beginPath(); ctx.ellipse(0, 0, 9 * (W / 960), 3.4 * (W / 960), 0, 0, TAU); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.strokeStyle = "rgba(40,30,60,.45)"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); } break;
      case "sparkles": for (let i = 0; i < n; i++) { const k = (t * 0.02 + hash(i) * 7) % 1;
          sparkle(ctx, (f.x0 ?? 0) * W + hash(i + 1) * (f.w ?? 1) * W, (f.y0 ?? 0) * H + hash(i + 2) * (f.h ?? 1) * H, (5 + hash(i + 4) * 9) * (W / 960) * Math.sin(k * Math.PI), Math.sin(k * Math.PI)); } break;
      case "orbit": for (let i = 0; i < (f.n || 3); i++) { const a = t * 0.09 + i * TAU / (f.n || 3); star(ctx, X + Math.cos(a) * (f.r || 0.05) * W, Y + Math.sin(a) * (f.r || 0.05) * W * 0.35, 9 * (W / 960), "#ffe14d", a); } break;
      case "glow": { const k = 0.75 + Math.sin(t * (f.speed || 0.06)) * 0.25, R = (f.r || 0.15) * W;
          const g = ctx.createRadialGradient(X, Y, 0, X, Y, R); g.addColorStop(0, f.color || "rgba(255,240,170,.55)"); g.addColorStop(1, "rgba(255,240,170,0)");
          ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = g; ctx.fillRect(X - R, Y - R, R * 2, R * 2); ctx.restore(); break; }
      case "dust": for (let i = 0; i < n; i++) { const k = (t * 0.02 + hash(i) ) % 1;
          ctx.save(); ctx.globalAlpha = 0.6 * (1 - k); ctx.beginPath(); ctx.arc(X - k * (f.dir || 1) * 0.12 * W + hash(i + 5) * 20, Y - k * 30 - hash(i) * 10, (6 + k * 18) * (W / 960), 0, TAU); ctx.fillStyle = "#fff4dc"; ctx.fill(); ctx.restore(); } break;
      case "motes": for (let i = 0; i < n; i++) { const x = (f.x0 + hash(i) * f.w) * W + Math.sin(t * 0.01 + i) * 12, y = (f.y0 + hash(i + 7) * f.h) * H + Math.cos(t * 0.013 + i * 2) * 10;
          ctx.save(); ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 0.05 + i); ctx.beginPath(); ctx.arc(x, y, 2 * (W / 960), 0, TAU); ctx.fillStyle = "#fff6c8"; ctx.fill(); ctx.restore(); } break;
      case "speed": ctx.save(); ctx.lineCap = "round";
        for (let i = 0; i < n; i++) { const k = (t * 0.05 + hash(i)) % 1, y = (f.y0 + hash(i + 2) * f.h) * H, x = (1 - k) * W * 1.3 - 0.15 * W, len = (0.08 + hash(i) * 0.12) * W;
          ctx.globalAlpha = 0.55; ctx.strokeStyle = "#fff"; ctx.lineWidth = (2 + hash(i + 1) * 4) * (W / 960); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * (f.dir || 1), y); ctx.stroke(); }
        ctx.restore(); break;
      case "rays": ctx.save(); ctx.translate(X, Y); ctx.rotate(t * 0.004); ctx.globalAlpha = 0.18;
        for (let i = 0; i < 16; i++) { ctx.rotate(TAU / 16); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, -W * 0.06); ctx.lineTo(W, W * 0.06); ctx.fillStyle = i % 2 ? "#fff6b0" : "#ffb347"; ctx.fill(); }
        ctx.restore(); break;
    }
  }

  window.CutFX = { create };
})();
