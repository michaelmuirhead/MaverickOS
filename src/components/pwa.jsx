import { useEffect } from "react";

export function generateAppIcon(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  // Green background with rounded rect
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(size - r, 0); ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r); ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size); ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = "#1e40af";
  ctx.fill();
  // Money bag emoji
  ctx.font = `${size * 0.55}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💰", size / 2, size / 2 + size * 0.03);
  return canvas.toDataURL("image/png");
}

export function PwaHead() {
  useEffect(() => {
    // Generate icon
    const iconUrl = generateAppIcon(512);
    const iconUrl192 = generateAppIcon(192);

    // Apple touch icon
    let appleLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleLink) { appleLink = document.createElement("link"); appleLink.rel = "apple-touch-icon"; document.head.appendChild(appleLink); }
    appleLink.href = iconUrl;

    // Favicon
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) { favicon = document.createElement("link"); favicon.rel = "icon"; document.head.appendChild(favicon); }
    favicon.href = iconUrl192;

    // Theme color
    let theme = document.querySelector('meta[name="theme-color"]');
    if (!theme) { theme = document.createElement("meta"); theme.name = "theme-color"; document.head.appendChild(theme); }
    theme.content = "#1e40af";

    // Apple mobile web app capable
    let capable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!capable) { capable = document.createElement("meta"); capable.name = "apple-mobile-web-app-capable"; capable.content = "yes"; document.head.appendChild(capable); }

    // Apple status bar
    let statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusBar) { statusBar = document.createElement("meta"); statusBar.name = "apple-mobile-web-app-status-bar-style"; statusBar.content = "black-translucent"; document.head.appendChild(statusBar); }

    // Title
    document.title = "MaverickOS";

    // Fix iOS keyboard viewport shifting — update viewport meta
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) { viewport = document.createElement("meta"); viewport.name = "viewport"; document.head.appendChild(viewport); }
    viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content";

    // Web app manifest (inline as data URI)
    const manifest = {
      name: "MaverickOS",
      short_name: "MaverickOS",
      start_url: "/",
      display: "standalone",
      background_color: "#0c0c0e",
      theme_color: "#1e40af",
      icons: [
        { src: iconUrl192, sizes: "192x192", type: "image/png" },
        { src: iconUrl, sizes: "512x512", type: "image/png" },
      ],
    };
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) { manifestLink = document.createElement("link"); manifestLink.rel = "manifest"; document.head.appendChild(manifestLink); }
    manifestLink.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(manifest));
  }, []);

  return null;
}

// ─────────────────────────────────────────────
// ONBOARDING WIZARD
// ─────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { id: "welcome", title: "Welcome to MaverickOS", icon: "💰" },
  { id: "income", title: "Your Income", icon: "💼" },
  { id: "bills", title: "Monthly Bills", icon: "📋" },
  { id: "categories", title: "Budget Categories", icon: "📊" },
  { id: "finances", title: "Debts & Savings", icon: "🏦" },
  { id: "theme", title: "Make It Yours", icon: "🎨" },
];

