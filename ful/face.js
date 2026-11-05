/*
  FUL face engine.

  A tiny spring-driven character renderer: two eyes that blink, glance at the
  cursor, squint, wobble, and react. Everything is drawn on a canvas so the
  pill stays crisp at any size.
*/

(function () {
  'use strict';
  console.log('[FACE] face.js loaded successfully');

const clamp = (v, a = 0, b = 1) => {
  if (typeof v !== 'number' || isNaN(v) || !isFinite(v)) return a;
  return Math.max(a, Math.min(b, v));
};
const rnd = (a, b) => a + (b - a) * Math.random();

function parseColor(c) {
  if (!c) return [255, 255, 255];
  c = String(c).trim();
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const n = parseInt(hex, 16);
    if (!isNaN(n)) return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
  const hslMatch = c.match(/hsl\((\d+),\s*([\d.]+)%?,\s*([\d.]+)%?\)/i);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    return [Math.round(hue2rgb(h + 1/3) * 255), Math.round(hue2rgb(h) * 255), Math.round(hue2rgb(h - 1/3) * 255)];
  }
  const n = parseInt(c.replace(/[^0-9a-f]/gi, ''), 16);
  if (!isNaN(n) && c.length >= 3) return [n >> 16 & 255, n >> 8 & 255, n & 255];
  return [255, 255, 255];
}

const hx = h => parseColor(h);
const rgba = (h, a) => { const [r, g, b] = hx(h); return `rgba(${r},${g},${b},${clamp(a)})`; };
const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mixc = (a, b, t) => {
  const ca = hx(a), cb = hx(b);
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
};

const BASE = {
  open_l: 1, open_r: 1, shut_l: 0, shut_r: 0, eye_size: 1, squint: 0,
  look_x: 0, look_y: 0, brow_tilt: 0, glow: .3, stretch: 0, dots: 0, zzz: 0, angry: 0
};

const MOODS = {
  idle: { glow: .35 },
  hover: { eye_size: 1.06, glow: .55 },
  listening: { eye_size: 1.08, look_y: -.1, glow: .5 },
  thinking: { look_x: .65, look_y: -.85, brow_tilt: -.15, squint: .12, dots: 1, glow: .35 },
  talking: { glow: .5 },
  happy: { squint: .7, glow: .8 },
  wink: { shut_l: 1, glow: .5 },
  nervous: { eye_size: 1.02, look_x: .15, look_y: .45, brow_tilt: .9, glow: .3 },
  sad: { open_l: .84, open_r: .84, look_y: .4, brow_tilt: .95, glow: .15 },
  meh: { open_l: .5, open_r: .5, look_x: -.4, look_y: .15, glow: .15 },
  surprised: { eye_size: 1.15, glow: .6 },
  sleepy: { open_l: .38, open_r: .38, squint: .42, zzz: 1, glow: .25 },
  angry: { angry: 1, brow_tilt: -0.85, squint: 0.15, eye_size: 1.08, glow: 1.2 }
};

const SPR = {
  look_x: [300, .6], look_y: [300, .6], brow_tilt: [150, .6], eye_size: [180, .6],
  glow: [120, .85], stretch: [320, .45], dots: [60, 1], zzz: [40, 1], angry: [240, .65]
};
const SPD = [220, .75];
const LIVE = new Set(['idle', 'hover', 'talking', 'listening', 'angry']);
const HOPS = new Set(['idle', 'hover']);

function heart(e, x, y, S) {
  const o = S / 2;
  e.beginPath();
  e.moveTo(x, y + o * .95);
  e.bezierCurveTo(x - o * 1.25, y + o * .15, x - o * 1.05, y - o * 1.05, x, y - o * .4);
  e.bezierCurveTo(x + o * 1.05, y - o * 1.05, x + o * 1.25, y + o * .15, x, y + o * .95);
  e.closePath();
}

class Face {
  constructor() {
    this.val = { ...BASE, ...MOODS.idle };
    this.vel = Object.fromEntries(Object.keys(BASE).map(k => [k, 0]));
    this.clock = 0;
    this.name = 'idle';
    this.blinkAt = 2;
    this.blinkT = -1;
    this.dbl = false;
    this.glance = [0, 0];
    this.glanceAt = 0;
    this.jit = [0, 0];
    this.jitAt = 0;
    this.hop = 0;
    this.hopV = 0;
    this.hopAt = 6;
    this.eye = '#ffffff';
    this.pill = '#000000';
    this.talkVis = 0;
    this.setPalette();
  }

  setPalette(eye, pill) {
    if (eye && typeof eye === 'string' && eye.trim()) this.eye = eye.trim();
    if (pill && typeof pill === 'string' && pill.trim()) this.pill = pill.trim();
    let e = this.eye || '#ffffff';
    const rgb = hx(e);
    // If user's eye color is somehow set to black or too dark (< 60), force crisp white so eyes are never invisible on dark background
    if (rgb[0] < 60 && rgb[1] < 60 && rgb[2] < 60) {
      e = '#ffffff';
      this.eye = '#ffffff';
    }
    const isVeryLight = (rgb[0] > 230 && rgb[1] > 230 && rgb[2] > 230);
    this.pal = {
      ink: isVeryLight ? '#F6F7F9' : e,
      eye: e,
      shade: isVeryLight ? '#DEE6F2' : mixc(e, '#000000', .18),
      glow: isVeryLight ? '#E1EBFF' : e
    };
  }

  target(name, lv, ov) {
    const o = { ...BASE, ...MOODS[name] };
    if (ov && Array.isArray(ov) && isFinite(ov[0]) && isFinite(ov[1])) {
      o.look_x = clamp(ov[0], -1, 1);
      o.look_y = clamp(ov[1], -1, 1);
    } else if (LIVE.has(name)) {
      if (this.clock >= this.glanceAt) {
        this.glance = [rnd(-.85, .85), rnd(-.8, .35)];
        this.glanceAt = this.clock + rnd(.6, 2.2);
      }
      o.look_x += this.glance[0] * .8;
      o.look_y += this.glance[1] * .8;
    }
    if (this.clock >= this.jitAt) {
      const i = name === 'talking' ? .06 : name === 'thinking' ? .04 : (name === 'angry' ? .08 : .02);
      this.jit = [rnd(-i, i), rnd(-i, i)];
      this.jitAt = this.clock + (name === 'angry' ? rnd(.04, .08) : rnd(.5, 1.4));
    }
    if (name === 'thinking') { o.look_x += .08 * Math.sin(this.clock * 1.3); o.look_x += this.jit[0]; o.look_y += this.jit[1]; }
    if (name === 'angry') { o.look_x += this.jit[0]; o.look_y += this.jit[1]; }
    if (name === 'listening') { const i = clamp(lv); o.eye_size += .05 * i; o.stretch = .2 * i; o.glow += .45 * i; }
    if (name === 'talking') o.glow += .2 * (.5 + .5 * Math.sin(this.clock * 15) * Math.sin(this.clock * 4.1 + 1));
    return o;
  }

  advance(dt, name, lv, ov) {
    dt = clamp(dt, 0.001, .25);
    if (!MOODS[name]) name = 'idle';
    if (name !== this.name) {
      this.blinkT = 0;
      this.dbl = false;
      if (!['sleepy', 'meh', 'sad'].includes(name)) this.hopV += 1.1;
    }
    this.name = name;
    let r = dt;
    while (r > 1e-6) {
      const l = Math.min(1 / 60, r);
      r -= l;
      this.clock += l;
      const t = this.target(name, lv, ov);
      for (const k in BASE) {
        if (!isFinite(this.val[k])) this.val[k] = BASE[k];
        if (!isFinite(this.vel[k])) this.vel[k] = 0;
        const [u, d] = SPR[k] || SPD;
        const h = 2 * Math.sqrt(u) * d;
        this.vel[k] += (u * (t[k] - this.val[k]) - h * this.vel[k]) * l;
        this.val[k] += this.vel[k] * l;
        if (!isFinite(this.val[k])) this.val[k] = BASE[k];
      }
      if (HOPS.has(name) && this.clock >= this.hopAt) { this.hopV += rnd(.8, 1.3); this.hopAt = this.clock + rnd(7, 14); }
      this.hopV += (-260 * this.hop - 2 * Math.sqrt(260) * .35 * this.hopV) * l;
      this.hop += this.hopV * l;
      if (!isFinite(this.hop)) this.hop = 0;
      if (!isFinite(this.hopV)) this.hopV = 0;
      if (this.blinkT >= 0) {
        this.blinkT += l;
        if (this.blinkT > .15) {
          if (this.dbl) { this.dbl = false; this.blinkT = 0; }
          else { this.blinkT = -1; this.blinkAt = this.clock + rnd(2, 5); }
        }
      } else if (LIVE.has(name) && this.clock >= this.blinkAt) {
        this.blinkT = 0;
        this.dbl = Math.random() < .25;
      }
    }
    const targetVis = (name === 'talking') ? 1 : 0;
    this.talkVis += (targetVis - this.talkVis) * Math.min(1, dt * 12);
    if (Math.abs(this.talkVis - targetVis) < 0.005) this.talkVis = targetVis;
    if (!isFinite(this.talkVis)) this.talkVis = 0;
  }

  blink() { return this.blinkT < 0 ? 1 : 1 - Math.sin(Math.PI * Math.min(1, this.blinkT / .15)); }

  poke() { this.blinkT = 0; this.hopV += .9; }

  settle(name) { this.name = name; }

  layout(x, y, w, h) {
    const v = this.val;
    const d = Math.max(20, (typeof h === 'number' && isFinite(h)) ? h : 56);
    const width = Math.max(40, (typeof w === 'number' && isFinite(w)) ? w : 112);
    const left = (typeof x === 'number' && isFinite(x)) ? x : 0;
    const top = (typeof y === 'number' && isFinite(y)) ? y : 0;
    const s = Math.sin(this.clock * 1.8) * d * .012;
    const a = clamp(this.hop, -.12, .12) * d;
    const u = clamp(v.look_x, -1, 1);
    const g = clamp(v.look_y, -1, 1);
    const cx = left + width / 2 + u * d * .12;
    const cy = top + d / 2 - a + s + g * d * .05;
    const ecy = cy - d * .04;
    const rx = Math.max(3.5, d * .19 * Math.max(0.4, v.eye_size || 1) * .5);
    const ry = Math.max(5.0, d * .25 * Math.max(0.4, v.eye_size || 1) * .62 * (1 + Math.max(0, v.stretch || 0)));
    const dx = Math.max(10, d * .43 * .82);
    const bl = Math.max(0.02, clamp(this.blink(), 0, 1));
    return {
      d, cx, cy, eyeCy: ecy, eyeDx: dx, rx, ry, gx: u, gy: g, blink: bl,
      line: Math.max(1.1, d * .05),
      eye: (c, p = true) => [cx + c * dx + (p ? u * rx * .95 : 0), ecy + (p ? g * ry * .5 : 0)]
    };
  }

  eyeShape(c, n, r, o, i, l, s, a, u, d, h, m) {
    const P = this.pal, y = n + h * o * .95, S = r + m * i * .5, W = Math.max(6, o * 2), f = 1 - clamp(s);
    if (f > .01) {
      c.save();
      c.globalAlpha = clamp(c.globalAlpha * f, 0, 1);
      c.translate(y, S);
      c.rotate(-u * clamp(a.brow_tilt, -1.2, 1.2) * 11 * Math.PI / 180);
      const H = Math.max(6, i * 2 * clamp(l));
      if (l > .12) {
        if (a.angry > 0.02) {
          const ang = clamp(a.angry);
          const cut = H * 0.48 * ang;
          c.beginPath();
          c.moveTo(-W, H);
          c.lineTo(W, H);
          if (u === -1) {
            c.lineTo(W, -H / 2 + cut);
            c.lineTo(-W, -H / 2 - cut * 0.15);
          } else {
            c.lineTo(W, -H / 2 - cut * 0.15);
            c.lineTo(-W, -H / 2 + cut);
          }
          c.closePath();
          c.clip();
        }
        const p = clamp(a.squint);
        if (p > .02) {
          c.beginPath();
          c.moveTo(-W, -H);
          c.lineTo(W, -H);
          c.lineTo(W, H / 2 + 2);
          c.quadraticCurveTo(0, H / 2 + 2 - p * H * 1.25, -W, H / 2 + 2);
          c.closePath();
          c.clip();
        }
        const g = c.createLinearGradient(0, -H / 2, 0, H / 2);
        g.addColorStop(0, P.eye);
        g.addColorStop(.6, P.eye);
        g.addColorStop(1, P.shade);
        c.fillStyle = g;
        c.beginPath();
        if (typeof c.roundRect === 'function') {
          c.roundRect(-W / 2, -H / 2, W, H, Math.min(W / 2, H / 2));
        } else {
          c.rect(-W / 2, -H / 2, W, H);
        }
        c.fill();
      } else {
        c.strokeStyle = P.ink;
        c.lineWidth = d * 1.2;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(-W / 2, 0);
        c.quadraticCurveTo(0, i * .45, W / 2, 0);
        c.stroke();
      }
      c.restore();
    }
    if (s > .01) {
      c.save();
      c.globalAlpha = clamp(c.globalAlpha * clamp(s), 0, 1);
      c.strokeStyle = P.ink;
      c.lineWidth = d * 1.2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(y - W / 2, S + i * .2);
      c.quadraticCurveTo(y, S - i * .85, y + W / 2, S + i * .2);
      c.stroke();
      c.restore();
    }
  }

  paint(c, x, y, w, h, opts = {}) {
    try {
      const v = this.val, P = this.pal, L = this.layout(x, y, w, h), t = opts.time || 0;
      if (v.glow > .01 && L.blink > .3) {
        const isAngry = (this.name === 'angry' || v.angry > 0.25);
        const glowCol = isAngry ? '#ff3b30' : P.glow;
        for (const s of [-1, 1]) {
          const px = L.cx + s * L.eyeDx + L.gx * L.rx * .55;
          const py = L.eyeCy + L.gy * L.ry * .3;
          const R = Math.max(L.rx, L.ry) * 2.2;
          const a = Math.min(.8, .35 * 2 * clamp(v.glow, 0, 1.6)) * L.blink;
          const g = c.createRadialGradient(px, py, 0, px, py, R);
          g.addColorStop(0, rgba(glowCol, a));
          g.addColorStop(.45, rgba(glowCol, a * .35));
          g.addColorStop(1, rgba(glowCol, 0));
          c.fillStyle = g;
          c.beginPath();
          c.arc(px, py, R, 0, 6.2832);
          c.fill();
        }
      }
      for (const [s, o, sh] of [[-1, v.open_l, v.shut_l], [1, v.open_r, v.shut_r]]) {
        this.eyeShape(c, L.cx + s * L.eyeDx, L.eyeCy, L.rx, L.ry, o * L.blink, sh, v, s, L.line, L.gx, L.gy);
      }
      const isTalking = (opts.talking !== undefined) ? opts.talking : (this.name === 'talking');
      if (opts.dt) {
        const targetVis = isTalking ? 1 : 0;
        this.talkVis += (targetVis - this.talkVis) * Math.min(1, opts.dt * 14);
      } else if (isTalking) {
        this.talkVis = 1;
      }
      const vis = clamp(isTalking ? Math.max(this.talkVis, 0.4) : this.talkVis);
      if (vis > 0.02) {
        try { this.mouthVisualizer(c, L, t, vis, opts.audioData, opts.level, opts.viseme); } catch {}
      }
      if (v.dots > .02) {
        for (let i = 0; i < 3; i++) {
          const sy = Math.sin(this.clock * 3 + i) * L.d * .03;
          c.fillStyle = rgba('#4d8dff', v.dots * (1 - i * .28));
          c.beginPath();
          c.arc(L.cx + L.eyeDx + L.rx + L.d * .12 + i * L.d * .13, L.eyeCy - L.ry * .5 - L.d * .1 * i + sy, L.d * (.045 + i * .012), 0, 6.2832);
          c.fill();
        }
      }
      if (v.zzz > .02) {
        c.save();
        c.lineCap = c.lineJoin = 'round';
        c.lineWidth = Math.max(1, L.d * .035);
        for (let i = 0; i < 3; i++) {
          const s = (this.clock * .35 + i / 3) % 1, a = L.d * (.1 + i * .03);
          const u = L.cx + L.eyeDx + L.rx * .3 + s * L.d * .35 + Math.sin(s * 6) * L.d * .03;
          const d = L.eyeCy - L.ry * .2 - s * L.d * .45;
          c.strokeStyle = rgba(P.ink, clamp(v.zzz) * .9 * Math.sin(Math.PI * s));
          c.beginPath();
          c.moveTo(u, d);
          c.lineTo(u + a, d);
          c.lineTo(u, d + a);
          c.lineTo(u + a, d + a);
          c.stroke();
        }
        c.restore();
      }
      if (opts.outfit) {
        try { this.outfit(c, L, t, opts.outfit); } catch {}
      }
      if (opts.love > 0) {
        try { this.love(c, L, t, opts.love); } catch {}
      }
      return L;
    } catch (err) {
      console.warn('[FACE] paint error caught:', err);
      return null;
    }
  }

  mouthVisualizer(c, L, t, vis, audioData, level, viseme) {
    const waveW = L.d * 0.46;
    const halfW = waveW / 2;
    // Sit the mouth clearly below the eyes so it never crosses the eye area
    const eyeBottom = L.eyeCy + L.ry;
    const mouthY = eyeBottom + L.d * 0.11;
    const P = this.pal;
    const pts = 28;
    const points = [];

    // Mark-LVI Viseme fusion: closure forces lips shut, openness scales height
    let visOpen = 1.0;
    let visClose = 0.0;
    if (viseme && typeof viseme === 'object') {
      if (typeof viseme.closure === 'number') visClose = clamp(viseme.closure);
      if (typeof viseme.openness === 'number') visOpen = clamp(viseme.openness * 1.3, 0.4, 2.0);
    }

    // Real-time audio energy calculation
    let audAmp = 0.5;
    const hasRealAudio = audioData && audioData.length > 0;
    if (hasRealAudio) {
      if (typeof level === 'number' && level > 0) {
        audAmp = Math.max(0.12, Math.min(2.2, level * 2.8));
      } else {
        let sum = 0;
        const count = Math.min(audioData.length, 64);
        for (let i = 0; i < count; i++) sum += audioData[i];
        audAmp = Math.max(0.12, Math.min(2.2, (sum / count) / 75));
      }
    } else {
      // Natural speech syllable cadence modulation
      const syllable = Math.max(0.15, Math.sin(t * 9.2) * Math.sin(t * 3.4 + 0.5));
      audAmp = 0.35 + syllable * 0.85;
    }

    for (let k = 0; k < pts; k++) {
      const normX = (k / (pts - 1) - 0.5) * 2; // -1 .. 1
      const x = L.cx + normX * halfW;
      const env = Math.cos(normX * Math.PI * 0.5); // taper cleanly at ends

      let waveOffset = 0;
      if (hasRealAudio) {
        // Sample frequency bins: center = speech fundamental / vowel energy, sides = harmonics
        const bin = Math.min(audioData.length - 1, Math.floor((1 - Math.abs(normX)) * 28) + 2);
        const freqNorm = Math.min(1.5, (audioData[bin] || 0) / 180);
        const s1 = Math.sin(t * 22 + normX * 6.5);
        const s2 = Math.cos(t * 15 - normX * 4.8);
        waveOffset = (s1 * 0.65 + s2 * 0.35) * (L.d * 0.058) * env * vis * audAmp * (0.3 + freqNorm * 1.4);
      } else {
        const s1 = Math.sin(normX * 4.2 + t * 20);
        const s2 = Math.sin(normX * 8.5 - t * 14);
        const s3 = Math.cos(normX * 13.5 + t * 26);
        const composite = (s1 * 0.55 + s2 * 0.32 + s3 * 0.18);
        waveOffset = composite * (L.d * 0.12) * env * vis * audAmp;
      }

      // Modulate with viseme phoneme shape
      waveOffset = waveOffset * visOpen * (1 - visClose * 0.88);

      // Keep the wave from rising back into the eyes
      const y = Math.max(eyeBottom + L.d * 0.02, mouthY + waveOffset);
      points.push({ x, y });
    }

    c.save();
    c.globalAlpha = clamp(vis);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.shadowColor = rgba(P.glow, 0.8 * vis);
    c.shadowBlur = L.d * 0.14;
    c.strokeStyle = P.eye;
    c.lineWidth = Math.max(1.8, L.d * 0.045);

    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < pts - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      c.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    c.lineTo(points[pts - 1].x, points[pts - 1].y);
    c.stroke();
    c.restore();
  }

  outfit(c, L, t, which) {
    if (which === 'shades') {
      const n = L.rx * 4.1, r = L.ry * 2.45, k = 'rgba(245,248,255,.68)';
      const p = [-1, 1].map(s => L.eye(s, false));
      for (const [sx, sy] of p) {
        const u = sx - n / 2, d = sy - r / 2;
        const g = c.createLinearGradient(0, d, 0, d + r);
        g.addColorStop(0, '#343A49');
        g.addColorStop(1, '#11141B');
        c.beginPath();
        c.roundRect(u, d, n, r, r * .28);
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = k;
        c.lineWidth = Math.max(.8, L.line * .38);
        c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.6)';
        c.beginPath();
        c.moveTo(u + n * .18, d + r * .25);
        c.lineTo(u + n * .36, d + r * .11);
        c.stroke();
      }
      c.strokeStyle = k;
      c.lineWidth = Math.max(.8, L.line * .48);
      c.beginPath();
      c.moveTo(p[0][0] + n / 2, p[0][1] - r * .18);
      c.quadraticCurveTo(L.cx, p[0][1] - r * .48, p[1][0] - n / 2, p[1][1] - r * .18);
      c.stroke();
    }
    if (which === 'glasses') {
      const n = Math.max(L.rx, L.ry) * 1.42, p = [-1, 1].map(s => L.eye(s, false));
      c.strokeStyle = 'rgba(245,248,255,.88)';
      c.lineWidth = Math.max(.8, L.line * .48);
      c.beginPath();
      for (const [x, y] of p) { c.moveTo(x + n, y); c.arc(x, y, n, 0, 6.2832); }
      c.moveTo(p[0][0] + n, p[0][1] - n * .15);
      c.quadraticCurveTo(L.cx, p[0][1] - n * .55, p[1][0] - n, p[1][1] - n * .15);
      c.stroke();
    }
    if (which === 'headphones') {
      const r = L.d;
      const beat = Math.sin(t * 8.0);
      const bob = beat * (r * 0.024);
      const glowBeat = 0.5 + 0.5 * Math.sin(t * 10.0);

      const ox = L.eyeDx + L.rx + r * .24;
      const i = L.eyeCy + r * .02 + bob;
      const l = r * .17;
      const s = r * .36;
      const a = L.eyeCy - r * .4 + bob * 0.5;

      c.save();
      c.beginPath();
      c.moveTo(L.cx - ox, i - s * .3);
      c.bezierCurveTo(L.cx - ox, a, L.cx + ox, a, L.cx + ox, i - s * .3);
      c.lineCap = 'round';
      c.strokeStyle = '#AEB3BF';
      c.lineWidth = r * .075;
      c.stroke();
      c.strokeStyle = '#E9EBF0';
      c.lineWidth = r * .045;
      c.stroke();

      for (const u of [-1, 1]) {
        const d = L.cx + u * ox;
        c.fillStyle = '#E9EBF0';
        c.beginPath();
        c.roundRect(d - l / 2, i - s / 2, l, s, l * .45);
        c.fill();

        c.save();
        c.shadowColor = 'rgba(56, 189, 248, 0.9)';
        c.shadowBlur = (r * 0.12) * (0.6 + 0.4 * glowBeat);
        c.fillStyle = `rgba(56, 189, 248, ${0.75 + 0.25 * glowBeat})`;
        c.beginPath();
        c.roundRect(d + u * l * .07, i - s * .28, l * .22, s * .56, l * .1);
        c.fill();
        c.restore();
      }
      c.restore();
    }
    if (which === 'bow') {
      c.save();
      c.translate(L.cx + L.eyeDx + L.rx + L.d * .14, L.eyeCy - L.ry - L.d * .03);
      c.rotate(18 * Math.PI / 180);
      const b = L.d * .11;
      c.fillStyle = '#FF7FB5';
      for (const l of [-1, 1]) {
        c.beginPath();
        c.moveTo(0, 0);
        c.bezierCurveTo(l * b * .6, -b * 1.2, l * b * 1.5, -b * .9, l * b * 1.35, 0);
        c.bezierCurveTo(l * b * 1.5, b * .9, l * b * .6, b * 1.2, 0, 0);
        c.fill();
      }
      c.fillStyle = '#E0457F';
      c.beginPath();
      c.ellipse(0, 0, b * .32, b * .36, 0, 0, 6.2832);
      c.fill();
      c.restore();
    }
  }

  love(c, L, t, amount) {
    const pu = 1 + Math.sin(t * 9) * .06;
    for (const s of [-1, 1]) {
      const [x, y] = L.eye(s), a = L.rx * 3.1 * pu;
      const g = c.createLinearGradient(x, y - a / 2, x, y + a / 2);
      g.addColorStop(0, '#FFB3C8');
      g.addColorStop(.62, '#FF5C8A');
      g.addColorStop(1, '#E94478');
      c.shadowColor = 'rgba(255,92,138,.55)';
      c.shadowBlur = L.d * .12;
      c.fillStyle = g;
      heart(c, x, y, a);
      c.fill();
      c.shadowBlur = 0;
    }
    for (let i = 0; i < 3; i++) {
      const l = (t * .72 + i / 3) % 1;
      const a = L.cx + (i % 2 ? 1 : -1) * L.eyeDx * 1.34;
      const u = L.eyeCy - L.ry * .5 - l * L.d * .5;
      c.globalAlpha = Math.sin(Math.PI * l) * .8;
      c.fillStyle = '#FF5C8A';
      heart(c, a, u, L.d * .17);
      c.fill();
    }
    c.globalAlpha = 1;
  }
}

window.Face = Face;
})();
