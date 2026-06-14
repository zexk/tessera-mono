// app.jsx — Tessera Mono specimen / design doc

const { useState, useEffect, useRef, useMemo } = React;

// ─── Tweak defaults ──────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "weight": 0,
  "rounding": 0,
  "ligatures": false,
  "alts": false,
  "mode": "noir",
  "specimenPx": 2,
  "specimenText": "the quick brown fox\njumps over the lazy dog\nTHE QUICK BROWN FOX\nJUMPS OVER THE LAZY DOG\n0123456789 !@#$%^&*()\nif x != 0 -> result <= max\nasync fn(a, b) => a + b ~~ b"
}/*EDITMODE-END*/;

// ─── Color tokens ────────────────────────────────────────────────────────────
const PALETTES = {
  noir: {
    bg: '#181818',
    panel: '#282828',
    ink: '#d8d8d8',
    muted: '#585858',
    rule: '#383838',
    grid: 'rgba(216,216,216,0.06)',
    baseline: 'rgba(124,175,194,0.45)',
    accent: '#7cafc2',
    accentSoft: '#383838'
  },
  paper: {
    bg: '#f4efe4',
    panel: '#ebe4d3',
    ink: '#1f1d18',
    muted: '#8a8170',
    rule: '#cdc4ad',
    grid: 'rgba(31,29,24,0.10)',
    baseline: 'rgba(184,70,46,0.55)',
    accent: '#b8462e',
    accentSoft: '#dfa089'
  },
  amber: {
    bg: '#16140d',
    panel: '#1e1a10',
    ink: '#f0c267',
    muted: '#7c6a3f',
    rule: '#3a311c',
    grid: 'rgba(240,194,103,0.08)',
    baseline: 'rgba(240,194,103,0.45)',
    accent: '#f8d98a',
    accentSoft: '#5a4a20'
  },
  phosphor: {
    bg: '#0a120d',
    panel: '#0f1a13',
    ink: '#9be8a6',
    muted: '#4a7a55',
    rule: '#1f2e23',
    grid: 'rgba(155,232,166,0.08)',
    baseline: 'rgba(155,232,166,0.40)',
    accent: '#caffd6',
    accentSoft: '#2e4e36'
  }
};

// ─── Tab bar ─────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onSelect }) {
  return (
    <div className="tab-bar">
      {tabs.map((t, i) => (
        <button key={i} className={'tab' + (active === i ? ' tab-on' : '')} onClick={() => onSelect(i)}>
          {t}
        </button>
      ))}
    </div>
  );
}

// ─── Section nav ─────────────────────────────────────────────────────────────
function SectionNav({ pal }) {
  const links = [
    ['specimen','Specimen'],['atlas','Atlas'],['box','Box drawing'],
    ['math','Math'],['icons','Icons'],['nerd','Nerd Fonts'],
    ['specs','System'],['lig','Ligatures'],
  ];
  return (
    <nav className="section-nav" style={{ background: pal.bg, borderBottomColor: pal.rule }}>
      {links.map(([id, label]) => (
        <a key={id} href={'#' + id} style={{ color: pal.muted }}>{label}</a>
      ))}
    </nav>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function Section({ id, num, title, sub, children, accent }) {
  return (
    <section id={id} className="section" data-screen-label={`${num} ${title}`}>
      <div className="section-hd">
        <div className="section-hd-l">
          <span className="section-num" style={{ color: accent }}>§{num}</span>
          <h2 className="section-title">{title}</h2>
        </div>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero({ pal, weight, rounding }) {
  const nerdDrawn = NERD_CATEGORIES.reduce((a, c) => a + rangeDrawn(c), 0);
  return (
    <header className="hero">
      <div className="hero-top">
        <div className="hero-mark">
          <div className="mark-square" style={{ borderColor: pal.ink }}>
            <TextRun text="Tm" px={6} bold={weight} rounding={rounding} ink={pal.ink} paper={pal.bg} />
          </div>
          <div className="hero-meta">
            <div className="hero-meta-row"><span>family</span><b>Tessera Mono</b></div>
            <div className="hero-meta-row"><span>version</span><b>0.1.0-draft</b></div>
            <div className="hero-meta-row"><span>cell</span><b>8 × 16 px</b></div>
            <div className="hero-meta-row"><span>cuts</span><b>3</b></div>
            <div className="hero-meta-row"><span>license</span><b>SIL OFL 1.1 (planned)</b></div>
          </div>
        </div>
      </div>

      <div className="hero-display">
        <TextRun
          text={"Tessera\nMono"}
          px={18} bold={weight} rounding={rounding}
          ink={pal.ink} paper={pal.bg}
          lineHeight={17}
        />
      </div>

      <div className="hero-bottom">
        <p className="hero-tagline">
          A neoretro bitmap monospace. Pixel-perfect at native cells,
          legible from 1080p up to 4K, designed to carry the full Nerd Fonts glyph set.
        </p>
        <div className="hero-stats">
          <div><b>95</b><span>ASCII printable, hand-drawn</span></div>
          <div><b>52</b><span>Latin diacritic composites</span></div>
          <div><b>128</b><span>Box drawing, algorithmic</span></div>
          <div><b>32</b><span>Block elements</span></div>
          <div><b>{nerdDrawn}</b><span>Nerd Fonts drawn so far</span></div>
        </div>
      </div>
    </header>
  );
}

// ─── Live specimen ───────────────────────────────────────────────────────────
function Specimen({ pal, weight, rounding, specimenPx, setTweak, text, ligatures, alts }) {
  return (
    <Section id="specimen" num="01" title="Specimen" accent={pal.accent}
      sub="Type anything. Scrub the pixel scale. The font renders the same bitmap at every integer multiple — no antialiasing, no hinting, just the grid.">
      <div className="specimen-grid">
        <div className="specimen-pane" style={{ background: pal.panel, borderColor: pal.rule }}>
          <TextRun
            text={text}
            px={specimenPx} bold={weight} rounding={rounding}
            ink={pal.ink} paper={pal.panel}
            lineHeight={20}
            maxWidth={1100}
            ligatures={ligatures} alts={alts} />
        </div>
        <div className="specimen-controls">
          <label className="ctrl">
            <span>Sample text</span>
            <textarea
              value={text}
              onChange={(e) => setTweak('specimenText', e.target.value)}
              rows={6}
              style={{ background: pal.panel, color: pal.ink, borderColor: pal.rule }}
            />
          </label>
          <label className="ctrl">
            <span>Pixel scale <b>{specimenPx}×</b> → {8 * specimenPx}×{16 * specimenPx}px cell</span>
            <input type="range" min="1" max="10" step="1"
              value={specimenPx}
              onChange={(e) => setTweak('specimenPx', +e.target.value)} />
          </label>
          <div className="ctrl-foot">
            <span>Recommended scales</span>
            <div className="chip-row">
              {[
                { px: 2, label: '2× — code editor' },
                { px: 3, label: '3× — comfy 1080p' },
                { px: 4, label: '4× — 1440p body' },
                { px: 6, label: '6× — 4K body' }
              ].map(s => (
                <button key={s.px}
                  className={'chip' + (specimenPx === s.px ? ' chip-on' : '')}
                  style={{ borderColor: pal.rule, color: specimenPx === s.px ? pal.bg : pal.ink, background: specimenPx === s.px ? pal.ink : 'transparent' }}
                  onClick={() => setTweak('specimenPx', s.px)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Atlas ───────────────────────────────────────────────────────────────────
function AtlasGroup({ title, codepoints, pal, weight, rounding, px = 6, alts = false }) {
  return (
    <div className="atlas-group">
      <div className="atlas-group-hd">
        <span className="atlas-group-title">{title}</span>
        <span className="atlas-group-count">{codepoints.length} glyphs</span>
      </div>
      <div className="atlas-grid">
        {codepoints.map(cp => (
          <GlyphCell key={cp} cp={cp} px={px} bold={weight} rounding={rounding}
            ink={pal.ink} paper={pal.bg} grid={pal.grid} baseline={pal.baseline} alts={alts} />
        ))}
      </div>
    </div>
  );
}

function Atlas({ pal, weight, rounding, alts }) {
  const upper = []; for (let i = 0x41; i <= 0x5a; i++) upper.push(i);
  const lower = []; for (let i = 0x61; i <= 0x7a; i++) lower.push(i);
  const digits = []; for (let i = 0x30; i <= 0x39; i++) digits.push(i);
  const punct1 = [0x21,0x22,0x23,0x24,0x25,0x26,0x27,0x28,0x29,0x2a,0x2b,0x2c,0x2d,0x2e,0x2f];
  const punct2 = [0x3a,0x3b,0x3c,0x3d,0x3e,0x3f,0x40,0x5b,0x5c,0x5d,0x5e,0x5f,0x60,0x7b,0x7c,0x7d,0x7e];
  const ext = [
    0xa1,0xa2,0xa3,0xa5,0xa6,0xa7,0xa8,0xa9,0xab,0xac,0xae,0xaf,
    0xb0,0xb1,0xb2,0xb3,0xb4,0xb5,0xb6,0xb7,0xb8,0xb9,0xbb,0xbc,0xbd,0xbe,
    0xbf,0xc6,0xd7,0xd8,0xdf,0xe6,0xf7,0xf8
  ];
  const dia = Object.keys(TESSERA.DIACRITICS).map(k => +k);

  const groups = [
    { title: 'Uppercase',   codepoints: upper },
    { title: 'Lowercase',   codepoints: lower },
    { title: 'Digits',      codepoints: digits },
    { title: 'Punctuation', codepoints: [...punct1, ...punct2] },
    { title: 'Extended',    codepoints: ext },
    { title: 'Diacritics',  codepoints: dia },
  ];
  const [tab, setTab] = useState(0);

  return (
    <Section id="atlas" num="02" title="Atlas" accent={pal.accent}
      sub="Every glyph on its 8×16 grid. Rounding clips outside corners; bold dilates one pixel.">
      <TabBar tabs={groups.map(g => `${g.title} · ${g.codepoints.length}`)} active={tab} onSelect={setTab} />
      <AtlasGroup {...groups[tab]} pal={pal} weight={weight} rounding={rounding} alts={alts} />
    </Section>
  );
}

// ─── Box drawing demo ────────────────────────────────────────────────────────
function BoxDemo({ pal, weight, rounding }) {
  const tui = [
    '┌──────────────── tessera@dev ─────────────────┐',
    '│ ╭─ files ─────────────╮ ╭─ preview ────────╮ │',
    '│ │ ▸ glyphs.js   28K   │ │ ████░░░░░░  42%  │ │',
    '│ │ ▸ renderer.jsx  6K  │ │ rendering atlas. │ │',
    '│ │ ▸ app.jsx     11K   │ │ cell 8×16  cap 9 │ │',
    '│ │ ▸ index.html  4K    │ │ baseline @ row10 │ │',
    '│ │ ▾ assets/           │ │ ascend  desc  2  │ │',
    '│ │   logo.svg          │ │ ─────────────────│ │',
    '│ ╰─────────────────────╯ ╰──────────────────╯ │',
    '│ ░▒▓██▓▒░  ◆ ready  ◆ 3 axes  ◆ 95 glyphs    │',
    '└──────────────────────────────────────────────┘'
  ].join('\n');

  const box = [
    '┌─┬─┐  ╔═╦═╗  ╭─┬─╮  ┏━┳━┓',
    '├─┼─┤  ╠═╬═╣  ├─┼─┤  ┣━╋━┫',
    '└─┴─┘  ╚═╩═╝  ╰─┴─╯  ┗━┻━┛'
  ].join('\n');

  return (
    <Section id="box" num="03" title="Box drawing" accent={pal.accent}
      sub="The TUI test. U+2500–U+257F generated from a 4-arm encoding (left, right, up, down × light / heavy / double). Block elements (U+2580–U+259F) drive shading.">
      <div className="box-grid">
        <div className="box-panel" style={{ background: pal.panel, borderColor: pal.rule }}>
          <div className="box-panel-label" style={{ color: pal.muted }}>terminal mock</div>
          <TextRun text={tui} px={2} bold={weight} rounding={rounding} ink={pal.ink} paper={pal.panel} lineHeight={17} />
        </div>
        <div className="box-panel" style={{ background: pal.panel, borderColor: pal.rule }}>
          <div className="box-panel-label" style={{ color: pal.muted }}>joinery — light / double / rounded / heavy</div>
          <TextRun text={box} px={2} bold={weight} rounding={rounding} ink={pal.ink} paper={pal.panel} lineHeight={20} />
        </div>
      </div>
    </Section>
  );
}

// ─── Math & arrows ───────────────────────────────────────────────────────────
function MathDemo({ pal, weight, rounding, ligatures, alts }) {
  const a = '∀x ∈ N: x ≥ 0  ∧  x ≠ ∞';
  const b = '∑(i=1..n) i = n(n+1)/2';
  const c = '⇐  ←  ↑  ↓  →  ⇒  ↔';
  const d = '√(a² + b²) ≈ c  ±  ε';
  const e = '∩ ∪ ∈ ∃ ∀ ∏ × ÷ ≤ ≥';

  return (
    <Section id="math" num="04" title="Math & arrows" accent={pal.accent}
      sub="A curated selection covering common operators, set notation, and arrow forms. Drawn to the same 8×16 cell — math reads at terminal pitch.">
      <div className="math-stack" style={{ background: pal.panel, borderColor: pal.rule }}>
        {[a, b, c, d, e].map((s, i) => (
          <TextRun key={i} text={s} px={2} bold={weight} rounding={rounding} ink={pal.ink} paper={pal.panel} lineHeight={20} ligatures={ligatures} alts={alts} />
        ))}
      </div>
    </Section>
  );
}

// ─── Nerd Fonts roadmap ──────────────────────────────────────────────────────
const NERD_CATEGORIES = [
  { name: 'Powerline core',        phase: 'P0', ranges: [[0xE0A0, 0xE0A3], [0xE0B0, 0xE0B3]] },
  { name: 'Powerline extra',       phase: 'P0', ranges: [[0xE0A4, 0xE0AB], [0xE0B4, 0xE0C8]] },
  { name: 'IEC Power Symbols',     phase: 'P0', ranges: [[0x23FB, 0x23FE]] },
  { name: 'Pomicons',              phase: 'P0', ranges: [[0xE000, 0xE00A]] },
  { name: 'Devicons',              phase: 'P0', ranges: [[0xE700, 0xE7C5]] },
  { name: 'Codicons (VSCode)',     phase: 'P0', ranges: [[0xEA60, 0xEC1E]] },
  { name: 'Seti-UI + Custom',      phase: 'P0', ranges: [[0xE5FA, 0xE62B]] },
  { name: 'Font Logos',            phase: 'P1', ranges: [[0xF300, 0xF375]] },
  { name: 'Octicons',              phase: 'P1', ranges: [[0xF400, 0xF532]] },
  { name: 'Font Awesome',          phase: 'P1', ranges: [[0xED00, 0xF2FF]] },
  { name: 'Font Awesome Ext',      phase: 'P2', ranges: [[0xE200, 0xE2A9]] },
  { name: 'Weather Icons',         phase: 'P2', ranges: [[0xE300, 0xE3E3]] },
  { name: 'Material Design Icons', phase: 'P2', ranges: [[0xF0001, 0xF1AF0]] }
];

function rangeCount(cat) {
  return cat.ranges.reduce((s, [lo, hi]) => s + (hi - lo + 1), 0);
}
function rangeDrawn(cat) {
  let n = 0;
  for (const [lo, hi] of cat.ranges) {
    for (let cp = lo; cp <= hi; cp++) if (TESSERA.GLYPHS[cp]) n++;
  }
  return n;
}
function rangeString(cat) {
  return cat.ranges.map(([lo, hi]) =>
    lo === hi
      ? 'U+' + lo.toString(16).toUpperCase().padStart(4, '0')
      : 'U+' + lo.toString(16).toUpperCase().padStart(4, '0') + '–U+' + hi.toString(16).toUpperCase().padStart(4, '0')
  ).join(', ');
}

// ─── Coverage grid — one cell per codepoint, lit if drawn ────────────────────
function CoverageGrid({ ranges, pal, accent }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const cps = [];
    for (const [lo, hi] of ranges) {
      for (let cp = lo; cp <= hi; cp++) cps.push(cp);
    }
    const total = cps.length;

    // Adaptive cell size — keep total width sane.
    const cell = total > 2000 ? 2 : total > 600 ? 3 : 4;
    const cols = total > 2000 ? 96 : total > 600 ? 64 : 40;
    const usedCols = Math.min(cols, total);
    const rows = Math.ceil(total / usedCols);

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = usedCols * cell;
    const h = rows * cell;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < total; i++) {
      const cp = cps[i];
      const x = (i % usedCols) * cell;
      const y = Math.floor(i / usedCols) * cell;
      const has = !!TESSERA.GLYPHS[cp];
      ctx.fillStyle = has ? accent : pal.rule;
      ctx.fillRect(x, y, cell - 1, cell - 1);
    }
  }, [ranges, pal, accent]);

  return <canvas ref={ref} style={{ display: 'block', imageRendering: 'pixelated' }} />;
}

function NerdRoadmap({ pal }) {
  const total = NERD_CATEGORIES.reduce((a, c) => a + rangeCount(c), 0);
  const drawn = NERD_CATEGORIES.reduce((a, c) => a + rangeDrawn(c), 0);
  const phases = ['P0', 'P1', 'P2'];

  const phaseLabel = {
    P0: 'Phase 0 — essential terminal',
    P1: 'Phase 1 — developer breadth',
    P2: 'Phase 2 — full coverage'
  };

  return (
    <Section id="nerd" num="06" title="Nerd Fonts coverage" accent={pal.accent}
      sub={`${total.toLocaleString()} codepoints across ${NERD_CATEGORIES.length} sources — one cell per codepoint, lit when drawn. Terminal essentials first.`}>
      <div className="cov-summary" style={{ background: pal.panel, borderColor: pal.rule }}>
        <div className="cov-summary-l">
          <span className="cov-num">{drawn.toLocaleString()}</span>
          <span className="cov-of">/ {total.toLocaleString()} drawn</span>
        </div>
        <div className="cov-bar">
          <div className="cov-bar-fill" style={{ width: `${(drawn / total * 100).toFixed(2)}%`, background: pal.accent }} />
        </div>
        <div className="cov-summary-r" style={{ color: pal.muted }}>
          <span>v0.1.0-draft · {((drawn / total) * 100).toFixed(2)}%</span>
        </div>
      </div>

      {phases.map(p => {
        const cats = NERD_CATEGORIES.filter(c => c.phase === p);
        const phaseTotal = cats.reduce((a, c) => a + rangeCount(c), 0);
        const phaseDrawn = cats.reduce((a, c) => a + rangeDrawn(c), 0);
        return (
          <div key={p} className="phase">
            <div className="phase-hd">
              <span className="phase-pill" style={{ background: pal.ink, color: pal.bg }}>{p}</span>
              <span className="phase-title">{phaseLabel[p]}</span>
              <span className="phase-count" style={{ color: pal.muted }}>
                {phaseDrawn.toLocaleString()} / {phaseTotal.toLocaleString()} across {cats.length} sets
              </span>
            </div>
            <div className="h-card-row">
              {cats.map(c => {
                const cnt = rangeCount(c);
                const drw = rangeDrawn(c);
                const pct = (drw / cnt * 100);
                return (
                  <div key={c.name} className="cov-card" style={{ background: pal.panel, borderColor: pal.rule }}>
                    <div className="cov-card-hd">
                      <span className="cov-card-name">{c.name}</span>
                      <span className="cov-card-count">
                        <b style={{ color: pal.ink }}>{drw.toLocaleString()}</b>
                        <span style={{ color: pal.muted }}> / {cnt.toLocaleString()}</span>
                      </span>
                    </div>
                    <div className="cov-card-range" style={{ color: pal.muted }}>{rangeString(c)}</div>
                    <div className="cov-card-bar">
                      <div className="cov-card-bar-fill" style={{
                        width: `${pct.toFixed(2)}%`,
                        background: pal.accent
                      }} />
                    </div>
                    <div style={{ paddingTop: 4 }}>
                      <CoverageGrid ranges={c.ranges} pal={pal} accent={pal.accent} />
                    </div>
                    <div className="cov-card-status" style={{ color: pal.muted }}>
                      {drw === 0 ? 'planned · 0%' :
                       drw === cnt ? `complete · 100%` :
                       `${pct.toFixed(1)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </Section>
  );
}

// ─── Powerline & icons ───────────────────────────────────────────────────────
const POWERLINE_PALETTES = {
  noir: {
    user:   { bg: '#ba8baf', fg: '#181818' },
    path:   { bg: '#7cafc2', fg: '#181818' },
    branch: { bg: '#ab4642', fg: '#f8f8f8' },
    status: { bg: '#383838', fg: '#d8d8d8' },
    ok:     { bg: '#a1b56c', fg: '#181818' },
    err:    { bg: '#ab4642', fg: '#f8f8f8' },
    warn:   { bg: '#f7ca88', fg: '#181818' }
  },
  paper: {
    user:   { bg: '#2a3a6e', fg: '#f4efe4' },
    path:   { bg: '#6b8db0', fg: '#1f1d18' },
    branch: { bg: '#b8462e', fg: '#f4efe4' },
    status: { bg: '#1f1d18', fg: '#f0c267' },
    ok:     { bg: '#3e7a4c', fg: '#f4efe4' },
    err:    { bg: '#a0331b', fg: '#f4efe4' },
    warn:   { bg: '#d4a64b', fg: '#1f1d18' }
  },
  amber: {
    user:   { bg: '#3a311c', fg: '#f0c267' },
    path:   { bg: '#5a4a20', fg: '#f8d98a' },
    branch: { bg: '#9a7530', fg: '#16140d' },
    status: { bg: '#f0c267', fg: '#16140d' },
    ok:     { bg: '#7c6a3f', fg: '#16140d' },
    err:    { bg: '#c04a20', fg: '#f8d98a' },
    warn:   { bg: '#f8d98a', fg: '#3a311c' }
  },
  phosphor: {
    user:   { bg: '#1f2e23', fg: '#9be8a6' },
    path:   { bg: '#2e4e36', fg: '#caffd6' },
    branch: { bg: '#4a7a55', fg: '#0a120d' },
    status: { bg: '#caffd6', fg: '#0a120d' },
    ok:     { bg: '#6aa872', fg: '#0a120d' },
    err:    { bg: '#a64a4a', fg: '#fff0e8' },
    warn:   { bg: '#cab46a', fg: '#0a120d' }
  }
};

function PowerlineBar({ segments, pageBg, px = 4, weight = 0, rounding = 0, capRight = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const W = TESSERA.CELL_W, H = TESSERA.CELL_H;

    // Build cell list: each segment's text padded with a space on each side,
    // followed by a right-pointing solid arrow transitioning to the next bg.
    const cells = [];
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const text = ' ' + s.text + ' ';
      for (const ch of text) {
        cells.push({ cp: ch.codePointAt(0), bg: s.bg, fg: s.fg });
      }
      const next = segments[i + 1];
      if (next || capRight) {
        cells.push({ cp: 0xe0b0, bg: next ? next.bg : pageBg, fg: s.bg });
      }
    }

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cw = W * px, ch = H * px;
    const Wpx = cells.length * cw, Hpx = ch;
    canvas.width = Wpx * dpr;
    canvas.height = Hpx * dpr;
    canvas.style.width = Wpx + 'px';
    canvas.style.height = Hpx + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      ctx.fillStyle = c.bg;
      ctx.fillRect(i * cw, 0, cw, ch);
      const g = TESSERA.getGlyph(c.cp);
      if (g) drawGlyph(ctx, g, i * cw, 0, px, { color: c.fg, bold: weight, rounding });
    }
  }, [segments, pageBg, px, weight, rounding, capRight]);

  return <canvas ref={ref} style={{ display: 'block' }} />;
}

// ─── Starship-style prompts ──────────────────────────────────────────────────
const STARSHIP_COLORS = {
  noir:     { dir: '#7cafc2', branch: '#ba8baf', ok: '#a1b56c', warn: '#f7ca88', err: '#ab4642', muted: '#585858', vi: '#86c1b9', dur: '#dc9656' },
  paper:    { dir: '#2a6fa3', branch: '#b8462e', ok: '#3e7a4c', warn: '#d4a64b', err: '#a0331b', muted: '#8a8170', vi: '#5a4ea8', dur: '#8a6f3f' },
  amber:    { dir: '#f0c267', branch: '#f8d98a', ok: '#9ab874', warn: '#f8d98a', err: '#e07050', muted: '#7c6a3f', vi: '#c0a85a', dur: '#a89058' },
  phosphor: { dir: '#9be8a6', branch: '#caffd6', ok: '#6aa872', warn: '#cab46a', err: '#e69090', muted: '#4a7a55', vi: '#8aa8c8', dur: '#7a9a78' }
};

function StarshipPiece({ text, ink, paper, px, weight, rounding }) {
  return <TextRun text={text} px={px} bold={weight} rounding={rounding} ink={ink} paper={paper} />;
}

function StarshipLine({ pieces, paper, px, weight, rounding }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {pieces.map((p, i) => (
        <StarshipPiece key={i} text={p.text} ink={p.ink} paper={paper} px={px} weight={weight} rounding={rounding} />
      ))}
    </div>
  );
}

function StarshipCard({ pal, mode, weight, rounding }) {
  const c = STARSHIP_COLORS[mode] || STARSHIP_COLORS.paper;
  const px = 2;
  const paper = pal.panel;

  const prompts = [
    {
      label: 'clean — main branch, fast',
      line1: [
        { text: '~/code/tessera', ink: c.dir },
        { text: '  ', ink: c.muted },
        { text: '\uf126 main',   ink: c.branch },
        { text: '  ', ink: c.muted },
        { text: '\u2713',        ink: c.ok },
        { text: '  ',            ink: c.muted },
        { text: '\u231a 1.2s',   ink: c.dur }
      ],
      promptChar: '\u276f',
      promptInk: c.ok
    },
    {
      label: 'dirty tree — staged + modified + ahead of origin',
      line1: [
        { text: '~/code/tessera', ink: c.dir },
        { text: '  ', ink: c.muted },
        { text: '\uf126 feat/icons', ink: c.branch },
        { text: ' [', ink: c.muted },
        { text: '\u2731 2',  ink: c.warn },
        { text: ' ',       ink: c.muted },
        { text: '\u271a 3', ink: c.ok },
        { text: ' ',       ink: c.muted },
        { text: '\u21e1 1', ink: c.branch },
        { text: ']',       ink: c.muted },
        { text: '  ', ink: c.muted },
        { text: '\u231a 12.4s', ink: c.dur }
      ],
      promptChar: '\u276f',
      promptInk: c.ok
    },
    {
      label: 'behind & diverged — needs pull / rebase',
      line1: [
        { text: '/etc/nginx', ink: c.dir },
        { text: '  ', ink: c.muted },
        { text: '\uf126 main', ink: c.branch },
        { text: ' [', ink: c.muted },
        { text: '\u21e3 4',    ink: c.warn },
        { text: ' ',           ink: c.muted },
        { text: '\u21d5 2',    ink: c.err },
        { text: ']',           ink: c.muted },
        { text: '  ', ink: c.muted },
        { text: '\u231a 3.0s', ink: c.dur }
      ],
      promptChar: '\u276f',
      promptInk: c.ok
    },
    {
      label: 'failed — last command exited non-zero',
      line1: [
        { text: '~/code/tessera', ink: c.dir },
        { text: '  ', ink: c.muted },
        { text: '\uf126 main', ink: c.branch },
        { text: ' [', ink: c.muted },
        { text: '\u2718 exit 127', ink: c.err },
        { text: ']', ink: c.muted },
        { text: '  ', ink: c.muted },
        { text: '\u231b 2.8s', ink: c.dur }
      ],
      promptChar: '\u276f',
      promptInk: c.err
    },
    {
      label: 'vi normal mode — left chevron, ready for nav',
      line1: [
        { text: '~/code/tessera', ink: c.dir },
        { text: '  ', ink: c.muted },
        { text: '\uf126 main', ink: c.branch },
        { text: '  ', ink: c.muted },
        { text: '\u2713', ink: c.ok },
        { text: '  ',     ink: c.muted },
        { text: '\u231a 1.2s', ink: c.dur }
      ],
      promptChar: '\u276e',
      promptInk: c.vi
    }
  ];

  const symbols = [
    { cp: 0x276f, name: 'prompt' },
    { cp: 0x276e, name: 'vi-mode' },
    { cp: 0x2713, name: 'clean' },
    { cp: 0x2717, name: 'fail' },
    { cp: 0x2718, name: 'deleted' },
    { cp: 0x271a, name: 'staged' },
    { cp: 0x2731, name: 'modified' },
    { cp: 0x21e1, name: 'ahead' },
    { cp: 0x21e3, name: 'behind' },
    { cp: 0x21d5, name: 'diverged' },
    { cp: 0x21bb, name: 'redo' },
    { cp: 0x231a, name: 'watch' },
    { cp: 0x231b, name: 'hourglass' }
  ];

  return (
    <div style={{ background: paper, borderColor: pal.rule, border: '1px solid', padding: 24,
                  display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="box-panel-label" style={{ color: pal.muted }}>
        starship prompts — ❯ at the prompt, ✓ ✘ ✚ ⇡ ⇣ ⇕ for git status
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {prompts.map((p, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <StarshipLine pieces={p.line1} paper={paper} px={px} weight={weight} rounding={rounding} />
            <StarshipPiece text={p.promptChar + ' '} ink={p.promptInk} paper={paper}
              px={px} weight={weight} rounding={rounding} />
            <span style={{ fontFamily: 'var(--mono-font)', fontSize: 10, color: pal.muted,
                           letterSpacing: '.04em', textTransform: 'uppercase' }}>
              {p.label}
            </span>
          </div>
        ))}
      </div>

      {/* Symbol legend */}
      <div style={{ paddingTop: 18, borderTop: `1px solid ${pal.rule}` }}>
        <div className="box-panel-label" style={{ color: pal.muted, marginBottom: 14 }}>
          symbol legend — U+27xx dingbats &amp; U+21xx arrows
        </div>
        <div style={{ display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: 14 }}>
          {symbols.map(s => (
            <div key={s.cp} style={{ display: 'flex', gap: 10, alignItems: 'center',
                                     border: `1px solid ${pal.rule}`, padding: '8px 10px', background: pal.bg }}>
              <GlyphCell cp={s.cp} px={4} bold={weight} rounding={rounding}
                ink={pal.ink} paper={pal.bg} label={false} />
              <div style={{ fontFamily: 'var(--mono-font)', fontSize: 10, lineHeight: 1.5,
                            display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ color: pal.ink, fontWeight: 500 }}>{s.name}</span>
                <span style={{ color: pal.muted }}>U+{s.cp.toString(16).toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconsPowerline({ pal, mode, weight, rounding }) {
  const plp = POWERLINE_PALETTES[mode] || POWERLINE_PALETTES.paper;
  const ch = (cp) => String.fromCodePoint(cp);

  const prompts = [
    {
      label: 'developer prompt — happy path',
      segs: [
        { ...plp.user,   text: ch(0xf007) + ' alex@laptop' },
        { ...plp.path,   text: ch(0xf07c) + ' ~/code/tessera' },
        { ...plp.branch, text: ch(0xe0a0) + ' main' },
        { ...plp.ok,     text: ch(0xf00c) + ' clean' }
      ]
    },
    {
      label: 'feature branch — dirty tree',
      segs: [
        { ...plp.user,   text: ch(0xf2db) + ' dev-rig' },
        { ...plp.path,   text: ch(0xf07c) + ' src/glyphs' },
        { ...plp.branch, text: ch(0xe0a0) + ' feat/icons  +12 ' + ch(0xf071) + ' 2' },
        { ...plp.warn,   text: ch(0xe0a2) + ' staged' }
      ]
    },
    {
      label: 'root shell — failing build',
      segs: [
        { ...plp.user,   text: ch(0xf120) + ' root@build' },
        { ...plp.path,   text: ch(0xf07c) + ' /etc/nginx' },
        { ...plp.err,    text: ch(0xf00d) + ' build failed' },
        { ...plp.status, text: ch(0xf0e7) + ' 6.24s' }
      ]
    },
    {
      label: 'system status bar',
      segs: [
        { ...plp.status, text: ch(0xe712) + ' linux 6.8.2' },
        { ...plp.user,   text: ch(0xf013) + ' tessera-mono' },
        { ...plp.path,   text: ch(0xf0f3) + ' 3 notifications' },
        { ...plp.ok,     text: ch(0x23fd) + ' 92%' }
      ]
    }
  ];

  const separatorRow = [
    { cp: 0xe0b0, name: 'right solid' },
    { cp: 0xe0b1, name: 'right thin' },
    { cp: 0xe0b2, name: 'left solid' },
    { cp: 0xe0b3, name: 'left thin' }
  ];

  // Group all registered icons
  const byGroup = {};
  for (const cp of TESSERA.ICON_ORDER) {
    const info = TESSERA.ICONS[cp];
    if (!info) continue;
    (byGroup[info.group] = byGroup[info.group] || []).push(cp);
  }
  const groupOrder = [
    'Powerline', 'Power', 'Pomicons', 'Codicons', 'Octicons', 'Seti',
    'Files', 'Actions', 'Status', 'Symbols', 'Hardware', 'Places', 'People', 'Logos'
  ];

  const [tab, setTab] = useState(0);

  return (
    <Section id="icons" num="05" title="Powerline & icons" accent={pal.accent}
      sub="Phase-0 Nerd Fonts icons — Powerline, IEC power symbols, Pomicons, Codicons, Seti. Same 8×16 cell.">
      <TabBar tabs={['Powerline', 'Starship', 'Icon atlas']} active={tab} onSelect={setTab} />

      {tab === 0 && <>
        <div style={{ background: pal.panel, borderColor: pal.rule, border: '1px solid', padding: 24, display: 'flex', flexDirection: 'column', gap: 18, overflowX: 'auto' }}>
          <div className="box-panel-label" style={{ color: pal.muted }}>powerline prompts — colored segments connected by U+E0B0 separators</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {prompts.map((p, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <PowerlineBar segments={p.segs} pageBg={pal.panel} px={2} weight={weight} rounding={rounding} />
                <span style={{ fontFamily: 'var(--mono-font)', fontSize: 10, color: pal.muted, letterSpacing: '.04em', textTransform: 'uppercase' }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: pal.panel, borderColor: pal.rule, border: '1px solid', padding: 24 }}>
          <div className="box-panel-label" style={{ color: pal.muted, marginBottom: 16 }}>separator family — U+E0B0…E0B3 at 10×</div>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {separatorRow.map(s => (
              <div key={s.cp} style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                <GlyphCell cp={s.cp} px={10} bold={weight} rounding={rounding}
                  ink={pal.ink} paper={pal.panel} grid={pal.grid} baseline={pal.baseline} label={false} />
                <div style={{ fontFamily: 'var(--mono-font)', fontSize: 10, color: pal.muted, textAlign: 'center', lineHeight: 1.5 }}>
                  <div style={{ color: pal.ink }}>U+{s.cp.toString(16).toUpperCase()}</div>
                  <div>{s.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>}

      {tab === 1 && <StarshipCard pal={pal} mode={mode} weight={weight} rounding={rounding} />}

      {tab === 2 &&
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groupOrder.filter(g => byGroup[g]).map(group => (
            <div key={group} className="atlas-group">
              <div className="atlas-group-hd">
                <span className="atlas-group-title">{group}</span>
                <span className="atlas-group-count" style={{ color: pal.muted }}>{byGroup[group].length} drawn</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {byGroup[group].map(cp => {
                  const info = TESSERA.ICONS[cp];
                  const hex = cp.toString(16).toUpperCase().padStart(4, '0');
                  return (
                    <div key={cp} style={{ display: 'flex', gap: 12, alignItems: 'center', border: '1px solid', borderColor: pal.rule, padding: '10px 12px', background: pal.panel }}>
                      <GlyphCell cp={cp} px={5} bold={weight} rounding={rounding}
                        ink={pal.ink} paper={pal.bg} grid={pal.grid} label={false} />
                      <div style={{ fontFamily: 'var(--mono-font)', fontSize: 10, lineHeight: 1.5, display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span style={{ color: pal.ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.name}</span>
                        <span style={{ color: pal.muted }}>U+{hex}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      }
    </Section>
  );
}

// ─── Specs (metrics + axes) ──────────────────────────────────────────────────
function MetricsDiagram({ pal, weight, rounding }) {
  const ref = useRef(null);
  const px = 12;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const W = 8 * px * 3 + 60;  // 3 letters + padding
    const H = 16 * px + 40;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = pal.panel;
    ctx.fillRect(0, 0, W, H);

    // 3 letters: 'Hpg' to show cap, x, descender
    const letters = ['H', 'p', 'g'];
    const x0 = 40;
    const y0 = 20;
    for (let i = 0; i < 3; i++) {
      drawGrid(ctx, x0 + i * 8 * px, y0, px, pal.grid);
      const g = TESSERA.getGlyph(letters[i].charCodeAt(0));
      drawGlyph(ctx, g, x0 + i * 8 * px, y0, px, { color: pal.ink, bold: weight, rounding });
    }

    // Metric lines
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    const drawLine = (rowY, label) => {
      const y = Math.round(y0 + rowY * px) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x0 - 6, y);
      ctx.lineTo(x0 + 24 * px + 6, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = pal.accent;
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(label, x0 - 8, y + 3);
      ctx.setLineDash([4, 3]);
    };
    drawLine(0, 'top');
    drawLine(2, 'cap');
    drawLine(4, 'x-h');
    drawLine(11, 'base');
    drawLine(13, 'desc');
    ctx.setLineDash([]);
  }, [pal, weight, rounding]);

  return <canvas ref={ref} className="metrics-canvas" />;
}

function AxesGrid({ pal, rounding, weight, setTweak }) {
  return (
    <div className="axes-grid">
      <div className="axes-hd"></div>
      {[0, 0.5, 1].map(r => (
        <div key={'h' + r} className="axes-col-hd" style={{ color: pal.muted }}>
          rounding {r}
        </div>
      ))}
      {[0, 1, 2].map(w => (
        <React.Fragment key={'r' + w}>
          <div className="axes-row-hd" style={{ color: pal.muted }}>
            {['regular', 'bold', 'extra-bold'][w]}
          </div>
          {[0, 0.5, 1].map(r => (
            <button key={w + '-' + r}
              className={'axes-cell' + (weight === w && rounding === r ? ' axes-cell-on' : '')}
              style={{ background: pal.panel, borderColor: weight === w && rounding === r ? pal.accent : pal.rule }}
              onClick={() => { setTweak('weight', w); setTweak('rounding', r); }}>
              <TextRun text="Hpg&" px={4} bold={w} rounding={r} ink={pal.ink} paper={pal.panel} alts={false} />
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function Specs({ pal, weight, rounding, setTweak }) {
  return (
    <Section id="specs" num="07" title="System" accent={pal.accent}
      sub="Metrics, axes, and the rendering contract. Designed once on the bitmap grid; rendered as outlined paths so corner rounding and integer scaling fall out for free.">
      <div className="specs-grid">
        <div className="spec-card" style={{ background: pal.panel, borderColor: pal.rule }}>
          <h3>Metrics</h3>
          <p style={{ color: pal.muted }}>8 × 16 px cell. Caps occupy rows 2–10 (9 rows). x-height rows 4–10 (7 rows). Descender 2 rows. Line gap absorbs accents on the next line.</p>
          <MetricsDiagram pal={pal} weight={weight} rounding={rounding} />
          <dl className="spec-dl">
            <dt>cell</dt><dd>8 × 16 px</dd>
            <dt>cap height</dt><dd>9 px</dd>
            <dt>x-height</dt><dd>7 px</dd>
            <dt>ascender</dt><dd>10 px above baseline</dd>
            <dt>descender</dt><dd>2 px below baseline</dd>
            <dt>line gap</dt><dd>3 px (accent reserve)</dd>
            <dt>units/em</dt><dd>1024 (16 × 64 grid)</dd>
          </dl>
        </div>

        <div className="spec-card" style={{ background: pal.panel, borderColor: pal.rule }}>
          <h3>Axes</h3>
          <p style={{ color: pal.muted }}>Two variation axes. Weight is structural (dilation). Rounding is purely cosmetic — applied at render time, never bakes pixels.</p>
          <AxesGrid pal={pal} weight={weight} rounding={rounding} setTweak={setTweak} />
          <dl className="spec-dl">
            <dt>wght</dt><dd>400 / 700 / 900</dd>
            <dt>ROND</dt><dd>0 → 100 (custom axis)</dd>
          </dl>
        </div>

        <div className="spec-card" style={{ background: pal.panel, borderColor: pal.rule }}>
          <h3>Output formats</h3>
          <ul className="spec-list">
            <li><b>BDF</b> — canonical bitmap source, one per integer size.</li>
            <li><b>PCF</b> — compiled bitmap for legacy Unix terminals.</li>
            <li><b>OTB</b> — bitmap-only OpenType, modern terminals.</li>
            <li><b>TTF (vector)</b> — outlined pixels with the rounding axis.</li>
            <li><b>WOFF2</b> — for the web specimen + editors.</li>
          </ul>
          <p style={{ color: pal.muted, marginTop: 12 }}>The TTF is generated from the bitmap by tracing each cell as a single path — the same algorithm this page uses to draw. The ROND axis is a renderer-side parameter, exposed as a custom OT axis.</p>
        </div>

        <div className="spec-card" style={{ background: pal.panel, borderColor: pal.rule }}>
          <h3>Coverage targets</h3>
          <ul className="spec-list">
            <li>Basic Latin (U+0020–U+007E) — <b>complete</b></li>
            <li>Latin-1 Supplement (U+00A0–U+00FF) — <b>in progress</b></li>
            <li>Latin Extended-A — <b>planned</b></li>
            <li>Box Drawing (U+2500–U+257F) — <b>algorithmic</b></li>
            <li>Block Elements (U+2580–U+259F) — <b>algorithmic</b></li>
            <li>Math Operators (curated) — <b>in progress</b></li>
            <li>Arrows (curated) — <b>in progress</b></li>
            <li>Powerline / IEC / Pomicons — <b>P0 planned</b></li>
            <li>Nerd Fonts complete — <b>P2 planned</b></li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

// ─── Ligatures showcase (toggle) ─────────────────────────────────────────────
const LIGATURES = [
  { a: '->',  b: '→' },
  { a: '=>',  b: '⇒' },
  { a: '<-',  b: '←' },
  { a: '<=',  b: '≤' },
  { a: '>=',  b: '≥' },
  { a: '!=',  b: '≠' },
  { a: '~~',  b: '≈' },
  { a: '...', b: '…' }
];

function Ligatures({ pal, weight, rounding, ligatures, alts }) {
  return (
    <Section id="lig" num="08" title="Programming ligatures" accent={pal.accent}
      sub="Optional, opt-in. Bitmap ligatures are tricky — every ligature still lives on the 8×16 grid, no horizontal trickery. Toggle the panel to see substitutions.">
      <div className="lig-grid">
        {LIGATURES.map((l, i) => (
          <div key={i} className="lig-row" style={{ borderColor: pal.rule, background: pal.panel }}>
            <div className="lig-from">
              <TextRun text={l.a} px={6} bold={weight} rounding={rounding} ink={pal.ink} paper={pal.panel} />
              <span style={{ color: pal.muted }}>raw</span>
            </div>
            <div className="lig-arrow" style={{ color: ligatures ? pal.accent : pal.muted }}>
              {ligatures ? '→' : '·'}
            </div>
            <div className="lig-to" style={{ opacity: ligatures ? 1 : 0.35 }}>
              <TextRun text={l.b} px={6} bold={weight} rounding={rounding} ink={pal.ink} paper={pal.panel} />
              <span style={{ color: pal.muted }}>ligature</span>
            </div>
          </div>
        ))}
      </div>

      <div className="alts" style={{ background: pal.panel, borderColor: pal.rule }}>
        <div className="alts-hd">
          <span style={{ color: pal.muted }}>alternates</span>
          <span style={{ color: pal.muted }}>{alts ? 'on' : 'off'}</span>
        </div>
        <div className="alts-row">
          <div className="alts-pair">
            <TextRun text="0" px={6} bold={weight} rounding={rounding} ink={pal.ink} paper={pal.panel} alts={alts} />
            <span style={{ color: pal.muted }}>{alts ? 'slashed zero' : 'plain zero'}</span>
          </div>
          <div className="alts-pair">
            <TextRun text="a" px={6} bold={weight} rounding={rounding} ink={pal.ink} paper={pal.panel} alts={alts} />
            <span style={{ color: pal.muted }}>{alts ? 'single-storey a' : 'double-storey a'}</span>
          </div>
          <div className="alts-pair">
            <TextRun text="l" px={6} bold={weight} rounding={rounding} ink={pal.ink} paper={pal.panel} alts={alts} />
            <span style={{ color: pal.muted }}>{alts ? 'curled l' : 'plain l'}</span>
          </div>
          <div className="alts-pair">
            <TextRun text="g" px={6} bold={weight} rounding={rounding} ink={pal.ink} paper={pal.panel} alts={alts} />
            <span style={{ color: pal.muted }}>{alts ? 'single-storey g' : 'double-storey g'}</span>
          </div>
        </div>
        <p style={{ color: pal.muted, fontSize: 11, marginTop: 10 }}>
          Alternates are drawn but not wired into the bitmap source yet — listed here as the design surface.
        </p>
      </div>
    </Section>
  );
}

// ─── Tweaks panel ────────────────────────────────────────────────────────────
function Tweaks({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Render" />
      <TweakRadio label="Weight" value={t.weight}
        options={[{value:0,label:'reg'},{value:1,label:'bold'},{value:2,label:'xbold'}]}
        onChange={(v) => setTweak('weight', v)} />
      <TweakSlider label="Rounding" value={t.rounding} min={0} max={1} step={0.1}
        onChange={(v) => setTweak('rounding', v)} />
      <TweakRadio label="Mode" value={t.mode}
        options={[{value:'noir',label:'noir'},{value:'paper',label:'paper'},{value:'amber',label:'amber'},{value:'phosphor',label:'phos'}]}
        onChange={(v) => setTweak('mode', v)} />
      <TweakSection label="OpenType" />
      <TweakToggle label="Ligatures" value={t.ligatures}
        onChange={(v) => setTweak('ligatures', v)} />
      <TweakToggle label="Alternates" value={t.alts}
        onChange={(v) => setTweak('alts', v)} />
    </TweaksPanel>
  );
}

// ─── App root ────────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const pal = PALETTES[t.mode] || PALETTES.noir;

  // Set CSS vars on root
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--bg', pal.bg);
    r.style.setProperty('--panel', pal.panel);
    r.style.setProperty('--ink', pal.ink);
    r.style.setProperty('--muted', pal.muted);
    r.style.setProperty('--rule', pal.rule);
    r.style.setProperty('--accent', pal.accent);
  }, [pal]);

  return (
    <div className="app">
      <SectionNav pal={pal} />
      <Hero pal={pal} weight={t.weight} rounding={t.rounding} />
      <Specimen pal={pal} weight={t.weight} rounding={t.rounding}
        specimenPx={t.specimenPx} setTweak={setTweak} text={t.specimenText}
        ligatures={t.ligatures} alts={t.alts} />
      <Atlas pal={pal} weight={t.weight} rounding={t.rounding} alts={t.alts} />
      <BoxDemo pal={pal} weight={t.weight} rounding={t.rounding} />
      <MathDemo pal={pal} weight={t.weight} rounding={t.rounding} ligatures={t.ligatures} alts={t.alts} />
      <IconsPowerline pal={pal} mode={t.mode} weight={t.weight} rounding={t.rounding} />
      <NerdRoadmap pal={pal} />
      <Specs pal={pal} weight={t.weight} rounding={t.rounding} setTweak={setTweak} />
      <Ligatures pal={pal} weight={t.weight} rounding={t.rounding} ligatures={t.ligatures} alts={t.alts} />

      <footer className="footer">
        <div>Tessera Mono · 8 × 16 · v0.1.0-draft</div>
        <div style={{ color: pal.muted }}>Design specimen — built on the bitmap, rendered as paths.</div>
      </footer>

      <Tweaks t={t} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
