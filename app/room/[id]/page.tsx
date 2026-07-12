"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc, getDoc, collection } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  Camera,
  Copy,
  Check,
  RefreshCw,
  Download,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Users,
  Image as ImageIcon,
  Sliders,
  Palette,
  Type,
  Smile,
  Eye,
  Trash2,
  Layers,
  Plus,
  RotateCw,
  Maximize2,
  Calendar,
  Clock,
  MapPin,
  Heart,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
// @ts-ignore
import gifshot from "gifshot";
import {
  POSE_CHALLENGES,
  FILTER_PRESETS,
  FRAME_STYLES,
  STICKER_LIST,
  FONT_OPTIONS,
  LAYOUT_PRESETS,
  DOWNLOAD_RATIOS,
  BACKGROUND_PRESETS,
  PoseChallenge,
  FilterPreset,
  FrameStyle,
  FontOption,
  LayoutPreset,
  DownloadRatio,
  BackgroundPreset
} from "@/lib/photobooth-constants";

interface Peer {
  id: string;
  name: string;
  joinedAt: string;
  status?: "online" | "selecting_frame" | "taking_photo" | "editing" | "done";
}

interface EditState {
  frame: string;
  filter: string;
  backgroundType: string;
  backgroundColor: string;
  backgroundGradient: string;
  borderThickness: number;
  borderRadius: number;
  borderColor: string;
  borderShadow: boolean;
  innerBorder: boolean;
  outerBorder: boolean;
  layout: string;
  frameImage?: string;
  sliders: {
    brightness: number;
    contrast: number;
    exposure: number;
    highlights: number;
    shadow: number;
    saturation: number;
    temperature: number;
    tint: number;
    sharpness: number;
    fade: number;
    grain: number;
    blur: number;
    vignette: number;
    blackwhite: number;
    vintage: number;
    disposable: number;
    dreamy: number;
    film: number;
    retro: number;
  };
  stickers: Array<{
    id: string;
    category: string;
    char: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    zIndex: number;
  }>;
  texts: Array<{
    id: string;
    type: string;
    text: string;
    font: string;
    size: number;
    color: string;
    x: number;
    y: number;
    rotation: number;
    opacity: number;
    shadow: boolean;
    outline: boolean;
  }>;
}

interface RoomData {
  roomId: string;
  status: "waiting" | "ready" | "countdown" | "captured" | "completed";
  countdown: number;
  countdownStartedAt: number | null;
  peer1: Peer | null;
  peer2: Peer | null;
  photos1: string[];
  photos2: string[];
  stripTemplate: "classic" | "retro" | "colorful" | "dark";
  createdAt: string;
  updatedAt: string;
  editState?: EditState;
  boothMode?: "solo" | "online";
  challengeMode?: "meme" | "freestyle";
  // WebRTC signaling
  sdpOffer?: string;
  sdpAnswer?: string;
  candidates1?: string[];
  candidates2?: string[];
}

const DEFAULT_EDIT_STATE: EditState = {
  frame: "classic",
  filter: "natural",
  backgroundType: "warna-polos",
  backgroundColor: "#ffffff",
  backgroundGradient: "linear-gradient(135deg, #fecdd3 0%, #ffedd5 100%)",
  borderThickness: 16,
  borderRadius: 12,
  borderColor: "#ffffff",
  borderShadow: true,
  innerBorder: true,
  outerBorder: true,
  layout: "4-vertical",
  frameImage: "",
  sliders: {
    brightness: 100,
    contrast: 100,
    exposure: 100,
    highlights: 100,
    shadow: 100,
    saturation: 100,
    temperature: 0,
    tint: 0,
    sharpness: 0,
    fade: 0,
    grain: 0,
    blur: 0,
    vignette: 0,
    blackwhite: 0,
    vintage: 0,
    disposable: 0,
    dreamy: 0,
    film: 0,
    retro: 0,
  },
  stickers: [],
  texts: [
    {
      id: "txt_default_1",
      type: "nama",
      text: "DualBooth Studio",
      font: "modern",
      size: 20,
      color: "#000000",
      x: 50,
      y: 92,
      rotation: 0,
      opacity: 100,
      shadow: false,
      outline: false
    },
    {
      id: "txt_default_2",
      type: "tanggal",
      text: "JULY 2026",
      font: "typewriter",
      size: 11,
      color: "#6b7280",
      x: 50,
      y: 96,
      rotation: 0,
      opacity: 100,
      shadow: false,
      outline: false
    }
  ]
};

export default function Room({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;

  const [room, setRoom] = useState<RoomData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isPeer1, setIsPeer1] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);

  const [allPoseChallenges, setAllPoseChallenges] = useState<any[]>(POSE_CHALLENGES);
  const [allFrameStyles, setAllFrameStyles] = useState<any[]>(FRAME_STYLES);

  const currentPhotoCount = isPeer1 ? (room?.photos1?.length || 0) : (room?.photos2?.length || 0);
  const activePose = allPoseChallenges[currentPhotoCount % allPoseChallenges.length];

  // Load Custom Poses, Frames, and Colors from Firestore
  useEffect(() => {
    // Listen to custom poses
    const unsubPoses = onSnapshot(collection(db, "custom_poses"), (snapshot) => {
      const dbPoses: any[] = [];
      snapshot.forEach((doc) => {
        dbPoses.push(doc.data());
      });
      setAllPoseChallenges([...dbPoses, ...POSE_CHALLENGES]);
    });

    // Listen to custom frames
    const unsubFrames = onSnapshot(collection(db, "custom_frames"), (snapshot) => {
      const dbFrames: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        dbFrames.push({
          id: data.id,
          name: data.name,
          desc: data.desc,
          bgColor: data.bgColor,
          textColor: data.textColor,
          borderStyle: "border border-zinc-200 shadow-xs",
          icon: "🎨",
          frameBackgroundImageUrl: data.frameBackgroundImageUrl,
          frameOverlayImageUrl: data.frameOverlayImageUrl,
          slots: data.slots
        });
      });
      setAllFrameStyles([...dbFrames, ...FRAME_STYLES]);
    });

    // Listen to custom colors
    const unsubColors = onSnapshot(collection(db, "custom_colors"), (snapshot) => {
      const dbColors: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        dbColors.push({
          id: doc.id,
          name: data.name || "Warna Kustom",
          value: data.value || data.hex || "#ffffff"
        });
      });
      
      const baseColors = [
        { id: "color-white", name: "Putih", value: "#ffffff" },
        { id: "color-black", name: "Hitam", value: "#000000" },
        { id: "color-cream", name: "Cream", value: "#FFFDD0" },
        { id: "color-beige", name: "Beige", value: "#F5F5DC" },
        { id: "color-abumuda", name: "Abu Muda", value: "#E5E7EB" },
        { id: "color-abutua", name: "Abu Tua", value: "#4B5563" },
        { id: "color-sage", name: "Sage Green", value: "#8F9779" },
        { id: "color-dusty", name: "Dusty Blue", value: "#8CA1B3" },
        { id: "color-pink", name: "Soft Pink", value: "#EABFCB" },
        { id: "color-mocha", name: "Mocha", value: "#7D5F4F" }
      ];
      setAllSolidColors([...baseColors, ...dbColors]);
    });

    return () => {
      unsubPoses();
      unsubFrames();
      unsubColors();
    };
  }, []);

  // Editor states
  const [editState, setEditState] = useState<EditState>(DEFAULT_EDIT_STATE);
  const [activeTab, setActiveTab] = useState<"frame" | "filter" | "stickers" | "text" | "download">("frame");
  const [editWizardStep, setEditWizardStep] = useState<"frame" | "color" | "filter" | "preview">("frame");
  const [allSolidColors, setAllSolidColors] = useState<any[]>([
    { id: "color-white", name: "Putih", value: "#ffffff" },
    { id: "color-black", name: "Hitam", value: "#000000" },
    { id: "color-cream", name: "Cream", value: "#FFFDD0" },
    { id: "color-beige", name: "Beige", value: "#F5F5DC" },
    { id: "color-abumuda", name: "Abu Muda", value: "#E5E7EB" },
    { id: "color-abutua", name: "Abu Tua", value: "#4B5563" },
    { id: "color-sage", name: "Sage Green", value: "#8F9779" },
    { id: "color-dusty", name: "Dusty Blue", value: "#8CA1B3" },
    { id: "color-pink", name: "Soft Pink", value: "#EABFCB" },
    { id: "color-mocha", name: "Mocha", value: "#7D5F4F" }
  ]);
  const [selectedStickerCategory, setSelectedStickerCategory] = useState<string>("Cute 3D");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<"sticker" | "text" | null>(null);

  // New text builder temporary state
  const [newTextVal, setNewTextVal] = useState("");
  const [newTextType, setNewTextType] = useState("custom");

  // Physical Photobooth Machine Animation Overlay
  const [isPrinting, setIsPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState(0);
  const [printPhase, setPrintPhase] = useState("");
  const [printedFileUrl, setPrintedFileUrl] = useState<string | null>(null);
  const [printingResolution, setPrintingResolution] = useState("png-1080p");

  // Video generation states
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoPhase, setVideoPhase] = useState("");

  // GIF generation states
  const [isGifGenerating, setIsGifGenerating] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);

  // Live Photo recorded clip states & refs
  const [recordedClipsP1, setRecordedClipsP1] = useState<string[]>([]);
  const [recordedClipsP2, setRecordedClipsP2] = useState<string[]>([]);
  const [hoveredPhotoIdx, setHoveredPhotoIdx] = useState<number | null>(null);

  const countdownRecorderP1Ref = useRef<MediaRecorder | null>(null);
  const countdownChunksP1Ref = useRef<Blob[]>([]);

  const countdownRecorderP2Ref = useRef<MediaRecorder | null>(null);
  const countdownChunksP2Ref = useRef<Blob[]>([]);

  // Local synchronized countdown
  const [countdownVal, setCountdownVal] = useState<number | null>(null);
  const lastStartedCountdownIndex = useRef<number | null>(null);

  // Local camera stream
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // WebRTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load user data and init camera
  useEffect(() => {
    if (typeof window === "undefined") return;

    let uId = sessionStorage.getItem("db_userid");
    let uName = sessionStorage.getItem("db_username") || "Guest";
    if (!uId) {
      uId = "user_" + Math.random().toString(36).substring(2, 12);
      sessionStorage.setItem("db_userid", uId);
    }
    setUserId(uId);
    setUserName(uName);

    // Initialize Camera
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 }, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        setCameraPermission("granted");
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Camera access denied:", err);
        setCameraPermission("denied");
        setError("Izin kamera ditolak. Silakan aktifkan kamera untuk menggunakan Photobooth.");
      });

    return () => {
      // Cleanup stream
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Sync Room with Firestore
  useEffect(() => {
    if (!userId || !roomId) return;

    const roomRef = doc(db, "rooms", roomId);

    // Join room or read room
    const checkAndJoin = async () => {
      let snap;
      try {
        snap = await getDoc(roomRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`);
        return;
      }

      if (!snap || !snap.exists()) {
        setError("Ruang tidak ditemukan.");
        return;
      }

      const data = snap.data() as RoomData;
      const isP1 = data.peer1?.id === userId;
      setIsPeer1(isP1);

      // Set default edit status based on current page
      const defaultStatus = data.status === "completed" ? "editing" : "online";

      if (!isP1 && !data.peer2 && data.status === "waiting") {
        await updateDoc(roomRef, {
          peer2: {
            id: userId,
            name: userName,
            joinedAt: new Date().toISOString(),
            status: defaultStatus
          },
          status: "ready",
          updatedAt: new Date().toISOString(),
        }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
        });
      } else {
        // Just update status
        const updatePayload: any = {};
        if (isP1 && data.peer1) {
          updatePayload["peer1.status"] = defaultStatus;
        } else if (!isP1 && data.peer2) {
          updatePayload["peer2.status"] = defaultStatus;
        }
        await updateDoc(roomRef, updatePayload).catch(() => {});
      }
    };

    checkAndJoin();

    // Listen to changes
    const unsubscribe = onSnapshot(
      roomRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          setError("Ruang tidak ada.");
          return;
        }
        const data = docSnap.data() as RoomData;
        setRoom(data);
        setIsPeer1(data.peer1?.id === userId);

        // Sync shared editState
        if (data.editState) {
          // Deep compare to prevent overwriting when actively dragging
          setEditState((prev) => {
            // Check if there is an active local drag element to prevent laggy jumps
            if (selectedElementId) return prev;
            return data.editState || prev;
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`);
      }
    );

    return () => unsubscribe();
  }, [userId, roomId, userName, selectedElementId]);

  // Update Peer Status in Firebase on navigation
  const updateMyPeerStatusInFirebase = async (status: "online" | "selecting_frame" | "taking_photo" | "editing" | "done") => {
    if (!roomId || !userId || !room) return;
    const roomRef = doc(db, "rooms", roomId);
    const updatePayload: any = {};
    if (isPeer1 && room.peer1) {
      updatePayload["peer1.status"] = status;
    } else if (!isPeer1 && room.peer2) {
      updatePayload["peer2.status"] = status;
    }
    await updateDoc(roomRef, updatePayload).catch(() => {});
  };

  // Sync local EditState to Firestore with debounce
  const syncEditStateToFirebase = (newState: EditState) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      if (!roomId) return;
      const roomRef = doc(db, "rooms", roomId);
      await updateDoc(roomRef, {
        editState: newState,
        updatedAt: new Date().toISOString(),
      }).catch((err) => {
        console.error("Firestore sync error:", err);
      });
    }, 300);
  };

  // WebRTC Peer Connection Setup
  useEffect(() => {
    if (!localStream || !room || !userId) return;
    if (peerConnectionRef.current) return; // Already setup

    const isP1 = room.peer1?.id === userId;
    const hasPeer2 = !!room.peer2;

    if (!hasPeer2) return; // Wait for both peers

    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    // Add local tracks to WebRTC
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle remote video stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Gather ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const roomRef = doc(db, "rooms", roomId);
        const latestRoom = (await getDoc(roomRef)).data() as RoomData;
        const candStr = JSON.stringify(event.candidate.toJSON());

        if (isP1) {
          const currentCands = latestRoom.candidates1 || [];
          if (!currentCands.includes(candStr)) {
            await updateDoc(roomRef, {
              candidates1: [...currentCands, candStr],
            });
          }
        } else {
          const currentCands = latestRoom.candidates2 || [];
          if (!currentCands.includes(candStr)) {
            await updateDoc(roomRef, {
              candidates2: [...currentCands, candStr],
            });
          }
        }
      }
    };

    // Initialize signaling for Peer 1
    if (isP1) {
      const createAndSendOffer = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const roomRef = doc(db, "rooms", roomId);
        await updateDoc(roomRef, {
          sdpOffer: JSON.stringify(offer),
          updatedAt: new Date().toISOString(),
        });
      };
      createAndSendOffer();
    }

    return () => {
      pc.close();
      peerConnectionRef.current = null;
    };
  }, [localStream, !!room?.peer2, userId]);

  // Listen and respond to signaling and candidates
  useEffect(() => {
    const pc = peerConnectionRef.current;
    if (!pc || !room || !userId) return;

    const isP1 = room.peer1?.id === userId;

    const handleSignalingAndCandidates = async () => {
      const roomRef = doc(db, "rooms", roomId);

      // Peer 2 (not P1): set Offer and send Answer
      if (!isP1 && room.sdpOffer && !pc.remoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(room.sdpOffer)));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await updateDoc(roomRef, {
          sdpAnswer: JSON.stringify(answer),
          updatedAt: new Date().toISOString(),
        });
      }

      // Peer 1 (P1): set Answer
      if (isP1 && room.sdpAnswer && !pc.remoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(room.sdpAnswer)));
      }

      // Exchange candidates once remote description is set
      if (pc.remoteDescription) {
        const remoteCands = isP1 ? (room.candidates2 || []) : (room.candidates1 || []);
        for (const candStr of remoteCands) {
          try {
            const cand = new RTCIceCandidate(JSON.parse(candStr));
            await pc.addIceCandidate(cand);
          } catch (e) {
            // Ignore duplicate candidates or issues gracefully
          }
        }
      }
    };

    handleSignalingAndCandidates();
  }, [room?.sdpOffer, room?.sdpAnswer, room?.candidates1, room?.candidates2, userId]);

  // Synchronized Countdown Timer & Automatic Photo Capturer


  useEffect(() => {
    if (!room || room.status !== "countdown") {
      setCountdownVal(null);
      lastStartedCountdownIndex.current = null;
      return;
    }

    // Only start if we haven't started a countdown for this specific photo index yet
    if (lastStartedCountdownIndex.current === currentPhotoCount) {
      return;
    }

    lastStartedCountdownIndex.current = currentPhotoCount;
    setCountdownVal(5); // Start local 5 second countdown
    updateMyPeerStatusInFirebase("taking_photo");
  }, [room?.status, currentPhotoCount]);

  const startCountdownRecording = () => {
    if (typeof MediaRecorder === "undefined") return;

    // Record local stream
    if (localStream) {
      try {
        countdownChunksP1Ref.current = [];
        let options = { mimeType: "video/webm;codecs=vp9" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm" };
        }
        const rec = new MediaRecorder(localStream, options);
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            countdownChunksP1Ref.current.push(e.data);
          }
        };
        rec.onstop = () => {
          if (countdownChunksP1Ref.current.length > 0) {
            const blob = new Blob(countdownChunksP1Ref.current, { type: options.mimeType });
            const url = URL.createObjectURL(blob);
            if (isPeer1) {
              setRecordedClipsP1((prev) => {
                const next = [...prev];
                next[currentPhotoCount] = url;
                return next;
              });
            } else {
              setRecordedClipsP2((prev) => {
                const next = [...prev];
                next[currentPhotoCount] = url;
                return next;
              });
            }
          }
        };
        countdownRecorderP1Ref.current = rec;
        rec.start();
      } catch (err) {
        console.error("Gagal merekam localStream:", err);
      }
    }

    // Record remote stream
    const remoteStream = remoteVideoRef.current?.srcObject as MediaStream | null;
    if (remoteStream && room?.boothMode !== "solo") {
      try {
        countdownChunksP2Ref.current = [];
        let options = { mimeType: "video/webm;codecs=vp9" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm" };
        }
        const rec = new MediaRecorder(remoteStream, options);
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            countdownChunksP2Ref.current.push(e.data);
          }
        };
        rec.onstop = () => {
          if (countdownChunksP2Ref.current.length > 0) {
            const blob = new Blob(countdownChunksP2Ref.current, { type: options.mimeType });
            const url = URL.createObjectURL(blob);
            if (isPeer1) {
              setRecordedClipsP2((prev) => {
                const next = [...prev];
                next[currentPhotoCount] = url;
                return next;
              });
            } else {
              setRecordedClipsP1((prev) => {
                const next = [...prev];
                next[currentPhotoCount] = url;
                return next;
              });
            }
          }
        };
        countdownRecorderP2Ref.current = rec;
        rec.start();
      } catch (err) {
        console.error("Gagal merekam remoteStream:", err);
      }
    }
  };

  const stopCountdownRecording = () => {
    if (countdownRecorderP1Ref.current && countdownRecorderP1Ref.current.state !== "inactive") {
      try {
        countdownRecorderP1Ref.current.stop();
      } catch (e) {
        console.error("Gagal menghentikan perekaman localStream:", e);
      }
    }
    if (countdownRecorderP2Ref.current && countdownRecorderP2Ref.current.state !== "inactive") {
      try {
        countdownRecorderP2Ref.current.stop();
      } catch (e) {
        console.error("Gagal menghentikan perekaman remoteStream:", e);
      }
    }
  };

  // Local tick down timer
  useEffect(() => {
    if (countdownVal === null) return;

    // Start recording at 3 seconds remaining
    if (countdownVal === 3) {
      startCountdownRecording();
    }

    if (countdownVal === 0) {
      stopCountdownRecording();
      setCountdownVal(null);
      capturePhoto();
      return;
    }

    const timer = setTimeout(() => {
      setCountdownVal(countdownVal - 1);
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownVal]);

  const capturePhoto = async () => {
    if (!room || !localStream) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 500);

    // Play a shutter sound effect if browser allows
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context block bypass
    }

    // Capture Canvas frame from video element
    const video = localVideoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally for a natural mirror photo
    ctx.translate(640, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, 640, 480);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);

    const roomRef = doc(db, "rooms", roomId);
    const freshRoomSnap = await getDoc(roomRef);
    const freshData = freshRoomSnap.data() as RoomData;

    const activePhotos = isPeer1 ? [...freshData.photos1] : [...freshData.photos2];
    activePhotos.push(dataUrl);

    const isP1 = isPeer1;
    const updatePayload: Partial<RoomData> = isP1
      ? { photos1: activePhotos }
      : { photos2: activePhotos };

    // Check if both peers are done capturing this round or if playing solo
    const otherPhotos = isP1 ? freshData.photos2 : freshData.photos1;
    const isDual = freshData.boothMode !== "solo" && !!freshData.peer2;

    const bothReadyForNext = !isDual || otherPhotos.length >= activePhotos.length;

    const activeFrameConfig = allFrameStyles.find(f => f.id === (freshData.editState?.frame || editState.frame)) || allFrameStyles[0] || FRAME_STYLES[0];
    const totalPhotosLimit = activeFrameConfig?.slots?.length || 4;

    if (activePhotos.length === totalPhotosLimit && (!isDual || otherPhotos.length === totalPhotosLimit)) {
      updatePayload.status = "completed";
      // Explode Confetti
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else if (bothReadyForNext) {
      // Automatically triggers next countdown loop
      updatePayload.status = "countdown";
      updatePayload.countdown = 5;
      updatePayload.countdownStartedAt = Date.now();
    } else {
      updatePayload.status = "captured";
    }

    updatePayload.updatedAt = new Date().toISOString();

    await updateDoc(roomRef, updatePayload).catch((err) => {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    });
  };

  const startPhotobooth = async () => {
    if (!room) return;
    const roomRef = doc(db, "rooms", roomId);

    setRecordedClipsP1([]);
    setRecordedClipsP2([]);

    await updateDoc(roomRef, {
      status: "countdown",
      countdown: 5,
      countdownStartedAt: Date.now(),
      photos1: [],
      photos2: [],
      updatedAt: new Date().toISOString(),
    }).catch((err) => {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    });
  };

  const toggleBoothMode = async (mode: "solo" | "online") => {
    if (!room || !isPeer1) return;
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, {
      boothMode: mode,
      updatedAt: new Date().toISOString(),
    }).catch((err) => {
      console.error("Gagal mengubah mode booth:", err);
    });
  };

  const toggleChallengeMode = async (mode: "meme" | "freestyle") => {
    if (!room || !isPeer1) return;
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, {
      challengeMode: mode,
      updatedAt: new Date().toISOString(),
    }).catch((err) => {
      console.error("Gagal mengubah mode tantangan:", err);
    });
  };

  const copyRoomCode = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(room?.roomId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sticker operations
  const handleAddSticker = (char: string) => {
    const newSticker = {
      id: "stk_" + Math.random().toString(36).substring(2, 10),
      category: selectedStickerCategory,
      char,
      x: 50,
      y: 50,
      scale: 1.0,
      rotation: 0,
      zIndex: editState.stickers.length + 10
    };
    const nextState = {
      ...editState,
      stickers: [...editState.stickers, newSticker]
    };
    setEditState(nextState);
    setSelectedElementId(newSticker.id);
    setSelectedElementType("sticker");
    syncEditStateToFirebase(nextState);
  };

  const handleAddText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTextVal.trim()) return;

    const newTxt = {
      id: "txt_" + Math.random().toString(36).substring(2, 10),
      type: newTextType,
      text: newTextVal.trim(),
      font: "modern",
      size: 18,
      color: "#000000",
      x: 50,
      y: 50,
      rotation: 0,
      opacity: 100,
      shadow: false,
      outline: false
    };

    const nextState = {
      ...editState,
      texts: [...editState.texts, newTxt]
    };

    setEditState(nextState);
    setNewTextVal("");
    setSelectedElementId(newTxt.id);
    setSelectedElementType("text");
    syncEditStateToFirebase(nextState);
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;

    let nextState = { ...editState };
    if (selectedElementType === "sticker") {
      nextState.stickers = editState.stickers.filter(s => s.id !== selectedElementId);
    } else {
      nextState.texts = editState.texts.filter(t => t.id !== selectedElementId);
    }

    setEditState(nextState);
    setSelectedElementId(null);
    setSelectedElementType(null);
    syncEditStateToFirebase(nextState);
  };

  const handleDuplicateSelected = () => {
    if (!selectedElementId) return;

    let nextState = { ...editState };
    if (selectedElementType === "sticker") {
      const active = editState.stickers.find(s => s.id === selectedElementId);
      if (active) {
        const copy = {
          ...active,
          id: "stk_" + Math.random().toString(36).substring(2, 10),
          x: Math.min(95, active.x + 5),
          y: Math.min(95, active.y + 5),
          zIndex: editState.stickers.length + 12
        };
        nextState.stickers = [...editState.stickers, copy];
        setSelectedElementId(copy.id);
      }
    } else {
      const active = editState.texts.find(t => t.id === selectedElementId);
      if (active) {
        const copy = {
          ...active,
          id: "txt_" + Math.random().toString(36).substring(2, 10),
          x: Math.min(95, active.x + 5),
          y: Math.min(95, active.y + 5)
        };
        nextState.texts = [...editState.texts, copy];
        setSelectedElementId(copy.id);
      }
    }
    setEditState(nextState);
    syncEditStateToFirebase(nextState);
  };

  const updateSelectedElement = (key: string, val: any) => {
    if (!selectedElementId) return;

    let nextState = { ...editState };
    if (selectedElementType === "sticker") {
      nextState.stickers = editState.stickers.map(s => 
        s.id === selectedElementId ? { ...s, [key]: val } : s
      );
    } else {
      nextState.texts = editState.texts.map(t => 
        t.id === selectedElementId ? { ...t, [key]: val } : t
      );
    }

    setEditState(nextState);
    syncEditStateToFirebase(nextState);
  };

  // Dragging Implementation
  const handlePointerDown = (e: React.PointerEvent, id: string, type: "sticker" | "text") => {
    e.preventDefault();
    setSelectedElementId(id);
    setSelectedElementType(type);

    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const item = type === "sticker" 
      ? editState.stickers.find(s => s.id === id)
      : editState.texts.find(t => t.id === id);

    if (!item) return;

    const initialX = e.clientX;
    const initialY = e.clientY;
    const startItemX = item.x;
    const startItemY = item.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = ((moveEvent.clientX - initialX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - initialY) / rect.height) * 100;

      setEditState((prev) => {
        let updatedStickers = [...prev.stickers];
        let updatedTexts = [...prev.texts];

        if (type === "sticker") {
          updatedStickers = updatedStickers.map(s => 
            s.id === id ? { ...s, x: Math.max(0, Math.min(100, startItemX + deltaX)), y: Math.max(0, Math.min(100, startItemY + deltaY)) } : s
          );
        } else {
          updatedTexts = updatedTexts.map(t => 
            t.id === id ? { ...t, x: Math.max(0, Math.min(100, startItemX + deltaX)), y: Math.max(0, Math.min(100, startItemY + deltaY)) } : t
          );
        }

        const nextState = { ...prev, stickers: updatedStickers, texts: updatedTexts };
        syncEditStateToFirebase(nextState);
        return nextState;
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Compile Photo Strip onto Canvas and Trigger Download
  const triggerPrintingFlow = async (resolutionId: string) => {
    if (!room) return;
    setPrintingResolution(resolutionId);
    setIsPrinting(true);
    setPrintProgress(10);
    setPrintPhase("Menghubungkan ke Mesin Cetak...");

    // Start synthesized printing sounds
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(60, audioCtx.currentTime);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, audioCtx.currentTime);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      osc.start();
      setTimeout(() => osc.stop(), 3500);
    } catch(e){}

    setTimeout(() => {
      setPrintProgress(35);
      setPrintPhase("Merender Resolusi & Filter Gambar...");
    }, 1000);

    setTimeout(() => {
      setPrintProgress(65);
      setPrintPhase("Menempelkan Sticker dan Frame...");
    }, 2000);

    setTimeout(() => {
      setPrintProgress(85);
      setPrintPhase("Memotong Margin & Menyelaraskan Sudut...");
    }, 3000);

    setTimeout(async () => {
      if (resolutionId === "printable-4r") {
        await compileAndSave4RSheet();
      } else {
        await compileAndSaveStrip(resolutionId);
      }
      setPrintProgress(100);
      setPrintPhase("Selesai Cetak!");
      setTimeout(() => {
        setIsPrinting(false);
      }, 1500);
    }, 4200);
  };

  const generateSingleStripCanvas = async (scale: number): Promise<HTMLCanvasElement | null> => {
    if (!room) return null;

    try {
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
          img.src = src;
        });
      };

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const photosP1 = room.photos1 || [];
      const photosP2 = room.photos2 || [];

      // Define standard layout sizes
      let photoWidth = 320 * scale;
      let photoHeight = 240 * scale;
      let padding = editState.borderThickness * scale;
      let gap = 12 * scale;
      let headerHeight = 20 * scale;
      let footerHeight = 110 * scale;

      const chosenLayout = editState.layout;
      let cols = 1;
      let rows = 4;

      if (chosenLayout === "2x2") {
        cols = 2; rows = 2;
      } else if (chosenLayout === "polaroid") {
        cols = 1; rows = 1;
        photoWidth = 440 * scale;
        photoHeight = 350 * scale;
        footerHeight = 140 * scale;
      } else if (chosenLayout === "horizontal") {
        cols = 4; rows = 1;
      } else if (chosenLayout === "mini-strip") {
        cols = 1; rows = 2;
      } else if (chosenLayout === "long-strip") {
        cols = 1; rows = 4;
        photoWidth = 260 * scale;
        photoHeight = 200 * scale;
      } else if (chosenLayout === "square-grid") {
        cols = 2; rows = 2;
        photoWidth = 280 * scale;
        photoHeight = 280 * scale;
      }

      // Calculate total width and height
      const slotWidth = photoWidth;
      const slotHeight = photoHeight;

      let stripWidth = (slotWidth * cols) + (gap * (cols - 1)) + (padding * 2);
      let stripHeight = (slotHeight * rows) + (gap * (rows - 1)) + (padding * 2) + headerHeight + footerHeight;

      canvas.width = stripWidth;
      canvas.height = stripHeight;

      const activeFrameConfig = allFrameStyles.find(f => f.id === editState.frame) || allFrameStyles[0] || FRAME_STYLES[0];

      // 1. Draw Background Type
      if (editState.frameImage) {
        try {
          const bgImg = await loadImage(editState.frameImage);
          ctx.drawImage(bgImg, 0, 0, stripWidth, stripHeight);
        } catch(e) {
          ctx.fillStyle = editState.backgroundColor;
          ctx.fillRect(0, 0, stripWidth, stripHeight);
        }
      } else if (activeFrameConfig?.frameBackgroundImageUrl) {
        try {
          const bgImg = await loadImage(activeFrameConfig.frameBackgroundImageUrl);
          ctx.drawImage(bgImg, 0, 0, stripWidth, stripHeight);
        } catch(e) {
          ctx.fillStyle = editState.backgroundColor || "#ffffff";
          ctx.fillRect(0, 0, stripWidth, stripHeight);
        }
      } else if (editState.backgroundType === "warna-polos") {
        ctx.fillStyle = editState.backgroundColor;
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      } else if (editState.backgroundType === "gradient-lembut") {
        const grd = ctx.createLinearGradient(0, 0, stripWidth, stripHeight);
        let col1 = "#fecdd3", col2 = "#ffedd5";
        if (editState.backgroundGradient) {
          const matches = editState.backgroundGradient.match(/#[0-9a-fA-F]{6}/g);
          if (matches && matches.length >= 2) {
            col1 = matches[0];
            col2 = matches[1];
          }
        }
        grd.addColorStop(0, col1);
        grd.addColorStop(1, col2);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      } else {
        // Draw vintage / paper background styling
        ctx.fillStyle = "#faf9f6";
        ctx.fillRect(0, 0, stripWidth, stripHeight);
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
        for (let x = 0; x < stripWidth; x += 20 * scale) {
          ctx.fillRect(x, 0, 1 * scale, stripHeight);
        }
        for (let y = 0; y < stripHeight; y += 20 * scale) {
          ctx.fillRect(0, y, stripWidth, 1 * scale);
        }
      }

      // Frame specific decorative background washes
      if (editState.frame === "disposable") {
        ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      } else if (editState.frame === "retro") {
        ctx.fillStyle = "rgba(234, 88, 12, 0.1)";
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      } else if (editState.frame === "vintage") {
        ctx.fillStyle = "rgba(139, 92, 26, 0.12)";
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      } else if (editState.frame === "cinema") {
        ctx.fillStyle = "#0c0a09";
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      }

      // Draw photos with Lightroom filters
      const hasCustomSlots = activeFrameConfig?.slots && activeFrameConfig.slots.length > 0;

      if (hasCustomSlots) {
        for (let s = 0; s < activeFrameConfig.slots.length; s++) {
          const slot = activeFrameConfig.slots[s];
          const xPos = (slot.x / 100) * stripWidth;
          const yPos = (slot.y / 100) * stripHeight;
          const currentPhotoWidth = (slot.w / 100) * stripWidth;
          const currentPhotoHeight = (slot.h / 100) * stripHeight;

          const p1Url = photosP1[s];
          const p2Url = photosP2[s];
          const activeImgUrl = p1Url || p2Url;

          if (activeImgUrl) {
            const img = await loadImage(activeImgUrl);
            const offscreen = document.createElement("canvas");
            offscreen.width = currentPhotoWidth;
            offscreen.height = currentPhotoHeight;
            const oCtx = offscreen.getContext("2d");
            if (oCtx) {
              const filterPreset = FILTER_PRESETS.find(f => f.id === editState.filter)?.css || "";
              const sliderBrightness = editState.sliders.brightness;
              const sliderContrast = editState.sliders.contrast;
              const sliderSaturation = editState.sliders.saturation;
              const sliderBlur = editState.sliders.blur;

              oCtx.filter = `${filterPreset} brightness(${sliderBrightness}%) contrast(${sliderContrast}%) saturate(${sliderSaturation}%) blur(${sliderBlur}px)`;
              
              const imgRatio = img.width / img.height;
              const slotRatio = currentPhotoWidth / currentPhotoHeight;
              let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
              if (imgRatio > slotRatio) {
                sWidth = img.height * slotRatio;
                sx = (img.width - sWidth) / 2;
              } else {
                sHeight = img.width / slotRatio;
                sy = (img.height - sHeight) / 2;
              }
              oCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, currentPhotoWidth, currentPhotoHeight);
              ctx.drawImage(offscreen, xPos, yPos);
            }
          } else {
            ctx.fillStyle = "rgba(226, 232, 240, 0.7)";
            ctx.fillRect(xPos, yPos, currentPhotoWidth, currentPhotoHeight);
            
            ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
            ctx.font = `bold ${Math.max(10, 14 * scale)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`#${s + 1}`, xPos + currentPhotoWidth / 2, yPos + currentPhotoHeight / 2);
          }

          if (editState.innerBorder) {
            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.lineWidth = 2 * scale;
            ctx.strokeRect(xPos, yPos, currentPhotoWidth, currentPhotoHeight);
          }
        }
      } else {
        let photoIndex = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const xPos = padding + c * (slotWidth + gap);
            const yPos = padding + headerHeight + r * (slotHeight + gap);

            // Get image from photo collection
            const p1Url = photosP1[photoIndex];
            const p2Url = photosP2[photoIndex];
            
            let activeImgUrl = p1Url || p2Url;
            if (activeImgUrl) {
              const img = await loadImage(activeImgUrl);
              
              // Create temporary canvas to apply custom Lightroom tuning adjustments
              const offscreen = document.createElement("canvas");
              offscreen.width = photoWidth;
              offscreen.height = photoHeight;
              const oCtx = offscreen.getContext("2d");
              if (oCtx) {
                const filterPreset = FILTER_PRESETS.find(f => f.id === editState.filter)?.css || "";
                const sliderBrightness = editState.sliders.brightness;
                const sliderContrast = editState.sliders.contrast;
                const sliderSaturation = editState.sliders.saturation;
                const sliderBlur = editState.sliders.blur;

                oCtx.filter = `${filterPreset} brightness(${sliderBrightness}%) contrast(${sliderContrast}%) saturate(${sliderSaturation}%) blur(${sliderBlur}px)`;
                
                const imgRatio = img.width / img.height;
                const slotRatio = photoWidth / photoHeight;
                let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                if (imgRatio > slotRatio) {
                  sWidth = img.height * slotRatio;
                  sx = (img.width - sWidth) / 2;
                } else {
                  sHeight = img.width / slotRatio;
                  sy = (img.height - sHeight) / 2;
                }
                oCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, photoWidth, photoHeight);

                // 3. Draw Photos onto Main Canvas
                ctx.drawImage(offscreen, xPos, yPos, photoWidth, photoHeight);
              }
            }

            // Frame borders (inner/outer)
            if (editState.innerBorder) {
              ctx.strokeStyle = "rgba(255,255,255,0.15)";
              ctx.lineWidth = 2 * scale;
              ctx.strokeRect(xPos, yPos, photoWidth, photoHeight);
            }

            photoIndex++;
          }
        }
      }

      // 4. Draw Cinema Sprockets if selected
      if (editState.frame === "cinema") {
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${10 * scale}px monospace`;
        // Draw sprocket holes on both margins
        for (let y = 10 * scale; y < stripHeight; y += 25 * scale) {
          ctx.fillRect(5 * scale, y, 6 * scale, 12 * scale);
          ctx.fillRect(stripWidth - 11 * scale, y, 6 * scale, 12 * scale);
        }
        ctx.fillStyle = "#ea580c";
        ctx.fillText("KODAK 400", padding, stripHeight - 25 * scale);
      }

      // 4.5. Draw Custom Frame PNG Overlay if present
      if (activeFrameConfig?.frameOverlayImageUrl) {
        try {
          const overlayImg = await loadImage(activeFrameConfig.frameOverlayImageUrl);
          ctx.drawImage(overlayImg, 0, 0, stripWidth, stripHeight);
        } catch(e) {
          console.error("Gagal menggambar overlay:", e);
        }
      }

      // 5. Draw Stickers
      for (const sticker of editState.stickers) {
        ctx.save();
        const stkX = (sticker.x / 100) * stripWidth;
        const stkY = (sticker.y / 100) * stripHeight;
        
        ctx.translate(stkX, stkY);
        ctx.rotate((sticker.rotation * Math.PI) / 180);
        ctx.scale(sticker.scale * scale, sticker.scale * scale);

        if (sticker.char.startsWith("http") || sticker.char.startsWith("/") || sticker.char.includes(".")) {
          try {
            const img = await loadImage(sticker.char);
            if (img) {
              // Center the image (size: 48x48 scaled by scale factor)
              ctx.drawImage(img, -24, -24, 48, 48);
            }
          } catch (e) {
            console.error("Gagal menggambar sticker image:", e);
          }
        } else {
          // Render emoji
          ctx.font = `${28}px Arial, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sticker.char, 0, 0);
        }
        ctx.restore();
      }

      // 6. Draw Texts
      for (const t of editState.texts) {
        ctx.save();
        const tX = (t.x / 100) * stripWidth;
        const tY = (t.y / 100) * stripHeight;

        ctx.translate(tX, tY);
        ctx.rotate((t.rotation * Math.PI) / 180);

        const chosenFont = FONT_OPTIONS.find(f => f.id === t.font)?.css || "sans-serif";
        ctx.font = `${t.size * scale}px ${chosenFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = t.color;

        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }

      return canvas;
    } catch (e) {
      console.error("Gagal membuat single strip canvas:", e);
      return null;
    }
  };

  const compileAndSaveStrip = async (resolutionId: string) => {
    if (!room) return;

    try {
      const selectedRes = DOWNLOAD_RATIOS.find(r => r.id === resolutionId) || DOWNLOAD_RATIOS[0];
      const canvas = await generateSingleStripCanvas(selectedRes.scale);
      if (!canvas) throw new Error("Gagal merender strip");

      // Download trigger
      const dataUrl = canvas.toDataURL(selectedRes.format === "jpeg" ? "image/jpeg" : "image/png");
      const link = document.createElement("a");
      link.download = `DualBooth-Studio-${room.roomId}-${editState.frame}.${selectedRes.format}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download Error:", err);
    }
  };

  const compileAndSave4RSheet = async () => {
    if (!room) return;

    try {
      // Use standard print-quality scale (2.0)
      const stripCanvas = await generateSingleStripCanvas(2.0);
      if (!stripCanvas) throw new Error("Gagal membuat strip dasar untuk cetak 4R");

      const sW = stripCanvas.width;
      const sH = stripCanvas.height;

      // Create a 4R sheet canvas (holds 2 strips side-by-side with nice margins and central dashed line)
      const canvas4R = document.createElement("canvas");
      const gap = 40;
      const marginX = 30;
      const marginY = 40;

      canvas4R.width = sW * 2 + gap + marginX * 2;
      canvas4R.height = sH + marginY * 2;

      const ctx = canvas4R.getContext("2d");
      if (!ctx) return;

      // 1. Draw solid clean background for the entire printing template
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas4R.width, canvas4R.height);

      // 2. Draw left strip
      ctx.drawImage(stripCanvas, marginX, marginY);

      // 3. Draw right strip
      ctx.drawImage(stripCanvas, marginX + sW + gap, marginY);

      // 4. Draw a beautifully subtle cutting guideline in the middle
      const centerX = marginX + sW + gap / 2;
      ctx.strokeStyle = "#cbd5e1"; // Slate 300
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(centerX, marginY / 2);
      ctx.lineTo(centerX, canvas4R.height - marginY / 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // 5. Draw clear text instructions at the top and bottom with scissor emojis
      ctx.fillStyle = "#94a3b8"; // Slate 400
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✂️ POTONG DI SINI (CUT HERE) ✂️", centerX, marginY / 2);
      ctx.fillText("✂️ POTONG DI SINI (CUT HERE) ✂️", centerX, canvas4R.height - marginY / 2);

      // 6. Download the high resolution printable sheet
      const dataUrl = canvas4R.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `DualBooth-Cetak-4R-${room.roomId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Gagal mengompilasi lembaran cetak 4R:", err);
    }
  };

  const drawRetroViewfinderBrackets = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 3;
    
    // Corner marks
    ctx.beginPath();
    // Top-Left
    ctx.moveTo(40, 80); ctx.lineTo(40, 40); ctx.lineTo(80, 40);
    // Top-Right
    ctx.moveTo(680, 80); ctx.lineTo(680, 40); ctx.lineTo(640, 40);
    // Bottom-Left
    ctx.moveTo(40, 1200); ctx.lineTo(40, 1240); ctx.lineTo(80, 1240);
    // Bottom-Right
    ctx.moveTo(680, 1200); ctx.lineTo(680, 1240); ctx.lineTo(640, 1240);
    ctx.stroke();

    // Viewport crosshair center
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.beginPath();
    ctx.moveTo(340, 640); ctx.lineTo(380, 640);
    ctx.moveTo(360, 620); ctx.lineTo(360, 660);
    ctx.stroke();
  };

  const playLocalShutterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // Audio context block bypass
    }
  };

  const renderStripToCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!room) return null;

    try {
      const loadImageHelper = (src: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      const scale = 1.5;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const photosP1 = room.photos1 || [];
      const photosP2 = room.photos2 || [];

      let photoWidth = 320 * scale;
      let photoHeight = 240 * scale;
      let padding = editState.borderThickness * scale;
      let gap = 12 * scale;
      let headerHeight = 20 * scale;
      let footerHeight = 110 * scale;

      const chosenLayout = editState.layout;
      let cols = 1;
      let rows = 4;

      if (chosenLayout === "2x2") {
        cols = 2; rows = 2;
      } else if (chosenLayout === "polaroid") {
        cols = 1; rows = 1;
        photoWidth = 440 * scale;
        photoHeight = 350 * scale;
        footerHeight = 140 * scale;
      } else if (chosenLayout === "horizontal") {
        cols = 4; rows = 1;
      } else if (chosenLayout === "mini-strip") {
        cols = 1; rows = 2;
      } else if (chosenLayout === "long-strip") {
        cols = 1; rows = 4;
        photoWidth = 260 * scale;
        photoHeight = 200 * scale;
      } else if (chosenLayout === "square-grid") {
        cols = 2; rows = 2;
        photoWidth = 280 * scale;
        photoHeight = 280 * scale;
      }

      const slotWidth = photoWidth;
      const slotHeight = photoHeight;

      let stripWidth = (slotWidth * cols) + (gap * (cols - 1)) + (padding * 2);
      let stripHeight = (slotHeight * rows) + (gap * (rows - 1)) + (padding * 2) + headerHeight + footerHeight;

      canvas.width = stripWidth;
      canvas.height = stripHeight;

      const activeFrameConfig = allFrameStyles.find(f => f.id === editState.frame) || allFrameStyles[0] || FRAME_STYLES[0];

      if (editState.frameImage) {
        try {
          const bgImg = await loadImageHelper(editState.frameImage);
          if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, stripWidth, stripHeight);
          } else {
            ctx.fillStyle = editState.backgroundColor;
            ctx.fillRect(0, 0, stripWidth, stripHeight);
          }
        } catch(e) {
          ctx.fillStyle = editState.backgroundColor;
          ctx.fillRect(0, 0, stripWidth, stripHeight);
        }
      } else if (activeFrameConfig?.frameBackgroundImageUrl) {
        try {
          const bgImg = await loadImageHelper(activeFrameConfig.frameBackgroundImageUrl);
          if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, stripWidth, stripHeight);
          } else {
            ctx.fillStyle = editState.backgroundColor || "#ffffff";
            ctx.fillRect(0, 0, stripWidth, stripHeight);
          }
        } catch(e) {
          ctx.fillStyle = editState.backgroundColor || "#ffffff";
          ctx.fillRect(0, 0, stripWidth, stripHeight);
        }
      } else if (editState.backgroundType === "warna-polos") {
        ctx.fillStyle = editState.backgroundColor;
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      } else if (editState.backgroundType === "gradient-lembut") {
        const grd = ctx.createLinearGradient(0, 0, stripWidth, stripHeight);
        let col1 = "#fecdd3", col2 = "#ffedd5";
        if (editState.backgroundGradient) {
          const matches = editState.backgroundGradient.match(/#[0-9a-fA-F]{6}/g);
          if (matches && matches.length >= 2) {
            col1 = matches[0];
            col2 = matches[1];
          }
        }
        grd.addColorStop(0, col1);
        grd.addColorStop(1, col2);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      } else {
        ctx.fillStyle = "#faf9f6";
        ctx.fillRect(0, 0, stripWidth, stripHeight);
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
        for (let x = 0; x < stripWidth; x += 20 * scale) {
          ctx.fillRect(x, 0, 1 * scale, stripHeight);
        }
        for (let y = 0; y < stripHeight; y += 20 * scale) {
          ctx.fillRect(0, y, stripWidth, 1 * scale);
        }
      }

      if (editState.frame === "disposable") {
        ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      } else if (editState.frame === "retro") {
        ctx.fillStyle = "rgba(234, 88, 12, 0.1)";
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      } else if (editState.frame === "vintage") {
        ctx.fillStyle = "rgba(139, 92, 26, 0.12)";
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      } else if (editState.frame === "cinema") {
        ctx.fillStyle = "#0c0a09";
        ctx.fillRect(0, 0, stripWidth, stripHeight);
      }

      const hasCustomSlots = activeFrameConfig?.slots && activeFrameConfig.slots.length > 0;
      const isOnlineDual = room.boothMode !== "solo" && photosP2.length > 0;

      if (hasCustomSlots) {
        for (let s = 0; s < activeFrameConfig.slots.length; s++) {
          const slot = activeFrameConfig.slots[s];
          const xPos = (slot.x / 100) * stripWidth;
          const yPos = (slot.y / 100) * stripHeight;
          const currentPhotoWidth = (slot.w / 100) * stripWidth;
          const currentPhotoHeight = (slot.h / 100) * stripHeight;

          const p1Url = photosP1[s];
          const p2Url = photosP2[s];

          if (p1Url || p2Url) {
            const offscreen = document.createElement("canvas");
            offscreen.width = currentPhotoWidth;
            offscreen.height = currentPhotoHeight;
            const oCtx = offscreen.getContext("2d");
            if (oCtx) {
              const filterPreset = FILTER_PRESETS.find(f => f.id === editState.filter)?.css || "";
              const sliderBrightness = editState.sliders.brightness;
              const sliderContrast = editState.sliders.contrast;
              const sliderSaturation = editState.sliders.saturation;
              const sliderBlur = editState.sliders.blur;

              oCtx.filter = `${filterPreset} brightness(${sliderBrightness}%) contrast(${sliderContrast}%) saturate(${sliderSaturation}%) blur(${sliderBlur}px)`;

              if (isOnlineDual) {
                // Left half - Peer 1
                if (p1Url) {
                  const img = await loadImageHelper(p1Url);
                  if (img) {
                    const halfWidth = currentPhotoWidth / 2;
                    const imgRatio = img.width / img.height;
                    const targetRatio = halfWidth / currentPhotoHeight;
                    let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                    if (imgRatio > targetRatio) {
                      sWidth = img.height * targetRatio;
                      sx = (img.width - sWidth) / 2;
                    } else {
                      sHeight = img.width / targetRatio;
                      sy = (img.height - sHeight) / 2;
                    }
                    oCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, halfWidth, currentPhotoHeight);
                  }
                } else {
                  oCtx.fillStyle = "rgba(226, 232, 240, 0.5)";
                  oCtx.fillRect(0, 0, currentPhotoWidth / 2, currentPhotoHeight);
                }

                // Right half - Peer 2
                if (p2Url) {
                  const img = await loadImageHelper(p2Url);
                  if (img) {
                    const halfWidth = currentPhotoWidth / 2;
                    const imgRatio = img.width / img.height;
                    const targetRatio = halfWidth / currentPhotoHeight;
                    let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                    if (imgRatio > targetRatio) {
                      sWidth = img.height * targetRatio;
                      sx = (img.width - sWidth) / 2;
                    } else {
                      sHeight = img.width / targetRatio;
                      sy = (img.height - sHeight) / 2;
                    }
                    oCtx.drawImage(img, sx, sy, sWidth, sHeight, halfWidth, 0, halfWidth, currentPhotoHeight);
                  }
                } else {
                  oCtx.fillStyle = "rgba(203, 213, 225, 0.5)";
                  oCtx.fillRect(currentPhotoWidth / 2, 0, currentPhotoWidth / 2, currentPhotoHeight);
                }

                // Divider line
                oCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                oCtx.lineWidth = 1.5 * scale;
                oCtx.beginPath();
                oCtx.moveTo(currentPhotoWidth / 2, 0);
                oCtx.lineTo(currentPhotoWidth / 2, currentPhotoHeight);
                oCtx.stroke();
              } else {
                // Solo
                const img = await loadImageHelper(p1Url || p2Url);
                if (img) {
                  const imgRatio = img.width / img.height;
                  const slotRatio = currentPhotoWidth / currentPhotoHeight;
                  let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                  if (imgRatio > slotRatio) {
                    sWidth = img.height * slotRatio;
                    sx = (img.width - sWidth) / 2;
                  } else {
                    sHeight = img.width / slotRatio;
                    sy = (img.height - sHeight) / 2;
                  }
                  oCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, currentPhotoWidth, currentPhotoHeight);
                }
              }
              ctx.drawImage(offscreen, xPos, yPos);
            }
          }

          if (editState.innerBorder) {
            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.lineWidth = 2 * scale;
            ctx.strokeRect(xPos, yPos, currentPhotoWidth, currentPhotoHeight);
          }
        }
      } else {
        let photoIndex = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const xPos = padding + c * (slotWidth + gap);
            const yPos = padding + headerHeight + r * (slotHeight + gap);

            const p1Url = photosP1[photoIndex];
            const p2Url = photosP2[photoIndex];

            if (p1Url || p2Url) {
              const offscreen = document.createElement("canvas");
              offscreen.width = photoWidth;
              offscreen.height = photoHeight;
              const oCtx = offscreen.getContext("2d");
              if (oCtx) {
                const filterPreset = FILTER_PRESETS.find(f => f.id === editState.filter)?.css || "";
                const sliderBrightness = editState.sliders.brightness;
                const sliderContrast = editState.sliders.contrast;
                const sliderSaturation = editState.sliders.saturation;
                const sliderBlur = editState.sliders.blur;

                oCtx.filter = `${filterPreset} brightness(${sliderBrightness}%) contrast(${sliderContrast}%) saturate(${sliderSaturation}%) blur(${sliderBlur}px)`;

                if (isOnlineDual) {
                  // Left - Peer 1
                  if (p1Url) {
                    const img = await loadImageHelper(p1Url);
                    if (img) {
                      const halfWidth = photoWidth / 2;
                      const imgRatio = img.width / img.height;
                      const targetRatio = halfWidth / photoHeight;
                      let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                      if (imgRatio > targetRatio) {
                        sWidth = img.height * targetRatio;
                        sx = (img.width - sWidth) / 2;
                      } else {
                        sHeight = img.width / targetRatio;
                        sy = (img.height - sHeight) / 2;
                      }
                      oCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, halfWidth, photoHeight);
                    }
                  } else {
                    oCtx.fillStyle = "rgba(226, 232, 240, 0.5)";
                    oCtx.fillRect(0, 0, photoWidth / 2, photoHeight);
                  }

                  // Right - Peer 2
                  if (p2Url) {
                    const img = await loadImageHelper(p2Url);
                    if (img) {
                      const halfWidth = photoWidth / 2;
                      const imgRatio = img.width / img.height;
                      const targetRatio = halfWidth / photoHeight;
                      let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                      if (imgRatio > targetRatio) {
                        sWidth = img.height * targetRatio;
                        sx = (img.width - sWidth) / 2;
                      } else {
                        sHeight = img.width / targetRatio;
                        sy = (img.height - sHeight) / 2;
                      }
                      oCtx.drawImage(img, sx, sy, sWidth, sHeight, halfWidth, 0, halfWidth, photoHeight);
                    }
                  } else {
                    oCtx.fillStyle = "rgba(203, 213, 225, 0.5)";
                    oCtx.fillRect(photoWidth / 2, 0, photoWidth / 2, photoHeight);
                  }

                  // Divider
                  oCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                  oCtx.lineWidth = 1.5 * scale;
                  oCtx.beginPath();
                  oCtx.moveTo(photoWidth / 2, 0);
                  oCtx.lineTo(photoWidth / 2, photoHeight);
                  oCtx.stroke();
                } else {
                  // Solo
                  const img = await loadImageHelper(p1Url || p2Url);
                  if (img) {
                    const imgRatio = img.width / img.height;
                    const slotRatio = photoWidth / photoHeight;
                    let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                    if (imgRatio > slotRatio) {
                      sWidth = img.height * slotRatio;
                      sx = (img.width - sWidth) / 2;
                    } else {
                      sHeight = img.width / slotRatio;
                      sy = (img.height - sHeight) / 2;
                    }
                    oCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, photoWidth, photoHeight);
                  }
                }
                ctx.drawImage(offscreen, xPos, yPos, photoWidth, photoHeight);
              }
            }

            if (editState.innerBorder) {
              ctx.strokeStyle = "rgba(255,255,255,0.15)";
              ctx.lineWidth = 2 * scale;
              ctx.strokeRect(xPos, yPos, photoWidth, photoHeight);
            }

            photoIndex++;
          }
        }
      }

      if (editState.frame === "cinema") {
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${10 * scale}px monospace`;
        for (let y = 10 * scale; y < stripHeight; y += 25 * scale) {
          ctx.fillRect(5 * scale, y, 6 * scale, 12 * scale);
          ctx.fillRect(stripWidth - 11 * scale, y, 6 * scale, 12 * scale);
        }
        ctx.fillStyle = "#ea580c";
        ctx.fillText("KODAK 400", padding, stripHeight - 25 * scale);
      }

      if (activeFrameConfig?.frameOverlayImageUrl) {
        try {
          const overlayImg = await loadImageHelper(activeFrameConfig.frameOverlayImageUrl);
          if (overlayImg) {
            ctx.drawImage(overlayImg, 0, 0, stripWidth, stripHeight);
          }
        } catch(e) {
          console.error("Gagal menggambar overlay di video:", e);
        }
      }

      for (const sticker of editState.stickers) {
        ctx.save();
        const stkX = (sticker.x / 100) * stripWidth;
        const stkY = (sticker.y / 100) * stripHeight;
        
        ctx.translate(stkX, stkY);
        ctx.rotate((sticker.rotation * Math.PI) / 180);
        ctx.scale(sticker.scale * scale, sticker.scale * scale);

        if (sticker.char.startsWith("http") || sticker.char.startsWith("/") || sticker.char.includes(".")) {
          try {
            const img = await loadImageHelper(sticker.char);
            if (img) {
              ctx.drawImage(img, -24, -24, 48, 48);
            }
          } catch (e) {
            console.error("Gagal menggambar sticker image:", e);
          }
        } else {
          ctx.font = `${28}px Arial, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sticker.char, 0, 0);
        }
        ctx.restore();
      }

      for (const t of editState.texts) {
        ctx.save();
        const tX = (t.x / 100) * stripWidth;
        const tY = (t.y / 100) * stripHeight;

        ctx.translate(tX, tY);
        ctx.rotate((t.rotation * Math.PI) / 180);

        const chosenFont = FONT_OPTIONS.find(f => f.id === t.font)?.css || "sans-serif";
        ctx.font = `${t.size * scale}px ${chosenFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = t.color;

        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }

      return canvas;
    } catch (err) {
      console.error("renderStripToCanvas error:", err);
      return null;
    }
  };

  const compileAndSaveGif = async () => {
    if (!room) return;

    try {
      setIsGifGenerating(true);
      setGifProgress(10);

      const photosP1 = room.photos1 || [];
      const photosP2 = room.photos2 || [];
      const activeFrameConfig = allFrameStyles.find(f => f.id === editState.frame) || allFrameStyles[0] || FRAME_STYLES[0];
      const totalPhotosLimit = activeFrameConfig?.slots?.length || 4;

      const activePhotosCount = Math.max(photosP1.length, photosP2.length);
      if (activePhotosCount === 0) {
        throw new Error("Belum ada foto yang diambil");
      }

      const loadImageHelper = (src: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      const framesDataUrls: string[] = [];
      const filterPreset = FILTER_PRESETS.find(f => f.id === editState.filter)?.css || "";
      const { brightness, contrast, saturation, blur } = editState.sliders;

      setGifProgress(30);

      for (let i = 0; i < totalPhotosLimit; i++) {
        const p1Url = photosP1[i] || null;
        const p2Url = photosP2[i] || null;

        if (!p1Url && !p2Url) continue;

        // Create canvas for this GIF frame (1:1 aspect ratio)
        const frameCanvas = document.createElement("canvas");
        frameCanvas.width = 600;
        frameCanvas.height = 600;
        const fCtx = frameCanvas.getContext("2d");
        if (!fCtx) continue;

        // Draw background
        fCtx.fillStyle = activeFrameConfig.bgColor || editState.backgroundColor || "#ffffff";
        fCtx.fillRect(0, 0, 600, 600);

        // Set filters
        fCtx.filter = `${filterPreset} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;

        const isOnlineDual = room.boothMode !== "solo" && photosP2.length > 0;

        if (isOnlineDual) {
          // Left half - Peer 1
          if (p1Url) {
            const img1 = await loadImageHelper(p1Url);
            if (img1) {
              const halfWidth = 300;
              const imgRatio = img1.width / img1.height;
              const targetRatio = halfWidth / 600;
              let sx = 0, sy = 0, sWidth = img1.width, sHeight = img1.height;
              if (imgRatio > targetRatio) {
                sWidth = img1.height * targetRatio;
                sx = (img1.width - sWidth) / 2;
              } else {
                sHeight = img1.width / targetRatio;
                sy = (img1.height - sHeight) / 2;
              }
              fCtx.drawImage(img1, sx, sy, sWidth, sHeight, 0, 0, halfWidth, 600);
            }
          }
          // Right half - Peer 2
          if (p2Url) {
            const img2 = await loadImageHelper(p2Url);
            if (img2) {
              const halfWidth = 300;
              const imgRatio = img2.width / img2.height;
              const targetRatio = halfWidth / 600;
              let sx = 0, sy = 0, sWidth = img2.width, sHeight = img2.height;
              if (imgRatio > targetRatio) {
                sWidth = img2.height * targetRatio;
                sx = (img2.width - sWidth) / 2;
              } else {
                sHeight = img2.width / targetRatio;
                sy = (img2.height - sHeight) / 2;
              }
              fCtx.drawImage(img2, sx, sy, sWidth, sHeight, 300, 0, halfWidth, 600);
            }
          }
        } else {
          // Solo full frame
          const pUrl = p1Url || p2Url;
          if (pUrl) {
            const img = await loadImageHelper(pUrl);
            if (img) {
              const imgRatio = img.width / img.height;
              const targetRatio = 1; // 600 / 600
              let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
              if (imgRatio > targetRatio) {
                sWidth = img.height * targetRatio;
                sx = (img.width - sWidth) / 2;
              } else {
                sHeight = img.width / targetRatio;
                sy = (img.height - sHeight) / 2;
              }
              fCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 600, 600);
            }
          }
        }

        framesDataUrls.push(frameCanvas.toDataURL("image/jpeg", 0.8));
      }

      setGifProgress(60);

      if (framesDataUrls.length === 0) {
        throw new Error("Gagal mengambil data frame foto");
      }

      gifshot.createGIF({
        images: framesDataUrls,
        interval: 0.6,
        gifWidth: 600,
        gifHeight: 600,
        numWorkers: 2,
      }, (obj: any) => {
        if (!obj.error) {
          const gifUrl = obj.image;
          const link = document.createElement("a");
          link.download = `DualBooth-Studio-${room.roomId}-animasi.gif`;
          link.href = gifUrl;
          link.click();

          setGifProgress(100);
          setTimeout(() => {
            setIsGifGenerating(false);
          }, 1000);
        } else {
          console.error("Gifshot error:", obj.error);
          setIsGifGenerating(false);
        }
      });

    } catch (err) {
      console.error("GIF compilation error:", err);
      setIsGifGenerating(false);
    }
  };

  const compileAndSaveVideo = async () => {
    if (!room) return;

    try {
      setIsVideoGenerating(true);
      setVideoProgress(5);
      setVideoPhase("Menyiapkan Aset Gambar...");

      const stripCanvas = await renderStripToCanvas();
      if (!stripCanvas) {
        throw new Error("Gagal merender strip foto");
      }

      setVideoProgress(15);
      setVideoPhase("Menghubungkan Roll Film...");

      const photosP1 = room.photos1 || [];
      const photosP2 = room.photos2 || [];
      const activeFrameConfig = allFrameStyles.find(f => f.id === editState.frame) || allFrameStyles[0] || FRAME_STYLES[0];
      const totalPhotosLimit = activeFrameConfig?.slots?.length || 4;

      const activePhotos = [];
      for (let i = 0; i < totalPhotosLimit; i++) {
        const p = photosP1[i] || photosP2[i] || null;
        if (p) activePhotos.push(p);
      }

      const loadImageHelper = (src: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      const loadedImages: (HTMLImageElement | null)[] = [];
      for (const pUrl of activePhotos) {
        const loaded = await loadImageHelper(pUrl);
        loadedImages.push(loaded);
      }

      // Preload recorded live video elements
      const videoElementsP1: Record<number, HTMLVideoElement> = {};
      const videoElementsP2: Record<number, HTMLVideoElement> = {};

      for (let i = 0; i < totalPhotosLimit; i++) {
        const p1Url = recordedClipsP1[i];
        if (p1Url) {
          const v = document.createElement("video");
          v.src = p1Url;
          v.muted = true;
          v.playsInline = true;
          v.crossOrigin = "anonymous";
          v.load();
          videoElementsP1[i] = v;
        }

        const p2Url = recordedClipsP2[i];
        if (p2Url) {
          const v = document.createElement("video");
          v.src = p2Url;
          v.muted = true;
          v.playsInline = true;
          v.crossOrigin = "anonymous";
          v.load();
          videoElementsP2[i] = v;
        }
      }

      const videoCanvas = document.createElement("canvas");
      videoCanvas.width = 640;
      videoCanvas.height = 480;
      const ctx = videoCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context not supported");

      setVideoProgress(30);
      setVideoPhase("Inisialisasi Perekaman...");

      const stream = videoCanvas.captureStream(30);
      
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          try {
            stream.addTrack(track);
          } catch (e) {
            console.warn("Failed to add audio track:", e);
          }
        });
      }

      let options = { mimeType: "video/mp4;codecs=h264" };
      if (typeof MediaRecorder !== "undefined") {
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm;codecs=vp9" };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm" };
        }
      }

      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: options.mimeType });
        const videoUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `DualBooth-LivePhoto-${room.roomId}.mp4`;
        link.href = videoUrl;
        link.click();
        
        setIsVideoGenerating(false);
        setVideoProgress(100);
      };

      mediaRecorder.start();

      let currentFrame = 0;
      const framesPerPhoto = 90; // 3 seconds
      const totalFrames = totalPhotosLimit * framesPerPhoto;

      const executeFrame = async () => {
        if (currentFrame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }

        const photoIndex = Math.floor(currentFrame / framesPerPhoto);
        const localIndex = currentFrame % framesPerPhoto;

        const vidP1 = videoElementsP1[photoIndex];
        const vidP2 = videoElementsP2[photoIndex];

        const timeToSeek = localIndex / 30;
        if (vidP1) {
          try {
            vidP1.currentTime = timeToSeek;
          } catch (e) {}
        }
        if (vidP2) {
          try {
            vidP2.currentTime = timeToSeek;
          } catch (e) {}
        }

        // Await a brief frame delay for HTML5 video elements to sync
        await new Promise(resolve => setTimeout(resolve, 15));

        // Clear canvas
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 640, 480);

        const isOnlineDual = room.boothMode !== "solo" && (vidP1 || vidP2);

        if (isOnlineDual) {
          // Left side (Peer 1) - mirrored horizontally!
          if (vidP1) {
            ctx.save();
            ctx.translate(320, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(vidP1, 0, 0, 320, 480);
            ctx.restore();
          } else {
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(0, 0, 320, 480);
          }

          // Right side (Peer 2) - mirrored horizontally!
          if (vidP2) {
            ctx.save();
            ctx.translate(640, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(vidP2, 0, 0, 320, 480);
            ctx.restore();
          } else {
            ctx.fillStyle = "#334155";
            ctx.fillRect(320, 0, 320, 480);
          }
        } else {
          // Solo mode - mirrored horizontally!
          const activeVid = vidP1 || vidP2;
          if (activeVid) {
            ctx.save();
            ctx.translate(640, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(activeVid, 0, 0, 640, 480);
            ctx.restore();
          } else {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, 640, 480);
          }
        }

        currentFrame++;
        setVideoProgress(Math.floor((currentFrame / totalFrames) * 100));
        setVideoPhase(`Merender Video: ${Math.floor((currentFrame / totalFrames) * 100)}%`);

        setTimeout(executeFrame, 33);
      };

      // Start the recursive execution loop
      executeFrame();

    } catch (err) {
      console.error("Video Generation Error:", err);
      setIsVideoGenerating(false);
      alert("Gagal membuat video MP4: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const getTemplateBadgeStyle = (t: string) => {
    if (room?.stripTemplate === t) {
      return "bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-105 border-transparent";
    }
    return "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200";
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 py-12 text-center bg-[#FAF9F5] text-zinc-900">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold mb-2">Error Sesi</h2>
        <p className="text-zinc-500 text-sm max-w-xs mb-6 leading-relaxed">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  // Get active peer statuses
  const getPeerStatusLabel = (p: Peer | null | undefined) => {
    if (!p) return "Offline";
    if (p.status === "selecting_frame") return "Memilih Frame";
    if (p.status === "taking_photo") return "Mengambil Foto 📸";
    if (p.status === "editing") return "Mengedit...";
    if (p.status === "done") return "Selesai ✨";
    return "Online";
  };

  const activeFrameConfig = allFrameStyles.find(f => f.id === editState.frame) || allFrameStyles[0] || FRAME_STYLES[0];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-b from-[#FAF9F5] to-[#F3F2EC] text-zinc-900 font-sans">
      {/* Flash Effect */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Printing Machine Animation Modal */}
      <AnimatePresence>
        {isPrinting && (
          <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-200 rounded-2xl p-6 md:p-8 max-w-md w-full text-center space-y-6 relative overflow-hidden shadow-xl"
            >
              {/* Virtual Machine Graphic */}
              <div className="relative w-48 h-64 mx-auto bg-zinc-100 rounded-t-3xl border-4 border-zinc-200 flex flex-col justify-between p-4 shadow-inner">
                {/* Neon print label */}
                <div className="bg-zinc-900 text-white font-mono text-[9px] font-bold py-1 px-2 rounded-full tracking-wider uppercase">
                  PRINTING ACTIVE
                </div>

                {/* Simulated Lens */}
                <div className="w-16 h-16 rounded-full bg-zinc-200 border-4 border-zinc-300 mx-auto flex items-center justify-center relative shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-zinc-900/10 border border-zinc-900/20 animate-ping" />
                  <div className="absolute w-3 h-3 rounded-full bg-emerald-500 top-3 right-3" />
                </div>

                {/* Dispenser slot with printed strip sticking out */}
                <div className="w-full h-8 bg-zinc-900 border-2 border-zinc-950 rounded-md relative overflow-hidden flex justify-center">
                  <motion.div
                    initial={{ y: -60 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 4.0, ease: "linear" }}
                    className="w-16 h-24 bg-white border border-zinc-350 rounded-sm shadow-md flex flex-col gap-1 p-1"
                  >
                    <div className="w-full h-4 bg-zinc-200 rounded-xs" />
                    <div className="w-full h-4 bg-zinc-200 rounded-xs" />
                    <div className="w-full h-4 bg-zinc-200 rounded-xs" />
                    <div className="w-full h-4 bg-zinc-200 rounded-xs" />
                  </motion.div>
                </div>
              </div>

              {/* Progress Detail */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{printPhase}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">Mohon tunggu sebentar, mesin sedang mencetak photostrip Anda...</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden border border-zinc-200">
                <motion.div
                  className="bg-zinc-900 h-full rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${printProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <span className="text-[10px] text-zinc-400 font-mono font-bold tracking-wider block">PROGRESS: {printProgress}%</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Generation Machine Animation Modal */}
      <AnimatePresence>
        {isVideoGenerating && (
          <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-200 rounded-2xl p-6 md:p-8 max-w-md w-full text-center space-y-6 relative overflow-hidden shadow-xl"
            >
              {/* Virtual Film Strip / Camera Graphic */}
              <div className="relative w-48 h-64 mx-auto bg-zinc-100 rounded-2xl border-4 border-zinc-200 flex flex-col justify-between p-4 shadow-inner overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-6 bg-zinc-900 text-white font-mono text-[9px] font-bold py-0.5 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                  REC VIDEO ACTIVE
                </div>

                {/* Simulated Lens */}
                <div className="w-20 h-20 rounded-full bg-zinc-200 border-4 border-zinc-300 mx-auto mt-4 flex items-center justify-center relative shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-zinc-900/5 border border-zinc-900/10 animate-pulse" />
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-rose-500 top-3 right-3 animate-ping" />
                </div>

                {/* Video play timeline indicator */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-400">
                    <span>00:00</span>
                    <span>00:14</span>
                  </div>
                  <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
                    <motion.div
                      className="bg-zinc-900 h-full"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Progress Detail */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{videoPhase}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">Membuat MP4 video stop-motion dari 4 foto Anda...</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden border border-zinc-200">
                <motion.div
                  className="bg-zinc-900 h-full rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${videoProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              <span className="text-[10px] text-zinc-400 font-mono font-bold tracking-wider block">PROSES: {videoProgress}%</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Bar Header */}
      <header className="border-b border-zinc-200 bg-white/85 backdrop-blur-md px-4 py-3 md:px-6 flex flex-col sm:flex-row gap-3 items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-all border border-zinc-200 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-extrabold text-base flex items-center gap-2 text-zinc-900">
              <Camera className="w-4 h-4 text-zinc-900" />
              <span>DualBooth Studio</span>
            </h1>
          </div>
        </div>

        {/* Real-time Peer Connection Indicators */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="bg-zinc-50 border border-zinc-200 px-3.5 py-1.5 rounded-xl flex items-center gap-4 text-xs font-semibold shadow-xs">
            <span className="flex items-center gap-2 text-zinc-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Kamu: <span className="text-zinc-900">Editing</span>
            </span>
            {room?.peer2 && (
              <span className="flex items-center gap-2 border-l border-zinc-200 pl-4 text-zinc-600">
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
                {isPeer1 ? room.peer2.name : room.peer1?.name}: <span className="text-zinc-900 font-bold">{getPeerStatusLabel(isPeer1 ? room.peer2 : room.peer1)}</span>
              </span>
            )}
          </div>

          <div className="bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xs">
            <span className="text-[9px] font-black text-zinc-400 tracking-wider">KODE:</span>
            <span className="text-xs font-bold text-zinc-900 tracking-widest">{room?.roomId}</span>
            <button
              onClick={copyRoomCode}
              className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch overflow-y-auto">
        {room?.status !== "completed" ? (
          <>
            {/* LOBBY / TAKING PHOTO VIEW */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className={`grid gap-4 ${room?.boothMode === "solo" ? "grid-cols-1 max-w-2xl mx-auto w-full" : "grid-cols-1 sm:grid-cols-2"}`}>
                {/* Peer 1 Camera Feed */}
                <div className="relative aspect-video rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden shadow-xs flex flex-col items-center justify-center">
                  <video
                    ref={isPeer1 ? localVideoRef : remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={isPeer1}
                    className="w-full h-full object-cover -scale-x-100"
                  />
                  {/* Corner Countdown Overlay */}
                  {room?.status === "countdown" && (
                    <div className="absolute top-4 left-4 z-30 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg text-white font-mono font-black text-xs flex items-center gap-1.5 animate-bounce">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span>{countdownVal ?? room.countdown}s</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-zinc-200/50 shadow-xs z-20">
                    <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {room?.peer1?.name || "Menunggu..."}
                    </span>
                    <span className="text-[9px] bg-zinc-150 px-2 py-0.5 rounded text-zinc-500 font-bold uppercase tracking-wider">PEER 1 {room?.boothMode === "solo" && "(SOLO)"}</span>
                  </div>
                  {!room?.peer1 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-2 bg-zinc-50">
                      <Users className="w-8 h-8 animate-pulse text-zinc-300" />
                      <span className="text-xs font-medium">Menghubungkan...</span>
                    </div>
                  )}

                  {/* Picture-in-picture pose guide overlay */}
                  {room?.status === "countdown" && (room?.challengeMode || "meme") === "meme" && activePose && (
                    <div className="absolute top-4 right-4 z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-white shadow-md bg-white animate-fade-in">
                      <img src={activePose.imageUrl} className="w-full h-full object-cover" alt="Pose Acuan" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5 uppercase tracking-wider">
                        Tantangan {currentPhotoCount + 1}
                      </div>
                    </div>
                  )}
                </div>

                {/* Peer 2 Camera Feed */}
                {room?.boothMode !== "solo" && (
                  <div className="relative aspect-video rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden shadow-xs flex flex-col items-center justify-center">
                    <video
                      ref={isPeer1 ? remoteVideoRef : localVideoRef}
                      autoPlay
                      playsInline
                      muted={!isPeer1}
                      className="w-full h-full object-cover -scale-x-100"
                    />
                    {/* Corner Countdown Overlay */}
                    {room?.status === "countdown" && (
                      <div className="absolute top-4 left-4 z-30 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg text-white font-mono font-black text-xs flex items-center gap-1.5 animate-bounce">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        <span>{countdownVal ?? room.countdown}s</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-zinc-200/50 shadow-xs z-20">
                      <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
                        {room?.peer2?.name || "Menunggu..."}
                      </span>
                      <span className="text-[9px] bg-zinc-150 px-2 py-0.5 rounded text-zinc-500 font-bold uppercase tracking-wider">PEER 2</span>
                    </div>
                    {!room?.peer2 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-3 text-center px-4 bg-zinc-50">
                        <Users className="w-8 h-8 animate-bounce text-zinc-300" />
                        <div>
                          <p className="text-xs font-semibold text-zinc-700">Menunggu teman bergabung...</p>
                          <p className="text-[10px] text-zinc-400 mt-1 max-w-xs leading-relaxed">Bagikan kode ruang di atas agar mereka bisa bergabung.</p>
                        </div>
                      </div>
                    )}

                    {/* Picture-in-picture pose guide overlay for Peer 2 */}
                    {room?.status === "countdown" && (room?.challengeMode || "meme") === "meme" && activePose && (
                      <div className="absolute top-4 right-4 z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-white shadow-md bg-white animate-fade-in">
                        <img src={activePose.imageUrl} className="w-full h-full object-cover" alt="Pose Acuan" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5 uppercase tracking-wider">
                          Tantangan {currentPhotoCount + 1}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress captured indicators */}
              {((room?.photos1?.length || 0) > 0 || (room?.photos2?.length || 0) > 0) && (
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 md:p-6 shadow-xs">
                  <h3 className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-4">HASIL AMBILAN FOTO (4 FRAME)</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map((idx) => {
                      const photo1 = room?.photos1[idx];
                      const photo2 = room?.photos2[idx];
                      return (
                        <div key={idx} className="aspect-video bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden relative flex items-center justify-center group shadow-xs">
                          {room?.boothMode !== "solo" && photo1 && photo2 ? (
                            <div className="w-full h-full flex divide-x divide-white/40">
                              <img src={photo1} className="w-1/2 h-full object-cover" alt="P1" />
                              <img src={photo2} className="w-1/2 h-full object-cover" alt="P2" />
                            </div>
                          ) : photo1 ? (
                            <img src={photo1} className="w-full h-full object-cover" alt="Captured" />
                          ) : photo2 ? (
                            <img src={photo2} className="w-full h-full object-cover" alt="Captured" />
                          ) : (
                            <span className="text-xs font-bold text-zinc-300">{idx + 1}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Control lobby */}
            <div className="lg:col-span-4 flex flex-col">
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between gap-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-extrabold text-zinc-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-zinc-900" />
                      Lobi Booth
                    </h2>
                    <p className="text-zinc-500 text-xs mt-1 leading-relaxed">Pilih preferensi mode sesi Anda di bawah ini sebelum memulai pemotretan.</p>
                  </div>

                  {/* Booth Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Mode Sesi Photobooth</label>
                    {isPeer1 ? (
                      <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                        <button
                          type="button"
                          onClick={() => toggleBoothMode("solo")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            (room?.boothMode || "online") === "solo"
                              ? "bg-white text-zinc-900 shadow-xs"
                              : "text-zinc-500 hover:text-zinc-900"
                          }`}
                        >
                          Solo (Sendiri)
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBoothMode("online")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            (room?.boothMode || "online") === "online"
                              ? "bg-white text-zinc-900 shadow-xs"
                              : "text-zinc-500 hover:text-zinc-900"
                          }`}
                        >
                          Online Dual
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 flex justify-between items-center">
                        <span>Mode Sesi:</span>
                        <span className="bg-zinc-100 text-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-250 font-bold">
                          {(room?.boothMode || "online") === "solo" ? "Solo (Sendiri)" : "Online Dual (Split)"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Challenge Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Mode Gaya & Panduan</label>
                    {isPeer1 ? (
                      <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                        <button
                          type="button"
                          onClick={() => toggleChallengeMode("meme")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            (room?.challengeMode || "meme") === "meme"
                              ? "bg-white text-zinc-900 shadow-xs"
                              : "text-zinc-500 hover:text-zinc-900"
                          }`}
                        >
                          Pose Meme
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleChallengeMode("freestyle")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            (room?.challengeMode || "meme") === "freestyle"
                              ? "bg-white text-zinc-900 shadow-xs"
                              : "text-zinc-500 hover:text-zinc-900"
                          }`}
                        >
                          Gaya Bebas
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 flex justify-between items-center">
                        <span>Panduan Sesi:</span>
                        <span className="bg-zinc-100 text-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-250 font-bold">
                          {(room?.challengeMode || "meme") === "meme" ? "Pose Meme" : "Gaya Bebas"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  {room?.status === "countdown" ? (
                    <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-4 flex flex-col items-center justify-center relative overflow-hidden">
                      <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        Sedang Mengambil Foto ({currentPhotoCount + 1}/{allFrameStyles.find(f => f.id === editState.frame)?.slots?.length || 4})
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={startPhotobooth}
                      disabled={room?.boothMode !== "solo" && !room?.peer2}
                      className="w-full bg-zinc-900 text-white font-semibold py-3.5 px-6 rounded-xl shadow-xs hover:bg-zinc-850 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-4 h-4" />
                      Mulai Foto Bersama
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* COMPLETION / ADVANCED COOPERATIVE STUDIO EDITOR VIEW */
          <>
            {/* LEFT / CENTER COLUMN - PHOTOTRIP CANVAS LIVE PREVIEW */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center p-2 relative">
              {/* Layout bounds container mapped carefully */}
              <div className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase mb-4 flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3.5 py-1.5 rounded-full shadow-sm">
                <Eye className="w-3.5 h-3.5 text-zinc-600" />
                <span>Pratinjau Hasil Desain</span>
              </div>

              {/* STYLED LIVE PREVIEW FRAME - RESPONSIVE CONTAINER */}
              <div className="w-full overflow-x-auto scrollbar-none flex justify-center py-2 px-1">
                <div
                  id="photostrip-live-preview"
                  className={`relative shadow-lg transition-all duration-300 select-none overflow-hidden max-w-full ${
                    editState.borderShadow ? "shadow-black/25" : ""
                  } ${
                    editState.backgroundType === "tekstur-kertas" ? "bg-paper bg-grain" : ""
                  } ${
                    editState.backgroundType === "tekstur-film" ? "vintage-overlay bg-grain" : ""
                  }`}
                  style={{
                    backgroundColor: editState.backgroundType === "warna-polos" ? editState.backgroundColor : undefined,
                    backgroundImage: editState.frameImage
                      ? `url(${editState.frameImage})`
                      : (editState.backgroundType === "gradient-lembut"
                          ? editState.backgroundGradient
                          : (activeFrameConfig?.frameBackgroundImageUrl ? `url(${activeFrameConfig.frameBackgroundImageUrl})` : undefined)),
                    backgroundSize: "cover",
                    padding: `${editState.borderThickness}px`,
                    borderRadius: `${editState.borderRadius}px`,
                    width: editState.layout === "2x2" ? "420px" : editState.layout === "polaroid" ? "380px" : "320px",
                    maxWidth: "100%",
                    border: editState.outerBorder ? `2px solid ${editState.borderColor}` : undefined
                  }}
                >
                  {/* Custom frame PNG transparent design overlay */}
                  {activeFrameConfig?.frameOverlayImageUrl && (
                    <img
                      src={activeFrameConfig.frameOverlayImageUrl}
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none z-30"
                      alt="Frame Overlay"
                    />
                  )}
                  {/* Cinema perforations decoration */}
                  {editState.frame === "cinema" && (
                    <div className="absolute left-1.5 top-0 bottom-0 w-3 flex flex-col justify-around py-4 pointer-events-none">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="w-2.5 h-4 bg-zinc-950 rounded-sm border border-neutral-800" />
                      ))}
                    </div>
                  )}
                  {editState.frame === "cinema" && (
                    <div className="absolute right-1.5 top-0 bottom-0 w-3 flex flex-col justify-around py-4 pointer-events-none">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="w-2.5 h-4 bg-zinc-950 rounded-sm border border-neutral-800" />
                      ))}
                    </div>
                  )}

                  {/* Main Photos Layout */}
                  <div
                    className={`grid gap-3 ${
                      editState.layout === "2x2" ? "grid-cols-2" :
                      editState.layout === "horizontal" ? "grid-cols-4" :
                      editState.layout === "square-grid" ? "grid-cols-2" : "grid-cols-1"
                    }`}
                    style={{
                      paddingLeft: editState.frame === "cinema" ? "14px" : "0px",
                      paddingRight: editState.frame === "cinema" ? "14px" : "0px",
                    }}
                  >
                    {(editState.layout === "polaroid" ? [0] : [0, 1, 2, 3]).map((idx) => {
                      const p1 = room?.photos1[idx];
                      const p2 = room?.photos2[idx];
                      const imgSrc = p1 || p2;
                      const isOnlineDual = room?.boothMode !== "solo" && !!room?.peer2;

                      const activeFilterCss = FILTER_PRESETS.find(f => f.id === editState.filter)?.css || "";
                      const clipUrl = recordedClipsP1[idx] || recordedClipsP2[idx];

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredPhotoIdx(idx)}
                          onMouseLeave={() => setHoveredPhotoIdx(null)}
                          className={`relative overflow-hidden aspect-[4/3] rounded-lg bg-zinc-100 transition-all ${
                            editState.innerBorder ? "border border-white/20" : ""
                          }`}
                          style={{
                            aspectRatio: editState.layout === "square-grid" ? "1/1" : undefined
                          }}
                        >
                          {isOnlineDual ? (
                            <div className="w-full h-full flex divide-x divide-white/40">
                              <div className="w-1/2 h-full relative overflow-hidden bg-zinc-50">
                                {hoveredPhotoIdx === idx && recordedClipsP1[idx] ? (
                                  <video
                                    src={recordedClipsP1[idx]}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover select-none"
                                    style={{
                                      filter: `${activeFilterCss} brightness(${editState.sliders.brightness}%) contrast(${editState.sliders.contrast}%) saturate(${editState.sliders.saturation}%) blur(${editState.sliders.blur}px)`,
                                      transform: "scaleX(-1)"
                                    }}
                                  />
                                ) : p1 ? (
                                  <img
                                    src={p1}
                                    className="w-full h-full object-cover select-none"
                                    style={{
                                      filter: `${activeFilterCss} brightness(${editState.sliders.brightness}%) contrast(${editState.sliders.contrast}%) saturate(${editState.sliders.saturation}%) blur(${editState.sliders.blur}px)`
                                    }}
                                    alt="Preview P1"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-300 text-[8px] font-bold">
                                    P1
                                  </div>
                                )}
                              </div>
                              <div className="w-1/2 h-full relative overflow-hidden bg-zinc-100">
                                {hoveredPhotoIdx === idx && recordedClipsP2[idx] ? (
                                  <video
                                    src={recordedClipsP2[idx]}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover select-none"
                                    style={{
                                      filter: `${activeFilterCss} brightness(${editState.sliders.brightness}%) contrast(${editState.sliders.contrast}%) saturate(${editState.sliders.saturation}%) blur(${editState.sliders.blur}px)`,
                                      transform: "scaleX(-1)"
                                    }}
                                  />
                                ) : p2 ? (
                                  <img
                                    src={p2}
                                    className="w-full h-full object-cover select-none"
                                    style={{
                                      filter: `${activeFilterCss} brightness(${editState.sliders.brightness}%) contrast(${editState.sliders.contrast}%) saturate(${editState.sliders.saturation}%) blur(${editState.sliders.blur}px)`
                                    }}
                                    alt="Preview P2"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-300 text-[8px] font-bold">
                                    P2
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            hoveredPhotoIdx === idx && clipUrl ? (
                              <video
                                src={clipUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover select-none"
                                style={{
                                  filter: `${activeFilterCss} brightness(${editState.sliders.brightness}%) contrast(${editState.sliders.contrast}%) saturate(${editState.sliders.saturation}%) blur(${editState.sliders.blur}px)`,
                                  transform: "scaleX(-1)"
                                }}
                              />
                            ) : imgSrc ? (
                              <img
                                src={imgSrc}
                                className="w-full h-full object-cover select-none"
                                style={{
                                  filter: `${activeFilterCss} brightness(${editState.sliders.brightness}%) contrast(${editState.sliders.contrast}%) saturate(${editState.sliders.saturation}%) blur(${editState.sliders.blur}px)`
                                }}
                                alt="Preview"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-300 text-[10px] font-bold bg-zinc-50">
                                FOTO {idx + 1}
                              </div>
                            )
                          )}

                          {/* Timestamp overlay (Disposable Camera theme) */}
                          {editState.frame === "disposable" && (
                            <div className="absolute bottom-2 right-2 font-mono text-[10px] text-orange-500 font-bold drop-shadow tracking-widest">
                              &apos;26 07 10
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Polaroid Extra Space Bottom */}
                  {editState.layout === "polaroid" && (
                    <div className="h-20" />
                  )}

                  {/* INTERACTIVE FLOATING STICKERS & TEXTS LAYER */}
                  <div className="absolute inset-0 pointer-events-none">
                    {editState.stickers.map((stk) => {
                      const isSelected = selectedElementId === stk.id;
                      return (
                        <div
                          key={stk.id}
                          onPointerDown={(e) => handlePointerDown(e, stk.id, "sticker")}
                          className={`absolute pointer-events-auto cursor-move select-none ${
                            isSelected ? "outline-2 outline-dashed outline-zinc-900" : ""
                          }`}
                          style={{
                            left: `${stk.x}%`,
                            top: `${stk.y}%`,
                            transform: `translate(-50%, -50%) rotate(${stk.rotation}deg) scale(${stk.scale})`,
                            zIndex: stk.zIndex
                          }}
                        >
                          {stk.char.startsWith("http") || stk.char.startsWith("/") || stk.char.includes(".") ? (
                            <img src={stk.char} className="w-12 h-12 object-contain pointer-events-none select-none" alt="Sticker" />
                          ) : (
                            <span className="text-4xl block">{stk.char}</span>
                          )}
                        </div>
                      );
                    })}

                    {/* INTERACTIVE FLOATING TEXT LAYER */}
                    {editState.texts.map((t) => {
                      const isSelected = selectedElementId === t.id;
                      const fontOpt = FONT_OPTIONS.find(f => f.id === t.font);
                      return (
                        <div
                          key={t.id}
                          onPointerDown={(e) => handlePointerDown(e, t.id, "text")}
                          className={`absolute pointer-events-auto cursor-move select-none p-1 text-center whitespace-nowrap ${
                            isSelected ? "outline-2 outline-dashed outline-zinc-900" : ""
                          } ${fontOpt?.className || "font-sans"}`}
                          style={{
                            left: `${t.x}%`,
                            top: `${t.y}%`,
                            transform: `translate(-50%, -50%) rotate(${t.rotation}deg)`,
                            fontSize: `${t.size}px`,
                            color: t.color,
                            opacity: t.opacity / 100,
                            textShadow: t.shadow ? "2px 2px 4px rgba(0,0,0,0.3)" : undefined,
                            WebkitTextStroke: t.outline ? "1px #ffffff" : undefined,
                            zIndex: 50
                          }}
                        >
                          {t.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Simple Action buttons on currently selected sticker or text */}
              {selectedElementId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex flex-wrap items-center gap-3 bg-white border border-zinc-200 p-2.5 rounded-xl shadow-xs"
                >
                  <span className="text-xs text-zinc-400 font-bold">Aksi Elemen:</span>
                  <button
                    onClick={handleDuplicateSelected}
                    className="p-1.5 px-3 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs flex items-center gap-1.5 transition-all font-semibold border border-zinc-200/60"
                  >
                    Duplikat
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="p-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs flex items-center gap-1.5 transition-all font-semibold border border-rose-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                  <div className="h-4 w-px bg-zinc-200 hidden sm:block" />
                  {selectedElementType === "sticker" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Skala:</span>
                      <input
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.1"
                        value={editState.stickers.find(s => s.id === selectedElementId)?.scale || 1.0}
                        onChange={(e) => updateSelectedElement("scale", parseFloat(e.target.value))}
                        className="w-16 accent-zinc-900 h-1 rounded bg-zinc-200"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Ukuran:</span>
                      <input
                        type="range"
                        min="10"
                        max="36"
                        step="1"
                        value={editState.texts.find(t => t.id === selectedElementId)?.size || 16}
                        onChange={(e) => updateSelectedElement("size", parseInt(e.target.value))}
                        className="w-16 accent-zinc-900 h-1 rounded bg-zinc-200"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Rotasi:</span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      value={(selectedElementType === "sticker" ? editState.stickers.find(s => s.id === selectedElementId)?.rotation : editState.texts.find(t => t.id === selectedElementId)?.rotation) || 0}
                      onChange={(e) => updateSelectedElement("rotation", parseInt(e.target.value))}
                      className="w-16 accent-zinc-900 h-1 rounded bg-zinc-200"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* RIGHT SIDEBAR - DETAILED STEP-BY-STEP CONTROL PANELS */}
            <div className="lg:col-span-6 flex flex-col bg-white border border-zinc-200 rounded-2xl p-5 md:p-6 shadow-xs relative overflow-hidden">
              
              {/* Wizard Step Progress Tracker */}
              <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 text-white font-mono text-xs font-bold">
                    {editWizardStep === "frame" ? "1" : editWizardStep === "color" ? "2" : editWizardStep === "filter" ? "3" : "4"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 capitalize">
                      Langkah: {editWizardStep === "frame" ? "Pilih Template Frame" : editWizardStep === "color" ? "Pilih Warna Solid" : editWizardStep === "filter" ? "Pilih Filter" : "Pratinjau & Cetak"}
                    </h3>
                    <p className="text-[10px] text-zinc-400">Pilih satu opsi lalu tekan lanjut</p>
                  </div>
                </div>
                
                {/* Horizontal progress dots */}
                <div className="flex gap-1.5">
                  {(["frame", "color", "filter", "preview"] as const).map((s) => (
                    <div
                      key={s}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        editWizardStep === s ? "w-6 bg-zinc-950" : "w-1.5 bg-zinc-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* STEP 1: FRAME & LAYOUT SELECTION */}
              {editWizardStep === "frame" && (
                <div className="space-y-6 flex-1 overflow-y-auto scrollbar-none pr-1 animate-fade-in">
                  
                  {/* Custom Frame Image Upload */}
                  <div className="space-y-3 bg-rose-50/50 p-4 rounded-xl border border-rose-100/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase block">Gunakan Frame Gambar Sendiri</label>
                      {editState.frameImage && (
                        <button
                          onClick={() => {
                            const nextState = { ...editState, frameImage: "" };
                            setEditState(nextState);
                            syncEditStateToFirebase(nextState);
                          }}
                          className="text-[9px] font-bold text-rose-500 hover:underline"
                        >
                          Hapus Gambar
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 hover:border-zinc-300 transition-all rounded-xl p-4 bg-white cursor-pointer relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const result = event.target?.result as string;
                              const nextState = { ...editState, frameImage: result };
                              setEditState(nextState);
                              syncEditStateToFirebase(nextState);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {editState.frameImage ? (
                        <div className="flex items-center gap-3 w-full">
                          <img
                            src={editState.frameImage}
                            className="w-12 h-16 object-cover rounded-lg border border-zinc-200"
                            alt="Custom frame"
                          />
                          <div className="flex-1 text-left">
                            <p className="text-[10px] font-bold text-zinc-700">Frame Gambar Berhasil Dimuat</p>
                            <p className="text-[9px] text-zinc-400">Gambar kustom Anda akan menimpa seluruh background photostrip.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <Upload className="w-5 h-5 text-zinc-400 mx-auto mb-2" />
                          <p className="text-[10px] font-bold text-zinc-700">Klik / Seret Gambar Frame Anda</p>
                          <p className="text-[9px] text-zinc-400 mt-1">Unggah file PNG transparan untuk frame estetik kustom.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Frame Selectors */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Desain Frame Visual</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {allFrameStyles.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => {
                            const nextState = {
                              ...editState,
                              frame: style.id,
                              ...(style.bgColor ? { backgroundColor: style.bgColor, backgroundType: "warna-polos" } : {})
                            };
                            setEditState(nextState);
                            syncEditStateToFirebase(nextState);
                          }}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            editState.frame === style.id
                              ? "bg-zinc-900 border-zinc-900 text-white shadow-xs"
                              : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                          }`}
                        >
                          <div>
                            <h4 className="text-xs font-bold leading-none">{style.name}</h4>
                            <p className="text-[9px] text-zinc-400 mt-1.5 leading-relaxed">{style.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border controls sliders */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4">
                    <h4 className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Pengaturan Detail Border</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1.5 text-zinc-700">
                          <span>Ketebalan Frame</span>
                          <span>{editState.borderThickness}px</span>
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="28"
                          value={editState.borderThickness}
                          onChange={(e) => {
                            const nextState = { ...editState, borderThickness: parseInt(e.target.value) };
                            setEditState(nextState);
                            syncEditStateToFirebase(nextState);
                          }}
                          className="w-full accent-zinc-900 h-1 bg-zinc-200 rounded"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1.5 text-zinc-700">
                          <span>Sudut Membulat (Radius)</span>
                          <span>{editState.borderRadius}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="24"
                          value={editState.borderRadius}
                          onChange={(e) => {
                            const nextState = { ...editState, borderRadius: parseInt(e.target.value) };
                            setEditState(nextState);
                            syncEditStateToFirebase(nextState);
                          }}
                          className="w-full accent-zinc-900 h-1 bg-zinc-200 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SOLID COLORS SELECTION */}
              {editWizardStep === "color" && (
                <div className="space-y-6 flex-1 overflow-y-auto scrollbar-none pr-1 animate-fade-in">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Pilihan Warna Solid Latar</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {allSolidColors.map((scSc) => (
                        <button
                          key={scSc.id}
                          onClick={() => {
                            const nextState = {
                              ...editState,
                              backgroundType: "warna-polos",
                              backgroundColor: scSc.value
                            };
                            setEditState(nextState);
                            syncEditStateToFirebase(nextState);
                          }}
                          className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                            editState.backgroundType === "warna-polos" && editState.backgroundColor.toLowerCase() === scSc.value.toLowerCase()
                              ? "bg-zinc-900 border-zinc-900 text-white shadow-md scale-[1.02]"
                              : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-full border border-zinc-300 shadow-xs"
                            style={{ backgroundColor: scSc.value }}
                          />
                          <div className="text-center">
                            <span className="text-[11px] font-bold block truncate w-24">{scSc.name}</span>
                            <span className="text-[8px] font-mono text-zinc-400 block mt-0.5">{scSc.value.toUpperCase()}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual color picker */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Gunakan Warna Kustom Bebas</label>
                    <div className="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl p-3">
                      <input
                        type="color"
                        value={editState.backgroundColor}
                        onChange={(e) => {
                          const nextState = {
                            ...editState,
                            backgroundType: "warna-polos",
                            backgroundColor: e.target.value
                          };
                          setEditState(nextState);
                          syncEditStateToFirebase(nextState);
                        }}
                        className="w-10 h-10 bg-transparent border-0 cursor-pointer rounded-lg overflow-hidden"
                      />
                      <div>
                        <p className="text-xs font-bold text-zinc-800">Klik palet warna kustom</p>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">HEX: {editState.backgroundColor.toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: PHOTO FILTERS SELECTION */}
              {editWizardStep === "filter" && (
                <div className="space-y-6 flex-1 overflow-y-auto scrollbar-none pr-1 animate-fade-in">
                  
                  {/* Presets Grid */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Sentuhan Tone Filter Estetik</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {FILTER_PRESETS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            const nextState = { ...editState, filter: f.id };
                            setEditState(nextState);
                            syncEditStateToFirebase(nextState);
                          }}
                          className={`p-3.5 rounded-xl border text-center transition-all flex items-center justify-center cursor-pointer ${
                            editState.filter === f.id
                              ? "bg-zinc-900 border-zinc-900 text-white shadow-xs"
                              : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                          }`}
                        >
                          <span className="text-xs font-bold block">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Core sliders */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4">
                    <h4 className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Penyelarasan Warna Manual (Tuning)</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1 text-zinc-700">
                          <span>Brightness (Kecerahan)</span>
                          <span>{editState.sliders.brightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          value={editState.sliders.brightness}
                          onChange={(e) => {
                            const nextState = { ...editState, sliders: { ...editState.sliders, brightness: parseInt(e.target.value) } };
                            setEditState(nextState);
                            syncEditStateToFirebase(nextState);
                          }}
                          className="w-full accent-zinc-900 h-1 bg-zinc-200 rounded"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1 text-zinc-700">
                          <span>Contrast (Kontras)</span>
                          <span>{editState.sliders.contrast}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          value={editState.sliders.contrast}
                          onChange={(e) => {
                            const nextState = { ...editState, sliders: { ...editState.sliders, contrast: parseInt(e.target.value) } };
                            setEditState(nextState);
                            syncEditStateToFirebase(nextState);
                          }}
                          className="w-full accent-zinc-900 h-1 bg-zinc-200 rounded"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1 text-zinc-700">
                          <span>Saturation (Kepekatan)</span>
                          <span>{editState.sliders.saturation}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={editState.sliders.saturation}
                          onChange={(e) => {
                            const nextState = { ...editState, sliders: { ...editState.sliders, saturation: parseInt(e.target.value) } };
                            setEditState(nextState);
                            syncEditStateToFirebase(nextState);
                          }}
                          className="w-full accent-zinc-900 h-1 bg-zinc-200 rounded"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1 text-zinc-700">
                          <span>Blur Glow (Kelembutan)</span>
                          <span>{editState.sliders.blur}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="4"
                          step="0.2"
                          value={editState.sliders.blur}
                          onChange={(e) => {
                            const nextState = { ...editState, sliders: { ...editState.sliders, blur: parseFloat(e.target.value) } };
                            setEditState(nextState);
                            syncEditStateToFirebase(nextState);
                          }}
                          className="w-full accent-zinc-900 h-1 bg-zinc-200 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: PREVIEW & FINAL SAVE/PRINT EXPORTS */}
              {editWizardStep === "preview" && (
                <div className="space-y-6 flex-1 overflow-y-auto scrollbar-none pr-1 animate-fade-in">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase block">Simpan & Ekspor Hasil Karya</label>
                    
                    {/* Status Progress Penyiapan GIF */}
                    {isGifGenerating && (
                      <div className="p-4 bg-zinc-900 text-white rounded-xl space-y-2 animate-pulse">
                        <div className="flex justify-between text-xs font-bold">
                          <span>Sedang Membuat Animasi GIF...</span>
                          <span>{gifProgress}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${gifProgress}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2.5">
                      {/* Button 1: Download Gambar */}
                      <button
                        onClick={() => triggerPrintingFlow("png-2k")}
                        disabled={isPrinting || isGifGenerating || isVideoGenerating}
                        className="p-4 rounded-xl border border-zinc-200 hover:border-zinc-900 bg-zinc-50 hover:bg-zinc-100 text-left transition-all flex justify-between items-center group disabled:opacity-50 cursor-pointer"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800 group-hover:text-zinc-900 transition-colors uppercase">
                            Download Gambar (2R)
                          </h4>
                          <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">Simpan hasil foto strip tunggal dalam resolusi tinggi format PNG.</p>
                        </div>
                        <span className="text-[9px] bg-zinc-900 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider text-white font-mono shadow-xs">
                          PNG 2R
                        </span>
                      </button>

                      {/* Button: Cetak Foto (4R - Kertas Printer) */}
                      <button
                        onClick={() => triggerPrintingFlow("printable-4r")}
                        disabled={isPrinting || isGifGenerating || isVideoGenerating}
                        className="p-4 rounded-xl border border-zinc-200 hover:border-zinc-900 bg-zinc-50 hover:bg-zinc-100 text-left transition-all flex justify-between items-center group disabled:opacity-50 cursor-pointer"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800 group-hover:text-zinc-900 transition-colors uppercase">
                            Cetak Foto (4R - Kertas Printer)
                          </h4>
                          <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">Kombinasikan dua lembar strip 2R berdampingan dalam satu kertas cetak foto ukuran 4R siap potong di tengah.</p>
                        </div>
                        <span className="text-[9px] bg-indigo-600 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider text-white font-mono shadow-xs">
                          4R PNG
                        </span>
                      </button>

                      {/* Button 2: GIF Gambar */}
                      <button
                        onClick={compileAndSaveGif}
                        disabled={isPrinting || isGifGenerating || isVideoGenerating}
                        className="p-4 rounded-xl border border-zinc-200 hover:border-zinc-900 bg-zinc-50 hover:bg-zinc-100 text-left transition-all flex justify-between items-center group disabled:opacity-50 cursor-pointer"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800 group-hover:text-zinc-900 transition-colors uppercase">
                            GIF Gambar Animasi
                          </h4>
                          <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">Simpan animasi stop-motion berulang dari seluruh pose foto Anda.</p>
                        </div>
                        <span className="text-[9px] bg-zinc-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider text-zinc-600 font-mono shadow-xs">
                          GIF
                        </span>
                      </button>

                      {/* Button 3: Live Photo (Video MP4) */}
                      <button
                        onClick={compileAndSaveVideo}
                        disabled={isPrinting || isGifGenerating || isVideoGenerating}
                        className="p-4 rounded-xl border border-zinc-200 hover:border-zinc-900 bg-zinc-50 hover:bg-zinc-100 text-left transition-all flex justify-between items-center group disabled:opacity-50 cursor-pointer"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800 group-hover:text-zinc-900 transition-colors uppercase">
                            Live Photo MP4
                          </h4>
                          <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">Simpan rekaman video live photo murni stop-motion estetik seperti yang muncul saat kursor diarahkan ke foto.</p>
                        </div>
                        <span className="text-[9px] bg-rose-100 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider text-rose-600 font-mono shadow-xs">
                          MP4
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Reset booth option */}
                  <div className="pt-3 border-t border-zinc-200 flex gap-3">
                    <button
                      onClick={startPhotobooth}
                      className="flex-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-750 font-bold py-3.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Mulai Sesi Baru (Reset)
                    </button>
                  </div>
                </div>
              )}

              {/* STRICT COMPREHENSIVE STEPS FOOTER CONTROLLER */}
              <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (editWizardStep === "preview") setEditWizardStep("filter");
                    else if (editWizardStep === "filter") setEditWizardStep("color");
                    else if (editWizardStep === "color") setEditWizardStep("frame");
                  }}
                  disabled={editWizardStep === "frame"}
                  className="px-5 py-3 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-zinc-600 text-xs font-bold tracking-tight disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  Kembali
                </button>
                
                <button
                  onClick={() => {
                    if (editWizardStep === "frame") setEditWizardStep("color");
                    else if (editWizardStep === "color") setEditWizardStep("filter");
                    else if (editWizardStep === "filter") setEditWizardStep("preview");
                  }}
                  disabled={editWizardStep === "preview"}
                  className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold tracking-tight disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  Lanjut
                </button>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}
