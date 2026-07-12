// Photobooth Studio Constants and Helpers

export interface PoseChallenge {
  id: string;
  title: string;
  description: string;
  svgType: "cheek_heart" | "wink_peace" | "flower_face" | "double_peace" | "cat_ears" | "sleepy_angel";
}

export const POSE_CHALLENGES: PoseChallenge[] = [
  {
    id: "pose1",
    title: "Cheek Heart",
    description: "Bentuk setengah hati di pipi dengan jari manis atau telunjukmu!",
    svgType: "cheek_heart"
  },
  {
    id: "pose2",
    title: "Wink & Peace",
    description: "Kedipkan satu mata manis dan berikan pose damai (dua jari) di depan mata!",
    svgType: "wink_peace"
  },
  {
    id: "pose3",
    title: "Flower Face",
    description: "Letakkan kedua telapak tangan di bawah dagu seperti kuntum bunga merekah!",
    svgType: "flower_face"
  },
  {
    id: "pose4",
    title: "Double Peace",
    description: "Pose legendaris Jepang! Angkat kedua tangan membentuk 'V' di dekat pipimu!",
    svgType: "double_peace"
  },
  {
    id: "pose5",
    title: "Cute Cat Ears",
    description: "Angkat tanganmu di atas kepala dan tekuk pergelangan seperti telinga kucing!",
    svgType: "cat_ears"
  },
  {
    id: "pose6",
    title: "Sleepy Angel",
    description: "Tangkupkan tangan di pipi kanan atau kiri seolah sedang bermimpi indah!",
    svgType: "sleepy_angel"
  }
];

export interface FilterPreset {
  id: string;
  name: string;
  css: string;
  desc: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "natural", name: "Natural", css: "", desc: "Tampilan asli kamera tanpa sentuhan tambahan." },
  { id: "warm", name: "Warm Sun", css: "sepia(0.2) saturate(1.15) hue-rotate(-5deg)", desc: "Sentuhan hangat sinar matahari sore." },
  { id: "cool", name: "Cool Glacier", css: "saturate(0.9) hue-rotate(8deg) brightness(1.05)", desc: "Tone biru dingin estetik ala nordic." },
  { id: "moody", name: "Moody Teal", css: "contrast(1.25) saturate(0.85) brightness(0.9) sepia(0.12)", desc: "Kontras tinggi, saturasi diredam, nuansa sinematik." },
  { id: "vintage", name: "Vintage Tea", css: "sepia(0.55) contrast(0.92) brightness(1.05) saturate(0.85)", desc: "Kamera analog tahun 80-an dengan nuansa teh klasik." },
  { id: "film", name: "35mm Film", css: "contrast(1.1) saturate(1.2) sepia(0.15) brightness(1.03)", desc: "Warna pekat film analog fuji style." },
  { id: "disposable", name: "Disposable", css: "saturate(1.22) sepia(0.2) hue-rotate(-8deg) contrast(1.08) brightness(1.02)", desc: "Warna kehijauan retro khas kamera saku jadul." },
  { id: "kodachrome", name: "Kodachrome", css: "contrast(1.25) saturate(1.35) sepia(0.08) hue-rotate(-4deg)", desc: "Merah menyala dan hitam pekat legendaris." },
  { id: "portra", name: "Portra 400", css: "contrast(1.04) saturate(1.08) sepia(0.06) brightness(1.05)", desc: "Warna kulit lembut, kontras natural." },
  { id: "softskin", name: "Soft Skin", css: "contrast(0.95) saturate(1.05) brightness(1.12) blur(0.2px)", desc: "Menyamarkan noda wajah, glowing instan." },
  { id: "dream", name: "Dreamy Glow", css: "brightness(1.1) blur(0.8px) saturate(1.12)", desc: "Efek halasi lembut bernuansa fantasi romantis." },
  { id: "monochrome", name: "Monochrome", css: "grayscale(1) contrast(1.2) brightness(0.96)", desc: "Hitam putih sinematik dengan grain dalam." },
  { id: "golden", name: "Golden Hour", css: "sepia(0.38) saturate(1.45) hue-rotate(-12deg) brightness(1.04)", desc: "Cahaya keemasan fajar yang romantis." },
  { id: "night", name: "Midnight City", css: "brightness(0.82) contrast(1.15) hue-rotate(12deg) saturate(0.72)", desc: "Tone cyberpunk biru gelap misterius." },
  { id: "pastel", name: "Pastel Pop", css: "brightness(1.16) saturate(1.3) contrast(0.88)", desc: "Saturasi cerah dengan kontras lembut nan manis." }
];

export interface FrameStyle {
  id: string;
  name: string;
  desc: string;
  bgColor: string;
  textColor: string;
  borderStyle: string;
  icon: string;
}

export const FRAME_STYLES: FrameStyle[] = [
  {
    id: "classic",
    name: "Classic Photobooth",
    desc: "Garis hitam tipis, background putih bersih tradisional.",
    bgColor: "#ffffff",
    textColor: "#0f172a",
    borderStyle: "border border-slate-900/10",
    icon: "🔳"
  },
  {
    id: "vintage",
    name: "Vintage Kraft",
    desc: "Kertas tua kusam, efek sobekan, dan tekstur film jadul.",
    bgColor: "#e6dfcc",
    textColor: "#4e3b2b",
    borderStyle: "border border-amber-900/15 bg-paper",
    icon: "📜"
  },
  {
    id: "disposable",
    name: "Disposable Cam",
    desc: "Timestamp digital oranye, grain tebal, tone kehijauan khas.",
    bgColor: "#2d3e33",
    textColor: "#fdba74",
    borderStyle: "border border-emerald-950/20",
    icon: "📷"
  },
  {
    id: "y2k",
    name: "Y2K Retro-Futurism",
    desc: "Aksen chrome metalik, glitter mengkilap, dan bintang lucu.",
    bgColor: "#d9f99d", // Lime base
    textColor: "#1e3a1e",
    borderStyle: "border border-lime-300",
    icon: "🌌"
  },
  {
    id: "korean",
    name: "Korean Minimal",
    desc: "Putih salju, margin lebar, tipografi tipis estetik.",
    bgColor: "#fafafa",
    textColor: "#18181b",
    borderStyle: "border border-zinc-100",
    icon: "🌸"
  },
  {
    id: "cinema",
    name: "Cinema 35mm",
    desc: "Perforasi film, nomor rol, tulisan Kodak/Fuji Style.",
    bgColor: "#111111",
    textColor: "#f97316",
    borderStyle: "border border-neutral-800",
    icon: "🎬"
  },
  {
    id: "polaroid",
    name: "Polaroid Style",
    desc: "Bawah tebal, tekstur kertas padat, bayangan realistis.",
    bgColor: "#fefefe",
    textColor: "#0f172a",
    borderStyle: "border border-slate-100 shadow-2xl",
    icon: "📸"
  },
  {
    id: "scrapbook",
    name: "Scrapbook Tape",
    desc: "Grid pastel, selotip washi tempel, coretan tangan gemas.",
    bgColor: "#fed7aa", // Orange-pastel
    textColor: "#7c2d12",
    borderStyle: "border border-orange-200",
    icon: "🧸"
  },
  {
    id: "minimal",
    name: "Aesthetic Plain",
    desc: "Sangat bersih, putih polos, hanya nama dan tanggal mungil.",
    bgColor: "#ffffff",
    textColor: "#71717a",
    borderStyle: "border border-transparent",
    icon: "🍃"
  },
  {
    id: "retro",
    name: "Retro Pop",
    desc: "Warna hangat mencolok, grain analog, vignet gelap.",
    bgColor: "#ea580c", // Deep orange
    textColor: "#fef3c7",
    borderStyle: "border border-orange-700",
    icon: "📻"
  }
];

export interface StickerTemplate {
  category: string;
  stickers: string[];
}

export const STICKER_LIST: Record<string, string[]> = {
  "Smile": ["😊", "😄", "😎", "🥳", "🥰", "😜", "🤩", "🤪", "🤠", "🥺"],
  "Sparkle": ["✨", "🌟", "⭐", "💫", "⚡", "💥", "🔥"],
  "Stars": ["⭐", "🌙", "🌠", "🌌", "🪐", "🌟"],
  "Cloud": ["☁️", "🌧️", "⛅", "🎈", "🌈", "☀️", "💧"],
  "Flower": ["🌸", "🌹", "🌻", "🌷", "🍀", "🌼", "🌿", "🍁"],
  "Heart": ["❤️", "💖", "💝", "💕", "💘", "💌", "🧡", "💛", "💚", "💙", "💜"],
  "Tape": ["Tape_Pink", "Tape_Grid", "Tape_Washi", "Tape_Yellow", "Tape_Blue"],
  "Paper": ["Paper_Note", "Paper_Torn", "Paper_Label", "Paper_Stamp"],
  "Camera": ["📷", "📹", "🎞️", "🎬", "🎙️", "👓"],
  "Ribbon": ["🎀", "🎗️", "🧸", "🎒", "👒", "👑"],
  "Pixel": ["👾", "🎮", "👾", "❤️‍🔥", "⚡", "👾"],
  "Emoji": ["🔥", "🍕", "🍦", "🍩", "🐱", "🐶", "🦄", "🍒", "🍓", "🍟", "🥤"],
  "Doodle": ["Doodle_Crown", "Doodle_Cat", "Doodle_Heart", "Doodle_Sparkle", "Doodle_Halo", "Doodle_Arrow"]
};

export interface FontOption {
  id: string;
  name: string;
  className: string;
  css: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: "modern", name: "Space Grotesk (Modern)", className: "font-modern", css: "'Space Grotesk', sans-serif" },
  { id: "handwriting", name: "Caveat (Handwriting)", className: "font-handwriting", css: "'Caveat', cursive" },
  { id: "handwriting-alt", name: "Pacifico (Retro Wave)", className: "font-handwriting-alt", css: "'Pacifico', cursive" },
  { id: "typewriter", name: "Special Elite (Typewriter)", className: "font-typewriter", css: "'Special Elite', monospace" },
  { id: "retro", name: "Syne (Retro Bold)", className: "font-retro", css: "'Syne', sans-serif" },
  { id: "minimal-serif", name: "Playfair (Classic Serif)", className: "font-minimal-serif", css: "'Playfair Display', serif" },
  { id: "rounded", name: "Quicksand (Rounded)", className: "font-rounded", css: "'Quicksand', sans-serif" },
  { id: "bold-display", name: "Outfit (Ultra Bold)", className: "font-bold-display", css: "'Outfit', sans-serif" }
];

export interface LayoutPreset {
  id: string;
  name: string;
  cols: number;
  rows: number;
  width: number;
  height: number;
  aspect: string;
  icon: string;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  { id: "4-vertical", name: "4 Foto Vertikal", cols: 1, rows: 4, width: 320, height: 240, aspect: "aspect-[3/4]", icon: "❙" },
  { id: "2x2", name: "Square 2x2 Grid", cols: 2, rows: 2, width: 320, height: 240, aspect: "aspect-square", icon: "田" },
  { id: "polaroid", name: "Classic Polaroid Single", cols: 1, rows: 1, width: 480, height: 360, aspect: "aspect-[4/5]", icon: "🖼️" },
  { id: "horizontal", name: "Horizontal Strip", cols: 4, rows: 1, width: 320, height: 240, aspect: "aspect-[4/1]", icon: "▬" },
  { id: "mini-strip", name: "Mini Strip (2 Foto)", cols: 1, rows: 2, width: 320, height: 240, aspect: "aspect-[3/5]", icon: "▰" },
  { id: "long-strip", name: "Long Strip Stack", cols: 1, rows: 4, width: 280, height: 210, aspect: "aspect-[1/5]", icon: "║" },
  { id: "square-grid", name: "Grid Polaroid Combo", cols: 2, rows: 2, width: 300, height: 300, aspect: "aspect-[1/1]", icon: "🔳" }
];

export interface DownloadRatio {
  id: string;
  name: string;
  scale: number;
  format: "png" | "jpeg";
  desc: string;
}

export const DOWNLOAD_RATIOS: DownloadRatio[] = [
  { id: "png-1080p", name: "PNG (High Quality 1080p)", scale: 1, format: "png", desc: "Sangat tajam, cocok untuk digital sharing." },
  { id: "jpg-1080p", name: "JPG (Standard 1080p)", scale: 1, format: "jpeg", desc: "Ukuran file ringan dengan kualitas optimal." },
  { id: "png-2k", name: "PNG (Super Clear 2K)", scale: 1.5, format: "png", desc: "Detail ekstra untuk layar resolusi tinggi." },
  { id: "png-4k", name: "PNG (Ultra Sharp 4K)", scale: 2.5, format: "png", desc: "Kualitas master untuk dicetak tanpa pecah." },
  { id: "printable", name: "Printable (A6 Format)", scale: 2.0, format: "png", desc: "Disesuaikan untuk langsung dicetak ukuran foto." },
  { id: "ig-story", name: "Instagram Story Ratio", scale: 1.5, format: "png", desc: "Potongan ramping 9:16 siap posting Story." },
  { id: "ig-feed", name: "Instagram Feed (1:1 Ratio)", scale: 1.5, format: "png", desc: "Potongan persegi rapi untuk feed profil." },
  { id: "wallpaper", name: "Smartphone Wallpaper", scale: 2.0, format: "png", desc: "Tinggi penuh disesuaikan untuk latar HP Anda." }
];

export interface BackgroundPreset {
  id: string;
  name: string;
  type: "warna-polos" | "gradient-lembut" | "tekstur-kertas" | "tekstur-kain" | "tekstur-film" | "grid" | "minimal-pattern";
  value: string;
  color?: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: "bg-white", name: "White Snow", type: "warna-polos", value: "#ffffff" },
  { id: "bg-black", name: "Obsidian Black", type: "warna-polos", value: "#000000" },
  { id: "bg-pastel-pink", name: "Blossom Pink", type: "warna-polos", value: "#ffe4e6" },
  { id: "bg-pastel-blue", name: "Powder Blue", type: "warna-polos", value: "#e0f2fe" },
  { id: "bg-pastel-yellow", name: "Lemon Custard", type: "warna-polos", value: "#fef9c3" },
  { id: "bg-pastel-green", name: "Mint Foam", type: "warna-polos", value: "#dcfce7" },
  
  // Gradients
  { id: "grad-sunset", name: "Sunset Horizon", type: "gradient-lembut", value: "linear-gradient(135deg, #fecdd3 0%, #ffedd5 100%)" },
  { id: "grad-aurora", name: "Nordic Aurora", type: "gradient-lembut", value: "linear-gradient(135deg, #ccfbf1 0%, #fef9c3 100%)" },
  { id: "grad-candy", name: "Bubblegum Pop", type: "gradient-lembut", value: "linear-gradient(135deg, #fae8ff 0%, #e0f2fe 100%)" },
  { id: "grad-night", name: "Neon Midnight", type: "gradient-lembut", value: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)" },
  
  // Textures
  { id: "tex-paper", name: "Craft Paper Texture", type: "tekstur-kertas", value: "bg-paper bg-grain" },
  { id: "tex-kain", name: "Linen Fiber Mesh", type: "tekstur-kain", value: "bg-canvas" },
  { id: "tex-film", name: "Vintage Noise Film", type: "tekstur-film", value: "vintage-overlay bg-grain" },
  
  // Patterns
  { id: "pat-grid", name: "Minimal Grid Pattern", type: "grid", value: "bg-grid" },
  { id: "pat-hearts", name: "Mini Hearts Float", type: "minimal-pattern", value: "bg-hearts" }
];
