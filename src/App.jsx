import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ─────────────────────────────────────────────
// PERSISTENCE LAYER
// ─────────────────────────────────────────────

const STORAGE_KEY = "maverickos_data";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Restore Set from array
    if (data.paidDates) data.paidDates = new Set(data.paidDates);
    return data;
  } catch { return null; }
}

function saveState(state) {
  try {
    const toSave = { ...state, paidDates: [...state.paidDates] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// Settings defaults
const DEFAULT_SETTINGS = {
  currency: "USD",
  householdName: "My Household",
  theme: "dark",
  colorTheme: "blue_gold",
  startDayOfMonth: 1,
  // Pages visibility — toggle off pages you don't use
  hiddenPages: [],
  // Dashboard widget configuration — order and visibility
  dashboardWidgets: ["today", "networth", "metrics", "income", "spending", "bills", "savings", "debt"],
  // Notification preferences
  notifications: { billsDue: true, budgetAlert: true, monthlyRecap: true, savingsGoal: true },
};

// ─── RETRO / NOSTALGIC ────────────────────────────────────────────────────────
const RETRO_THEMES = {
  terminal: {
    label: "Terminal Green", preview: ["#00ff41", "#003b00", "#0d0d0d"],
    dark: {
      "--bg": "#0d0d0d", "--card": "#0a1a0a", "--surface": "#060e06", "--sidebar": "#080f08",
      "--border": "#00ff4130", "--border-hover": "#00ff4160", "--border-subtle": "#00ff4118",
      "--track": "#001800", "--nav-active": "#001f00", "--nav-hover": "#001500",
      "--text-primary": "#00ff41", "--text-secondary": "#00cc33", "--text-muted": "#007a1e",
      "--icon-bg": "#001a00",
      "--green": "#00ff41", "--green-bg": "#00ff4118",
      "--amber": "#ffff00", "--amber-bg": "#ffff0018",
      "--red": "#ff3333", "--red-bg": "#ff333318",
      "--accent": "#00ff41",
      "--shadow": "rgba(0,255,65,0.08)", "--shadow-heavy": "rgba(0,255,65,0.2)",
    },
    light: {
      "--bg": "#f0fff4", "--card": "#ffffff", "--surface": "#f5fff8", "--sidebar": "#e8ffee",
      "--border": "#00aa2a", "--border-hover": "#008020", "--border-subtle": "#cceecc",
      "--track": "#ddffdd", "--nav-active": "#d0ffd0", "--nav-hover": "#e4ffe4",
      "--text-primary": "#002200", "--text-secondary": "#006620", "--text-muted": "#339944",
      "--icon-bg": "#d0ffd0",
      "--green": "#00aa2a", "--green-bg": "#00aa2a18",
      "--amber": "#886600", "--amber-bg": "#88660018",
      "--red": "#cc0000", "--red-bg": "#cc000018",
      "--accent": "#008822",
      "--shadow": "rgba(0,100,30,0.08)", "--shadow-heavy": "rgba(0,100,30,0.18)",
    },
  },
  synthwave: {
    label: "Synthwave", preview: ["#ff2d78", "#00f0ff", "#7b2fff"],
    dark: {
      "--bg": "#0d0015", "--card": "#160a28", "--surface": "#100520", "--sidebar": "#0e0420",
      "--border": "#7b2fff40", "--border-hover": "#7b2fff80", "--border-subtle": "#7b2fff20",
      "--track": "#1a0a30", "--nav-active": "#1e0a38", "--nav-hover": "#18082e",
      "--text-primary": "#f0e0ff", "--text-secondary": "#c090ff", "--text-muted": "#8050c0",
      "--icon-bg": "#1e0a38",
      "--green": "#00f0ff", "--green-bg": "#00f0ff18",
      "--amber": "#ffb800", "--amber-bg": "#ffb80018",
      "--red": "#ff2d78", "--red-bg": "#ff2d7818",
      "--accent": "#ff2d78",
      "--shadow": "rgba(123,47,255,0.2)", "--shadow-heavy": "rgba(123,47,255,0.5)",
    },
    light: {
      "--bg": "#fdf0ff", "--card": "#fff8ff", "--surface": "#f8eeff", "--sidebar": "#f2e4ff",
      "--border": "#c060ff", "--border-hover": "#a030ee", "--border-subtle": "#e8c8ff",
      "--track": "#eedcff", "--nav-active": "#ead4ff", "--nav-hover": "#f0e0ff",
      "--text-primary": "#1a002e", "--text-secondary": "#6600aa", "--text-muted": "#9940cc",
      "--icon-bg": "#ead4ff",
      "--green": "#007acc", "--green-bg": "#007acc18",
      "--amber": "#cc7700", "--amber-bg": "#cc770018",
      "--red": "#cc0055", "--red-bg": "#cc005518",
      "--accent": "#9900dd",
      "--shadow": "rgba(100,0,180,0.10)", "--shadow-heavy": "rgba(100,0,180,0.22)",
    },
  },
  newspaper: {
    label: "Newspaper", preview: ["#1a1a1a", "#f5f0e8", "#8b0000"],
    dark: {
      "--bg": "#111008", "--card": "#1c1a10", "--surface": "#161408", "--sidebar": "#141208",
      "--border": "#3a3820", "--border-hover": "#5a5630", "--border-subtle": "#282618",
      "--track": "#282618", "--nav-active": "#2c2a18", "--nav-hover": "#222010",
      "--text-primary": "#f0ead8", "--text-secondary": "#c8c0a0", "--text-muted": "#888060",
      "--icon-bg": "#2c2a18",
      "--green": "#3a7a3a", "--green-bg": "#3a7a3a18",
      "--amber": "#aa8800", "--amber-bg": "#aa880018",
      "--red": "#8b0000", "--red-bg": "#8b000018",
      "--accent": "#8b0000",
      "--shadow": "rgba(0,0,0,0.4)", "--shadow-heavy": "rgba(0,0,0,0.7)",
    },
    light: {
      "--bg": "#f5f0e8", "--card": "#faf7f0", "--surface": "#f0ebe0", "--sidebar": "#ece6d8",
      "--border": "#2a2a2a", "--border-hover": "#111111", "--border-subtle": "#c8c0a8",
      "--track": "#d8d0b8", "--nav-active": "#e4dcc8", "--nav-hover": "#ece4d0",
      "--text-primary": "#111008", "--text-secondary": "#3a3828", "--text-muted": "#6a6848",
      "--icon-bg": "#e4dcc8",
      "--green": "#1a5c1a", "--green-bg": "#1a5c1a18",
      "--amber": "#8b6600", "--amber-bg": "#8b660018",
      "--red": "#8b0000", "--red-bg": "#8b000018",
      "--accent": "#8b0000",
      "--shadow": "rgba(0,0,0,0.12)", "--shadow-heavy": "rgba(0,0,0,0.28)",
    },
  },
  blueprint: {
    label: "Blueprint", preview: ["#ffffff", "#1a3a6e", "#4a90d9"],
    dark: {
      "--bg": "#0c1e3a", "--card": "#102448", "--surface": "#0a1c36", "--sidebar": "#091830",
      "--border": "#4a90d940", "--border-hover": "#4a90d980", "--border-subtle": "#4a90d920",
      "--track": "#0e2040", "--nav-active": "#122848", "--nav-hover": "#0e2040",
      "--text-primary": "#e8f4ff", "--text-secondary": "#90c4f0", "--text-muted": "#5090c0",
      "--icon-bg": "#122848",
      "--green": "#40d0a0", "--green-bg": "#40d0a018",
      "--amber": "#f0c040", "--amber-bg": "#f0c04018",
      "--red": "#f04060", "--red-bg": "#f0406018",
      "--accent": "#4a90d9",
      "--shadow": "rgba(0,20,60,0.4)", "--shadow-heavy": "rgba(0,20,60,0.7)",
    },
    light: {
      "--bg": "#1a3a6e", "--card": "#1e4480", "--surface": "#163260", "--sidebar": "#142e58",
      "--border": "#ffffff40", "--border-hover": "#ffffff80", "--border-subtle": "#ffffff20",
      "--track": "#163060", "--nav-active": "#204888", "--nav-hover": "#1c3e78",
      "--text-primary": "#ffffff", "--text-secondary": "#b0d4f8", "--text-muted": "#7090c0",
      "--icon-bg": "#204888",
      "--green": "#40ffcc", "--green-bg": "#40ffcc18",
      "--amber": "#ffd040", "--amber-bg": "#ffd04018",
      "--red": "#ff6080", "--red-bg": "#ff608018",
      "--accent": "#60b8ff",
      "--shadow": "rgba(0,10,40,0.4)", "--shadow-heavy": "rgba(0,10,40,0.7)",
    },
  },
};

// ─── CULTURAL / HISTORICAL ────────────────────────────────────────────────────
const CULTURAL_THEMES = {
  art_deco: {
    label: "Art Deco", preview: ["#c9a84c", "#1a1a2e", "#e8e0c8"],
    dark: {
      "--bg": "#0e0e18", "--card": "#16162a", "--surface": "#111120", "--sidebar": "#0e0e20",
      "--border": "#c9a84c40", "--border-hover": "#c9a84c80", "--border-subtle": "#c9a84c20",
      "--track": "#1a1a30", "--nav-active": "#1e1e36", "--nav-hover": "#18182c",
      "--text-primary": "#f0e8cc", "--text-secondary": "#c9a84c", "--text-muted": "#806830",
      "--icon-bg": "#1e1e36",
      "--green": "#40c080", "--green-bg": "#40c08018",
      "--amber": "#c9a84c", "--amber-bg": "#c9a84c18",
      "--red": "#c04040", "--red-bg": "#c0404018",
      "--accent": "#c9a84c",
      "--shadow": "rgba(0,0,0,0.4)", "--shadow-heavy": "rgba(0,0,0,0.7)",
    },
    light: {
      "--bg": "#f8f4e8", "--card": "#fdfaf0", "--surface": "#f4f0e0", "--sidebar": "#ece4cc",
      "--border": "#c9a84c", "--border-hover": "#a88030", "--border-subtle": "#e8d8a0",
      "--track": "#e8d8a0", "--nav-active": "#f0e4b0", "--nav-hover": "#f4eccc",
      "--text-primary": "#1a1408", "--text-secondary": "#4a3810", "--text-muted": "#806830",
      "--icon-bg": "#f0e4b0",
      "--green": "#1a7a40", "--green-bg": "#1a7a4018",
      "--amber": "#a07800", "--amber-bg": "#a0780018",
      "--red": "#9a2020", "--red-bg": "#9a202018",
      "--accent": "#9a6800",
      "--shadow": "rgba(60,40,0,0.12)", "--shadow-heavy": "rgba(60,40,0,0.28)",
    },
  },
  ancient_egypt: {
    label: "Ancient Egypt", preview: ["#d4af37", "#1a3a5c", "#c44a1a"],
    dark: {
      "--bg": "#0a0e18", "--card": "#101828", "--surface": "#0c1420", "--sidebar": "#091218",
      "--border": "#d4af3740", "--border-hover": "#d4af3780", "--border-subtle": "#d4af3720",
      "--track": "#0e1830", "--nav-active": "#121e36", "--nav-hover": "#0e182c",
      "--text-primary": "#f8e8b0", "--text-secondary": "#d4af37", "--text-muted": "#886620",
      "--icon-bg": "#121e36",
      "--green": "#40c0a0", "--green-bg": "#40c0a018",
      "--amber": "#d4af37", "--amber-bg": "#d4af3718",
      "--red": "#c44a1a", "--red-bg": "#c44a1a18",
      "--accent": "#d4af37",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#f5e8c0", "--card": "#fdf4d0", "--surface": "#f0e0b0", "--sidebar": "#e8d4a0",
      "--border": "#c44a1a", "--border-hover": "#a03a10", "--border-subtle": "#e8c080",
      "--track": "#e8c080", "--nav-active": "#f0d090", "--nav-hover": "#f4dca8",
      "--text-primary": "#1a0c00", "--text-secondary": "#5a2a00", "--text-muted": "#8a5a20",
      "--icon-bg": "#f0d090",
      "--green": "#1a7a5a", "--green-bg": "#1a7a5a18",
      "--amber": "#9a7000", "--amber-bg": "#9a700018",
      "--red": "#c44a1a", "--red-bg": "#c44a1a18",
      "--accent": "#c44a1a",
      "--shadow": "rgba(80,40,0,0.15)", "--shadow-heavy": "rgba(80,40,0,0.3)",
    },
  },
  neon_tokyo: {
    label: "Neon Tokyo", preview: ["#ff0080", "#00ffcc", "#ff8800"],
    dark: {
      "--bg": "#080810", "--card": "#0e0e1c", "--surface": "#0a0a16", "--sidebar": "#080812",
      "--border": "#ff008030", "--border-hover": "#ff008070", "--border-subtle": "#ff008018",
      "--track": "#0c0c1a", "--nav-active": "#100c20", "--nav-hover": "#0c0a18",
      "--text-primary": "#f0f0ff", "--text-secondary": "#a080c0", "--text-muted": "#604880",
      "--icon-bg": "#100c20",
      "--green": "#00ffcc", "--green-bg": "#00ffcc18",
      "--amber": "#ff8800", "--amber-bg": "#ff880018",
      "--red": "#ff0080", "--red-bg": "#ff008018",
      "--accent": "#ff0080",
      "--shadow": "rgba(255,0,128,0.15)", "--shadow-heavy": "rgba(255,0,128,0.35)",
    },
    light: {
      "--bg": "#fff0f8", "--card": "#ffffff", "--surface": "#fef0fa", "--sidebar": "#fce8f4",
      "--border": "#ff0080", "--border-hover": "#cc0060", "--border-subtle": "#ffc0e0",
      "--track": "#ffdcee", "--nav-active": "#ffd4e8", "--nav-hover": "#ffe4f0",
      "--text-primary": "#100010", "--text-secondary": "#600040", "--text-muted": "#a04080",
      "--icon-bg": "#ffd4e8",
      "--green": "#008866", "--green-bg": "#00886618",
      "--amber": "#cc5500", "--amber-bg": "#cc550018",
      "--red": "#cc0055", "--red-bg": "#cc005518",
      "--accent": "#cc0066",
      "--shadow": "rgba(200,0,100,0.10)", "--shadow-heavy": "rgba(200,0,100,0.22)",
    },
  },
};

// ─── PLAYFUL ─────────────────────────────────────────────────────────────────
const PLAYFUL_THEMES = {
  crayon: {
    label: "Crayon", preview: ["#ff6b9d", "#ffd93d", "#6bcb77"],
    dark: {
      "--bg": "#1a1025", "--card": "#221830", "--surface": "#1c1228", "--sidebar": "#180e22",
      "--border": "#ff6b9d40", "--border-hover": "#ff6b9d80", "--border-subtle": "#ff6b9d20",
      "--track": "#1e1230", "--nav-active": "#241838", "--nav-hover": "#1e1430",
      "--text-primary": "#fff0f8", "--text-secondary": "#ff6b9d", "--text-muted": "#a04070",
      "--icon-bg": "#241838",
      "--green": "#6bcb77", "--green-bg": "#6bcb7718",
      "--amber": "#ffd93d", "--amber-bg": "#ffd93d18",
      "--red": "#ff6b6b", "--red-bg": "#ff6b6b18",
      "--accent": "#ff6b9d",
      "--shadow": "rgba(0,0,0,0.3)", "--shadow-heavy": "rgba(0,0,0,0.6)",
    },
    light: {
      "--bg": "#fffbf0", "--card": "#ffffff", "--surface": "#fff8ee", "--sidebar": "#fff0e8",
      "--border": "#ffb3d1", "--border-hover": "#ff80b0", "--border-subtle": "#ffe8f4",
      "--track": "#ffe8f4", "--nav-active": "#ffd8ec", "--nav-hover": "#ffeef6",
      "--text-primary": "#2a1020", "--text-secondary": "#7a2050", "--text-muted": "#b06080",
      "--icon-bg": "#ffd8ec",
      "--green": "#2a9a40", "--green-bg": "#2a9a4018",
      "--amber": "#cc8800", "--amber-bg": "#cc880018",
      "--red": "#e83050", "--red-bg": "#e8305018",
      "--accent": "#e83080",
      "--shadow": "rgba(200,80,120,0.10)", "--shadow-heavy": "rgba(200,80,120,0.22)",
    },
  },
  chalkboard: {
    label: "Chalkboard", preview: ["#ffffff", "#2d5a27", "#f5e642"],
    dark: {
      "--bg": "#1a2e1a", "--card": "#223822", "--surface": "#1c3020", "--sidebar": "#182a18",
      "--border": "#ffffff30", "--border-hover": "#ffffff60", "--border-subtle": "#ffffff18",
      "--track": "#1e3020", "--nav-active": "#243e24", "--nav-hover": "#1e3820",
      "--text-primary": "#f0f8f0", "--text-secondary": "#c0e0c0", "--text-muted": "#7aa07a",
      "--icon-bg": "#243e24",
      "--green": "#80e880", "--green-bg": "#80e88018",
      "--amber": "#f5e642", "--amber-bg": "#f5e64218",
      "--red": "#ff8080", "--red-bg": "#ff808018",
      "--accent": "#f5e642",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#2d5a27", "--card": "#355e30", "--surface": "#28521e", "--sidebar": "#244a1a",
      "--border": "#ffffff50", "--border-hover": "#ffffffa0", "--border-subtle": "#ffffff28",
      "--track": "#244a1a", "--nav-active": "#3a6834", "--nav-hover": "#305828",
      "--text-primary": "#f8fff8", "--text-secondary": "#c8f0c0", "--text-muted": "#88c080",
      "--icon-bg": "#3a6834",
      "--green": "#a0ffa0", "--green-bg": "#a0ffa018",
      "--amber": "#f5e642", "--amber-bg": "#f5e64218",
      "--red": "#ff8080", "--red-bg": "#ff808018",
      "--accent": "#f5e642",
      "--shadow": "rgba(0,0,0,0.4)", "--shadow-heavy": "rgba(0,0,0,0.7)",
    },
  },
  lego: {
    label: "LEGO", preview: ["#e3000b", "#ffcd00", "#006cb7"],
    dark: {
      "--bg": "#0a0a0a", "--card": "#141414", "--surface": "#0e0e0e", "--sidebar": "#111111",
      "--border": "#e3000b", "--border-hover": "#ff2020", "--border-subtle": "#e3000b40",
      "--track": "#1e1e1e", "--nav-active": "#1a0000", "--nav-hover": "#160000",
      "--text-primary": "#ffffff", "--text-secondary": "#ffcd00", "--text-muted": "#888888",
      "--icon-bg": "#1a0000",
      "--green": "#00a650", "--green-bg": "#00a65018",
      "--amber": "#ffcd00", "--amber-bg": "#ffcd0018",
      "--red": "#e3000b", "--red-bg": "#e3000b18",
      "--accent": "#e3000b",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#f5f5f5", "--card": "#ffffff", "--surface": "#eeeeee", "--sidebar": "#e8e8e8",
      "--border": "#006cb7", "--border-hover": "#004e8a", "--border-subtle": "#b8d4ec",
      "--track": "#d0e8f8", "--nav-active": "#c8e0f4", "--nav-hover": "#d8ecf8",
      "--text-primary": "#111111", "--text-secondary": "#006cb7", "--text-muted": "#5a5a5a",
      "--icon-bg": "#c8e0f4",
      "--green": "#00a650", "--green-bg": "#00a65018",
      "--amber": "#cc9900", "--amber-bg": "#cc990018",
      "--red": "#e3000b", "--red-bg": "#e3000b18",
      "--accent": "#e3000b",
      "--shadow": "rgba(0,0,0,0.10)", "--shadow-heavy": "rgba(0,0,0,0.22)",
    },
  },
};

// ─── SPORTS THEMES ───────────────────────────────────────────────────────────
const SPORTS_THEMES = {
  msu_bulldogs: {
    label: "MSU Bulldogs", preview: ["#660000", "#ffffff", "#5d4c00"],
    dark: {
      "--bg": "#0d0000", "--card": "#1a0000", "--surface": "#140000", "--sidebar": "#110000",
      "--border": "#66000050", "--border-hover": "#660000a0", "--border-subtle": "#66000028",
      "--track": "#1e0000", "--nav-active": "#280000", "--nav-hover": "#200000",
      "--text-primary": "#ffffff", "--text-secondary": "#e0c080", "--text-muted": "#a07040",
      "--icon-bg": "#280000",
      "--green": "#b8c000", "--green-bg": "#b8c00018",
      "--amber": "#e0c060", "--amber-bg": "#e0c06018",
      "--red": "#ff4040", "--red-bg": "#ff404018",
      "--accent": "#660000",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#fff8f8", "--card": "#ffffff", "--surface": "#fff0f0", "--sidebar": "#ffe8e8",
      "--border": "#660000", "--border-hover": "#440000", "--border-subtle": "#ffcccc",
      "--track": "#ffd8d8", "--nav-active": "#ffd0d0", "--nav-hover": "#ffe0e0",
      "--text-primary": "#1a0000", "--text-secondary": "#660000", "--text-muted": "#994444",
      "--icon-bg": "#ffd0d0",
      "--green": "#4a7a00", "--green-bg": "#4a7a0018",
      "--amber": "#8a6600", "--amber-bg": "#8a660018",
      "--red": "#cc0000", "--red-bg": "#cc000018",
      "--accent": "#660000",
      "--shadow": "rgba(80,0,0,0.10)", "--shadow-heavy": "rgba(80,0,0,0.22)",
    },
  },
  alabama: {
    label: "Alabama Crimson Tide", preview: ["#9e1b32", "#ffffff", "#828a8f"],
    dark: {
      "--bg": "#0c0008", "--card": "#1a0010", "--surface": "#140008", "--sidebar": "#110008",
      "--border": "#9e1b3240", "--border-hover": "#9e1b3280", "--border-subtle": "#9e1b3220",
      "--track": "#1e0012", "--nav-active": "#260014", "--nav-hover": "#1e0010",
      "--text-primary": "#ffffff", "--text-secondary": "#c8c8cc", "--text-muted": "#828a8f",
      "--icon-bg": "#260014",
      "--green": "#40c080", "--green-bg": "#40c08018",
      "--amber": "#e8c060", "--amber-bg": "#e8c06018",
      "--red": "#ff4060", "--red-bg": "#ff406018",
      "--accent": "#9e1b32",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#fdf8f9", "--card": "#ffffff", "--surface": "#f8f0f2", "--sidebar": "#f2e8ea",
      "--border": "#9e1b32", "--border-hover": "#7a1225", "--border-subtle": "#f0c8d0",
      "--track": "#f0c8d0", "--nav-active": "#ead0d8", "--nav-hover": "#f4dce0",
      "--text-primary": "#1a0008", "--text-secondary": "#9e1b32", "--text-muted": "#828a8f",
      "--icon-bg": "#ead0d8",
      "--green": "#1a7a40", "--green-bg": "#1a7a4018",
      "--amber": "#9a6a00", "--amber-bg": "#9a6a0018",
      "--red": "#cc1020", "--red-bg": "#cc102018",
      "--accent": "#9e1b32",
      "--shadow": "rgba(100,10,30,0.10)", "--shadow-heavy": "rgba(100,10,30,0.22)",
    },
  },
  lsu_tigers: {
    label: "LSU Tigers", preview: ["#461d7c", "#fdd023", "#ffffff"],
    dark: {
      "--bg": "#080010", "--card": "#100020", "--surface": "#0c0018", "--sidebar": "#0a0014",
      "--border": "#461d7c50", "--border-hover": "#461d7c90", "--border-subtle": "#461d7c28",
      "--track": "#140028", "--nav-active": "#180030", "--nav-hover": "#140024",
      "--text-primary": "#fdd023", "--text-secondary": "#e8c840", "--text-muted": "#9a8030",
      "--icon-bg": "#180030",
      "--green": "#40c080", "--green-bg": "#40c08018",
      "--amber": "#fdd023", "--amber-bg": "#fdd02318",
      "--red": "#ff4060", "--red-bg": "#ff406018",
      "--accent": "#fdd023",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#faf8ff", "--card": "#ffffff", "--surface": "#f4f0ff", "--sidebar": "#ede8ff",
      "--border": "#461d7c", "--border-hover": "#341060", "--border-subtle": "#d0c0f0",
      "--track": "#d8ccf4", "--nav-active": "#d4c8f0", "--nav-hover": "#e0d8f8",
      "--text-primary": "#10002a", "--text-secondary": "#461d7c", "--text-muted": "#7050a0",
      "--icon-bg": "#d4c8f0",
      "--green": "#1a7a40", "--green-bg": "#1a7a4018",
      "--amber": "#b08800", "--amber-bg": "#b0880018",
      "--red": "#cc1020", "--red-bg": "#cc102018",
      "--accent": "#461d7c",
      "--shadow": "rgba(40,10,80,0.10)", "--shadow-heavy": "rgba(40,10,80,0.22)",
    },
  },
  ole_miss: {
    label: "Ole Miss Rebels", preview: ["#ce1126", "#14213d", "#ffffff"],
    dark: {
      "--bg": "#08080e", "--card": "#10101e", "--surface": "#0c0c18", "--sidebar": "#0a0a14",
      "--border": "#ce112630", "--border-hover": "#ce112270", "--border-subtle": "#ce112218",
      "--track": "#141428", "--nav-active": "#181830", "--nav-hover": "#141424",
      "--text-primary": "#ffffff", "--text-secondary": "#c0c8e0", "--text-muted": "#6870a0",
      "--icon-bg": "#181830",
      "--green": "#40c080", "--green-bg": "#40c08018",
      "--amber": "#e8c060", "--amber-bg": "#e8c06018",
      "--red": "#ce1126", "--red-bg": "#ce112618",
      "--accent": "#ce1126",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#f8f9fc", "--card": "#ffffff", "--surface": "#f0f2f8", "--sidebar": "#e8eaf2",
      "--border": "#14213d", "--border-hover": "#0a1428", "--border-subtle": "#c8cce0",
      "--track": "#d4d8ec", "--nav-active": "#d0d4e8", "--nav-hover": "#dcdff0",
      "--text-primary": "#0a0c1a", "--text-secondary": "#14213d", "--text-muted": "#505a80",
      "--icon-bg": "#d0d4e8",
      "--green": "#1a7a40", "--green-bg": "#1a7a4018",
      "--amber": "#9a7000", "--amber-bg": "#9a700018",
      "--red": "#ce1126", "--red-bg": "#ce112618",
      "--accent": "#ce1126",
      "--shadow": "rgba(10,15,40,0.10)", "--shadow-heavy": "rgba(10,15,40,0.22)",
    },
  },
  southern_miss: {
    label: "Southern Miss Eagles", preview: ["#f5c518", "#000000", "#fedb00"],
    dark: {
      "--bg": "#0a0a00", "--card": "#161600", "--surface": "#101000", "--sidebar": "#0e0e00",
      "--border": "#f5c51840", "--border-hover": "#f5c51880", "--border-subtle": "#f5c51820",
      "--track": "#1a1a00", "--nav-active": "#222200", "--nav-hover": "#1a1a00",
      "--text-primary": "#f5c518", "--text-secondary": "#e0b010", "--text-muted": "#8a7010",
      "--icon-bg": "#222200",
      "--green": "#80c840", "--green-bg": "#80c84018",
      "--amber": "#f5c518", "--amber-bg": "#f5c51818",
      "--red": "#ff4040", "--red-bg": "#ff404018",
      "--accent": "#f5c518",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#fffde8", "--card": "#ffffff", "--surface": "#fffbe0", "--sidebar": "#fff8d0",
      "--border": "#222200", "--border-hover": "#111100", "--border-subtle": "#e8e0a0",
      "--track": "#e8e090", "--nav-active": "#f0e888", "--nav-hover": "#f8f0a0",
      "--text-primary": "#111100", "--text-secondary": "#333300", "--text-muted": "#666630",
      "--icon-bg": "#f0e888",
      "--green": "#2a6a00", "--green-bg": "#2a6a0018",
      "--amber": "#9a7800", "--amber-bg": "#9a780018",
      "--red": "#cc2200", "--red-bg": "#cc220018",
      "--accent": "#c8a000",
      "--shadow": "rgba(40,40,0,0.10)", "--shadow-heavy": "rgba(40,40,0,0.22)",
    },
  },
  dallas_cowboys: {
    label: "Dallas Cowboys", preview: ["#003594", "#869397", "#ffffff"],
    dark: {
      "--bg": "#060a14", "--card": "#0c1428", "--surface": "#08101e", "--sidebar": "#060e1a",
      "--border": "#00359440", "--border-hover": "#00359480", "--border-subtle": "#00359420",
      "--track": "#0e1a34", "--nav-active": "#10203e", "--nav-hover": "#0c1a34",
      "--text-primary": "#ffffff", "--text-secondary": "#a8b8cc", "--text-muted": "#607080",
      "--icon-bg": "#10203e",
      "--green": "#40c080", "--green-bg": "#40c08018",
      "--amber": "#c8a840", "--amber-bg": "#c8a84018",
      "--red": "#e04040", "--red-bg": "#e0404018",
      "--accent": "#4a7fd4",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#f0f4ff", "--card": "#ffffff", "--surface": "#e8f0fc", "--sidebar": "#dce8f8",
      "--border": "#003594", "--border-hover": "#002270", "--border-subtle": "#b8cce8",
      "--track": "#c8d8f0", "--nav-active": "#c0d0ec", "--nav-hover": "#d0dcf4",
      "--text-primary": "#020a20", "--text-secondary": "#003594", "--text-muted": "#5070a0",
      "--icon-bg": "#c0d0ec",
      "--green": "#1a7a40", "--green-bg": "#1a7a4018",
      "--amber": "#9a7000", "--amber-bg": "#9a700018",
      "--red": "#cc1020", "--red-bg": "#cc102018",
      "--accent": "#003594",
      "--shadow": "rgba(0,30,100,0.10)", "--shadow-heavy": "rgba(0,30,100,0.22)",
    },
  },
  saints: {
    label: "New Orleans Saints", preview: ["#d3bc8d", "#101820", "#ffffff"],
    dark: {
      "--bg": "#080808", "--card": "#111008", "--surface": "#0c0c06", "--sidebar": "#0a0a06",
      "--border": "#d3bc8d40", "--border-hover": "#d3bc8d80", "--border-subtle": "#d3bc8d20",
      "--track": "#181408", "--nav-active": "#201c0c", "--nav-hover": "#181408",
      "--text-primary": "#d3bc8d", "--text-secondary": "#c0a870", "--text-muted": "#806840",
      "--icon-bg": "#201c0c",
      "--green": "#60c060", "--green-bg": "#60c06018",
      "--amber": "#d3bc8d", "--amber-bg": "#d3bc8d18",
      "--red": "#e04040", "--red-bg": "#e0404018",
      "--accent": "#d3bc8d",
      "--shadow": "rgba(0,0,0,0.6)", "--shadow-heavy": "rgba(0,0,0,0.85)",
    },
    light: {
      "--bg": "#faf8f0", "--card": "#ffffff", "--surface": "#f4f0e4", "--sidebar": "#ece8d8",
      "--border": "#101820", "--border-hover": "#080e14", "--border-subtle": "#c8c0a0",
      "--track": "#dcd4b0", "--nav-active": "#e4dcc0", "--nav-hover": "#eee8d4",
      "--text-primary": "#080808", "--text-secondary": "#101820", "--text-muted": "#706040",
      "--icon-bg": "#e4dcc0",
      "--green": "#1a6a20", "--green-bg": "#1a6a2018",
      "--amber": "#806000", "--amber-bg": "#80600018",
      "--red": "#aa1010", "--red-bg": "#aa101018",
      "--accent": "#9a8050",
      "--shadow": "rgba(10,10,10,0.10)", "--shadow-heavy": "rgba(10,10,10,0.25)",
    },
  },
  broncos: {
    label: "Denver Broncos", preview: ["#fb4f14", "#002244", "#ffffff"],
    dark: {
      "--bg": "#060810", "--card": "#0c1020", "--surface": "#080c18", "--sidebar": "#060a14",
      "--border": "#fb4f1440", "--border-hover": "#fb4f1480", "--border-subtle": "#fb4f1420",
      "--track": "#0e1428", "--nav-active": "#121830", "--nav-hover": "#0e1428",
      "--text-primary": "#ffffff", "--text-secondary": "#fb4f14", "--text-muted": "#9060408",
      "--icon-bg": "#121830",
      "--green": "#40c080", "--green-bg": "#40c08018",
      "--amber": "#fb4f14", "--amber-bg": "#fb4f1418",
      "--red": "#fb4f14", "--red-bg": "#fb4f1418",
      "--accent": "#fb4f14",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#f8f9ff", "--card": "#ffffff", "--surface": "#f0f2fc", "--sidebar": "#e4e8f8",
      "--border": "#002244", "--border-hover": "#001430", "--border-subtle": "#b8c4e0",
      "--track": "#c8d0ec", "--nav-active": "#c0cce8", "--nav-hover": "#ccd4f0",
      "--text-primary": "#020614", "--text-secondary": "#002244", "--text-muted": "#4060a0",
      "--icon-bg": "#c0cce8",
      "--green": "#1a7a40", "--green-bg": "#1a7a4018",
      "--amber": "#c04000", "--amber-bg": "#c0400018",
      "--red": "#fb4f14", "--red-bg": "#fb4f1418",
      "--accent": "#fb4f14",
      "--shadow": "rgba(0,20,60,0.10)", "--shadow-heavy": "rgba(0,20,60,0.22)",
    },
  },
  miami_hurricanes: {
    label: "Miami Hurricanes", preview: ["#f47321", "#005030", "#ffffff"],
    dark: {
      "--bg": "#040e08", "--card": "#081a10", "--surface": "#061408", "--sidebar": "#051008",
      "--border": "#f4732140", "--border-hover": "#f4732180", "--border-subtle": "#f4732120",
      "--track": "#0a1a0c", "--nav-active": "#0e2214", "--nav-hover": "#0a1a0e",
      "--text-primary": "#ffffff", "--text-secondary": "#f47321", "--text-muted": "#80601040",
      "--icon-bg": "#0e2214",
      "--green": "#00a060", "--green-bg": "#00a06018",
      "--amber": "#f47321", "--amber-bg": "#f4732118",
      "--red": "#f47321", "--red-bg": "#f4732118",
      "--accent": "#f47321",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#f4fff8", "--card": "#ffffff", "--surface": "#edfff4", "--sidebar": "#e0f8ea",
      "--border": "#005030", "--border-hover": "#003820", "--border-subtle": "#a0d8b8",
      "--track": "#b8e8cc", "--nav-active": "#b0e0c4", "--nav-hover": "#c4ecd4",
      "--text-primary": "#021408", "--text-secondary": "#005030", "--text-muted": "#306848",
      "--icon-bg": "#b0e0c4",
      "--green": "#005030", "--green-bg": "#00503018",
      "--amber": "#c05800", "--amber-bg": "#c0580018",
      "--red": "#f47321", "--red-bg": "#f4732118",
      "--accent": "#f47321",
      "--shadow": "rgba(0,50,20,0.10)", "--shadow-heavy": "rgba(0,50,20,0.22)",
    },
  },
};


const MINIMAL_THEMES = {
  swiss: {
    label: "Swiss Modernist", preview: ["#e63312", "#111111", "#ffffff"],
    dark: {
      "--bg": "#0a0a0a", "--card": "#141414", "--surface": "#0e0e0e", "--sidebar": "#111111",
      "--border": "#2a2a2a", "--border-hover": "#444444", "--border-subtle": "#1e1e1e",
      "--track": "#1e1e1e", "--nav-active": "#1a0000", "--nav-hover": "#161616",
      "--text-primary": "#ffffff", "--text-secondary": "#999999", "--text-muted": "#555555",
      "--icon-bg": "#1a1a1a",
      "--green": "#00cc44", "--green-bg": "#00cc4418",
      "--amber": "#ffaa00", "--amber-bg": "#ffaa0018",
      "--red": "#e63312", "--red-bg": "#e6331218",
      "--accent": "#e63312",
      "--shadow": "rgba(0,0,0,0.5)", "--shadow-heavy": "rgba(0,0,0,0.8)",
    },
    light: {
      "--bg": "#ffffff", "--card": "#ffffff", "--surface": "#f5f5f5", "--sidebar": "#f0f0f0",
      "--border": "#111111", "--border-hover": "#000000", "--border-subtle": "#cccccc",
      "--track": "#e0e0e0", "--nav-active": "#ffe8e4", "--nav-hover": "#f5f5f5",
      "--text-primary": "#111111", "--text-secondary": "#555555", "--text-muted": "#999999",
      "--icon-bg": "#ffe8e4",
      "--green": "#007722", "--green-bg": "#00772218",
      "--amber": "#cc7700", "--amber-bg": "#cc770018",
      "--red": "#e63312", "--red-bg": "#e6331218",
      "--accent": "#e63312",
      "--shadow": "rgba(0,0,0,0.08)", "--shadow-heavy": "rgba(0,0,0,0.18)",
    },
  },
  lofi_paper: {
    label: "Lo-Fi Paper", preview: ["#6b7c93", "#f8f5ef", "#c4785a"],
    dark: {
      "--bg": "#1a1814", "--card": "#221e18", "--surface": "#1c1a15", "--sidebar": "#181610",
      "--border": "#3a3628", "--border-hover": "#5a5440", "--border-subtle": "#2a2820",
      "--track": "#2a2820", "--nav-active": "#2e2a20", "--nav-hover": "#242018",
      "--text-primary": "#e8e0d0", "--text-secondary": "#b0a890", "--text-muted": "#7a7060",
      "--icon-bg": "#2e2a20",
      "--green": "#6a9a6a", "--green-bg": "#6a9a6a18",
      "--amber": "#c4785a", "--amber-bg": "#c4785a18",
      "--red": "#c05050", "--red-bg": "#c0505018",
      "--accent": "#c4785a",
      "--shadow": "rgba(0,0,0,0.35)", "--shadow-heavy": "rgba(0,0,0,0.6)",
    },
    light: {
      "--bg": "#f8f5ef", "--card": "#fdfaf5", "--surface": "#f4f0e8", "--sidebar": "#eeeae0",
      "--border": "#c8bea8", "--border-hover": "#a89e88", "--border-subtle": "#ddd8cc",
      "--track": "#ddd8cc", "--nav-active": "#ede8dc", "--nav-hover": "#f2ede4",
      "--text-primary": "#2a2620", "--text-secondary": "#5a5448", "--text-muted": "#8a8070",
      "--icon-bg": "#ede8dc",
      "--green": "#4a7a4a", "--green-bg": "#4a7a4a18",
      "--amber": "#9a5a30", "--amber-bg": "#9a5a3018",
      "--red": "#9a3030", "--red-bg": "#9a303018",
      "--accent": "#c4785a",
      "--shadow": "rgba(40,30,10,0.08)", "--shadow-heavy": "rgba(40,30,10,0.18)",
    },
  },
};

// Merge all theme groups
const COLOR_THEMES = {
  blue_gold: { label: "Blue & Gold", preview: ["#3b82f6", "#f0c644"],
    dark: {
      "--bg": "#0a0e17", "--card": "#111827", "--surface": "#0d1220", "--sidebar": "#0b0f1a",
      "--border": "#1e2a3f", "--border-hover": "#2d3f5a", "--border-subtle": "#162032",
      "--track": "#162032", "--nav-active": "#152238", "--nav-hover": "#111d30",
      "--text-primary": "#e8ecf4", "--text-secondary": "#8fa3c0", "--text-muted": "#5a7194",
      "--icon-bg": "#152238",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#f0c644", "--amber-bg": "#f0c64418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#3b82f6",
      "--shadow": "rgba(0,0,0,0.2)", "--shadow-heavy": "rgba(0,0,0,0.5)",
    },
    light: {
      "--bg": "#f0f4f8", "--card": "#ffffff", "--surface": "#f7f9fc", "--sidebar": "#edf1f7",
      "--border": "#d0dae8", "--border-hover": "#b0c0d4", "--border-subtle": "#e2e8f0",
      "--track": "#e2e8f0", "--nav-active": "#dbe4f0", "--nav-hover": "#e8edf4",
      "--text-primary": "#1a2332", "--text-secondary": "#4a5e78", "--text-muted": "#7a8ea8",
      "--icon-bg": "#e8edf5",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#2563eb",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  midnight: {
    label: "Midnight Purple", preview: ["#8b5cf6", "#a78bfa"],
    dark: {
      "--bg": "#0c0a14", "--card": "#16132a", "--surface": "#110e22", "--sidebar": "#0e0b1c",
      "--border": "#2a2545", "--border-hover": "#3d3660", "--border-subtle": "#211d3a",
      "--track": "#211d3a", "--nav-active": "#231f3e", "--nav-hover": "#1a1630",
      "--text-primary": "#ece8f4", "--text-secondary": "#a99fc0", "--text-muted": "#6e6294",
      "--icon-bg": "#231f3e",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#fbbf24", "--amber-bg": "#fbbf2418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#8b5cf6",
      "--shadow": "rgba(0,0,0,0.2)", "--shadow-heavy": "rgba(0,0,0,0.5)",
    },
    light: {
      "--bg": "#f5f3fa", "--card": "#ffffff", "--surface": "#f9f8fc", "--sidebar": "#f0eef8",
      "--border": "#d8d0ea", "--border-hover": "#bfb4da", "--border-subtle": "#e8e4f2",
      "--track": "#e8e4f2", "--nav-active": "#e4e0f2", "--nav-hover": "#ece8f6",
      "--text-primary": "#1e1630", "--text-secondary": "#524878", "--text-muted": "#8070a0",
      "--icon-bg": "#ece6f5",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#7c3aed",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  emerald: {
    label: "Emerald", preview: ["#10b981", "#34d399"],
    dark: {
      "--bg": "#0a1210", "--card": "#111f1b", "--surface": "#0d1815", "--sidebar": "#0b1412",
      "--border": "#1e3a32", "--border-hover": "#2d5a4a", "--border-subtle": "#16302a",
      "--track": "#16302a", "--nav-active": "#153028", "--nav-hover": "#112820",
      "--text-primary": "#e8f4f0", "--text-secondary": "#8fc0b0", "--text-muted": "#5a9480",
      "--icon-bg": "#153028",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#fbbf24", "--amber-bg": "#fbbf2418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#10b981",
      "--shadow": "rgba(0,0,0,0.2)", "--shadow-heavy": "rgba(0,0,0,0.5)",
    },
    light: {
      "--bg": "#f0f8f5", "--card": "#ffffff", "--surface": "#f5fbf8", "--sidebar": "#eaf5f0",
      "--border": "#c0e0d4", "--border-hover": "#a0d0be", "--border-subtle": "#daeee4",
      "--track": "#daeee4", "--nav-active": "#d0eadc", "--nav-hover": "#e4f4ec",
      "--text-primary": "#0f2920", "--text-secondary": "#2d6850", "--text-muted": "#5a9a80",
      "--icon-bg": "#e0f2ea",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#059669",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  rose: {
    label: "Rose", preview: ["#f43f5e", "#fb7185"],
    dark: {
      "--bg": "#110a0d", "--card": "#1f1116", "--surface": "#180d12", "--sidebar": "#140b10",
      "--border": "#3a1e28", "--border-hover": "#5a2d3e", "--border-subtle": "#301624",
      "--track": "#301624", "--nav-active": "#381a28", "--nav-hover": "#2c1420",
      "--text-primary": "#f4e8ec", "--text-secondary": "#c08fa0", "--text-muted": "#945a70",
      "--icon-bg": "#381a28",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#fbbf24", "--amber-bg": "#fbbf2418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#f43f5e",
      "--shadow": "rgba(0,0,0,0.2)", "--shadow-heavy": "rgba(0,0,0,0.5)",
    },
    light: {
      "--bg": "#fdf2f4", "--card": "#ffffff", "--surface": "#fef7f8", "--sidebar": "#fceef0",
      "--border": "#f0c8d0", "--border-hover": "#e0a8b4", "--border-subtle": "#f5dce2",
      "--track": "#f5dce2", "--nav-active": "#f5d4dc", "--nav-hover": "#fae4ea",
      "--text-primary": "#2e1018", "--text-secondary": "#7a3048", "--text-muted": "#a86078",
      "--icon-bg": "#fce4ea",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#e11d48",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  slate: {
    label: "Classic", preview: ["#6366f1", "#818cf8"],
    dark: {
      "--bg": "#0c0c0e", "--card": "#161619", "--surface": "#111114", "--sidebar": "#101013",
      "--border": "#26262e", "--border-hover": "#3a3a46", "--border-subtle": "#1e1e24",
      "--track": "#1e1e24", "--nav-active": "#1e1e28", "--nav-hover": "#18181c",
      "--text-primary": "#e8e8ec", "--text-secondary": "#a0a0b0", "--text-muted": "#6a6a7a",
      "--icon-bg": "#1e1e28",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#fbbf24", "--amber-bg": "#fbbf2418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#6366f1",
      "--shadow": "rgba(0,0,0,0.15)", "--shadow-heavy": "rgba(0,0,0,0.4)",
    },
    light: {
      "--bg": "#f4f4f6", "--card": "#ffffff", "--surface": "#f9f9fb", "--sidebar": "#efefef",
      "--border": "#d4d4dc", "--border-hover": "#b8b8c4", "--border-subtle": "#e4e4ea",
      "--track": "#e4e4ea", "--nav-active": "#e0e0e8", "--nav-hover": "#eaeaf0",
      "--text-primary": "#1a1a22", "--text-secondary": "#52525e", "--text-muted": "#80808e",
      "--icon-bg": "#eaeaf0",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#4f46e5",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  amber: {
    label: "Amber", preview: ["#f59e0b", "#fbbf24"],
    dark: {
      "--bg": "#0e0c08", "--card": "#1c1a10", "--surface": "#15130c", "--sidebar": "#12100a",
      "--border": "#3a3420", "--border-hover": "#5a4e30", "--border-subtle": "#302a1a",
      "--track": "#302a1a", "--nav-active": "#352e1c", "--nav-hover": "#2a2416",
      "--text-primary": "#f4f0e8", "--text-secondary": "#c0b48f", "--text-muted": "#94845a",
      "--icon-bg": "#352e1c",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#fbbf24", "--amber-bg": "#fbbf2418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#f59e0b",
      "--shadow": "rgba(0,0,0,0.2)", "--shadow-heavy": "rgba(0,0,0,0.5)",
    },
    light: {
      "--bg": "#faf8f2", "--card": "#ffffff", "--surface": "#fdfcf7", "--sidebar": "#f5f2ea",
      "--border": "#e8dfc8", "--border-hover": "#d4c8a8", "--border-subtle": "#f0eadc",
      "--track": "#f0eadc", "--nav-active": "#eee6d4", "--nav-hover": "#f5f0e4",
      "--text-primary": "#2a2410", "--text-secondary": "#6a5e38", "--text-muted": "#9a8e60",
      "--icon-bg": "#f2ecdc",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#d97706",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  retro_poster: {
    label: "Retro Poster", preview: ["#cc1a1a", "#f5f0e0", "#1a1a2e"],
    dark: {
      "--bg": "#0f0a0a", "--card": "#1a0f0f", "--surface": "#140c0c", "--sidebar": "#120a0a",
      "--border": "#3d1515", "--border-hover": "#5c2020", "--border-subtle": "#2a1010",
      "--track": "#2a1010", "--nav-active": "#2e1212", "--nav-hover": "#240e0e",
      "--text-primary": "#f5f0e0", "--text-secondary": "#d4c9a8", "--text-muted": "#8a7a5a",
      "--icon-bg": "#2e1212",
      "--green": "#4a9e4a", "--green-bg": "#4a9e4a18",
      "--amber": "#e8a020", "--amber-bg": "#e8a02018",
      "--red": "#cc1a1a", "--red-bg": "#cc1a1a18",
      "--accent": "#cc1a1a",
      "--shadow": "rgba(0,0,0,0.35)", "--shadow-heavy": "rgba(0,0,0,0.7)",
    },
    light: {
      "--bg": "#f5f0e0", "--card": "#faf6ea", "--surface": "#f0e8d0", "--sidebar": "#ece4cc",
      "--border": "#c8a878", "--border-hover": "#a08858", "--border-subtle": "#ddd0b0",
      "--track": "#ddd0b0", "--nav-active": "#e8d8b8", "--nav-hover": "#ede4cc",
      "--text-primary": "#1a0f0f", "--text-secondary": "#3d2020", "--text-muted": "#6a4a30",
      "--icon-bg": "#e8d8b8",
      "--green": "#2d7a2d", "--green-bg": "#2d7a2d18",
      "--amber": "#b87800", "--amber-bg": "#b8780018",
      "--red": "#cc1a1a", "--red-bg": "#cc1a1a18",
      "--accent": "#cc1a1a",
      "--shadow": "rgba(80,30,0,0.10)", "--shadow-heavy": "rgba(80,30,0,0.22)",
    },
  },
  comic_book: {
    label: "Comic Book", preview: ["#f5e642", "#e8281e", "#1e3eb8"],
    dark: {
      "--bg": "#10101a", "--card": "#1a1a2e", "--surface": "#14142a", "--sidebar": "#111126",
      "--border": "#2e2e5a", "--border-hover": "#4040a0", "--border-subtle": "#222244",
      "--track": "#222244", "--nav-active": "#252554", "--nav-hover": "#1e1e44",
      "--text-primary": "#fffde8", "--text-secondary": "#c0c8ff", "--text-muted": "#7880c0",
      "--icon-bg": "#252554",
      "--green": "#00c844", "--green-bg": "#00c84418",
      "--amber": "#f5e642", "--amber-bg": "#f5e64218",
      "--red": "#e8281e", "--red-bg": "#e8281e18",
      "--accent": "#f5e642",
      "--shadow": "rgba(0,0,0,0.35)", "--shadow-heavy": "rgba(0,0,0,0.7)",
    },
    light: {
      "--bg": "#fffde8", "--card": "#ffffff", "--surface": "#fffff0", "--sidebar": "#f8f6d8",
      "--border": "#1e3eb8", "--border-hover": "#142ab0", "--border-subtle": "#c8d0f8",
      "--track": "#dde2fa", "--nav-active": "#dce4fc", "--nav-hover": "#edf0fc",
      "--text-primary": "#10101a", "--text-secondary": "#1e3eb8", "--text-muted": "#5060a0",
      "--icon-bg": "#dce4fc",
      "--green": "#008c30", "--green-bg": "#008c3018",
      "--amber": "#c8a800", "--amber-bg": "#c8a80018",
      "--red": "#e8281e", "--red-bg": "#e8281e18",
      "--accent": "#e8281e",
      "--shadow": "rgba(30,62,184,0.10)", "--shadow-heavy": "rgba(30,62,184,0.22)",
    },
  },
  medieval: {
    label: "Medieval Parchment", preview: ["#8b1a1a", "#c8a45a", "#2d4a1e"],
    dark: {
      "--bg": "#0e0b06", "--card": "#1a1408", "--surface": "#150f06", "--sidebar": "#120c05",
      "--border": "#3a2a10", "--border-hover": "#5a4018", "--border-subtle": "#2a1e0a",
      "--track": "#2a1e0a", "--nav-active": "#2e2010", "--nav-hover": "#22180a",
      "--text-primary": "#f0e4c0", "--text-secondary": "#c8a45a", "--text-muted": "#8a6a38",
      "--icon-bg": "#2e2010",
      "--green": "#4a8c2a", "--green-bg": "#4a8c2a18",
      "--amber": "#c8a45a", "--amber-bg": "#c8a45a18",
      "--red": "#8b1a1a", "--red-bg": "#8b1a1a18",
      "--accent": "#c8a45a",
      "--shadow": "rgba(0,0,0,0.35)", "--shadow-heavy": "rgba(0,0,0,0.7)",
    },
    light: {
      "--bg": "#f2e8cc", "--card": "#faf3dd", "--surface": "#ede0c0", "--sidebar": "#e8d8b0",
      "--border": "#b8945a", "--border-hover": "#9a7840", "--border-subtle": "#ddd0a8",
      "--track": "#ddd0a8", "--nav-active": "#e4d4a8", "--nav-hover": "#ede2bc",
      "--text-primary": "#1e1206", "--text-secondary": "#4a3018", "--text-muted": "#7a5e38",
      "--icon-bg": "#e4d4a8",
      "--green": "#2d6e18", "--green-bg": "#2d6e1818",
      "--amber": "#9a6e10", "--amber-bg": "#9a6e1018",
      "--red": "#8b1a1a", "--red-bg": "#8b1a1a18",
      "--accent": "#8b1a1a",
      "--shadow": "rgba(60,30,0,0.12)", "--shadow-heavy": "rgba(60,30,0,0.25)",
    },
  },
  ...RETRO_THEMES,
  ...CULTURAL_THEMES,
  ...PLAYFUL_THEMES,
  ...MINIMAL_THEMES,
  ...SPORTS_THEMES,
  vault_tec: {
    label: "Vault-Tec", preview: ["#2d5fa6", "#c9961a", "#0a1c3a"],
    dark: {
      // Dark: near-black backdrop, cobalt blue cards, gold text — poster in the dark
      "--bg": "#07111e", "--card": "#1a3a6e", "--surface": "#142e5a", "--sidebar": "#0f2650",
      "--border": "#c9961a50", "--border-hover": "#c9961a90", "--border-subtle": "#c9961a28",
      "--track": "#0f2040", "--nav-active": "#1e4080", "--nav-hover": "#183468",
      "--text-primary": "#f0d878", "--text-secondary": "#c9961a", "--text-muted": "#8a7030",
      "--icon-bg": "#1e4080",
      "--green": "#70c870", "--green-bg": "#70c87018",
      "--amber": "#f0d050", "--amber-bg": "#f0d05018",
      "--red": "#e04030", "--red-bg": "#e0403018",
      "--accent": "#c9961a",
      "--shadow": "rgba(0,0,0,0.55)", "--shadow-heavy": "rgba(0,0,0,0.85)",
    },
    light: {
      // Light: cobalt blue everywhere, gold accents — the actual poster colors
      "--bg": "#2d5fa6", "--card": "#1e4d8c", "--surface": "#245294", "--sidebar": "#1a4480",
      "--border": "#c9961a80", "--border-hover": "#c9961a", "--border-subtle": "#c9961a30",
      "--track": "#163870", "--nav-active": "#2a5ea8", "--nav-hover": "#224e98",
      "--text-primary": "#f5e090", "--text-secondary": "#c9961a", "--text-muted": "#7a8aaa",
      "--icon-bg": "#2a5ea8",
      "--green": "#70d870", "--green-bg": "#70d87018",
      "--amber": "#f0c830", "--amber-bg": "#f0c83018",
      "--red": "#e85040", "--red-bg": "#e8504018",
      "--accent": "#c9961a",
      "--shadow": "rgba(0,15,50,0.35)", "--shadow-heavy": "rgba(0,15,50,0.65)",
    },
  },
  batman: {
    label: "Batman", preview: ["#f5c400", "#0a0a0a", "#2a2a2a"],
    dark: {
      // Pure Gotham night — obsidian black, signal yellow, gunmetal
      "--bg": "#050505", "--card": "#0f0f0f", "--surface": "#080808", "--sidebar": "#0a0a0a",
      "--border": "#f5c40030", "--border-hover": "#f5c40070", "--border-subtle": "#f5c40016",
      "--track": "#141414", "--nav-active": "#1a1a00", "--nav-hover": "#141400",
      "--text-primary": "#f5f5f5", "--text-secondary": "#f5c400", "--text-muted": "#5a5a5a",
      "--icon-bg": "#1a1a00",
      "--green": "#60cc60", "--green-bg": "#60cc6018",
      "--amber": "#f5c400", "--amber-bg": "#f5c40018",
      "--red": "#e03030", "--red-bg": "#e0303018",
      "--accent": "#f5c400",
      "--shadow": "rgba(0,0,0,0.8)", "--shadow-heavy": "rgba(0,0,0,0.95)",
    },
    light: {
      // Gotham by day — deep graphite, chrome yellow pops, stark contrast
      "--bg": "#1a1a1a", "--card": "#242424", "--surface": "#1e1e1e", "--sidebar": "#161616",
      "--border": "#f5c40040", "--border-hover": "#f5c40090", "--border-subtle": "#f5c40020",
      "--track": "#2e2e2e", "--nav-active": "#2a2800", "--nav-hover": "#222200",
      "--text-primary": "#f0f0f0", "--text-secondary": "#f5c400", "--text-muted": "#707070",
      "--icon-bg": "#2a2800",
      "--green": "#70d070", "--green-bg": "#70d07018",
      "--amber": "#f5c400", "--amber-bg": "#f5c40018",
      "--red": "#e84040", "--red-bg": "#e8404018",
      "--accent": "#f5c400",
      "--shadow": "rgba(0,0,0,0.6)", "--shadow-heavy": "rgba(0,0,0,0.85)",
    },
  },
  pipboy: {
    label: "Pip-Boy", preview: ["#4afa4a", "#0a120a", "#1a2e1a"],
    dark: {
      // Single-phosphor green CRT — everything is one color family
      "--bg": "#080e08", "--card": "#0d160d", "--surface": "#0a120a", "--sidebar": "#090e09",
      "--border": "#4afa4a28", "--border-hover": "#4afa4a60", "--border-subtle": "#4afa4a14",
      "--track": "#0f1a0f", "--nav-active": "#122012", "--nav-hover": "#0f1a0f",
      "--text-primary": "#4afa4a", "--text-secondary": "#30cc30", "--text-muted": "#1a6a1a",
      "--icon-bg": "#122012",
      // All status colors are green variants — faithful to single-phosphor display
      "--green": "#4afa4a", "--green-bg": "#4afa4a18",
      "--amber": "#80ff60", "--amber-bg": "#80ff6018",
      "--red": "#28c828", "--red-bg": "#28c82818",
      "--accent": "#4afa4a",
      "--shadow": "rgba(0,0,0,0.7)", "--shadow-heavy": "rgba(0,0,0,0.92)",
    },
    light: {
      // Slightly brighter phosphor — daytime vault lighting
      "--bg": "#0c1a0c", "--card": "#112011", "--surface": "#0e1a0e", "--sidebar": "#0c180c",
      "--border": "#4afa4a35", "--border-hover": "#4afa4a70", "--border-subtle": "#4afa4a1a",
      "--track": "#142414", "--nav-active": "#182e18", "--nav-hover": "#152618",
      "--text-primary": "#60ff60", "--text-secondary": "#40e040", "--text-muted": "#228822",
      "--icon-bg": "#182e18",
      "--green": "#60ff60", "--green-bg": "#60ff6018",
      "--amber": "#90ff70", "--amber-bg": "#90ff7018",
      "--red": "#38e038", "--red-bg": "#38e03818",
      "--accent": "#60ff60",
      "--shadow": "rgba(0,0,0,0.6)", "--shadow-heavy": "rgba(0,0,0,0.88)",
    },
  },
};
const DASHBOARD_WIDGETS = [
  { id: "today", label: "Today's Snapshot" },
  { id: "networth", label: "Net Worth" },
  { id: "metrics", label: "Income / Expenses / Balance" },
  { id: "income", label: "Income Sources" },
  { id: "spending", label: "Top Spending" },
  { id: "bills", label: "Upcoming Bills" },
  { id: "savings", label: "Savings Goals" },
  { id: "debt", label: "Debt Summary" },
];

// ─────────────────────────────────────────────
// DATA LAYER — Replace with API/DB calls later
// ─────────────────────────────────────────────

const INITIAL_CATEGORIES = [
  { id: "housing", name: "Housing", icon: "⌂", limit: 1800 },
  { id: "groceries", name: "Groceries", icon: "◉", limit: 600 },
  { id: "transport", name: "Transport", icon: "▷", limit: 300 },
  { id: "dining", name: "Dining Out", icon: "◈", limit: 250 },
  { id: "utilities", name: "Utilities", icon: "⚡", limit: 200 },
  { id: "entertainment", name: "Entertainment", icon: "♫", limit: 150 },
  { id: "health", name: "Health", icon: "✚", limit: 200 },
  { id: "personal", name: "Personal", icon: "◆", limit: 150 },
];

const INITIAL_TRANSACTIONS = [
  { id: 1, categoryId: "housing", description: "Rent", amount: 1650, date: "2026-03-01" },
  { id: 2, categoryId: "housing", description: "Renter's Insurance", amount: 45, date: "2026-03-01" },
  { id: 3, categoryId: "groceries", description: "Whole Foods", amount: 127.43, date: "2026-03-02" },
  { id: 4, categoryId: "groceries", description: "Costco Run", amount: 214.67, date: "2026-03-05" },
  { id: 5, categoryId: "groceries", description: "Central Market", amount: 89.20, date: "2026-03-09" },
  { id: 6, categoryId: "groceries", description: "Target Groceries", amount: 63.15, date: "2026-03-12" },
  { id: 7, categoryId: "groceries", description: "Trader Joe's", amount: 98.50, date: "2026-03-15" },
  { id: 8, categoryId: "transport", description: "Gas", amount: 52.40, date: "2026-03-03" },
  { id: 9, categoryId: "transport", description: "Car Wash", amount: 25.00, date: "2026-03-07" },
  { id: 10, categoryId: "transport", description: "Parking - Downtown", amount: 18.00, date: "2026-03-10" },
  { id: 11, categoryId: "dining", description: "Pecan Lodge", amount: 67.80, date: "2026-03-04" },
  { id: 12, categoryId: "dining", description: "Torchy's Tacos", amount: 32.50, date: "2026-03-08" },
  { id: 13, categoryId: "dining", description: "Thai Basil", amount: 44.20, date: "2026-03-11" },
  { id: 14, categoryId: "dining", description: "Coffee — Houndstooth", amount: 12.50, date: "2026-03-13" },
  { id: 15, categoryId: "dining", description: "Uchi Dallas", amount: 142.00, date: "2026-03-14" },
  { id: 16, categoryId: "utilities", description: "Electric — Oncor", amount: 134.50, date: "2026-03-05" },
  { id: 17, categoryId: "utilities", description: "Water", amount: 48.30, date: "2026-03-05" },
  { id: 18, categoryId: "utilities", description: "Internet — AT&T", amount: 65.00, date: "2026-03-06" },
  { id: 19, categoryId: "entertainment", description: "Spotify", amount: 15.99, date: "2026-03-01" },
  { id: 20, categoryId: "entertainment", description: "AMC Northpark", amount: 34.00, date: "2026-03-09" },
  { id: 21, categoryId: "entertainment", description: "Book — Half Price", amount: 14.50, date: "2026-03-12" },
  { id: 22, categoryId: "health", description: "Gym Membership", amount: 49.99, date: "2026-03-01" },
  { id: 23, categoryId: "health", description: "CVS Pharmacy", amount: 28.75, date: "2026-03-07" },
  { id: 24, categoryId: "personal", description: "Haircut", amount: 35.00, date: "2026-03-06" },
  { id: 25, categoryId: "personal", description: "Amazon — Misc", amount: 67.89, date: "2026-03-10" },
  { id: 26, categoryId: "personal", description: "Dry Cleaning", amount: 22.00, date: "2026-03-14" },
];

const INITIAL_INCOME = [
  { id: 1, source: "My Salary", amount: 5200, date: "2026-03-01", recurring: true, frequency: "semimonthly", category: "employment", icon: "💼" },
  { id: 2, source: "Wife's Salary", amount: 4200, date: "2026-03-09", recurring: true, frequency: "biweekly", category: "employment", icon: "💼" },
  { id: 3, source: "Freelance Project", amount: 850, date: "2026-03-10", recurring: false, category: "freelance", icon: "🎨" },
  { id: 4, source: "Dividend — Fidelity", amount: 125, date: "2026-03-15", recurring: true, frequency: "quarterly", category: "investment", icon: "📈" },
];

// Paycheck streams — supports multiple earners and schedules
const INITIAL_PAYCHECK_STREAMS = [
  { id: 1, name: "My Pay", amount: 2600, frequency: "semimonthly", anchorDate: "2026-01-01", color: "var(--accent)" },
  { id: 2, name: "Wife's Pay", amount: 2100, frequency: "biweekly", anchorDate: "2026-01-09", color: "#d4a843" },
];

// Custom line items added manually to specific paychecks — keyed by "streamId-YYYY-MM-DD"
const INITIAL_CUSTOM_ITEMS = {};

// Budget category rollovers — keyed by "YYYY-MM" with category overrides
const INITIAL_BUDGET_ROLLOVERS = {};

// Budget targets — YNAB-style goal assignments per category
// Types: "monthly" (flat monthly limit — default), "target_by_date" (save X by Y), "weekly" (X per week)
const INITIAL_BUDGET_TARGETS = {
  housing: { type: "monthly", monthlyAmount: 1800 },
  groceries: { type: "monthly", monthlyAmount: 600 },
  transport: { type: "target_by_date", targetAmount: 2400, targetDate: "2026-12-31", funded: 950 },
  dining: { type: "monthly", monthlyAmount: 250 },
  utilities: { type: "monthly", monthlyAmount: 200 },
  entertainment: { type: "target_by_date", targetAmount: 500, targetDate: "2026-06-01", funded: 200 },
  health: { type: "monthly", monthlyAmount: 200 },
  personal: { type: "weekly", weeklyAmount: 35 },
};

// Recurring transaction templates — auto-log spending (not bills)
// Similar to bill templates but with categoryId for budget tracking
const INITIAL_RECURRING_TRANSACTIONS = [
  { id: 1, description: "Spotify", amount: 15.99, categoryId: "entertainment", frequency: "monthly", anchorDate: "2026-01-01", active: true },
  { id: 2, description: "Gym Membership", amount: 49.99, categoryId: "health", frequency: "monthly", anchorDate: "2026-01-01", active: true },
  { id: 3, description: "Haircut", amount: 35, categoryId: "personal", frequency: "monthly", anchorDate: "2026-01-06", active: true },
  { id: 4, description: "Cloud Storage", amount: 2.99, categoryId: "personal", frequency: "monthly", anchorDate: "2026-01-10", active: true },
  { id: 5, description: "Weekly Groceries", amount: 120, categoryId: "groceries", frequency: "weekly", anchorDate: "2026-01-04", active: false },
];

// Bill templates — recurring bills use anchorDate + frequency
// Non-recurring bills use anchorDate as their one-time due date
const INITIAL_BILL_TEMPLATES = [
  { id: 1, name: "Rent", amount: 1650, anchorDate: "2026-01-01", recurring: true, frequency: "monthly" },
  { id: 2, name: "Electric — Oncor", amount: 134.50, anchorDate: "2026-01-05", recurring: true, frequency: "monthly" },
  { id: 3, name: "Water", amount: 48.30, anchorDate: "2026-01-05", recurring: true, frequency: "monthly" },
  { id: 4, name: "Internet — AT&T", amount: 65, anchorDate: "2026-01-06", recurring: true, frequency: "monthly" },
  { id: 5, name: "Gym Membership", amount: 49.99, anchorDate: "2026-01-15", recurring: true, frequency: "monthly" },
  { id: 6, name: "Spotify", amount: 15.99, anchorDate: "2026-01-15", recurring: true, frequency: "monthly" },
  { id: 7, name: "Car Insurance", amount: 185, anchorDate: "2026-01-22", recurring: true, frequency: "monthly" },
  { id: 8, name: "Phone Bill", amount: 75, anchorDate: "2026-01-11", recurring: true, frequency: "biweekly" },
  { id: 9, name: "Renter's Insurance", amount: 45, anchorDate: "2026-01-01", recurring: true, frequency: "quarterly" },
  { id: 10, name: "HOA Assessment", amount: 350, anchorDate: "2026-01-15", recurring: true, frequency: "yearly" },
];

// Net worth history snapshots — [ { date: "YYYY-MM-DD", netWorth, assets, liabilities } ]
// Seeded with 6 months of sample data so the chart has something to show immediately
const INITIAL_NETWORTH_HISTORY = (() => {
  const now = new Date();
  const samples = [
    { mo: 6, nw: 52400, a: 84200, l: 31800 },
    { mo: 5, nw: 55100, a: 85100, l: 30000 },
    { mo: 4, nw: 57800, a: 86300, l: 28500 },
    { mo: 3, nw: 60200, a: 87500, l: 27300 },
    { mo: 2, nw: 62900, a: 88900, l: 26000 },
    { mo: 1, nw: 65500, a: 90100, l: 24600 },
  ];
  return samples.map(({ mo, nw, a, l }) => {
    const d = new Date(now.getFullYear(), now.getMonth() - mo, 1);
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      netWorth: nw, assets: a, liabilities: l,
    };
  });
})();

// Tracks which bill instances have been paid — keys are "billId-YYYY-MM-DD"
const INITIAL_PAID_DATES = new Set([
  // March bills already paid
  "1-2026-03-01", "2-2026-03-05", "3-2026-03-05", "4-2026-03-06",
  "5-2026-03-15", "6-2026-03-15",
  "8-2026-03-08", // biweekly phone bill first occurrence
]);

const INITIAL_SAVINGS_GOALS = [
  { id: 1, name: "Emergency Fund", target: 15000, current: 8400, icon: "🛡", monthlyContribution: 400, deadline: "2026-12-31", color: "var(--green)", contributions: [
    { date: "2026-01-15", amount: 400 }, { date: "2026-02-15", amount: 400 }, { date: "2026-03-01", amount: 400 }, { date: "2026-03-15", amount: 200 },
  ]},
  { id: 2, name: "Vacation", target: 3000, current: 1250, icon: "✈", monthlyContribution: 200, deadline: "2026-08-01", color: "var(--accent)", contributions: [
    { date: "2026-01-10", amount: 200 }, { date: "2026-02-10", amount: 250 }, { date: "2026-03-10", amount: 200 },
  ]},
  { id: 3, name: "New Laptop", target: 2000, current: 1680, icon: "💻", monthlyContribution: 150, deadline: "2026-06-01", color: "var(--amber)", contributions: [
    { date: "2026-01-05", amount: 150 }, { date: "2026-02-05", amount: 150 }, { date: "2026-03-05", amount: 180 },
  ]},
  { id: 4, name: "Car Down Payment", target: 8000, current: 2100, icon: "🚗", monthlyContribution: 300, deadline: "2027-06-01", color: "#f472b6", contributions: [
    { date: "2026-01-20", amount: 300 }, { date: "2026-02-20", amount: 300 }, { date: "2026-03-15", amount: 300 },
  ]},
];

const INITIAL_DEBTS = [
  { id: 1, name: "Student Loans", balance: 18500, originalBalance: 32000, minPayment: 320, apr: 5.5, icon: "🎓", lender: "Navient", startDate: "2020-06-01", payments: [
    { date: "2026-01-01", amount: 320 }, { date: "2026-02-01", amount: 320 }, { date: "2026-03-01", amount: 400 },
  ]},
  { id: 2, name: "Credit Card", balance: 2340, originalBalance: 4800, minPayment: 65, apr: 22.9, icon: "💳", lender: "Chase Sapphire", startDate: "2024-11-01", payments: [
    { date: "2026-01-15", amount: 200 }, { date: "2026-02-15", amount: 200 }, { date: "2026-03-15", amount: 250 },
  ]},
  { id: 3, name: "Car Loan", balance: 9200, originalBalance: 18000, minPayment: 285, apr: 4.2, icon: "🚗", lender: "Capital One Auto", startDate: "2023-03-01", payments: [
    { date: "2026-01-10", amount: 285 }, { date: "2026-02-10", amount: 285 }, { date: "2026-03-10", amount: 285 },
  ]},
];

const INITIAL_ASSETS = [
  { id: 1, name: "Checking Account", value: 4200, category: "cash", icon: "🏦" },
  { id: 2, name: "Savings Account", value: 8400, category: "cash", icon: "💰" },
  { id: 3, name: "401(k)", value: 42500, category: "retirement", icon: "📊" },
  { id: 4, name: "Roth IRA", value: 18200, category: "retirement", icon: "📈" },
  { id: 5, name: "Brokerage — Fidelity", value: 6800, category: "investment", icon: "💹" },
  { id: 6, name: "2017 Toyota Corolla", value: 8500, category: "property", icon: "🚗" },
  { id: 7, name: "Home Furnishings", value: 3500, category: "property", icon: "🛋" },
];

// ─────────────────────────────────────────────
// RECURRENCE ENGINE
// ─────────────────────────────────────────────

const FREQUENCY_LABELS = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  semimonthly: "1st & 15th",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

/**
 * Generate concrete bill instances for a given month from templates.
 * Each instance gets: { ...template fields, instanceDate: "YYYY-MM-DD", instanceKey: "id-YYYY-MM-DD" }
 */
function generateBillInstances(templates, year, month) {
  const instances = [];
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0); // last day of month

  templates.forEach((bill) => {
    if (!bill.recurring) {
      // One-time bill — only shows in its exact month
      const d = new Date(bill.anchorDate + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dateStr = bill.anchorDate;
        instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
      }
      return;
    }

    const anchor = new Date(bill.anchorDate + "T00:00:00");

    // Don't generate instances before the anchor date
    if (monthEnd < anchor) return;

    switch (bill.frequency) {
      case "monthly": {
        // Same day each month
        const day = Math.min(anchor.getDate(), monthEnd.getDate());
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (new Date(dateStr + "T00:00:00") >= anchor) {
          instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
        }
        break;
      }
      case "biweekly": {
        // Every 14 days from anchor
        let cur = new Date(anchor);
        while (cur <= monthEnd) {
          if (cur >= monthStart && cur <= monthEnd) {
            const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
            instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
          }
          cur = new Date(cur.getTime() + 14 * 86400000);
        }
        break;
      }
      case "weekly": {
        // Every 7 days from anchor
        let cur = new Date(anchor);
        // Jump forward close to monthStart to avoid long loops
        if (cur < monthStart) {
          const diff = Math.floor((monthStart - cur) / (7 * 86400000));
          cur = new Date(cur.getTime() + diff * 7 * 86400000);
        }
        while (cur <= monthEnd) {
          if (cur >= monthStart && cur <= monthEnd) {
            const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
            instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
          }
          cur = new Date(cur.getTime() + 7 * 86400000);
        }
        break;
      }
      case "semimonthly": {
        // Two instances per month: 1st and 15th (regardless of anchor day)
        const days = [1, 15];
        days.forEach((d) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (new Date(dateStr + "T00:00:00") >= anchor) {
            instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
          }
        });
        break;
      }
      case "quarterly": {
        // Every 3 months from anchor month, same day
        const anchorMonth = anchor.getMonth();
        const anchorYear = anchor.getFullYear();
        const monthDiff = (year - anchorYear) * 12 + (month - anchorMonth);
        if (monthDiff >= 0 && monthDiff % 3 === 0) {
          const day = Math.min(anchor.getDate(), monthEnd.getDate());
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
        }
        break;
      }
      case "yearly": {
        // Same month and day each year
        if (month === anchor.getMonth() && year >= anchor.getFullYear()) {
          const day = Math.min(anchor.getDate(), monthEnd.getDate());
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
        }
        break;
      }
    }
  });

  return instances.sort((a, b) => a.instanceDate.localeCompare(b.instanceDate));
}

/**
 * Generate upcoming bill instances across the next N months (for Dashboard).
 */
function generateUpcomingBills(templates, paidDates, monthsAhead = 2) {
  const now = new Date();
  const instances = [];
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    instances.push(...generateBillInstances(templates, d.getFullYear(), d.getMonth()));
  }
  return instances
    .filter((b) => !paidDates.has(b.instanceKey))
    .filter((b) => new Date(b.instanceDate + "T00:00:00") >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => a.instanceDate.localeCompare(b.instanceDate));
}

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────

// Currency is set by root app via setCurrency() when settings load/change
let _currency = "USD";
let _locale = "en-US";
const CURRENCY_LOCALES = {
  USD: "en-US", EUR: "de-DE", GBP: "en-GB", CAD: "en-CA",
  AUD: "en-AU", JPY: "ja-JP", MXN: "es-MX", INR: "en-IN",
  BRL: "pt-BR", CHF: "de-CH", KRW: "ko-KR", SGD: "en-SG",
};
function setCurrency(currency) {
  _currency = currency || "USD";
  _locale = CURRENCY_LOCALES[_currency] || "en-US";
}

const fmt = (n) => {
  try {
    return n.toLocaleString(_locale, { style: "currency", currency: _currency, maximumFractionDigits: _currency === "JPY" || _currency === "KRW" ? 0 : 2 });
  } catch { return n.toLocaleString("en-US", { style: "currency", currency: "USD" }); }
};
const fmtCompact = (n) => {
  const sym = _currency === "JPY" || _currency === "KRW" ? "¥" : _currency === "EUR" ? "€" : _currency === "GBP" ? "£" : "$";
  return n >= 1000 ? `${sym}${(n / 1000).toFixed(1)}k` : fmt(n);
};
const pct = (v, max) => max > 0 ? Math.min((v / max) * 100, 100) : 0;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function getStatusColor(spent, limit) {
  const ratio = spent / limit;
  if (ratio >= 1) return { bg: "var(--red-bg)", fg: "var(--red)", label: "Over Budget" };
  if (ratio >= 0.85) return { bg: "var(--amber-bg)", fg: "var(--amber)", label: "Warning" };
  return { bg: "var(--green-bg)", fg: "var(--green)", label: "On Track" };
}

let _nextId = 100;
const nextId = () => _nextId++;
function seedNextId(state) {
  let max = 100;
  const scan = (arr) => { if (Array.isArray(arr)) arr.forEach((item) => { if (item?.id && typeof item.id === "number" && item.id >= max) max = item.id + 1; }); };
  scan(state.categories); scan(state.transactions); scan(state.income);
  scan(state.billTemplates); scan(state.savingsGoals); scan(state.debts);
  scan(state.assets); scan(state.paycheckStreams); scan(state.recurringTransactions);
  _nextId = max;
}

// ─────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────

function ProgressBar({ value, max, color, height = 8, animate = true }) {
  const ratio = max > 0 ? value / max : 0;
  const width = clamp(ratio * 100, 0, 100);
  const barColor = color || (ratio >= 1 ? "var(--red)" : ratio >= 0.85 ? "var(--amber)" : "var(--green)");
  return (
    <div style={{ position: "relative", height, borderRadius: height / 2, background: "var(--track)", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        width: `${width}%`, background: barColor, borderRadius: height / 2,
        transition: animate ? "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
      }} />
    </div>
  );
}

function StatusPill({ spent, limit }) {
  const { bg, fg, label } = getStatusColor(spent, limit);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 999, background: bg, color: fg,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: fg }} />
      {label}
    </span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div className="maverick-card" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 12px" }}>
      <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>{title}</span>
      {action}
    </div>
  );
}

function MetricBox({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)",
        width: "100%", maxWidth: 440, boxShadow: "0 24px 48px var(--shadow-heavy)",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DRAG TO REORDER
// ─────────────────────────────────────────────

function DragHandle({ onPointerDown }) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{ padding: "8px 6px", cursor: "grab", color: "var(--text-muted)", touchAction: "none", display: "flex", alignItems: "center", flexShrink: 0 }}
      title="Drag to reorder"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none"/>
        <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
        <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/>
      </svg>
    </div>
  );
}

function useDragToReorder(items, onReorder) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const dragIndexRef = useRef(null);
  const overIndexRef = useRef(null);
  const itemsRef = useRef(items);
  const listIdRef = useRef(`dnd-${Math.random().toString(36).slice(2)}`);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const startDrag = useCallback((e, index) => {
    e.preventDefault();
    setDragIndex(index);
    dragIndexRef.current = index;
    overIndexRef.current = index;
    const listId = listIdRef.current;

    const onPointerMove = (ev) => {
      const els = Array.from(document.querySelectorAll(`[data-drag-list="${listId}"]`));
      if (els.length === 0) return;
      let closestIdx = 0;
      let closestDist = Infinity;
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dist = Math.abs(ev.clientY - midY);
        const idx = parseInt(el.dataset.dragItem);
        if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
      });
      overIndexRef.current = closestIdx;
      setOverIndex(closestIdx);
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      const from = dragIndexRef.current;
      const to = overIndexRef.current;
      if (from !== null && to !== null && from !== to) {
        const next = [...itemsRef.current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
      }
      setDragIndex(null);
      setOverIndex(null);
      dragIndexRef.current = null;
      overIndexRef.current = null;
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, [onReorder]);

  return { dragIndex, overIndex, startDrag, listId: listIdRef.current };
}

function SwipeToDelete({ onDelete, children, disabled = false }) {
  const containerRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const didSwipe = useRef(false);
  const [offset, setOffset] = useState(0);
  const [showDelete, setShowDelete] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const THRESHOLD = 80;
  const SWIPE_MIN = 8; // minimum px to count as a swipe (not a tap)

  const handleStart = useCallback((clientX) => {
    if (disabled) return;
    startX.current = clientX;
    currentX.current = clientX;
    didSwipe.current = false;
    setIsSwiping(true);
  }, [disabled]);

  const handleMove = useCallback((clientX) => {
    if (!isSwiping || disabled) return;
    currentX.current = clientX;
    const dx = currentX.current - startX.current;
    if (Math.abs(dx) > SWIPE_MIN) didSwipe.current = true;
    if (dx < 0) {
      setOffset(Math.max(dx, -140));
    }
  }, [isSwiping, disabled]);

  const handleEnd = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);
    const dx = currentX.current - startX.current;
    if (dx < -THRESHOLD) {
      setOffset(-140);
      setShowDelete(true);
    } else {
      setOffset(0);
      setShowDelete(false);
    }
  }, [isSwiping]);

  const handleTouchStart = useCallback((e) => {
    handleStart(e.touches[0].clientX);
  }, [handleStart]);

  const handleTouchMove = useCallback((e) => {
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleMouseDown = useCallback((e) => {
    if (disabled) return;
    handleStart(e.clientX);
    const onMouseMove = (ev) => handleMove(ev.clientX);
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      handleEnd();
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [disabled, handleStart, handleMove, handleEnd]);

  // Suppress click events on children if user swiped
  const handleClickCapture = useCallback((e) => {
    if (didSwipe.current) {
      e.stopPropagation();
      e.preventDefault();
      didSwipe.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setOffset(0);
    setShowDelete(false);
    setIsSwiping(false);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", overflow: "hidden" }}>
      {/* Delete button behind — only visible when swiped */}
      {(showDelete || offset < 0) && (
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 140,
          background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, zIndex: 1,
        }}>
          <button onClick={() => { onDelete(); reset(); }}
            style={{
              background: "none", border: "none", color: "#fff", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              fontSize: 12, fontWeight: 700, padding: "8px 16px",
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
            Delete
          </button>
        </div>
      )}
      {/* Slideable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClickCapture={handleClickCapture}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping ? "none" : "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
          position: "relative", zIndex: 2, background: "var(--card)",
          userSelect: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const INPUT_STYLE = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box",
};

function UndoToast({ message, onUndo, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => clearTimeout(timerRef.current);
  }, [onDismiss]);

  const handleUndo = () => {
    clearTimeout(timerRef.current);
    onUndo();
  };

  return (
    <div style={{
      position: "fixed", bottom: 100, left: "50%", transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
      zIndex: 9000, opacity: visible ? 1 : 0, transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 8px 32px var(--shadow-heavy)", minWidth: 260, maxWidth: 400,
    }}>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{message}</div>
      <button onClick={handleUndo} style={{
        padding: "6px 14px", borderRadius: 8, border: "none",
        background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700,
        cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
      }}>Undo</button>
    </div>
  );
}

function FrequencyBadge({ frequency }) {
  if (!frequency) return null;
  const colors = {
    weekly: "var(--accent)",
    biweekly: "#d4a843",
    monthly: "var(--green)",
    quarterly: "var(--amber)",
    yearly: "var(--red)",
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
      color: colors[frequency] || "var(--text-muted)",
      background: (colors[frequency] || "var(--text-muted)") + "18",
      padding: "2px 7px", borderRadius: 4,
    }}>
      {FREQUENCY_LABELS[frequency]}
    </span>
  );
}

// ─────────────────────────────────────────────
// RESPONSIVE / MOBILE
// ─────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

const MOBILE_NAV_ITEMS = [
  { id: "dashboard", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ), label: "Home" },
  { id: "budget", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  ), label: "Budget" },
  { id: "paycheck", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ), label: "Paychecks" },
  { id: "calendar", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ), label: "Calendar" },
  { id: "_more", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
    </svg>
  ), label: "More" },
];

function MobileNav({ activePage, onNavigate, onMore }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: "var(--sidebar)", borderTop: "1px solid var(--border)",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "6px 0 env(safe-area-inset-bottom, 8px)",
      backdropFilter: "blur(12px)",
    }}>
      {MOBILE_NAV_ITEMS.map((item) => {
        const active = item.id === "_more" ? false : activePage === item.id;
        return (
          <button key={item.id}
            onClick={() => item.id === "_more" ? onMore() : onNavigate(item.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              background: "none", border: "none", cursor: "pointer",
              color: active ? "var(--accent)" : "var(--text-muted)",
              padding: "4px 12px", minWidth: 56,
            }}>
            <span style={{ display: "flex" }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MobileMoreMenu({ activePage, onNavigate, onClose, hiddenPages = [] }) {
  const allPages = NAV_ITEMS.filter((item) => !MOBILE_NAV_ITEMS.find((m) => m.id === item.id))
    .filter((item) => item.id === "settings" || !hiddenPages.includes(item.id));
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--card)", borderRadius: "20px 20px 0 0",
        width: "100%", maxHeight: "70vh", overflowY: "auto",
        paddingBottom: "env(safe-area-inset-bottom, 16px)",
        border: "1px solid var(--border)", borderBottom: "none",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-hover)" }} />
        </div>
        <div style={{ padding: "0 8px 8px" }}>
          {allPages.map((item) => {
            const active = activePage === item.id;
            return (
              <button key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 14, width: "100%",
                  padding: "14px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: active ? "var(--nav-active)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: 15, fontWeight: active ? 600 : 500, marginBottom: 2,
                }}>
                <span style={{ display: "flex", flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ThemeStyles() {
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

function ResponsiveStyles() {
  return (
    <style>{`
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

function FloatingActionButton({ categories, onAddTransaction }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ categoryId: "", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.categoryId && form.description.trim() && parseFloat(form.amount) > 0;

  const reset = () => { setForm({ categoryId: categories[0]?.id || "", description: "", amount: "", date: new Date().toISOString().split("T")[0] }); };

  return (
    <>
      {/* FAB Button */}
      <button onClick={() => { reset(); setOpen(true); }}
        style={{
          position: "fixed", bottom: 90, right: 20, zIndex: 90,
          width: 56, height: 56, borderRadius: 28, border: "none",
          background: "var(--accent)", color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Quick Add Sheet */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 150,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--card)", borderRadius: "20px 20px 0 0",
            width: "100%", maxWidth: 500, border: "1px solid var(--border)", borderBottom: "none",
            paddingBottom: "env(safe-area-inset-bottom, 16px)",
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-hover)" }} />
            </div>
            <div style={{ padding: "8px 20px 4px" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Quick Add Transaction</h3>
            </div>
            <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Description" style={INPUT_STYLE} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="Amount" style={INPUT_STYLE} />
                <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={INPUT_STYLE} />
              </div>
            </div>
            <div style={{ padding: "8px 20px 16px", display: "flex", gap: 10 }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                if (canSubmit) {
                  onAddTransaction({ id: nextId(), categoryId: form.categoryId, description: form.description.trim(), amount: parseFloat(form.amount), date: form.date });
                  setOpen(false);
                }
              }} disabled={!canSubmit}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR NAVIGATION
// ─────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )},
  { id: "budget", label: "Budget", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  )},
  { id: "calendar", label: "Calendar", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { id: "recurring", label: "Recurring", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/><path d="M20.49 15a9 9 0 01-14.85 3.36L1 14"/>
    </svg>
  )},
  { id: "autospend", label: "Auto-Spend", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>
    </svg>
  )},
  { id: "savings", label: "Savings", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2"/><path d="M2 9.1C1.2 9 .5 8.2.5 7.3.5 6.1 1.6 5 2.8 5c.2 0 .3 0 .5.1"/>
    </svg>
  )},
  { id: "paycheck", label: "Paychecks", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  )},
  { id: "income", label: "Income", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  )},
  { id: "debt", label: "Debt", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  )},
  { id: "networth", label: "Net Worth", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )},
  { id: "strategy", label: "Strategy", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  )},
  { id: "roadmap", label: "Roadmap", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/>
    </svg>
  )},
  { id: "calculator", label: "Calculators", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="16" y2="18"/>
    </svg>
  )},
  { id: "transactions", label: "Transactions", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )},
  { id: "summary", label: "Summary", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  )},
  { id: "forecast", label: "Forecast", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  )},
  { id: "trends", label: "Trends", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  )},
  { id: "settings", label: "Settings", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )},
];

function Sidebar({ activePage, onNavigate, collapsed, onToggle, hiddenPages = [] }) {
  const visibleItems = NAV_ITEMS.filter((item) => item.id === "dashboard" || item.id === "settings" || !hiddenPages.includes(item.id));
  return (
    <div className="maverick-sidebar" style={{
      width: collapsed ? 64 : 200, minWidth: collapsed ? 64 : 200,
      height: "100vh", position: "sticky", top: 0,
      background: "var(--sidebar)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      transition: "width 0.25s cubic-bezier(0.22,1,0.36,1), min-width 0.25s cubic-bezier(0.22,1,0.36,1)",
      overflow: "hidden", zIndex: 50,
    }}>
      <div style={{
        padding: collapsed ? "20px 0" : "20px 16px",
        display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
        gap: 10, borderBottom: "1px solid var(--border)", minHeight: 64,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: "#1e40af",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>💰</div>
        {!collapsed && <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>MaverickOS</span>}
      </div>
      <div style={{ padding: "12px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {visibleItems.map((item) => {
          const active = activePage === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 8, border: "none", cursor: "pointer",
                background: active ? "var(--nav-active)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: 14, fontWeight: active ? 600 : 500,
                transition: "all 0.15s", width: "100%", whiteSpace: "nowrap", overflow: "hidden",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--nav-hover)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? "var(--nav-active)" : "transparent"; }}
            >
              <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
              {!collapsed && item.label}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
        <button onClick={onToggle}
          style={{
            display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
            gap: 12, padding: collapsed ? "10px 0" : "10px 12px",
            borderRadius: 8, border: "none", cursor: "pointer",
            background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 500,
            width: "100%", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nav-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.25s", flexShrink: 0 }}>
            <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
          </svg>
          {!collapsed && <span style={{ whiteSpace: "nowrap" }}>Collapse</span>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────

function DashboardPage({ categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, settings, recurringTransactions, setTransactions }) {
  const startDay = settings?.startDayOfMonth || 1;
  const now = new Date();

  // Current budget period: from startDay of this month to startDay-1 of next month
  const periodStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
  const periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, startDay - 1);
  const periodEndStr = periodEndDate.toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  // This-period transactions
  const periodTx = useMemo(() => {
    if (startDay === 1) {
      const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return transactions.filter((t) => t.date.startsWith(mk));
    }
    return transactions.filter((t) => t.date >= periodStartStr && t.date <= periodEndStr);
  }, [transactions, startDay, periodStartStr, periodEndStr]);

  const totalIncome = income.reduce((s, i) => {
    if (!i.recurring) return s;
    switch (i.frequency) {
      case "weekly": return s + i.amount * 52 / 12;
      case "biweekly": return s + i.amount * 26 / 12;
      case "semimonthly": return s + i.amount * 2;
      case "monthly": return s + i.amount;
      case "quarterly": return s + i.amount / 3;
      case "yearly": return s + i.amount / 12;
      default: return s + i.amount;
    }
  }, 0);
  const totalExpenses = periodTx.reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayments = debts.reduce((s, d) => s + d.minPayment, 0);
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const netWorth = totalAssets - totalDebt;

  const upcomingBills = useMemo(() => generateUpcomingBills(billTemplates, paidDates, 2), [billTemplates, paidDates]);
  const upcomingTotal = upcomingBills.reduce((s, b) => s + b.amount, 0);

  const topSpendCategories = categories
    .map((c) => ({ ...c, spent: periodTx.filter((t) => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0) }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);
  const todayTx = transactions.filter((t) => t.date === todayStr);
  const todaySpent = todayTx.reduce((s, t) => s + t.amount, 0);
  const todayBills = useMemo(() => {
    const now = new Date();
    return generateBillInstances(billTemplates, now.getFullYear(), now.getMonth())
      .filter((b) => b.instanceDate === todayStr);
  }, [billTemplates, todayStr]);
  const todayBillsDue = todayBills.filter((b) => !paidDates.has(b.instanceKey));
  const nextBill = upcomingBills[0];

  // Recurring transaction auto-log nudge
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const unloggedRecurring = useMemo(() => {
    if (!recurringTransactions) return [];
    return recurringTransactions.filter((rt) => {
      if (!rt.active) return false;
      return !transactions.some((t) =>
        t.categoryId === rt.categoryId &&
        t.description === rt.description &&
        Math.abs(t.amount - rt.amount) < 0.01 &&
        t.date.startsWith(monthKey)
      );
    });
  }, [recurringTransactions, transactions, monthKey]);

  const handleLogAllRecurring = () => {
    if (!setTransactions || unloggedRecurring.length === 0) return;
    setTransactions((prev) => [...prev, ...unloggedRecurring.map((rt) => ({
      id: nextId(), categoryId: rt.categoryId,
      description: rt.description, amount: rt.amount, date: todayStr,
    }))]);
  };

  const widgets = settings?.dashboardWidgets || DEFAULT_SETTINGS.dashboardWidgets;
  const isVisible = (id) => widgets.includes(id);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>{settings?.householdName || "Dashboard"}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Auto-log recurring transactions nudge */}
      {unloggedRecurring.length > 0 && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: "var(--accent)12", border: "1px solid var(--accent)40", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔄</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {unloggedRecurring.length} recurring transaction{unloggedRecurring.length !== 1 ? "s" : ""} not yet logged this month
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                {unloggedRecurring.slice(0, 3).map((rt) => rt.description).join(", ")}{unloggedRecurring.length > 3 ? ` +${unloggedRecurring.length - 3} more` : ""}
              </div>
            </div>
          </div>
          <button onClick={handleLogAllRecurring} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Log All
          </button>
        </div>
      )}

      {/* Today's Snapshot */}
      {isVisible("today") && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Today</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 3 }}>Spent Today</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: todaySpent > 0 ? "var(--red)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(todaySpent)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{todayTx.length} transaction{todayTx.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 3 }}>Bills Due Today</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: todayBillsDue.length > 0 ? "var(--amber)" : "var(--green)", fontVariantNumeric: "tabular-nums" }}>{todayBillsDue.length}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{todayBillsDue.length > 0 ? fmt(todayBillsDue.reduce((s, b) => s + b.amount, 0)) + " due" : "All clear"}</div>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 3 }}>Next Bill</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{nextBill ? nextBill.name : "None"}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{nextBill ? `${fmt(nextBill.amount)} · ${new Date(nextBill.instanceDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Net Worth banner */}
      {isVisible("networth") && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>Net Worth</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: netWorth >= 0 ? "var(--green)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(netWorth)}</div>
              <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 1 }}>Assets</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(totalAssets)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 1 }}>Liabilities</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(totalDebt)}</div>
                </div>
              </div>
            </div>
            {/* Donut chart */}
            {(() => {
              const total = totalAssets + totalDebt;
              const assetPct = total > 0 ? totalAssets / total : 0;
              const r = 36, cx = 44, cy = 44, circ = 2 * Math.PI * r;
              const assetArc = circ * assetPct;
              const liabArc = circ * (1 - assetPct);
              return (
                <svg width={88} height={88} viewBox="0 0 88 88">
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--red-bg)" strokeWidth={12} />
                  {liabArc > 0 && (
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--red)" strokeWidth={12}
                      strokeDasharray={`${liabArc} ${circ}`} strokeDashoffset={-(circ * assetPct)}
                      style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
                  )}
                  {assetArc > 0 && (
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--green)" strokeWidth={12}
                      strokeDasharray={`${assetArc} ${circ}`}
                      style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
                  )}
                  <text x={cx} y={cy - 3} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="700" fontFamily="DM Sans, sans-serif">
                    {total > 0 ? `${(assetPct * 100).toFixed(0)}%` : "—"}
                  </text>
                  <text x={cx} y={cy + 9} textAnchor="middle" fill="var(--text-muted)" fontSize="7.5" fontFamily="DM Sans, sans-serif">assets</text>
                </svg>
              );
            })()}
          </div>
        </Card>
      )}

      {isVisible("metrics") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          <MetricBox label="Monthly Income" value={fmt(totalIncome)} sub="projected this period" accent="var(--green)" />
          <MetricBox label="Spent This Period" value={fmt(totalExpenses)} sub={`${periodTx.length} transaction${periodTx.length !== 1 ? "s" : ""} · ${pct(totalExpenses, totalIncome).toFixed(0)}% of income`} accent="var(--red)" />
          <MetricBox label="Remaining" value={fmt(Math.abs(balance))} sub={balance >= 0 ? "available to spend" : "over income"} accent={balance >= 0 ? "var(--green)" : "var(--red)"} />
          <MetricBox label="Total Debt" value={fmtCompact(totalDebt)} sub={`${fmt(totalMinPayments)}/mo minimum`} accent="var(--amber)" />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {isVisible("income") && (
          <Card>
            <CardHeader title="Income" />
            <div style={{ padding: "0 20px 16px" }}>
              {income.map((inc) => (
                <div key={inc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{inc.source}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                      {new Date(inc.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {inc.recurring && <span style={{ marginLeft: 6, color: "var(--accent)", fontWeight: 600 }}>Recurring</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>+{fmt(inc.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {isVisible("spending") && (
          <Card>
            <CardHeader title="Top Spending" />
            <div style={{ padding: "0 20px 16px" }}>
              {topSpendCategories.length === 0 && (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No spending recorded this period</div>
              )}
              {topSpendCategories.map((c) => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{c.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(c.spent)}{c.limit > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> / {fmt(c.limit)}</span>}
                    </span>
                  </div>
                  {c.limit > 0 && <ProgressBar value={c.spent} max={c.limit} height={5} />}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {isVisible("bills") && (
          <Card>
            <CardHeader title="Upcoming Bills" action={<span style={{ fontSize: 13, fontWeight: 600, color: "var(--amber)", fontVariantNumeric: "tabular-nums" }}>{fmt(upcomingTotal)}</span>} />
            <div style={{ padding: "0 20px 16px" }}>
              {upcomingBills.slice(0, 8).map((bill) => {
                const due = new Date(bill.instanceDate + "T00:00:00");
                const daysUntil = Math.ceil((due - new Date()) / 86400000);
                const urgent = daysUntil <= 7 && daysUntil >= 0;
                return (
                  <div key={bill.instanceKey} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{bill.name}</span>
                        {bill.recurring && <FrequencyBadge frequency={bill.frequency} />}
                      </div>
                      <div style={{ fontSize: 12, color: urgent ? "var(--amber)" : "var(--text-muted)", fontWeight: urgent ? 600 : 400, marginTop: 1 }}>
                        Due {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{urgent && ` · ${daysUntil}d`}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(bill.amount)}</span>
                  </div>
                );
              })}
              {upcomingBills.length === 0 && <div style={{ padding: "16px 0", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>All caught up!</div>}
            </div>
          </Card>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isVisible("savings") && (
            <Card>
              <CardHeader title="Savings Goals" />
              <div style={{ padding: "0 20px 16px" }}>
                {savingsGoals.map((goal) => (
                  <div key={goal.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15 }}>{goal.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{goal.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: goal.color || "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{pct(goal.current, goal.target).toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={goal.current} max={goal.target} color={goal.current >= goal.target ? "var(--green)" : goal.color || "var(--accent)"} height={5} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(goal.current)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(goal.target)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {isVisible("debt") && (
            <Card>
              <CardHeader title="Debt Summary" />
              <div style={{ padding: "0 20px 16px" }}>
                {debts.map((debt) => (
                  <div key={debt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{debt.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{debt.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, paddingLeft: 26 }}>{debt.apr}% APR · {fmt(debt.minPayment)}/mo</div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(debt.balance)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 4px", marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Owed</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalDebt)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CALENDAR PAGE
// ─────────────────────────────────────────────

function CalendarPage({ billTemplates, setBillTemplates, paidDates, setPaidDates }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddBill, setShowAddBill] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) calendarDays.push({ day: daysInPrevMonth - i, month: month - 1, outside: true });
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push({ day: d, month, outside: false });
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) calendarDays.push({ day: d, month: month + 1, outside: true });

  // Generate instances for current view month
  const monthInstances = useMemo(
    () => generateBillInstances(billTemplates, year, month),
    [billTemplates, year, month]
  );

  // Index instances by date key
  const instancesByDate = useMemo(() => {
    const map = {};
    monthInstances.forEach((b) => {
      const d = new Date(b.instanceDate + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [monthInstances]);

  // Also generate for adjacent months (for outside days)
  const prevMonthInstances = useMemo(() => {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    const map = {};
    generateBillInstances(billTemplates, py, pm).forEach((b) => {
      const d = new Date(b.instanceDate + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [billTemplates, year, month]);

  const nextMonthInstances = useMemo(() => {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    const map = {};
    generateBillInstances(billTemplates, ny, nm).forEach((b) => {
      const d = new Date(b.instanceDate + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [billTemplates, year, month]);

  const togglePaid = (instanceKey) => {
    setPaidDates((prev) => {
      const next = new Set(prev);
      if (next.has(instanceKey)) next.delete(instanceKey);
      else next.add(instanceKey);
      return next;
    });
  };

  const prevMonth = () => { setViewDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setViewDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  const today = new Date();
  const isToday = (d) => !d.outside && d.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (d) => !d.outside && selectedDay === d.day;

  const getBillsForDay = (d) => {
    if (d.outside) {
      const adjMonth = d.month;
      const adjYear = adjMonth < 0 ? year - 1 : adjMonth > 11 ? year + 1 : year;
      const normMonth = ((adjMonth % 12) + 12) % 12;
      const src = adjMonth < month ? prevMonthInstances : nextMonthInstances;
      return src[`${adjYear}-${normMonth}-${d.day}`] || [];
    }
    return instancesByDate[`${year}-${month}-${d.day}`] || [];
  };

  const selectedBills = selectedDay ? (instancesByDate[`${year}-${month}-${selectedDay}`] || []) : [];
  const selectedDateStr = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : null;

  const paidCount = monthInstances.filter((b) => paidDates.has(b.instanceKey)).length;
  const paidTotal = monthInstances.filter((b) => paidDates.has(b.instanceKey)).reduce((s, b) => s + b.amount, 0);
  const unpaidTotal = monthInstances.filter((b) => !paidDates.has(b.instanceKey)).reduce((s, b) => s + b.amount, 0);

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Bill Calendar</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Track and mark bills as paid</p>
        </div>
        <button onClick={() => setShowAddBill(true)} style={{
          padding: "10px 18px", borderRadius: 10, border: "none",
          background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ Add Bill</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <MetricBox label="Paid This Month" value={fmt(paidTotal)} sub={`${paidCount} of ${monthInstances.length} bills`} accent="var(--green)" />
        <MetricBox label="Still Due" value={fmt(unpaidTotal)} sub={`${monthInstances.length - paidCount} remaining`} accent={unpaidTotal > 0 ? "var(--amber)" : "var(--green)"} />
        <MetricBox label="Month Total" value={fmt(paidTotal + unpaidTotal)} sub={`${monthInstances.length} bills`} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
            <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{monthName}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 12px" }}>
            {WEEKDAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", padding: "8px 0" }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 12px 16px", gap: 2 }}>
            {calendarDays.map((d, i) => {
              const dayBills = getBillsForDay(d);
              const hasBills = dayBills.length > 0;
              const _isToday = isToday(d);
              const _isSelected = isSelected(d);
              return (
                <div key={i}
                  onClick={() => { if (!d.outside && hasBills) setSelectedDay(d.day === selectedDay ? null : d.day); }}
                  style={{
                    aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    borderRadius: 10, cursor: !d.outside && hasBills ? "pointer" : "default",
                    background: _isSelected ? "var(--accent)" : _isToday ? "var(--nav-active)" : "transparent",
                    border: _isToday && !_isSelected ? "1px solid var(--border-hover)" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!d.outside && hasBills && !_isSelected) e.currentTarget.style.background = "var(--nav-hover)"; }}
                  onMouseLeave={(e) => { if (!_isSelected && !_isToday) e.currentTarget.style.background = "transparent"; else if (_isToday && !_isSelected) e.currentTarget.style.background = "var(--nav-active)"; }}
                >
                  <span style={{ fontSize: 14, fontWeight: _isToday || _isSelected ? 700 : 500, color: d.outside ? "var(--border-hover)" : _isSelected ? "#fff" : "var(--text-primary)" }}>
                    {d.day}
                  </span>
                  {hasBills && !d.outside && (
                    <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                      {dayBills.map((b) => {
                        const isPaid = paidDates.has(b.instanceKey);
                        return (
                          <span key={b.instanceKey} style={{
                            width: 5, height: 5, borderRadius: "50%",
                            background: isPaid ? (_isSelected ? "rgba(255,255,255,0.6)" : "var(--green)") : (_isSelected ? "#fff" : "var(--amber)"),
                            transition: "background 0.2s",
                          }} />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 16, padding: "0 20px 16px", justifyContent: "center" }}>
            {[{ color: "var(--green)", label: "Paid" }, { color: "var(--amber)", label: "Unpaid" }].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: l.color }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Selected day detail — below calendar */}
        {selectedDay && (
          <Card>
            <div style={{ padding: "16px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{selectedDateStr}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{selectedBills.length} bill{selectedBills.length !== 1 ? "s" : ""} due</div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                {fmt(selectedBills.reduce((s, b) => s + b.amount, 0))}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 6, padding: "0 12px 16px" }}>
              {selectedBills.map((bill) => {
                const isPaid = paidDates.has(bill.instanceKey);
                return (
                  <div key={bill.instanceKey}
                    onClick={(e) => { e.stopPropagation(); togglePaid(bill.instanceKey); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px", borderRadius: 10,
                      background: isPaid ? "var(--green-bg)" : "var(--surface)",
                      border: `1px solid ${isPaid ? "var(--green)" + "33" : "var(--border)"}`,
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = isPaid ? "var(--green)" : "var(--border-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = isPaid ? "var(--green)" + "33" : "var(--border)"; }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      border: isPaid ? "none" : "2px solid var(--border-hover)",
                      background: isPaid ? "var(--green)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                    }}>
                      {isPaid && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 14, fontWeight: 500,
                          color: isPaid ? "var(--green)" : "var(--text-primary)",
                          textDecoration: isPaid ? "line-through" : "none",
                          opacity: isPaid ? 0.8 : 1,
                        }}>{bill.name}</span>
                        {bill.recurring && <FrequencyBadge frequency={bill.frequency} />}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                      color: isPaid ? "var(--green)" : "var(--text-primary)",
                      opacity: isPaid ? 0.8 : 1,
                    }}>{fmt(bill.amount)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Add Bill Modal */}
      {showAddBill && (
        <Overlay onClose={() => setShowAddBill(false)}>
          <AddBillForm
            onAdd={(bill) => { setBillTemplates((p) => [...p, bill]); setShowAddBill(false); }}
            onClose={() => setShowAddBill(false)}
          />
        </Overlay>
      )}
    </div>
  );
}

function AddBillForm({ onAdd, onClose }) {
  const [form, setForm] = useState({
    name: "", amount: "", anchorDate: new Date().toISOString().split("T")[0],
    recurring: false, frequency: "monthly",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.amount) > 0 && form.anchorDate;

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Add Bill</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Bill Name</label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Netflix" style={INPUT_STYLE} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Amount</label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>{form.recurring ? "Start Date" : "Due Date"}</label>
            <input type="date" value={form.anchorDate} onChange={(e) => update("anchorDate", e.target.value)} style={INPUT_STYLE} />
          </div>
        </div>

        {/* Recurring toggle */}
        <div
          onClick={() => update("recurring", !form.recurring)}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px",
            borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          <div style={{
            width: 40, height: 22, borderRadius: 11, padding: 2,
            background: form.recurring ? "var(--accent)" : "var(--track)",
            transition: "background 0.2s", display: "flex", alignItems: "center",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9, background: "#fff",
              transition: "transform 0.2s",
              transform: form.recurring ? "translateX(18px)" : "translateX(0)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Recurring Bill</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Automatically repeats on schedule</div>
          </div>
        </div>

        {/* Frequency selector */}
        {form.recurring && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, display: "block" }}>Frequency</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => {
                const active = form.frequency === key;
                return (
                  <button key={key} onClick={() => update("frequency", key)}
                    style={{
                      padding: "7px 14px", borderRadius: 8,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent)" + "22" : "transparent",
                      color: active ? "var(--accent)" : "var(--text-muted)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                    }}
                  >{label}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button
          onClick={() => {
            if (canSubmit) onAdd({
              id: nextId(), name: form.name.trim(), amount: parseFloat(form.amount),
              anchorDate: form.anchorDate, recurring: form.recurring,
              frequency: form.recurring ? form.frequency : null,
            });
          }}
          disabled={!canSubmit}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: canSubmit ? "var(--accent)" : "var(--border)",
            color: canSubmit ? "#fff" : "var(--text-muted)",
            fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >Add Bill</button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// RECURRING BILLS PAGE
// ─────────────────────────────────────────────

function RecurringBillsPage({ billTemplates, setBillTemplates, paidDates, onNavigate, showUndo, transactions }) {
  const [editingBill, setEditingBill] = useState(null);
  const [showAddBill, setShowAddBill] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const recurringBills = billTemplates.filter((b) => b.recurring);
  const oneTimeBills = billTemplates.filter((b) => !b.recurring);

  // Calculate monthly cost equivalent for each frequency
  const monthlyEquiv = (bill) => {
    switch (bill.frequency) {
      case "weekly": return bill.amount * 52 / 12;
      case "biweekly": return bill.amount * 26 / 12;
      case "semimonthly": return bill.amount * 2;
      case "monthly": return bill.amount;
      case "quarterly": return bill.amount / 3;
      case "yearly": return bill.amount / 12;
      default: return bill.amount;
    }
  };

  const totalMonthly = recurringBills.reduce((s, b) => s + monthlyEquiv(b), 0);
  const totalYearly = totalMonthly * 12;

  // Group by frequency
  const grouped = {};
  recurringBills.forEach((b) => {
    if (!grouped[b.frequency]) grouped[b.frequency] = [];
    grouped[b.frequency].push(b);
  });

  const freqOrder = ["weekly", "biweekly", "semimonthly", "monthly", "quarterly", "yearly"];

  const deleteBill = (id) => {
    const bill = billTemplates.find((b) => b.id === id);
    if (showUndo && bill) showUndo(`Deleted "${bill.name}" bill`);
    setBillTemplates((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBill = (updated) => {
    setBillTemplates((prev) => prev.map((b) => b.id === updated.id ? updated : b));
    setEditingBill(null);
  };

  // Next due date for a recurring bill from today
  const getNextDue = (bill) => {
    const now = new Date();
    const instances = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      instances.push(...generateBillInstances([bill], d.getFullYear(), d.getMonth()));
    }
    const upcoming = instances
      .filter((inst) => new Date(inst.instanceDate + "T00:00:00") >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .filter((inst) => !paidDates.has(inst.instanceKey));
    return upcoming[0]?.instanceDate || null;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Recurring Bills</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Manage all your scheduled payments</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onNavigate("calendar")} style={{
            padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            View Calendar
          </button>
          <button onClick={() => setShowAddBill(true)} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>+ Add Bill</button>
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <MetricBox label="Monthly Cost" value={fmt(totalMonthly)} sub={`${recurringBills.length} recurring bills`} accent="var(--accent)" />
        <MetricBox label="Yearly Cost" value={fmtCompact(totalYearly)} sub="projected annual" accent="var(--amber)" />
        <MetricBox label="Recurring Bills" value={recurringBills.length} sub={`${freqOrder.filter((f) => grouped[f]).length} frequencies`} />
        <MetricBox label="One-Time Bills" value={oneTimeBills.length} sub={oneTimeBills.length === 0 ? "none scheduled" : `${fmt(oneTimeBills.reduce((s, b) => s + b.amount, 0))} total`} />
      </div>

      {/* Bill price change detection */}
      {(() => {
        if (!transactions || transactions.length === 0) return null;
        const changes = recurringBills.map((bill) => {
          // Find transactions matching this bill description in last 2 months
          const now = new Date();
          const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
          const billName = bill.name.toLowerCase();
          const thisMonthTx = transactions.filter((t) => t.date.startsWith(thisMonthKey) && t.description.toLowerCase().includes(billName));
          const lastMonthTx = transactions.filter((t) => t.date.startsWith(lastMonthKey) && t.description.toLowerCase().includes(billName));
          if (thisMonthTx.length === 0 || lastMonthTx.length === 0) return null;
          const thisAmt = thisMonthTx[0].amount;
          const lastAmt = lastMonthTx[0].amount;
          if (Math.abs(thisAmt - lastAmt) < 0.01) return null;
          return { bill, thisAmt, lastAmt, diff: thisAmt - lastAmt };
        }).filter(Boolean);
        if (changes.length === 0) return null;
        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--amber)", marginBottom: 8 }}>⚠️ Price Changes Detected</div>
            {changes.map(({ bill, thisAmt, lastAmt, diff }) => (
              <div key={bill.id} style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--amber)44", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{bill.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{fmt(lastAmt)} → {fmt(thisAmt)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: diff > 0 ? "var(--red)" : "var(--green)" }}>
                    {diff > 0 ? "+" : ""}{fmt(diff)}/mo
                  </span>
                  <button onClick={() => setBillTemplates((prev) => prev.map((b) => b.id === bill.id ? { ...b, amount: thisAmt } : b))}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    Update Bill
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Grouped recurring bills */}
      {freqOrder.filter((f) => grouped[f]).map((freq) => {
        const bills = grouped[freq];
        const groupMonthly = bills.reduce((s, b) => s + monthlyEquiv(b), 0);
        return (
          <div key={freq} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FrequencyBadge frequency={freq} />
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                  {bills.length} bill{bills.length !== 1 ? "s" : ""}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                ~{fmt(groupMonthly)}/mo
              </span>
            </div>
            <Card>
              {bills.map((bill, idx) => {
                const nextDue = getNextDue(bill);
                const nextDueDate = nextDue ? new Date(nextDue + "T00:00:00") : null;
                const daysUntil = nextDueDate ? Math.ceil((nextDueDate - new Date()) / 86400000) : null;
                const urgent = daysUntil !== null && daysUntil <= 7 && daysUntil >= 0;

                return (
                  <SwipeToDelete key={bill.id} onDelete={() => deleteBill(bill.id)}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 20px",
                      borderBottom: idx < bills.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>
                          {bill.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                          <span style={{ color: "var(--text-muted)" }}>
                            {fmt(bill.amount)} per {bill.frequency === "biweekly" ? "2 weeks" : bill.frequency === "monthly" ? "month" : bill.frequency === "quarterly" ? "quarter" : bill.frequency === "yearly" ? "year" : "week"}
                          </span>
                          {nextDueDate && (
                            <span style={{ color: urgent ? "var(--amber)" : "var(--text-muted)", fontWeight: urgent ? 600 : 400 }}>
                              Next: {nextDueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {urgent && ` · ${daysUntil}d`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          ~{fmt(monthlyEquiv(bill))}/mo
                        </span>
                        <button onClick={() => setEditingBill(bill)} style={{
                          background: "none", border: "1px solid var(--border)", borderRadius: 6,
                          width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--text-muted)", cursor: "pointer",
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </SwipeToDelete>
                );
              })}
            </Card>
          </div>
        );
      })}

      {/* One-time bills section */}
      {oneTimeBills.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 4px" }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
              color: "var(--text-muted)", background: "var(--text-muted)" + "18",
              padding: "2px 7px", borderRadius: 4,
            }}>One-Time</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
              {oneTimeBills.length} bill{oneTimeBills.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Card>
            {oneTimeBills.map((bill, idx) => (
              <SwipeToDelete key={bill.id} onDelete={() => deleteBill(bill.id)}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: idx < oneTimeBills.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{bill.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Due {new Date(bill.anchorDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(bill.amount)}</span>
                </div>
              </SwipeToDelete>
            ))}
          </Card>
        </div>
      )}

      {recurringBills.length === 0 && oneTimeBills.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No bills set up yet</div>
          <button onClick={() => setShowAddBill(true)} style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Add Your First Bill</button>
        </Card>
      )}

      {/* Add Bill Modal */}
      {showAddBill && (
        <Overlay onClose={() => setShowAddBill(false)}>
          <AddBillForm
            onAdd={(bill) => { setBillTemplates((p) => [...p, bill]); setShowAddBill(false); }}
            onClose={() => setShowAddBill(false)}
          />
        </Overlay>
      )}

      {/* Edit Bill Modal */}
      {editingBill && (
        <Overlay onClose={() => setEditingBill(null)}>
          <EditBillForm bill={editingBill} onSave={updateBill} onClose={() => setEditingBill(null)} />
        </Overlay>
      )}
    </div>
  );
}

function EditBillForm({ bill, onSave, onClose }) {
  const [form, setForm] = useState({
    name: bill.name, amount: String(bill.amount), anchorDate: bill.anchorDate,
    recurring: bill.recurring, frequency: bill.frequency || "monthly",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.amount) > 0 && form.anchorDate;

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Edit Bill</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Bill Name</label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} style={INPUT_STYLE} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Amount</label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} style={INPUT_STYLE} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>{form.recurring ? "Start Date" : "Due Date"}</label>
            <input type="date" value={form.anchorDate} onChange={(e) => update("anchorDate", e.target.value)} style={INPUT_STYLE} />
          </div>
        </div>
        <div onClick={() => update("recurring", !form.recurring)}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px",
            borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer",
          }}>
          <div style={{
            width: 40, height: 22, borderRadius: 11, padding: 2,
            background: form.recurring ? "var(--accent)" : "var(--track)",
            transition: "background 0.2s", display: "flex", alignItems: "center",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9, background: "#fff",
              transition: "transform 0.2s",
              transform: form.recurring ? "translateX(18px)" : "translateX(0)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Recurring Bill</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Automatically repeats on schedule</div>
          </div>
        </div>
        {form.recurring && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, display: "block" }}>Frequency</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => {
                const active = form.frequency === key;
                return (
                  <button key={key} onClick={() => update("frequency", key)}
                    style={{
                      padding: "7px 14px", borderRadius: 8,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent)" + "22" : "transparent",
                      color: active ? "var(--accent)" : "var(--text-muted)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                    }}
                  >{label}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button
          onClick={() => {
            if (canSubmit) onSave({
              ...bill, name: form.name.trim(), amount: parseFloat(form.amount),
              anchorDate: form.anchorDate, recurring: form.recurring,
              frequency: form.recurring ? form.frequency : null,
            });
          }}
          disabled={!canSubmit}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: canSubmit ? "var(--accent)" : "var(--border)",
            color: canSubmit ? "#fff" : "var(--text-muted)",
            fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >Save Changes</button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// SAVINGS GOALS PAGE
// ─────────────────────────────────────────────

function DraggableSimpleList({ items, onReorder, renderItem }) {
  const { dragIndex, overIndex, startDrag, listId } = useDragToReorder(items, onReorder);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
        Drag the handles to reorder. Press <strong style={{ color: "var(--text-secondary)" }}>Reorder</strong> again to exit.
      </div>
      {items.map((item, idx) => {
        const isDragging = dragIndex === idx;
        const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;
        return (
          <div key={item.id} data-drag-list={listId} data-drag-item={idx} style={{
            opacity: isDragging ? 0.35 : 1,
            borderRadius: 12, border: `2px solid ${isOver ? "var(--accent)" : "var(--border)"}`,
            background: "var(--card)", transition: "border-color 0.15s, opacity 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 16px" }}>
              <DragHandle onPointerDown={(e) => startDrag(e, idx)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {renderItem(item)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SavingsPage({ savingsGoals, setSavingsGoals, showUndo, categories, setCategories, setTransactions, budgetTargets, setBudgetTargets }) {
  const [modal, setModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [reordering, setReordering] = useState(false);

  const totalSaved = savingsGoals.reduce((s, g) => s + g.current, 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + g.target, 0);
  const totalMonthly = savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0);
  const completedCount = savingsGoals.filter((g) => g.current >= g.target).length;

  const addContribution = (goalId, amount) => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    const today = new Date().toISOString().split("T")[0];
    // Update savings goal
    setSavingsGoals((prev) => prev.map((g) => g.id === goalId ? {
      ...g, current: g.current + amount,
      contributions: [...g.contributions, { date: today, amount }],
    } : g));
    // Log as a transaction in the savings budget category
    const catId = `savings_${goalId}`;
    if (setTransactions) {
      setTransactions((prev) => [...prev, {
        id: nextId(), categoryId: catId,
        description: `${goal?.name || "Savings"} contribution`,
        amount, date: today,
      }]);
    }
    setModal(null);
  };

  const addGoal = (goal) => {
    setSavingsGoals((prev) => [...prev, goal]);
    // Auto-create a matching budget category + target
    const catId = `savings_${goal.id}`;
    if (setCategories) {
      setCategories((prev) => {
        if (prev.find((c) => c.id === catId)) return prev;
        return [...prev, { id: catId, name: goal.name, icon: goal.icon || "💰", limit: goal.monthlyContribution || 0, color: goal.color || "var(--accent)" }];
      });
    }
    if (setBudgetTargets && goal.target > 0) {
      setBudgetTargets((prev) => ({
        ...prev,
        [catId]: {
          type: "target_by_date",
          targetAmount: goal.target,
          targetDate: goal.deadline || "",
          funded: goal.current || 0,
        },
      }));
    }
    setModal(null);
  };

  const updateGoal = (updated) => {
    setSavingsGoals((prev) => prev.map((g) => g.id === updated.id ? { ...g, ...updated } : g));
    // Sync budget category name/icon
    const catId = `savings_${updated.id}`;
    if (setCategories) {
      setCategories((prev) => prev.map((c) => c.id === catId
        ? { ...c, name: updated.name, icon: updated.icon || c.icon, color: updated.color || c.color }
        : c));
    }
    if (setBudgetTargets && updated.target > 0) {
      setBudgetTargets((prev) => ({
        ...prev,
        [catId]: {
          type: "target_by_date",
          targetAmount: updated.target,
          targetDate: updated.deadline || "",
          funded: updated.current || 0,
        },
      }));
    }
    setModal(null);
  };

  const deleteGoal = (id) => {
    const goal = savingsGoals.find((g) => g.id === id);
    if (showUndo && goal) showUndo(`Deleted "${goal.name}" goal`);
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
    // Remove matching budget category
    const catId = `savings_${id}`;
    if (setCategories) setCategories((prev) => prev.filter((c) => c.id !== catId));
    if (setBudgetTargets) setBudgetTargets((prev) => { const next = { ...prev }; delete next[catId]; return next; });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Savings Goals</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Track progress toward your financial goals</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {savingsGoals.length > 1 && (
            <button onClick={() => { setReordering((v) => !v); setExpandedId(null); }} style={{
              padding: "10px 14px", borderRadius: 10, border: `1px solid ${reordering ? "var(--accent)" : "var(--border)"}`,
              background: reordering ? "var(--accent)18" : "transparent", color: reordering ? "var(--accent)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>⠿ Reorder</button>
          )}
          <button onClick={() => setModal("add")} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>+ New Goal</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Total Saved" value={fmt(totalSaved)} sub={`${pct(totalSaved, totalTarget).toFixed(0)}% of all goals`} accent="var(--green)" />
        <MetricBox label="Total Target" value={fmtCompact(totalTarget)} sub={`${fmt(totalTarget - totalSaved)} remaining`} />
        <MetricBox label="Monthly Savings" value={fmt(totalMonthly)} sub="combined contributions" accent="var(--accent)" />
        <MetricBox label="Goals Complete" value={`${completedCount}/${savingsGoals.length}`} sub={completedCount === savingsGoals.length && savingsGoals.length > 0 ? "all done!" : `${savingsGoals.length - completedCount} in progress`} accent={completedCount > 0 ? "var(--green)" : "var(--text-muted)"} />
      </div>

      {/* Goal cards */}
      {reordering && (
        <DraggableSimpleList
          items={savingsGoals}
          onReorder={setSavingsGoals}
          renderItem={(g) => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{g.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{g.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(g.current)} / {fmt(g.target)}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>{pct(g.current, g.target).toFixed(0)}%</span>
            </div>
          )}
        />
      )}
      <div style={{ display: reordering ? "none" : "flex", flexDirection: "column", gap: 14 }}>
        {savingsGoals.map((goal) => {
          const percent = pct(goal.current, goal.target);
          const isComplete = goal.current >= goal.target;
          const remaining = Math.max(goal.target - goal.current, 0);
          const monthsLeft = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : null;
          const isExpanded = expandedId === goal.id;

          // Deadline info
          const deadline = goal.deadline ? new Date(goal.deadline + "T00:00:00") : null;
          const daysToDeadline = deadline ? Math.ceil((deadline - new Date()) / 86400000) : null;
          const onTrack = deadline && goal.monthlyContribution > 0
            ? (remaining / goal.monthlyContribution) <= (daysToDeadline / 30)
            : null;

          return (
            <SwipeToDelete key={goal.id} onDelete={() => deleteGoal(goal.id)}>
              <Card>
              <div
                style={{ padding: "20px", cursor: "pointer" }}
                onClick={() => setExpandedId(isExpanded ? null : goal.id)}
              >
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: (goal.color || "var(--accent)") + "18",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    }}>{goal.icon}</div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{goal.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12 }}>
                        <span>{fmt(goal.monthlyContribution)}/mo</span>
                        {deadline && (
                          <span style={{ color: daysToDeadline <= 60 ? "var(--amber)" : "var(--text-muted)" }}>
                            Due {deadline.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {isComplete ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 12px", borderRadius: 999,
                        background: "var(--green-bg)", color: "var(--green)",
                        fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em",
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Complete
                      </span>
                    ) : (
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: goal.color || "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                          {percent.toFixed(0)}%
                        </div>
                        {onTrack !== null && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: onTrack ? "var(--green)" : "var(--amber)", marginTop: 2 }}>
                            {onTrack ? "On Track" : "Behind"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <ProgressBar value={goal.current} max={goal.target} color={isComplete ? "var(--green)" : goal.color || "var(--accent)"} height={10} />

                {/* Stats row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(goal.current)} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>of {fmt(goal.target)}</span>
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!isComplete && monthsLeft && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>~{monthsLeft}mo left</span>
                    )}
                    {!isComplete && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(remaining)} to go</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded section */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                  {/* Action buttons */}
                  <div style={{ padding: "12px 20px", display: "flex", gap: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                    {!isComplete && (
                      <button onClick={(e) => { e.stopPropagation(); setModal({ type: "contribute", goal }); }}
                        style={{
                          padding: "8px 16px", borderRadius: 8, border: "none",
                          background: goal.color || "var(--accent)", color: "#fff",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}>+ Add Contribution</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setModal({ type: "edit", goal }); }}
                      style={{
                        padding: "8px 16px", borderRadius: 8,
                        border: "1px solid var(--border)", background: "transparent",
                        color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}>Edit Goal</button>
                  </div>

                  {/* Contribution history */}
                  <div style={{ padding: "8px 20px 4px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                      Contribution History
                    </span>
                  </div>

                  {/* Contribution bar chart — monthly rollup */}
                  {goal.contributions.length >= 2 && (() => {
                    // Roll up contributions by month
                    const byMonth = {};
                    goal.contributions.forEach((c) => {
                      const mk = c.date.substring(0, 7);
                      byMonth[mk] = (byMonth[mk] || 0) + c.amount;
                    });
                    const months = Object.keys(byMonth).sort().slice(-8);
                    const amounts = months.map((mk) => byMonth[mk]);
                    const maxAmt = Math.max(...amounts, 1);
                    const cbW = 400, cbH = 80;
                    const cbPad = { top: 6, right: 8, bottom: 22, left: 44 };
                    const cbInW = cbW - cbPad.left - cbPad.right;
                    const cbInH = cbH - cbPad.top - cbPad.bottom;
                    const bw = Math.max((cbInW - 6 * (months.length - 1)) / months.length, 12);
                    const barColor = goal.color || "var(--accent)";
                    return (
                      <div style={{ padding: "4px 20px 0", overflowX: "auto" }}>
                        <svg viewBox={`0 0 ${cbW} ${cbH}`} style={{ width: "100%", maxHeight: 90 }} preserveAspectRatio="xMidYMid meet">
                          {/* Y tick lines */}
                          {[0, 0.5, 1].map((f) => {
                            const v = maxAmt * (1 - f);
                            const y = cbPad.top + cbInH * f;
                            return (
                              <g key={f}>
                                <line x1={cbPad.left} y1={y} x2={cbW - cbPad.right} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                                <text x={cbPad.left - 5} y={y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">
                                  {v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`}
                                </text>
                              </g>
                            );
                          })}
                          {/* Bars */}
                          {months.map((mk, i) => {
                            const amt = amounts[i];
                            const bh = (amt / maxAmt) * cbInH;
                            const x = cbPad.left + i * (bw + 6);
                            const y = cbPad.top + cbInH - bh;
                            const d = new Date(mk + "-01T00:00:00");
                            const label = d.toLocaleDateString("en-US", { month: "short" });
                            const isLatest = i === months.length - 1;
                            return (
                              <g key={mk}>
                                <rect x={x} y={y} width={bw} height={bh} rx={3}
                                  fill={barColor} opacity={isLatest ? 1 : 0.45} />
                                <text x={x + bw / 2} y={cbH - 5} textAnchor="middle"
                                  fill={isLatest ? "var(--text-primary)" : "var(--text-muted)"}
                                  fontSize="8" fontWeight={isLatest ? "700" : "500"} fontFamily="DM Sans, sans-serif">
                                  {label}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}

                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {[...goal.contributions].map((c, origIdx) => ({ c, origIdx })).reverse().map(({ c, origIdx }) => (
                      <div key={origIdx} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)",
                      }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          {new Date(c.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>
                            +{fmt(c.amount)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (showUndo) showUndo(`Removed ${fmt(c.amount)} from "${goal.name}"`);
                              setSavingsGoals((prev) => prev.map((g) => g.id === goal.id ? {
                                ...g,
                                current: Math.max(0, g.current - c.amount),
                                contributions: g.contributions.filter((_, idx) => idx !== origIdx),
                              } : g));
                            }}
                            style={{
                              background: "none", border: "1px solid var(--border)", borderRadius: 5,
                              width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                              color: "var(--text-muted)", cursor: "pointer", fontSize: 10, lineHeight: 1,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                          >✕</button>
                        </div>
                      </div>
                    ))}
                    {goal.contributions.length === 0 && (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No contributions yet</div>
                    )}
                  </div>
                </div>
              )}
            </Card>
            </SwipeToDelete>
          );
        })}
      </div>

      {savingsGoals.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No savings goals yet</div>
          <button onClick={() => setModal("add")} style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Create Your First Goal</button>
        </Card>
      )}

      {/* Add Goal Modal */}
      {modal === "add" && (
        <Overlay onClose={() => setModal(null)}>
          <AddGoalForm onAdd={addGoal} onClose={() => setModal(null)} />
        </Overlay>
      )}

      {/* Contribute Modal */}
      {modal?.type === "contribute" && (
        <Overlay onClose={() => setModal(null)}>
          <ContributeForm goal={modal.goal} onContribute={addContribution} onClose={() => setModal(null)} />
        </Overlay>
      )}

      {/* Edit Goal Modal */}
      {modal?.type === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <EditGoalForm goal={modal.goal} onSave={updateGoal} onClose={() => setModal(null)} />
        </Overlay>
      )}
    </div>
  );
}

// Savings modal forms

const GOAL_COLORS = [
  { value: "var(--green)", label: "Green" },
  { value: "var(--accent)", label: "Blue" },
  { value: "var(--amber)", label: "Amber" },
  { value: "#f472b6", label: "Pink" },
  { value: "var(--red)", label: "Red" },
  { value: "#38bdf8", label: "Sky" },
  { value: "#d4a843", label: "Gold" },
];

const GOAL_ICONS = ["🎯", "🛡", "✈", "💻", "🚗", "🏠", "🎓", "💍", "🏖", "🎁", "📱", "🏥"];

function AddGoalForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", target: "", monthlyContribution: "", deadline: "", icon: "🎯", color: "var(--accent)" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.target) > 0;

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>New Savings Goal</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Goal Name</FieldLabel>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Emergency Fund" style={INPUT_STYLE} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Target Amount</FieldLabel><input type="number" step="1" min="0" value={form.target} onChange={(e) => update("target", e.target.value)} placeholder="0" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Monthly Contribution</FieldLabel><input type="number" step="1" min="0" value={form.monthlyContribution} onChange={(e) => update("monthlyContribution", e.target.value)} placeholder="0" style={INPUT_STYLE} /></div>
        </div>
        <div>
          <FieldLabel>Target Date (optional)</FieldLabel>
          <input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} style={INPUT_STYLE} />
        </div>
        <div>
          <FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GOAL_ICONS.map((icon) => (
              <button key={icon} onClick={() => update("icon", icon)}
                style={{
                  width: 38, height: 38, borderRadius: 8, fontSize: 18,
                  border: `2px solid ${form.icon === icon ? "var(--accent)" : "var(--border)"}`,
                  background: form.icon === icon ? "var(--accent)" + "22" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{icon}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {GOAL_COLORS.map((c) => (
              <button key={c.value} onClick={() => update("color", c.value)}
                style={{
                  width: 28, height: 28, borderRadius: 999, background: c.value,
                  border: `3px solid ${form.color === c.value ? "var(--text-primary)" : "transparent"}`,
                  cursor: "pointer", transition: "border 0.15s",
                }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => {
          if (canSubmit) onAdd({
            id: nextId(), name: form.name.trim(), target: parseFloat(form.target), current: 0,
            monthlyContribution: parseFloat(form.monthlyContribution) || 0,
            deadline: form.deadline || null, icon: form.icon, color: form.color, contributions: [],
          });
        }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Create Goal
        </button>
      </div>
    </>
  );
}

function ContributeForm({ goal, onContribute, onClose }) {
  const [amount, setAmount] = useState("");
  const remaining = Math.max(goal.target - goal.current, 0);
  const valid = parseFloat(amount) > 0;
  const quickAmounts = [50, 100, goal.monthlyContribution, remaining].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4);

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Add to {goal.icon} {goal.name}
        </h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          {fmt(goal.current)} of {fmt(goal.target)} · {fmt(remaining)} remaining
        </div>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Amount</FieldLabel>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...INPUT_STYLE, fontSize: 18, fontWeight: 600, padding: "14px 12px" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {quickAmounts.map((qa) => (
            <button key={qa} onClick={() => setAmount(String(qa))}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: `1px solid ${parseFloat(amount) === qa ? goal.color || "var(--accent)" : "var(--border)"}`,
                background: parseFloat(amount) === qa ? (goal.color || "var(--accent)") + "22" : "transparent",
                color: parseFloat(amount) === qa ? goal.color || "var(--accent)" : "var(--text-muted)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
              {qa === remaining ? `${fmt(qa)} (fill)` : qa === goal.monthlyContribution ? `${fmt(qa)} (monthly)` : fmt(qa)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (valid) onContribute(goal.id, parseFloat(amount)); }} disabled={!valid}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: valid ? (goal.color || "var(--accent)") : "var(--border)", color: valid ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: valid ? "pointer" : "not-allowed" }}>
          Add {valid ? fmt(parseFloat(amount)) : "Contribution"}
        </button>
      </div>
    </>
  );
}

function EditGoalForm({ goal, onSave, onClose }) {
  const [form, setForm] = useState({
    name: goal.name, target: String(goal.target), monthlyContribution: String(goal.monthlyContribution),
    deadline: goal.deadline || "", icon: goal.icon, color: goal.color || "var(--accent)",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.target) > 0;

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Edit Goal</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Goal Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Target Amount</FieldLabel><input type="number" step="1" min="0" value={form.target} onChange={(e) => update("target", e.target.value)} style={INPUT_STYLE} /></div>
          <div><FieldLabel>Monthly Contribution</FieldLabel><input type="number" step="1" min="0" value={form.monthlyContribution} onChange={(e) => update("monthlyContribution", e.target.value)} style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Target Date (optional)</FieldLabel><input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} style={INPUT_STYLE} /></div>
        <div>
          <FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GOAL_ICONS.map((icon) => (
              <button key={icon} onClick={() => update("icon", icon)}
                style={{
                  width: 38, height: 38, borderRadius: 8, fontSize: 18,
                  border: `2px solid ${form.icon === icon ? "var(--accent)" : "var(--border)"}`,
                  background: form.icon === icon ? "var(--accent)" + "22" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{icon}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {GOAL_COLORS.map((c) => (
              <button key={c.value} onClick={() => update("color", c.value)}
                style={{
                  width: 28, height: 28, borderRadius: 999, background: c.value,
                  border: `3px solid ${form.color === c.value ? "var(--text-primary)" : "transparent"}`,
                  cursor: "pointer",
                }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => {
          if (canSubmit) onSave({
            ...goal, name: form.name.trim(), target: parseFloat(form.target),
            monthlyContribution: parseFloat(form.monthlyContribution) || 0,
            deadline: form.deadline || null, icon: form.icon, color: form.color,
          });
        }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Save Changes
        </button>
      </div>
    </>
  );
}


// ─────────────────────────────────────────────
// PAYCHECK PLANNER PAGE
// ─────────────────────────────────────────────

function generatePaycheckDates(stream, year, month) {
  const dates = [];
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const anchor = new Date(stream.anchorDate + "T00:00:00");

  switch (stream.frequency) {
    case "semimonthly": {
      // Two paydays per month: anchor day and anchor day + 15 (or 1st & 15th if no anchor)
      const anchorDay = anchor.getDate();
      const secondDay = anchorDay <= 15 ? anchorDay + 15 : anchorDay - 15;
      const day1 = Math.min(anchorDay, secondDay);
      const day2 = Math.max(anchorDay, secondDay);
      const first = new Date(year, month, Math.min(day1, monthEnd.getDate()));
      const second = new Date(year, month, Math.min(day2, monthEnd.getDate()));
      if (first >= anchor) dates.push(first);
      if (second >= anchor && second.getTime() !== first.getTime()) dates.push(second);
      break;
    }
    case "biweekly": {
      let cur = new Date(anchor);
      if (cur < monthStart) {
        const diff = Math.floor((monthStart - cur) / (14 * 86400000));
        cur = new Date(cur.getTime() + diff * 14 * 86400000);
      }
      while (cur <= monthEnd) {
        if (cur >= monthStart) dates.push(new Date(cur));
        cur = new Date(cur.getTime() + 14 * 86400000);
      }
      break;
    }
    case "weekly": {
      let cur = new Date(anchor);
      if (cur < monthStart) {
        const diff = Math.floor((monthStart - cur) / (7 * 86400000));
        cur = new Date(cur.getTime() + diff * 7 * 86400000);
      }
      while (cur <= monthEnd) {
        if (cur >= monthStart) dates.push(new Date(cur));
        cur = new Date(cur.getTime() + 7 * 86400000);
      }
      break;
    }
    case "monthly": {
      const day = Math.min(anchor.getDate(), monthEnd.getDate());
      const d = new Date(year, month, day);
      if (d >= anchor) dates.push(d);
      break;
    }
  }
  return dates.sort((a, b) => a - b);
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatShortDate(date) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return { month: months[date.getMonth()], day: date.getDate() };
}

function WaterfallRow({ line, paycheckKey, onDragStart, onRemove, onTogglePaid }) {
  // Divider lines (virtual mid-month split) render as a simple separator
  if (line.isDivider) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px", background: "var(--surface)", borderBottom: "1px solid var(--border-subtle)" }}>
        <DragHandle onPointerDown={onDragStart} />
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", whiteSpace: "nowrap" }}>15th</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
    );
  }

  const isIncome = line.isIncome;
  const canRemove = line.customId != null;
  const isBill = line.type === "bill";
  const isSavings = line.type === "savings";
  const canSwipePaid = isBill && line.instanceKey;
  const canSwipe = canSwipePaid || canRemove;

  const swipeStartX = useRef(0);
  const swipeCurrentX = useRef(0);
  const swipingRef = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dragging, setDragging] = useState(false);
  const didSwipe = useRef(false);
  const SWIPE_THRESHOLD = 70;
  const SWIPE_MIN = 8;

  const handleSwipeStart = (clientX) => {
    if (!canSwipe) return;
    swipeStartX.current = clientX; swipeCurrentX.current = clientX;
    didSwipe.current = false; swipingRef.current = true; setDragging(true);
  };
  const handleSwipeMove = (clientX) => {
    if (!swipingRef.current || !canSwipe) return;
    swipeCurrentX.current = clientX;
    const dx = clientX - swipeStartX.current;
    if (Math.abs(dx) > SWIPE_MIN) didSwipe.current = true;
    if (dx > 0 && canSwipePaid) setSwipeOffset(Math.min(dx, 120));
    if (dx < 0 && canRemove) setSwipeOffset(Math.max(dx, -140));
  };
  const handleSwipeEnd = () => {
    if (!swipingRef.current) return;
    swipingRef.current = false; setDragging(false);
    const dx = swipeCurrentX.current - swipeStartX.current;
    if (dx > SWIPE_THRESHOLD && canSwipePaid) {
      onTogglePaid && onTogglePaid(line.instanceKey); setSwipeOffset(0);
    } else if (dx < -SWIPE_THRESHOLD && canRemove) {
      setSwipeOffset(-140); setShowDeleteConfirm(true);
    } else { setSwipeOffset(0); setShowDeleteConfirm(false); }
  };
  const onTouchStart = (e) => handleSwipeStart(e.touches[0].clientX);
  const onTouchMove = (e) => handleSwipeMove(e.touches[0].clientX);
  const onTouchEnd = () => handleSwipeEnd();
  const onMouseDown = (e) => {
    if (!canSwipe) return;
    handleSwipeStart(e.clientX);
    const onMM = (ev) => handleSwipeMove(ev.clientX);
    const onMU = () => { document.removeEventListener("mousemove", onMM); document.removeEventListener("mouseup", onMU); handleSwipeEnd(); };
    document.addEventListener("mousemove", onMM); document.addEventListener("mouseup", onMU);
  };
  const onClickCapture = (e) => {
    if (didSwipe.current) { e.stopPropagation(); e.preventDefault(); didSwipe.current = false; }
  };
  const revealPct = canSwipePaid && swipeOffset > 0 ? Math.min(swipeOffset / SWIPE_THRESHOLD, 1) : 0;

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {canSwipePaid && swipeOffset > 0 && (
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 120, background: line.isPaid ? "var(--amber)" : "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, zIndex: 1, opacity: Math.max(revealPct, 0.6) }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {line.isPaid ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <polyline points="20 6 9 17 4 12"/>}
          </svg>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{line.isPaid ? "Unpay" : "Paid"}</span>
        </div>
      )}
      {canRemove && (
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 140, background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 1 }}>
          <button onClick={() => { onRemove && onRemove(paycheckKey, line.customId); setSwipeOffset(0); setShowDeleteConfirm(false); }}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "8px 16px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
            Delete
          </button>
        </div>
      )}
      <div
        onTouchStart={canSwipe ? onTouchStart : undefined} onTouchMove={canSwipe ? onTouchMove : undefined} onTouchEnd={canSwipe ? onTouchEnd : undefined}
        onMouseDown={canSwipe ? onMouseDown : undefined} onClickCapture={canSwipe ? onClickCapture : undefined}
        style={{ display: "grid", gridTemplateColumns: "28px 48px 1fr auto", alignItems: "center", padding: "10px 16px 10px 4px", borderBottom: "1px solid var(--border-subtle)", background: isIncome ? "var(--green-bg)" : line.isPaid ? "var(--surface)" : "var(--card)", transform: `translateX(${swipeOffset}px)`, transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.22,1,0.36,1)", position: "relative", zIndex: 2, userSelect: "none", cursor: canSwipe ? "grab" : "default" }}
      >
        <DragHandle onPointerDown={onDragStart} />
        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{line.dateInfo.month}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>{line.dateInfo.day}</div>
        </div>
        <div style={{ paddingLeft: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {isIncome && <span style={{ width: 8, height: 8, borderRadius: 2, background: line.color || "var(--green)" }} />}
            {isSavings && <span style={{ width: 8, height: 8, borderRadius: 2, background: line.color || "var(--accent)" }} />}
            {isBill && <span style={{ width: 8, height: 8, borderRadius: "50%", background: line.isPaid ? "var(--green)" : "var(--border-hover)", transition: "background 0.2s" }} />}
            <span style={{ fontSize: 15, fontWeight: 600, color: line.isPaid ? "var(--text-muted)" : "var(--text-primary)", textDecoration: line.isPaid ? "line-through" : "none" }}>{line.name}</span>
            {isBill && line.recurring && line.frequency && <FrequencyBadge frequency={line.frequency} />}
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 100 }}>
          <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: isIncome ? "var(--green)" : line.isPaid ? "var(--text-muted)" : "var(--red)" }}>
            {isIncome ? "+" : "-"}{fmt(line.amount)}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: line.balance < 0 ? "var(--red)" : "var(--text-primary)" }}>
            {fmt(line.balance)}
          </div>
        </div>
      </div>
    </div>
  );
}

function WaterfallSchedule({ paycheckSchedules, year, month, customItems, setCustomItems, monthlyRollovers, setShowAddItem, setShowAddIncome, setShowAddSavings, allPaychecks, onRemove, onTogglePaid }) {
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const startBuffer = monthlyRollovers[monthKey] || 0;
  const orderKey = `order-${monthKey}`;

  // Build flat ordered list of all lines
  const allLines = useMemo(() => {
    const lines = [];
    let lineIdx = 0;
    paycheckSchedules.forEach((pc) => {
      pc.lines.forEach((line) => {
        lines.push({ ...line, paycheckKey: pc.key, streamColor: pc.streamColor, streamName: pc.streamName, lineId: lineIdx++ });
      });
    });
    const savedOrder = customItems[orderKey];
    if (savedOrder && Array.isArray(savedOrder)) {
      const idxMap = {};
      savedOrder.forEach((id, i) => { idxMap[id] = i; });
      lines.sort((a, b) => {
        const posA = idxMap[a.lineId] !== undefined ? idxMap[a.lineId] : 9999;
        const posB = idxMap[b.lineId] !== undefined ? idxMap[b.lineId] : 9999;
        return posA - posB;
      });
    }
    // Recalculate running balance
    let balance = startBuffer;
    lines.forEach((line) => {
      if (line.isIncome) balance += line.amount;
      else balance -= line.amount;
      line.balance = balance;
    });
    return lines;
  }, [paycheckSchedules, customItems, orderKey, startBuffer]);

  const finalBalance = allLines.length > 0 ? allLines[allLines.length - 1].balance : startBuffer;
  const hasCustomOrder = !!customItems[orderKey];

  // Drag-to-reorder — saves new lineId order to customItems[orderKey]
  const reorderLines = useCallback((newLines) => {
    const newOrder = newLines.map((l) => l.lineId);
    setCustomItems((prev) => ({ ...prev, [orderKey]: newOrder }));
  }, [orderKey, setCustomItems]);

  const { dragIndex, overIndex, startDrag, listId } = useDragToReorder(allLines, reorderLines);

  const resetOrder = () => {
    setCustomItems((prev) => { const next = { ...prev }; delete next[orderKey]; return next; });
  };

  return (
    <Card>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Spending Schedule</span>
          {hasCustomOrder && (
            <button onClick={resetOrder} style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Reset Order</button>
          )}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Balance</span>
      </div>

      {/* Starting buffer */}
      {startBuffer !== 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "28px 48px 1fr auto", alignItems: "center", padding: "10px 16px 10px 4px", borderBottom: "1px solid var(--border-subtle)", background: startBuffer > 0 ? "var(--green-bg)" : "var(--red-bg)" }}>
          <div />
          <div style={{ textAlign: "center", lineHeight: 1.2 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{new Date(year, month, 1).toLocaleDateString("en-US", { month: "short" }).toUpperCase().slice(0, 3)}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>1</div>
          </div>
          <div style={{ paddingLeft: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Starting Buffer</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>rolled over</span>
          </div>
          <div style={{ textAlign: "right", minWidth: 100 }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: startBuffer > 0 ? "var(--green)" : "var(--red)" }}>{fmt(startBuffer)}</div>
          </div>
        </div>
      )}

      {/* Waterfall rows with drag */}
      {allLines.map((line, i) => (
        <div key={`${line.paycheckKey}-${line.lineId}`}
          data-drag-list={listId} data-drag-item={i}
          style={{ opacity: dragIndex === i ? 0.4 : 1, outline: overIndex === i && dragIndex !== null && dragIndex !== i ? "2px solid var(--accent)" : "none", transition: "opacity 0.15s, outline 0.1s" }}>
      <WaterfallRow line={line} paycheckKey={line.paycheckKey} onDragStart={(e) => startDrag(e, i)} onRemove={onRemove} onTogglePaid={onTogglePaid} />
        </div>
      ))}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid var(--border)", background: finalBalance < 0 ? "var(--red-bg)" : "var(--surface)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAddItem(allPaychecks[allPaychecks.length - 1]?.key)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Expense</button>
          <button onClick={() => setShowAddSavings(allPaychecks[allPaychecks.length - 1]?.key)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--accent)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Savings</button>
          <button onClick={() => setShowAddIncome(allPaychecks[allPaychecks.length - 1]?.key)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--green)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Income</button>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>End of Month</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: finalBalance < 0 ? "var(--red)" : "var(--green)" }}>{fmt(finalBalance)}</div>
        </div>
      </div>
    </Card>
  );
}

function PaycheckPlannerPage({ paycheckStreams, setPaycheckStreams, billTemplates, savingsGoals, setSavingsGoals, paidDates, setPaidDates, customItems, setCustomItems, monthlyRollovers, setMonthlyRollovers, income, settings, setSettings, showUndo }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [showAddStream, setShowAddStream] = useState(false);
  const [showAddItem, setShowAddItem] = useState(null);
  const [showAddIncome, setShowAddIncome] = useState(null);
  const [showAddSavings, setShowAddSavings] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  // Persist income stream toggle in settings
  const useIncomeStreams = settings?.paycheckUseIncome !== false;
  const toggleIncomeStreams = () => setSettings((s) => ({ ...s, paycheckUseIncome: !useIncomeStreams }));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Derive paycheck streams from income sources (recurring only)
  const derivedStreams = useMemo(() => {
    if (!useIncomeStreams) return [];
    return income.filter((i) => i.recurring).map((i) => {
      // Map income frequency to paycheck stream format
      const streamColors = ["var(--accent)", "#d4a843", "var(--green)", "#38bdf8", "var(--amber)", "#f472b6"];
      return {
        id: `inc-${i.id}`,
        name: i.source,
        amount: i.amount,
        frequency: i.frequency,
        anchorDate: i.date,
        color: streamColors[(i.id - 1) % streamColors.length],
        fromIncome: true,
      };
    });
  }, [income, useIncomeStreams]);

  // Merge derived + manual streams (manual takes precedence for overrides)
  const effectiveStreams = useMemo(() => {
    if (useIncomeStreams) {
      // Use derived streams + any manual-only streams (those not matching an income source)
      const manualOnly = paycheckStreams.filter((s) => !derivedStreams.some((d) => d.name === s.name));
      return [...derivedStreams, ...manualOnly];
    }
    return paycheckStreams;
  }, [useIncomeStreams, derivedStreams, paycheckStreams]);

  // Generate all paychecks for the month
  const allPaychecks = useMemo(() => {
    const checks = [];
    effectiveStreams.forEach((stream) => {
      generatePaycheckDates(stream, year, month).forEach((date) => {
        checks.push({
          streamId: stream.id, streamName: stream.name, streamColor: stream.color,
          amount: stream.amount, date, dateStr: formatDateKey(date),
          key: `${stream.id}-${formatDateKey(date)}`,
          fromIncome: stream.fromIncome || false,
        });
      });
    });
    return checks.sort((a, b) => a.date - b.date);
  }, [effectiveStreams, year, month]);

  // Generate bill instances for the month
  const monthBills = useMemo(
    () => generateBillInstances(billTemplates, year, month),
    [billTemplates, year, month]
  );

  // Assign bills to the paycheck on or before their due date.
  // For semimonthly bills: if no paycheck falls on/after the 15th,
  // inject a virtual split at the 15th so those instances display correctly.
  const assignBillsToPaychecks = useMemo(() => {
    const assignments = {};
    allPaychecks.forEach((pc) => { assignments[pc.key] = []; });

    // Check if any paycheck lands on or after the 15th of the month
    const hasLatePaycheck = allPaychecks.some((pc) => pc.date.getDate() >= 15);

    // If no paycheck is on/after the 15th but we have semimonthly bills,
    // create a virtual split key for mid-month bills
    const midMonthKey = `virtual-15-${year}-${String(month + 1).padStart(2, "0")}`;
    const needsMidSplit = !hasLatePaycheck && monthBills.some((b) => {
      const d = new Date(b.instanceDate + "T00:00:00");
      return d.getDate() >= 15;
    });
    if (needsMidSplit) assignments[midMonthKey] = [];

    monthBills.forEach((bill) => {
      const billDate = new Date(bill.instanceDate + "T00:00:00");
      const billDay = billDate.getDate();

      // If this is a mid-month bill and we have a virtual split, use it
      if (needsMidSplit && billDay >= 15) {
        assignments[midMonthKey].push(bill);
        return;
      }

      let assignedKey = null;
      for (let i = allPaychecks.length - 1; i >= 0; i--) {
        if (allPaychecks[i].date <= billDate) { assignedKey = allPaychecks[i].key; break; }
      }
      if (!assignedKey && allPaychecks.length > 0) assignedKey = allPaychecks[0].key;
      if (assignedKey) assignments[assignedKey].push(bill);
    });
    return assignments;
  }, [allPaychecks, monthBills, year, month]);

  // Build the waterfall schedule for each paycheck
  const paycheckSchedules = useMemo(() => {
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const midMonthKey = `virtual-15-${monthKey}`;
    const hasMidSplit = midMonthKey in assignBillsToPaychecks;

    let carryOver = monthlyRollovers[monthKey] || 0;

    // Build a list of schedule entries: real paychecks + optional virtual mid-month marker
    const scheduleEntries = [...allPaychecks];
    if (hasMidSplit) {
      // Insert a virtual entry at the 15th position
      const midDate = new Date(year, month, 15);
      const midEntry = {
        streamId: "virtual", streamName: "Mid-Month",
        streamColor: "var(--text-muted)", amount: 0,
        date: midDate, dateStr: formatDateKey(midDate),
        key: midMonthKey, fromIncome: false, isVirtual: true,
      };
      // Insert after all paychecks before the 15th
      const insertIdx = scheduleEntries.findIndex((pc) => pc.date > midDate);
      if (insertIdx === -1) scheduleEntries.push(midEntry);
      else scheduleEntries.splice(insertIdx, 0, midEntry);
    }

    return scheduleEntries.map((pc) => {
      const startingBuffer = carryOver;
      const bills = (assignBillsToPaychecks[pc.key] || []).sort((a, b) => a.amount - b.amount);
      const custom = pc.isVirtual ? [] : (customItems[pc.key] || []);
      const customExpenses = custom.filter((i) => i.type === "expense");
      const customIncome = custom.filter((i) => i.type === "income");
      const customSavings = custom.filter((i) => i.type === "savings");

      const lines = [];
      const extraIncome = customIncome.reduce((s, i) => s + i.amount, 0);

      // Income line — skip for virtual mid-month entries
      if (!pc.isVirtual) {
        lines.push({ type: "income", name: pc.streamName, amount: pc.amount, dateInfo: formatShortDate(pc.date), color: pc.streamColor, isIncome: true, rawDate: pc.date });
        customIncome.forEach((ci) => {
          lines.push({ type: "income", name: ci.name, amount: ci.amount, dateInfo: formatShortDate(pc.date), color: "var(--green)", isIncome: true, customId: ci.id, rawDate: pc.date });
        });
      } else {
        // Virtual separator line — just a divider, no income
        lines.push({ type: "divider", name: "— 15th —", amount: 0, dateInfo: formatShortDate(pc.date), isIncome: false, isDivider: true, rawDate: pc.date });
      }

      // Bills
      bills.forEach((bill) => {
        const isPaid = paidDates.has(bill.instanceKey);
        const billDate = new Date(bill.instanceDate + "T00:00:00");
        lines.push({ type: "bill", name: bill.name, amount: bill.amount, dateInfo: formatShortDate(billDate), isPaid, recurring: bill.recurring, frequency: bill.frequency, rawDate: billDate, instanceKey: bill.instanceKey });
      });
      // Savings
      customSavings.forEach((cs) => {
        lines.push({ type: "savings", name: cs.name, amount: cs.amount, dateInfo: formatShortDate(pc.date), color: cs.color || "var(--accent)", customId: cs.id, rawDate: pc.date });
      });
      // Custom expenses
      customExpenses.forEach((ci) => {
        lines.push({ type: "custom", name: ci.name, amount: ci.amount, dateInfo: formatShortDate(pc.date), customId: ci.id, rawDate: pc.date });
      });

      // Running balance
      let balance = startingBuffer;
      lines.forEach((line) => {
        if (line.isIncome) balance += line.amount;
        else if (!line.isDivider) balance -= line.amount;
        line.balance = balance;
      });

      const finalBalance = balance;
      carryOver = finalBalance;

      return { ...pc, lines, startingBuffer, finalBalance, totalIncome: pc.amount + extraIncome };
    });
  }, [allPaychecks, assignBillsToPaychecks, customItems, paidDates, monthlyRollovers, year, month]);

  const totalIncome = paycheckSchedules.reduce((s, pc) => s + pc.totalIncome, 0);
  const totalAllocated = paycheckSchedules.reduce((s, pc) => s + (pc.totalIncome - pc.finalBalance), 0);
  const totalRemaining = totalIncome - totalAllocated;
  const riskLevel = totalRemaining < 0 ? "high" : totalRemaining < totalIncome * 0.05 ? "medium" : "low";
  const riskColors = { low: "var(--green)", medium: "var(--amber)", high: "var(--red)" };
  const riskLabels = { low: "Low", medium: "Medium", high: "High" };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const addCustomItem = (paycheckKey, item) => {
    setCustomItems((prev) => ({ ...prev, [paycheckKey]: [...(prev[paycheckKey] || []), { ...item, id: nextId() }] }));
    setShowAddItem(null);
    setShowAddIncome(null);
  };

  const addSavingsContribution = (paycheckKey, goalId, amount) => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return;
    const today = new Date().toISOString().split("T")[0];
    // Add to waterfall as a savings custom item
    setCustomItems((prev) => ({
      ...prev,
      [paycheckKey]: [...(prev[paycheckKey] || []), {
        id: nextId(), type: "savings", name: `${goal.icon} ${goal.name}`,
        amount, color: goal.color || "var(--accent)", goalId,
      }],
    }));
    // Also update the savings goal's current balance and contributions
    setSavingsGoals((prev) => prev.map((g) => g.id === goalId ? {
      ...g,
      current: g.current + amount,
      contributions: [...(g.contributions || []), { date: today, amount }],
    } : g));
    setShowAddSavings(null);
  };

  const removeCustomItem = (paycheckKey, itemId) => {
    // If it's a savings item, also reverse the contribution from the goal
    const items = customItems[paycheckKey] || [];
    const item = items.find((i) => i.id === itemId);
    if (item?.type === "savings" && item.goalId) {
      setSavingsGoals((prev) => prev.map((g) => g.id === item.goalId ? {
        ...g,
        current: Math.max(0, g.current - item.amount),
        contributions: (g.contributions || []).filter((c) => !(c.amount === item.amount && c.date === new Date().toISOString().split("T")[0])),
      } : g));
    }
    if (showUndo && item) showUndo(`Removed "${item.name}" from paycheck`);
    setCustomItems((prev) => ({ ...prev, [paycheckKey]: (prev[paycheckKey] || []).filter((i) => i.id !== itemId) }));
  };

  // Toggle bill paid status
  const toggleBillPaid = useCallback((instanceKey) => {
    setPaidDates((prev) => {
      const next = new Set(prev);
      if (next.has(instanceKey)) next.delete(instanceKey);
      else next.add(instanceKey);
      return next;
    });
  }, [setPaidDates]);

  // Waterfall row component with swipe-right-to-pay for bills
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Paycheck Planner</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Plan how each paycheck gets spent</p>
        </div>
        <button onClick={() => setShowAddStream(true)} style={{
          padding: "10px 18px", borderRadius: 10, border: "none",
          background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ Income Stream</button>
      </div>

      {/* Month nav */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 20 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{monthName}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Risk indicator */}
      <div style={{
        textAlign: "center", padding: "10px 0 20px",
        fontSize: 14, color: riskColors[riskLevel], fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={riskColors[riskLevel]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {riskLevel === "low" ? <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></> :
           <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
        </svg>
        <span>{riskLabels[riskLevel]} risk of overspending</span>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <MetricBox label="Total Income" value={fmt(totalIncome)} sub={`${allPaychecks.length} paycheck${allPaychecks.length !== 1 ? "s" : ""}`} accent="var(--green)" />
        <MetricBox label="Bills" value={fmt(paycheckSchedules.reduce((s, pc) => s + pc.lines.filter((l) => l.type === "bill").reduce((s2, l) => s2 + l.amount, 0), 0))} sub={`${monthBills.length} this month`} accent="var(--red)" />
        <MetricBox label="Savings" value={fmt(savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0))} sub={`${savingsGoals.filter((g) => g.monthlyContribution > 0).length} goals`} accent="var(--accent)" />
        <MetricBox label="Remaining" value={fmt(totalRemaining)} sub={totalRemaining >= 0 ? "unallocated" : "over budget"} accent={riskColors[riskLevel]} />
      </div>

      {/* Income streams legend */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Income Streams</span>
          <button onClick={toggleIncomeStreams}
            style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {useIncomeStreams ? "Use manual streams" : "Pull from Income page"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {effectiveStreams.map((stream) => (
            <div key={stream.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: stream.color }} />
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{stream.name}</span>
              <span style={{ color: "var(--text-muted)" }}>{fmt(stream.amount)} · {FREQUENCY_LABELS[stream.frequency] || stream.frequency}</span>
              {stream.fromIncome && (
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--green-bg)", color: "var(--green)", fontWeight: 700 }}>AUTO</span>
              )}
              {!stream.fromIncome && (
                confirmingDelete === stream.id ? (
                  <button onClick={() => { setPaycheckStreams((p) => p.filter((s) => s.id !== stream.id)); setConfirmingDelete(null); }}
                    onMouseLeave={() => setConfirmingDelete(null)}
                    style={{ background: "var(--red)", border: "none", borderRadius: 4, padding: "1px 8px", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                ) : (
                  <button onClick={() => setConfirmingDelete(stream.id)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                  >×</button>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Unified Spending Schedule */}
      {paycheckSchedules.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No paychecks this month</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Add an income stream to get started</div>
        </Card>
      )}

      {paycheckSchedules.length > 0 && (
        <WaterfallSchedule
          paycheckSchedules={paycheckSchedules}
          year={year} month={month}
          customItems={customItems} setCustomItems={setCustomItems}
          monthlyRollovers={monthlyRollovers}
          setShowAddItem={setShowAddItem}
          setShowAddIncome={setShowAddIncome}
          setShowAddSavings={setShowAddSavings}
          allPaychecks={allPaychecks}
          onRemove={removeCustomItem}
          onTogglePaid={toggleBillPaid}
        />
      )}

      {/* Month rollover section */}
      {paycheckSchedules.length > 0 && (() => {
        const lastCheck = paycheckSchedules[paycheckSchedules.length - 1];
        const endBalance = lastCheck.finalBalance;
        const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
        const currentRollover = monthlyRollovers[monthKey] || 0;
        const nextMonthDate = new Date(year, month + 1, 1);
        const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
        const nextMonthName = nextMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const alreadyRolled = monthlyRollovers[nextMonthKey] != null;

        return (
          <div style={{ marginTop: 20 }}>
            <Card>
              <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>End of Month Balance</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {endBalance >= 0
                      ? `${fmt(endBalance)} remaining after all ${monthName} obligations`
                      : `${fmt(Math.abs(endBalance))} over budget for ${monthName}`}
                  </div>
                  {currentRollover > 0 && (
                    <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, marginTop: 4 }}>
                      Includes {fmt(currentRollover)} rolled over from previous month
                    </div>
                  )}
                  {alreadyRolled && (
                    <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {fmt(monthlyRollovers[nextMonthKey])} rolled over to {nextMonthName}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: endBalance >= 0 ? "var(--green)" : "var(--red)" }}>
                      {fmt(endBalance)}
                    </div>
                  </div>
                  {endBalance > 0 && (
                    alreadyRolled ? (
                      <button onClick={() => setMonthlyRollovers((prev) => { const next = { ...prev }; delete next[nextMonthKey]; return next; })}
                        style={{
                          padding: "10px 18px", borderRadius: 10,
                          border: "1px solid var(--border)", background: "transparent",
                          color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}>Undo Rollover</button>
                    ) : (
                      <button onClick={() => setMonthlyRollovers((prev) => ({ ...prev, [nextMonthKey]: endBalance }))}
                        style={{
                          padding: "10px 18px", borderRadius: 10, border: "none",
                          background: "var(--green)", color: "#fff",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 004 4h12"/>
                        </svg>
                        Roll Over to {nextMonthDate.toLocaleDateString("en-US", { month: "short" })}
                      </button>
                    )
                  )}
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Modals */}
      {showAddStream && (
        <Overlay onClose={() => setShowAddStream(false)}>
          <AddStreamForm onAdd={(stream) => { setPaycheckStreams((p) => [...p, stream]); setShowAddStream(false); }} onClose={() => setShowAddStream(false)} />
        </Overlay>
      )}
      {showAddItem && (
        <Overlay onClose={() => setShowAddItem(null)}>
          <AddCustomItemForm type="expense" paycheckKey={showAddItem} onAdd={addCustomItem} onClose={() => setShowAddItem(null)} />
        </Overlay>
      )}
      {showAddIncome && (
        <Overlay onClose={() => setShowAddIncome(null)}>
          <AddCustomItemForm type="income" paycheckKey={showAddIncome} onAdd={addCustomItem} onClose={() => setShowAddIncome(null)} />
        </Overlay>
      )}
      {showAddSavings && (
        <Overlay onClose={() => setShowAddSavings(null)}>
          <AddSavingsContributionForm
            savingsGoals={savingsGoals}
            paycheckKey={showAddSavings}
            onAdd={addSavingsContribution}
            onClose={() => setShowAddSavings(null)}
          />
        </Overlay>
      )}
    </div>
  );
}

function AddStreamForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", amount: "", frequency: "semimonthly", anchorDate: new Date().toISOString().split("T")[0], color: "var(--accent)" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.amount) > 0;
  const streamColors = [
    { value: "var(--accent)", label: "Blue" }, { value: "#d4a843", label: "Gold" },
    { value: "var(--green)", label: "Green" }, { value: "#38bdf8", label: "Sky" },
    { value: "var(--amber)", label: "Amber" }, { value: "#f472b6", label: "Pink" },
  ];

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Add Income Stream</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Wife's Pay" style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Amount per check</FieldLabel><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Start Date</FieldLabel><input type="date" value={form.anchorDate} onChange={(e) => update("anchorDate", e.target.value)} style={INPUT_STYLE} /></div>
        </div>
        <div>
          <FieldLabel>Frequency</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["semimonthly", "1st & 15th"], ["biweekly", "Biweekly"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([key, label]) => {
              const active = form.frequency === key;
              return (
                <button key={key} onClick={() => update("frequency", key)}
                  style={{
                    padding: "7px 14px", borderRadius: 8,
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent)" + "22" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>{label}</button>
              );
            })}
          </div>
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {streamColors.map((c) => (
              <button key={c.value} onClick={() => update("color", c.value)}
                style={{ width: 28, height: 28, borderRadius: 999, background: c.value, border: `3px solid ${form.color === c.value ? "var(--text-primary)" : "transparent"}`, cursor: "pointer" }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onAdd({ id: nextId(), name: form.name.trim(), amount: parseFloat(form.amount), frequency: form.frequency, anchorDate: form.anchorDate, color: form.color }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Add Stream
        </button>
      </div>
    </>
  );
}

function AddCustomItemForm({ type, paycheckKey, onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", amount: "" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.amount) > 0;
  const isIncome = type === "income";

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{isIncome ? "Add Extra Income" : "Add Expense"}</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Description</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder={isIncome ? "e.g. Freelance gig" : "e.g. New tires"} style={INPUT_STYLE} /></div>
        <div><FieldLabel>Amount</FieldLabel><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onAdd(paycheckKey, { name: form.name.trim(), amount: parseFloat(form.amount), type }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? (isIncome ? "var(--green)" : "var(--accent)") : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {isIncome ? "Add Income" : "Add Expense"}
        </button>
      </div>
    </>
  );
}

function AddSavingsContributionForm({ savingsGoals, paycheckKey, onAdd, onClose }) {
  const [goalId, setGoalId] = useState(savingsGoals[0]?.id || "");
  const [amount, setAmount] = useState("");
  const canSubmit = goalId && parseFloat(amount) > 0;
  const selectedGoal = savingsGoals.find((g) => g.id === Number(goalId) || g.id === goalId);
  const remaining = selectedGoal ? selectedGoal.target - selectedGoal.current : 0;
  const quickAmounts = [25, 50, 100, 250].filter((a) => a <= remaining + 10);

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Add Savings Contribution</h3>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>This will update your savings goal progress too</p>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Savings Goal</FieldLabel>
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
            {savingsGoals.map((g) => (
              <option key={g.id} value={g.id}>{g.icon} {g.name} — {fmt(g.current)} of {fmt(g.target)}</option>
            ))}
          </select>
        </div>
        {selectedGoal && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <ProgressBar value={selectedGoal.current} max={selectedGoal.target} color={selectedGoal.color || "var(--accent)"} height={5} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <span>{fmt(selectedGoal.current)} saved</span>
              <span>{fmt(remaining)} to go</span>
            </div>
          </div>
        )}
        <div>
          <FieldLabel>Amount</FieldLabel>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
        </div>
        {quickAmounts.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {quickAmounts.map((qa) => (
              <button key={qa} onClick={() => setAmount(String(qa))}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)", background: parseFloat(amount) === qa ? "var(--accent)" : "transparent",
                  color: parseFloat(amount) === qa ? "#fff" : "var(--text-secondary)", transition: "all 0.15s",
                }}>
                ${qa}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onAdd(paycheckKey, Number(goalId) || goalId, parseFloat(amount)); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Add Contribution
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// INCOME PAGE
// ─────────────────────────────────────────────

const INCOME_CATEGORIES = {
  employment: { label: "Employment", color: "var(--accent)" },
  freelance: { label: "Freelance", color: "var(--amber)" },
  investment: { label: "Investment", color: "var(--green)" },
  rental: { label: "Rental", color: "#d4a843" },
  gift: { label: "Gift / Other", color: "#f472b6" },
};

function IncomePage({ income, setIncome, showUndo }) {
  const [modal, setModal] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const totalMonthly = income.filter((i) => i.recurring).reduce((s, i) => {
    switch (i.frequency) {
      case "weekly": return s + i.amount * 52 / 12;
      case "biweekly": return s + i.amount * 26 / 12;
      case "semimonthly": return s + i.amount * 2;
      case "monthly": return s + i.amount;
      case "quarterly": return s + i.amount / 3;
      case "yearly": return s + i.amount / 12;
      default: return s + i.amount;
    }
  }, 0);
  const totalYearly = totalMonthly * 12;
  const recurringCount = income.filter((i) => i.recurring).length;
  const oneTimeTotal = income.filter((i) => !i.recurring).reduce((s, i) => s + i.amount, 0);

  const monthlyEquiv = (inc) => {
    if (!inc.recurring) return null;
    switch (inc.frequency) {
      case "weekly": return inc.amount * 52 / 12;
      case "biweekly": return inc.amount * 26 / 12;
      case "semimonthly": return inc.amount * 2;
      case "monthly": return inc.amount;
      case "quarterly": return inc.amount / 3;
      case "yearly": return inc.amount / 12;
      default: return inc.amount;
    }
  };

  const grouped = {};
  income.forEach((i) => {
    const cat = i.category || "gift";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(i);
  });

  const deleteIncome = (id) => { const inc = income.find((i) => i.id === id); if (showUndo && inc) showUndo(`Deleted "${inc.source}"`); setIncome((prev) => prev.filter((i) => i.id !== id)); setConfirmingDelete(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Income</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Track all household income sources</p>
        </div>
        <button onClick={() => setModal("add")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Income</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Monthly Income" value={fmt(totalMonthly)} sub={`${recurringCount} recurring sources`} accent="var(--green)" />
        <MetricBox label="Annual Income" value={fmtCompact(totalYearly)} sub="projected yearly" />
        <MetricBox label="One-Time Income" value={fmt(oneTimeTotal)} sub={`${income.filter((i) => !i.recurring).length} entries`} accent="var(--amber)" />
        <MetricBox label="Total Sources" value={income.length} sub={`${Object.keys(grouped).length} categories`} />
      </div>

      {/* Income breakdown bar */}
      {totalMonthly > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader title="Monthly Income Breakdown" />
          <div style={{ padding: "0 20px 16px" }}>
            {/* Stacked bar */}
            <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
              {income.filter((i) => i.recurring).map((inc, idx) => {
                const mo = monthlyEquiv(inc) || 0;
                const pctWidth = (mo / totalMonthly) * 100;
                const colors = ["var(--green)", "var(--accent)", "var(--amber)", "#38bdf8", "#f472b6", "#fb923c"];
                return (
                  <div key={inc.id} style={{
                    width: `${pctWidth}%`, background: colors[idx % colors.length],
                    transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
                  }} />
                );
              })}
            </div>
            {/* Legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {income.filter((i) => i.recurring).map((inc, idx) => {
                const mo = monthlyEquiv(inc) || 0;
                const share = totalMonthly > 0 ? (mo / totalMonthly * 100).toFixed(0) : 0;
                const colors = ["var(--green)", "var(--accent)", "var(--amber)", "#38bdf8", "#f472b6", "#fb923c"];
                return (
                  <div key={inc.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[idx % colors.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{inc.source}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(mo)}/mo</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 32, textAlign: "right" }}>{share}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {Object.entries(INCOME_CATEGORIES).filter(([key]) => grouped[key]).map(([catKey, catInfo]) => (
        <div key={catKey} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 4px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: catInfo.color, background: catInfo.color + "18", padding: "2px 7px", borderRadius: 4 }}>{catInfo.label}</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{grouped[catKey].length} source{grouped[catKey].length !== 1 ? "s" : ""}</span>
          </div>
          <Card>
            {grouped[catKey].map((inc, idx) => (
              <SwipeToDelete key={inc.id} onDelete={() => deleteIncome(inc.id)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: idx < grouped[catKey].length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{inc.icon || "💰"}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{inc.source}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 10 }}>
                        {inc.recurring && <FrequencyBadge frequency={inc.frequency} />}
                        {!inc.recurring && <span>One-time · {new Date(inc.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>+{fmt(inc.amount)}</div>
                      {monthlyEquiv(inc) !== null && inc.frequency !== "monthly" && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, fontVariantNumeric: "tabular-nums" }}>
                          {fmt(monthlyEquiv(inc))}/mo
                        </div>
                      )}
                    </div>
                    <button onClick={() => setModal({ type: "edit", income: inc })} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                </div>
              </SwipeToDelete>
            ))}
          </Card>
        </div>
      ))}

      {income.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No income sources yet</div>
          <button onClick={() => setModal("add")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Your First Income</button>
        </Card>
      )}

      {modal === "add" && (
        <Overlay onClose={() => setModal(null)}>
          <IncomeForm onSave={(inc) => { setIncome((p) => [...p, { ...inc, id: nextId() }]); setModal(null); }} onClose={() => setModal(null)} title="Add Income Source" />
        </Overlay>
      )}
      {modal?.type === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <IncomeForm existing={modal.income} onSave={(updated) => { setIncome((p) => p.map((i) => i.id === updated.id ? updated : i)); setModal(null); }} onClose={() => setModal(null)} title="Edit Income Source" />
        </Overlay>
      )}
    </div>
  );
}

function IncomeForm({ existing, onSave, onClose, title }) {
  const [form, setForm] = useState(existing ? {
    source: existing.source, amount: String(existing.amount), date: existing.date,
    recurring: existing.recurring, frequency: existing.frequency || "monthly",
    category: existing.category || "employment", icon: existing.icon || "💰",
  } : {
    source: "", amount: "", date: new Date().toISOString().split("T")[0],
    recurring: true, frequency: "monthly", category: "employment", icon: "💼",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.source.trim() && parseFloat(form.amount) > 0;
  const icons = ["💼", "🎨", "📈", "🏠", "🎁", "💰", "🛒", "📱"];

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3></div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Source Name</FieldLabel><input value={form.source} onChange={(e) => update("source", e.target.value)} placeholder="e.g. My Salary" style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Amount</FieldLabel><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Date</FieldLabel><input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Category</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(INCOME_CATEGORIES).map(([key, info]) => {
              const active = form.category === key;
              return (<button key={key} onClick={() => update("category", key)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${active ? info.color : "var(--border)"}`, background: active ? info.color + "22" : "transparent", color: active ? info.color : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{info.label}</button>);
            })}
          </div>
        </div>
        <div><FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {icons.map((ic) => (<button key={ic} onClick={() => update("icon", ic)} style={{ width: 36, height: 36, borderRadius: 8, fontSize: 16, border: `2px solid ${form.icon === ic ? "var(--accent)" : "var(--border)"}`, background: form.icon === ic ? "var(--accent)22" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>))}
          </div>
        </div>
        <div onClick={() => update("recurring", !form.recurring)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }}>
          <div style={{ width: 40, height: 22, borderRadius: 11, padding: 2, background: form.recurring ? "var(--accent)" : "var(--track)", transition: "background 0.2s", display: "flex", alignItems: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "transform 0.2s", transform: form.recurring ? "translateX(18px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
          <div><div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Recurring</div></div>
        </div>
        {form.recurring && (
          <div><FieldLabel>Frequency</FieldLabel>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => {
                const active = form.frequency === key;
                return (<button key={key} onClick={() => update("frequency", key)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, background: active ? "var(--accent)22" : "transparent", color: active ? "var(--accent)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{label}</button>);
              })}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onSave({ ...(existing || {}), source: form.source.trim(), amount: parseFloat(form.amount), date: form.date, recurring: form.recurring, frequency: form.recurring ? form.frequency : null, category: form.category, icon: form.icon }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {existing ? "Save Changes" : "Add Income"}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// DEBT PAGE
// ─────────────────────────────────────────────

function DebtPage({ debts, setDebts, showUndo }) {
  const [modal, setModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const [reordering, setReordering] = useState(false);

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalOriginal = debts.reduce((s, d) => s + (d.originalBalance || d.balance), 0);
  const totalPaidOff = totalOriginal - totalDebt;
  const totalMinPayments = debts.reduce((s, d) => s + d.minPayment, 0);
  const avgApr = debts.length > 0 ? debts.reduce((s, d) => s + d.apr * d.balance, 0) / totalDebt : 0;

  // Sort by APR descending (avalanche method recommendation)
  const sortedDebts = [...debts].sort((a, b) => b.apr - a.apr);

  const addPayment = (debtId, amount) => {
    setDebts((prev) => prev.map((d) => d.id === debtId ? {
      ...d, balance: Math.max(d.balance - amount, 0),
      payments: [...(d.payments || []), { date: new Date().toISOString().split("T")[0], amount }],
    } : d));
    setModal(null);
  };

  const deleteDebt = (id) => { const debt = debts.find((d) => d.id === id); if (showUndo && debt) showUndo(`Deleted "${debt.name}"`); setDebts((prev) => prev.filter((d) => d.id !== id)); setConfirmingDelete(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Debt Payoff</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Track and crush your debt</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {debts.length > 1 && (
            <button onClick={() => { setReordering((v) => !v); setExpandedId(null); }} style={{
              padding: "10px 14px", borderRadius: 10, border: `1px solid ${reordering ? "var(--accent)" : "var(--border)"}`,
              background: reordering ? "var(--accent)18" : "transparent", color: reordering ? "var(--accent)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>⠿ Reorder</button>
          )}
          <button onClick={() => setModal("add")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Debt</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Total Owed" value={fmtCompact(totalDebt)} sub={`${debts.length} accounts`} accent="var(--red)" />
        <MetricBox label="Total Paid Off" value={fmtCompact(totalPaidOff)} sub={`${pct(totalPaidOff, totalOriginal).toFixed(0)}% of original`} accent="var(--green)" />
        <MetricBox label="Monthly Minimum" value={fmt(totalMinPayments)} sub="combined minimums" accent="var(--amber)" />
        <MetricBox label="Avg APR" value={`${avgApr.toFixed(1)}%`} sub="weighted by balance" />
      </div>

      {/* Overall progress */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Overall Progress</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{pct(totalPaidOff, totalOriginal).toFixed(0)}% paid off</span>
          </div>
          <ProgressBar value={totalPaidOff} max={totalOriginal} color="var(--green)" height={12} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalPaidOff)} paid</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalOriginal)} original</span>
          </div>
        </div>
      </Card>

      {/* Debt cards */}
      {reordering && (
        <DraggableSimpleList
          items={debts}
          onReorder={setDebts}
          renderItem={(d) => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: d.balance <= 0 ? "var(--green-bg)" : "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{d.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{d.apr}% APR · {fmt(d.minPayment)}/mo</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(d.balance)}</span>
            </div>
          )}
        />
      )}
      <div style={{ display: reordering ? "none" : "flex", flexDirection: "column", gap: 14 }}>
        {sortedDebts.map((debt) => {
          const paidOff = (debt.originalBalance || debt.balance) - debt.balance;
          const progress = pct(paidOff, debt.originalBalance || debt.balance);
          const isExpanded = expandedId === debt.id;
          const monthlyInterest = (debt.apr / 100 / 12) * debt.balance;
          const monthsToPayoff = debt.minPayment > monthlyInterest ? Math.ceil(debt.balance / (debt.minPayment - monthlyInterest)) : null;
          const isPaidOff = debt.balance <= 0;

          return (
            <SwipeToDelete key={debt.id} onDelete={() => deleteDebt(debt.id)}>
              <Card>
                <div style={{ padding: "20px", cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : debt.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: isPaidOff ? "var(--green-bg)" : "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{debt.icon}</div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{debt.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12 }}>
                        <span>{debt.lender || "Unknown lender"}</span>
                        <span>{debt.apr}% APR</span>
                        <span>{fmt(debt.minPayment)}/mo min</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {isPaidOff ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 999, background: "var(--green-bg)", color: "var(--green)", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Paid Off
                      </span>
                    ) : (
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(debt.balance)}</div>
                        {monthsToPayoff && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>~{monthsToPayoff}mo at minimum</div>}
                      </div>
                    )}
                  </div>
                </div>

                <ProgressBar value={paidOff} max={debt.originalBalance || debt.balance} color={isPaidOff ? "var(--green)" : "var(--accent)"} height={8} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(paidOff)} paid off</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(monthlyInterest)}/mo interest
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ padding: "12px 20px", display: "flex", gap: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                    {!isPaidOff && (
                      <button onClick={(e) => { e.stopPropagation(); setModal({ type: "payment", debt }); }}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--green)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Make Payment</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setModal({ type: "edit", debt }); }}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                  </div>

                  {/* Payoff projection curve */}
                  {!isPaidOff && monthsToPayoff && monthsToPayoff <= 360 && (() => {
                    const monthlyRate = debt.apr / 100 / 12;
                    const projPoints = [];
                    let bal = debt.balance;
                    for (let m = 0; m <= monthsToPayoff && bal > 0; m++) {
                      projPoints.push(bal);
                      if (m < monthsToPayoff) {
                        bal = Math.max(bal * (1 + monthlyRate) - debt.minPayment, 0);
                      }
                    }
                    projPoints.push(0);
                    const pcW = 480, pcH = 90;
                    const pcPad = { top: 8, right: 12, bottom: 20, left: 52 };
                    const pcInW = pcW - pcPad.left - pcPad.right;
                    const pcInH = pcH - pcPad.top - pcPad.bottom;
                    const maxBal = projPoints[0];
                    const scX = (i) => pcPad.left + (i / (projPoints.length - 1)) * pcInW;
                    const scY = (v) => pcPad.top + pcInH - (v / maxBal) * pcInH;
                    const pts = projPoints.map((v, i) => `${i === 0 ? "M" : "L"}${scX(i)},${scY(v)}`).join(" ");
                    const area = `${pts} L${scX(projPoints.length - 1)},${scY(0)} L${scX(0)},${scY(0)} Z`;
                    const midIdx = Math.floor(projPoints.length / 2);
                    return (
                      <div style={{ padding: "12px 20px 4px" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>
                          Payoff Projection — minimum payments
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <svg viewBox={`0 0 ${pcW} ${pcH}`} style={{ width: "100%", maxHeight: 100 }} preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <linearGradient id={`dg${debt.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--red)" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="var(--red)" stopOpacity="0.01" />
                              </linearGradient>
                            </defs>
                            {/* Y ticks */}
                            {[0, 0.5, 1].map((f) => {
                              const v = maxBal * (1 - f);
                              const y = pcPad.top + pcInH * f;
                              return (
                                <g key={f}>
                                  <line x1={pcPad.left} y1={y} x2={pcW - pcPad.right} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                                  <text x={pcPad.left - 6} y={y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">
                                    {v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`}
                                  </text>
                                </g>
                              );
                            })}
                            {/* X labels: start, mid, end */}
                            {[[0, "Now"], [midIdx, `${Math.round(monthsToPayoff / 2)}mo`], [projPoints.length - 1, `${monthsToPayoff}mo`]].map(([i, label]) => (
                              <text key={label} x={scX(i)} y={pcH - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">{label}</text>
                            ))}
                            <path d={area} fill={`url(#dg${debt.id})`} />
                            <path d={pts} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx={scX(0)} cy={scY(projPoints[0])} r="3" fill="var(--red)" />
                            <circle cx={scX(projPoints.length - 1)} cy={scY(0)} r="3" fill="var(--green)" />
                          </svg>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ padding: "8px 20px 4px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Payment History</span>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {[...(debt.payments || [])].map((p, origIdx) => ({ p, origIdx })).reverse().map(({ p, origIdx }) => (
                      <div key={origIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{new Date(p.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>-{fmt(p.amount)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (showUndo) showUndo(`Removed ${fmt(p.amount)} payment from "${debt.name}"`);
                              setDebts((prev) => prev.map((d) => d.id === debt.id ? {
                                ...d,
                                balance: Math.min(d.balance + p.amount, d.originalBalance || d.balance + p.amount),
                                payments: d.payments.filter((_, idx) => idx !== origIdx),
                              } : d));
                            }}
                            style={{
                              background: "none", border: "1px solid var(--border)", borderRadius: 5,
                              width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                              color: "var(--text-muted)", cursor: "pointer", fontSize: 10,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                          >✕</button>
                        </div>
                      </div>
                    ))}
                    {(!debt.payments || debt.payments.length === 0) && (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No payments recorded</div>
                    )}
                  </div>
                </div>
              )}
            </Card>
            </SwipeToDelete>
          );
        })}
      </div>

      {debts.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No debts — you're debt free!</div>
        </Card>
      )}

      {modal === "add" && (
        <Overlay onClose={() => setModal(null)}>
          <DebtForm onSave={(d) => { setDebts((p) => [...p, { ...d, id: nextId(), payments: [] }]); setModal(null); }} onClose={() => setModal(null)} title="Add Debt" />
        </Overlay>
      )}
      {modal?.type === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <DebtForm existing={modal.debt} onSave={(updated) => { setDebts((p) => p.map((d) => d.id === updated.id ? updated : d)); setModal(null); }} onClose={() => setModal(null)} title="Edit Debt" />
        </Overlay>
      )}
      {modal?.type === "payment" && (
        <Overlay onClose={() => setModal(null)}>
          <DebtPaymentForm debt={modal.debt} onPay={addPayment} onClose={() => setModal(null)} />
        </Overlay>
      )}
    </div>
  );
}

function DebtForm({ existing, onSave, onClose, title }) {
  const [form, setForm] = useState(existing ? {
    name: existing.name, balance: String(existing.balance), originalBalance: String(existing.originalBalance || existing.balance),
    minPayment: String(existing.minPayment), apr: String(existing.apr), lender: existing.lender || "", icon: existing.icon || "💳",
  } : { name: "", balance: "", originalBalance: "", minPayment: "", apr: "", lender: "", icon: "💳" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.balance) >= 0 && parseFloat(form.minPayment) >= 0;
  const icons = ["🎓", "💳", "🚗", "🏠", "🏥", "📱", "🛍", "💰"];

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3></div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Debt Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Student Loans" style={INPUT_STYLE} /></div>
        <div><FieldLabel>Lender</FieldLabel><input value={form.lender} onChange={(e) => update("lender", e.target.value)} placeholder="e.g. Navient" style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Current Balance</FieldLabel><input type="number" step="0.01" min="0" value={form.balance} onChange={(e) => update("balance", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Original Balance</FieldLabel><input type="number" step="0.01" min="0" value={form.originalBalance} onChange={(e) => update("originalBalance", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Min Payment/mo</FieldLabel><input type="number" step="0.01" min="0" value={form.minPayment} onChange={(e) => update("minPayment", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>APR %</FieldLabel><input type="number" step="0.1" min="0" value={form.apr} onChange={(e) => update("apr", e.target.value)} placeholder="0.0" style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {icons.map((ic) => (<button key={ic} onClick={() => update("icon", ic)} style={{ width: 36, height: 36, borderRadius: 8, fontSize: 16, border: `2px solid ${form.icon === ic ? "var(--accent)" : "var(--border)"}`, background: form.icon === ic ? "var(--accent)22" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onSave({ ...(existing || {}), name: form.name.trim(), balance: parseFloat(form.balance), originalBalance: parseFloat(form.originalBalance) || parseFloat(form.balance), minPayment: parseFloat(form.minPayment), apr: parseFloat(form.apr) || 0, lender: form.lender.trim(), icon: form.icon }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {existing ? "Save Changes" : "Add Debt"}
        </button>
      </div>
    </>
  );
}

function DebtPaymentForm({ debt, onPay, onClose }) {
  const [amount, setAmount] = useState("");
  const valid = parseFloat(amount) > 0;
  const quickAmounts = [debt.minPayment, debt.minPayment * 2, Math.round(debt.balance / 2), debt.balance].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4);

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Payment — {debt.icon} {debt.name}</h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Balance: {fmt(debt.balance)} · Min: {fmt(debt.minPayment)}/mo</div>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Payment Amount</FieldLabel><input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...INPUT_STYLE, fontSize: 18, fontWeight: 600, padding: "14px 12px" }} /></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {quickAmounts.map((qa) => (
            <button key={qa} onClick={() => setAmount(String(qa))}
              style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${parseFloat(amount) === qa ? "var(--green)" : "var(--border)"}`, background: parseFloat(amount) === qa ? "var(--green-bg)" : "transparent", color: parseFloat(amount) === qa ? "var(--green)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {qa === debt.minPayment ? `${fmt(qa)} (min)` : qa === debt.balance ? `${fmt(qa)} (payoff)` : fmt(qa)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (valid) onPay(debt.id, parseFloat(amount)); }} disabled={!valid}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: valid ? "var(--green)" : "var(--border)", color: valid ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: valid ? "pointer" : "not-allowed" }}>
          Make Payment{valid ? ` · ${fmt(parseFloat(amount))}` : ""}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// NET WORTH PAGE
// ─────────────────────────────────────────────

const ASSET_CATEGORIES = {
  cash: { label: "Cash & Bank", color: "var(--green)", icon: "🏦" },
  retirement: { label: "Retirement", color: "var(--accent)", icon: "📊" },
  investment: { label: "Investments", color: "#38bdf8", icon: "💹" },
  property: { label: "Property", color: "var(--amber)", icon: "🏠" },
  crypto: { label: "Crypto", color: "#d4a843", icon: "₿" },
  other: { label: "Other", color: "var(--text-muted)", icon: "📦" },
};

function NetWorthPage({ assets, setAssets, debts, showUndo, networthHistory = [], setNetworthHistory }) {
  const [modal, setModal] = useState(null);
  const [justRecorded, setJustRecorded] = useState(false);

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalDebts = debts.reduce((s, d) => s + d.balance, 0);
  const netWorth = totalAssets - totalDebts;

  // Check if today is already recorded
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecorded = networthHistory.some((h) => h.date === todayStr);

  // Record a snapshot of today's net worth into history
  const recordSnapshot = () => {
    const entry = { date: todayStr, netWorth, assets: totalAssets, liabilities: totalDebts };
    if (todayRecorded) {
      setNetworthHistory((prev) => prev.map((h) => h.date === todayStr ? entry : h));
    } else {
      setNetworthHistory((prev) => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
    }
    setJustRecorded(true);
    setTimeout(() => setJustRecorded(false), 2500);
    if (showUndo) showUndo(`Net worth snapshot recorded — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
  };

  // Net worth history chart — multi-line SVG
  const historyWithToday = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const hasToday = networthHistory.some((h) => h.date === today);
    const base = hasToday
      ? networthHistory
      : [...networthHistory, { date: today, netWorth, assets: totalAssets, liabilities: totalDebts }];
    return base.sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
  }, [networthHistory, netWorth, totalAssets, totalDebts]);

  const nwChartW = 560;
  const nwChartH = 180;
  const nwPad = { top: 16, right: 20, bottom: 28, left: 64 };
  const nwInnerW = nwChartW - nwPad.left - nwPad.right;
  const nwInnerH = nwChartH - nwPad.top - nwPad.bottom;

  const nwVals = historyWithToday.map((h) => h.netWorth);
  const assetVals = historyWithToday.map((h) => h.assets);
  const liabVals = historyWithToday.map((h) => h.liabilities);
  const allVals = [...nwVals, ...assetVals, ...liabVals];
  const nwMax = Math.max(...allVals, 1);
  const nwMin = Math.min(...allVals, 0);
  const nwRange = nwMax - nwMin || 1;

  const nwScaleX = (i) => nwPad.left + (i / Math.max(historyWithToday.length - 1, 1)) * nwInnerW;
  const nwScaleY = (v) => nwPad.top + nwInnerH - ((v - nwMin) / nwRange) * nwInnerH;

  const buildPath = (vals) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${nwScaleX(i)},${nwScaleY(v)}`).join(" ");
  const nwPath = buildPath(nwVals);
  const assetPath = buildPath(assetVals);
  const liabPath = buildPath(liabVals);

  // Zero line
  const zeroY = nwMin < 0 ? nwScaleY(0) : null;

  const nwYTicks = [0, 1, 2, 3].map((i) => {
    const v = nwMin + (nwRange * i) / 3;
    return { v, y: nwScaleY(v) };
  });

  // Group assets by category
  const groupedAssets = {};
  assets.forEach((a) => {
    const cat = a.category || "other";
    if (!groupedAssets[cat]) groupedAssets[cat] = [];
    groupedAssets[cat].push(a);
  });

  const assetCatTotals = Object.entries(ASSET_CATEGORIES).map(([key, info]) => ({
    key, ...info, total: (groupedAssets[key] || []).reduce((s, a) => s + a.value, 0), count: (groupedAssets[key] || []).length,
  })).filter((c) => c.total > 0);

  const deleteAsset = (id) => { const asset = assets.find((a) => a.id === id); if (showUndo && asset) showUndo(`Deleted "${asset.name}"`); setAssets((prev) => prev.filter((a) => a.id !== id)); };
  const updateAsset = (updated) => { setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a)); setModal(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Net Worth</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Assets minus liabilities</p>
        </div>
        <button onClick={() => setModal("add")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Asset</button>
      </div>

      {/* Big net worth display */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: "28px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>Net Worth</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: netWorth >= 0 ? "var(--green)" : "var(--red)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                {netWorth < 0 && "-"}{fmt(Math.abs(netWorth))}
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 32 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 2 }}>Total Assets</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalAssets)}</div>
                </div>
                <div style={{ width: 1, background: "var(--border)" }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 2 }}>Total Liabilities</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalDebts)}</div>
                </div>
              </div>
            </div>

            {/* Donut chart — assets vs liabilities */}
            {(() => {
              const total = totalAssets + totalDebts;
              const assetPct = total > 0 ? totalAssets / total : 0;
              const r = 44;
              const cx = 60;
              const cy = 60;
              const circ = 2 * Math.PI * r;
              const assetArc = circ * assetPct;
              const liabArc = circ * (1 - assetPct);
              // Asset segments by category
              const catArcs = assetCatTotals.map((cat) => ({
                ...cat,
                arc: total > 0 ? circ * (cat.total / total) : 0,
              }));
              let offset = 0;
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <svg width={120} height={120} viewBox="0 0 120 120">
                    {/* Background ring */}
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--track)" strokeWidth={14} />
                    {/* Liabilities arc (red base) */}
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--red)" strokeWidth={14}
                      strokeDasharray={`${liabArc} ${circ}`}
                      strokeDashoffset={-(circ * assetPct)}
                      strokeLinecap="round"
                      style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
                    {/* Asset category arcs */}
                    {catArcs.map((cat) => {
                      const dash = cat.arc;
                      const off = -offset;
                      offset += cat.arc;
                      return (
                        <circle key={cat.key} cx={cx} cy={cy} r={r} fill="none"
                          stroke={cat.color} strokeWidth={14}
                          strokeDasharray={`${dash} ${circ}`}
                          strokeDashoffset={off}
                          style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
                      );
                    })}
                    {/* Center label */}
                    <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="700" fontFamily="DM Sans, sans-serif">
                      {total > 0 ? `${(assetPct * 100).toFixed(0)}%` : "—"}
                    </text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">assets</text>
                  </svg>
                  <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--text-muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />Assets</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)", display: "inline-block" }} />Debt</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={{ marginTop: 20, maxWidth: 400, margin: "20px auto 0" }}>
            <div style={{ position: "relative", height: 14, borderRadius: 7, background: "var(--red)", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${totalAssets > 0 ? Math.min((totalAssets / (totalAssets + totalDebts)) * 100, 100) : 0}%`, background: "var(--green)", borderRadius: 7, transition: "width 0.6s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />Assets</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)" }} />Liabilities</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Net worth history chart */}
      {historyWithToday.length >= 2 && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader
            title="Net Worth History"
            action={
              <button onClick={recordSnapshot}
                style={{
                  padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${justRecorded ? "var(--green)" : todayRecorded ? "var(--accent)" : "var(--border)"}`,
                  background: justRecorded ? "var(--green-bg)" : todayRecorded ? "var(--accent)18" : "transparent",
                  color: justRecorded ? "var(--green)" : todayRecorded ? "var(--accent)" : "var(--text-muted)",
                  transition: "all 0.3s",
                }}>
                {justRecorded ? "✓ Recorded!" : todayRecorded ? "Update Today" : "Record Today"}
              </button>
            }
          />
          <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
            <svg viewBox={`0 0 ${nwChartW} ${nwChartH}`} style={{ width: "100%", maxHeight: 200 }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--green)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--green)" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              {/* Grid lines + Y labels */}
              {nwYTicks.map((t, i) => (
                <g key={i}>
                  <line x1={nwPad.left} y1={t.y} x2={nwChartW - nwPad.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" />
                  <text x={nwPad.left - 8} y={t.y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans, sans-serif">
                    {t.v >= 1000 ? `$${(t.v / 1000).toFixed(0)}k` : t.v < 0 ? `-$${Math.abs(Math.round(t.v / 1000))}k` : `$${Math.round(t.v)}`}
                  </text>
                </g>
              ))}
              {/* Zero line if chart goes negative */}
              {zeroY && <line x1={nwPad.left} y1={zeroY} x2={nwChartW - nwPad.right} y2={zeroY} stroke="var(--red)" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />}
              {/* X date labels */}
              {historyWithToday.map((h, i) => {
                if (i % Math.max(Math.floor(historyWithToday.length / 5), 1) !== 0 && i !== historyWithToday.length - 1) return null;
                const d = new Date(h.date + "T00:00:00");
                return (
                  <text key={i} x={nwScaleX(i)} y={nwChartH - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans, sans-serif">
                    {d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                  </text>
                );
              })}
              {/* Assets line (faint) */}
              <path d={assetPath} fill="none" stroke="var(--green)" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.45" strokeLinecap="round" strokeLinejoin="round" />
              {/* Liabilities line (faint) */}
              <path d={liabPath} fill="none" stroke="var(--red)" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.45" strokeLinecap="round" strokeLinejoin="round" />
              {/* Net worth area fill */}
              <path d={`${nwPath} L${nwScaleX(historyWithToday.length - 1)},${nwScaleY(nwMin)} L${nwScaleX(0)},${nwScaleY(nwMin)} Z`} fill="url(#nwGrad)" />
              {/* Net worth line */}
              <path d={nwPath} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Data point dots */}
              {historyWithToday.map((h, i) => (
                <circle key={i} cx={nwScaleX(i)} cy={nwScaleY(h.netWorth)} r={i === historyWithToday.length - 1 ? 4.5 : 3}
                  fill={i === historyWithToday.length - 1 ? "var(--green)" : "var(--card)"}
                  stroke="var(--green)" strokeWidth="2" />
              ))}
            </svg>
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4 }}>
              {[
                { color: "var(--green)", label: "Net Worth", solid: true },
                { color: "var(--green)", label: "Assets", solid: false },
                { color: "var(--red)", label: "Liabilities", solid: false },
              ].map((l) => (
                <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-muted)" }}>
                  <svg width="20" height="6">
                    <line x1="0" y1="3" x2="20" y2="3" stroke={l.color} strokeWidth={l.solid ? 2.5 : 1.5} strokeDasharray={l.solid ? "0" : "4,3"} opacity={l.solid ? 1 : 0.6} />
                  </svg>
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}
      {historyWithToday.length < 2 && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader title="Net Worth History" action={
            <button onClick={recordSnapshot} style={{
              padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${justRecorded ? "var(--green)" : "var(--border)"}`,
              background: justRecorded ? "var(--green-bg)" : "transparent",
              color: justRecorded ? "var(--green)" : "var(--text-muted)",
              transition: "all 0.3s",
            }}>{justRecorded ? "✓ Recorded!" : "Record Today"}</button>
          } />
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Hit <strong style={{ color: "var(--text-primary)" }}>Record Today</strong> each month to build your net worth history chart.
          </div>
        </Card>
      )}

      {/* Net Worth Milestones */}
      {(() => {
        const milestones = [
          { value: 0, label: "Break Even", icon: "🏁", desc: "Net worth hits zero" },
          { value: 1000, label: "$1K", icon: "🌱", desc: "First thousand" },
          { value: 5000, label: "$5K", icon: "💵", desc: "Five thousand" },
          { value: 10000, label: "$10K", icon: "🔟", desc: "Five figures" },
          { value: 25000, label: "$25K", icon: "📈", desc: "Quarter way to six figures" },
          { value: 50000, label: "$50K", icon: "🥈", desc: "Halfway to six figures" },
          { value: 100000, label: "$100K", icon: "💯", desc: "Six figures" },
          { value: 250000, label: "$250K", icon: "🏆", desc: "Quarter million" },
          { value: 500000, label: "$500K", icon: "🦅", desc: "Half million" },
          { value: 1000000, label: "$1M", icon: "💎", desc: "Millionaire" },
        ];
        const achieved = milestones.filter((m) => netWorth >= m.value);
        const next = milestones.find((m) => netWorth < m.value);
        const latest = achieved[achieved.length - 1];
        if (!latest && !next) return null;
        return (
          <Card style={{ marginBottom: 24 }}>
            <CardHeader title="Milestones" />
            <div style={{ padding: "0 20px 16px" }}>
              {latest && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--green-bg, var(--surface))", border: "1px solid var(--green)44", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{latest.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--green)" }}>✓ {latest.label} — {latest.desc}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>Most recent milestone achieved</div>
                  </div>
                </div>
              )}
              {next && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24, opacity: 0.4 }}>{next.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>Next: {next.label} — {next.desc}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                      {fmt(next.value - netWorth)} to go · {next.value > 0 ? `${((netWorth / next.value) * 100).toFixed(0)}% there` : ""}
                    </div>
                    <ProgressBar value={Math.max(netWorth, 0)} max={next.value} height={5} />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {milestones.map((m) => (
                  <div key={m.value} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, border: `1px solid ${netWorth >= m.value ? "var(--green)44" : "var(--border)"}`, background: netWorth >= m.value ? "var(--green)18" : "transparent", color: netWorth >= m.value ? "var(--green)" : "var(--text-muted)", fontWeight: 600 }}>
                    {netWorth >= m.value ? "✓ " : ""}{m.label}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Asset breakdown by category */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {assetCatTotals.map((cat) => (
          <MetricBox key={cat.key} label={cat.label} value={fmtCompact(cat.total)} sub={`${cat.count} account${cat.count !== 1 ? "s" : ""}`} accent={cat.color} />
        ))}
      </div>

      {/* Assets list */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 4px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--green)" }}>Assets</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{fmt(totalAssets)}</span>
        </div>
        {Object.entries(ASSET_CATEGORIES).filter(([key]) => groupedAssets[key]).map(([catKey, catInfo]) => (
          <div key={catKey} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "0 4px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: catInfo.color, background: catInfo.color + "18", padding: "2px 7px", borderRadius: 4 }}>{catInfo.label}</span>
            </div>
            <Card>
              {groupedAssets[catKey].map((asset, idx) => (
                <SwipeToDelete key={asset.id} onDelete={() => deleteAsset(asset.id)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: idx < groupedAssets[catKey].length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{asset.icon}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{asset.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt(asset.value)}</span>
                      <button onClick={() => setModal({ type: "edit", asset })} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  </div>
                </SwipeToDelete>
              ))}
            </Card>
          </div>
        ))}
      </div>

      {/* Liabilities list */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 4px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--red)" }}>Liabilities</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{fmt(totalDebts)}</span>
        </div>
        <Card>
          {debts.map((debt, idx) => (
            <div key={debt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: idx < debts.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>{debt.icon}</span>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{debt.name}</span>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{debt.lender || ""} · {debt.apr}% APR</div>
                </div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(debt.balance)}</span>
            </div>
          ))}
          {debts.length === 0 && <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No debts — debt free!</div>}
        </Card>
      </div>

      {/* Modals */}
      {modal === "add" && (
        <Overlay onClose={() => setModal(null)}>
          <AssetForm onSave={(a) => { setAssets((p) => [...p, { ...a, id: nextId() }]); setModal(null); }} onClose={() => setModal(null)} title="Add Asset" />
        </Overlay>
      )}
      {modal?.type === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <AssetForm existing={modal.asset} onSave={updateAsset} onClose={() => setModal(null)} title="Edit Asset" />
        </Overlay>
      )}
    </div>
  );
}

function AssetForm({ existing, onSave, onClose, title }) {
  const [form, setForm] = useState(existing ? {
    name: existing.name, value: String(existing.value), category: existing.category || "cash", icon: existing.icon || "💰",
  } : { name: "", value: "", category: "cash", icon: "🏦" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.value) >= 0;
  const icons = ["🏦", "💰", "📊", "📈", "💹", "🚗", "🏠", "🛋", "💎", "📱", "🎨", "📦"];

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3></div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Asset Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Checking Account" style={INPUT_STYLE} /></div>
        <div><FieldLabel>Current Value</FieldLabel><input type="number" step="0.01" min="0" value={form.value} onChange={(e) => update("value", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
        <div><FieldLabel>Category</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(ASSET_CATEGORIES).map(([key, info]) => {
              const active = form.category === key;
              return (<button key={key} onClick={() => update("category", key)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${active ? info.color : "var(--border)"}`, background: active ? info.color + "22" : "transparent", color: active ? info.color : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{info.label}</button>);
            })}
          </div>
        </div>
        <div><FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {icons.map((ic) => (<button key={ic} onClick={() => update("icon", ic)} style={{ width: 36, height: 36, borderRadius: 8, fontSize: 16, border: `2px solid ${form.icon === ic ? "var(--accent)" : "var(--border)"}`, background: form.icon === ic ? "var(--accent)22" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onSave({ ...(existing || {}), name: form.name.trim(), value: parseFloat(form.value), category: form.category, icon: form.icon }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {existing ? "Save Changes" : "Add Asset"}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// DEBT STRATEGY PAGE (Baby Step 2)
// ─────────────────────────────────────────────

function simulatePayoff(debts, extraMonthly, method) {
  if (debts.length === 0 || debts.every((d) => d.balance <= 0)) return { months: 0, totalInterest: 0, timeline: [], order: [] };

  // Sort: snowball = smallest balance first, avalanche = highest APR first
  const sorted = [...debts].filter((d) => d.balance > 0).sort((a, b) =>
    method === "snowball" ? a.balance - b.balance : b.apr - a.apr
  );

  const order = sorted.map((d) => d.id);
  const balances = {};
  sorted.forEach((d) => { balances[d.id] = d.balance; });
  const mins = {};
  sorted.forEach((d) => { mins[d.id] = d.minPayment; });
  const aprs = {};
  sorted.forEach((d) => { aprs[d.id] = d.apr; });

  const timeline = [];
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600; // safety cap

  while (Object.values(balances).some((b) => b > 0) && months < maxMonths) {
    months++;
    const monthData = { month: months, payments: {}, interest: {}, balances: {}, paidOff: [] };

    // Apply interest
    let monthInterest = 0;
    sorted.forEach((d) => {
      if (balances[d.id] > 0) {
        const interest = (aprs[d.id] / 100 / 12) * balances[d.id];
        balances[d.id] += interest;
        monthData.interest[d.id] = interest;
        monthInterest += interest;
      }
    });
    totalInterest += monthInterest;

    // Pay minimums on all active debts
    let availableExtra = extraMonthly;
    sorted.forEach((d) => {
      if (balances[d.id] > 0) {
        const payment = Math.min(mins[d.id], balances[d.id]);
        balances[d.id] -= payment;
        monthData.payments[d.id] = payment;
        if (balances[d.id] <= 0.01) {
          // Freed up this minimum for the snowball
          availableExtra += mins[d.id];
          balances[d.id] = 0;
          monthData.paidOff.push(d.id);
        }
      }
    });

    // Apply snowball/avalanche extra to the target debt
    for (const d of sorted) {
      if (balances[d.id] > 0 && availableExtra > 0) {
        const extra = Math.min(availableExtra, balances[d.id]);
        balances[d.id] -= extra;
        monthData.payments[d.id] = (monthData.payments[d.id] || 0) + extra;
        availableExtra -= extra;
        if (balances[d.id] <= 0.01) {
          availableExtra += mins[d.id]; // freed minimum rolls into snowball
          balances[d.id] = 0;
          if (!monthData.paidOff.includes(d.id)) monthData.paidOff.push(d.id);
        }
        break; // snowball focuses on one at a time
      }
    }

    sorted.forEach((d) => { monthData.balances[d.id] = Math.max(balances[d.id], 0); });
    timeline.push(monthData);
  }

  return { months, totalInterest, timeline, order };
}

function DebtStrategyPage({ debts, income }) {
  const [extraPayment, setExtraPayment] = useState("200");
  const [method, setMethod] = useState("snowball");

  const activeDebts = debts.filter((d) => d.balance > 0);
  const totalDebt = activeDebts.reduce((s, d) => s + d.balance, 0);
  const totalMinimums = activeDebts.reduce((s, d) => s + d.minPayment, 0);
  const extra = parseFloat(extraPayment) || 0;

  const snowball = useMemo(() => simulatePayoff(activeDebts, extra, "snowball"), [activeDebts, extra]);
  const avalanche = useMemo(() => simulatePayoff(activeDebts, extra, "avalanche"), [activeDebts, extra]);

  const current = method === "snowball" ? snowball : avalanche;
  const other = method === "snowball" ? avalanche : snowball;
  const interestSaved = Math.abs(snowball.totalInterest - avalanche.totalInterest);
  const debtMap = {};
  debts.forEach((d) => { debtMap[d.id] = d; });

  // Build payoff order with months
  const payoffOrder = [];
  const paidSet = new Set();
  current.timeline.forEach((m) => {
    m.paidOff.forEach((id) => {
      if (!paidSet.has(id)) {
        paidSet.add(id);
        payoffOrder.push({ debt: debtMap[id], month: m.month });
      }
    });
  });

  const futureDate = (monthsAhead) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsAhead);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const monthlyIncome = income.reduce((s, i) => {
    if (!i.recurring) return s;
    switch (i.frequency) {
      case "weekly": return s + i.amount * 52 / 12;
      case "biweekly": return s + i.amount * 26 / 12;
      case "semimonthly": return s + i.amount * 2;
      case "monthly": return s + i.amount;
      case "quarterly": return s + i.amount / 3;
      case "yearly": return s + i.amount / 12;
      default: return s + i.amount;
    }
  }, 0);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Debt Snowball Strategy</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Dave Ramsey's Baby Step 2 — Pay off debt smallest to largest</p>
      </div>

      {activeDebts.length === 0 ? (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green)", marginBottom: 8 }}>You're Debt Free!</div>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Baby Step 2 complete — time to build that emergency fund</div>
        </Card>
      ) : (
        <>
          {/* Method toggle + extra payment */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Strategy</div>
              <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                {[["snowball", "Snowball", "Smallest balance first"], ["avalanche", "Avalanche", "Highest APR first"]].map(([key, label, sub]) => (
                  <button key={key} onClick={() => setMethod(key)}
                    style={{
                      flex: 1, padding: "12px 16px", border: "none", cursor: "pointer",
                      background: method === key ? "var(--accent)" : "transparent",
                      color: method === key ? "#fff" : "var(--text-muted)",
                      textAlign: "center", transition: "all 0.15s",
                    }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: "0 0 180px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Extra Monthly Payment</div>
              <input type="number" min="0" step="50" value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)}
                style={{ ...INPUT_STYLE, fontSize: 18, fontWeight: 700, textAlign: "center", padding: "10px 12px" }} />
            </div>
          </div>

          {/* Summary metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            <MetricBox label="Total Debt" value={fmt(totalDebt)} sub={`${activeDebts.length} accounts`} accent="var(--red)" />
            <MetricBox label="Monthly Payment" value={fmt(totalMinimums + extra)} sub={`${fmt(totalMinimums)} min + ${fmt(extra)} extra`} accent="var(--accent)" />
            <MetricBox label="Debt-Free Date" value={futureDate(current.months)} sub={`${current.months} months`} accent="var(--green)" />
            <MetricBox label="Total Interest" value={fmt(current.totalInterest)} sub={interestSaved > 1 ? `${method === "avalanche" ? "saves" : "costs"} ${fmt(interestSaved)} vs ${method === "snowball" ? "avalanche" : "snowball"}` : "same either way"} accent="var(--amber)" />
          </div>

          {/* Payoff order — the snowball visual */}
          <Card style={{ marginBottom: 20 }}>
            <CardHeader title={`${method === "snowball" ? "Snowball" : "Avalanche"} Payoff Order`} />
            <div style={{ padding: "0 20px 20px" }}>
              {payoffOrder.map((item, idx) => {
                const d = item.debt;
                const isLast = idx === payoffOrder.length - 1;
                const snowballSize = 20 + (idx * 12);

                return (
                  <div key={d.id} style={{ display: "flex", gap: 16, position: "relative" }}>
                    {/* Timeline line */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
                      <div style={{
                        width: Math.min(snowballSize, 40), height: Math.min(snowballSize, 40),
                        borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: Math.min(snowballSize * 0.45, 16), color: "#fff", fontWeight: 700, zIndex: 2,
                        border: "3px solid var(--card)",
                      }}>
                        {idx + 1}
                      </div>
                      {!isLast && <div style={{ width: 2, flex: 1, background: "var(--border)", marginTop: -2 }} />}
                    </div>

                    {/* Debt info */}
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{d.icon}</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{d.name}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {d.lender} · {d.apr}% APR · {fmt(d.minPayment)}/mo min
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(d.balance)}</div>
                          <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, marginTop: 1 }}>
                            Paid off in {item.month}mo — {futureDate(item.month)}
                          </div>
                        </div>
                      </div>
                      <ProgressBar value={item.month} max={current.months} color="var(--accent)" height={4} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Month-by-month breakdown */}
          <Card>
            <CardHeader title="Monthly Breakdown" action={
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Showing first 12 months</span>
            } />
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Month</th>
                    {current.order.map((id) => (
                      <th key={id} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        {debtMap[id]?.icon} {debtMap[id]?.name}
                      </th>
                    ))}
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {current.timeline.slice(0, 12).map((m) => {
                    const totalPayment = Object.values(m.payments).reduce((s, v) => s + v, 0);
                    const totalBalance = Object.values(m.balances).reduce((s, v) => s + v, 0);
                    return (
                      <tr key={m.month} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                          {futureDate(m.month)}
                        </td>
                        {current.order.map((id) => {
                          const bal = m.balances[id];
                          const pay = m.payments[id] || 0;
                          const justPaid = m.paidOff.includes(id);
                          return (
                            <td key={id} style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                              {bal <= 0 && pay === 0 ? (
                                <span style={{ color: "var(--green)", fontWeight: 600 }}>✓</span>
                              ) : (
                                <div>
                                  <div style={{ color: pay > 0 ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 500 }}>
                                    {pay > 0 && <span style={{ color: "var(--green)", fontSize: 11, marginRight: 4 }}>-{fmt(pay)}</span>}
                                  </div>
                                  <div style={{ color: justPaid ? "var(--green)" : "var(--text-muted)", fontWeight: justPaid ? 700 : 400, fontSize: 12 }}>
                                    {justPaid ? "PAID OFF" : fmt(bal)}
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: totalBalance <= 0 ? "var(--green)" : "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                          {totalBalance <= 0 ? "DEBT FREE" : fmt(totalBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {current.months > 12 && (
              <div style={{ padding: "12px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, borderTop: "1px solid var(--border-subtle)" }}>
                + {current.months - 12} more months until debt free in {futureDate(current.months)}
              </div>
            )}
          </Card>

          {/* Strategy comparison */}
          <div style={{ marginTop: 20 }}>
            <Card>
              <CardHeader title="Strategy Comparison" />
              <div style={{ padding: "0 20px 20px" }}>
                {[
                  { key: "snowball", label: "Snowball", sub: "Smallest balance first — quick wins build momentum", data: snowball, color: "var(--accent)" },
                  { key: "avalanche", label: "Avalanche", sub: "Highest interest first — mathematically optimal", data: avalanche, color: "var(--green)" },
                ].map((s) => (
                  <div key={s.key}
                    onClick={() => setMethod(s.key)}
                    style={{
                      padding: "16px", borderRadius: 12, marginBottom: 8, cursor: "pointer",
                      border: `2px solid ${method === s.key ? s.color : "var(--border)"}`,
                      background: method === s.key ? s.color + "0a" : "transparent",
                      transition: "all 0.2s",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          {method === s.key && (
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.sub}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{s.data.months} months</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(s.data.totalInterest)} interest</div>
                      </div>
                    </div>
                  </div>
                ))}
                {interestSaved > 1 && (
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--surface)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                    Avalanche saves <span style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(interestSaved)}</span> in interest vs Snowball.
                    {snowball.months <= avalanche.months && " Snowball pays off the same or faster with motivation from quick wins."}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Snowball vs Avalanche balance chart */}
          {snowball.months > 0 && avalanche.months > 0 && (() => {
            const maxMo = Math.max(snowball.months, avalanche.months);
            // Sample at most 48 points for performance
            const step = Math.max(1, Math.floor(maxMo / 48));
            const sbPoints = [];
            const avPoints = [];
            for (let m = 0; m <= maxMo; m += step) {
              const sbRow = snowball.timeline[Math.min(m, snowball.timeline.length - 1)];
              const avRow = avalanche.timeline[Math.min(m, avalanche.timeline.length - 1)];
              const sbBal = sbRow ? Object.values(sbRow.balances).reduce((s, v) => s + v, 0) : 0;
              const avBal = avRow ? Object.values(avRow.balances).reduce((s, v) => s + v, 0) : 0;
              sbPoints.push({ m, bal: m > snowball.months ? 0 : sbBal });
              avPoints.push({ m, bal: m > avalanche.months ? 0 : avBal });
            }
            if (sbPoints[sbPoints.length - 1]?.m < maxMo) {
              sbPoints.push({ m: maxMo, bal: 0 });
              avPoints.push({ m: maxMo, bal: 0 });
            }

            const scW = 560, scH = 160;
            const scPad = { top: 12, right: 16, bottom: 28, left: 60 };
            const scInW = scW - scPad.left - scPad.right;
            const scInH = scH - scPad.top - scPad.bottom;
            const maxBal = totalDebt;
            const scX = (m) => scPad.left + (m / maxMo) * scInW;
            const scY = (v) => scPad.top + scInH - (v / maxBal) * scInH;
            const buildLine = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${scX(p.m)},${scY(p.bal)}`).join(" ");
            const sbPath = buildLine(sbPoints);
            const avPath = buildLine(avPoints);
            const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: maxBal * f, y: scY(maxBal * f) }));
            const xTicks = [0, Math.floor(maxMo / 4), Math.floor(maxMo / 2), Math.floor(maxMo * 3 / 4), maxMo];

            return (
              <Card style={{ marginTop: 20 }}>
                <CardHeader title="Total Balance Over Time" />
                <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
                  <svg viewBox={`0 0 ${scW} ${scH}`} style={{ width: "100%", maxHeight: 180 }} preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="sbGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
                      </linearGradient>
                      <linearGradient id="avGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--green)" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="var(--green)" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>
                    {/* Grid */}
                    {yTicks.map((t, i) => (
                      <g key={i}>
                        <line x1={scPad.left} y1={t.y} x2={scW - scPad.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" />
                        <text x={scPad.left - 6} y={t.y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="8.5" fontFamily="DM Sans, sans-serif">
                          {t.v >= 1000 ? `$${(t.v / 1000).toFixed(0)}k` : `$${Math.round(t.v)}`}
                        </text>
                      </g>
                    ))}
                    {/* X axis ticks */}
                    {xTicks.map((m) => (
                      <text key={m} x={scX(m)} y={scH - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" fontFamily="DM Sans, sans-serif">
                        {m === 0 ? "Now" : `${m}mo`}
                      </text>
                    ))}
                    {/* Debt-free markers */}
                    <line x1={scX(snowball.months)} y1={scPad.top} x2={scX(snowball.months)} y2={scPad.top + scInH} stroke="var(--accent)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <line x1={scX(avalanche.months)} y1={scPad.top} x2={scX(avalanche.months)} y2={scPad.top + scInH} stroke="var(--green)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    {/* Snowball area + line */}
                    <path d={`${sbPath} L${scX(maxMo)},${scY(0)} L${scX(0)},${scY(0)} Z`} fill="url(#sbGrad)" />
                    <path d={sbPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Avalanche area + line */}
                    <path d={`${avPath} L${scX(maxMo)},${scY(0)} L${scX(0)},${scY(0)} Z`} fill="url(#avGrad)" />
                    <path d={avPath} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />
                    {/* Start dot */}
                    <circle cx={scX(0)} cy={scY(totalDebt)} r="4" fill="var(--text-primary)" />
                  </svg>
                  {/* Legend */}
                  <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                      <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="var(--accent)" strokeWidth="2.5" /></svg>
                      Snowball — debt free {futureDate(snowball.months)}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                      <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="var(--green)" strokeWidth="2" strokeDasharray="6,3" /></svg>
                      Avalanche — debt free {futureDate(avalanche.months)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Gazelle intensity quote */}
          <div style={{ marginTop: 20, padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🦌</div>
            <div style={{ fontSize: 15, fontStyle: "italic", color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}>
              "Gazelle intensity — live like no one else, so later you can live and give like no one else."
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Monthly payment of {fmt(totalMinimums + extra)} puts you debt-free by {futureDate(current.months)}</div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FINANCIAL ROADMAP (Dave Ramsey Baby Steps 1-7)
// ─────────────────────────────────────────────

const BABY_STEPS = [
  {
    step: 1,
    title: "Starter Emergency Fund",
    desc: "Save $1,000 as fast as you can. Sell stuff, pick up extra work, cut expenses. This is your buffer so a flat tire doesn't derail everything.",
    icon: "🛡",
    targetAmount: 1000,
  },
  {
    step: 2,
    title: "Pay Off All Debt",
    desc: "List every debt smallest to largest (the debt snowball). Attack the smallest first while paying minimums on the rest. Each payoff frees up money for the next.",
    icon: "⚡",
  },
  {
    step: 3,
    title: "Full Emergency Fund",
    desc: "Build 3-6 months of expenses in a savings account. This is your fully funded safety net — job loss, medical bills, major car repairs. Don't invest this.",
    icon: "🏦",
    monthsOfExpenses: [3, 6],
  },
  {
    step: 4,
    title: "Invest 15% for Retirement",
    desc: "Put 15% of your gross household income into retirement — 401(k), Roth IRA, or both. Start with enough to get the employer match, then max Roth, then go back to 401(k).",
    icon: "📈",
    targetPct: 15,
  },
  {
    step: 5,
    title: "Save for Kids' College",
    desc: "Open an Education Savings Account (ESA) or 529 plan. You're investing for their future, not taking on student loan debt for them.",
    icon: "🎓",
  },
  {
    step: 6,
    title: "Pay Off Your Home",
    desc: "Throw every extra dollar at your mortgage. A paid-off home is the foundation of building real wealth. You can do it faster than you think.",
    icon: "🏠",
  },
  {
    step: 7,
    title: "Build Wealth & Give",
    desc: "This is the fun part. Max out retirement, build wealth through mutual funds and real estate, and give generously. Live like no one else.",
    icon: "💎",
  },
];

function FinancialRoadmapPage({ savingsGoals, debts, income, transactions, assets, categories, onNavigate }) {
  // Compute data needed for each baby step

  // Monthly expenses estimate
  const monthlyExpenses = useMemo(() => {
    const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
    // Rough estimate: total from sample data is approx 1 month
    return totalSpent || 3500;
  }, [transactions]);

  // Monthly income
  const monthlyIncome = useMemo(() => {
    return income.reduce((s, i) => {
      if (!i.recurring) return s;
      switch (i.frequency) {
        case "weekly": return s + i.amount * 52 / 12;
        case "biweekly": return s + i.amount * 26 / 12;
        case "semimonthly": return s + i.amount * 2;
        case "monthly": return s + i.amount;
        case "quarterly": return s + i.amount / 3;
        case "yearly": return s + i.amount / 12;
        default: return s + i.amount;
      }
    }, 0);
  }, [income]);

  // Cash on hand (checking + savings)
  const cashBalance = assets.filter((a) => a.category === "cash").reduce((s, a) => s + a.value, 0);

  // Emergency fund goal (use existing savings goal if named "Emergency Fund")
  const emergencyGoal = savingsGoals.find((g) => g.name.toLowerCase().includes("emergency"));
  const emergencyFunded = emergencyGoal ? emergencyGoal.current : 0;

  // Active debts (non-mortgage)
  const activeDebts = debts.filter((d) => d.balance > 0);
  const totalDebt = activeDebts.reduce((s, d) => s + d.balance, 0);
  const totalOriginalDebt = activeDebts.reduce((s, d) => s + d.originalBalance, 0);
  const debtPaidOff = activeDebts.length === 0;

  // Retirement assets
  const retirementAssets = assets.filter((a) => a.category === "retirement").reduce((s, a) => s + a.value, 0);

  // Gross income estimate (assume net is ~75% of gross for retirement % calc)
  const grossMonthlyEstimate = monthlyIncome / 0.75;

  // Step status computation
  const stepStatuses = useMemo(() => {
    const statuses = [];

    // Step 1: $1,000 starter emergency fund
    const step1Progress = Math.min(cashBalance, 1000);
    const step1Complete = cashBalance >= 1000;
    statuses.push({
      ...BABY_STEPS[0],
      progress: step1Progress / 1000,
      complete: step1Complete,
      current: !step1Complete,
      detail: step1Complete
        ? `You have ${fmt(cashBalance)} in cash — starter fund covered`
        : `${fmt(step1Progress)} of $1,000 saved · ${fmt(1000 - step1Progress)} to go`,
    });

    // Step 2: Pay off all debt (snowball)
    const step2Complete = debtPaidOff;
    const step2Current = step1Complete && !step2Complete;
    const debtProgress = totalOriginalDebt > 0 ? (totalOriginalDebt - totalDebt) / totalOriginalDebt : 1;
    statuses.push({
      ...BABY_STEPS[1],
      progress: debtProgress,
      complete: step2Complete,
      current: step2Current,
      detail: step2Complete
        ? "All non-mortgage debt is paid off!"
        : `${fmt(totalDebt)} remaining across ${activeDebts.length} debt${activeDebts.length !== 1 ? "s" : ""} · ${(debtProgress * 100).toFixed(0)}% paid`,
      debts: activeDebts,
    });

    // Step 3: Full emergency fund (3-6 months of expenses)
    const targetMin = monthlyExpenses * 3;
    const targetMax = monthlyExpenses * 6;
    const efBalance = emergencyFunded || 0;
    const step3Complete = efBalance >= targetMin;
    const step3Current = step1Complete && step2Complete && !step3Complete;
    statuses.push({
      ...BABY_STEPS[2],
      progress: Math.min(efBalance / targetMin, 1),
      complete: step3Complete,
      current: step3Current,
      detail: step3Complete
        ? `Emergency fund at ${fmt(efBalance)} — ${(efBalance / monthlyExpenses).toFixed(1)} months covered`
        : `${fmt(efBalance)} of ${fmt(targetMin)}–${fmt(targetMax)} target (${(efBalance / monthlyExpenses).toFixed(1)} months)`,
      targetMin,
      targetMax,
    });

    // Step 4: Invest 15% for retirement
    const retirementPct = grossMonthlyEstimate > 0 ? (retirementAssets / (grossMonthlyEstimate * 12)) * 100 : 0;
    // This step is more about ongoing behavior than a completion threshold
    const step4Active = step1Complete && step2Complete && step3Complete;
    statuses.push({
      ...BABY_STEPS[3],
      progress: Math.min(retirementPct / 15, 1),
      complete: false, // ongoing
      current: step4Active,
      detail: step4Active
        ? `${fmt(retirementAssets)} in retirement accounts · target 15% of gross income (${fmt(grossMonthlyEstimate * 0.15)}/mo)`
        : `Not yet — complete Baby Steps 1-3 first`,
    });

    // Step 5: Save for kids' college
    const step5Active = step4Active;
    statuses.push({
      ...BABY_STEPS[4],
      progress: 0,
      complete: false,
      current: step5Active,
      detail: step5Active
        ? "Open a 529 plan or ESA and start contributing"
        : "Not yet — complete Baby Steps 1-4 first",
    });

    // Step 6: Pay off home
    const step6Active = step4Active;
    statuses.push({
      ...BABY_STEPS[5],
      progress: 0,
      complete: false,
      current: step6Active,
      detail: step6Active
        ? "Make extra mortgage payments to pay off your home early"
        : "Not yet — complete Baby Steps 1-4 first",
    });

    // Step 7: Build wealth & give
    const step7Active = step4Active;
    statuses.push({
      ...BABY_STEPS[6],
      progress: 0,
      complete: false,
      current: step7Active,
      detail: step7Active
        ? "Max out investments, build wealth, and give generously"
        : "Not yet — complete Baby Steps 1-6 first",
    });

    return statuses;
  }, [cashBalance, debtPaidOff, totalDebt, totalOriginalDebt, activeDebts, emergencyFunded, monthlyExpenses, retirementAssets, grossMonthlyEstimate]);

  // Current step (first incomplete)
  const currentStepNum = stepStatuses.find((s) => s.current)?.step || 1;
  const completedCount = stepStatuses.filter((s) => s.complete).length;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Financial Roadmap</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          Dave Ramsey's 7 Baby Steps — your path to financial peace
        </p>
      </div>

      {/* Progress overview */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Your Progress</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
                Baby Step {currentStepNum}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green)" }}>{completedCount}<span style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 500 }}>/7</span></div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>steps complete</div>
            </div>
          </div>
          {/* Step progress bar */}
          <div style={{ display: "flex", gap: 4 }}>
            {stepStatuses.map((s) => (
              <div key={s.step} style={{
                flex: 1, height: 8, borderRadius: 4,
                background: s.complete ? "var(--green)" : s.current ? "var(--accent)" : "var(--track)",
                transition: "background 0.3s",
                opacity: s.complete ? 1 : s.current ? 0.8 : 0.4,
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "var(--text-muted)" }}>
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
          </div>
        </div>
      </Card>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetricBox label="Cash on Hand" value={fmt(cashBalance)} sub="checking + savings" accent="var(--green)" />
        <MetricBox label="Total Debt" value={fmt(totalDebt)} sub={debtPaidOff ? "debt free!" : `${activeDebts.length} active`} accent={debtPaidOff ? "var(--green)" : "var(--red)"} />
        <MetricBox label="Emergency Fund" value={fmt(emergencyFunded)} sub={`${(emergencyFunded / Math.max(monthlyExpenses, 1)).toFixed(1)} months`} accent="var(--accent)" />
        <MetricBox label="Retirement" value={fmtCompact(retirementAssets)} sub="invested" accent="var(--text-secondary)" />
      </div>

      {/* Baby Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {stepStatuses.map((step) => {
          const isCurrent = step.current;
          const isComplete = step.complete;
          const isFuture = !isCurrent && !isComplete;
          const borderColor = isComplete ? "var(--green)" : isCurrent ? "var(--accent)" : "var(--border)";

          return (
            <Card key={step.step} style={{ borderColor, transition: "border-color 0.3s" }}>
              <div style={{ padding: "20px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {/* Step number circle */}
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: isComplete ? "var(--green)" : isCurrent ? "var(--accent)" : "var(--surface)",
                    border: `2px solid ${isComplete ? "var(--green)" : isCurrent ? "var(--accent)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.3s",
                  }}>
                    {isComplete ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <span style={{ fontSize: 18, fontWeight: 700, color: isCurrent ? "#fff" : "var(--text-muted)" }}>
                        {step.step}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{step.icon}</span>
                      <span style={{ fontSize: 17, fontWeight: 700, color: isFuture ? "var(--text-muted)" : "var(--text-primary)" }}>
                        {step.title}
                      </span>
                      {isCurrent && (
                        <span style={{
                          padding: "2px 8px", borderRadius: 999, background: "var(--accent)" + "20",
                          color: "var(--accent)", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}>
                          Current
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: isCurrent ? 14 : 0 }}>
                      {step.desc}
                    </div>

                    {/* Progress bar for current/complete steps with measurable progress */}
                    {(isCurrent || isComplete) && step.progress > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <ProgressBar value={step.progress * 100} max={100} color={isComplete ? "var(--green)" : "var(--accent)"} height={6} />
                        <div style={{ marginTop: 6, fontSize: 12, color: isComplete ? "var(--green)" : "var(--text-secondary)", fontWeight: 500 }}>
                          {step.detail}
                        </div>
                      </div>
                    )}

                    {/* Detail for steps without progress bars */}
                    {(isCurrent || isComplete) && step.progress === 0 && step.detail && (
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                        {step.detail}
                      </div>
                    )}

                    {/* Debt list for Step 2 if current */}
                    {isCurrent && step.step === 2 && step.debts && step.debts.length > 0 && (
                      <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>Debt Snowball Order</div>
                        {[...step.debts].sort((a, b) => a.balance - b.balance).map((d, i) => (
                          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < step.debts.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                            <span style={{ width: 20, height: 20, borderRadius: "50%", background: i === 0 ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${i === 0 ? "var(--accent)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: i === 0 ? "#fff" : "var(--text-muted)", flexShrink: 0 }}>
                              {i + 1}
                            </span>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                              {d.icon} {d.name}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                              {fmt(d.balance)}
                            </span>
                          </div>
                        ))}
                        <button
                          onClick={() => onNavigate("strategy")}
                          style={{ marginTop: 10, width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          View Debt Strategy →
                        </button>
                      </div>
                    )}

                    {/* Emergency fund detail for Step 3 */}
                    {isCurrent && step.step === 3 && (
                      <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>3-6 Month Target</span>
                          <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                            {fmt(step.targetMin)} – {fmt(step.targetMax)}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                          Based on {fmt(monthlyExpenses)}/mo in expenses
                        </div>
                        <button
                          onClick={() => onNavigate("savings")}
                          style={{ marginTop: 10, width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          View Savings Goals →
                        </button>
                      </div>
                    )}

                    {/* Future step dimmed detail */}
                    {isFuture && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                        {step.detail}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Motivational footer */}
      <div style={{ marginTop: 28, padding: "20px", textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🦌</div>
        <div style={{ fontSize: 15, fontStyle: "italic", color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}>
          "If you will live like no one else, later you can live and give like no one else."
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
          You're on Baby Step {currentStepNum} of 7 — keep going!
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CALCULATOR PAGE
// ─────────────────────────────────────────────

const CALCULATORS = [
  { id: "compound", name: "Compound Interest", icon: "📈", desc: "See how your money grows over time" },
  { id: "mortgage", name: "Mortgage", icon: "🏠", desc: "Monthly payment and amortization" },
  { id: "retirement", name: "401(k) / Retirement", icon: "🏖", desc: "Project your retirement savings" },
  { id: "loan", name: "Loan Payoff", icon: "💳", desc: "How fast can you pay it off?" },
  { id: "savings", name: "Savings Goal", icon: "🎯", desc: "How much to save monthly?" },
];

function CalcInput({ label, value, onChange, prefix, suffix, step = "1", min = "0" }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, fontWeight: 600 }}>{prefix}</span>}
        <input type="number" step={step} min={min} value={value} onChange={(e) => onChange(e.target.value)}
          style={{ ...INPUT_STYLE, paddingLeft: prefix ? 28 : 12, paddingRight: suffix ? 36 : 12 }} />
        {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function CalcResult({ label, value, accent, sub }) {
  return (
    <div style={{ padding: "12px 16px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent || "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function CompoundInterestCalc() {
  const [principal, setPrincipal] = useState("10000");
  const [monthly, setMonthly] = useState("500");
  const [rate, setRate] = useState("7");
  const [years, setYears] = useState("20");

  const p = parseFloat(principal) || 0;
  const m = parseFloat(monthly) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = (parseFloat(years) || 0) * 12;

  const futureValue = r > 0
    ? p * Math.pow(1 + r, n) + m * ((Math.pow(1 + r, n) - 1) / r)
    : p + m * n;
  const totalContributed = p + m * n;
  const interestEarned = futureValue - totalContributed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <CalcInput label="Starting Amount" value={principal} onChange={setPrincipal} prefix="$" />
        <CalcInput label="Monthly Contribution" value={monthly} onChange={setMonthly} prefix="$" />
        <CalcInput label="Annual Return" value={rate} onChange={setRate} suffix="%" step="0.1" />
        <CalcInput label="Years" value={years} onChange={setYears} suffix="yrs" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 4 }}>
        <CalcResult label="Future Value" value={fmtCompact(futureValue)} accent="var(--green)" />
        <CalcResult label="Total Contributed" value={fmtCompact(totalContributed)} />
        <CalcResult label="Interest Earned" value={fmtCompact(interestEarned)} accent="var(--accent)" sub={`${totalContributed > 0 ? ((interestEarned / totalContributed) * 100).toFixed(0) : 0}% return`} />
      </div>
    </div>
  );
}

function MortgageCalc() {
  const [price, setPrice] = useState("350000");
  const [down, setDown] = useState("70000");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");
  const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "yearly"
  const [showAll, setShowAll] = useState(false);

  const loan = (parseFloat(price) || 0) - (parseFloat(down) || 0);
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = (parseFloat(term) || 0) * 12;
  const payment = r > 0 && n > 0 ? loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 0;
  const totalPaid = payment * n;
  const totalInterest = totalPaid - loan;

  // Full amortization schedule
  const fullSchedule = useMemo(() => {
    const rows = [];
    let bal = loan;
    for (let i = 1; i <= n && bal > 0.01; i++) {
      const interest = bal * r;
      const princ = Math.min(payment - interest, bal);
      bal = Math.max(bal - princ, 0);
      rows.push({ month: i, payment: princ + interest, principal: princ, interest, balance: bal });
    }
    return rows;
  }, [loan, r, n, payment]);

  // Year-level rollup
  const yearlySchedule = useMemo(() => {
    const years = [];
    for (let y = 1; y <= Math.ceil(fullSchedule.length / 12); y++) {
      const slice = fullSchedule.slice((y - 1) * 12, y * 12);
      if (slice.length === 0) break;
      years.push({
        year: y,
        payment: slice.reduce((s, r) => s + r.payment, 0),
        principal: slice.reduce((s, r) => s + r.principal, 0),
        interest: slice.reduce((s, r) => s + r.interest, 0),
        balance: slice[slice.length - 1].balance,
      });
    }
    return years;
  }, [fullSchedule]);

  const displayRows = viewMode === "yearly" ? yearlySchedule : (showAll ? fullSchedule : fullSchedule.slice(0, 24));
  const headers = viewMode === "yearly"
    ? ["Year", "Total Paid", "Principal", "Interest", "Balance"]
    : ["Month", "Payment", "Principal", "Interest", "Balance"];

  // Balance-over-time SVG chart
  const chartPoints = yearlySchedule.map((y, i) => ({ x: i, bal: y.balance }));
  const mcW = 480, mcH = 80, mcPad = { t: 6, r: 8, b: 20, l: 52 };
  const mcInW = mcW - mcPad.l - mcPad.r, mcInH = mcH - mcPad.t - mcPad.b;
  const mcScaleX = (i) => mcPad.l + (i / Math.max(chartPoints.length - 1, 1)) * mcInW;
  const mcScaleY = (v) => mcPad.t + mcInH - (v / loan) * mcInH;
  const mcPath = chartPoints.map((p, i) => `${i === 0 ? "M" : "L"}${mcScaleX(i)},${mcScaleY(p.bal)}`).join(" ");
  const mcArea = loan > 0 ? `M${mcPad.l},${mcScaleY(loan)} ${mcPath.slice(1)} L${mcScaleX(chartPoints.length - 1)},${mcScaleY(0)} L${mcPad.l},${mcScaleY(0)} Z` : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <CalcInput label="Home Price" value={price} onChange={setPrice} prefix="$" />
        <CalcInput label="Down Payment" value={down} onChange={setDown} prefix="$" />
        <CalcInput label="Interest Rate" value={rate} onChange={setRate} suffix="%" step="0.125" />
        <CalcInput label="Loan Term" value={term} onChange={setTerm} suffix="yrs" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <CalcResult label="Monthly Payment" value={fmt(payment)} accent="var(--accent)" />
        <CalcResult label="Total Interest" value={fmtCompact(totalInterest)} accent="var(--red)" sub={`${((totalInterest / loan) * 100).toFixed(0)}% of loan`} />
        <CalcResult label="Loan Amount" value={fmtCompact(loan)} sub={`${((parseFloat(down) || 0) / (parseFloat(price) || 1) * 100).toFixed(0)}% down`} />
      </div>

      {/* Balance paydown chart */}
      {loan > 0 && chartPoints.length > 1 && (
        <div style={{ overflowX: "auto" }}>
          <svg viewBox={`0 0 ${mcW} ${mcH}`} style={{ width: "100%", maxHeight: 90 }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="mcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((f) => {
              const v = loan * (1 - f);
              const y = mcScaleY(v);
              return (
                <g key={f}>
                  <line x1={mcPad.l} y1={y} x2={mcW - mcPad.r} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                  <text x={mcPad.l - 5} y={y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">
                    {v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`}
                  </text>
                </g>
              );
            })}
            {[0, Math.floor(chartPoints.length / 2), chartPoints.length - 1].map((i) => (
              <text key={i} x={mcScaleX(i)} y={mcH - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">
                Yr {i + 1}
              </text>
            ))}
            <path d={mcArea} fill="url(#mcGrad)" />
            <path d={mcPath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {fullSchedule.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {/* View mode toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
              {[["monthly", "Monthly"], ["yearly", "Yearly"]].map(([key, label]) => (
                <button key={key} onClick={() => { setViewMode(key); setShowAll(false); }}
                  style={{ padding: "5px 14px", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: viewMode === key ? "var(--accent)" : "transparent",
                    color: viewMode === key ? "#fff" : "var(--text-muted)" }}>
                  {label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {viewMode === "yearly" ? `${yearlySchedule.length} years` : `${fullSchedule.length} months total`}
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                {headers.map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: h === headers[0] ? "left" : "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{displayRows.map((row) => (
                <tr key={viewMode === "yearly" ? row.year : row.month} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "7px 10px", color: "var(--text-primary)", fontWeight: 500 }}>
                    {viewMode === "yearly" ? `Year ${row.year}` : row.month}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>{fmt(row.payment)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--green)" }}>{fmt(row.principal)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--red)" }}>{fmt(row.interest)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" }}>{fmtCompact(row.balance)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {viewMode === "monthly" && !showAll && fullSchedule.length > 24 && (
            <button onClick={() => setShowAll(true)}
              style={{ width: "100%", padding: "10px", marginTop: 4, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Show all {fullSchedule.length} months
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RetirementCalc() {
  const [age, setAge] = useState("30");
  const [retireAge, setRetireAge] = useState("65");
  const [current, setCurrent] = useState("45000");
  const [monthly, setMonthly] = useState("800");
  const [match, setMatch] = useState("50");
  const [rate, setRate] = useState("7");

  const yearsToRetire = Math.max((parseFloat(retireAge) || 0) - (parseFloat(age) || 0), 0);
  const n = yearsToRetire * 12;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const p = parseFloat(current) || 0;
  const m = parseFloat(monthly) || 0;
  const matchPct = (parseFloat(match) || 0) / 100;
  const totalMonthly = m + m * matchPct;

  const futureValue = r > 0
    ? p * Math.pow(1 + r, n) + totalMonthly * ((Math.pow(1 + r, n) - 1) / r)
    : p + totalMonthly * n;
  const totalContributed = p + m * n;
  const employerMatch = m * matchPct * n;
  const growth = futureValue - totalContributed - employerMatch;

  // 4% rule
  const annualWithdrawal = futureValue * 0.04;
  const monthlyInRetirement = annualWithdrawal / 12;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <CalcInput label="Current Age" value={age} onChange={setAge} />
        <CalcInput label="Retirement Age" value={retireAge} onChange={setRetireAge} />
        <CalcInput label="Current Balance" value={current} onChange={setCurrent} prefix="$" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <CalcInput label="Monthly Contribution" value={monthly} onChange={setMonthly} prefix="$" />
        <CalcInput label="Employer Match" value={match} onChange={setMatch} suffix="%" />
        <CalcInput label="Annual Return" value={rate} onChange={setRate} suffix="%" step="0.1" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
        <CalcResult label="Projected at Retirement" value={fmtCompact(futureValue)} accent="var(--green)" sub={`in ${yearsToRetire} years`} />
        <CalcResult label="Monthly in Retirement" value={fmt(monthlyInRetirement)} accent="var(--accent)" sub="4% safe withdrawal" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <CalcResult label="Your Contributions" value={fmtCompact(totalContributed)} />
        <CalcResult label="Employer Match" value={fmtCompact(employerMatch)} accent="var(--amber)" />
        <CalcResult label="Investment Growth" value={fmtCompact(growth)} accent="var(--green)" />
      </div>
    </div>
  );
}

function LoanPayoffCalc() {
  const [balance, setBalance] = useState("15000");
  const [rate, setRate] = useState("6.5");
  const [payment, setPayment] = useState("350");
  const [extra, setExtra] = useState("100");

  const b = parseFloat(balance) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const p = parseFloat(payment) || 0;
  const e = parseFloat(extra) || 0;

  const calcMonths = (pmt) => {
    if (pmt <= 0 || r <= 0 || b <= 0) return 0;
    if (pmt <= b * r) return Infinity;
    return Math.ceil(Math.log(pmt / (pmt - b * r)) / Math.log(1 + r));
  };

  const monthsNormal = calcMonths(p);
  const monthsWithExtra = calcMonths(p + e);
  const totalNormal = p * monthsNormal;
  const totalWithExtra = (p + e) * monthsWithExtra;
  const interestNormal = totalNormal - b;
  const interestWithExtra = totalWithExtra - b;
  const interestSaved = interestNormal - interestWithExtra;
  const monthsSaved = monthsNormal - monthsWithExtra;

  const futureDate = (m) => {
    const d = new Date();
    d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <CalcInput label="Loan Balance" value={balance} onChange={setBalance} prefix="$" />
        <CalcInput label="Interest Rate" value={rate} onChange={setRate} suffix="%" step="0.1" />
        <CalcInput label="Monthly Payment" value={payment} onChange={setPayment} prefix="$" />
        <CalcInput label="Extra Payment" value={extra} onChange={setExtra} prefix="$" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
        <div style={{ padding: "16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>Without Extra</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{monthsNormal === Infinity ? "Never" : `${monthsNormal} months`}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{monthsNormal < Infinity ? `Paid off ${futureDate(monthsNormal)}` : "Payment too low"}</div>
          <div style={{ fontSize: 12, color: "var(--red)", fontWeight: 600, marginTop: 4 }}>{fmt(interestNormal)} interest</div>
        </div>
        <div style={{ padding: "16px", borderRadius: 12, border: "2px solid var(--green)", background: "var(--green-bg)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--green)", marginBottom: 8 }}>With Extra</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{monthsWithExtra === Infinity ? "Never" : `${monthsWithExtra} months`}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{monthsWithExtra < Infinity ? `Paid off ${futureDate(monthsWithExtra)}` : "Payment too low"}</div>
          <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, marginTop: 4 }}>{fmt(interestWithExtra)} interest</div>
        </div>
      </div>
      {monthsSaved > 0 && interestSaved > 0 && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
          Extra {fmt(e)}/mo saves <span style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(interestSaved)}</span> in interest and <span style={{ color: "var(--green)", fontWeight: 700 }}>{monthsSaved} months</span>
        </div>
      )}
    </div>
  );
}

function SavingsGoalCalc() {
  const [goal, setGoal] = useState("10000");
  const [current, setCurrent] = useState("1000");
  const [rate, setRate] = useState("4.5");
  const [months, setMonths] = useState("24");

  const g = parseFloat(goal) || 0;
  const c = parseFloat(current) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = parseFloat(months) || 0;
  const needed = g - c;

  // How much to save monthly
  const monthlySave = r > 0 && n > 0
    ? (needed - c * (Math.pow(1 + r, n) - 1)) / ((Math.pow(1 + r, n) - 1) / r)
    : n > 0 ? needed / n : 0;

  // If saving X/mo, how many months?
  const monthsNeeded = r > 0 && monthlySave > 0
    ? Math.ceil(Math.log((g * r + monthlySave) / (c * r + monthlySave)) / Math.log(1 + r))
    : monthlySave > 0 ? Math.ceil(needed / monthlySave) : 0;

  const futureDate = (m) => {
    const d = new Date();
    d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <CalcInput label="Savings Goal" value={goal} onChange={setGoal} prefix="$" />
        <CalcInput label="Current Savings" value={current} onChange={setCurrent} prefix="$" />
        <CalcInput label="APY / Return" value={rate} onChange={setRate} suffix="%" step="0.1" />
        <CalcInput label="Timeframe" value={months} onChange={setMonths} suffix="mo" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 4 }}>
        <CalcResult label="Monthly Savings Needed" value={monthlySave > 0 ? fmt(Math.max(monthlySave, 0)) : "$0.00"} accent="var(--accent)" />
        <CalcResult label="Amount Needed" value={fmt(Math.max(needed, 0))} sub={`${pct(c, g).toFixed(0)}% there`} />
        <CalcResult label="Target Date" value={futureDate(n)} accent="var(--green)" />
      </div>
    </div>
  );
}

function CalculatorPage() {
  const [activeCalc, setActiveCalc] = useState("compound");

  const calcs = {
    compound: CompoundInterestCalc,
    mortgage: MortgageCalc,
    retirement: RetirementCalc,
    loan: LoanPayoffCalc,
    savings: SavingsGoalCalc,
  };
  const ActiveCalcComponent = calcs[activeCalc];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Financial Calculators</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Run the numbers on any financial scenario</p>
      </div>

      {/* Calculator selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 24 }}>
        {CALCULATORS.map((calc) => {
          const active = activeCalc === calc.id;
          return (
            <div key={calc.id} onClick={() => setActiveCalc(calc.id)}
              style={{
                padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "var(--accent)" + "0a" : "var(--card)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--border-hover)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{calc.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: active ? "var(--accent)" : "var(--text-primary)", marginBottom: 2 }}>{calc.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{calc.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Active calculator */}
      <Card>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>{CALCULATORS.find((c) => c.id === activeCalc)?.icon}</span>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              {CALCULATORS.find((c) => c.id === activeCalc)?.name}
            </h2>
          </div>
          <ActiveCalcComponent />
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// TRANSACTIONS PAGE
// ─────────────────────────────────────────────

function TransactionsPage({ transactions, setTransactions, categories, showUndo }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const catMap = {};
  categories.forEach((c) => { catMap[c.id] = c; });

  // Build available months from transaction data
  const availableMonths = useMemo(() => {
    const months = [...new Set(transactions.map((t) => t.date.substring(0, 7)))].sort().reverse();
    return months;
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filterMonth !== "all") list = list.filter((t) => t.date.startsWith(filterMonth));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.description.toLowerCase().includes(q) || (catMap[t.categoryId]?.name || "").toLowerCase().includes(q));
    }
    if (filterCat !== "all") list = list.filter((t) => t.categoryId === filterCat);
    list.sort((a, b) => {
      if (sortField === "date") return sortDir === "desc" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
      if (sortField === "amount") return sortDir === "desc" ? b.amount - a.amount : a.amount - b.amount;
      return 0;
    });
    return list;
  }, [transactions, search, filterCat, filterMonth, sortField, sortDir]);

  const totalFiltered = filtered.reduce((s, t) => s + t.amount, 0);
  const selectedTotal = filtered.filter((t) => selected.has(t.id)).reduce((s, t) => s + t.amount, 0);
  const hasSelection = selected.size > 0;
  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  };

  const deleteSelected = () => {
    if (showUndo) showUndo(`Deleted ${selected.size} transaction${selected.size !== 1 ? "s" : ""}`);
    setTransactions((prev) => prev.filter((t) => !selected.has(t.id)));
    setSelected(new Set());
  };

  const deleteAll = () => {
    if (showUndo) showUndo(`Deleted all ${transactions.length} transactions`);
    setTransactions([]);
    setSelected(new Set());
    setConfirmDeleteAll(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Transactions</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>{filtered.length} transactions · {fmt(totalFiltered)} total</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {transactions.length > 0 && (
            confirmDeleteAll ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={deleteAll} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--red)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Yes, Delete All ({transactions.length})
                </button>
                <button onClick={() => setConfirmDeleteAll(false)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteAll(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--red)44", background: "transparent", color: "var(--red)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Delete All
              </button>
            )
          )}
          <button onClick={() => setShowAdd(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Transaction</button>
        </div>
      </div>

      {/* Selection action bar */}
      {hasSelection && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 16px", marginBottom: 12, borderRadius: 10,
          background: "var(--accent)" + "18", border: "1px solid var(--accent)" + "44",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
              {selected.size} selected
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {fmt(selectedTotal)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setSelected(new Set())} style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Deselect</button>
            <button onClick={deleteSelected} style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: "var(--red)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
              Delete ({selected.size})
            </button>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 250px", position: "relative" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..."
            style={{ ...INPUT_STYLE, paddingLeft: 36 }} />
        </div>
        <select value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setSelected(new Set()); }} style={{ ...INPUT_STYLE, width: "auto", minWidth: 140, cursor: "pointer" }}>
          <option value="all">All Months</option>
          {availableMonths.map((mk) => {
            const d = new Date(mk + "-01T00:00:00");
            return <option key={mk} value={mk}>{d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</option>;
          })}
        </select>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ ...INPUT_STYLE, width: "auto", minWidth: 150, cursor: "pointer" }}>
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Transaction list */}
      <Card>
        {/* Header row with select all */}
        <div style={{
          display: "grid", gridTemplateColumns: "40px 1fr auto",
          padding: "10px 16px", borderBottom: "1px solid var(--border)",
          alignItems: "center",
        }}>
          <div onClick={selectAll} style={{
            width: 22, height: 22, borderRadius: 6, cursor: "pointer",
            border: allSelected ? "none" : "2px solid var(--border-hover)",
            background: allSelected ? "var(--accent)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>
            {allSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <span onClick={() => toggleSort("date")} style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", cursor: "pointer", userSelect: "none" }}>
              Date {sortField === "date" && (sortDir === "desc" ? "↓" : "↑")}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Description</span>
          </div>
          <span onClick={() => toggleSort("amount")} style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", cursor: "pointer", userSelect: "none" }}>
            Amount {sortField === "amount" && (sortDir === "desc" ? "↓" : "↑")}
          </span>
        </div>

        {/* Transaction rows */}
        {filtered.map((t) => {
          const cat = catMap[t.categoryId];
          const isSelected = selected.has(t.id);
          return (
            <div key={t.id}
              style={{
                display: "grid", gridTemplateColumns: "40px 1fr auto",
                padding: "12px 16px", alignItems: "center",
                borderBottom: "1px solid var(--border-subtle)",
                background: isSelected ? "var(--accent)" + "0c" : "transparent",
                transition: "background 0.15s",
                userSelect: "none", position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = "var(--nav-hover)";
                const btn = e.currentTarget.querySelector(".tx-edit-btn");
                if (btn) btn.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isSelected ? "var(--accent)" + "0c" : "transparent";
                const btn = e.currentTarget.querySelector(".tx-edit-btn");
                if (btn) btn.style.opacity = "0";
              }}
            >
              {/* Checkbox — clicking this area toggles selection */}
              <div onClick={() => toggleSelect(t.id)} style={{
                width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                border: isSelected ? "none" : "2px solid var(--border-hover)",
                background: isSelected ? "var(--accent)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", flexShrink: 0,
              }}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>

              {/* Info — clicking main body opens edit */}
              <div onClick={() => setEditTx(t)} style={{ minWidth: 0, paddingRight: 12, cursor: "pointer" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.description}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {new Date(t.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {cat && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{cat.icon} {cat.name}</span>}
                </div>
              </div>

              {/* Amount + edit button */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button className="tx-edit-btn" onClick={(e) => { e.stopPropagation(); setEditTx(t); }}
                  style={{
                    opacity: 0, transition: "opacity 0.15s",
                    padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)",
                    background: "var(--surface)", color: "var(--text-muted)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                  }}>
                  Edit
                </button>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--red)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  -{fmt(t.amount)}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {search || filterCat !== "all" ? "No transactions match your filters" : "No transactions yet"}
          </div>
        )}
      </Card>

      {showAdd && (
        <Overlay onClose={() => setShowAdd(false)}>
          <ModalForm title="Add Transaction">
            <AddTransactionFields categories={categories} onSubmit={(tx, isSplit) => { setTransactions((p) => isSplit ? [...p, ...tx] : [...p, tx]); setShowAdd(false); }} onClose={() => setShowAdd(false)} />
          </ModalForm>
        </Overlay>
      )}

      {editTx && (
        <Overlay onClose={() => setEditTx(null)}>
          <ModalForm title="Edit Transaction">
            <AddTransactionFields
              categories={categories}
              existing={editTx}
              onSubmit={(updated) => {
                if (showUndo) showUndo(`Edited "${editTx.description}"`);
                setTransactions((p) => p.map((t) => t.id === updated.id ? updated : t));
                setEditTx(null);
              }}
              onClose={() => setEditTx(null)}
            />
          </ModalForm>
        </Overlay>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CASH FLOW FORECAST PAGE
// ─────────────────────────────────────────────

function CashFlowForecastPage({ income, billTemplates, paidDates, transactions, savingsGoals, debts, assets }) {
  const [horizon, setHorizon] = useState(90); // 30, 60, 90 days

  const forecast = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Starting balance = sum of cash assets
    const startingBalance = assets
      .filter((a) => a.category === "cash")
      .reduce((s, a) => s + a.value, 0);

    // Calculate average daily spend from last 30 days of transactions
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
    const recentTx = transactions.filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      return d >= thirtyDaysAgo && d <= today;
    });
    const totalRecentSpend = recentTx.reduce((s, t) => s + t.amount, 0);
    const daysOfData = Math.max(1, Math.ceil((today - thirtyDaysAgo) / 86400000));
    const avgDailySpend = totalRecentSpend / daysOfData;

    // Calculate per-category daily averages for breakdown
    const catSpendMap = {};
    recentTx.forEach((t) => {
      catSpendMap[t.categoryId] = (catSpendMap[t.categoryId] || 0) + t.amount;
    });

    // Monthly income calculation (same logic used elsewhere in the app)
    const monthlyIncome = income.reduce((s, i) => {
      if (!i.recurring) return s;
      switch (i.frequency) {
        case "weekly": return s + i.amount * 52 / 12;
        case "biweekly": return s + i.amount * 26 / 12;
        case "semimonthly": return s + i.amount * 2;
        case "monthly": return s + i.amount;
        case "quarterly": return s + i.amount / 3;
        case "yearly": return s + i.amount / 12;
        default: return s + i.amount;
      }
    }, 0);
    const dailyIncome = monthlyIncome / 30;

    // Monthly savings obligations
    const monthlySavings = savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0);
    const dailySavings = monthlySavings / 30;

    // Monthly debt payments
    const monthlyDebt = debts.reduce((s, d) => s + d.minPayment, 0);
    const dailyDebt = monthlyDebt / 30;

    // Generate day-by-day forecast
    const days = [];
    let runningBalance = startingBalance;
    let cumulativeIncome = 0;
    let cumulativeBills = 0;
    let cumulativeSpend = 0;
    let cumulativeSavings = 0;
    let cumulativeDebt = 0;

    // Track income events per day using the income recurrence patterns
    function getIncomeForDate(dateStr) {
      let total = 0;
      const d = new Date(dateStr + "T00:00:00");
      const dayOfMonth = d.getDate();

      income.forEach((src) => {
        if (!src.recurring) return;
        switch (src.frequency) {
          case "monthly":
            if (dayOfMonth === new Date(src.date + "T00:00:00").getDate()) total += src.amount;
            break;
          case "semimonthly":
            if (dayOfMonth === 1 || dayOfMonth === 15) total += src.amount;
            break;
          case "biweekly": {
            const anchor = new Date(src.date + "T00:00:00");
            const diff = Math.round((d - anchor) / 86400000);
            if (diff >= 0 && diff % 14 === 0) total += src.amount;
            break;
          }
          case "weekly": {
            const anchor = new Date(src.date + "T00:00:00");
            const diff = Math.round((d - anchor) / 86400000);
            if (diff >= 0 && diff % 7 === 0) total += src.amount;
            break;
          }
          default: break;
        }
      });
      return total;
    }

    for (let i = 0; i <= horizon; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });

      // Income for this day
      const dayIncome = i === 0 ? 0 : getIncomeForDate(dateStr);
      cumulativeIncome += dayIncome;

      // Bills due this day (generate instances for this month)
      const monthInstances = generateBillInstances(billTemplates, d.getFullYear(), d.getMonth());
      const dayBills = monthInstances.filter((b) => b.instanceDate === dateStr && !paidDates.has(b.instanceKey));
      const dayBillTotal = dayBills.reduce((s, b) => s + b.amount, 0);
      cumulativeBills += dayBillTotal;

      // Estimated daily discretionary spend (skip day 0 = today)
      const daySpend = i === 0 ? 0 : avgDailySpend;
      cumulativeSpend += daySpend;

      // Savings & debt prorated daily (skip day 0)
      const daySavings = i === 0 ? 0 : dailySavings;
      const dayDebtPmt = i === 0 ? 0 : dailyDebt;
      cumulativeSavings += daySavings;
      cumulativeDebt += dayDebtPmt;

      if (i > 0) {
        runningBalance += dayIncome - dayBillTotal - daySpend - daySavings - dayDebtPmt;
      }

      days.push({
        date: dateStr,
        dayLabel,
        weekday,
        dayNum: i,
        balance: runningBalance,
        dayIncome,
        dayBills,
        dayBillTotal,
        daySpend,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isPayday: dayIncome > 0,
        isBillDay: dayBills.length > 0,
      });
    }

    // Key milestones
    const day30 = days.find((d) => d.dayNum === 30);
    const day60 = days.find((d) => d.dayNum === 60);
    const day90 = days.find((d) => d.dayNum === 90);
    const minBalance = days.reduce((min, d) => d.balance < min.balance ? d : min, days[0]);
    const goesNegative = days.some((d) => d.balance < 0);
    const negativeDay = days.find((d) => d.balance < 0);

    // Net monthly flow
    const netMonthlyFlow = monthlyIncome - (avgDailySpend * 30) - monthlySavings - monthlyDebt;

    return {
      days,
      startingBalance,
      avgDailySpend,
      monthlyIncome,
      monthlySavings,
      monthlyDebt,
      netMonthlyFlow,
      day30,
      day60,
      day90,
      minBalance,
      goesNegative,
      negativeDay,
      cumulativeIncome,
      cumulativeBills,
      cumulativeSpend,
      cumulativeSavings,
      cumulativeDebt,
    };
  }, [income, billTemplates, paidDates, transactions, savingsGoals, debts, assets, horizon]);

  // Chart dimensions
  const chartH = 200;
  const chartW = 600;
  const pad = { top: 20, right: 20, bottom: 30, left: 60 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  // Scale values for SVG chart
  const visibleDays = forecast.days.slice(0, horizon + 1);
  const balances = visibleDays.map((d) => d.balance);
  const maxBal = Math.max(...balances, 1);
  const minBal = Math.min(...balances, 0);
  const range = maxBal - minBal || 1;

  const scaleX = (i) => pad.left + (i / horizon) * innerW;
  const scaleY = (v) => pad.top + innerH - ((v - minBal) / range) * innerH;

  // Build SVG path
  const pathPoints = visibleDays.map((d, i) => `${scaleX(i)},${scaleY(d.balance)}`);
  const linePath = `M${pathPoints.join(" L")}`;

  // Gradient fill path
  const areaPath = `${linePath} L${scaleX(visibleDays.length - 1)},${scaleY(minBal)} L${scaleX(0)},${scaleY(minBal)} Z`;

  // Zero line y position
  const zeroY = minBal < 0 ? scaleY(0) : null;

  // Y-axis ticks
  const yTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const val = minBal + (range * i) / tickCount;
    yTicks.push({ val, y: scaleY(val) });
  }

  // X-axis ticks - show every ~15 days
  const xTicks = [];
  const step = Math.max(Math.floor(horizon / 6), 1);
  for (let i = 0; i <= horizon; i += step) {
    if (visibleDays[i]) {
      xTicks.push({ label: visibleDays[i].dayLabel, x: scaleX(i) });
    }
  }

  // Find notable events for the timeline
  const billEvents = visibleDays.filter((d) => d.isBillDay).slice(0, 12);
  const paydayEvents = visibleDays.filter((d) => d.isPayday).slice(0, 8);

  const pillStyle = (active) => ({
    padding: "6px 16px", borderRadius: 999, border: "1px solid var(--border)",
    background: active ? "var(--text-primary)" : "transparent",
    color: active ? "var(--card)" : "var(--text-muted)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Cash Flow Forecast</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          Projected balance based on income, bills, and spending patterns
        </p>
      </div>

      {/* Horizon selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { days: 30, label: "30 Days" },
          { days: 60, label: "60 Days" },
          { days: 90, label: "90 Days" },
        ].map((h) => (
          <button key={h.days} onClick={() => setHorizon(h.days)} style={pillStyle(horizon === h.days)}>
            {h.label}
          </button>
        ))}
      </div>

      {/* Top-level metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetricBox label="Current Balance" value={fmt(forecast.startingBalance)} sub="cash accounts" accent="var(--text-primary)" />
        <MetricBox
          label={`${horizon}-Day Balance`}
          value={fmt(horizon === 30 ? forecast.day30?.balance : horizon === 60 ? forecast.day60?.balance : forecast.day90?.balance || 0)}
          sub="projected"
          accent={(horizon === 30 ? forecast.day30?.balance : horizon === 60 ? forecast.day60?.balance : forecast.day90?.balance || 0) >= 0 ? "var(--green)" : "var(--red)"}
        />
        <MetricBox label="Monthly Net Flow" value={fmt(forecast.netMonthlyFlow)} sub={forecast.netMonthlyFlow >= 0 ? "surplus" : "deficit"} accent={forecast.netMonthlyFlow >= 0 ? "var(--green)" : "var(--red)"} />
        <MetricBox
          label="Lowest Point"
          value={fmt(forecast.minBalance.balance)}
          sub={forecast.minBalance.dayLabel}
          accent={forecast.minBalance.balance < 0 ? "var(--red)" : forecast.minBalance.balance < 500 ? "var(--amber)" : "var(--green)"}
        />
      </div>

      {/* Warning banner if balance goes negative */}
      {forecast.goesNegative && (
        <Card style={{ marginBottom: 20, borderColor: "var(--red)" }}>
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
              ⚠
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--red)" }}>Balance Goes Negative</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                Your projected balance dips below $0 around {forecast.negativeDay?.dayLabel}. Consider reducing spending or adjusting savings contributions.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SVG Balance Chart */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Projected Balance" />
        <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", maxHeight: 220 }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={forecast.goesNegative ? "#f87171" : "#34d399"} stopOpacity="0.25" />
                <stop offset="100%" stopColor={forecast.goesNegative ? "#f87171" : "#34d399"} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" />
                <text x={pad.left - 8} y={t.y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans, sans-serif">
                  {t.val >= 1000 ? `$${(t.val / 1000).toFixed(0)}k` : `$${Math.round(t.val)}`}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {xTicks.map((t, i) => (
              <text key={i} x={t.x} y={chartH - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" fontFamily="DM Sans, sans-serif">
                {t.label}
              </text>
            ))}

            {/* Zero line */}
            {zeroY !== null && (
              <line x1={pad.left} y1={zeroY} x2={chartW - pad.right} y2={zeroY} stroke="#f87171" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
            )}

            {/* Area fill */}
            <path d={areaPath} fill="url(#balanceGrad)" />

            {/* Line */}
            <path d={linePath} fill="none" stroke={forecast.goesNegative ? "#f87171" : "#34d399"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Payday markers */}
            {paydayEvents.map((d, i) => (
              <g key={`pay-${i}`}>
                <circle cx={scaleX(d.dayNum)} cy={scaleY(d.balance)} r="3.5" fill="#34d399" stroke="var(--card)" strokeWidth="1.5" />
              </g>
            ))}

            {/* Bill day markers */}
            {billEvents.map((d, i) => (
              <g key={`bill-${i}`}>
                <circle cx={scaleX(d.dayNum)} cy={scaleY(d.balance)} r="3" fill="#fbbf24" stroke="var(--card)" strokeWidth="1.5" />
              </g>
            ))}

            {/* Today marker */}
            <circle cx={scaleX(0)} cy={scaleY(visibleDays[0].balance)} r="4" fill="#3b82f6" stroke="var(--card)" strokeWidth="2" />
          </svg>

          {/* Legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, paddingTop: 8 }}>
            {[
              { color: "#3b82f6", label: "Today" },
              { color: "#34d399", label: "Paydays" },
              { color: "#fbbf24", label: "Bills Due" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Assumptions card */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Forecast Assumptions" />
        <div style={{ padding: "0 20px 16px" }}>
          {[
            { label: "Monthly Income", value: fmt(forecast.monthlyIncome), color: "var(--green)", icon: "↑" },
            { label: "Avg Daily Spending", value: fmt(forecast.avgDailySpend), color: "var(--red)", icon: "↓", sub: `${fmt(forecast.avgDailySpend * 30)}/mo based on recent transactions` },
            { label: "Savings Contributions", value: fmt(forecast.monthlySavings) + "/mo", color: "var(--accent)", icon: "→", sub: `${savingsGoals.length} active goals` },
            { label: "Debt Payments", value: fmt(forecast.monthlyDebt) + "/mo", color: "var(--amber)", icon: "→", sub: `${debts.filter((d) => d.balance > 0).length} active debts` },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: row.color + "18", color: row.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                {row.icon}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{row.label}</div>
                {row.sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{row.sub}</div>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: row.color, fontVariantNumeric: "tabular-nums" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Upcoming Events Timeline */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Upcoming Cash Events" />
        <div style={{ padding: "0 20px 16px" }}>
          {visibleDays
            .filter((d) => d.dayNum > 0 && (d.isPayday || d.isBillDay))
            .slice(0, 15)
            .map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                {/* Date badge */}
                <div style={{ width: 44, textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)" }}>{d.weekday}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{d.dayLabel.split(" ")[1]}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.dayLabel.split(" ")[0]}</div>
                </div>

                {/* Events */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  {d.isPayday && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>Income</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums", marginLeft: "auto" }}>+{fmt(d.dayIncome)}</span>
                    </div>
                  )}
                  {d.dayBills.map((b, bi) => (
                    <div key={bi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{b.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--amber)", fontVariantNumeric: "tabular-nums", marginLeft: "auto" }}>-{fmt(b.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* Running balance */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: d.balance >= 0 ? "var(--text-secondary)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(d.balance)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>balance</div>
                </div>
              </div>
            ))}
          {visibleDays.filter((d) => d.dayNum > 0 && (d.isPayday || d.isBillDay)).length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No upcoming income or bills found
            </div>
          )}
        </div>
      </Card>

      {/* Projection milestones */}
      <Card>
        <CardHeader title="Balance Milestones" />
        <div style={{ padding: "0 20px 20px" }}>
          {[
            { label: "Today", balance: forecast.startingBalance, date: "Now" },
            forecast.day30 && { label: "30 Days", balance: forecast.day30.balance, date: forecast.day30.dayLabel },
            forecast.day60 && { label: "60 Days", balance: forecast.day60.balance, date: forecast.day60.dayLabel },
            forecast.day90 && { label: "90 Days", balance: forecast.day90.balance, date: forecast.day90.dayLabel },
          ].filter(Boolean).filter((m) => {
            if (m.label === "Today") return true;
            const daysVal = parseInt(m.label);
            return daysVal <= horizon;
          }).map((milestone, idx, arr) => {
            const delta = idx > 0 ? milestone.balance - arr[idx - 1].balance : 0;
            return (
              <div key={milestone.label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: idx < arr.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                {/* Step indicator */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: milestone.balance >= 0 ? "var(--green-bg)" : "var(--red-bg)",
                    border: `2px solid ${milestone.balance >= 0 ? "var(--green)" : "var(--red)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: milestone.balance >= 0 ? "var(--green)" : "var(--red)",
                  }}>
                    {milestone.label === "Today" ? "●" : milestone.label.replace(" Days", "d")}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{milestone.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{milestone.date}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: milestone.balance >= 0 ? "var(--text-primary)" : "var(--red)" }}>
                    {fmt(milestone.balance)}
                  </div>
                  {idx > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: delta >= 0 ? "var(--green)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>
                      {delta >= 0 ? "+" : ""}{fmt(delta)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Disclaimer */}
      <div style={{ marginTop: 20, padding: "16px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 500, margin: "0 auto" }}>
          Forecast is estimated based on recurring income, scheduled bills, and your average daily spending over the past 30 days. Actual results will vary.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SPENDING TRENDS PAGE
// ─────────────────────────────────────────────

const TREND_COLORS = ["#3b82f6", "#34d399", "#f0c644", "#f87171", "#d4a843", "#f472b6", "#38bdf8", "#fb923c"];

function SpendingTrendsPage({ categories, transactions }) {
  const [selectedCat, setSelectedCat] = useState("all");
  const [monthCount, setMonthCount] = useState(4); // how many months to show

  // Build month keys for the last N months (including current)
  const monthKeys = useMemo(() => {
    const now = new Date();
    const keys = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        longLabel: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    return keys;
  }, [monthCount]);

  // Group transactions by month key
  const txByMonth = useMemo(() => {
    const map = {};
    monthKeys.forEach((m) => { map[m.key] = []; });
    transactions.forEach((t) => {
      const mk = t.date.substring(0, 7); // "YYYY-MM"
      if (map[mk]) map[mk].push(t);
    });
    return map;
  }, [transactions, monthKeys]);

  // Per-month totals
  const monthTotals = useMemo(() => {
    return monthKeys.map((m) => {
      const txs = txByMonth[m.key] || [];
      const total = txs.reduce((s, t) => s + t.amount, 0);
      const byCat = {};
      categories.forEach((c) => { byCat[c.id] = 0; });
      txs.forEach((t) => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount; });
      return { ...m, total, byCat, txCount: txs.length };
    });
  }, [monthKeys, txByMonth, categories]);

  // Current month (last in array) vs previous months average
  const currentMonth = monthTotals[monthTotals.length - 1];
  const prevMonths = monthTotals.slice(0, -1).filter((m) => m.total > 0);
  const prevAvg = prevMonths.length > 0 ? prevMonths.reduce((s, m) => s + m.total, 0) / prevMonths.length : 0;
  const trendDelta = prevAvg > 0 ? ((currentMonth.total - prevAvg) / prevAvg) * 100 : 0;

  // Category breakdown for selected view
  const catBreakdown = useMemo(() => {
    return categories.map((cat, ci) => {
      const monthlyAmounts = monthTotals.map((m) => m.byCat[cat.id] || 0);
      const currentAmt = monthlyAmounts[monthlyAmounts.length - 1];
      const prevAmts = monthlyAmounts.slice(0, -1).filter((a) => a > 0);
      const avg = prevAmts.length > 0 ? prevAmts.reduce((s, a) => s + a, 0) / prevAmts.length : 0;
      const delta = avg > 0 ? ((currentAmt - avg) / avg) * 100 : 0;
      const total = monthlyAmounts.reduce((s, a) => s + a, 0);
      return {
        ...cat,
        monthlyAmounts,
        currentAmt,
        avg,
        delta,
        total,
        color: TREND_COLORS[ci % TREND_COLORS.length],
      };
    }).filter((c) => c.total > 0).sort((a, b) => b.currentAmt - a.currentAmt);
  }, [categories, monthTotals]);

  // Chart data — either all categories stacked or single category
  const chartData = selectedCat === "all" ? monthTotals : monthTotals.map((m) => ({
    ...m,
    total: m.byCat[selectedCat] || 0,
  }));

  // SVG bar chart dimensions
  const chartW = 560;
  const chartH = 200;
  const pad = { top: 16, right: 16, bottom: 32, left: 56 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  const maxVal = Math.max(...chartData.map((m) => m.total), 1);
  const barGap = 12;
  const barW = Math.max((innerW - barGap * (chartData.length - 1)) / chartData.length, 20);

  // Y-axis ticks
  const yTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const val = (maxVal * i) / tickCount;
    yTicks.push({ val, y: pad.top + innerH - (val / maxVal) * innerH });
  }

  // Category trend sparkline for per-category rows
  function Sparkline({ data, color, width = 80, height = 28 }) {
    const max = Math.max(...data, 1);
    const points = data.map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - (v / max) * (height - 4) - 2;
      return `${x},${y}`;
    });
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        {data.length > 0 && (() => {
          const lastX = width;
          const lastY = height - (data[data.length - 1] / max) * (height - 4) - 2;
          return <circle cx={lastX} cy={lastY} r="2.5" fill={color} />;
        })()}
      </svg>
    );
  }

  const pillStyle = (active) => ({
    padding: "6px 14px", borderRadius: 999, border: "1px solid var(--border)",
    background: active ? "var(--text-primary)" : "transparent",
    color: active ? "var(--card)" : "var(--text-muted)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Spending Trends</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          How your spending compares month to month
        </p>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { n: 3, label: "3 Months" },
          { n: 4, label: "4 Months" },
          { n: 6, label: "6 Months" },
        ].map((opt) => (
          <button key={opt.n} onClick={() => setMonthCount(opt.n)} style={pillStyle(monthCount === opt.n)}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetricBox label="This Month" value={fmt(currentMonth.total)} sub={`${currentMonth.txCount} transactions`} accent="var(--text-primary)" />
        <MetricBox label="Prior Average" value={fmt(prevAvg)} sub={prevMonths.length > 0 ? `last ${prevMonths.length} month${prevMonths.length > 1 ? "s" : ""}` : "no data"} accent="var(--text-secondary)" />
        <MetricBox
          label="Trend"
          value={prevAvg > 0 ? `${trendDelta >= 0 ? "+" : ""}${trendDelta.toFixed(1)}%` : "—"}
          sub={trendDelta > 5 ? "spending up" : trendDelta < -5 ? "spending down" : "roughly flat"}
          accent={trendDelta > 5 ? "var(--red)" : trendDelta < -5 ? "var(--green)" : "var(--text-muted)"}
        />
        <MetricBox label="Categories" value={catBreakdown.length} sub="with spending" accent="var(--accent)" />
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        <button onClick={() => setSelectedCat("all")} style={pillStyle(selectedCat === "all")}>All Categories</button>
        {catBreakdown.map((c) => (
          <button key={c.id} onClick={() => setSelectedCat(c.id)} style={pillStyle(selectedCat === c.id)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title={selectedCat === "all" ? "Monthly Spending" : `${categories.find((c) => c.id === selectedCat)?.icon || ""} ${categories.find((c) => c.id === selectedCat)?.name || ""} — Monthly`} />
        <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", maxHeight: 240 }} preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" />
                <text x={pad.left - 8} y={t.y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans, sans-serif">
                  {t.val >= 1000 ? `$${(t.val / 1000).toFixed(1)}k` : `$${Math.round(t.val)}`}
                </text>
              </g>
            ))}

            {/* Bars */}
            {chartData.map((m, i) => {
              const barH = maxVal > 0 ? (m.total / maxVal) * innerH : 0;
              const x = pad.left + i * (barW + barGap);
              const y = pad.top + innerH - barH;
              const isCurrentMonth = i === chartData.length - 1;

              // For "all" view, stack categories within each bar
              if (selectedCat === "all" && catBreakdown.length > 0) {
                let stackY = pad.top + innerH;
                const segments = catBreakdown.map((cat) => {
                  const val = m.byCat?.[cat.id] || 0;
                  const segH = maxVal > 0 ? (val / maxVal) * innerH : 0;
                  stackY -= segH;
                  return { cat, val, segH, segY: stackY };
                }).filter((s) => s.segH > 0);

                return (
                  <g key={m.key}>
                    {segments.map((seg, si) => (
                      <rect key={si} x={x} y={seg.segY} width={barW} height={seg.segH}
                        rx={si === segments.length - 1 ? 4 : si === 0 ? 0 : 0}
                        fill={seg.cat.color} opacity={isCurrentMonth ? 1 : 0.55} />
                    ))}
                    {/* Total label on top */}
                    {m.total > 0 && (
                      <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill={isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)"} fontSize="9" fontWeight="600" fontFamily="DM Sans, sans-serif">
                        {m.total >= 1000 ? `$${(m.total / 1000).toFixed(1)}k` : `$${Math.round(m.total)}`}
                      </text>
                    )}
                    {/* Month label */}
                    <text x={x + barW / 2} y={chartH - 8} textAnchor="middle" fill={isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)"} fontSize="10" fontWeight={isCurrentMonth ? "700" : "500"} fontFamily="DM Sans, sans-serif">
                      {m.label}
                    </text>
                  </g>
                );
              }

              // Single category view — simple bars
              return (
                <g key={m.key}>
                  <rect x={x} y={y} width={barW} height={barH} rx={4}
                    fill={isCurrentMonth ? "var(--accent)" : "var(--accent)"} opacity={isCurrentMonth ? 1 : 0.4} />
                  {m.total > 0 && (
                    <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill={isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)"} fontSize="9" fontWeight="600" fontFamily="DM Sans, sans-serif">
                      {fmt(m.total)}
                    </text>
                  )}
                  <text x={x + barW / 2} y={chartH - 8} textAnchor="middle" fill={isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)"} fontSize="10" fontWeight={isCurrentMonth ? "700" : "500"} fontFamily="DM Sans, sans-serif">
                    {m.label}
                  </text>
                </g>
              );
            })}

            {/* Average line (if we have prior data) */}
            {prevAvg > 0 && selectedCat === "all" && (() => {
              const avgY = pad.top + innerH - (prevAvg / maxVal) * innerH;
              return (
                <g>
                  <line x1={pad.left} y1={avgY} x2={pad.left + chartData.length * (barW + barGap) - barGap} y2={avgY}
                    stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6" />
                  <text x={pad.left + chartData.length * (barW + barGap) - barGap + 4} y={avgY + 3.5} fill="#3b82f6" fontSize="8.5" fontWeight="600" fontFamily="DM Sans, sans-serif">
                    avg
                  </text>
                </g>
              );
            })()}
          </svg>

          {/* Stacked bar legend — only in "all" view */}
          {selectedCat === "all" && (
            <div style={{ display: "flex", justifyContent: "center", gap: 14, paddingTop: 8, flexWrap: "wrap" }}>
              {catBreakdown.slice(0, 6).map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
                  onClick={() => setSelectedCat(c.id)}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: c.color }} />
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Category-by-category breakdown */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Category Breakdown" />
        <div style={{ padding: "0 20px 12px" }}>
          {catBreakdown.map((cat) => (
            <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
              onClick={() => setSelectedCat(cat.id === selectedCat ? "all" : cat.id)}>
              {/* Icon & name */}
              <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                {cat.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {fmt(cat.currentAmt)} this month
                  {cat.avg > 0 && ` · ${fmt(cat.avg)} avg`}
                </div>
              </div>

              {/* Sparkline */}
              <div style={{ flexShrink: 0, marginRight: 4 }}>
                <Sparkline data={cat.monthlyAmounts} color={cat.color} />
              </div>

              {/* Trend indicator */}
              <div style={{ textAlign: "right", minWidth: 56, flexShrink: 0 }}>
                {cat.avg > 0 ? (
                  <>
                    <div style={{
                      fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                      color: cat.delta > 10 ? "var(--red)" : cat.delta < -10 ? "var(--green)" : "var(--text-muted)",
                    }}>
                      {cat.delta >= 0 ? "+" : ""}{cat.delta.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>vs avg</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>new</div>
                )}
              </div>
            </div>
          ))}
          {catBreakdown.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No spending data yet
            </div>
          )}
        </div>
      </Card>

      {/* Month-over-month table */}
      <Card>
        <CardHeader title="Month-over-Month Detail" />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</th>
                {monthTotals.map((m) => (
                  <th key={m.key} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {m.label}
                  </th>
                ))}
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg</th>
              </tr>
            </thead>
            <tbody>
              {catBreakdown.map((cat) => (
                <tr key={cat.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                    <span style={{ marginRight: 6 }}>{cat.icon}</span>{cat.name}
                  </td>
                  {cat.monthlyAmounts.map((amt, i) => (
                    <td key={i} style={{
                      padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                      color: amt > 0 ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: i === cat.monthlyAmounts.length - 1 ? 600 : 400,
                    }}>
                      {amt > 0 ? fmt(amt) : "—"}
                    </td>
                  ))}
                  <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-muted)", fontWeight: 500 }}>
                    {cat.avg > 0 ? fmt(cat.avg) : "—"}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ borderTop: "2px solid var(--border)" }}>
                <td style={{ padding: "10px 16px", fontWeight: 700, color: "var(--text-primary)" }}>Total</td>
                {monthTotals.map((m) => (
                  <td key={m.key} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {m.total > 0 ? fmt(m.total) : "—"}
                  </td>
                ))}
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                  {prevAvg > 0 ? fmt(prevAvg) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Empty state hint */}
      {prevMonths.length === 0 && (
        <div style={{ marginTop: 20, padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto" }}>
            Add transactions across multiple months to see trends and comparisons. The more history you have, the more useful this page becomes.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MONTHLY SUMMARY PAGE
// ─────────────────────────────────────────────

function MonthlySummaryPage({ categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, settings }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const startDay = settings?.startDayOfMonth || 1;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const periodStartStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
  const periodEndDate = new Date(year, month + 1, startDay - 1);
  const periodEndStr = periodEndDate.toISOString().split("T")[0];
  const monthName = startDay === 1
    ? viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `${new Date(year, month, startDay).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${periodEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Filter transactions to period
  const monthTx = useMemo(() => {
    if (startDay === 1) return transactions.filter((t) => t.date.startsWith(monthKey));
    return transactions.filter((t) => t.date >= periodStartStr && t.date <= periodEndStr);
  }, [transactions, monthKey, startDay, periodStartStr, periodEndStr]);
  const totalSpent = monthTx.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, i) => {
    if (!i.recurring) return s + i.amount;
    switch (i.frequency) {
      case "weekly": return s + i.amount * 52 / 12;
      case "biweekly": return s + i.amount * 26 / 12;
      case "semimonthly": return s + i.amount * 2;
      case "monthly": return s + i.amount;
      case "quarterly": return s + i.amount / 3;
      case "yearly": return s + i.amount / 12;
      default: return s + i.amount;
    }
  }, 0);
  const monthBills = generateBillInstances(billTemplates, year, month);
  const billsTotal = monthBills.reduce((s, b) => s + b.amount, 0);
  const billsPaid = monthBills.filter((b) => paidDates.has(b.instanceKey)).length;
  const savingsMonthly = savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0);
  const debtPayments = debts.reduce((s, d) => s + d.minPayment, 0);

  // Spending by category
  const catSpending = categories.map((c) => ({
    ...c,
    spent: monthTx.filter((t) => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0),
  })).filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);

  const surplus = totalIncome - totalSpent - savingsMonthly - debtPayments;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Monthly Summary</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>How did the month go?</p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 24 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{monthName}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Income vs Outflow */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Cash Flow</span>
            <span style={{
              fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums",
              color: surplus >= 0 ? "var(--green)" : "var(--red)",
            }}>{surplus >= 0 ? "+" : ""}{fmt(surplus)} {surplus >= 0 ? "surplus" : "deficit"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Money In</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalIncome)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Money Out</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalSpent + savingsMonthly + debtPayments)}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 12 }}>
                <span>Spending {fmt(totalSpent)}</span>
                <span>Savings {fmt(savingsMonthly)}</span>
                <span>Debt {fmt(debtPayments)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <MetricBox label="Bills" value={`${billsPaid}/${monthBills.length}`} sub={`${fmt(billsTotal)} total`} accent={billsPaid === monthBills.length ? "var(--green)" : "var(--amber)"} />
        <MetricBox label="Savings" value={fmt(savingsMonthly)} sub={`${savingsGoals.filter((g) => g.monthlyContribution > 0).length} goals`} accent="var(--accent)" />
        <MetricBox label="Debt Payments" value={fmt(debtPayments)} sub={`${debts.filter((d) => d.balance > 0).length} active debts`} accent="var(--amber)" />
        <MetricBox label="Spending" value={fmt(totalSpent)} sub={`${monthTx.length} transactions`} accent="var(--red)" />
      </div>

      {/* Spending by category */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Spending by Category" />
        <div style={{ padding: "0 20px 16px" }}>
          {catSpending.map((c) => (
            <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{c.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(c.spent)}</span>
                  <span style={{ fontSize: 12, color: c.spent > c.limit ? "var(--red)" : "var(--text-muted)", fontWeight: c.spent > c.limit ? 600 : 400, fontVariantNumeric: "tabular-nums" }}>
                    / {fmt(c.limit)}
                  </span>
                </div>
              </div>
              <ProgressBar value={c.spent} max={c.limit} height={5} />
            </div>
          ))}
        </div>
      </Card>

      {/* Allocation breakdown with donut */}
      <Card>
        <CardHeader title="Where Your Money Went" />
        <div style={{ padding: "0 20px 20px" }}>
          {(() => {
            const rows = [
              { label: "Spending", amount: totalSpent, color: "var(--red)" },
              { label: "Bills", amount: billsTotal, color: "var(--amber)" },
              { label: "Savings", amount: savingsMonthly, color: "var(--accent)" },
              { label: "Debt Payments", amount: debtPayments, color: "#38bdf8" },
              { label: surplus >= 0 ? "Surplus" : "Deficit", amount: Math.abs(surplus), color: surplus >= 0 ? "var(--green)" : "#f87171" },
            ].filter((r) => r.amount > 0);
            const total = rows.reduce((s, r) => s + r.amount, 0);
            if (total === 0) return <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No data this month</div>;

            // SVG donut
            const r = 52, cx = 64, cy = 64, circ = 2 * Math.PI * r;
            let cumPct = 0;
            const segments = rows.map((row) => {
              const pct = row.amount / total;
              const arc = circ * pct;
              const offset = -(circ * cumPct);
              cumPct += pct;
              return { ...row, arc, offset, pct };
            });

            return (
              <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                {/* Donut */}
                <div style={{ flexShrink: 0 }}>
                  <svg width={128} height={128} viewBox="0 0 128 128">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--track)" strokeWidth={18} />
                    {segments.map((seg, i) => (
                      <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                        stroke={seg.color} strokeWidth={18}
                        strokeDasharray={`${seg.arc} ${circ}`}
                        strokeDashoffset={seg.offset}
                        style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
                    ))}
                    <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontWeight="700" fontFamily="DM Sans, sans-serif">{fmt(total).replace("$", "$")}</text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans, sans-serif">out</text>
                  </svg>
                </div>
                {/* Legend */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  {rows.map((row) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(row.amount)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 34, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {((row.amount / total) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </Card>
      {/* Year-in-Review */}
      {(() => {
        const yearTx = transactions.filter((t) => t.date.startsWith(`${year}-`));
        if (yearTx.length === 0) return null;
        const yearIncome = income.reduce((s, i) => {
          if (!i.recurring) return s + i.amount;
          switch (i.frequency) {
            case "weekly": return s + i.amount * 52;
            case "biweekly": return s + i.amount * 26;
            case "semimonthly": return s + i.amount * 24;
            case "monthly": return s + i.amount * 12;
            case "quarterly": return s + i.amount * 4;
            case "yearly": return s + i.amount;
            default: return s + i.amount * 12;
          }
        }, 0);
        const yearSpent = yearTx.reduce((s, t) => s + t.amount, 0);
        const savingsRate = yearIncome > 0 ? Math.max(0, ((yearIncome - yearSpent) / yearIncome) * 100) : 0;
        // Top category this year
        const catTotals = {};
        yearTx.forEach((t) => { catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount; });
        const topCatId = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topCat = categories.find((c) => c.id === topCatId);
        const topCatAmt = catTotals[topCatId] || 0;
        // Monthly breakdown
        const months = [];
        for (let m = 0; m < 12; m++) {
          const mk = `${year}-${String(m + 1).padStart(2, "0")}`;
          const mTx = yearTx.filter((t) => t.date.startsWith(mk));
          months.push({ label: new Date(year, m, 1).toLocaleDateString("en-US", { month: "short" }), total: mTx.reduce((s, t) => s + t.amount, 0), count: mTx.length });
        }
        const maxMonthly = Math.max(...months.map((m) => m.total), 1);
        const bestMonth = [...months].sort((a, b) => a.total - b.total)[0];
        const worstMonth = [...months].sort((a, b) => b.total - a.total)[0];
        return (
          <Card style={{ marginTop: 20 }}>
            <CardHeader title={`${year} Year in Review`} action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>{yearTx.length} transactions</span>} />
            <div style={{ padding: "0 20px 20px" }}>
              {/* Key stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
                <div style={{ padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>Total Spent</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(yearSpent)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmt(yearSpent / 12)}/mo avg</div>
                </div>
                <div style={{ padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>Savings Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: savingsRate >= 20 ? "var(--green)" : savingsRate >= 10 ? "var(--amber)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>{savingsRate.toFixed(0)}%</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{savingsRate >= 20 ? "Great!" : savingsRate >= 10 ? "Good" : "Room to grow"}</div>
                </div>
                {topCat && (
                  <div style={{ padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>Top Category</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{topCat.icon} {topCat.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmt(topCatAmt)} · {((topCatAmt / yearSpent) * 100).toFixed(0)}% of spend</div>
                  </div>
                )}
                <div style={{ padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>Best Month</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{bestMonth.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmt(bestMonth.total)} spent</div>
                </div>
              </div>

              {/* Monthly bar chart */}
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 10 }}>Monthly Spending</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                {months.map((m, i) => {
                  const h = Math.round((m.total / maxMonthly) * 68);
                  const isCurrent = i === month;
                  const isWorst = m.label === worstMonth.label && m.total > 0;
                  return (
                    <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      {m.total > 0 && <div style={{ fontSize: 8, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{m.total >= 1000 ? `${(m.total/1000).toFixed(0)}k` : Math.round(m.total)}</div>}
                      <div style={{ width: "100%", height: Math.max(h, m.total > 0 ? 3 : 1), borderRadius: "3px 3px 0 0", background: isWorst ? "var(--red)" : isCurrent ? "var(--accent)" : "var(--border-hover)", transition: "height 0.4s" }} />
                      <div style={{ fontSize: 8, color: isCurrent ? "var(--accent)" : "var(--text-muted)", fontWeight: isCurrent ? 700 : 400 }}>{m.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
// ─────────────────────────────────────────────

function NotificationsSettings({ settings, setSettings }) {
  const [notifStatus, setNotifStatus] = useState(() => {
    if (typeof Notification === "undefined") return "unavailable";
    return Notification.permission;
  });
  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifStatus(result);
    if (result === "granted") {
      new Notification("MaverickOS Notifications Enabled", {
        body: "You'll be reminded about upcoming bills and budget alerts.",
        icon: "/icon-192.png",
      });
    }
  };
  const notifPrefs = settings.notifications || {};
  const togglePref = (key) => setSettings((s) => ({ ...s, notifications: { ...(s.notifications || {}), [key]: !(s.notifications || {})[key] } }));
  if (notifStatus === "unavailable") {
    return <div style={{ padding: "12px 20px 16px", fontSize: 13, color: "var(--text-muted)" }}>Notifications are not supported in this browser.</div>;
  }
  return (
    <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {notifStatus !== "granted" ? (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Enable Push Notifications</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Get reminders for bills, budget alerts, and monthly recaps</div>
          </div>
          <button onClick={requestPermission} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Enable</button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>✓ Notifications enabled</div>
      )}
      {[
        { key: "billsDue", label: "Bills Due Soon", desc: "Reminder 3 days before a bill is due" },
        { key: "budgetAlert", label: "Budget Alerts", desc: "When a category reaches 80% of its limit" },
        { key: "monthlyRecap", label: "Monthly Recap", desc: "Summary on the 1st of each month" },
        { key: "savingsGoal", label: "Savings Milestones", desc: "When you hit a savings goal target" },
      ].map(({ key, label, desc }) => (
        <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{label}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{desc}</div>
          </div>
          <div onClick={() => togglePref(key)} style={{ width: 40, height: 22, borderRadius: 11, padding: 2, background: notifPrefs[key] ? "var(--accent)" : "var(--track)", transition: "background 0.2s", display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "transform 0.2s", transform: notifPrefs[key] ? "translateX(18px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Notifications fire when the app is open or installed as a PWA on your device.</div>
    </div>
  );
}

function SettingsPage({ settings, setSettings, onExport, onExportCsv, onImport, onImportCsv, onReset, onRestartWizard }) {
  const fileRef = useRef(null);
  const csvRef = useRef(null);
  const hiddenPages = settings.hiddenPages || [];
  const dashWidgets = settings.dashboardWidgets || DEFAULT_SETTINGS.dashboardWidgets;

  const togglePage = (pageId) => {
    setSettings((s) => {
      const hidden = s.hiddenPages || [];
      return { ...s, hiddenPages: hidden.includes(pageId) ? hidden.filter((p) => p !== pageId) : [...hidden, pageId] };
    });
  };

  const toggleWidget = (widgetId) => {
    setSettings((s) => {
      const w = s.dashboardWidgets || DEFAULT_SETTINGS.dashboardWidgets;
      return { ...s, dashboardWidgets: w.includes(widgetId) ? w.filter((id) => id !== widgetId) : [...w, widgetId] };
    });
  };

  const toggleablePages = NAV_ITEMS.filter((p) => p.id !== "dashboard" && p.id !== "settings");

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Customize your experience</p>
      </div>

      {/* Household */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Household" />
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <FieldLabel>Household Name</FieldLabel>
            <input value={settings.householdName} onChange={(e) => setSettings((s) => ({ ...s, householdName: e.target.value }))} style={INPUT_STYLE} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Currency</FieldLabel>
              <select value={settings.currency || "USD"} onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                {[
                  ["USD", "USD — US Dollar ($)"],
                  ["EUR", "EUR — Euro (€)"],
                  ["GBP", "GBP — British Pound (£)"],
                  ["CAD", "CAD — Canadian Dollar ($)"],
                  ["AUD", "AUD — Australian Dollar ($)"],
                  ["JPY", "JPY — Japanese Yen (¥)"],
                  ["MXN", "MXN — Mexican Peso ($)"],
                  ["INR", "INR — Indian Rupee (₹)"],
                  ["BRL", "BRL — Brazilian Real (R$)"],
                  ["CHF", "CHF — Swiss Franc (Fr)"],
                  ["KRW", "KRW — South Korean Won (₩)"],
                  ["SGD", "SGD — Singapore Dollar ($)"],
                ].map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Budget Period Start Day</FieldLabel>
              <select value={settings.startDayOfMonth || 1} onChange={(e) => setSettings((s) => ({ ...s, startDayOfMonth: parseInt(e.target.value) }))} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                {[1, 5, 10, 15, 20, 25].map((d) => (
                  <option key={d} value={d}>{d === 1 ? `1st (calendar month)` : `${d}th of the month`}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {(() => {
                  const d = settings.startDayOfMonth || 1;
                  const ord = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
                  return `Budget period: ${ord(d)} → ${d === 1 ? "last day" : ord(d - 1)} of the month`;
                })()}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Appearance — Dark / Light toggle */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Appearance" />
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { key: "dark", label: "Dark", icon: "🌙" },
              { key: "light", label: "Light", icon: "☀" },
            ].map((mode) => {
              const active = (settings.theme || "dark") === mode.key;
              return (
                <div key={mode.key} onClick={() => setSettings((s) => ({ ...s, theme: mode.key }))}
                  style={{
                    flex: 1, padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent)" + "10" : "var(--surface)",
                    transition: "all 0.15s", textAlign: "center",
                  }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{mode.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {mode.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Color Theme */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Color Theme" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Changes apply instantly</span>} />
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {Object.entries(COLOR_THEMES).map(([key, theme]) => {
              const active = (settings.colorTheme || "blue_gold") === key;
              return (
                <div key={key} onClick={() => setSettings((s) => ({ ...s, colorTheme: key }))}
                  style={{
                    padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent)" + "10" : "var(--surface)",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {theme.preview.map((color, i) => (
                      <span key={i} style={{ width: 16, height: 16, borderRadius: 4, background: color, border: "1px solid rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {theme.label}
                  </div>
                  {active && (
                    <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Page Visibility */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Pages" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Toggle pages on/off</span>} />
        <div style={{ padding: "0 12px 12px" }}>
          {toggleablePages.map((page) => {
            const enabled = !hiddenPages.includes(page.id);
            return (
              <div key={page.id} onClick={() => togglePage(page.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  background: enabled ? "transparent" : "var(--surface)",
                  opacity: enabled ? 1 : 0.5,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "flex", color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{page.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{page.label}</span>
                </div>
                <div style={{
                  width: 40, height: 22, borderRadius: 11, padding: 2,
                  background: enabled ? "var(--green)" : "var(--track)",
                  transition: "background 0.2s", display: "flex", alignItems: "center",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, background: "#fff",
                    transition: "transform 0.2s", transform: enabled ? "translateX(18px)" : "translateX(0)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Dashboard Widgets */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Dashboard Widgets" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Choose what shows on Dashboard</span>} />
        <div style={{ padding: "0 12px 12px" }}>
          {DASHBOARD_WIDGETS.map((widget) => {
            const enabled = dashWidgets.includes(widget.id);
            return (
              <div key={widget.id} onClick={() => toggleWidget(widget.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  opacity: enabled ? 1 : 0.5,
                }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{widget.label}</span>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: enabled ? "none" : "2px solid var(--border-hover)",
                  background: enabled ? "var(--accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {enabled && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Data */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Data Management" />
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onExport} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Backup (JSON)
            </button>
            <button onClick={onExportCsv} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Transactions (CSV)
            </button>
            <button onClick={() => fileRef.current?.click()} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import Backup (JSON)
            </button>
            <button onClick={() => csvRef.current?.click()} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import Transactions (CSV)
            </button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => { onImport(ev.target.result); };
              reader.readAsText(file);
              e.target.value = "";
            }} />
            <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => { onImportCsv && onImportCsv(ev.target.result); };
              reader.readAsText(file);
              e.target.value = "";
            }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>JSON backup saves everything and can be fully restored. CSV export/import works with transactions — columns: Date, Description, Category, Amount.</div>
        </div>
      </Card>

      {/* Notifications */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Notifications & Reminders" />
        <NotificationsSettings settings={settings} setSettings={setSettings} />
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader title="Danger Zone" />
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Restart Setup Wizard</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Clear your data and start fresh with the onboarding flow.</div>
              </div>
              <button onClick={onRestartWizard} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid var(--accent)",
                background: "transparent", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Restart</button>
            </div>
          </div>
          <div style={{ padding: "16px", borderRadius: 10, border: "1px solid var(--red)33", background: "var(--red-bg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Reset All Data</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Restore default sample data. This cannot be undone.</div>
              </div>
              <button onClick={onReset} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid var(--red)",
                background: "transparent", color: "var(--red)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Reset</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// RECURRING TRANSACTIONS PAGE (Auto-Spend)
// ─────────────────────────────────────────────

function RecurringTransactionsPage({ recurringTransactions, setRecurringTransactions, categories, transactions, setTransactions, showUndo }) {
  const [modal, setModal] = useState(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());

  const catMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => { map[c.id] = c; });
    return map;
  }, [categories]);

  // Pattern detection — find transactions that appear in 2+ months with consistent amounts
  const suggestions = useMemo(() => {
    if (transactions.length < 4) return [];
    const groups = {};
    transactions.forEach((t) => {
      const key = `${t.categoryId}||${t.description.toLowerCase().trim()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    const results = [];
    Object.entries(groups).forEach(([key, txs]) => {
      if (txs.length < 2) return;
      const months = [...new Set(txs.map((t) => t.date.substring(0, 7)))].sort();
      if (months.length < 2) return;
      const amounts = txs.map((t) => t.amount);
      const avgAmt = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const maxDev = Math.max(...amounts.map((a) => Math.abs(a - avgAmt) / avgAmt));
      if (maxDev > 0.1) return;
      const [catId, desc] = key.split("||");
      const alreadyTracked = recurringTransactions.some(
        (rt) => rt.categoryId === catId && rt.description.toLowerCase().trim() === desc
      );
      if (alreadyTracked) return;
      results.push({
        id: key, description: txs[0].description, categoryId: catId,
        amount: Math.round(avgAmt * 100) / 100, frequency: "monthly",
        monthCount: months.length, lastSeen: months[months.length - 1],
      });
    });
    return results.sort((a, b) => b.monthCount - a.monthCount).slice(0, 6);
  }, [transactions, recurringTransactions]);

  const visibleSuggestions = suggestions.filter((s) => !dismissedSuggestions.has(s.id));

  const addFromSuggestion = (s) => {
    const today = new Date().toISOString().split("T")[0];
    setRecurringTransactions((prev) => [...prev, {
      id: nextId(), description: s.description, amount: s.amount,
      categoryId: s.categoryId, frequency: s.frequency, anchorDate: today, active: true,
    }]);
    setDismissedSuggestions((prev) => new Set([...prev, s.id]));
  };

  const dismissSuggestion = (id) => setDismissedSuggestions((prev) => new Set([...prev, id]));

  // Monthly cost equivalent
  const monthlyEquiv = (rt) => {
    switch (rt.frequency) {
      case "weekly": return rt.amount * 52 / 12;
      case "biweekly": return rt.amount * 26 / 12;
      case "monthly": return rt.amount;
      case "quarterly": return rt.amount / 3;
      case "yearly": return rt.amount / 12;
      default: return rt.amount;
    }
  };

  const activeTemplates = recurringTransactions.filter((rt) => rt.active);
  const inactiveTemplates = recurringTransactions.filter((rt) => !rt.active);
  const totalMonthly = activeTemplates.reduce((s, rt) => s + monthlyEquiv(rt), 0);
  const totalYearly = totalMonthly * 12;

  // Next occurrence for a template
  const getNextDate = (rt) => {
    const now = new Date();
    const anchor = new Date(rt.anchorDate + "T00:00:00");
    if (rt.frequency === "monthly") {
      const day = anchor.getDate();
      let next = new Date(now.getFullYear(), now.getMonth(), day);
      if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, day);
      return next;
    }
    if (rt.frequency === "weekly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getTime() + 7 * 86400000);
      return cur;
    }
    if (rt.frequency === "biweekly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getTime() + 14 * 86400000);
      return cur;
    }
    if (rt.frequency === "quarterly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getFullYear(), cur.getMonth() + 3, cur.getDate());
      return cur;
    }
    if (rt.frequency === "yearly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getFullYear() + 1, cur.getMonth(), cur.getDate());
      return cur;
    }
    return now;
  };

  // Check if a recurring transaction has already been logged this period
  const isLoggedThisPeriod = (rt) => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return transactions.some((t) =>
      t.categoryId === rt.categoryId &&
      t.description === rt.description &&
      Math.abs(t.amount - rt.amount) < 0.01 &&
      t.date.startsWith(monthKey)
    );
  };

  // Log a recurring transaction as a real transaction now
  const handleLogNow = (rt) => {
    const today = new Date().toISOString().split("T")[0];
    setTransactions((prev) => [...prev, {
      id: nextId(),
      categoryId: rt.categoryId,
      description: rt.description,
      amount: rt.amount,
      date: today,
    }]);
  };

  // Log all active un-logged templates at once
  const handleLogAll = () => {
    const today = new Date().toISOString().split("T")[0];
    const toLog = activeTemplates.filter((rt) => !isLoggedThisPeriod(rt));
    if (toLog.length === 0) return;
    setTransactions((prev) => [
      ...prev,
      ...toLog.map((rt) => ({
        id: nextId(),
        categoryId: rt.categoryId,
        description: rt.description,
        amount: rt.amount,
        date: today,
      })),
    ]);
  };

  const toggleActive = (id) => {
    setRecurringTransactions((prev) => prev.map((rt) => rt.id === id ? { ...rt, active: !rt.active } : rt));
  };

  const deleteTemplate = (id) => {
    const rt = recurringTransactions.find((r) => r.id === id);
    if (showUndo && rt) showUndo(`Deleted "${rt.description}"`);
    setRecurringTransactions((prev) => prev.filter((rt) => rt.id !== id));
  };

  const saveTemplate = (template) => {
    setRecurringTransactions((prev) => {
      const exists = prev.find((rt) => rt.id === template.id);
      if (exists) return prev.map((rt) => rt.id === template.id ? template : rt);
      return [...prev, template];
    });
    setModal(null);
  };

  const unloggedCount = activeTemplates.filter((rt) => !isLoggedThisPeriod(rt)).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Recurring Transactions</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Auto-log regular spending — subscriptions, memberships, and habits</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unloggedCount > 0 && (
            <button onClick={handleLogAll} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Log All ({unloggedCount})
            </button>
          )}
          <button onClick={() => setModal({ type: "add" })} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Add Template
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetricBox label="Monthly Auto-Spend" value={fmt(totalMonthly)} sub={`${activeTemplates.length} active`} accent="var(--accent)" />
        <MetricBox label="Yearly Total" value={fmt(totalYearly)} sub="projected" accent="var(--text-secondary)" />
        <MetricBox label="Unlogged" value={unloggedCount} sub="this month" accent={unloggedCount > 0 ? "var(--amber)" : "var(--green)"} />
        <MetricBox label="Templates" value={recurringTransactions.length} sub={`${inactiveTemplates.length} paused`} accent="var(--text-muted)" />
      </div>

      {/* Pattern detection suggestions */}
      {visibleSuggestions.length > 0 && (
        <Card style={{ marginBottom: 20, border: "1px solid var(--amber)", background: "var(--amber-bg)" }}>
          <CardHeader title={`Detected Patterns — ${visibleSuggestions.length} suggestion${visibleSuggestions.length !== 1 ? "s" : ""}`} />
          <div style={{ padding: "0 20px 16px", fontSize: 13, color: "var(--text-muted)", marginTop: -4, marginBottom: 8 }}>
            These transactions appear every month. Add them as templates?
          </div>
          <div>
            {visibleSuggestions.map((s) => {
              const cat = catMap[s.categoryId];
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderTop: "1px solid var(--border-subtle)" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    {cat?.icon || "●"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{s.description}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      {cat?.name || "Unknown"} · seen {s.monthCount} months · last {s.lastSeen}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{fmt(s.amount)}</span>
                  <button onClick={() => addFromSuggestion(s)}
                    style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    Track
                  </button>
                  <button onClick={() => dismissSuggestion(s.id)}
                    style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Active templates */}
      {activeTemplates.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="Active" action={
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalMonthly)}/mo</span>
          } />
          <div>
            {activeTemplates.map((rt) => {
              const cat = catMap[rt.categoryId];
              const logged = isLoggedThisPeriod(rt);
              const nextDate = getNextDate(rt);
              return (
                <SwipeToDelete key={rt.id} onDelete={() => deleteTemplate(rt.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                    {/* Category icon */}
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      {cat?.icon || "●"}
                    </span>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{rt.description}</span>
                        <FrequencyBadge frequency={rt.frequency} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {cat?.name || "Unknown"} · Next: {nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>

                    {/* Amount + actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(rt.amount)}</span>
                      {logged ? (
                        <span style={{ padding: "3px 8px", borderRadius: 6, background: "var(--green-bg)", color: "var(--green)", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Logged</span>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); handleLogNow(rt); }}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          Log
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setModal({ type: "edit", template: rt }); }}
                        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleActive(rt.id); }}
                        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                        Pause
                      </button>
                    </div>
                  </div>
                </SwipeToDelete>
              );
            })}
          </div>
        </Card>
      )}

      {/* Inactive / Paused templates */}
      {inactiveTemplates.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="Paused" />
          <div>
            {inactiveTemplates.map((rt) => {
              const cat = catMap[rt.categoryId];
              return (
                <SwipeToDelete key={rt.id} onDelete={() => deleteTemplate(rt.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", opacity: 0.5 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      {cat?.icon || "●"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{rt.description}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{cat?.name || "Unknown"} · {fmt(rt.amount)} · {FREQUENCY_LABELS[rt.frequency]}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => toggleActive(rt.id)}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        Resume
                      </button>
                      <button onClick={() => setModal({ type: "edit", template: rt })}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                        Edit
                      </button>
                    </div>
                  </div>
                </SwipeToDelete>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {recurringTransactions.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>↻</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>No recurring transactions yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 400, margin: "0 auto" }}>
            Add templates for subscriptions, memberships, and regular spending. Log them each month with one tap.
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modal?.type === "add" || modal?.type === "edit") && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={modal.type === "add" ? "Add Recurring Transaction" : "Edit Recurring Transaction"}>
            <RecurringTransactionFields
              categories={categories}
              existing={modal.type === "edit" ? modal.template : null}
              onSubmit={saveTemplate}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}
    </div>
  );
}

function RecurringTransactionFields({ categories, existing, onSubmit, onClose }) {
  const [form, setForm] = useState({
    description: existing?.description || "",
    amount: existing ? String(existing.amount) : "",
    categoryId: existing?.categoryId || categories[0]?.id || "",
    frequency: existing?.frequency || "monthly",
    anchorDate: existing?.anchorDate || new Date().toISOString().split("T")[0],
    active: existing?.active ?? true,
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canSubmit = form.description.trim() && parseFloat(form.amount) > 0 && form.categoryId && form.anchorDate;

  const handleSave = () => {
    if (!canSubmit) return;
    onSubmit({
      id: existing?.id || nextId(),
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      categoryId: form.categoryId,
      frequency: form.frequency,
      anchorDate: form.anchorDate,
      active: form.active,
    });
  };

  // Monthly equivalent preview
  const monthlyEq = (() => {
    const amt = parseFloat(form.amount) || 0;
    switch (form.frequency) {
      case "weekly": return amt * 52 / 12;
      case "biweekly": return amt * 26 / 12;
      case "monthly": return amt;
      case "quarterly": return amt / 3;
      case "yearly": return amt / 12;
      default: return amt;
    }
  })();

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Description</FieldLabel>
          <input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="e.g. Netflix, Gym, Weekly groceries" style={INPUT_STYLE} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Amount ($)</FieldLabel>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Frequency</FieldLabel>
            <select value={form.frequency} onChange={(e) => update("frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="semimonthly">1st & 15th</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <FieldLabel>Start Date</FieldLabel>
            <input type="date" value={form.anchorDate} onChange={(e) => update("anchorDate", e.target.value)} style={INPUT_STYLE} />
          </div>
        </div>
        {parseFloat(form.amount) > 0 && form.frequency !== "monthly" && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
            ≈ {fmt(monthlyEq)} per month · {fmt(monthlyEq * 12)} per year
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label={existing ? "Save" : "Add Template"} onSubmit={handleSave} />
    </>
  );
}

// ─────────────────────────────────────────────
// BUDGET TARGETS PAGE (YNAB-Style)
// ─────────────────────────────────────────────

const TARGET_TYPES = [
  { id: "monthly", label: "Monthly Limit", desc: "Spend up to this amount each month", icon: "📅" },
  { id: "target_by_date", label: "Target by Date", desc: "Save a total amount by a specific date", icon: "🎯" },
  { id: "weekly", label: "Weekly Limit", desc: "Spend up to this amount each week", icon: "🗓" },
];

function getTargetStatus(target, spent, category) {
  if (!target) {
    // Fallback to category limit
    const ratio = category.limit > 0 ? spent / category.limit : 0;
    return { monthlyNeeded: category.limit, progress: ratio, status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track", label: "Monthly Limit" };
  }

  const now = new Date();

  switch (target.type) {
    case "monthly": {
      const limit = target.monthlyAmount || category.limit;
      const ratio = limit > 0 ? spent / limit : 0;
      return {
        monthlyNeeded: limit,
        progress: ratio,
        status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track",
        label: "Monthly Limit",
        effectiveLimit: limit,
      };
    }
    case "target_by_date": {
      const funded = target.funded || 0;
      const goalAmt = target.targetAmount || 0;
      const deadline = new Date(target.targetDate + "T00:00:00");
      const monthsLeft = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()));
      const remaining = Math.max(goalAmt - funded, 0);
      const monthlyNeeded = remaining / monthsLeft;
      const goalProgress = goalAmt > 0 ? funded / goalAmt : 0;
      const isPastDue = deadline < now;
      const isComplete = funded >= goalAmt;
      return {
        monthlyNeeded: Math.ceil(monthlyNeeded * 100) / 100,
        progress: goalProgress,
        status: isComplete ? "complete" : isPastDue ? "over" : goalProgress >= (1 - 1 / Math.max(monthsLeft, 1)) ? "on_track" : "behind",
        label: "Target by Date",
        effectiveLimit: monthlyNeeded,
        funded,
        goalAmt,
        deadline: target.targetDate,
        monthsLeft,
        remaining,
        isComplete,
      };
    }
    case "weekly": {
      const weeklyLimit = target.weeklyAmount || 0;
      const monthlyEquiv = weeklyLimit * 52 / 12;
      const ratio = monthlyEquiv > 0 ? spent / monthlyEquiv : 0;
      return {
        monthlyNeeded: monthlyEquiv,
        progress: ratio,
        status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track",
        label: "Weekly Limit",
        effectiveLimit: monthlyEquiv,
        weeklyAmount: weeklyLimit,
      };
    }
    default: {
      const limit = category.limit;
      const ratio = limit > 0 ? spent / limit : 0;
      return { monthlyNeeded: limit, progress: ratio, status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track", label: "Monthly Limit", effectiveLimit: limit };
    }
  }
}

function TargetStatusBadge({ status }) {
  const config = {
    on_track: { bg: "var(--green-bg)", fg: "var(--green)", text: "On Track" },
    warning: { bg: "var(--amber-bg)", fg: "var(--amber)", text: "Warning" },
    over: { bg: "var(--red-bg)", fg: "var(--red)", text: "Over" },
    behind: { bg: "var(--amber-bg)", fg: "var(--amber)", text: "Behind" },
    complete: { bg: "var(--green-bg)", fg: "var(--green)", text: "Complete" },
  }[status] || { bg: "var(--green-bg)", fg: "var(--green)", text: "OK" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 999, background: config.bg, color: config.fg,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: config.fg }} />
      {config.text}
    </span>
  );
}

function EditTargetFields({ category, target, onSubmit, onClose }) {
  const existing = target || { type: "monthly", monthlyAmount: category.limit };
  const [type, setType] = useState(existing.type || "monthly");
  const [monthlyAmount, setMonthlyAmount] = useState(String(existing.monthlyAmount || category.limit || ""));
  const [targetAmount, setTargetAmount] = useState(String(existing.targetAmount || ""));
  const [targetDate, setTargetDate] = useState(existing.targetDate || "2026-12-31");
  const [funded, setFunded] = useState(String(existing.funded || "0"));
  const [weeklyAmount, setWeeklyAmount] = useState(String(existing.weeklyAmount || ""));

  const canSubmit = (() => {
    if (type === "monthly") return parseFloat(monthlyAmount) > 0;
    if (type === "target_by_date") return parseFloat(targetAmount) > 0 && targetDate;
    if (type === "weekly") return parseFloat(weeklyAmount) > 0;
    return false;
  })();

  const handleSave = () => {
    if (!canSubmit) return;
    let result;
    switch (type) {
      case "monthly":
        result = { type: "monthly", monthlyAmount: parseFloat(monthlyAmount) };
        break;
      case "target_by_date":
        result = { type: "target_by_date", targetAmount: parseFloat(targetAmount), targetDate, funded: parseFloat(funded) || 0 };
        break;
      case "weekly":
        result = { type: "weekly", weeklyAmount: parseFloat(weeklyAmount) };
        break;
      default: return;
    }
    onSubmit(category.id, result);
  };

  // Calculate preview for target_by_date
  const previewMonthly = (() => {
    if (type !== "target_by_date") return null;
    const goal = parseFloat(targetAmount) || 0;
    const f = parseFloat(funded) || 0;
    const deadline = new Date(targetDate + "T00:00:00");
    const now = new Date();
    const monthsLeft = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()));
    const remaining = Math.max(goal - f, 0);
    return { monthlyNeeded: remaining / monthsLeft, monthsLeft, remaining };
  })();

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Type selector */}
        <div>
          <FieldLabel>Target Type</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {TARGET_TYPES.map((tt) => (
              <div key={tt.id} onClick={() => setType(tt.id)}
                style={{
                  padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${type === tt.id ? "var(--accent)" : "var(--border)"}`,
                  background: type === tt.id ? "var(--accent)" + "10" : "transparent",
                  transition: "all 0.15s",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{tt.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: type === tt.id ? "var(--text-primary)" : "var(--text-secondary)" }}>{tt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{tt.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fields based on type */}
        {type === "monthly" && (
          <div>
            <FieldLabel>Monthly Limit ($)</FieldLabel>
            <input type="number" step="1" min="0" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} placeholder="0" style={INPUT_STYLE} />
          </div>
        )}

        {type === "target_by_date" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>Target Amount ($)</FieldLabel>
                <input type="number" step="1" min="0" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0" style={INPUT_STYLE} />
              </div>
              <div>
                <FieldLabel>Target Date</FieldLabel>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={INPUT_STYLE} />
              </div>
            </div>
            <div>
              <FieldLabel>Already Funded ($)</FieldLabel>
              <input type="number" step="1" min="0" value={funded} onChange={(e) => setFunded(e.target.value)} placeholder="0" style={INPUT_STYLE} />
            </div>
            {previewMonthly && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>To reach your goal:</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(previewMonthly.monthlyNeeded)}<span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>/mo</span>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {fmt(previewMonthly.remaining)} left · {previewMonthly.monthsLeft} month{previewMonthly.monthsLeft !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {type === "weekly" && (
          <div>
            <FieldLabel>Weekly Limit ($)</FieldLabel>
            <input type="number" step="1" min="0" value={weeklyAmount} onChange={(e) => setWeeklyAmount(e.target.value)} placeholder="0" style={INPUT_STYLE} />
            {parseFloat(weeklyAmount) > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                ≈ {fmt(parseFloat(weeklyAmount) * 52 / 12)} per month
              </div>
            )}
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Save Target" onSubmit={handleSave} />
    </>
  );
}

function FundTargetFields({ category, target, onSubmit, onClose }) {
  const [amount, setAmount] = useState("");
  const remaining = (target?.targetAmount || 0) - (target?.funded || 0);
  const canSubmit = parseFloat(amount) > 0;
  const quickAmounts = [25, 50, 100, 250].filter((a) => a <= remaining + 10);

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Progress</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {fmt(target?.funded || 0)} of {fmt(target?.targetAmount || 0)}
            </span>
          </div>
          <ProgressBar value={target?.funded || 0} max={target?.targetAmount || 1} color="var(--accent)" height={6} />
          <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {fmt(remaining)} remaining
          </div>
        </div>
        <div>
          <FieldLabel>Fund Amount ($)</FieldLabel>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
        </div>
        {quickAmounts.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {quickAmounts.map((qa) => (
              <button key={qa} onClick={() => setAmount(String(qa))}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)", background: parseFloat(amount) === qa ? "var(--accent)" : "transparent",
                  color: parseFloat(amount) === qa ? "#fff" : "var(--text-secondary)", transition: "all 0.15s",
                }}>
                ${qa}
              </button>
            ))}
            {remaining > 0 && (
              <button onClick={() => setAmount(String(remaining))}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)", background: parseFloat(amount) === remaining ? "var(--green)" : "transparent",
                  color: parseFloat(amount) === remaining ? "#fff" : "var(--text-secondary)", transition: "all 0.15s",
                }}>
                Fill
              </button>
            )}
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Add Funds"
        onSubmit={() => { if (canSubmit) onSubmit(category.id, parseFloat(amount)); }} />
    </>
  );
}

// ─────────────────────────────────────────────
// BUDGET PAGE
// ─────────────────────────────────────────────

function CategoryCard({ category, transactions, onExpand, isExpanded, onEditTarget, onFundTarget, onAddTx, onEditCategory, target, rollover }) {
  const spent = transactions.reduce((s, t) => s + t.amount, 0);
  const tStatus = getTargetStatus(target, spent, category);
  const isTargetByDate = target?.type === "target_by_date";
  const isWeekly = target?.type === "weekly";
  const baseLimit = tStatus.effectiveLimit || tStatus.monthlyNeeded || category.limit;
  const effectiveLimit = baseLimit + (rollover || 0);
  const diff = isTargetByDate ? (tStatus.goalAmt || 0) - (tStatus.funded || 0) : effectiveLimit - spent;

  return (
    <div
      style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 12, overflow: "hidden", transition: "box-shadow 0.2s, border-color 0.2s", cursor: "pointer",
      }}
      onClick={() => onExpand(isExpanded ? null : category.id)}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.boxShadow = "0 2px 12px var(--shadow)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ padding: "16px 20px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{category.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{category.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                {TARGET_TYPES.find((t) => t.id === (target?.type || "monthly"))?.icon || "📅"}{" "}
                {tStatus.label}
                {isWeekly && ` · ${fmt(tStatus.weeklyAmount)}/wk`}
                {!isTargetByDate && ` · ${transactions.length} txn${transactions.length !== 1 ? "s" : ""}`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEditCategory && onEditCategory(category); }}
              style={{ background: "none", border: "1px solid transparent", padding: "4px 6px", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1, transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--surface)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "none"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <TargetStatusBadge status={tStatus.status} />
          </div>
        </div>

        {isTargetByDate ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(tStatus.funded || 0)}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>of {fmt(tStatus.goalAmt)}</span>
            </div>
            <ProgressBar value={tStatus.funded || 0} max={tStatus.goalAmt || 1} color="var(--accent)" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
              <span style={{ color: tStatus.isComplete ? "var(--green)" : "var(--amber)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {tStatus.isComplete ? "Goal reached!" : `${fmt(tStatus.remaining)} to go · ${fmt(tStatus.monthlyNeeded)}/mo`}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {!tStatus.isComplete && `${tStatus.monthsLeft}mo left`}
              </span>
            </div>
            {!tStatus.isComplete && tStatus.deadline && (
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                Due {new Date(tStatus.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(spent)}</span>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>of {fmt(effectiveLimit)}</span>
                {rollover > 0 && (
                  <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, marginTop: 1 }}>
                    +{fmt(rollover)} rolled over
                  </div>
                )}
              </div>
            </div>
            <ProgressBar value={spent} max={effectiveLimit} />
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: tStatus.status === "on_track" || tStatus.status === "complete" ? "var(--green)" : tStatus.status === "warning" || tStatus.status === "behind" ? "var(--amber)" : "var(--red)" }}>
              {diff >= 0 ? `${fmt(diff)} remaining` : `${fmt(Math.abs(diff))} over budget`}
            </div>
          </>
        )}
      </div>

      {isExpanded && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", maxHeight: 360, overflowY: "auto" }}>
          <div style={{ padding: "8px 20px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Transactions</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={(e) => { e.stopPropagation(); onAddTx && onAddTx(category); }}
                style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                + Add
              </button>
              {isTargetByDate && !tStatus.isComplete && (
                <button onClick={(e) => { e.stopPropagation(); onFundTarget(category); }}
                  style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                  + Fund
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onEditTarget(category); }}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>
                Edit Target
              </button>
            </div>
          </div>
          {[...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{t.description}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{new Date(t.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(t.amount)}</div>
            </div>
          ))}
          {transactions.length === 0 && <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No transactions yet</div>}
        </div>
      )}
    </div>
  );
}

// Compact list row — used in both List view and Custom Order drag mode
function CategoryListRow({ category, transactions, target, rollover, onAddTx, onEditTarget, onFundTarget, onEditCategory, dragHandle, isDragging, isOver, listId, dragIdx }) {
  const [expanded, setExpanded] = useState(false);
  const spent = transactions.reduce((s, t) => s + t.amount, 0);
  const tStatus = getTargetStatus(target, spent, category);
  const isTargetByDate = target?.type === "target_by_date";
  const effectiveLimit = tStatus.effectiveLimit || tStatus.monthlyNeeded || category.limit;
  const diff = effectiveLimit - spent;

  return (
    <div
      data-drag-list={listId} data-drag-item={dragIdx}
      style={{ opacity: isDragging ? 0.35 : 1, borderRadius: 12, border: `2px solid ${isOver ? "var(--accent)" : "var(--border)"}`, background: "var(--card)", transition: "border-color 0.15s, opacity 0.15s", marginBottom: 2 }}
    >
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer" }} onClick={() => setExpanded((v) => !v)}>
        {dragHandle}
        {/* Icon */}
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
          {category.icon}
        </div>
        {/* Name + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
            {category.name}
            <button onClick={(e) => { e.stopPropagation(); onEditCategory && onEditCategory(category); }}
              style={{ background: "none", border: "none", padding: "0 2px", cursor: "pointer", color: "var(--text-muted)", lineHeight: 1, flexShrink: 0 }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          {/* Progress bar inline */}
          {effectiveLimit > 0 && (
            <div style={{ marginTop: 4 }}>
              <ProgressBar value={spent} max={effectiveLimit} height={4} />
            </div>
          )}
        </div>
        {/* Amount + status */}
        <div style={{ textAlign: "right", flexShrink: 0, minWidth: 100 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>{fmt(spent)}</div>
          {effectiveLimit > 0 && (
            <div style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: diff >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600, marginTop: 1 }}>
              {diff >= 0 ? `${fmt(diff)} left` : `${fmt(Math.abs(diff))} over`}
            </div>
          )}
        </div>
        <TargetStatusBadge status={tStatus.status} />
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: "var(--text-muted)", flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Expanded transactions panel */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", maxHeight: 320, overflowY: "auto" }}>
          <div style={{ padding: "8px 14px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Transactions</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={(e) => { e.stopPropagation(); onAddTx && onAddTx(category); }}
                style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600 }}>+ Add</button>
              {isTargetByDate && !tStatus.isComplete && (
                <button onClick={(e) => { e.stopPropagation(); onFundTarget(category); }}
                  style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600 }}>+ Fund</button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onEditTarget(category); }}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>Edit Target</button>
            </div>
          </div>
          {[...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{t.description}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{new Date(t.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(t.amount)}</div>
            </div>
          ))}
          {transactions.length === 0 && <div style={{ padding: "16px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No transactions yet</div>}
        </div>
      )}
    </div>
  );
}

function DraggableCategoryList({ categories, setCategories, txByCategory, budgetTargets, onAddTx, onEditTarget, onFundTarget, onEditCategory, currentRollovers }) {
  const { dragIndex, overIndex, startDrag, listId } = useDragToReorder(categories, setCategories);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
        Drag the handles to reorder. Switch to another sort mode to restore automatic ordering.
      </div>
      {categories.map((cat, idx) => (
        <CategoryListRow
          key={cat.id}
          category={cat}
          transactions={txByCategory[cat.id] || []}
          target={budgetTargets[cat.id] || null}
          rollover={currentRollovers[cat.id] || 0}
          onAddTx={onAddTx} onEditTarget={onEditTarget} onFundTarget={onFundTarget} onEditCategory={onEditCategory}
          dragHandle={<DragHandle onPointerDown={(e) => startDrag(e, idx)} />}
          isDragging={dragIndex === idx}
          isOver={overIndex === idx && dragIndex !== null && dragIndex !== idx}
          listId={listId} dragIdx={idx}
        />
      ))}
    </div>
  );
}

function BudgetPage({ categories, transactions, setCategories, setTransactions, income, budgetTargets, setBudgetTargets, budgetRollovers, setBudgetRollovers, showUndo, settings }) {
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [sortBy, setSortBy] = useState("status");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [viewDate, setViewDate] = useState(() => new Date());

  const startDay = settings?.startDayOfMonth || 1;

  // Compute period as stable string keys to avoid useMemo churn
  const periodStartStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
  const periodStartDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), startDay);
  const periodEndDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, startDay - 1);
  const periodEndStr = periodEndDate.toISOString().split("T")[0];

  const year = periodStartDate.getFullYear();
  const month = periodStartDate.getMonth();
  const monthName = startDay === 1
    ? viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `${periodStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${periodEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(year, month - 1, startDay);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  // Compute prev period date range
  const prevPeriodStartDate = new Date(year, month - 1, startDay);
  const prevPeriodEndDate = new Date(year, month, startDay - 1);
  const prevPeriodStartStr = `${prevPeriodStartDate.getFullYear()}-${String(prevPeriodStartDate.getMonth() + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
  const prevPeriodEndStr = prevPeriodEndDate.toISOString().split("T")[0];
  const prevMonthName = prevMonthDate.toLocaleDateString("en-US", { month: "long" });

  const prevMonth = () => { setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); setExpandedId(null); };
  const nextMonth = () => { setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); setExpandedId(null); };

  // Filter transactions to period
  const monthTransactions = useMemo(() => {
    if (startDay === 1) return transactions.filter((t) => t.date.startsWith(currentMonthKey));
    return transactions.filter((t) => t.date >= periodStartStr && t.date <= periodEndStr);
  }, [transactions, currentMonthKey, startDay, periodStartStr, periodEndStr]);

  const txByCategory = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = []));
    monthTransactions.forEach((t) => { if (map[t.categoryId]) map[t.categoryId].push(t); });
    return map;
  }, [categories, monthTransactions]);

  // Current month's rollovers (carried from previous month)
  const currentRollovers = budgetRollovers[currentMonthKey] || {};
  const totalRolledOver = Object.values(currentRollovers).reduce((s, v) => s + v, 0);

  // Calculate what COULD be rolled over from previous month (unspent budget)
  // Previous period's transactions — use date range for custom start days
  const prevMonthTransactions = useMemo(() => {
    if (startDay === 1) return transactions.filter((t) => t.date.startsWith(prevMonthKey));
    return transactions.filter((t) => t.date >= prevPeriodStartStr && t.date <= prevPeriodEndStr);
  }, [transactions, prevMonthKey, startDay, prevPeriodStartStr, prevPeriodEndStr]);

  const prevTxByCategory = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = []));
    prevMonthTransactions.forEach((t) => { if (map[t.categoryId]) map[t.categoryId].push(t); });
    return map;
  }, [categories, prevMonthTransactions]);

  const prevMonthUnspent = useMemo(() => {
    const unspent = {};
    let totalAvailable = 0;
    categories.forEach((c) => {
      const target = budgetTargets[c.id];
      if (target?.type === "target_by_date") return; // don't roll over date targets
      const spent = (prevTxByCategory[c.id] || []).reduce((s, t) => s + t.amount, 0);
      const tStatus = getTargetStatus(target, spent, c);
      const limit = tStatus.effectiveLimit || tStatus.monthlyNeeded || c.limit;
      const remaining = limit - spent;
      if (remaining > 0) {
        unspent[c.id] = Math.round(remaining * 100) / 100;
        totalAvailable += remaining;
      }
    });
    return { byCat: unspent, total: totalAvailable };
  }, [categories, prevTxByCategory, budgetTargets]);

  // Has rollover already been applied this month?
  const rolloverApplied = Object.keys(currentRollovers).length > 0;

  const handleApplyRollovers = () => {
    setBudgetRollovers((prev) => ({ ...prev, [currentMonthKey]: prevMonthUnspent.byCat }));
  };

  const handleClearRollovers = () => {
    setBudgetRollovers((prev) => {
      const next = { ...prev };
      delete next[currentMonthKey];
      return next;
    });
  };

  const sortedCategories = useMemo(() => {
    const arr = [...categories];
    if (sortBy === "name") return arr.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "spent") return arr.sort((a, b) => (txByCategory[b.id]?.reduce((s, t) => s + t.amount, 0) || 0) - (txByCategory[a.id]?.reduce((s, t) => s + t.amount, 0) || 0));
    return arr.sort((a, b) => {
      const spentA = txByCategory[a.id]?.reduce((s, t) => s + t.amount, 0) || 0;
      const spentB = txByCategory[b.id]?.reduce((s, t) => s + t.amount, 0) || 0;
      const limA = getTargetStatus(budgetTargets[a.id], spentA, a).effectiveLimit || a.limit;
      const limB = getTargetStatus(budgetTargets[b.id], spentB, b).effectiveLimit || b.limit;
      return (spentB / limB) - (spentA / limA);
    });
  }, [categories, sortBy, txByCategory, budgetTargets]);

  // Income-aware calculations
  const totalIncome = income.reduce((s, i) => {
    if (!i.recurring) return s + i.amount;
    switch (i.frequency) {
      case "weekly": return s + i.amount * 52 / 12;
      case "biweekly": return s + i.amount * 26 / 12;
      case "semimonthly": return s + i.amount * 2;
      case "monthly": return s + i.amount;
      case "quarterly": return s + i.amount / 3;
      case "yearly": return s + i.amount / 12;
      default: return s + i.amount;
    }
  }, 0);

  // Use target-aware totals (including rollovers)
  const totalBudgeted = categories.reduce((s, c) => {
    const spent = (txByCategory[c.id] || []).reduce((sum, t) => sum + t.amount, 0);
    const ts = getTargetStatus(budgetTargets[c.id], spent, c);
    const base = ts.effectiveLimit || ts.monthlyNeeded || c.limit;
    const ro = currentRollovers[c.id] || 0;
    return s + base + ro;
  }, 0);
  const totalSpent = monthTransactions.reduce((s, t) => s + t.amount, 0);
  const unbudgeted = totalIncome - totalBudgeted + totalRolledOver;
  const overCount = categories.filter((c) => {
    const spent = (txByCategory[c.id] || []).reduce((s, t) => s + t.amount, 0);
    const ts = getTargetStatus(budgetTargets[c.id], spent, c);
    const limit = (ts.effectiveLimit || ts.monthlyNeeded || c.limit) + (currentRollovers[c.id] || 0);
    return spent > limit;
  }).length;
  const targetByDateCount = categories.filter((c) => budgetTargets[c.id]?.type === "target_by_date").length;
  const rolloverCatCount = Object.keys(currentRollovers).filter((k) => currentRollovers[k] > 0).length;

  const handleSaveTarget = (catId, targetData) => {
    setBudgetTargets((prev) => ({ ...prev, [catId]: targetData }));
    // Also sync the category limit for backward compatibility
    if (targetData.type === "monthly") {
      setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, limit: targetData.monthlyAmount } : c));
    } else if (targetData.type === "weekly") {
      setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, limit: Math.round(targetData.weeklyAmount * 52 / 12) } : c));
    }
    setModal(null);
  };

  const handleFund = (catId, amount) => {
    setBudgetTargets((prev) => {
      const existing = prev[catId];
      if (!existing || existing.type !== "target_by_date") return prev;
      return { ...prev, [catId]: { ...existing, funded: (existing.funded || 0) + amount } };
    });
    setModal(null);
  };

  const pillStyle = (active) => ({
    padding: "6px 14px", borderRadius: 999, border: "1px solid var(--border)",
    background: active ? "var(--text-primary)" : "transparent",
    color: active ? "var(--card)" : "var(--text-muted)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Budget Tracker</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
            {targetByDateCount > 0 ? `${targetByDateCount} date target${targetByDateCount > 1 ? "s" : ""}` : "Track spending by category"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setModal("addCat")} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Category</button>
          <button onClick={() => setModal("addTx")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Transaction</button>
        </div>
      </div>

      {/* Month navigation */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 20 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{monthName}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Income vs Budget bar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Income vs Budget</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
              {fmt(totalBudgeted)} budgeted of {fmt(totalIncome)} income
            </span>
          </div>
          <div style={{ position: "relative", height: 12, borderRadius: 6, background: "var(--track)", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${Math.min((totalBudgeted / totalIncome) * 100, 100)}%`, background: totalBudgeted > totalIncome ? "var(--red)" : "var(--accent)", borderRadius: 6, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
            <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${Math.min((totalSpent / totalIncome) * 100, 100)}%`, background: "var(--green)", borderRadius: 6, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)", opacity: 0.6 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
            <div style={{ display: "flex", gap: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", opacity: 0.6 }} />Spent {fmt(totalSpent)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />Budgeted {fmt(totalBudgeted)}</span>
            </div>
            <span style={{ fontWeight: 600, color: unbudgeted >= 0 ? "var(--green)" : "var(--red)" }}>
              {unbudgeted >= 0 ? `${fmt(unbudgeted)} unbudgeted` : `${fmt(Math.abs(unbudgeted))} over income`}
            </span>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Monthly Income" value={fmt(totalIncome)} sub={`${income.length} sources`} accent="var(--green)" />
        <MetricBox label="Total Budgeted" value={fmt(totalBudgeted)} sub={`${categories.length} categories`} accent="var(--accent)" />
        <MetricBox label="Total Spent" value={fmt(totalSpent)} sub={`${pct(totalSpent, totalBudgeted).toFixed(0)}% of budget`} accent="var(--red)" />
        <MetricBox label="Unbudgeted" value={fmt(Math.abs(unbudgeted))} sub={unbudgeted >= 0 ? "available to assign" : "over income"} accent={unbudgeted >= 0 ? "var(--green)" : "var(--red)"} />
        <MetricBox label="Categories Over" value={overCount} sub={overCount === 0 ? "all on track" : "need attention"} accent={overCount > 0 ? "var(--red)" : "var(--green)"} />
      </div>

      {/* Spending alerts */}
      {(() => {
        const alerts = categories.map((c) => {
          const spent = (txByCategory[c.id] || []).reduce((s, t) => s + t.amount, 0);
          const ts = getTargetStatus(budgetTargets[c.id], spent, c);
          const limit = (ts.effectiveLimit || ts.monthlyNeeded || c.limit) + (currentRollovers[c.id] || 0);
          if (!limit || limit <= 0) return null;
          const ratio = spent / limit;
          if (ratio >= 1) return { cat: c, spent, limit, ratio, type: "over" };
          if (ratio >= 0.8) return { cat: c, spent, limit, ratio, type: "warning" };
          return null;
        }).filter(Boolean);
        if (alerts.length === 0) return null;
        return (
          <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map(({ cat, spent, limit, ratio, type }) => (
              <div key={cat.id} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${type === "over" ? "var(--red)44" : "var(--amber)44"}`, background: type === "over" ? "var(--red-bg)" : "var(--amber-bg, var(--surface))", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{cat.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{cat.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                    {fmt(spent)} of {fmt(limit)} · {(ratio * 100).toFixed(0)}%
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: type === "over" ? "var(--red)" : "var(--amber)" }}>
                  {type === "over" ? `${fmt(spent - limit)} over` : "Near limit"}
                </span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Budget Rollover Card */}
      {(prevMonthUnspent.total > 0 || rolloverApplied) && (
        <Card style={{ marginBottom: 20, borderColor: rolloverApplied ? "var(--accent)" : "var(--border)" }}>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: rolloverApplied ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: rolloverApplied ? "var(--accent)" + "18" : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                  {rolloverApplied ? "✓" : "↻"}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                    {rolloverApplied ? "Rollovers Applied" : "Roll Over Unspent Budget"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {rolloverApplied
                      ? `${fmt(totalRolledOver)} carried forward across ${rolloverCatCount} categor${rolloverCatCount === 1 ? "y" : "ies"}`
                      : `${fmt(prevMonthUnspent.total)} unspent from ${prevMonthName} available to roll forward`
                    }
                  </div>
                </div>
              </div>
              {rolloverApplied ? (
                <button onClick={handleClearRollovers}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Undo
                </button>
              ) : (
                <button onClick={handleApplyRollovers}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Roll Over
                </button>
              )}
            </div>

            {/* Per-category rollover detail (only show when applied) */}
            {rolloverApplied && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.filter((c) => (currentRollovers[c.id] || 0) > 0).map((c) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                      borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)",
                      fontSize: 12, color: "var(--text-secondary)",
                    }}>
                      <span>{c.icon}</span>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>+{fmt(currentRollovers[c.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview of what will roll over (before applying) */}
            {!rolloverApplied && prevMonthUnspent.total > 0 && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>
                  Unspent by Category
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.filter((c) => (prevMonthUnspent.byCat[c.id] || 0) > 0).map((c) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                      borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)",
                      fontSize: 12, color: "var(--text-secondary)",
                    }}>
                      <span>{c.icon}</span>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt(prevMonthUnspent.byCat[c.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Sort + View controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[{ key: "status", label: "By Status" }, { key: "spent", label: "By Spent" }, { key: "name", label: "By Name" }, { key: "manual", label: "⠿ Custom Order" }].map((s) => (
            <button key={s.key} onClick={() => { setSortBy(s.key); setExpandedId(null); }} style={pillStyle(sortBy === s.key)}>{s.label}</button>
          ))}
        </div>
        {/* List / Grid view toggle — hidden in Custom Order mode */}
        {sortBy !== "manual" && (
          <div style={{ display: "flex", gap: 4, padding: "3px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)" }}>
            {[
              { mode: "grid", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
              { mode: "list", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
            ].map(({ mode, icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ padding: "5px 9px", borderRadius: 6, border: "none", background: viewMode === mode ? "var(--text-primary)" : "transparent", color: viewMode === mode ? "var(--card)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.15s" }}>
                {icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom Order (drag-to-reorder list with full info) */}
      {sortBy === "manual" && (
        <DraggableCategoryList
          categories={categories} setCategories={setCategories}
          txByCategory={txByCategory} budgetTargets={budgetTargets}
          currentRollovers={currentRollovers}
          onAddTx={(c) => setModal({ type: "addTx", categoryId: c.id })}
          onEditTarget={(c) => setModal({ type: "editTarget", category: c })}
          onFundTarget={(c) => setModal({ type: "fund", category: c })}
          onEditCategory={(c) => setModal({ type: "editCat", category: c })}
        />
      )}

      {/* List view */}
      {sortBy !== "manual" && viewMode === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sortedCategories.map((cat) => (
            <CategoryListRow
              key={cat.id}
              category={cat}
              transactions={txByCategory[cat.id] || []}
              target={budgetTargets[cat.id] || null}
              rollover={currentRollovers[cat.id] || 0}
              onAddTx={(c) => setModal({ type: "addTx", categoryId: c.id })}
              onEditTarget={(c) => setModal({ type: "editTarget", category: c })}
              onFundTarget={(c) => setModal({ type: "fund", category: c })}
              onEditCategory={(c) => setModal({ type: "editCat", category: c })}
            />
          ))}
        </div>
      )}

      {/* Grid view (default) */}
      {sortBy !== "manual" && viewMode === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14, alignItems: "start" }}>
          {sortedCategories.map((cat) => (
            <SwipeToDelete key={cat.id} onDelete={() => { showUndo(`Deleted "${cat.name}" category`); setCategories((prev) => prev.filter((c) => c.id !== cat.id)); }}>
              <CategoryCard category={cat} transactions={txByCategory[cat.id] || []}
                target={budgetTargets[cat.id] || null}
                rollover={currentRollovers[cat.id] || 0}
                isExpanded={expandedId === cat.id} onExpand={setExpandedId}
                onEditTarget={(c) => setModal({ type: "editTarget", category: c })}
                onFundTarget={(c) => setModal({ type: "fund", category: c })}
                onAddTx={(c) => setModal({ type: "addTx", categoryId: c.id })}
                onEditCategory={(c) => setModal({ type: "editCat", category: c })}
              />
            </SwipeToDelete>
          ))}
        </div>
      )}

      {(modal === "addTx" || modal?.type === "addTx") && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title="Add Transaction">
            <AddTransactionFields
              categories={categories}
              prefilledCategoryId={modal?.categoryId || null}
              onSubmit={(tx, isSplit) => { setTransactions((p) => isSplit ? [...p, ...tx] : [...p, tx]); setModal(null); }}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}
      {modal === "addCat" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title="Add Category">
            <AddCategoryFields onSubmit={(cat) => { setCategories((p) => [...p, cat]); setModal(null); }} onClose={() => setModal(null)} />
          </ModalForm>
        </Overlay>
      )}
      {modal?.type === "editTarget" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={`${modal.category.icon} ${modal.category.name} — Set Target`}>
            <EditTargetFields
              category={modal.category}
              target={budgetTargets[modal.category.id]}
              onSubmit={handleSaveTarget}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}
      {modal?.type === "fund" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={`${modal.category.icon} ${modal.category.name} — Add Funds`}>
            <FundTargetFields
              category={modal.category}
              target={budgetTargets[modal.category.id]}
              onSubmit={handleFund}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}

      {modal?.type === "editCat" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={`Edit Category`}>
            <EditCategoryFields
              category={modal.category}
              onSubmit={(updated) => {
                setCategories((prev) => prev.map((c) => c.id === updated.id ? updated : c));
                showUndo(`Updated "${updated.name}"`);
                setModal(null);
              }}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}

      {/* Target type legend */}
      <div style={{ marginTop: 20, padding: "8px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          {TARGET_TYPES.map((tt) => (
            <div key={tt.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)" }}>
              <span>{tt.icon}</span>
              <span>{tt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL FORM COMPONENTS
// ─────────────────────────────────────────────

function ModalForm({ title, children }) {
  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
      </div>
      {children}
    </>
  );
}

function ModalActions({ onClose, onSubmit, canSubmit, label = "Save" }) {
  return (
    <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
      <button onClick={onSubmit} disabled={!canSubmit}
        style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
        {label}
      </button>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>{children}</label>;
}

function AddTransactionFields({ categories, onSubmit, onClose, existing, prefilledCategoryId }) {
  const [form, setForm] = useState(existing ? {
    categoryId: existing.categoryId,
    description: existing.description,
    amount: String(existing.amount),
    date: existing.date,
  } : { categoryId: prefilledCategoryId || categories[0]?.id || "", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Split transaction state
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState([
    { id: 1, categoryId: prefilledCategoryId || categories[0]?.id || "", amount: "" },
    { id: 2, categoryId: categories[1]?.id || categories[0]?.id || "", amount: "" },
  ]);
  const updateSplit = (id, k, v) => setSplits((prev) => prev.map((s) => s.id === id ? { ...s, [k]: v } : s));
  const addSplit = () => setSplits((prev) => [...prev, { id: Date.now(), categoryId: categories[0]?.id || "", amount: "" }]);
  const removeSplit = (id) => setSplits((prev) => prev.filter((s) => s.id !== id));

  const totalAmount = parseFloat(form.amount) || 0;
  const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
  const splitRemaining = Math.round((totalAmount - splitTotal) * 100) / 100;
  const splitValid = splits.every((s) => s.categoryId && parseFloat(s.amount) > 0) && Math.abs(splitRemaining) < 0.01;

  const canSubmit = isSplit
    ? form.description.trim() && totalAmount > 0 && form.date && splitValid
    : form.categoryId && form.description.trim() && parseFloat(form.amount) > 0 && form.date;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isSplit) {
      // Pass array of transactions for split mode
      const splitTxs = splits.map((sp) => ({
        id: nextId(), categoryId: sp.categoryId,
        description: form.description.trim(), amount: parseFloat(sp.amount), date: form.date,
      }));
      onSubmit(splitTxs, true);
    } else {
      onSubmit({ id: existing?.id || nextId(), categoryId: form.categoryId, description: form.description.trim(), amount: parseFloat(form.amount), date: form.date });
    }
  };

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Description</FieldLabel><input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="e.g. Grocery store run" style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Total Amount</FieldLabel><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Date</FieldLabel><input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={INPUT_STYLE} /></div>
        </div>

        {!isSplit && (
          <div><FieldLabel>Category</FieldLabel><select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>{categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
        )}

        {/* Split toggle */}
        {!existing && (
          <button onClick={() => setIsSplit((v) => !v)} style={{ alignSelf: "flex-start", background: "none", border: `1px solid ${isSplit ? "var(--accent)" : "var(--border)"}`, borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: isSplit ? "var(--accent)" : "var(--text-muted)", cursor: "pointer" }}>
            ✂ {isSplit ? "Split On" : "Split by Category"}
          </button>
        )}

        {isSplit && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <FieldLabel>Split Amounts</FieldLabel>
              <span style={{ fontSize: 12, color: splitRemaining === 0 ? "var(--green)" : splitRemaining < 0 ? "var(--red)" : "var(--amber)", fontWeight: 600 }}>
                {splitRemaining === 0 ? "✓ Balanced" : splitRemaining > 0 ? `${fmt(splitRemaining)} remaining` : `${fmt(Math.abs(splitRemaining))} over`}
              </span>
            </div>
            {splits.map((sp) => (
              <div key={sp.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={sp.categoryId} onChange={(e) => updateSplit(sp.id, "categoryId", e.target.value)} style={{ ...INPUT_STYLE, flex: 2, cursor: "pointer" }}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <div style={{ position: "relative", flex: 1 }}>
                  <input type="number" step="0.01" min="0" value={sp.amount} onChange={(e) => updateSplit(sp.id, "amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
                </div>
                {splits.length > 2 && (
                  <button onClick={() => removeSplit(sp.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 }}>×</button>
                )}
              </div>
            ))}
            <button onClick={addSplit} style={{ alignSelf: "flex-start", background: "none", border: "1px dashed var(--border)", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer" }}>+ Add Split</button>
            {totalAmount > 0 && splitRemaining > 0 && (
              <button onClick={() => updateSplit(splits[splits.length - 1].id, "amount", String(Math.round((parseFloat(splits[splits.length - 1].amount || 0) + splitRemaining) * 100) / 100))}
                style={{ alignSelf: "flex-start", background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}>
                Fill remaining {fmt(splitRemaining)}
              </button>
            )}
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label={existing ? "Save Changes" : isSplit ? `Add ${splits.length} Transactions` : "Add Transaction"}
        onSubmit={handleSubmit} />
    </>
  );
}

function AddCategoryFields({ onSubmit, onClose }) {
  const [form, setForm] = useState({ name: "", icon: "●", limit: "" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.limit) > 0;
  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 12 }}>
          <div><FieldLabel>Icon</FieldLabel><input value={form.icon} onChange={(e) => update("icon", e.target.value)} maxLength={2} style={{ ...INPUT_STYLE, textAlign: "center", fontSize: 18 }} /></div>
          <div><FieldLabel>Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Subscriptions" style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Monthly Limit ($)</FieldLabel><input type="number" step="1" min="0" value={form.limit} onChange={(e) => update("limit", e.target.value)} placeholder="0" style={INPUT_STYLE} /></div>
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Add Category"
        onSubmit={() => { if (canSubmit) onSubmit({ id: form.name.toLowerCase().replace(/\s+/g, "-"), name: form.name.trim(), icon: form.icon || "●", limit: parseFloat(form.limit) }); }} />
    </>
  );
}

function EditCategoryFields({ category, onSubmit, onClose }) {
  const [form, setForm] = useState({ name: category.name, icon: category.icon || "●" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim().length > 0;
  const QUICK_ICONS = ["🏠","🛒","🍽","⚡","🎵","❤","👤","🚗","📱","✈","💰","🎓","🐾","👶","🏋","💊","🎮","📦","🛠","🌿","☕","🍕","🎁","📚","🏦","📊","💼","🎨"];
  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 12 }}>
          <div><FieldLabel>Icon</FieldLabel><input value={form.icon} onChange={(e) => update("icon", e.target.value)} maxLength={2} style={{ ...INPUT_STYLE, textAlign: "center", fontSize: 18 }} /></div>
          <div><FieldLabel>Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Category name" style={INPUT_STYLE} /></div>
        </div>
        <div>
          <FieldLabel>Quick Pick</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {QUICK_ICONS.map((ic) => (
              <button key={ic} onClick={() => update("icon", ic)}
                style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${form.icon === ic ? "var(--accent)" : "var(--border)"}`, background: form.icon === ic ? "var(--accent)18" : "transparent", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ic}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Save Changes"
        onSubmit={() => { if (canSubmit) onSubmit({ ...category, name: form.name.trim(), icon: form.icon || "●" }); }} />
    </>
  );
}

function EditLimitFields({ category, onSubmit, onClose }) {
  const [limit, setLimit] = useState(String(category.limit));
  const valid = parseFloat(limit) > 0;
  return (
    <>
      <div style={{ padding: "16px 24px" }}>
        <FieldLabel>Monthly Limit ($)</FieldLabel>
        <input type="number" step="1" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} style={INPUT_STYLE} />
      </div>
      <ModalActions onClose={onClose} canSubmit={valid} label="Save"
        onSubmit={() => { if (valid) onSubmit(category.id, parseFloat(limit)); }} />
    </>
  );
}

// ─────────────────────────────────────────────
// PWA HEAD (App Icon for Home Screen)
// ─────────────────────────────────────────────

function generateAppIcon(size = 512) {
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

function PwaHead() {
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

function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const today = new Date().toISOString().split("T")[0];
  const [data, setData] = useState({
    householdName: "",
    incomeStreams: [{ id: 1, source: "", amount: "", frequency: "semimonthly", anchorDate: today }],
    bills: [{ id: 1, name: "", amount: "", frequency: "monthly", dueDay: "1" }],
    categories: INITIAL_CATEGORIES.map((c) => ({ ...c, enabled: true })),
    debts: [{ id: 1, name: "", balance: "", minPayment: "", apr: "", dueDay: "1", frequency: "monthly", dueMonth: "1" }],
    savingsTarget: "",
    checkingBalance: "",
    savingsBalance: "",
    colorTheme: "blue_gold",
    theme: "dark",
  });

  const update = (key, val) => setData((d) => ({ ...d, [key]: val }));
  const currentStep = ONBOARDING_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === ONBOARDING_STEPS.length - 1;

  const addListItem = (key, template) => {
    setData((d) => ({ ...d, [key]: [...d[key], { ...template, id: d[key].length + 1 }] }));
  };

  const updateListItem = (key, id, field, value) => {
    setData((d) => ({ ...d, [key]: d[key].map((item) => item.id === id ? { ...item, [field]: value } : item) }));
  };

  const removeListItem = (key, id) => {
    setData((d) => ({ ...d, [key]: d[key].filter((item) => item.id !== id) }));
  };

  const handleFinish = () => {
    const now = new Date();

    // Income sources
    const incomes = data.incomeStreams
      .filter((s) => s.source.trim() && parseFloat(s.amount) > 0)
      .map((s, i) => ({
        id: i + 1,
        source: s.source.trim(),
        amount: parseFloat(s.amount),
        date: s.anchorDate || today,
        recurring: true,
        frequency: s.frequency,
        category: "employment",
        icon: "💼",
      }));

    // Bill templates — use dueDay to build a proper anchorDate for this month
    const bills = data.bills
      .filter((b) => b.name.trim() && parseFloat(b.amount) > 0)
      .map((b, i) => {
        // semimonthly always anchors to the 1st — engine generates both 1st and 15th
        const day = b.frequency === "semimonthly" ? 1 : Math.min(parseInt(b.dueDay) || 1, 28);
        const anchorDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return {
          id: i + 1,
          name: b.name.trim(),
          amount: parseFloat(b.amount),
          anchorDate,
          recurring: true,
          frequency: b.frequency,
        };
      });

    // Budget targets — create one per bill so they appear in Budget page
    const budgetTargets = {};
    bills.forEach((b) => {
      const catId = `bill_${b.id}`;
      const monthlyAmt = b.frequency === "weekly" ? b.amount * 52 / 12
        : b.frequency === "biweekly" ? b.amount * 26 / 12
        : b.frequency === "semimonthly" ? b.amount * 2
        : b.frequency === "quarterly" ? b.amount / 3
        : b.frequency === "yearly" ? b.amount / 12
        : b.amount;
      budgetTargets[catId] = { type: "monthly", monthlyAmount: Math.round(monthlyAmt * 100) / 100 };
    });

    // Categories — one per bill plus the standard set
    const billCategories = bills.map((b, i) => ({
      id: `bill_${b.id}`,
      name: b.name,
      icon: "📋",
      limit: budgetTargets[`bill_${b.id}`]?.monthlyAmount || b.amount,
      color: "#38bdf8",
    }));
    // Spending categories — user's chosen set + bill categories
    const chosenCategories = data.categories
      .filter((c) => c.enabled)
      .map((c) => ({ id: c.id, name: c.name, icon: c.icon, limit: parseFloat(c.limit) || 0 }));
    const categories = [...chosenCategories, ...billCategories];

    // Debts
    const debts = data.debts
      .filter((d) => d.name.trim() && parseFloat(d.balance) > 0)
      .map((d, i) => {
        const day = Math.min(parseInt(d.dueDay) || 1, 28);
        const mon = Math.min(parseInt(d.dueMonth) || 1, 12);
        const freq = d.frequency || "monthly";
        // Build anchorDate: for yearly use the specified month, otherwise current month
        const anchorMonth = freq === "yearly" ? mon : now.getMonth() + 1;
        const anchorDate = `${now.getFullYear()}-${String(anchorMonth).padStart(2, "0")}-${String(freq === "semimonthly" ? 1 : day).padStart(2, "0")}`;
        return {
          id: i + 1,
          name: d.name.trim(),
          balance: parseFloat(d.balance),
          originalBalance: parseFloat(d.balance),
          minPayment: parseFloat(d.minPayment) || 0,
          apr: parseFloat(d.apr) || 0,
          icon: "💳",
          lender: "",
          startDate: anchorDate,
          frequency: freq,
          payments: [],
        };
      });

    // Create bill templates for debt minimum payments so they show in Paycheck Planner
    const debtBillTemplates = debts
      .filter((d) => d.minPayment > 0)
      .map((d, i) => ({
        id: bills.length + i + 1,
        name: `${d.name} (min pmt)`,
        amount: d.minPayment,
        anchorDate: d.startDate,
        recurring: true,
        frequency: d.frequency,
        isDebtPayment: true,
      }));

    // Assets
    const assets = [];
    if (parseFloat(data.checkingBalance) > 0) assets.push({ id: 1, name: "Checking Account", value: parseFloat(data.checkingBalance), category: "cash", icon: "🏦" });
    if (parseFloat(data.savingsBalance) > 0) assets.push({ id: 2, name: "Savings Account", value: parseFloat(data.savingsBalance), category: "cash", icon: "💰" });

    // Savings goals
    const savingsGoals = [];
    if (parseFloat(data.savingsTarget) > 0) {
      savingsGoals.push({ id: 1, name: "Emergency Fund", target: parseFloat(data.savingsTarget), current: parseFloat(data.savingsBalance) || 0, icon: "🛡", monthlyContribution: 0, deadline: "", color: "var(--green)", contributions: [] });
    }

    const newSettings = {
      ...DEFAULT_SETTINGS,
      householdName: data.householdName.trim() || "My Household",
      colorTheme: data.colorTheme,
      theme: data.theme,
      onboardingComplete: true,
    };

    onComplete({
      income: incomes.length > 0 ? incomes : INITIAL_INCOME,
      billTemplates: bills.length > 0 ? [...bills, ...debtBillTemplates] : [...INITIAL_BILL_TEMPLATES, ...debtBillTemplates],
      debts: debts.length > 0 ? debts : INITIAL_DEBTS,
      assets: assets.length > 0 ? assets : INITIAL_ASSETS,
      savingsGoals: savingsGoals.length > 0 ? savingsGoals : INITIAL_SAVINGS_GOALS,
      categories,
      budgetTargets: Object.keys(budgetTargets).length > 0 ? { ...INITIAL_BUDGET_TARGETS, ...budgetTargets } : INITIAL_BUDGET_TARGETS,
      transactions: [],
      paidDates: new Set(),
      settings: newSettings,
    });
  };

  // Get active theme for preview
  const previewTheme = COLOR_THEMES[data.colorTheme] || COLOR_THEMES.blue_gold;
  const previewVars = data.theme === "light" ? previewTheme.light : previewTheme.dark;

  return (
    <div className="maverick-onboarding" style={{
      ...previewVars,
      fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
      background: "var(--bg)", color: "var(--text-primary)",
      padding: "env(safe-area-inset-top, 20px) 20px env(safe-area-inset-bottom, 20px) 20px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", paddingTop: 24, paddingBottom: 40 }}>
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          {ONBOARDING_STEPS.map((s, i) => (
            <div key={s.id} style={{
              width: i === step ? 28 : 8, height: 8, borderRadius: 4,
              background: i <= step ? "var(--accent)" : "var(--track)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* Step icon + title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{currentStep.icon}</div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{currentStep.title}</h2>
        </div>

        {/* Step content */}
        <Card>
          <div style={{ padding: "24px" }}>

            {/* STEP 0: Welcome */}
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, textAlign: "center" }}>
                  Let's set up your personal finance dashboard. This takes about 2 minutes — you can always change everything later in Settings.
                </div>
                <div>
                  <FieldLabel>What should we call your household?</FieldLabel>
                  <input value={data.householdName} onChange={(e) => update("householdName", e.target.value)} placeholder="e.g. The Smiths, My Budget, Home" style={INPUT_STYLE} />
                </div>
              </div>
            )}

            {/* STEP 1: Income */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Add your regular income sources. You can add more later.</div>
                {data.incomeStreams.map((s) => (
                  <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ flex: "2 1 120px" }}>
                      {s.id === 1 && <FieldLabel>Source</FieldLabel>}
                      <input value={s.source} onChange={(e) => updateListItem("incomeStreams", s.id, "source", e.target.value)} placeholder="e.g. My Salary" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: "1 1 80px" }}>
                      {s.id === 1 && <FieldLabel>Amount ($)</FieldLabel>}
                      <input type="number" step="0.01" min="0" value={s.amount} onChange={(e) => updateListItem("incomeStreams", s.id, "amount", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: "1 1 110px" }}>
                      {s.id === 1 && <FieldLabel>Frequency</FieldLabel>}
                      <select value={s.frequency} onChange={(e) => updateListItem("incomeStreams", s.id, "frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="semimonthly">1st & 15th</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div style={{ flex: "1 1 110px" }}>
                      {s.id === 1 && <FieldLabel>Next Pay Date</FieldLabel>}
                      <input type="date" value={s.anchorDate} onChange={(e) => updateListItem("incomeStreams", s.id, "anchorDate", e.target.value)} style={INPUT_STYLE} />
                    </div>
                    {data.incomeStreams.length > 1 && (
                      <button onClick={() => removeListItem("incomeStreams", s.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px 0", fontSize: 18 }}>×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => addListItem("incomeStreams", { source: "", amount: "", frequency: "biweekly", anchorDate: today })}
                  style={{ padding: "8px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Add Another Income
                </button>
              </div>
            )}

            {/* STEP 2: Bills */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Add your regular bills. These will appear on the Calendar, Paycheck Planner, and Budget pages.</div>
                {data.bills.map((b) => (
                  <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ flex: "2 1 120px" }}>
                      {b.id === 1 && <FieldLabel>Bill Name</FieldLabel>}
                      <input value={b.name} onChange={(e) => updateListItem("bills", b.id, "name", e.target.value)} placeholder="e.g. Rent, Electric" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: "1 1 80px" }}>
                      {b.id === 1 && <FieldLabel>Amount ($)</FieldLabel>}
                      <input type="number" step="0.01" min="0" value={b.amount} onChange={(e) => updateListItem("bills", b.id, "amount", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: "1 1 100px" }}>
                      {b.id === 1 && <FieldLabel>Frequency</FieldLabel>}
                      <select value={b.frequency} onChange={(e) => updateListItem("bills", b.id, "frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="semimonthly">1st & 15th</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {b.frequency !== "semimonthly" && (
                    <div style={{ flex: "0 1 80px" }}>
                      {b.id === 1 && <FieldLabel>Due Day</FieldLabel>}
                      <select value={b.dueDay} onChange={(e) => updateListItem("bills", b.id, "dueDay", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    )}
                    {data.bills.length > 1 && (
                      <button onClick={() => removeListItem("bills", b.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px 0", fontSize: 18 }}>×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => addListItem("bills", { name: "", amount: "", frequency: "monthly", dueDay: "1" })}
                  style={{ padding: "8px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Add Another Bill
                </button>
              </div>
            )}

            {/* STEP 3: Budget Categories */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
                  Choose which spending categories to track. Toggle any off you don't need, edit names and monthly limits, or add your own.
                </div>
                {data.categories.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 10, border: `1px solid ${c.enabled ? "var(--border)" : "var(--border-subtle)"}`, background: c.enabled ? "var(--card)" : "var(--surface)", opacity: c.enabled ? 1 : 0.5, transition: "all 0.15s" }}>
                    {/* Toggle */}
                    <div onClick={() => {
                      const newCats = data.categories.map((x) => x.id === c.id ? { ...x, enabled: !x.enabled } : x);
                      update("categories", newCats);
                    }} style={{ width: 36, height: 20, borderRadius: 10, padding: 2, background: c.enabled ? "var(--accent)" : "var(--track)", display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "transform 0.2s", transform: c.enabled ? "translateX(16px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                    </div>
                    {/* Icon */}
                    <input value={c.icon} onChange={(e) => { const newCats = data.categories.map((x) => x.id === c.id ? { ...x, icon: e.target.value } : x); update("categories", newCats); }} maxLength={2} style={{ ...INPUT_STYLE, width: 42, textAlign: "center", fontSize: 16, padding: "6px 4px", flexShrink: 0 }} />
                    {/* Name */}
                    <input value={c.name} onChange={(e) => { const newCats = data.categories.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x); update("categories", newCats); }} style={{ ...INPUT_STYLE, flex: 1 }} placeholder="Category name" />
                    {/* Limit */}
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>$</span>
                      <input type="number" min="0" step="10" value={c.limit} onChange={(e) => { const newCats = data.categories.map((x) => x.id === c.id ? { ...x, limit: e.target.value } : x); update("categories", newCats); }} style={{ ...INPUT_STYLE, width: 80 }} placeholder="0" />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>/mo</span>
                    </div>
                    {/* Remove custom */}
                    {!INITIAL_CATEGORIES.find((ic) => ic.id === c.id) && (
                      <button onClick={() => update("categories", data.categories.filter((x) => x.id !== c.id))} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: "0 2px", lineHeight: 1 }}>×</button>
                    )}
                  </div>
                ))}
                {/* Add custom category */}
                <button onClick={() => {
                  const newId = `custom_${Date.now()}`;
                  update("categories", [...data.categories, { id: newId, name: "", icon: "●", limit: "", enabled: true }]);
                }} style={{ padding: "8px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Add Custom Category
                </button>
              </div>
            )}

            {/* STEP 4: Debts & Savings */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Where do you stand financially right now?</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <FieldLabel>Checking Balance</FieldLabel>
                    <input type="number" step="0.01" min="0" value={data.checkingBalance} onChange={(e) => update("checkingBalance", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                  </div>
                  <div>
                    <FieldLabel>Savings Balance</FieldLabel>
                    <input type="number" step="0.01" min="0" value={data.savingsBalance} onChange={(e) => update("savingsBalance", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                  </div>
                </div>

                <div>
                  <FieldLabel>Emergency Fund Target (optional)</FieldLabel>
                  <input type="number" step="100" min="0" value={data.savingsTarget} onChange={(e) => update("savingsTarget", e.target.value)} placeholder="e.g. 15000" style={INPUT_STYLE} />
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>Any debts? (optional)</div>
                  {data.debts.map((d) => (
                    <div key={d.id} style={{ padding: "10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", marginBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Row 1: Name, Balance, Min Payment, APR */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ flex: "2 1 110px" }}>
                          {d.id === 1 && <FieldLabel>Name</FieldLabel>}
                          <input value={d.name} onChange={(e) => updateListItem("debts", d.id, "name", e.target.value)} placeholder="e.g. Credit Card" style={INPUT_STYLE} />
                        </div>
                        <div style={{ flex: "1 1 80px" }}>
                          {d.id === 1 && <FieldLabel>Balance ($)</FieldLabel>}
                          <input type="number" step="0.01" min="0" value={d.balance} onChange={(e) => updateListItem("debts", d.id, "balance", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                        </div>
                        <div style={{ flex: "1 1 75px" }}>
                          {d.id === 1 && <FieldLabel>Min Pmt</FieldLabel>}
                          <input type="number" step="0.01" min="0" value={d.minPayment} onChange={(e) => updateListItem("debts", d.id, "minPayment", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                        </div>
                        <div style={{ flex: "0.6 1 60px" }}>
                          {d.id === 1 && <FieldLabel>APR %</FieldLabel>}
                          <input type="number" step="0.1" min="0" value={d.apr} onChange={(e) => updateListItem("debts", d.id, "apr", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                        </div>
                        {data.debts.length > 1 && (
                          <button onClick={() => removeListItem("debts", d.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px 4px", fontSize: 18, lineHeight: 1 }}>×</button>
                        )}
                      </div>
                      {/* Row 2: Frequency + Due Date */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ flex: "1 1 110px" }}>
                          <FieldLabel>Payment Frequency</FieldLabel>
                          <select value={d.frequency} onChange={(e) => updateListItem("debts", d.id, "frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Biweekly</option>
                            <option value="semimonthly">1st & 15th</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Annually</option>
                          </select>
                        </div>
                        {d.frequency !== "semimonthly" && d.frequency !== "weekly" && d.frequency !== "biweekly" && (
                          <div style={{ flex: "0 1 80px" }}>
                            <FieldLabel>Due Day</FieldLabel>
                            <select value={d.dueDay} onChange={(e) => updateListItem("debts", d.id, "dueDay", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                <option key={day} value={day}>{day}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {d.frequency === "yearly" && (
                          <div style={{ flex: "1 1 100px" }}>
                            <FieldLabel>Due Month</FieldLabel>
                            <select value={d.dueMonth || "1"} onChange={(e) => updateListItem("debts", d.id, "dueMonth", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                                <option key={i+1} value={i+1}>{m}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addListItem("debts", { name: "", balance: "", minPayment: "", apr: "", dueDay: "1", frequency: "monthly", dueMonth: "1" })}
                    style={{ padding: "6px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                    + Add Debt
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Theme */}
            {step === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>Pick a look that feels right. You can change this anytime in Settings.</div>

                {/* Dark / Light */}
                <div style={{ display: "flex", gap: 10 }}>
                  {[{ key: "dark", label: "Dark", icon: "🌙" }, { key: "light", label: "Light", icon: "☀" }].map((mode) => {
                    const active = data.theme === mode.key;
                    return (
                      <div key={mode.key} onClick={() => update("theme", mode.key)}
                        style={{ flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`, background: active ? "var(--accent)" + "10" : "var(--surface)", textAlign: "center", transition: "all 0.15s" }}>
                        <div style={{ fontSize: 20, marginBottom: 2 }}>{mode.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>{mode.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Color themes */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {Object.entries(COLOR_THEMES).map(([key, theme]) => {
                    const active = data.colorTheme === key;
                    return (
                      <div key={key} onClick={() => update("colorTheme", key)}
                        style={{ padding: "10px", borderRadius: 8, cursor: "pointer", border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`, background: active ? "var(--accent)" + "10" : "var(--surface)", textAlign: "center", transition: "all 0.15s" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 6 }}>
                          {theme.preview.map((c, i) => <span key={i} style={{ width: 14, height: 14, borderRadius: 3, background: c }} />)}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-muted)" }}>{theme.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div style={{ padding: "0 24px 24px", display: "flex", gap: 10 }}>
            {!isFirst && (
              <button onClick={() => setStep((s) => s - 1)}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Back
              </button>
            )}
            {isFirst && (
              <button onClick={() => {
                // Skip onboarding — use sample data
                onComplete({ settings: { ...DEFAULT_SETTINGS, onboardingComplete: true } });
              }}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Skip — Use Sample Data
              </button>
            )}
            <button onClick={() => {
              if (isLast) handleFinish();
              else setStep((s) => s + 1);
            }}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {isLast ? "Let's Go!" : "Next"}
            </button>
          </div>
        </Card>

        {/* Step counter */}
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--text-muted)" }}>
          Step {step + 1} of {ONBOARDING_STEPS.length}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────

export default function MaverickOS() {
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [undoToast, setUndoToast] = useState(null); // { message, snapshot }
  const isMobile = useIsMobile();

  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [income, setIncome] = useState(INITIAL_INCOME);
  const [billTemplates, setBillTemplates] = useState(INITIAL_BILL_TEMPLATES);
  const [paidDates, setPaidDates] = useState(INITIAL_PAID_DATES);
  const [savingsGoals, setSavingsGoals] = useState(INITIAL_SAVINGS_GOALS);
  const [debts, setDebts] = useState(INITIAL_DEBTS);
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [paycheckStreams, setPaycheckStreams] = useState(INITIAL_PAYCHECK_STREAMS);
  const [customItems, setCustomItems] = useState(INITIAL_CUSTOM_ITEMS);
  const [monthlyRollovers, setMonthlyRollovers] = useState({});
  const [budgetRollovers, setBudgetRollovers] = useState(INITIAL_BUDGET_ROLLOVERS);
  const [budgetTargets, setBudgetTargets] = useState(INITIAL_BUDGET_TARGETS);
  const [recurringTransactions, setRecurringTransactions] = useState(INITIAL_RECURRING_TRANSACTIONS);
  const [networthHistory, setNetworthHistory] = useState(INITIAL_NETWORTH_HISTORY);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Undo system — snapshot current state before destructive actions
  const takeSnapshot = useCallback(() => ({
    categories, transactions, income, billTemplates, paidDates, savingsGoals,
    debts, assets, paycheckStreams, customItems, monthlyRollovers,
    budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings,
  }), [categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings]);

  const restoreSnapshot = useCallback((snap) => {
    if (snap.categories) setCategories(snap.categories);
    if (snap.transactions) setTransactions(snap.transactions);
    if (snap.income) setIncome(snap.income);
    if (snap.billTemplates) setBillTemplates(snap.billTemplates);
    if (snap.paidDates) setPaidDates(snap.paidDates);
    if (snap.savingsGoals) setSavingsGoals(snap.savingsGoals);
    if (snap.debts) setDebts(snap.debts);
    if (snap.assets) setAssets(snap.assets);
    if (snap.paycheckStreams) setPaycheckStreams(snap.paycheckStreams);
    if (snap.customItems) setCustomItems(snap.customItems);
    if (snap.monthlyRollovers) setMonthlyRollovers(snap.monthlyRollovers);
    if (snap.budgetRollovers) setBudgetRollovers(snap.budgetRollovers);
    if (snap.budgetTargets) setBudgetTargets(snap.budgetTargets);
    if (snap.recurringTransactions) setRecurringTransactions(snap.recurringTransactions);
    if (snap.networthHistory) setNetworthHistory(snap.networthHistory);
    if (snap.settings) setSettings(snap.settings);
  }, []);

  const showUndo = useCallback((message) => {
    const snapshot = takeSnapshot();
    setUndoToast({ message, snapshot });
  }, [takeSnapshot]);

  const handleUndo = useCallback(() => {
    if (undoToast?.snapshot) restoreSnapshot(undoToast.snapshot);
    setUndoToast(null);
  }, [undoToast, restoreSnapshot]);

  // Load from localStorage on mount — show onboarding if no saved data
  useEffect(() => {
    const saved = loadState();
    if (!saved) {
      setShowOnboarding(true);
      setLoaded(true);
      return;
    }
    if (saved) {
      if (saved.categories) setCategories(saved.categories);
      if (saved.transactions) setTransactions(saved.transactions);
      if (saved.income) setIncome(saved.income);
      if (saved.billTemplates) setBillTemplates(saved.billTemplates);
      if (saved.paidDates) setPaidDates(saved.paidDates);
      if (saved.savingsGoals) setSavingsGoals(saved.savingsGoals);
      if (saved.debts) setDebts(saved.debts);
      if (saved.assets) setAssets(saved.assets);
      if (saved.paycheckStreams) setPaycheckStreams(saved.paycheckStreams);
      if (saved.customItems) setCustomItems(saved.customItems);
      if (saved.monthlyRollovers) setMonthlyRollovers(saved.monthlyRollovers);
      if (saved.budgetRollovers) setBudgetRollovers(saved.budgetRollovers);
      if (saved.budgetTargets) setBudgetTargets(saved.budgetTargets);
      if (saved.recurringTransactions) setRecurringTransactions(saved.recurringTransactions);
      if (saved.networthHistory) setNetworthHistory(saved.networthHistory);
      if (saved.settings) setSettings(saved.settings);
      seedNextId(saved);
    }
    setLoaded(true);
  }, []);

  // Sync savings goals → budget categories after load (YNAB-style)
  useEffect(() => {
    if (!loaded) return;
    savingsGoals.forEach((goal) => {
      const catId = `savings_${goal.id}`;
      setCategories((prev) => {
        if (prev.find((c) => c.id === catId)) return prev;
        return [...prev, { id: catId, name: goal.name, icon: goal.icon || "💰", limit: goal.monthlyContribution || 0, color: goal.color || "var(--accent)" }];
      });
      if (goal.target > 0) {
        setBudgetTargets((prev) => {
          if (prev[catId]) return prev;
          return { ...prev, [catId]: { type: "target_by_date", targetAmount: goal.target, targetDate: goal.deadline || "", funded: goal.current || 0 } };
        });
      }
    });
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire browser notifications for bills due, budget alerts, monthly recap
  useEffect(() => {
    if (!loaded) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notifPrefs = settings.notifications || {};
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const lastNotifKey = "maverickos_last_notif";
    const lastNotif = localStorage.getItem(lastNotifKey);
    if (lastNotif === todayStr) return; // Already fired today
    localStorage.setItem(lastNotifKey, todayStr);

    // Bills due in next 3 days
    if (notifPrefs.billsDue) {
      const upcoming = generateUpcomingBills(billTemplates, paidDates, 1);
      const soon = upcoming.filter((b) => {
        const due = new Date(b.instanceDate + "T00:00:00");
        const diff = Math.ceil((due - today) / 86400000);
        return diff >= 0 && diff <= 3;
      });
      if (soon.length > 0) {
        const total = soon.reduce((s, b) => s + b.amount, 0);
        new Notification(`${soon.length} bill${soon.length > 1 ? "s" : ""} due soon`, {
          body: `${soon.map((b) => b.name).join(", ")} — ${fmt(total)} total`,
          icon: "/icon-192.png",
        });
      }
    }

    // Monthly recap on 1st of month
    if (notifPrefs.monthlyRecap && today.getDate() === 1) {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lmKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
      const lmTx = transactions.filter((t) => t.date.startsWith(lmKey));
      const lmSpent = lmTx.reduce((s, t) => s + t.amount, 0);
      if (lmSpent > 0) {
        new Notification(`${lastMonth.toLocaleDateString("en-US", { month: "long" })} Recap`, {
          body: `You spent ${fmt(lmSpent)} last month across ${lmTx.length} transactions.`,
          icon: "/icon-192.png",
        });
      }
    }
  }, [loaded, settings.notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to localStorage whenever state changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    saveState({ categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings });
  }, [loaded, categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings]);

  // Export all data as JSON download
  const handleExport = useCallback(() => {
    const data = { categories, transactions, income, billTemplates, paidDates: [...paidDates], savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `maverickos-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  }, [categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings]);

  // Export transactions as CSV
  const handleExportCsv = useCallback(() => {
    const catMap = {};
    categories.forEach((c) => { catMap[c.id] = c.name; });
    const header = ["Date", "Description", "Category", "Amount"];
    const rows = [...transactions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => [
        t.date,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        `"${(catMap[t.categoryId] || t.categoryId || "").replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
      ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `maverickos-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [transactions, categories]);

  // Import data from JSON string
  const handleImport = useCallback((jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.categories) setCategories(data.categories);
      if (data.transactions) setTransactions(data.transactions);
      if (data.income) setIncome(data.income);
      if (data.billTemplates) setBillTemplates(data.billTemplates);
      if (data.paidDates) setPaidDates(new Set(data.paidDates));
      if (data.savingsGoals) setSavingsGoals(data.savingsGoals);
      if (data.debts) setDebts(data.debts);
      if (data.assets) setAssets(data.assets);
      if (data.paycheckStreams) setPaycheckStreams(data.paycheckStreams);
      if (data.customItems) setCustomItems(data.customItems);
      if (data.monthlyRollovers) setMonthlyRollovers(data.monthlyRollovers);
      if (data.budgetRollovers) setBudgetRollovers(data.budgetRollovers);
      if (data.budgetTargets) setBudgetTargets(data.budgetTargets);
      if (data.recurringTransactions) setRecurringTransactions(data.recurringTransactions);
      if (data.networthHistory) setNetworthHistory(data.networthHistory);
      if (data.settings) setSettings(data.settings);
    } catch {}
  }, []);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setCategories(INITIAL_CATEGORIES); setTransactions(INITIAL_TRANSACTIONS);
    setIncome(INITIAL_INCOME); setBillTemplates(INITIAL_BILL_TEMPLATES);
    setPaidDates(INITIAL_PAID_DATES); setSavingsGoals(INITIAL_SAVINGS_GOALS);
    setDebts(INITIAL_DEBTS); setAssets(INITIAL_ASSETS);
    setPaycheckStreams(INITIAL_PAYCHECK_STREAMS); setCustomItems(INITIAL_CUSTOM_ITEMS);
    setMonthlyRollovers({}); setBudgetRollovers({}); setBudgetTargets(INITIAL_BUDGET_TARGETS); setRecurringTransactions(INITIAL_RECURRING_TRANSACTIONS); setNetworthHistory(INITIAL_NETWORTH_HISTORY); setSettings(DEFAULT_SETTINGS);
    clearState();
  }, []);

  // Import transactions from CSV string (Date, Description, Category, Amount)
  const handleImportCsv = useCallback((csvStr) => {
    try {
      const lines = csvStr.trim().split(/\r?\n/);
      if (lines.length < 2) return;
      // Auto-detect header row
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes("date") || firstLine.includes("description") || firstLine.includes("amount");
      const dataLines = hasHeader ? lines.slice(1) : lines;
      // Build category name→id map (case-insensitive)
      const catNameMap = {};
      categories.forEach((c) => { catNameMap[c.name.toLowerCase()] = c.id; });
      const parseCSVRow = (line) => {
        const result = [];
        let cur = "", inQuote = false;
        for (const ch of line) {
          if (ch === '"') { inQuote = !inQuote; }
          else if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; }
          else { cur += ch; }
        }
        result.push(cur.trim());
        return result;
      };
      const imported = [];
      dataLines.forEach((line) => {
        if (!line.trim()) return;
        const cols = parseCSVRow(line);
        if (cols.length < 3) return;
        // Flexible column detection: try Date, Description, Category, Amount order
        // Also handle: Date, Description, Amount (no category)
        let dateStr, description, categoryName, amountStr;
        if (cols.length >= 4) {
          [dateStr, description, categoryName, amountStr] = cols;
        } else {
          [dateStr, description, amountStr] = cols;
          categoryName = "";
        }
        // Normalize date to YYYY-MM-DD
        let date = dateStr.replace(/"/g, "").trim();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
          const [m, d, y] = date.split("/");
          date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(date)) {
          const [m, d, y] = date.split("-");
          date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        const amount = Math.abs(parseFloat(amountStr.replace(/[^0-9.\-]/g, "")));
        if (isNaN(amount) || amount <= 0) return;
        const desc = description.replace(/^"|"$/g, "").trim();
        if (!desc) return;
        const catKey = categoryName.replace(/^"|"$/g, "").trim().toLowerCase();
        const categoryId = catNameMap[catKey] || categories[0]?.id || "";
        imported.push({ id: nextId(), date, description: desc, amount, categoryId });
      });
      if (imported.length > 0) {
        setTransactions((prev) => {
          // Deduplicate by date+description+amount
          const existing = new Set(prev.map((t) => `${t.date}|${t.description}|${t.amount}`));
          const fresh = imported.filter((t) => !existing.has(`${t.date}|${t.description}|${t.amount}`));
          return [...prev, ...fresh];
        });
      }
      alert(`Imported ${imported.length} transaction${imported.length !== 1 ? "s" : ""}.`);
    } catch (e) {
      alert("Could not parse CSV. Expected columns: Date, Description, Category, Amount.");
    }
  }, [categories]);

  // Handle onboarding completion — apply wizard data, clear sample data
  const handleOnboardingComplete = useCallback((data) => {
    // Apply whatever the wizard sends — it handles both full setup and skip paths
    if (data.categories) setCategories(data.categories);
    if (data.transactions) setTransactions(data.transactions);
    if (data.income) setIncome(data.income);
    if (data.billTemplates) setBillTemplates(data.billTemplates);
    if (data.paidDates) setPaidDates(data.paidDates instanceof Set ? data.paidDates : new Set());
    if (data.savingsGoals) setSavingsGoals(data.savingsGoals);
    if (data.debts) setDebts(data.debts);
    if (data.assets) setAssets(data.assets);
    if (data.budgetTargets) setBudgetTargets(data.budgetTargets);

    // For skip path — only settings is provided, keep sample data
    if (data.settings) {
      setSettings((s) => ({ ...s, ...data.settings }));
    }

    // Clear transient state for fresh start
    if (data.transactions !== undefined) {
      setPaycheckStreams([]);
      setCustomItems({});
      setMonthlyRollovers({});
      setBudgetRollovers({});
      if (!data.budgetTargets) setBudgetTargets({});
      setRecurringTransactions([]);
    }

    setShowOnboarding(false);
  }, []);

  // Get active color theme and mode
  const activeTheme = COLOR_THEMES[settings.colorTheme] || COLOR_THEMES.blue_gold;
  const isDark = settings.theme !== "light";
  const themeVars = isDark ? activeTheme.dark : activeTheme.light;
  // Keep module-level currency formatter in sync with settings
  setCurrency(settings.currency || "USD");

  // Show onboarding wizard for first-time users
  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div data-color-theme={settings.colorTheme || "blue_gold"} data-mode={isDark ? "dark" : "light"} style={{
      ...themeVars,
      fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
      background: "var(--bg)", color: "var(--text-primary)",
      display: "flex", minHeight: "100vh", boxSizing: "border-box",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <PwaHead />
      <ThemeStyles />
      <ResponsiveStyles />

      {!isMobile && (
        <Sidebar activePage={page} onNavigate={setPage} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} hiddenPages={settings.hiddenPages || []} />
      )}

      <main className="maverick-main" style={{
        flex: 1,
        padding: isMobile ? "16px 12px 80px" : "32px 36px",
        minWidth: 0, overflowY: "auto", maxHeight: "100vh",
      }}>
        <div className="maverick-content" style={{ maxWidth: 1000, margin: "0 auto" }}>
          {page === "dashboard" && (
            <DashboardPage categories={categories} transactions={transactions} income={income}
              billTemplates={billTemplates} paidDates={paidDates}
              savingsGoals={savingsGoals} debts={debts} assets={assets} settings={settings}
              recurringTransactions={recurringTransactions} setTransactions={setTransactions} />
          )}
          {page === "budget" && (
            <BudgetPage categories={categories} transactions={transactions} setCategories={setCategories} setTransactions={setTransactions} income={income} budgetTargets={budgetTargets} setBudgetTargets={setBudgetTargets} budgetRollovers={budgetRollovers} setBudgetRollovers={setBudgetRollovers} showUndo={showUndo} settings={settings} />
          )}
          {page === "calendar" && (
            <CalendarPage billTemplates={billTemplates} setBillTemplates={setBillTemplates}
              paidDates={paidDates} setPaidDates={setPaidDates} />
          )}
          {page === "recurring" && (
            <RecurringBillsPage billTemplates={billTemplates} setBillTemplates={setBillTemplates}
              paidDates={paidDates} onNavigate={setPage} showUndo={showUndo} transactions={transactions} />
          )}
          {page === "autospend" && (
            <RecurringTransactionsPage recurringTransactions={recurringTransactions} setRecurringTransactions={setRecurringTransactions}
              categories={categories} transactions={transactions} setTransactions={setTransactions} showUndo={showUndo} />
          )}
          {page === "savings" && (
            <SavingsPage savingsGoals={savingsGoals} setSavingsGoals={setSavingsGoals} showUndo={showUndo}
              categories={categories} setCategories={setCategories}
              setTransactions={setTransactions} budgetTargets={budgetTargets} setBudgetTargets={setBudgetTargets} />
          )}
          {page === "paycheck" && (
            <PaycheckPlannerPage paycheckStreams={paycheckStreams} setPaycheckStreams={setPaycheckStreams}
              billTemplates={billTemplates} savingsGoals={savingsGoals} setSavingsGoals={setSavingsGoals} paidDates={paidDates} setPaidDates={setPaidDates}
              customItems={customItems} setCustomItems={setCustomItems}
              monthlyRollovers={monthlyRollovers} setMonthlyRollovers={setMonthlyRollovers}
              income={income} settings={settings} setSettings={setSettings} showUndo={showUndo} />
          )}
          {page === "income" && (
            <IncomePage income={income} setIncome={setIncome} showUndo={showUndo} />
          )}
          {page === "debt" && (
            <DebtPage debts={debts} setDebts={setDebts} showUndo={showUndo} />
          )}
          {page === "networth" && (
            <NetWorthPage assets={assets} setAssets={setAssets} debts={debts} showUndo={showUndo}
              networthHistory={networthHistory} setNetworthHistory={setNetworthHistory} />
          )}
          {page === "strategy" && (
            <DebtStrategyPage debts={debts} income={income} />
          )}
          {page === "roadmap" && (
            <FinancialRoadmapPage savingsGoals={savingsGoals} debts={debts} income={income}
              transactions={transactions} assets={assets} categories={categories} onNavigate={setPage} />
          )}
          {page === "calculator" && (
            <CalculatorPage />
          )}
          {page === "transactions" && (
            <TransactionsPage transactions={transactions} setTransactions={setTransactions} categories={categories} showUndo={showUndo} />
          )}
          {page === "summary" && (
            <MonthlySummaryPage categories={categories} transactions={transactions} income={income}
              billTemplates={billTemplates} paidDates={paidDates} savingsGoals={savingsGoals} debts={debts} settings={settings} />
          )}
          {page === "forecast" && (
            <CashFlowForecastPage income={income} billTemplates={billTemplates} paidDates={paidDates}
              transactions={transactions} savingsGoals={savingsGoals} debts={debts} assets={assets} />
          )}
          {page === "trends" && (
            <SpendingTrendsPage categories={categories} transactions={transactions} />
          )}
          {page === "settings" && (
            <SettingsPage settings={settings} setSettings={setSettings}
              onExport={handleExport} onExportCsv={handleExportCsv} onImport={handleImport} onImportCsv={handleImportCsv} onReset={handleReset}
              onRestartWizard={() => { clearState(); setShowOnboarding(true); }} />
          )}
        </div>
      </main>

      {/* Undo Toast */}
      {undoToast && (
        <UndoToast
          message={undoToast.message}
          onUndo={handleUndo}
          onDismiss={() => setUndoToast(null)}
        />
      )}

      {/* Floating Action Button — quick add transaction from any page */}
      <FloatingActionButton categories={categories} onAddTransaction={(tx) => setTransactions((p) => [...p, tx])} />

      {isMobile && (
        <MobileNav activePage={page} onNavigate={setPage} onMore={() => setMobileMore(true)} />
      )}
      {isMobile && mobileMore && (
        <MobileMoreMenu activePage={page} onNavigate={setPage} onClose={() => setMobileMore(false)} hiddenPages={settings.hiddenPages || []} />
      )}
    </div>
  );
}
