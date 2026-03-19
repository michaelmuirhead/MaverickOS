export function ThemeStyles() {
  return (
    <style>{`
      /* ─── GOOGLE FONTS ─────────────────────────────────── */
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=IM+Fell+English:ital@0;1&family=Special+Elite&family=Bangers&display=swap');

      /* ═══════════════════════════════════════════════════════
         MEDIEVAL PARCHMENT THEME
         Cards look like aged parchment blocks with rough edges,
         sepia ink text, worn borders, vellum-like texture.
      ═══════════════════════════════════════════════════════ */
      [data-color-theme="medieval"] {
        font-family: 'IM Fell English', Georgia, serif !important;
        letter-spacing: 0.01em;
      }

      /* Headings use Cinzel (Roman inscription style) */
      [data-color-theme="medieval"] h1,
      [data-color-theme="medieval"] h2,
      [data-color-theme="medieval"] h3 {
        font-family: 'Cinzel', Georgia, serif !important;
        letter-spacing: 0.04em;
        font-weight: 600 !important;
      }

      /* Parchment card blocks — dark mode */
      [data-color-theme="medieval"][data-mode="dark"] .maverick-card {
        background: 
          radial-gradient(ellipse at 20% 10%, rgba(60,40,10,0.6) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 90%, rgba(40,25,5,0.7) 0%, transparent 60%),
          linear-gradient(135deg, #1e1608 0%, #2a1e08 40%, #1a1208 100%) !important;
        border: 1px solid #5a4018 !important;
        border-radius: 4px !important;
        box-shadow:
          0 0 0 1px rgba(200,164,90,0.15),
          inset 0 1px 0 rgba(200,164,90,0.08),
          inset 0 -1px 0 rgba(0,0,0,0.3),
          2px 4px 12px rgba(0,0,0,0.6),
          0 1px 2px rgba(0,0,0,0.4) !important;
        position: relative !important;
        overflow: visible !important;
      }

      /* Parchment card blocks — light mode (the main event) */
      [data-color-theme="medieval"][data-mode="light"] .maverick-card {
        background:
          radial-gradient(ellipse at 15% 15%, rgba(210,180,100,0.35) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 80%, rgba(180,140,70,0.30) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(255,243,200,0.2) 0%, transparent 70%),
          linear-gradient(160deg,
            #f7edcf 0%,
            #f2e4b8 15%,
            #f8f0d8 30%,
            #eedcaa 50%,
            #f5e8c5 70%,
            #f0e2b2 85%,
            #f8edcc 100%
          ) !important;
        border: none !important;
        border-radius: 3px !important;
        box-shadow:
          0 0 0 1px rgba(120,80,20,0.35),
          0 0 0 2px rgba(160,110,40,0.15),
          inset 0 1px 3px rgba(180,140,60,0.25),
          inset 0 -1px 2px rgba(100,60,10,0.15),
          3px 5px 14px rgba(80,50,10,0.22),
          0 1px 3px rgba(80,50,10,0.12) !important;
        overflow: visible !important;
      }

      /* Worn/rough border effect using pseudo-element — light mode */
      [data-color-theme="medieval"][data-mode="light"] .maverick-card::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: 3px;
        border: 1.5px solid rgba(140,90,30,0.4);
        pointer-events: none;
        background: transparent;
        box-shadow: inset 0 0 8px rgba(120,70,10,0.12);
        z-index: 1;
      }

      /* Sidebar parchment — light mode */
      [data-color-theme="medieval"][data-mode="light"] .maverick-sidebar,
      [data-color-theme="medieval"][data-mode="light"] [class*="sidebar"] {
        background:
          linear-gradient(180deg, #e8d5a8 0%, #ddc890 50%, #e4d4a4 100%) !important;
        border-right: 2px solid rgba(140,90,30,0.4) !important;
      }

      /* Sidebar parchment — dark mode */
      [data-color-theme="medieval"][data-mode="dark"] .maverick-sidebar {
        background: linear-gradient(180deg, #18120a 0%, #201808 50%, #16100a 100%) !important;
        border-right: 1px solid #4a3010 !important;
      }

      /* Page background — light: aged linen */
      [data-color-theme="medieval"][data-mode="light"] .maverick-main {
        background:
          radial-gradient(ellipse at 30% 20%, rgba(200,170,100,0.12) 0%, transparent 60%),
          radial-gradient(ellipse at 70% 80%, rgba(180,140,70,0.10) 0%, transparent 60%),
          linear-gradient(160deg, #f0e4c4 0%, #f5edd0 50%, #ede0b8 100%) !important;
      }

      /* Page background — dark: scorched vellum */
      [data-color-theme="medieval"][data-mode="dark"] .maverick-main {
        background:
          radial-gradient(ellipse at 20% 30%, rgba(60,40,10,0.4) 0%, transparent 50%),
          linear-gradient(160deg, #100c06 0%, #140e06 100%) !important;
      }

      /* Buttons get a stamped/pressed look */
      [data-color-theme="medieval"] button {
        font-family: 'Cinzel', Georgia, serif !important;
        letter-spacing: 0.04em !important;
      }

      /* Input fields look like ink on parchment */
      [data-color-theme="medieval"][data-mode="light"] input,
      [data-color-theme="medieval"][data-mode="light"] select,
      [data-color-theme="medieval"][data-mode="light"] textarea {
        background: rgba(255,248,225,0.8) !important;
        border-color: rgba(140,90,30,0.5) !important;
        font-family: 'IM Fell English', Georgia, serif !important;
      }

      /* Navigation active state — dark scroll */
      [data-color-theme="medieval"][data-mode="light"] .maverick-nav-active {
        background: rgba(139,26,26,0.12) !important;
      }

      /* Pill/badge buttons — wax seal feel */
      [data-color-theme="medieval"] .maverick-card button[style*="var(--accent)"] {
        box-shadow: inset 0 1px 0 rgba(255,220,150,0.3), 0 2px 4px rgba(80,20,10,0.3) !important;
      }

      /* Card header labels — engraved look */
      [data-color-theme="medieval"] .maverick-card span[style*="text-transform: uppercase"] {
        letter-spacing: 0.12em !important;
        font-family: 'Cinzel', Georgia, serif !important;
      }

      /* ═══════════════════════════════════════════════════════
         RETRO POSTER THEME
         Flat bold blocks, stark contrast, WPA poster geometry.
      ═══════════════════════════════════════════════════════ */
      [data-color-theme="retro_poster"] {
        font-family: 'Special Elite', 'Courier New', monospace !important;
        letter-spacing: 0.02em;
      }

      [data-color-theme="retro_poster"] h1,
      [data-color-theme="retro_poster"] h2,
      [data-color-theme="retro_poster"] h3 {
        font-family: 'Special Elite', 'Courier New', monospace !important;
        text-transform: uppercase !important;
        letter-spacing: 0.08em !important;
      }

      [data-color-theme="retro_poster"] .maverick-card {
        border-radius: 0 !important;
        border-width: 2px !important;
        box-shadow: 4px 4px 0 rgba(204,26,26,0.6) !important;
        position: relative !important;
      }

      [data-color-theme="retro_poster"][data-mode="light"] .maverick-card {
        box-shadow: 4px 4px 0 rgba(100,10,10,0.7) !important;
      }

      [data-color-theme="retro_poster"] button {
        font-family: 'Special Elite', monospace !important;
        text-transform: uppercase !important;
        letter-spacing: 0.06em !important;
        border-radius: 0 !important;
      }

      /* ═══════════════════════════════════════════════════════
         COMIC BOOK THEME
         Bold outlines, hard shadows, screen-print energy.
      ═══════════════════════════════════════════════════════ */
      [data-color-theme="comic_book"] {
        font-family: 'Bangers', 'Impact', sans-serif !important;
        letter-spacing: 0.05em;
      }

      [data-color-theme="comic_book"] h1,
      [data-color-theme="comic_book"] h2,
      [data-color-theme="comic_book"] h3 {
        font-family: 'Bangers', 'Impact', sans-serif !important;
        letter-spacing: 0.08em !important;
        font-weight: 400 !important;
      }

      [data-color-theme="comic_book"] .maverick-card {
        border-width: 2px !important;
        border-radius: 8px !important;
        box-shadow: 3px 3px 0 var(--text-primary) !important;
      }

      [data-color-theme="comic_book"][data-mode="dark"] .maverick-card {
        box-shadow: 3px 3px 0 rgba(245,230,66,0.7) !important;
      }

      [data-color-theme="comic_book"] button {
        font-family: 'Bangers', Impact, sans-serif !important;
        letter-spacing: 0.06em !important;
        border-radius: 6px !important;
      }

      /* ═══════════════════════════════════════════════════════
         TERMINAL GREEN — CRT phosphor monitor
         Scanline overlay, monospace everything, glow borders
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');

      [data-color-theme="terminal"] {
        font-family: 'Share Tech Mono', 'Courier New', monospace !important;
      }
      [data-color-theme="terminal"] h1,
      [data-color-theme="terminal"] h2,
      [data-color-theme="terminal"] h3 {
        font-family: 'VT323', monospace !important;
        letter-spacing: 0.1em !important;
        text-transform: uppercase !important;
      }
      [data-color-theme="terminal"][data-mode="dark"] .maverick-card {
        border-radius: 2px !important;
        border-color: #00ff4150 !important;
        box-shadow: 0 0 8px rgba(0,255,65,0.15), inset 0 0 20px rgba(0,255,65,0.03) !important;
        background: repeating-linear-gradient(
          0deg,
          rgba(0,255,65,0.015) 0px,
          rgba(0,255,65,0.015) 1px,
          transparent 1px,
          transparent 3px
        ), #0a1a0a !important;
      }
      [data-color-theme="terminal"] .maverick-main {
        background: repeating-linear-gradient(
          0deg,
          rgba(0,0,0,0.03) 0px,
          rgba(0,0,0,0.03) 1px,
          transparent 1px,
          transparent 4px
        ) !important;
      }
      [data-color-theme="terminal"] button {
        font-family: 'Share Tech Mono', monospace !important;
        text-transform: uppercase !important;
        letter-spacing: 0.08em !important;
        border-radius: 2px !important;
      }

      /* ═══════════════════════════════════════════════════════
         SYNTHWAVE — 80s neon, grid horizon, glowing outlines
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Exo+2:wght@300;400;600&display=swap');

      [data-color-theme="synthwave"] {
        font-family: 'Exo 2', sans-serif !important;
      }
      [data-color-theme="synthwave"] h1,
      [data-color-theme="synthwave"] h2,
      [data-color-theme="synthwave"] h3 {
        font-family: 'Orbitron', sans-serif !important;
        letter-spacing: 0.06em !important;
      }
      [data-color-theme="synthwave"][data-mode="dark"] .maverick-card {
        border-radius: 6px !important;
        border-color: #7b2fff60 !important;
        box-shadow:
          0 0 10px rgba(255,45,120,0.2),
          0 0 30px rgba(123,47,255,0.1),
          inset 0 1px 0 rgba(255,45,120,0.15) !important;
        background: linear-gradient(135deg, #160a28 0%, #1a0e30 100%) !important;
      }
      [data-color-theme="synthwave"][data-mode="dark"] .maverick-main {
        background:
          linear-gradient(rgba(123,47,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(123,47,255,0.05) 1px, transparent 1px),
          #0d0015 !important;
        background-size: 100% 40px, 40px 100% !important;
      }
      [data-color-theme="synthwave"] button {
        font-family: 'Orbitron', sans-serif !important;
        letter-spacing: 0.06em !important;
      }

      /* ═══════════════════════════════════════════════════════
         NEWSPAPER — Broadsheet print, column rule, ink type
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Source+Serif+4:wght@300;400;600&display=swap');

      [data-color-theme="newspaper"] {
        font-family: 'Source Serif 4', Georgia, serif !important;
      }
      [data-color-theme="newspaper"] h1,
      [data-color-theme="newspaper"] h2,
      [data-color-theme="newspaper"] h3 {
        font-family: 'Playfair Display', Georgia, serif !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.02em !important;
      }
      [data-color-theme="newspaper"][data-mode="light"] .maverick-card {
        border-radius: 0 !important;
        border: none !important;
        border-top: 3px double #1a1a1a !important;
        border-bottom: 1px solid #1a1a1a !important;
        box-shadow: none !important;
        background: #faf7f0 !important;
      }
      [data-color-theme="newspaper"][data-mode="dark"] .maverick-card {
        border-radius: 0 !important;
        border: none !important;
        border-top: 3px double #f0ead8 !important;
        border-bottom: 1px solid #3a3820 !important;
        box-shadow: none !important;
      }
      [data-color-theme="newspaper"] button {
        font-family: 'Playfair Display', Georgia, serif !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.08em !important;
        border-radius: 0 !important;
      }

      /* ═══════════════════════════════════════════════════════
         BLUEPRINT — Engineering drawing, white-on-blue, grid
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');

      [data-color-theme="blueprint"] {
        font-family: 'Courier Prime', 'Courier New', monospace !important;
      }
      [data-color-theme="blueprint"] h1,
      [data-color-theme="blueprint"] h2,
      [data-color-theme="blueprint"] h3 {
        font-family: 'Courier Prime', monospace !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.12em !important;
      }
      [data-color-theme="blueprint"] .maverick-card {
        border-radius: 2px !important;
        border-style: solid !important;
        border-width: 1px !important;
        border-color: rgba(255,255,255,0.35) !important;
        box-shadow: inset 0 0 0 3px rgba(255,255,255,0.06) !important;
        background:
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
          var(--card) !important;
        background-size: 100% 20px, 20px 100% !important;
      }
      [data-color-theme="blueprint"] .maverick-main {
        background:
          linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px),
          var(--bg) !important;
        background-size: 100% 24px, 24px 100% !important;
      }
      [data-color-theme="blueprint"] button {
        font-family: 'Courier Prime', monospace !important;
        letter-spacing: 0.08em !important;
        border-radius: 0 !important;
        text-transform: uppercase !important;
      }

      /* ═══════════════════════════════════════════════════════
         ART DECO — Gold geometry, Gatsby ornament, stepped corners
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Poiret+One&display=swap');

      [data-color-theme="art_deco"] {
        font-family: 'Cormorant Garamond', Georgia, serif !important;
        font-size: 105% !important;
      }
      [data-color-theme="art_deco"] h1,
      [data-color-theme="art_deco"] h2,
      [data-color-theme="art_deco"] h3 {
        font-family: 'Poiret One', sans-serif !important;
        letter-spacing: 0.15em !important;
        text-transform: uppercase !important;
      }
      [data-color-theme="art_deco"] .maverick-card {
        border-radius: 0 !important;
        border-width: 1px !important;
        border-color: #c9a84c60 !important;
        box-shadow:
          0 0 0 3px var(--bg),
          0 0 0 4px #c9a84c40,
          3px 3px 0 4px var(--bg),
          3px 3px 0 5px #c9a84c25 !important;
        position: relative !important;
      }
      [data-color-theme="art_deco"][data-mode="light"] .maverick-card {
        background: linear-gradient(135deg, #fdfaf0 0%, #f8f4e4 100%) !important;
      }
      [data-color-theme="art_deco"] button {
        font-family: 'Poiret One', sans-serif !important;
        letter-spacing: 0.12em !important;
        text-transform: uppercase !important;
        border-radius: 0 !important;
      }

      /* ═══════════════════════════════════════════════════════
         ANCIENT EGYPT — Papyrus, scarab borders, lapis & gold
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Philosopher:wght@400;700&display=swap');

      [data-color-theme="ancient_egypt"] {
        font-family: 'Philosopher', Georgia, serif !important;
      }
      [data-color-theme="ancient_egypt"] h1,
      [data-color-theme="ancient_egypt"] h2,
      [data-color-theme="ancient_egypt"] h3 {
        font-family: 'Philosopher', Georgia, serif !important;
        font-weight: 700 !important;
        letter-spacing: 0.1em !important;
        text-transform: uppercase !important;
      }
      [data-color-theme="ancient_egypt"][data-mode="light"] .maverick-card {
        background: linear-gradient(160deg, #fdf4d0 0%, #f8ecc0 50%, #fdf0c8 100%) !important;
        border: none !important;
        border-radius: 2px !important;
        box-shadow:
          0 0 0 2px #d4af37,
          0 0 0 4px #c44a1a50,
          3px 5px 12px rgba(80,40,0,0.25) !important;
      }
      [data-color-theme="ancient_egypt"][data-mode="dark"] .maverick-card {
        border-color: #d4af3740 !important;
        border-radius: 2px !important;
        box-shadow: 0 0 12px rgba(212,175,55,0.1), inset 0 0 30px rgba(0,0,0,0.3) !important;
      }
      [data-color-theme="ancient_egypt"] button {
        font-family: 'Philosopher', Georgia, serif !important;
        font-weight: 700 !important;
        letter-spacing: 0.08em !important;
        border-radius: 1px !important;
      }

      /* ═══════════════════════════════════════════════════════
         NEON TOKYO — Cyberpunk rain, kanji neon, vivid glow
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Zen+Dots&family=M+PLUS+1+Code:wght@300;400;500&display=swap');

      [data-color-theme="neon_tokyo"] {
        font-family: 'M PLUS 1 Code', monospace !important;
      }
      [data-color-theme="neon_tokyo"] h1,
      [data-color-theme="neon_tokyo"] h2,
      [data-color-theme="neon_tokyo"] h3 {
        font-family: 'Zen Dots', sans-serif !important;
        letter-spacing: 0.04em !important;
      }
      [data-color-theme="neon_tokyo"][data-mode="dark"] .maverick-card {
        border-radius: 4px !important;
        border-color: #ff008040 !important;
        box-shadow:
          0 0 12px rgba(255,0,128,0.2),
          0 0 4px rgba(0,255,204,0.15),
          inset 0 0 40px rgba(255,0,128,0.03) !important;
        background: linear-gradient(135deg, #0e0e1c 0%, #100c1e 100%) !important;
      }
      [data-color-theme="neon_tokyo"][data-mode="dark"] .maverick-main {
        background:
          linear-gradient(rgba(255,0,128,0.04) 1px, transparent 1px),
          #080810 !important;
        background-size: 100% 60px !important;
      }
      [data-color-theme="neon_tokyo"] button {
        font-family: 'Zen Dots', sans-serif !important;
        letter-spacing: 0.04em !important;
        border-radius: 3px !important;
      }

      /* ═══════════════════════════════════════════════════════
         CRAYON — Pastel hand-drawn, wobbly borders, chunky fun
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Nunito:wght@400;600;700;800&display=swap');

      [data-color-theme="crayon"] {
        font-family: 'Nunito', sans-serif !important;
      }
      [data-color-theme="crayon"] h1,
      [data-color-theme="crayon"] h2,
      [data-color-theme="crayon"] h3 {
        font-family: 'Caveat', cursive !important;
        font-weight: 700 !important;
        letter-spacing: 0.02em !important;
      }
      [data-color-theme="crayon"][data-mode="light"] .maverick-card {
        border-radius: 16px 4px 18px 6px !important;
        border-width: 2px !important;
        border-color: #ff6b9d !important;
        box-shadow: 3px 4px 0 #ffd93d, 5px 6px 0 #6bcb7740 !important;
        background: #ffffff !important;
      }
      [data-color-theme="crayon"][data-mode="dark"] .maverick-card {
        border-radius: 16px 4px 18px 6px !important;
        border-width: 2px !important;
        border-color: #ff6b9d50 !important;
        box-shadow: 3px 4px 0 rgba(255,217,61,0.4) !important;
      }
      [data-color-theme="crayon"] button {
        font-family: 'Nunito', sans-serif !important;
        font-weight: 800 !important;
        border-radius: 999px !important;
      }
      [data-color-theme="crayon"] .maverick-main {
        background-image: radial-gradient(circle, var(--border-subtle) 1px, transparent 1px) !important;
        background-size: 24px 24px !important;
      }

      /* ═══════════════════════════════════════════════════════
         CHALKBOARD — Slate green, chalk texture, dusty letters
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Indie+Flower&display=swap');

      [data-color-theme="chalkboard"] {
        font-family: 'Indie Flower', cursive !important;
        font-size: 105% !important;
      }
      [data-color-theme="chalkboard"] h1,
      [data-color-theme="chalkboard"] h2,
      [data-color-theme="chalkboard"] h3 {
        font-family: 'Permanent Marker', cursive !important;
        letter-spacing: 0.04em !important;
      }
      [data-color-theme="chalkboard"] .maverick-card {
        border-radius: 4px !important;
        border-color: rgba(255,255,255,0.25) !important;
        border-style: dashed !important;
        border-width: 2px !important;
        box-shadow: none !important;
        background:
          repeating-linear-gradient(
            rgba(255,255,255,0.015) 0px,
            rgba(255,255,255,0.015) 1px,
            transparent 1px,
            transparent 28px
          ),
          var(--card) !important;
      }
      [data-color-theme="chalkboard"] button {
        font-family: 'Permanent Marker', cursive !important;
        border-radius: 4px !important;
        letter-spacing: 0.04em !important;
      }

      /* ═══════════════════════════════════════════════════════
         LEGO — Primary bold, stud details, hard block geometry
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@700;800;900&display=swap');

      [data-color-theme="lego"] {
        font-family: 'Nunito Sans', sans-serif !important;
        font-weight: 700 !important;
      }
      [data-color-theme="lego"] h1,
      [data-color-theme="lego"] h2,
      [data-color-theme="lego"] h3 {
        font-family: 'Nunito Sans', sans-serif !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
      }
      [data-color-theme="lego"][data-mode="light"] .maverick-card {
        border-radius: 6px !important;
        border: 3px solid #111 !important;
        box-shadow: 4px 4px 0 #111 !important;
        background: #ffffff !important;
      }
      [data-color-theme="lego"][data-mode="dark"] .maverick-card {
        border-radius: 6px !important;
        border: 3px solid #e3000b !important;
        box-shadow: 4px 4px 0 #ffcd00 !important;
      }
      [data-color-theme="lego"] button {
        font-family: 'Nunito Sans', sans-serif !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
        border-radius: 4px !important;
      }

      /* ═══════════════════════════════════════════════════════
         SWISS MODERNIST — Ultra grid, Helvetica-adjacent, 1 accent
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

      [data-color-theme="swiss"] {
        font-family: 'Inter', 'Helvetica Neue', sans-serif !important;
        font-weight: 400 !important;
      }
      [data-color-theme="swiss"] h1,
      [data-color-theme="swiss"] h2,
      [data-color-theme="swiss"] h3 {
        font-family: 'Inter', sans-serif !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: -0.01em !important;
      }
      [data-color-theme="swiss"][data-mode="light"] .maverick-card {
        border-radius: 0 !important;
        border: none !important;
        border-left: 4px solid #111 !important;
        box-shadow: none !important;
        background: #ffffff !important;
      }
      [data-color-theme="swiss"][data-mode="dark"] .maverick-card {
        border-radius: 0 !important;
        border: none !important;
        border-left: 4px solid #e63312 !important;
        box-shadow: none !important;
        background: #141414 !important;
      }
      [data-color-theme="swiss"] button {
        font-family: 'Inter', sans-serif !important;
        font-weight: 600 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
        border-radius: 0 !important;
      }
      [data-color-theme="swiss"][data-mode="light"] .maverick-main {
        background: #ffffff !important;
      }

      /* ═══════════════════════════════════════════════════════
         LO-FI PAPER — Off-white notebook, pencil borders, cozy
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Patrick+Hand&display=swap');

      [data-color-theme="lofi_paper"] {
        font-family: 'Lora', Georgia, serif !important;
      }
      [data-color-theme="lofi_paper"] h1,
      [data-color-theme="lofi_paper"] h2,
      [data-color-theme="lofi_paper"] h3 {
        font-family: 'Patrick Hand', cursive !important;
        letter-spacing: 0.02em !important;
        font-weight: 400 !important;
      }
      [data-color-theme="lofi_paper"][data-mode="light"] .maverick-card {
        border-radius: 3px !important;
        border: 1px solid #b8a888 !important;
        box-shadow: 1px 2px 6px rgba(40,30,10,0.08), inset 0 1px 0 rgba(255,255,255,0.8) !important;
        background: #fdfaf5 !important;
      }
      [data-color-theme="lofi_paper"][data-mode="light"] .maverick-main {
        background:
          repeating-linear-gradient(
            transparent 0px,
            transparent 27px,
            #d8ccc0 27px,
            #d8ccc0 28px
          ),
          #f8f5ef !important;
      }
      [data-color-theme="lofi_paper"][data-mode="dark"] .maverick-card {
        border-radius: 3px !important;
        border-color: #4a4030 !important;
        box-shadow: 1px 2px 6px rgba(0,0,0,0.3) !important;
      }
      [data-color-theme="lofi_paper"] button {
        font-family: 'Patrick Hand', cursive !important;
        letter-spacing: 0.03em !important;
        border-radius: 4px !important;
      }

      /* ═══════════════════════════════════════════════════════
         BATMAN THEME
         Gotham's finest. Black obsidian + signal yellow.
         Dark mode: pure pitch-black city night, yellow cuts
         Light mode: gunmetal graphite, yellow pops like the
         Bat-Signal punching through cloud cover.
         Frank Miller ink meets Nolan brutalism.
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800&display=swap');

      [data-color-theme="batman"] {
        font-family: 'Barlow', sans-serif !important;
        font-weight: 500 !important;
      }

      [data-color-theme="batman"] h1,
      [data-color-theme="batman"] h2,
      [data-color-theme="batman"] h3 {
        font-family: 'Bebas Neue', sans-serif !important;
        letter-spacing: 0.12em !important;
        font-weight: 400 !important;
        color: #f5c400 !important;
        text-shadow: 0 0 20px rgba(245,196,0,0.3) !important;
      }

      [data-color-theme="batman"] button {
        font-family: 'Barlow Condensed', sans-serif !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.1em !important;
        border-radius: 2px !important;
      }

      /* ── DARK: pure Gotham night ── */
      [data-color-theme="batman"][data-mode="dark"] .maverick-card {
        border-radius: 3px !important;
        border: 1px solid #f5c40022 !important;
        background: #0f0f0f !important;
        box-shadow:
          inset 0 1px 0 rgba(245,196,0,0.06),
          inset 0 -1px 0 rgba(0,0,0,0.5),
          0 0 0 1px rgba(0,0,0,0.8),
          0 4px 24px rgba(0,0,0,0.9),
          0 1px 3px rgba(0,0,0,0.6) !important;
        overflow: visible !important;
        position: relative !important;
      }

      /* Yellow signal stripe on left edge */
      [data-color-theme="batman"][data-mode="dark"] .maverick-card::before {
        content: '';
        position: absolute;
        top: 15%; bottom: 15%; left: -1px;
        width: 2px;
        background: linear-gradient(180deg, transparent, #f5c400, transparent);
        pointer-events: none;
        z-index: 1;
      }

      /* Bat-Signal radial glow in page center */
      [data-color-theme="batman"][data-mode="dark"] .maverick-main {
        background:
          radial-gradient(ellipse at 50% 30%, rgba(245,196,0,0.04) 0%, transparent 55%),
          #050505 !important;
      }

      /* Sidebar: absolute black, yellow nav indicators */
      [data-color-theme="batman"][data-mode="dark"] .maverick-sidebar {
        background: #0a0a0a !important;
        border-right: 1px solid #f5c40020 !important;
        box-shadow: inset -1px 0 0 #f5c40010 !important;
      }

      [data-color-theme="batman"][data-mode="dark"] input,
      [data-color-theme="batman"][data-mode="dark"] select,
      [data-color-theme="batman"][data-mode="dark"] textarea {
        background: #080808 !important;
        border-color: #f5c40030 !important;
        color: #f0f0f0 !important;
        font-family: 'Barlow', sans-serif !important;
      }

      [data-color-theme="batman"][data-mode="dark"] input:focus,
      [data-color-theme="batman"][data-mode="dark"] select:focus,
      [data-color-theme="batman"][data-mode="dark"] textarea:focus {
        border-color: #f5c40080 !important;
        box-shadow: 0 0 0 2px rgba(245,196,0,0.12) !important;
        outline: none !important;
      }

      /* ── LIGHT: gunmetal Gotham, yellow blazing ── */
      [data-color-theme="batman"][data-mode="light"] .maverick-card {
        border-radius: 3px !important;
        border: 1px solid #f5c40030 !important;
        background: #242424 !important;
        box-shadow:
          inset 0 1px 0 rgba(245,196,0,0.08),
          inset 0 -1px 0 rgba(0,0,0,0.4),
          0 0 0 1px rgba(0,0,0,0.5),
          0 4px 20px rgba(0,0,0,0.7),
          0 1px 3px rgba(0,0,0,0.4) !important;
        overflow: visible !important;
        position: relative !important;
      }

      [data-color-theme="batman"][data-mode="light"] .maverick-card::before {
        content: '';
        position: absolute;
        top: 15%; bottom: 15%; left: -1px;
        width: 2px;
        background: linear-gradient(180deg, transparent, #f5c400cc, transparent);
        pointer-events: none;
        z-index: 1;
      }

      [data-color-theme="batman"][data-mode="light"] .maverick-main {
        background:
          radial-gradient(ellipse at 50% 20%, rgba(245,196,0,0.05) 0%, transparent 50%),
          #1a1a1a !important;
      }

      [data-color-theme="batman"][data-mode="light"] .maverick-sidebar {
        background: linear-gradient(180deg, #141414 0%, #111111 100%) !important;
        border-right: 1px solid #f5c40025 !important;
      }

      [data-color-theme="batman"][data-mode="light"] input,
      [data-color-theme="batman"][data-mode="light"] select,
      [data-color-theme="batman"][data-mode="light"] textarea {
        background: #1a1a1a !important;
        border-color: #f5c40040 !important;
        color: #f0f0f0 !important;
        font-family: 'Barlow', sans-serif !important;
      }

      [data-color-theme="batman"][data-mode="light"] input:focus,
      [data-color-theme="batman"][data-mode="light"] select:focus,
      [data-color-theme="batman"][data-mode="light"] textarea:focus {
        border-color: #f5c400 !important;
        box-shadow: 0 0 0 2px rgba(245,196,0,0.15) !important;
        outline: none !important;
      }

      /* ═══════════════════════════════════════════════════════
         PIP-BOY THEME
         Single-phosphor green CRT display.
         You are looking at your budget through a Pip-Boy 3000.
         One color family — phosphor green at every brightness.
         Scanlines, screen glow, monospace terminal font,
         CRT vignette, dashed UI borders.
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Share+Tech&display=swap');

      [data-color-theme="pipboy"] {
        font-family: 'Share Tech Mono', monospace !important;
        letter-spacing: 0.04em !important;
        /* CRT green text glow on everything */
        text-shadow: 0 0 6px rgba(74,250,74,0.35) !important;
      }

      [data-color-theme="pipboy"] h1,
      [data-color-theme="pipboy"] h2,
      [data-color-theme="pipboy"] h3 {
        font-family: 'Share Tech', sans-serif !important;
        letter-spacing: 0.14em !important;
        text-transform: uppercase !important;
        font-weight: 400 !important;
        text-shadow: 0 0 12px rgba(74,250,74,0.6), 0 0 24px rgba(74,250,74,0.2) !important;
      }

      [data-color-theme="pipboy"] button {
        font-family: 'Share Tech Mono', monospace !important;
        text-transform: uppercase !important;
        letter-spacing: 0.1em !important;
        border-radius: 1px !important;
        text-shadow: 0 0 8px rgba(74,250,74,0.5) !important;
      }

      /* ── Cards: Pip-Boy UI panel with scanlines ── */
      [data-color-theme="pipboy"] .maverick-card {
        border-radius: 1px !important;
        border: 1px solid rgba(74,250,74,0.25) !important;
        /* Scanline texture baked in */
        background:
          repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.18) 0px,
            rgba(0,0,0,0.18) 1px,
            transparent 1px,
            transparent 3px
          ),
          var(--card) !important;
        box-shadow:
          inset 0 0 20px rgba(74,250,74,0.04),
          inset 0 1px 0 rgba(74,250,74,0.1),
          0 0 12px rgba(74,250,74,0.08),
          0 2px 8px rgba(0,0,0,0.8) !important;
        overflow: visible !important;
        position: relative !important;
      }

      /* Dashed corner brackets — Pip-Boy UI chrome */
      [data-color-theme="pipboy"] .maverick-card::before {
        content: '';
        position: absolute;
        inset: -3px;
        border: 1px dashed rgba(74,250,74,0.18);
        border-radius: 2px;
        pointer-events: none;
        z-index: 1;
      }

      /* Full-screen CRT effect — scanlines + phosphor glow + vignette */
      [data-color-theme="pipboy"] .maverick-main {
        background:
          /* Vignette */
          radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%),
          /* Phosphor bloom */
          radial-gradient(ellipse at 50% 40%, rgba(74,250,74,0.04) 0%, transparent 60%),
          /* Scanlines */
          repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.15) 0px,
            rgba(0,0,0,0.15) 1px,
            transparent 1px,
            transparent 4px
          ),
          var(--bg) !important;
      }

      /* Sidebar: narrower CRT bezel */
      [data-color-theme="pipboy"] .maverick-sidebar {
        background:
          repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.12) 0px,
            rgba(0,0,0,0.12) 1px,
            transparent 1px,
            transparent 3px
          ),
          var(--sidebar) !important;
        border-right: 1px solid rgba(74,250,74,0.2) !important;
        box-shadow: inset -2px 0 8px rgba(0,0,0,0.6) !important;
      }

      /* Inputs: terminal entry fields */
      [data-color-theme="pipboy"] input,
      [data-color-theme="pipboy"] select,
      [data-color-theme="pipboy"] textarea {
        font-family: 'Share Tech Mono', monospace !important;
        background: rgba(10,18,10,0.95) !important;
        border-color: rgba(74,250,74,0.35) !important;
        color: #4afa4a !important;
        caret-color: #4afa4a !important;
        letter-spacing: 0.06em !important;
        text-shadow: 0 0 6px rgba(74,250,74,0.4) !important;
      }

      [data-color-theme="pipboy"] input:focus,
      [data-color-theme="pipboy"] select:focus,
      [data-color-theme="pipboy"] textarea:focus {
        border-color: rgba(74,250,74,0.7) !important;
        box-shadow: 0 0 0 2px rgba(74,250,74,0.12), 0 0 8px rgba(74,250,74,0.15) !important;
        outline: none !important;
      }

      /* Override all borders to use phosphor green */
      [data-color-theme="pipboy"] * {
        border-color: rgba(74,250,74,0.22) !important;
      }

      /* Progress bars and track elements get phosphor glow */
      [data-color-theme="pipboy"] div[style*="background: var(--accent)"],
      [data-color-theme="pipboy"] div[style*="background:var(--accent)"] {
        box-shadow: 0 0 6px rgba(74,250,74,0.6) !important;
      }
      @import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap');

      [data-color-theme="vault_tec"] {
        font-family: 'Barlow', sans-serif !important;
        font-weight: 500 !important;
        letter-spacing: 0.02em !important;
      }

      [data-color-theme="vault_tec"] h1,
      [data-color-theme="vault_tec"] h2,
      [data-color-theme="vault_tec"] h3 {
        font-family: 'Russo One', sans-serif !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
        font-weight: 400 !important;
        color: #c9961a !important;
      }

      [data-color-theme="vault_tec"] button {
        font-family: 'Barlow Condensed', sans-serif !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.1em !important;
        border-radius: 3px !important;
      }

      /* ── DARK: near-black stage, cobalt blue card panels, gold text ── */
      [data-color-theme="vault_tec"][data-mode="dark"] .maverick-card {
        border-radius: 6px !important;
        border: 1px solid #c9961a40 !important;
        background: linear-gradient(160deg, #1e4278 0%, #193870 50%, #1c3e76 100%) !important;
        box-shadow:
          inset 0 1px 0 rgba(201,150,26,0.15),
          inset 0 -1px 0 rgba(0,0,0,0.3),
          0 0 0 1px rgba(201,150,26,0.08),
          0 4px 20px rgba(0,0,0,0.6),
          0 1px 4px rgba(0,0,0,0.4) !important;
        overflow: visible !important;
        position: relative !important;
      }

      /* Gold border shimmer on top edge */
      [data-color-theme="vault_tec"][data-mode="dark"] .maverick-card::before {
        content: '';
        position: absolute;
        top: -1px; left: 10%; right: 10%;
        height: 1px;
        background: linear-gradient(90deg, transparent, #c9961a80, transparent);
        pointer-events: none;
        z-index: 1;
      }

      [data-color-theme="vault_tec"][data-mode="dark"] .maverick-main {
        background:
          radial-gradient(ellipse at 50% 20%, rgba(45,95,166,0.12) 0%, transparent 60%),
          #07111e !important;
      }

      [data-color-theme="vault_tec"][data-mode="dark"] .maverick-sidebar {
        background: linear-gradient(180deg, #0f2650 0%, #0c2044 100%) !important;
        border-right: 1px solid #c9961a30 !important;
        box-shadow: inset -1px 0 0 #c9961a18 !important;
      }

      [data-color-theme="vault_tec"][data-mode="dark"] input,
      [data-color-theme="vault_tec"][data-mode="dark"] select,
      [data-color-theme="vault_tec"][data-mode="dark"] textarea {
        background: rgba(10,28,60,0.8) !important;
        border-color: #c9961a50 !important;
        color: #f0d878 !important;
        font-family: 'Barlow', sans-serif !important;
      }

      /* ── LIGHT: full cobalt blue — you ARE inside the poster ── */
      [data-color-theme="vault_tec"][data-mode="light"] .maverick-card {
        border-radius: 6px !important;
        border: 1px solid #c9961a60 !important;
        background: linear-gradient(160deg, #1e4d8c 0%, #1a4480 50%, #1c4888 100%) !important;
        box-shadow:
          inset 0 1px 0 rgba(201,150,26,0.2),
          inset 0 -1px 0 rgba(0,0,0,0.25),
          0 0 0 1px rgba(201,150,26,0.12),
          0 4px 16px rgba(0,15,50,0.4) !important;
        overflow: visible !important;
        position: relative !important;
      }

      [data-color-theme="vault_tec"][data-mode="light"] .maverick-card::before {
        content: '';
        position: absolute;
        top: -1px; left: 8%; right: 8%;
        height: 1px;
        background: linear-gradient(90deg, transparent, #c9961aaa, transparent);
        pointer-events: none;
        z-index: 1;
      }

      [data-color-theme="vault_tec"][data-mode="light"] .maverick-main {
        background:
          radial-gradient(ellipse at 50% 0%, rgba(201,150,26,0.08) 0%, transparent 50%),
          #2d5fa6 !important;
      }

      [data-color-theme="vault_tec"][data-mode="light"] .maverick-sidebar {
        background: linear-gradient(180deg, #163878 0%, #122e68 100%) !important;
        border-right: 1px solid #c9961a40 !important;
      }

      [data-color-theme="vault_tec"][data-mode="light"] .maverick-sidebar * {
        color: #f0d878 !important;
      }

      [data-color-theme="vault_tec"][data-mode="light"] input,
      [data-color-theme="vault_tec"][data-mode="light"] select,
      [data-color-theme="vault_tec"][data-mode="light"] textarea {
        background: rgba(10,28,70,0.6) !important;
        border-color: #c9961a60 !important;
        color: #f5e898 !important;
        font-family: 'Barlow', sans-serif !important;
      }

      /* ═══════════════════════════════════════════════════════
         SPORTS THEMES — shared font import
      ═══════════════════════════════════════════════════════ */
      @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800&family=Barlow:wght@400;500;600&display=swap');

      /* All sports themes use Barlow Condensed for headings — stadium scoreboard feel */
      [data-color-theme="msu_bulldogs"] h1, [data-color-theme="msu_bulldogs"] h2, [data-color-theme="msu_bulldogs"] h3,
      [data-color-theme="alabama"] h1, [data-color-theme="alabama"] h2, [data-color-theme="alabama"] h3,
      [data-color-theme="lsu_tigers"] h1, [data-color-theme="lsu_tigers"] h2, [data-color-theme="lsu_tigers"] h3,
      [data-color-theme="ole_miss"] h1, [data-color-theme="ole_miss"] h2, [data-color-theme="ole_miss"] h3,
      [data-color-theme="southern_miss"] h1, [data-color-theme="southern_miss"] h2, [data-color-theme="southern_miss"] h3,
      [data-color-theme="dallas_cowboys"] h1, [data-color-theme="dallas_cowboys"] h2, [data-color-theme="dallas_cowboys"] h3,
      [data-color-theme="saints"] h1, [data-color-theme="saints"] h2, [data-color-theme="saints"] h3,
      [data-color-theme="broncos"] h1, [data-color-theme="broncos"] h2, [data-color-theme="broncos"] h3,
      [data-color-theme="miami_hurricanes"] h1, [data-color-theme="miami_hurricanes"] h2, [data-color-theme="miami_hurricanes"] h3 {
        font-family: 'Barlow Condensed', sans-serif !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
        font-style: italic !important;
      }

      [data-color-theme="msu_bulldogs"],
      [data-color-theme="alabama"],
      [data-color-theme="lsu_tigers"],
      [data-color-theme="ole_miss"],
      [data-color-theme="southern_miss"],
      [data-color-theme="dallas_cowboys"],
      [data-color-theme="saints"],
      [data-color-theme="broncos"],
      [data-color-theme="miami_hurricanes"] {
        font-family: 'Barlow', sans-serif !important;
      }

      /* Shared sports card: bold left accent stripe + tight radius */
      [data-color-theme="msu_bulldogs"] .maverick-card,
      [data-color-theme="alabama"] .maverick-card,
      [data-color-theme="lsu_tigers"] .maverick-card,
      [data-color-theme="ole_miss"] .maverick-card,
      [data-color-theme="southern_miss"] .maverick-card,
      [data-color-theme="dallas_cowboys"] .maverick-card,
      [data-color-theme="saints"] .maverick-card,
      [data-color-theme="broncos"] .maverick-card,
      [data-color-theme="miami_hurricanes"] .maverick-card {
        border-radius: 4px !important;
        border-left-width: 4px !important;
        border-left-style: solid !important;
      }

      /* Shared sports buttons */
      [data-color-theme="msu_bulldogs"] button,
      [data-color-theme="alabama"] button,
      [data-color-theme="lsu_tigers"] button,
      [data-color-theme="ole_miss"] button,
      [data-color-theme="southern_miss"] button,
      [data-color-theme="dallas_cowboys"] button,
      [data-color-theme="saints"] button,
      [data-color-theme="broncos"] button,
      [data-color-theme="miami_hurricanes"] button {
        font-family: 'Barlow Condensed', sans-serif !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.06em !important;
        border-radius: 3px !important;
      }

      /* ── MSU Bulldogs: maroon & white, cowbell energy ── */
      [data-color-theme="msu_bulldogs"][data-mode="dark"] .maverick-card {
        border-left-color: #660000 !important;
        box-shadow: -2px 0 12px rgba(102,0,0,0.4), 2px 4px 12px rgba(0,0,0,0.5) !important;
        background: linear-gradient(135deg, #1e0000 0%, #180000 100%) !important;
      }
      [data-color-theme="msu_bulldogs"][data-mode="light"] .maverick-card {
        border-left-color: #660000 !important;
        box-shadow: -2px 0 8px rgba(102,0,0,0.2), 2px 3px 8px rgba(80,0,0,0.10) !important;
      }
      [data-color-theme="msu_bulldogs"] .maverick-main {
        background: repeating-linear-gradient(
          90deg, transparent 0px, transparent 39px, rgba(102,0,0,0.06) 39px, rgba(102,0,0,0.06) 40px
        ), var(--bg) !important;
      }

      /* ── Alabama: crimson & gray, championship feel ── */
      [data-color-theme="alabama"][data-mode="dark"] .maverick-card {
        border-left-color: #9e1b32 !important;
        box-shadow: -2px 0 14px rgba(158,27,50,0.4), 2px 4px 12px rgba(0,0,0,0.5) !important;
        background: linear-gradient(135deg, #1a0010 0%, #160008 100%) !important;
      }
      [data-color-theme="alabama"][data-mode="light"] .maverick-card {
        border-left-color: #9e1b32 !important;
        box-shadow: -2px 0 8px rgba(158,27,50,0.25), 2px 3px 8px rgba(100,10,30,0.10) !important;
      }
      [data-color-theme="alabama"][data-mode="dark"] .maverick-main {
        background: radial-gradient(ellipse at 50% 0%, rgba(158,27,50,0.12) 0%, transparent 60%), #0c0008 !important;
      }

      /* ── LSU Tigers: purple & gold, death valley thunder ── */
      [data-color-theme="lsu_tigers"][data-mode="dark"] .maverick-card {
        border-left-color: #fdd023 !important;
        box-shadow: -2px 0 14px rgba(253,208,35,0.25), 2px 4px 12px rgba(0,0,0,0.5) !important;
        background: linear-gradient(135deg, #120028 0%, #0e0020 100%) !important;
      }
      [data-color-theme="lsu_tigers"][data-mode="light"] .maverick-card {
        border-left-color: #461d7c !important;
        box-shadow: -2px 0 8px rgba(70,29,124,0.25), 2px 3px 8px rgba(40,10,80,0.10) !important;
      }
      [data-color-theme="lsu_tigers"][data-mode="dark"] .maverick-main {
        background:
          repeating-linear-gradient(90deg, transparent 0, transparent 79px, rgba(253,208,35,0.04) 79px, rgba(253,208,35,0.04) 80px),
          #080010 !important;
      }

      /* ── Ole Miss: red & navy, Grove tailgate ── */
      [data-color-theme="ole_miss"][data-mode="dark"] .maverick-card {
        border-left-color: #ce1126 !important;
        box-shadow: -2px 0 12px rgba(206,17,38,0.35), 2px 4px 12px rgba(0,0,0,0.5) !important;
        background: linear-gradient(135deg, #12122a 0%, #0e0e20 100%) !important;
      }
      [data-color-theme="ole_miss"][data-mode="light"] .maverick-card {
        border-left-color: #ce1126 !important;
        box-shadow: -2px 0 8px rgba(206,17,38,0.20), 2px 3px 8px rgba(10,15,40,0.10) !important;
      }
      [data-color-theme="ole_miss"][data-mode="dark"] .maverick-main {
        background: linear-gradient(180deg, rgba(206,17,38,0.06) 0%, transparent 30%), #08080e !important;
      }

      /* ── Southern Miss: black & gold, M.M. Roberts energy ── */
      [data-color-theme="southern_miss"][data-mode="dark"] .maverick-card {
        border-left-color: #f5c518 !important;
        box-shadow: -2px 0 14px rgba(245,197,24,0.3), 2px 4px 12px rgba(0,0,0,0.6) !important;
        background: linear-gradient(135deg, #1a1800 0%, #141200 100%) !important;
      }
      [data-color-theme="southern_miss"][data-mode="light"] .maverick-card {
        border-left-color: #c8a000 !important;
        border: 2px solid #333300 !important;
        border-left: 4px solid #c8a000 !important;
        box-shadow: 3px 3px 0 rgba(0,0,0,0.7) !important;
      }
      [data-color-theme="southern_miss"][data-mode="dark"] .maverick-main {
        background:
          repeating-linear-gradient(0deg, transparent 0, transparent 59px, rgba(245,197,24,0.05) 59px, rgba(245,197,24,0.05) 60px),
          #0a0a00 !important;
      }

      /* ── Dallas Cowboys: navy & silver, AT&T Stadium prestige ── */
      [data-color-theme="dallas_cowboys"][data-mode="dark"] .maverick-card {
        border-left-color: #4a7fd4 !important;
        box-shadow: -2px 0 12px rgba(74,127,212,0.3), 2px 4px 12px rgba(0,0,0,0.5) !important;
        background: linear-gradient(135deg, #0e1830 0%, #0a1428 100%) !important;
      }
      [data-color-theme="dallas_cowboys"][data-mode="light"] .maverick-card {
        border-left-color: #003594 !important;
        box-shadow: -2px 0 8px rgba(0,53,148,0.20), 2px 3px 8px rgba(0,20,80,0.10) !important;
      }
      [data-color-theme="dallas_cowboys"][data-mode="dark"] .maverick-main {
        background:
          radial-gradient(ellipse at 50% 50%, rgba(134,147,151,0.04) 0%, transparent 70%),
          #060a14 !important;
      }

      /* ── Saints: black & gold, Bourbon Street swagger ── */
      [data-color-theme="saints"][data-mode="dark"] .maverick-card {
        border-left-color: #d3bc8d !important;
        box-shadow: -2px 0 12px rgba(211,188,141,0.25), 2px 4px 12px rgba(0,0,0,0.6) !important;
        background: linear-gradient(135deg, #181408 0%, #111008 100%) !important;
      }
      [data-color-theme="saints"][data-mode="light"] .maverick-card {
        border-left-color: #d3bc8d !important;
        border: 1px solid #222 !important;
        border-left: 4px solid #d3bc8d !important;
        box-shadow: 2px 3px 0 rgba(0,0,0,0.5) !important;
        background: #fff !important;
      }
      [data-color-theme="saints"][data-mode="dark"] .maverick-main {
        background:
          repeating-linear-gradient(90deg, transparent 0, transparent 29px, rgba(211,188,141,0.04) 29px, rgba(211,188,141,0.04) 30px),
          #080808 !important;
      }

      /* ── Broncos: orange & navy, Mile High altitude ── */
      [data-color-theme="broncos"][data-mode="dark"] .maverick-card {
        border-left-color: #fb4f14 !important;
        box-shadow: -2px 0 14px rgba(251,79,20,0.35), 2px 4px 12px rgba(0,0,0,0.5) !important;
        background: linear-gradient(135deg, #0e1428 0%, #0a1020 100%) !important;
      }
      [data-color-theme="broncos"][data-mode="light"] .maverick-card {
        border-left-color: #fb4f14 !important;
        box-shadow: -2px 0 8px rgba(251,79,20,0.25), 2px 3px 8px rgba(0,20,60,0.10) !important;
      }
      [data-color-theme="broncos"][data-mode="dark"] .maverick-main {
        background:
          radial-gradient(ellipse at 30% 100%, rgba(251,79,20,0.08) 0%, transparent 50%),
          #060810 !important;
      }

      /* ── Miami Hurricanes: orange & green, The U attitude ── */
      [data-color-theme="miami_hurricanes"][data-mode="dark"] .maverick-card {
        border-left-color: #f47321 !important;
        box-shadow: -2px 0 14px rgba(244,115,33,0.35), 2px 4px 12px rgba(0,0,0,0.5) !important;
        background: linear-gradient(135deg, #0a1e10 0%, #061408 100%) !important;
      }
      [data-color-theme="miami_hurricanes"][data-mode="light"] .maverick-card {
        border-left-color: #f47321 !important;
        box-shadow: -2px 0 8px rgba(244,115,33,0.25), 2px 3px 8px rgba(0,50,20,0.10) !important;
      }
      [data-color-theme="miami_hurricanes"][data-mode="dark"] .maverick-main {
        background:
          radial-gradient(ellipse at 70% 0%, rgba(244,115,33,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 30% 100%, rgba(0,80,48,0.12) 0%, transparent 50%),
          #040e08 !important;
      }
    `}</style>
  );
}

export function ResponsiveStyles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      /* Prevent iOS keyboard from jolting the layout */
      html, body {
        height: -webkit-fill-available;
        overflow-x: hidden;
      }
      /* Onboarding wizard scrolls naturally when keyboard is open */
      .maverick-onboarding {
        min-height: 100vh;
        min-height: -webkit-fill-available;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      @media (max-width: 768px) {
        .maverick-main { padding: 16px 12px 80px 12px !important; max-height: 100vh !important; }
        .maverick-content { max-width: 100% !important; }
        /* Force single-column grids */
        .maverick-content div[style*="gridTemplateColumns: repeat(auto-fit"] { grid-template-columns: 1fr !important; }
        .maverick-content div[style*="gridTemplateColumns: repeat(auto-fill"] { grid-template-columns: 1fr !important; }
        .maverick-content div[style*="gridTemplateColumns: repeat(3"] { grid-template-columns: 1fr 1fr !important; }
        .maverick-content div[style*="1fr 1fr 1fr"] { grid-template-columns: 1fr 1fr !important; }
        .maverick-content div[style*="gridTemplateColumns: 1fr 1fr\""] { grid-template-columns: 1fr !important; }
        /* Smaller headings */
        .maverick-content h1 { font-size: 22px !important; }
        /* Tighter cards */
        .maverick-content div[style*="padding: \"20px\""] { padding: 14px !important; }
        /* Table scroll */
        table { font-size: 12px !important; }
        /* Fix overlays on mobile */
        div[style*="position: fixed"][style*="padding: 20"] { padding: 10px !important; }
        div[style*="maxWidth: 420"] { max-width: 95vw !important; }
        div[style*="maxWidth: 440"] { max-width: 95vw !important; }
      }
      @media (max-width: 390px) {
        .maverick-content div[style*="gridTemplateColumns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        .maverick-content h1 { font-size: 20px !important; }
      }
    `}</style>
  );
}

// ─────────────────────────────────────────────
// FLOATING ACTION BUTTON (Quick Add)
// ─────────────────────────────────────────────

