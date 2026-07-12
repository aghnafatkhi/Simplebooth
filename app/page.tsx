"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { Camera, Plus, ArrowRight, Sparkles, Image as ImageIcon, Lock, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<"choose_mode" | "setup_solo" | "setup_duo">("choose_mode");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = sessionStorage.getItem("db_username") || "";
      setName(savedName);
      
      let userId = sessionStorage.getItem("db_userid");
      if (!userId) {
        userId = "user_" + Math.random().toString(36).substring(2, 12);
        sessionStorage.setItem("db_userid", userId);
      }
    }
  }, []);

  const handleSignIn = async () => {
    if (!name.trim()) {
      throw new Error("Silakan masukkan nama Anda terlebih dahulu.");
    }
    sessionStorage.setItem("db_username", name.trim());
    let userId = sessionStorage.getItem("db_userid");
    if (!userId) {
      userId = "user_" + Math.random().toString(36).substring(2, 12);
      sessionStorage.setItem("db_userid", userId);
    }
    return userId;
  };

  const handleCreateRoom = async (mode: "solo" | "online") => {
    if (isLoading) return;
    setError(null);
    setIsLoading(true);

    try {
      const uId = await handleSignIn();
      const generatedId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roomRef = doc(db, "rooms", generatedId);

      await setDoc(roomRef, {
        roomId: generatedId,
        status: "waiting",
        countdown: 5,
        countdownStartedAt: null,
        boothMode: mode,
        peer1: {
          id: uId,
          name: name.trim(),
          joinedAt: new Date().toISOString(),
          status: "online"
        },
        peer2: null,
        photos1: [],
        photos2: [],
        stripTemplate: "classic",
        editState: {
          frame: "classic",
          layout: "4-vertical",
          filter: "natural",
          backgroundColor: "#ffffff",
          backgroundType: "warna-polos",
          backgroundGradient: "linear-gradient(135deg, #fecdd3 0%, #ffedd5 100%)",
          texts: [],
          stickers: [],
          borderRadius: 0,
          borderThickness: 12,
          innerBorder: false,
          outerBorder: false,
          borderColor: "#000000",
          borderShadow: false,
          sliders: {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            blur: 0
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `rooms/${generatedId}`);
      });

      router.push(`/room/${generatedId}`);
    } catch (err: any) {
      console.error("Gagal membuat ruang:", err);
      setError(err.message || "Gagal membuat ruang. Coba lagi.");
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError("Silakan masukkan kode ruang.");
      return;
    }
    if (isLoading) return;
    setError(null);
    setIsLoading(true);

    try {
      const uId = await handleSignIn();
      const cleanCode = roomCode.trim().toUpperCase();
      const roomRef = doc(db, "rooms", cleanCode);
      let roomSnap;
      try {
        roomSnap = await getDoc(roomRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `rooms/${cleanCode}`);
        return;
      }

      if (!roomSnap || !roomSnap.exists()) {
        setError("Ruang tidak ditemukan. Silakan periksa kembali kodenya.");
        setIsLoading(false);
        return;
      }

      const roomData = roomSnap.data();
      if (roomData.status === "completed") {
        setError("Sesi photobooth di ruang ini sudah selesai.");
        setIsLoading(false);
        return;
      }

      if (roomData.peer2 && roomData.peer2.id !== uId && roomData.peer1.id !== uId) {
        setError("Ruang sudah penuh (maksimal 2 orang).");
        setIsLoading(false);
        return;
      }

      router.push(`/room/${cleanCode}`);
    } catch (err: any) {
      console.error("Gagal bergabung ke ruang:", err);
      setError(err.message || "Gagal bergabung ke ruang. Coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 py-8 md:py-16 relative bg-gradient-to-b from-[#FAF9F5] to-[#F3F2EC] text-zinc-900 overflow-hidden">
      <div className="w-full max-w-md space-y-8 z-10 animate-fade-in">
        <div className="text-center space-y-3 animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 25 }}
            className="inline-flex p-3.5 rounded-full bg-zinc-900 text-white shadow-md"
          >
            <Camera className="w-6 h-6" />
          </motion.div>
          <div className="space-y-1">
            <motion.h1
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl font-black tracking-tight text-zinc-900"
            >
              DualBooth Studio
            </motion.h1>
            <p className="text-zinc-500 text-xs">Aplikasi Photobooth Virtual Terbaik</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "choose_mode" && (
            <motion.div
              key="choose_mode"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-md space-y-6"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-zinc-900">Pilih Mode</h2>
                <p className="text-xs text-zinc-400">Silakan pilih jenis sesi pemotretan Anda</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  id="btn-foto-sendiri"
                  onClick={() => setStep("setup_solo")}
                  className="group flex flex-col items-center justify-center p-6 border border-zinc-200 hover:border-zinc-400 rounded-2xl bg-zinc-50 hover:bg-white hover:shadow-lg transition-all text-center space-y-3 cursor-pointer"
                >
                  <span className="text-4xl">📷</span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 group-hover:text-black">📷 Foto Sendiri</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Sesi photobooth solo instan langsung pakai</p>
                  </div>
                </button>

                <button
                  id="btn-foto-berdua"
                  onClick={() => setStep("setup_duo")}
                  className="group flex flex-col items-center justify-center p-6 border border-zinc-200 hover:border-zinc-400 rounded-2xl bg-zinc-50 hover:bg-white hover:shadow-lg transition-all text-center space-y-3 cursor-pointer"
                >
                  <span className="text-4xl">👥</span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 group-hover:text-black">👥 Foto Berdua</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Sesi kolaboratif real-time via share link</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === "setup_solo" && (
            <motion.div
              key="setup_solo"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-md space-y-6"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep("choose_mode")}
                  className="p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-all border border-zinc-200 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 leading-tight">Foto Sendiri</h2>
                  <p className="text-[10px] text-zinc-400">Siapkan sesi pemotretan solo Anda</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="solo-name" className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                    Nama Anda
                  </label>
                  <input
                    id="solo-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama panggilan Anda..."
                    maxLength={20}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-zinc-900 outline-none transition-all font-medium text-zinc-900"
                  />
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-600 text-xs text-center font-medium animate-fade-in">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("choose_mode")}
                    className="flex-1 py-3 px-4 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-zinc-600 font-semibold text-sm transition-all cursor-pointer"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={() => handleCreateRoom("solo")}
                    disabled={isLoading || !name.trim()}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-3 px-4 rounded-xl shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 text-sm disabled:opacity-40 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Mulai</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "setup_duo" && (
            <motion.div
              key="setup_duo"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-md space-y-6"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep("choose_mode")}
                  className="p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-all border border-zinc-200 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 leading-tight">Foto Berdua</h2>
                  <p className="text-[10px] text-zinc-400">Buat lobi baru atau gabung lobi teman</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="duo-name" className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                    Nama Anda
                  </label>
                  <input
                    id="duo-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama panggilan Anda..."
                    maxLength={20}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-zinc-900 outline-none transition-all font-medium text-zinc-900"
                  />
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-600 text-xs text-center font-medium animate-fade-in">
                    {error}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handleCreateRoom("online")}
                    disabled={isLoading || !name.trim()}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Buat Lobby Baru
                      </>
                    )}
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-zinc-200"></div>
                    <span className="flex-shrink mx-4 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                      Atau Gabung Lobby Teman
                    </span>
                    <div className="flex-grow border-t border-zinc-200"></div>
                  </div>

                  <form onSubmit={handleJoinRoom} className="flex gap-2">
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="KODE LOBBY"
                      maxLength={6}
                      disabled={isLoading || !name.trim()}
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-zinc-900 outline-none transition-all font-bold tracking-widest disabled:opacity-50 text-center text-zinc-900 placeholder:text-zinc-400"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !name.trim() || roomCode.length < 4}
                      className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-900 px-5 rounded-xl transition-all flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-center gap-6 text-zinc-400 text-xs font-medium">
          <div className="flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>Kamera Terbuka</span>
          </div>
          <div className="flex items-center gap-1.5 animate-pulse">
            <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>Desain Photostrip</span>
          </div>
        </div>
      </div>

      <a href="/admin" className="absolute bottom-4 right-4 p-2 text-zinc-300 hover:text-zinc-600 transition-colors" title="Admin Panel">
        <Lock className="w-4 h-4" />
      </a>
    </div>
  );
}
