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
