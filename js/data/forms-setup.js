/* ============ forms-setup.js — special and regional forms as Pokémon (standalone build) ============
 *
 * Turns G.FORM_LIST (data/forms.js) into Pokédex entries in G.DEX_BY and
 * G.FORMS, built from the base species with the form's own types. They are NOT
 * in G.DEX, so they never show up as wild Pokémon, in the gacha or in rifts:
 * they come from the Halloween Shop and live in the Special tab of the Pokédex.
 * Shadow forms trade some health for power (×0.9 health, ×1.1 attack) and wear
 * a dark aura in runs.
 */
G.FORMS = [];
G.FORM_BY = {};
(() => {
  for (const f of G.FORM_LIST || []) {
    const base = G.DEX_BY[f.base];
    if (!base) continue;
    const e = Object.assign({}, base, {
      dex: f.dex, name: f.name, types: f.types || base.types.slice(), starter: false, gen: 10,
      form: f.kind, base: f.base, leg: false, legBase: !!base.leg
    });
    if (f.kind === 'shadow') {
      e.hp = Math.round(base.hp * 0.9);
      for (const k of ['atk', 'pa', 'sa']) if (base[k]) e[k] = +(base[k] * 1.1).toFixed(3);
    }
    G.DEX_BY[f.dex] = e;
    G.FORM_BY[f.dex] = e;
    G.FORMS.push(e);
    // Abilities: the form's own (when the game knows them), otherwise the base species'.
    const own = (f.abil || []).map(a => (a && G.ABIL && G.ABIL[a] ? a : 0));
    if (G.DEX_ABIL) G.DEX_ABIL[f.dex] = own[0] ? [own[0], own[1] || 0, own[2] || 0] : (G.DEX_ABIL[f.base] || [0, 0, 0]).slice();
  }
  // TMs: what the base species learns.
  const tmOf = G.TM_OF;
  G.TM_OF = dex => tmOf(G.FORM_BY[dex] ? G.FORM_BY[dex].base : dex);
})();
/** Pokédex number to show for a Pokémon (forms show their base species' number). */
G.dexNo = dex => (G.FORM_BY[dex] ? G.FORM_BY[dex].base : dex);

/*
 * Shadow Pokémon aura (standalone build): dark purple flames licking up around
 * the body, like the Shadow Pokémon of the games. Drawn in two passes around
 * the sprite: `back` (the big flames, behind it) and front (embers rising).
 * Everything is worked out from the clock, so it needs no state.
 */
G.drawShadowAura = (ctx, x, y, r, bodyH, back) => {
  const t = performance.now() / 1000;
  const W = Math.max(10, r * 1.7), H = Math.max(18, bodyH * 0.95);
  ctx.save();
  if (back) {
    // Dark glow on the ground and around the body.
    let g = ctx.createRadialGradient(x, y - H * 0.35, 2, x, y - H * 0.35, W * 1.6);
    g.addColorStop(0, 'rgba(70,10,110,.42)'); g.addColorStop(1, 'rgba(40,0,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y - H * 0.35, W * 1.6, H * 0.95, 0, 0, 6.2832); ctx.fill();
    // Flame tongues: a ring of teardrops along the outline, each flickering on its own.
    const N = 9;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 6.2832 + t * 0.6;
      const side = Math.cos(a), depth = Math.sin(a);
      const fx = x + side * W * 0.62, fy = y - 2 + depth * 3;
      const k = 0.65 + 0.35 * Math.sin(t * 7.3 + i * 2.1) + 0.15 * Math.sin(t * 13 + i);
      const fh = H * (0.55 + 0.45 * (1 - Math.abs(side))) * k, fw = W * 0.34;
      const sway = Math.sin(t * 4 + i * 1.7) * fw * 0.5;
      const fl = ctx.createLinearGradient(fx, fy, fx, fy - fh);
      fl.addColorStop(0, 'rgba(25,0,45,.85)'); fl.addColorStop(0.45, 'rgba(110,30,170,.7)'); fl.addColorStop(1, 'rgba(210,120,255,0)');
      ctx.fillStyle = fl;
      ctx.beginPath();
      ctx.moveTo(fx - fw, fy);
      ctx.quadraticCurveTo(fx - fw * 0.9, fy - fh * 0.55, fx + sway, fy - fh);
      ctx.quadraticCurveTo(fx + fw * 0.9, fy - fh * 0.55, fx + fw, fy);
      ctx.closePath(); ctx.fill();
    }
  } else {
    // Embers drifting up in front of the sprite.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const life = 1.4, ph = ((t + i * 0.37) % life) / life;
      const ex = x + Math.sin(i * 12.9 + Math.floor((t + i * 0.37) / life) * 3.1) * W * 0.8 + Math.sin(t * 3 + i) * 2;
      const ey = y - 4 - ph * H * 1.25;
      ctx.globalAlpha = (1 - ph) * 0.8;
      ctx.fillStyle = i % 2 ? '#c77dff' : '#ff6bf0';
      const s = 1.6 + (1 - ph) * 1.4;
      ctx.fillRect(ex - s / 2, ey - s / 2, s, s);
    }
  }
  ctx.restore();
};
