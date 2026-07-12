"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase";
import { Camera, Plus, ArrowRight, Sparkles, Image as ImageIcon, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load persisted name and ensure user id
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
    
    // Persist username
    sessionStorage.setItem("db_username", name.trim());

    let userId = sessionStorage.getItem("db_userid");
    if (!userId) {
      userId = "user_" + Math.random().toString(36).substring(2, 12);
      sessionStorage.setItem("db_userid", userId);
    }
    return userId;
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
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
        peer1: {
          id: uId,
          name: name.trim(),
          joinedAt: new Date().toISOString(),
        },
        peer2: null,
        photos1: [],
        photos2: [],
        stripTemplate: "classic",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `rooms/${generatedId}`);
      });

      router.push(`/room/${generatedId}`);
    } catch (err: any) {
      console.error("Gagal membuat ruang:", err);
      let displayError = "Gagal membuat ruang. Coba lagi.";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) {
          displayError = `Gagal membuat ruang: ${parsed.error}`;
        }
      } catch {
        if (err instanceof Error) {
          displayError = err.message;
        }
      }
      setError(displayError);
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
      let displayError = "Gagal bergabung ke ruang. Coba lagi.";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) {
          displayError = `Gagal bergabung: ${parsed.error}`;
        }
      } catch {
        if (err instanceof Error) {
          displayError = err.message;
        }
      }
      setError(displayError);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 py-8 md:py-16 relative bg-gradient-to-b from-[#FAF9F5] to-[#F3F2EC]">
      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 25 }}
            className="inline-flex p-3.5 rounded-full bg-zinc-900 text-white shadow-sm"
          >
            <Camera className="w-6 h-6" />
          </motion.div>
          <div className="space-y-2">
            <motion.h1
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 font-modern"
            >
              DualBooth
            </motion.h1>
            <motion.p
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-zinc-500 text-xs md:text-sm max-w-xs mx-auto leading-relaxed"
            >
              Virtual photobooth real-time bersama teman. Ambil 4 foto seru dan cetak photostrip estetik secara instan.
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6"
        >
          <div className="space-y-5">
            {/* Input Name Section */}
            <div className="space-y-2">
              <label htmlFor="user-name" className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">
                Nama Anda
              </label>
              <input
                id="user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama panggilan Anda..."
                maxLength={20}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-zinc-900 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 font-medium"
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-5 border border-rose-100 rounded-xl p-3 text-rose-600 text-xs text-center font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {/* Create Room Option */}
              <form onSubmit={handleCreateRoom}>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="w-full bg-zinc-900 text-white font-semibold py-3 px-4 rounded-xl shadow-sm hover:bg-zinc-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Buat Ruang Baru
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-200"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Atau Gabung Sesi
                </span>
                <div className="flex-grow border-t border-zinc-200"></div>
              </div>

              {/* Join Room Option */}
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="KODE RUANG"
                    maxLength={6}
                    disabled={isLoading || !name.trim()}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-zinc-900 outline-none transition-all placeholder:text-zinc-400 text-center font-bold tracking-widest disabled:opacity-50 text-zinc-900"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !name.trim() || roomCode.length < 4}
                    className="bg-zinc-100 border border-zinc-200 text-zinc-900 hover:bg-zinc-200 px-5 rounded-xl transition-all active:scale-[0.99] flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-6 text-zinc-400 text-xs font-medium"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>Kamera Terbuka</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>Desain Photostrip</span>
          </div>
        </motion.div>
      </div>

      <a href="/admin" className="absolute bottom-4 right-4 p-2 text-zinc-300 hover:text-zinc-600 transition-colors" title="Admin Panel">
        <Lock className="w-4 h-4" />
      </a>
    </div>
  );
}
