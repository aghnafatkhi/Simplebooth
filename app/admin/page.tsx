"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Plus,
  Trash2,
  Camera,
  Image as ImageIcon,
  ArrowLeft,
  Sparkles,
  Layers,
  Check,
  Lock,
  Eye,
  Info,
  Maximize,
  Crop,
  Sparkle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomPose {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

interface CustomFrame {
  id: string;
  name: string;
  desc: string;
  bgColor: string;
  textColor: string;
  frameBackgroundImageUrl?: string;
  frameOverlayImageUrl?: string;
  createdAt: string;
  slots?: Array<{ x: number; y: number; w: number; h: number }>;
}

export default function Admin() {
  const router = useRouter();
  
  // Auth passcode gate
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<"poses" | "frames">("poses");
  const [poses, setPoses] = useState<CustomPose[]>([]);
  const [frames, setFrames] = useState<CustomFrame[]>([]);

  // Pose form state
  const [poseTitle, setPoseTitle] = useState("");
  const [poseImgUrl, setPoseImgUrl] = useState("");
  const [poseSuccessMsg, setPoseSuccessMsg] = useState("");

  // Frame form state
  const [frameName, setFrameName] = useState("");
  const [frameDesc, setFrameDesc] = useState("");
  const [frameBgColor, setFrameBgColor] = useState("#ffffff");
  const [frameTextColor, setFrameTextColor] = useState("#18181b");
  const [frameBgImgUrl, setFrameBgImgUrl] = useState("");
  const [frameOverlayImgUrl, setFrameOverlayImgUrl] = useState("");
  const [frameSuccessMsg, setFrameSuccessMsg] = useState("");

  // 3-slot coordinate editor
  const [slot1, setSlot1] = useState({ x: 15, y: 8, w: 70, h: 25 });
  const [slot2, setSlot2] = useState({ x: 15, y: 38, w: 70, h: 25 });
  const [slot3, setSlot3] = useState({ x: 15, y: 68, w: 70, h: 25 });
  const [activeSlotEdit, setActiveSlotEdit] = useState<1 | 2 | 3>(1);

  // Drag and Resize on Preview Canvas state
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeDrag, setActiveDrag] = useState<{
    slotNum: 1 | 2 | 3;
    type: "move" | "resize";
    startX: number;
    startY: number;
    startLeftPercent: number;
    startTopPercent: number;
    startWidthPercent: number;
    startHeightPercent: number;
  } | null>(null);

  // Cropper Modal state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [onCropComplete, setOnCropComplete] = useState<((croppedDataUrl: string) => void) | null>(null);

  // Check login state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLogged = sessionStorage.getItem("db_admin_logged") === "true";
      if (isLogged) setIsAuthenticated(true);
    }
  }, []);

  // Fetch poses and frames real-time
  useEffect(() => {
    if (!isAuthenticated) return;

    const posesQuery = query(collection(db, "custom_poses"));
    const unsubPoses = onSnapshot(posesQuery, (snapshot) => {
      const fetched: CustomPose[] = [];
      snapshot.forEach((doc) => {
        fetched.push(doc.data() as CustomPose);
      });
      // Sort by creation date descending
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPoses(fetched);
    });

    const framesQuery = query(collection(db, "custom_frames"));
    const unsubFrames = onSnapshot(framesQuery, (snapshot) => {
      const fetched: CustomFrame[] = [];
      snapshot.forEach((doc) => {
        fetched.push(doc.data() as CustomFrame);
      });
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFrames(fetched);
    });

    return () => {
      unsubPoses();
      unsubFrames();
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "admin") {
      setIsAuthenticated(true);
      sessionStorage.setItem("db_admin_logged", "true");
      setAuthError("");
    } else {
      setAuthError("Passcode salah! Hint: gunakan 'admin'");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("db_admin_logged");
  };

  // Crop Canvas Save Logic
  const handleCropSave = () => {
    if (!cropImageSrc) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const targetW = 400;
      const targetH = 400;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);
        
        ctx.save();
        
        const scaleFactor = targetW / 280; 
        
        ctx.translate(targetW / 2, targetH / 2);
        ctx.translate(cropPan.x * scaleFactor, cropPan.y * scaleFactor);
        ctx.scale(cropZoom * scaleFactor, cropZoom * scaleFactor);
        
        const baseWidth = 280;
        const baseHeight = 280 / (img.width / img.height);
        
        ctx.drawImage(img, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
        ctx.restore();
        
        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        if (onCropComplete) {
          onCropComplete(croppedDataUrl);
        }
        
        // Reset crop state
        setCropImageSrc(null);
        setCropZoom(1);
        setCropPan({ x: 0, y: 0 });
      }
    };
    img.src = cropImageSrc;
  };

  // File Selector for Pose (with Cropping)
  const handleFileSelectPose = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Format file harus berupa gambar.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCropImageSrc(result);
      setOnCropComplete(() => (cropped: string) => {
        setPoseImgUrl(cropped);
      });
    };
    reader.readAsDataURL(file);
  };

  // File Selector for Frame Background
  const handleFileSelectFrame = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Format file harus berupa gambar.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFrameBgImgUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // File Selector for Frame Overlay
  const handleFileSelectFrameOverlay = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Format file harus berupa gambar.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFrameOverlayImgUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poseImgUrl.trim() || !poseTitle.trim()) {
      alert("Harap isi nama pose dan masukkan gambar pose.");
      return;
    }

    const generatedId = "pose_" + poseTitle.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "pose_" + Math.random().toString(36).substring(2, 10);

    const newPose: CustomPose = {
      id: generatedId,
      title: poseTitle.trim(),
      description: "Tiru gaya visual acuan meme di bawah bersama teman Anda secara seru!",
      imageUrl: poseImgUrl.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "custom_poses", generatedId), newPose);
      setPoseSuccessMsg("Berhasil menambahkan pose meme baru!");
      
      // Reset form
      setPoseTitle("");
      setPoseImgUrl("");
      
      setTimeout(() => setPoseSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Gagal menambahkan pose:", err);
      alert("Terjadi kesalahan saat menyimpan pose ke database.");
    }
  };

  const handleAddFrame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frameName.trim() || !frameDesc.trim()) {
      alert("Harap isi nama dan deskripsi desain frame.");
      return;
    }

    const generatedId = "frame_" + frameName.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "frame_" + Math.random().toString(36).substring(2, 10);

    const newFrame: CustomFrame = {
      id: generatedId,
      name: frameName.trim(),
      desc: frameDesc.trim(),
      bgColor: frameBgColor,
      textColor: frameTextColor,
      frameBackgroundImageUrl: frameBgImgUrl.trim() || undefined,
      frameOverlayImageUrl: frameOverlayImgUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
      slots: [slot1, slot2, slot3]
    };

    try {
      await setDoc(doc(db, "custom_frames", generatedId), newFrame);
      setFrameSuccessMsg("Berhasil menyimpan desain frame kustom baru!");
      
      // Reset form
      setFrameName("");
      setFrameDesc("");
      setFrameBgColor("#ffffff");
      setFrameTextColor("#18181b");
      setFrameBgImgUrl("");
      setFrameOverlayImgUrl("");
      setSlot1({ x: 15, y: 8, w: 70, h: 25 });
      setSlot2({ x: 15, y: 38, w: 70, h: 25 });
      setSlot3({ x: 15, y: 68, w: 70, h: 25 });
      setActiveSlotEdit(1);
      
      setTimeout(() => setFrameSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Gagal menambahkan frame:", err);
      alert("Terjadi kesalahan saat menyimpan frame ke database.");
    }
  };

  const handleDeletePose = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pose meme ini?")) return;
    try {
      await deleteDoc(doc(db, "custom_poses", id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFrame = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus desain frame kustom ini?")) return;
    try {
      await deleteDoc(doc(db, "custom_frames", id));
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Resize Implementation for Slots
  const handleSlotPointerDown = (
    e: React.PointerEvent,
    slotNum: 1 | 2 | 3,
    type: "move" | "resize"
  ) => {
    e.preventDefault();
    setActiveSlotEdit(slotNum);

    const rect = previewContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const activeSlot = slotNum === 1 ? slot1 : slotNum === 2 ? slot2 : slot3;

    const dragInfo = {
      slotNum,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startLeftPercent: activeSlot.x,
      startTopPercent: activeSlot.y,
      startWidthPercent: activeSlot.w,
      startHeightPercent: activeSlot.h,
    };

    setActiveDrag(dragInfo);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = ((moveEvent.clientX - dragInfo.startX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - dragInfo.startY) / rect.height) * 100;

      const setter = slotNum === 1 ? setSlot1 : slotNum === 2 ? setSlot2 : setSlot3;

      if (type === "move") {
        setter({
          x: Math.max(0, Math.min(100 - dragInfo.startWidthPercent, Math.round(dragInfo.startLeftPercent + deltaX))),
          y: Math.max(0, Math.min(100 - dragInfo.startHeightPercent, Math.round(dragInfo.startTopPercent + deltaY))),
          w: dragInfo.startWidthPercent,
          h: dragInfo.startHeightPercent,
        });
      } else {
        setter({
          x: dragInfo.startLeftPercent,
          y: dragInfo.startTopPercent,
          w: Math.max(5, Math.min(100 - dragInfo.startLeftPercent, Math.round(dragInfo.startWidthPercent + deltaX))),
          h: Math.max(5, Math.min(100 - dragInfo.startTopPercent, Math.round(dragInfo.startHeightPercent + deltaY))),
        });
      }
    };

    const handlePointerUp = () => {
      setActiveDrag(null);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 bg-gradient-to-b from-zinc-50 to-zinc-100 font-sans">
        <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-zinc-900 text-white mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900">Admin Studio Panel</h2>
            <p className="text-xs text-zinc-500">Masukkan kode sandi admin untuk mengelola template & referensi photobooth.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Passcode</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Masukkan passcode (default: admin)"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-zinc-950 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 text-center font-bold tracking-widest"
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-500 font-semibold text-center">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 px-4 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all shadow-xs"
            >
              Masuk Panel Admin
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-8 md:py-12 px-4 md:px-8 font-sans text-zinc-800">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/")}
                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 transition-colors mr-1"
                title="Kembali ke Home"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight font-modern">DualBooth Creator Panel</h1>
              <span className="text-[10px] bg-zinc-900 text-white px-2 py-0.5 rounded font-mono font-bold">ADMIN</span>
            </div>
            <p className="text-xs text-zinc-500">Konfigurasi Custom Poses (Meme Acuan) dan Desain Frame Kustom yang akan langsung tampil di menu editor Photobooth.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition-all shadow-xs"
            >
              Lihat Aplikasi Live
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-xs font-semibold transition-all"
            >
              Keluar
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200">
          <button
            onClick={() => setActiveTab("poses")}
            className={`py-3 px-6 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "poses"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <Camera className="w-4 h-4" />
            1. Poses & Meme Acuan ({poses.length})
          </button>
          <button
            onClick={() => setActiveTab("frames")}
            className={`py-3 px-6 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "frames"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <Layers className="w-4 h-4" />
            2. Custom Design Frames ({frames.length})
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "poses" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT: Add Pose Form */}
            <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Tambah Pose Meme Baru
                </h3>
                <p className="text-xs text-zinc-500">Meme ini akan menjadi acuan visual (pose challenges) yang diikuti oleh partisipan.</p>
              </div>

              <form onSubmit={handleAddPose} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Nama Pose / Meme Challenge *</label>
                  <input
                    type="text"
                    value={poseTitle}
                    onChange={(e) => setPoseTitle(e.target.value)}
                    placeholder="Contoh: Pose Spider-Man Menunjuk"
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-zinc-950 outline-none transition-all text-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Foto Pose Meme *</label>
                  
                  {/* Drag and Drop Box */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-zinc-900", "bg-zinc-100");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-zinc-900", "bg-zinc-100");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-zinc-900", "bg-zinc-100");
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileSelectPose(file);
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileSelectPose(file);
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-zinc-200 hover:border-zinc-900 transition-all rounded-xl p-8 text-center cursor-pointer space-y-2 bg-zinc-50"
                  >
                    <ImageIcon className="w-8 h-8 text-zinc-400 mx-auto animate-pulse" />
                    <p className="text-xs font-semibold text-zinc-700">Drag & drop foto pose di sini</p>
                    <p className="text-[10px] text-zinc-400">Atau klik untuk memilih file (akan dicrop square 1:1 otomatis)</p>
                  </div>
                </div>

                {poseImgUrl && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Pratinjau Pose (Hasil Crop)</label>
                    <div className="w-40 h-40 mx-auto relative rounded-lg border border-zinc-200 overflow-hidden bg-zinc-100 flex items-center justify-center shadow-xs">
                      <img src={poseImgUrl} className="w-full h-full object-cover animate-fade-in" alt="Preview" />
                      <button
                        type="button"
                        onClick={() => setPoseImgUrl("")}
                        className="absolute bottom-2 right-2 bg-zinc-900/85 hover:bg-zinc-950 text-white font-semibold text-[10px] px-2 py-1 rounded"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}

                {poseSuccessMsg && (
                  <p className="text-xs text-emerald-600 font-semibold text-center bg-emerald-50 py-2.5 rounded-lg border border-emerald-100 flex items-center justify-center gap-1.5 animate-pulse">
                    <Check className="w-4 h-4" /> {poseSuccessMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!poseImgUrl || !poseTitle.trim()}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Simpan Pose Meme
                </button>
              </form>
            </div>

            {/* RIGHT: List of Poses */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-zinc-400 tracking-widest uppercase">Pose Meme Aktif di Database</h3>
                <span className="text-[10px] bg-zinc-100 border border-zinc-200 text-zinc-500 px-2 py-1 rounded font-bold">{poses.length} Pose</span>
              </div>

              {poses.length === 0 ? (
                <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-12 text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-zinc-300 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-700">Belum ada Pose Meme Kustom</p>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">Isi formulir di sebelah kiri untuk menambahkan pose meme acuan pertama Anda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {poses.map((p) => (
                    <div key={p.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col justify-between shadow-xs relative group">
                      <div>
                        {/* Meme Image Preview */}
                        <div className="w-full h-36 bg-zinc-100 relative overflow-hidden border-b border-zinc-200">
                          <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { (e.target as any).src = "https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=400" }} />
                          <span className="absolute top-2.5 left-2.5 bg-zinc-900/80 text-white font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">{p.id}</span>
                        </div>
                        <div className="p-4 space-y-1">
                          <h4 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wide truncate">{p.title}</h4>
                          <p className="text-[10px] text-zinc-400 font-mono tracking-wider mb-1">{p.id}</p>
                        </div>
                      </div>
                      <div className="p-3 border-t border-zinc-100 flex justify-end">
                        <button
                          onClick={() => handleDeletePose(p.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-all flex items-center gap-1 text-[10px] font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus Pose
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT: Add Frame Form */}
            <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Desain Frame Kustom Baru
                </h3>
                <p className="text-xs text-zinc-500">Buat desain frame kustom dengan drag & drop background motif, overlay transparan, dan tentukan letak kotak fotonya secara interaktif.</p>
              </div>

              <form onSubmit={handleAddFrame} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Nama Desain *</label>
                  <input
                    type="text"
                    value={frameName}
                    onChange={(e) => setFrameName(e.target.value)}
                    placeholder="Contoh: Blossom Spring"
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-zinc-950 outline-none transition-all text-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Deskripsi Frame *</label>
                  <textarea
                    value={frameDesc}
                    onChange={(e) => setFrameDesc(e.target.value)}
                    placeholder="Contoh: Frame minimalis dengan sentuhan warna sakura dan overlay kelopak bunga."
                    rows={2}
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-zinc-950 outline-none transition-all text-zinc-800 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Warna Background</label>
                    <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1">
                      <input
                        type="color"
                        value={frameBgColor}
                        onChange={(e) => setFrameBgColor(e.target.value)}
                        className="w-7 h-7 bg-transparent border-0 cursor-pointer rounded-md overflow-hidden"
                      />
                      <input
                        type="text"
                        value={frameBgColor}
                        onChange={(e) => setFrameBgColor(e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none font-mono text-[11px] text-zinc-700 w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Warna Teks</label>
                    <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1">
                      <input
                        type="color"
                        value={frameTextColor}
                        onChange={(e) => setFrameTextColor(e.target.value)}
                        className="w-7 h-7 bg-transparent border-0 cursor-pointer rounded-md overflow-hidden"
                      />
                      <input
                        type="text"
                        value={frameTextColor}
                        onChange={(e) => setFrameTextColor(e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none font-mono text-[11px] text-zinc-700 w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Background drag and drop */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Background Image (Drag & Drop / Klik)</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-zinc-900", "bg-zinc-100");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-zinc-900", "bg-zinc-100");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-zinc-900", "bg-zinc-100");
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileSelectFrame(file);
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileSelectFrame(file);
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-zinc-200 hover:border-zinc-900 transition-all rounded-xl p-5 text-center cursor-pointer space-y-1 bg-zinc-50"
                  >
                    <ImageIcon className="w-6 h-6 text-zinc-400 mx-auto" />
                    <p className="text-[11px] font-semibold text-zinc-700">Drag & drop background bingkai di sini</p>
                    <p className="text-[9px] text-zinc-400">Atau klik untuk memilih gambar</p>
                  </div>
                  {frameBgImgUrl && (
                    <div className="flex items-center justify-between text-[11px] bg-zinc-100 p-2.5 rounded-lg border border-zinc-200">
                      <span className="font-semibold text-zinc-700 truncate max-w-[200px]">Background Terunggah!</span>
                      <button
                        type="button"
                        onClick={() => setFrameBgImgUrl("")}
                        className="text-rose-500 font-bold hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* Overlay transparan drag and drop */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">PNG Overlay Bingkai Transparan (Opsional)</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-zinc-900", "bg-zinc-100");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-zinc-900", "bg-zinc-100");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-zinc-900", "bg-zinc-100");
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileSelectFrameOverlay(file);
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileSelectFrameOverlay(file);
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-zinc-200 hover:border-zinc-900 transition-all rounded-xl p-5 text-center cursor-pointer space-y-1 bg-zinc-50"
                  >
                    <ImageIcon className="w-6 h-6 text-zinc-400 mx-auto" />
                    <p className="text-[11px] font-semibold text-zinc-700">Drag & drop PNG transparan overlay di sini</p>
                    <p className="text-[9px] text-zinc-400">Atau klik untuk memilih file PNG</p>
                  </div>
                  {frameOverlayImgUrl && (
                    <div className="flex items-center justify-between text-[11px] bg-zinc-100 p-2.5 rounded-lg border border-zinc-200">
                      <span className="font-semibold text-zinc-700 truncate max-w-[200px]">Overlay Terunggah!</span>
                      <button
                        type="button"
                        onClick={() => setFrameOverlayImgUrl("")}
                        className="text-rose-500 font-bold hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* SLOT COORDINATE INFO PANEL AND PRESETS */}
                <div className="space-y-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1">
                      <Maximize className="w-3.5 h-3.5" /> Posisi Kotak Gambar
                    </h4>
                    <p className="text-[11px] text-zinc-500">Edit letak kotak gambar langsung dengan <b>menahan (hold) & menggeser (drag)</b> kotak pada strip pratinjau di sebelah kanan!</p>
                  </div>

                  <div className="space-y-2 text-[11px] font-mono bg-white p-3 rounded-lg border border-zinc-150 text-zinc-600">
                    <div className="flex justify-between items-center pb-1.5 border-b border-zinc-100">
                      <span className={`font-bold ${activeSlotEdit === 1 ? "text-rose-600" : ""}`}>KOTAK 1:</span>
                      <span>X: {slot1.x}%, Y: {slot1.y}%, W: {slot1.w}%, H: {slot1.h}%</span>
                    </div>
                    <div className="flex justify-between items-center pb-1.5 border-b border-zinc-100">
                      <span className={`font-bold ${activeSlotEdit === 2 ? "text-rose-600" : ""}`}>KOTAK 2:</span>
                      <span>X: {slot2.x}%, Y: {slot2.y}%, W: {slot2.w}%, H: {slot2.h}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`font-bold ${activeSlotEdit === 3 ? "text-rose-600" : ""}`}>KOTAK 3:</span>
                      <span>X: {slot3.x}%, Y: {slot3.y}%, W: {slot3.w}%, H: {slot3.h}%</span>
                    </div>
                  </div>

                  {/* Reset layout buttons */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-400 tracking-wider uppercase block">Gunakan Preset Peletakan Cepat</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSlot1({ x: 15, y: 6, w: 70, h: 26 });
                          setSlot2({ x: 15, y: 36, w: 70, h: 26 });
                          setSlot3({ x: 15, y: 66, w: 70, h: 26 });
                        }}
                        className="py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[10px] font-bold border border-zinc-200 transition-colors"
                      >
                        Strip Vertikal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSlot1({ x: 8, y: 15, w: 26, h: 70 });
                          setSlot2({ x: 37, y: 15, w: 26, h: 70 });
                          setSlot3({ x: 66, y: 15, w: 26, h: 70 });
                        }}
                        className="py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[10px] font-bold border border-zinc-200 transition-colors"
                      >
                        Strip Horisontal
                      </button>
                    </div>
                  </div>
                </div>

                {frameSuccessMsg && (
                  <p className="text-xs text-emerald-600 font-semibold text-center bg-emerald-50 py-2.5 rounded-lg border border-emerald-100 flex items-center justify-center gap-1.5 animate-pulse">
                    <Check className="w-4 h-4" /> {frameSuccessMsg}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Simpan Desain Frame
                </button>
              </form>
            </div>

            {/* RIGHT: List of Frames & Interactive Visual Strip Designer */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* LIVE STRIP DESIGNER PREVIEW */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-zinc-900 tracking-widest uppercase flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-rose-500" /> Visual Strip Editor
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Geser/Hold kotak foto untuk memindahkan. Seret ikon <b className="text-rose-500">⤨</b> di pojok kanan bawah kotak untuk mengubah ukuran.
                  </p>
                </div>

                <div className="flex items-center justify-center py-8 bg-zinc-100 rounded-xl border border-zinc-200">
                  <div 
                    ref={previewContainerRef}
                    className="w-[240px] h-[580px] border border-zinc-300 relative rounded-lg shadow-md overflow-hidden flex-shrink-0 transition-all duration-300 select-none bg-white"
                    style={{
                      backgroundColor: frameBgColor,
                      backgroundImage: frameBgImgUrl ? `url(${frameBgImgUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }}
                  >
                    {/* Render Slot 1 */}
                    <div 
                      onPointerDown={(e) => handleSlotPointerDown(e, 1, "move")}
                      className={`absolute border-2 text-[10px] font-bold uppercase tracking-wider flex flex-col gap-1 items-center justify-center transition-all cursor-grab active:cursor-grabbing ${
                        activeSlotEdit === 1 
                          ? "border-rose-500 bg-rose-500/20 text-rose-700 shadow-sm z-20" 
                          : "border-zinc-400/40 bg-zinc-400/10 text-zinc-500 z-10"
                      }`}
                      style={{
                        left: `${slot1.x}%`,
                        top: `${slot1.y}%`,
                        width: `${slot1.w}%`,
                        height: `${slot1.h}%`
                      }}
                    >
                      <span className="bg-white/80 px-1.5 py-0.5 rounded text-[8px] pointer-events-none">KOTAK 1</span>
                      <div 
                        className="absolute bottom-1 right-1 w-4.5 h-4.5 bg-rose-500 rounded-xs cursor-se-resize z-40 flex items-center justify-center border border-white text-[8px] text-white font-bold"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handleSlotPointerDown(e, 1, "resize");
                        }}
                      >
                        ⤨
                      </div>
                    </div>

                    {/* Render Slot 2 */}
                    <div 
                      onPointerDown={(e) => handleSlotPointerDown(e, 2, "move")}
                      className={`absolute border-2 text-[10px] font-bold uppercase tracking-wider flex flex-col gap-1 items-center justify-center transition-all cursor-grab active:cursor-grabbing ${
                        activeSlotEdit === 2 
                          ? "border-rose-500 bg-rose-500/20 text-rose-700 shadow-sm z-20" 
                          : "border-zinc-400/40 bg-zinc-400/10 text-zinc-500 z-10"
                      }`}
                      style={{
                        left: `${slot2.x}%`,
                        top: `${slot2.y}%`,
                        width: `${slot2.w}%`,
                        height: `${slot2.h}%`
                      }}
                    >
                      <span className="bg-white/80 px-1.5 py-0.5 rounded text-[8px] pointer-events-none">KOTAK 2</span>
                      <div 
                        className="absolute bottom-1 right-1 w-4.5 h-4.5 bg-rose-500 rounded-xs cursor-se-resize z-40 flex items-center justify-center border border-white text-[8px] text-white font-bold"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handleSlotPointerDown(e, 2, "resize");
                        }}
                      >
                        ⤨
                      </div>
                    </div>

                    {/* Render Slot 3 */}
                    <div 
                      onPointerDown={(e) => handleSlotPointerDown(e, 3, "move")}
                      className={`absolute border-2 text-[10px] font-bold uppercase tracking-wider flex flex-col gap-1 items-center justify-center transition-all cursor-grab active:cursor-grabbing ${
                        activeSlotEdit === 3 
                          ? "border-rose-500 bg-rose-500/20 text-rose-700 shadow-sm z-20" 
                          : "border-zinc-400/40 bg-zinc-400/10 text-zinc-500 z-10"
                      }`}
                      style={{
                        left: `${slot3.x}%`,
                        top: `${slot3.y}%`,
                        width: `${slot3.w}%`,
                        height: `${slot3.h}%`
                      }}
                    >
                      <span className="bg-white/80 px-1.5 py-0.5 rounded text-[8px] pointer-events-none">KOTAK 3</span>
                      <div 
                        className="absolute bottom-1 right-1 w-4.5 h-4.5 bg-rose-500 rounded-xs cursor-se-resize z-40 flex items-center justify-center border border-white text-[8px] text-white font-bold"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handleSlotPointerDown(e, 3, "resize");
                        }}
                      >
                        ⤨
                      </div>
                    </div>

                    {/* Transp Overlay (Preview) */}
                    {frameOverlayImgUrl && (
                      <div 
                        className="absolute inset-0 bg-contain bg-no-repeat bg-center pointer-events-none"
                        style={{ backgroundImage: `url(${frameOverlayImgUrl})` }}
                      />
                    )}

                    {/* Brand Footer placeholder */}
                    <div 
                      className="absolute bottom-2 inset-x-0 text-center font-mono text-[8px] uppercase font-bold tracking-widest"
                      style={{ color: frameTextColor }}
                    >
                      DualBooth Studio
                    </div>
                  </div>
                </div>
              </div>

              {/* LIST OF FRAMES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-zinc-400 tracking-widest uppercase">Desain Frame Aktif di Database</h3>
                  <span className="text-[10px] bg-zinc-100 border border-zinc-200 text-zinc-500 px-2 py-1 rounded font-bold">{frames.length} Frame</span>
                </div>

                {frames.length === 0 ? (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-12 text-center space-y-2">
                    <Layers className="w-8 h-8 text-zinc-300 mx-auto" />
                    <p className="text-sm font-semibold text-zinc-700">Belum ada Desain Frame Kustom</p>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">Isi formulir kustom di sebelah kiri atau klik salah satu template desain cepat untuk mendaftarkan bingkai/frame kustom pertama Anda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {frames.map((f) => (
                      <div key={f.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col justify-between shadow-xs relative group">
                        <div className="p-4 space-y-4">
                          {/* Frame Color Box & Info */}
                          <div className="flex gap-3">
                            <div
                              className="w-12 h-20 rounded-lg border border-zinc-200 flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                              style={{
                                backgroundColor: f.bgColor,
                                backgroundImage: f.frameBackgroundImageUrl ? `url(${f.frameBackgroundImageUrl})` : undefined,
                                backgroundSize: "cover"
                              }}
                            >
                              <span className="text-[10px] font-bold" style={{ color: f.textColor }}>Aa</span>
                              {f.frameOverlayImageUrl && (
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                  <span className="text-[8px] bg-zinc-900/80 text-white font-mono px-1 rounded scale-90">PNG</span>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1 min-w-0">
                              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wide truncate">{f.name}</h4>
                              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{f.id}</p>
                              <p className="text-[11px] text-zinc-500 leading-normal line-clamp-2">{f.desc}</p>
                            </div>
                          </div>

                          {/* Visual Spec */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                            <div>
                              <span className="text-zinc-400 block uppercase">Bg Color</span>
                              <span className="text-zinc-700 font-semibold uppercase">{f.bgColor}</span>
                            </div>
                            <div>
                              <span className="text-zinc-400 block uppercase">Slots Config</span>
                              <span className="text-emerald-600 font-semibold uppercase">3 Custom Slots</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 border-t border-zinc-100 flex justify-end">
                          <button
                            onClick={() => handleDeleteFrame(f.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-all flex items-center gap-1 text-[10px] font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus Frame
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tip Banner */}
        <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-zinc-800">Teknis Integrasi Dynamic Content & 3-Slot Framing</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Semua pose challenges baru tidak lagi memerlukan instruksi atau judul yang memakan tempat. Setiap pose yang diunggah akan otomatis ter-crop square secara bersih sebelum disimpan ke Firestore. Saat mendesain frame baru, admin dapat menentukan letak 3 kotak gambar foto user secara presisi. Photobooth room akan memuat layout kustom ini dan menyesuaikan sesi foto agar selesai setelah mengambil tepat 3 foto, merendernya di posisi koordinat persis sesuai yang didesain.
            </p>
          </div>
        </div>

      </div>

      {/* CROPPER MODAL */}
      <AnimatePresence>
        {cropImageSrc && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-zinc-200 shadow-xl space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Crop className="w-4 h-4 text-rose-500" /> Potong & Sesuaikan Pose
                </h3>
                <p className="text-xs text-zinc-500">Geser gambar untuk menyesuaikan posisi di dalam kotak persegi (1:1).</p>
              </div>

              {/* Viewport Container */}
              <div className="flex justify-center">
                <div 
                  className="w-[280px] h-[280px] overflow-hidden border border-zinc-200 relative bg-zinc-100 flex items-center justify-center rounded-xl cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingCrop(true);
                    setDragStart({ x: e.clientX - cropPan.x, y: e.clientY - cropPan.y });
                  }}
                  onMouseMove={(e) => {
                    if (!isDraggingCrop) return;
                    setCropPan({
                      x: e.clientX - dragStart.x,
                      y: e.clientY - dragStart.y
                    });
                  }}
                  onMouseUp={() => setIsDraggingCrop(false)}
                  onMouseLeave={() => setIsDraggingCrop(false)}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    setIsDraggingCrop(true);
                    setDragStart({ x: touch.clientX - cropPan.x, y: touch.clientY - cropPan.y });
                  }}
                  onTouchMove={(e) => {
                    if (!isDraggingCrop) return;
                    const touch = e.touches[0];
                    setCropPan({
                      x: touch.clientX - dragStart.x,
                      y: touch.clientY - dragStart.y
                    });
                  }}
                  onTouchEnd={() => setIsDraggingCrop(false)}
                >
                  <img
                    src={cropImageSrc}
                    alt="Crop"
                    draggable={false}
                    style={{
                      width: "280px",
                      height: "auto",
                      transform: `translate(${cropPan.x}px, ${cropPan.y}px) scale(${cropZoom})`,
                      position: "absolute"
                    }}
                    className="max-w-none origin-center"
                  />
                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 border border-white/20 pointer-events-none grid grid-cols-3 grid-rows-3">
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-b border-white/20"></div>
                    <div className="border-r border-white/20"></div>
                    <div className="border-r border-white/20"></div>
                    <div></div>
                  </div>
                </div>
              </div>

              {/* Sliders / Controls */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
                    <span>Perbesar Gambar (Zoom)</span>
                    <span className="font-mono text-zinc-900">{cropZoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="w-full accent-zinc-900"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCropImageSrc(null);
                    setCropZoom(1);
                    setCropPan({ x: 0, y: 0 });
                  }}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCropSave}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Selesai Potong
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
