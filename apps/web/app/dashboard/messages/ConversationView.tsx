"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";

type ChatMessage = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  replyToId?: string | null;
  replyTo?: { id: string; body: string; senderId: string; deletedAt?: string | null } | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
};

type Props = {
  conversationId: string;
  currentUserId: string;
  counterpartName: string;
  listingTitle?: string;
  listingUrl?: string;
  listingImageUrl?: string | null;
  listingCity?: string;
  listingPriceLabel?: string;
  sellerName?: string;
  sellerProfileUrl?: string;
  initialMessages: ChatMessage[];
  initialUnread: number;
  initialHasOlderMessages?: boolean;
  initialMuted?: boolean;
  initialPinned?: boolean;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.max(0, totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function isDocumentHidden() {
  return document.visibilityState === "hidden";
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    const old = byId.get(message.id);
    byId.set(message.id, old
      ? { ...old, ...message, readAt: message.readAt ?? old.readAt }
      : message);
  }
  return [...byId.values()].sort((a, b) => {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return timeDiff || a.id.localeCompare(b.id);
  });
}

type MessengerIconName = "attach" | "mic" | "video" | "send" | "play" | "pause" | "stop";

function MessengerIcon({ name, size = 21 }: { name: MessengerIconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  return <svg {...common}>
    {name === "attach" && <path d="m8.5 12.5 6.8-6.8a4 4 0 0 1 5.7 5.7l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.1-9.1" />}
    {name === "mic" && <><rect x="9" y="2.8" width="6" height="12" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.2M8.5 21.2h7" /></>}
    {name === "video" && <><rect x="3" y="6.2" width="13.5" height="11.6" rx="2.3" /><path d="m16.5 10 4.5-2.7v9.4L16.5 14" /></>}
    {name === "send" && <path d="M21.5 2.8 14.6 21a.8.8 0 0 1-1.5 0l-3.5-7.6-7.6-3.5a.8.8 0 0 1 0-1.5l18.2-6.9a.9.9 0 0 1 1.3 1.3ZM9.6 13.4 15 8" />}
    {name === "play" && <path d="m8 5.5 11 6.5-11 6.5z" fill="currentColor" stroke="none" />}
    {name === "pause" && <><path d="M8 5v14M16 5v14" strokeWidth="3" /></>}
    {name === "stop" && <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none" />}
  </svg>;
}

function TelegramAudioMessage({ src, voiceNote }: { src: string; voiceNote: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const waveform = [4, 8, 5, 12, 7, 16, 10, 21, 13, 8, 17, 24, 11, 15, 7, 19, 10, 25, 14, 8, 18, 11, 22, 9, 15, 6, 13, 20, 8, 16, 5, 12, 19, 7];
  const percent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
    } else { audio.pause(); setPlaying(false); }
  }
  return <div className={`hm-tg-voice-note${voiceNote ? " is-voice-note" : " is-audio-file"}`}>
    <audio ref={audioRef} className="hm-tg-native-media" src={src} preload="metadata"
      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onEnded={() => { setPlaying(false); setCurrentTime(0); }} />
    <button type="button" className="hm-tg-media-play" onClick={() => void togglePlayback()} aria-label={playing ? "توقف موقت پیام صوتی" : "پخش پیام صوتی"}>
      <MessengerIcon name={playing ? "pause" : "play"} size={22} />
    </button>
    <div className="hm-tg-voice-track">
      <div className="hm-tg-waveform" role="img" aria-label="موج صدای پیام صوتی">
        {waveform.map((height, index) => <span key={index} className={(index / waveform.length) * 100 <= percent ? "is-played" : ""} style={{ height: `${height}px` }} />)}
      </div>
      <div className="hm-tg-voice-timing"><span>{formatDuration(Math.floor(currentTime))}</span><span>{duration ? formatDuration(Math.floor(duration)) : (voiceNote ? "پیام صوتی" : "فایل صوتی")}</span></div>
      <input className="hm-tg-seek hm-tg-audio-seek" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} aria-label="موقعیت پیام صوتی" onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrentTime(value); }} />
    </div>
    <span className="hm-tg-voice-kind" aria-hidden="true"><MessengerIcon name="mic" size={15} /></span>
  </div>;
}

function TelegramVideoMessage({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try { await video.play(); setPlaying(true); } catch { setPlaying(false); }
    } else { video.pause(); setPlaying(false); }
  }
  return <div className="hm-tg-video-note">
    <div className="hm-tg-video-stage">
      <video ref={videoRef} src={src} playsInline preload="metadata" aria-label="پیام ویدیویی"
        onClick={() => void togglePlayback()}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onEnded={() => setPlaying(false)} />
      {!playing && <button type="button" className="hm-tg-video-big-play" onClick={() => void togglePlayback()} aria-label="پخش ویدیو"><MessengerIcon name="play" size={29} /></button>}
    </div>
    <div className="hm-tg-video-controls">
      <button type="button" className="hm-tg-video-toggle" onClick={() => void togglePlayback()} aria-label={playing ? "توقف موقت ویدیو" : "پخش ویدیو"}><MessengerIcon name={playing ? "pause" : "play"} size={16} /></button>
      <span className="hm-tg-video-time">{formatDuration(Math.floor(currentTime))}</span>
      <input className="hm-tg-seek" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} aria-label="موقعیت ویدیو" onChange={(event) => { const value = Number(event.target.value); if (videoRef.current) videoRef.current.currentTime = value; setCurrentTime(value); }} />
      <span className="hm-tg-video-time">{duration ? formatDuration(Math.floor(duration)) : "--:--"}</span>
    </div>
  </div>;
}

export default function ConversationView({
  conversationId,
  currentUserId,
  counterpartName,
  listingTitle = "گفت‌وگو درباره ملک",
  listingUrl = "#",
  listingImageUrl = null,
  listingCity = "",
  listingPriceLabel = "",
  sellerName = counterpartName,
  sellerProfileUrl = "#",
  initialMessages,
  initialUnread,
  initialHasOlderMessages = false,
  initialMuted = false,
  initialPinned = false,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [recordingMode, setRecordingMode] = useState<"audio" | "video">("audio");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingStartedAtRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const composeFormRef = useRef<HTMLFormElement>(null);
  const pressRecordingRef = useRef(false);
  const autoSendRecordedRef = useRef(false);
  const recordGestureTimerRef = useRef<number | null>(null);
  const recordGestureStartedRef = useRef(false);
  const stopRecordingRef = useRef<(autoSend?: boolean) => void>(() => {});
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingPreviewRef = useRef<HTMLVideoElement>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [recordingKind, setRecordingKind] = useState<"audio" | "video" | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(initialHasOlderMessages);
  const [error, setError] = useState("");
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [openMessageMenu, setOpenMessageMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const touchMenuTimerRef = useRef<number | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [pinned, setPinned] = useState(initialPinned);
  // KHANEHYAR_MESSENGER_HEADER_V7
  // KHANEHYAR_MESSENGER_HEADER_V7_1 — consolidate header actions and remove duplicate lower toolbar
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const [connectionState, setConnectionState] = useState<"connected" | "checking" | "offline">("connected");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef<{ height: number; top: number } | null>(null);
  const wasAtBottomRef = useRef(true);
  const pendingMessageIdRef = useRef<string | null>(null);
  const hasMarkedInitialReadRef = useRef(false);
  const seenIncomingRef = useRef(new Set<string>(initialMessages.map((message) => message.id)));

  const openContextMenu = useCallback((messageId: string, clientX: number, clientY: number) => {
    const menuWidth = 264;
    const menuHeight = 286;
    setOpenMessageMenu({
      messageId,
      x: Math.max(8, Math.min(clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(clientY, window.innerHeight - menuHeight - 8)),
    });
  }, []);

  useEffect(() => {
    if (!openMessageMenu) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".hm-chat-context-menu") || target.closest("[data-message-menu-trigger]")) return;
      setOpenMessageMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMessageMenu(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMessageMenu]);

  useEffect(() => () => {
    if (touchMenuTimerRef.current !== null) window.clearTimeout(touchMenuTimerRef.current);
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    const preview = recordingPreviewRef.current;
    if (recordingKind === "video" && preview && mediaStreamRef.current) {
      preview.srcObject = mediaStreamRef.current;
      void preview.play().catch(() => undefined);
    }
    return () => {
      if (preview) preview.srcObject = null;
    };
  }, [recordingKind]);

  useEffect(() => {
    if (!recordingKind) return;
    const updateElapsed = () => {
      const startedAt = recordingStartedAtRef.current;
      if (startedAt !== null) setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(timer);
  }, [recordingKind]);

  const markRead = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/read`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) return false;
      setMessages((current) => {
        const readAt = new Date().toISOString();
        return current.map((message) => message.senderId !== currentUserId && !message.readAt
          ? { ...message, readAt }
          : message);
      });
      return true;
    } catch {
      return false;
    }
  }, [conversationId, currentUserId]);

  const refreshMessages = useCallback(async () => {
    if (isDocumentHidden()) return;
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 404) setConnectionState("offline");
        return;
      }
      const data = await response.json() as { messages?: ChatMessage[]; hasMore?: boolean };
      if (!Array.isArray(data.messages)) return;
      setConnectionState("connected");
      const incoming = data.messages.filter((message) => message.senderId !== currentUserId && !seenIncomingRef.current.has(message.id));
      for (const message of data.messages) seenIncomingRef.current.add(message.id);
      if (incoming.length && isDocumentHidden() && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const newest = incoming[incoming.length - 1];
        try { const notice = new Notification(counterpartName, { body: newest.body || "پیام جدید دریافت شد", tag: `khanehyar-${conversationId}`, data: { url: window.location.href } }); notice.onclick = () => { window.focus(); notice.close(); }; } catch { /* Browser notifications are optional. */ }
      }
      setHasOlderMessages((current) => current || Boolean(data.hasMore));
      setMessages((current) => mergeMessages(current, data.messages!));

      if (data.messages.some((message) => message.senderId !== currentUserId && !message.readAt)) {
        const read = await markRead();
        if (read) router.refresh();
      }
    } catch {
      setConnectionState("offline");
    }
  }, [conversationId, counterpartName, currentUserId, markRead, router]);

  useEffect(() => {
    if (initialUnread <= 0 || hasMarkedInitialReadRef.current) return;
    hasMarkedInitialReadRef.current = true;
    void markRead().then((read) => { if (read) router.refresh(); });
  }, [initialUnread, markRead, router]);

  useEffect(() => {
    let inFlight = false;
    const poll = async () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        await refreshMessages();
      } finally {
        inFlight = false;
      }
    };
    const interval = window.setInterval(() => { void poll(); }, 5000);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshMessages]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (pendingScrollRef.current) {
      const previous = pendingScrollRef.current;
      container.scrollTop = previous.top + (container.scrollHeight - previous.height);
      pendingScrollRef.current = null;
      wasAtBottomRef.current = false;
      return;
    }
    if (wasAtBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function loadOlder() {
    const firstMessage = messages[0];
    if (!firstMessage || loadingOlder || !hasOlderMessages) return;
    const container = scrollContainerRef.current;
    if (container) pendingScrollRef.current = { height: container.scrollHeight, top: container.scrollTop };
    setLoadingOlder(true);
    setError("");
    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}/messages?before=${encodeURIComponent(firstMessage.id)}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      const data = await response.json() as { error?: string; messages?: ChatMessage[]; hasMore?: boolean };
      if (!response.ok || !Array.isArray(data.messages)) throw new Error(data.error || "بارگذاری پیام‌های قدیمی ناموفق بود.");
      setMessages((current) => mergeMessages(data.messages!, current));
      setHasOlderMessages(Boolean(data.hasMore));
      if (!data.messages.length) pendingScrollRef.current = null;
    } catch (caught) {
      pendingScrollRef.current = null;
      setError(caught instanceof Error ? caught.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();
    if (busy || recordingKind || (!message && !selectedFile)) return;
    if (selectedFile && selectedFile.size > 20 * 1024 * 1024) { setError("حداکثر حجم فایل ۲۰ مگابایت است."); return; }
    const clientMessageId = pendingMessageIdRef.current ?? crypto.randomUUID();
    pendingMessageIdRef.current = clientMessageId;
    setBusy(true);
    setError("");
    try {
      let payload: BodyInit;
      const headers: Record<string, string> = {};
      if (selectedFile) {
        const form = new FormData();
        form.set("message", message);
        form.set("clientMessageId", clientMessageId);
        if (replyTarget) form.set("replyToId", replyTarget.id);
        form.set("attachment", selectedFile);
        payload = form;
      } else {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify({ message, clientMessageId, ...(replyTarget ? { replyToId: replyTarget.id } : {}) });
      }
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST", credentials: "same-origin", headers, body: payload,
      });
      const result = await response.json() as { error?: string; message?: ChatMessage };
      if (!response.ok || !result.message) throw new Error(result.error || "ارسال پیام ناموفق بود.");
      wasAtBottomRef.current = true;
      setMessages((current) => mergeMessages(current, [result.message!]));
      setText("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setReplyTarget(null);
      pendingMessageIdRef.current = null;
      setConnectionState("connected");
      router.refresh();
    } catch (caught) {
      setConnectionState("offline");
      setError(caught instanceof Error ? caught.message : "ارتباط با سرور برقرار نشد. برای تلاش دوباره، پیام را تغییر ندهید.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleReaction(message: ChatMessage, emoji: string) {
    setActionBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(message.id)}/reactions`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const result = await response.json() as { error?: string; reactions?: ChatMessage["reactions"] };
      if (!response.ok || !Array.isArray(result.reactions)) throw new Error(result.error || "ثبت واکنش انجام نشد.");
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, reactions: result.reactions } : item));
      setOpenMessageMenu(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ثبت واکنش انجام نشد.");
    } finally {
      setActionBusy(false);
    }
  }

  async function startRecording(kind: "audio" | "video") {
    if (recordingKind || busy) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("ضبط رسانه در این مرورگر پشتیبانی نمی‌شود. از انتخاب فایل استفاده کنید.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "video" });
      const candidates = kind === "video"
        ? ["video/webm;codecs=vp8,opus", "video/webm"]
        : ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
      const mimeType = candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        recordingChunksRef.current.push(event.data);
        const totalBytes = recordingChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        if (totalBytes > 20 * 1024 * 1024 && recorder.state !== "inactive") {
          setError("ضبط به سقف ۲۰ مگابایت رسید و متوقف شد.");
          recorder.stop();
        }
      };
      recorder.onerror = () => {
        setError("ضبط رسانه با خطا مواجه شد.");
        if (recorder.state !== "inactive") recorder.stop();
      };
      recorder.onstop = () => {
        const recordedType = recorder.mimeType || (kind === "video" ? "video/webm" : "audio/webm");
        const type = recordedType.split(";")[0].trim().toLowerCase();
        const extension = type.includes("ogg") ? "ogg" : type.includes("mp4") ? "mp4" : "webm";
        const file = new File(recordingChunksRef.current, `${kind === "video" ? "video" : "voice"}-${Date.now()}.${extension}`, { type });
        recordingChunksRef.current = [];
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setRecordingKind(null);
        recordingStartedAtRef.current = null;
        if (file.size > 20 * 1024 * 1024) {
          setError("رسانه ضبط‌شده بیش از ۲۰ مگابایت است؛ ضبط کوتاه‌تری بگیر.");
          return;
        }
        if (file.size === 0) {
          setError("فایل ضبط‌شده خالی است؛ دوباره تلاش کن.");
          return;
        }
        setSelectedFile(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setError("");
        if (autoSendRecordedRef.current) {
          autoSendRecordedRef.current = false;
          window.setTimeout(() => composeFormRef.current?.requestSubmit(), 0);
        }
      };
      recorder.start(250);
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setRecordingKind(kind);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setError("");
      // If the user released while the browser permission prompt was open, stop immediately.
      if (!pressRecordingRef.current) recorder.stop();
    } catch (caught) {
      setError(caught instanceof Error && caught.name === "NotAllowedError"
        ? "اجازه دسترسی به میکروفون یا دوربین داده نشد."
        : "دسترسی به میکروفون یا دوربین ممکن نیست. مجوز مرورگر را بررسی کن.");
    }
  }

  function stopRecording(autoSend?: boolean) {
    if (typeof autoSend === "boolean") autoSendRecordedRef.current = autoSend;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
  }
  stopRecordingRef.current = stopRecording;

  // KHANEHYAR_MESSENGER_V6_9_SINGLE_BUTTON_TAP_HOLD
  useEffect(() => {
    const clearRecordGestureTimer = () => {
      if (recordGestureTimerRef.current !== null) {
        window.clearTimeout(recordGestureTimerRef.current);
        recordGestureTimerRef.current = null;
      }
    };
    const releaseRecordGesture = (send: boolean, cancelled = false) => {
      if (!pressRecordingRef.current) return;
      pressRecordingRef.current = false;
      clearRecordGestureTimer();
      const didStartRecording = recordGestureStartedRef.current;
      recordGestureStartedRef.current = false;
      if (didStartRecording) {
        stopRecordingRef.current(send && !cancelled);
      } else if (!cancelled) {
        // A short tap switches the selected recording mode; a long press records.
        setRecordingMode((current) => current === "audio" ? "video" : "audio");
      }
    };
    const onPointerUp = () => releaseRecordGesture(true);
    const onPointerCancel = () => releaseRecordGesture(false, true);
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter") releaseRecordGesture(true);
    };
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      clearRecordGestureTimer();
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function cancelSelectedFile() {
    setSelectedFile(null);
    setSelectedPreviewUrl(null);
    pendingMessageIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
  }

  useEffect(() => () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function updatePreference(payload: { archived?: boolean; muted?: boolean; pinned?: boolean }) {
    setActionBusy(true); setError("");
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/preferences`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "ذخیره تنظیمات مکالمه ناموفق بود.");
      if (typeof payload.muted === "boolean") setMuted(payload.muted);
      if (typeof payload.pinned === "boolean") setPinned(payload.pinned);
      if (payload.archived) router.push("/dashboard/messages");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ذخیره تنظیمات ناموفق بود."); }
    finally { setActionBusy(false); }
  }

  async function blockCounterpart() {
    if (!window.confirm(`آیا می‌خواهید ${counterpartName} را مسدود کنید؟ ارسال پیام در این مکالمه متوقف می‌شود.`)) return;
    setActionBusy(true);
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/block`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "مسدودسازی انجام نشد.");
      setError("این کاربر مسدود شد. برای ادامه، صفحه را ترک کنید.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "مسدودسازی انجام نشد."); }
    finally { setActionBusy(false); }
  }

  async function editMessage(message: ChatMessage) {
    setOpenMessageMenu(null);
    const next = window.prompt("متن جدید پیام:", message.body);
    if (next === null || !next.trim() || next.trim() === message.body) return;
    setActionBusy(true);
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(message.id)}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: next }) });
      const result = await response.json() as { error?: string; message?: { body: string; editedAt: string | null } };
      if (!response.ok || !result.message) throw new Error(result.error || "ویرایش پیام انجام نشد.");
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, body: result.message!.body, editedAt: result.message!.editedAt } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ویرایش پیام انجام نشد."); }
    finally { setActionBusy(false); }
  }

  async function deleteMessage(message: ChatMessage) {
    setOpenMessageMenu(null);
    if (!window.confirm("این پیام برای هر دو طرف حذف شود؟")) return;
    setActionBusy(true);
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(message.id)}`, { method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "حذف پیام انجام نشد.");
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, body: "این پیام حذف شده است.", deletedAt: new Date().toISOString() } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "حذف پیام انجام نشد."); }
    finally { setActionBusy(false); }
  }

  async function reportMessage(message: ChatMessage) {
    setOpenMessageMenu(null);
    const reason = window.prompt("دلیل گزارش این پیام را بنویسید:");
    if (!reason?.trim()) return;
    setActionBusy(true);
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(message.id)}/report`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "گزارش ارسال نشد.");
      setError("گزارش شما برای بررسی ثبت شد.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "گزارش ارسال نشد."); }
    finally { setActionBusy(false); }
  }

  async function copyMessage(message: ChatMessage) {
    setOpenMessageMenu(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(message.body);
      setError("متن پیام کپی شد.");
    } catch {
      setError("کپی متن در این مرورگر مجاز نیست.");
    }
  }

  async function enableBrowserNotifications() {
    if (typeof Notification === "undefined") { setError("این مرورگر از اعلان‌های دسکتاپ پشتیبانی نمی‌کند."); return; }
    const permission = await Notification.requestPermission();
    setError(permission === "granted" ? "اعلان‌های مرورگر فعال شدند." : "اجازه اعلان داده نشد.");
  }

  function onComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="hm-chat-shell">
    <header className="hm-tg-topbar hm-tg-property-topbar" dir="ltr">
      <button type="button" className="hm-tg-topbar-icon hm-tg-back" onClick={() => router.push("/dashboard/messages")} aria-label="بازگشت به گفتگوها" title="Back">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg>
      </button>
      <a className="hm-tg-property-identity" href={listingUrl} title="مشاهده جزئیات آگهی">
        <span className="hm-tg-property-thumb">{listingImageUrl ? <img src={listingImageUrl} alt="" /> : <span aria-hidden="true">⌂</span>}</span>
        <span className="hm-tg-property-copy">
          <strong>{listingTitle}</strong>
          <small>{[listingCity, listingPriceLabel].filter(Boolean).join(" · ") || "مشاهده اطلاعات آگهی"}</small>
        </span>
      </a>
      <a className="hm-tg-seller-chip" href={sellerProfileUrl} title="مشاهده پروفایل و آگهی‌های فروشنده">
        <span className="hm-tg-seller-avatar" aria-hidden="true">{sellerName.trim().slice(0, 1) || "ف"}</span>
        <span className="hm-tg-seller-copy"><strong>{sellerName}</strong><small>Seller profile</small></span>
      </a>
      <div className="hm-tg-topbar-actions">
        <button type="button" className={`hm-tg-topbar-icon${headerSearchOpen ? " is-active" : ""}`} onClick={() => { setHeaderSearchOpen((open) => !open); setHeaderSearchQuery(""); setHeaderMenuOpen(false); }} aria-label="جست‌وجو در پیام‌ها" title="Search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        </button>
        <button type="button" className={`hm-tg-topbar-icon${headerMenuOpen ? " is-active" : ""}`} onClick={() => { setHeaderMenuOpen((open) => !open); setHeaderSearchOpen(false); }} aria-label="گزینه‌های گفتگو" aria-haspopup="menu" aria-expanded={headerMenuOpen} title="More">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
        </button>
        {headerMenuOpen && <div className="hm-tg-header-menu" role="menu">
          <div className="hm-tg-header-menu-caption">Chat settings</div>
          <a role="menuitem" className="hm-tg-header-menu-link" href={listingUrl}>⌂ <span>Listing details & reviews</span></a>
          <a role="menuitem" className="hm-tg-header-menu-link" href={sellerProfileUrl}>♙ <span>Seller profile & all listings</span></a>
          <div className="hm-tg-header-menu-divider" />
          <button type="button" role="menuitem" onClick={() => { setHeaderMenuOpen(false); void updatePreference({ pinned: !pinned }); }} disabled={actionBusy}><span className="hm-tg-menu-symbol">{pinned ? "⌑" : "⌖"}</span><span>{pinned ? "برداشتن سنجاق گفتگو" : "سنجاق‌کردن گفتگو"}</span>{pinned && <span className="hm-tg-menu-check">✓</span>}</button>
          <button type="button" role="menuitem" onClick={() => { setHeaderMenuOpen(false); void updatePreference({ muted: !muted }); }} disabled={actionBusy}><span className="hm-tg-menu-symbol">{muted ? "♬" : "♩"}</span><span>{muted ? "فعال‌کردن اعلان‌ها" : "بی‌صداکردن گفتگو"}</span>{muted && <span className="hm-tg-menu-check">✓</span>}</button>
          <button type="button" role="menuitem" onClick={() => { setHeaderMenuOpen(false); void enableBrowserNotifications(); }} disabled={actionBusy}><span className="hm-tg-menu-symbol">♧</span><span>اعلان‌های مرورگر</span></button>
          <div className="hm-tg-header-menu-divider" />
          <button type="button" role="menuitem" onClick={() => { setHeaderMenuOpen(false); void updatePreference({ archived: true }); }} disabled={actionBusy}><span className="hm-tg-menu-symbol">▣</span><span>بایگانی گفتگو</span></button>
          <button type="button" role="menuitem" className="is-danger" onClick={() => { setHeaderMenuOpen(false); void blockCounterpart(); }} disabled={actionBusy}><span className="hm-tg-menu-symbol">⊘</span><span>مسدودکردن مخاطب</span></button>
        </div>}
      </div>
      {headerSearchOpen && <form className="hm-tg-header-search" role="search" onSubmit={(event) => { event.preventDefault(); document.querySelector(".hm-chat-search-hit")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        <input autoFocus value={headerSearchQuery} onChange={(event) => setHeaderSearchQuery(event.target.value)} placeholder="Search messages..." aria-label="جست‌وجو در پیام‌های گفتگو" />
        {headerSearchQuery && <span className="hm-tg-search-count">{messages.filter((message) => `${message.body} ${message.attachmentName || ""}`.toLocaleLowerCase().includes(headerSearchQuery.toLocaleLowerCase())).length.toLocaleString("fa-IR")} نتیجه</span>}
        <button type="button" onClick={() => { setHeaderSearchQuery(""); setHeaderSearchOpen(false); }} aria-label="بستن جست‌وجو">×</button>
      </form>}
    </header>
      <div className="hm-chat-messages" ref={scrollContainerRef} aria-live="polite" aria-relevant="additions text">
        {hasOlderMessages && <button type="button" className="hm-chat-load-older" onClick={() => void loadOlder()} disabled={loadingOlder}>
          {loadingOlder ? "در حال بارگذاری..." : "نمایش پیام‌های قدیمی‌تر"}
        </button>}
        {messages.length === 0 ? <p className="hm-chat-first">گفت‌وگو را با ارسال پیام شروع کنید.</p> : (headerSearchQuery.trim() && headerSearchOpen ? messages.filter((message) => `${message.body} ${message.attachmentName || ""}`.toLocaleLowerCase().includes(headerSearchQuery.trim().toLocaleLowerCase())) : messages).length === 0 ? <p className="hm-chat-first">پیامی با این عبارت پیدا نشد.</p> : (headerSearchQuery.trim() && headerSearchOpen ? messages.filter((message) => `${message.body} ${message.attachmentName || ""}`.toLocaleLowerCase().includes(headerSearchQuery.trim().toLocaleLowerCase())) : messages).map((message) => {
          const own = message.senderId === currentUserId;
          const menuIsOpen = openMessageMenu?.messageId === message.id;
          return <article
            key={message.id}
            id={`message-${message.id}`}
            className={`${own ? "hm-chat-bubble hm-chat-own" : "hm-chat-bubble hm-chat-other"}${headerSearchOpen && headerSearchQuery.trim() ? " hm-chat-search-hit" : ""}`}
            onContextMenu={(event) => {
              if (message.deletedAt) return;
              event.preventDefault();
              openContextMenu(message.id, event.clientX, event.clientY);
            }}
            onTouchStart={(event) => {
              if (message.deletedAt || (event.target instanceof Element && event.target.closest("button,a,input,textarea,video,audio"))) return;
              const touch = event.touches[0];
              if (!touch) return;
              if (touchMenuTimerRef.current !== null) window.clearTimeout(touchMenuTimerRef.current);
              touchMenuTimerRef.current = window.setTimeout(() => openContextMenu(message.id, touch.clientX, touch.clientY), 520);
            }}
            onTouchEnd={() => {
              if (touchMenuTimerRef.current !== null) window.clearTimeout(touchMenuTimerRef.current);
              touchMenuTimerRef.current = null;
            }}
            onTouchMove={() => {
              if (touchMenuTimerRef.current !== null) window.clearTimeout(touchMenuTimerRef.current);
              touchMenuTimerRef.current = null;
            }}
            onTouchCancel={() => {
              if (touchMenuTimerRef.current !== null) window.clearTimeout(touchMenuTimerRef.current);
              touchMenuTimerRef.current = null;
            }}
          >
            <div className="hm-chat-bubble-heading">
              <span className="hm-chat-author">{own ? "شما" : counterpartName}</span>
              {!message.deletedAt && <button
                type="button"
                className="hm-chat-message-menu-trigger"
                data-message-menu-trigger
                aria-label="گزینه‌های پیام"
                aria-haspopup="menu"
                aria-expanded={menuIsOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  if (menuIsOpen) setOpenMessageMenu(null);
                  else {
                    const rect = event.currentTarget.getBoundingClientRect();
                    openContextMenu(message.id, rect.right, rect.bottom + 6);
                  }
                }}
              >⋯</button>}
            </div>
            {message.replyTo && <button type="button" className="hm-chat-reply-preview" onClick={() => document.getElementById(`message-${message.replyTo!.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{message.replyTo.senderId === currentUserId ? "شما" : counterpartName}: {message.replyTo.body}</button>}
            {message.attachmentUrl && (message.attachmentMime?.startsWith("image/") ? <a className="hm-chat-attachment-image" href={message.attachmentUrl} target="_blank" rel="noreferrer"><img src={message.attachmentUrl} alt={message.attachmentName || "تصویر پیوست‌شده"} loading="lazy" /></a>
              : message.attachmentMime?.startsWith("audio/") ? <TelegramAudioMessage src={message.attachmentUrl} voiceNote={Boolean(message.attachmentName?.startsWith("voice-"))} />
              : message.attachmentMime?.startsWith("video/") ? <TelegramVideoMessage src={message.attachmentUrl} />
              : <a className="hm-chat-attachment" href={message.attachmentUrl} target="_blank" rel="noreferrer">📎 {message.attachmentName || "پیوست"}</a>)}
            {(message.body || message.deletedAt) && <p>{message.deletedAt ? "این پیام حذف شده است." : message.body}</p>}
            {!message.deletedAt && (message.reactions || []).length > 0 && <div className="hm-chat-reactions" aria-label="واکنش‌های پیام">
              {(message.reactions || []).map((reaction) => <button key={reaction.emoji} type="button" className={`hm-chat-reaction${reaction.reacted ? " is-reacted" : ""}`} onClick={() => void toggleReaction(message, reaction.emoji)} disabled={actionBusy} aria-label={`واکنش ${reaction.emoji}، ${reaction.count} نفر`}>{reaction.emoji} <span>{reaction.count}</span></button>)}
            </div>}
            <div className="hm-chat-message-meta"><time dateTime={message.createdAt}>{dateLabel(message.createdAt)}</time>{message.editedAt && <span>ویرایش‌شده</span>}</div>
            {own && message.readAt && <span className="hm-chat-read">✓✓ خوانده شد</span>}
            {menuIsOpen && !message.deletedAt && <div
              className="hm-chat-context-menu"
              role="menu"
              aria-label="عملیات پیام"
              style={{ position: "fixed", left: openMessageMenu?.x ?? 8, top: openMessageMenu?.y ?? 8 }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="hm-chat-context-menu-title">واکنش سریع</div>
              <div className="hm-chat-context-reactions">
                {["👍", "❤️", "😂", "😮", "😢", "🔥"].map((emoji) => <button key={emoji} type="button" role="menuitem" onClick={() => void toggleReaction(message, emoji)} disabled={actionBusy} aria-label={`واکنش ${emoji}`} title={emoji}>{emoji}</button>)}
              </div>
              <div className="hm-chat-context-divider" />
              <button type="button" role="menuitem" onClick={() => { setReplyTarget(message); setOpenMessageMenu(null); }}>↩ <span>پاسخ دادن</span></button>
              {own && <button type="button" role="menuitem" onClick={() => void editMessage(message)} disabled={actionBusy}>✎ <span>ویرایش پیام</span></button>}
              {own && <button type="button" role="menuitem" className="is-danger" onClick={() => void deleteMessage(message)} disabled={actionBusy}>⌫ <span>حذف پیام</span></button>}
              {!own && <button type="button" role="menuitem" onClick={() => void reportMessage(message)} disabled={actionBusy}>⚑ <span>گزارش پیام</span></button>}
              {message.body && <button type="button" role="menuitem" onClick={() => void copyMessage(message)}>▣ <span>کپی متن</span></button>}
            </div>}
          </article>;
        })}
        <div ref={bottomRef} />
      </div>
      <form ref={composeFormRef} className="hm-chat-compose hm-chat-compose-telegram" onSubmit={submit}>
        {replyTarget && <div className="hm-chat-replying"><span><strong>پاسخ به {replyTarget.senderId === currentUserId ? "پیام خودتان" : counterpartName}</strong><small>{replyTarget.body || (replyTarget.attachmentMime?.startsWith("audio/") ? "پیام صوتی" : replyTarget.attachmentMime?.startsWith("video/") ? "پیام ویدیویی" : "پیام پیوست‌دار")}</small></span><button type="button" onClick={() => setReplyTarget(null)} aria-label="لغو پاسخ">×</button></div>}

        {recordingKind && <div className={`hm-chat-recording-banner is-${recordingKind}`} role="status">
          <span className="hm-chat-recording-pulse" aria-hidden="true" />
          {recordingKind === "video" && <video ref={recordingPreviewRef} className="hm-chat-live-video-preview" muted autoPlay playsInline aria-label="پیش‌نمایش زنده دوربین" />}
          <span className="hm-chat-recording-copy"><strong>{recordingKind === "audio" ? "در حال ضبط پیام صوتی" : "در حال ضبط پیام ویدیویی"}</strong><small>{recordingKind === "audio" ? "برای پایان، دکمه توقف را بزنید" : "میکروفون و دوربین فعال هستند"}</small></span>
          <time>{formatDuration(recordingSeconds)}</time>
          <button type="button" className="hm-chat-record-cancel" onClick={() => { recordingChunksRef.current = []; const recorder = mediaRecorderRef.current; if (recorder && recorder.state !== "inactive") { recorder.onstop = () => { mediaStreamRef.current?.getTracks().forEach((track) => track.stop()); mediaStreamRef.current = null; mediaRecorderRef.current = null; recordingStartedAtRef.current = null; setRecordingKind(null); }; recorder.stop(); } else { mediaStreamRef.current?.getTracks().forEach((track) => track.stop()); setRecordingKind(null); } setError(""); }} disabled={busy}>لغو</button>
        </div>}

        {selectedFile && <div className="hm-chat-media-preview" aria-label="پیش‌نمایش رسانه برای ارسال">
          <div className="hm-chat-media-preview-content">
            {selectedFile.type.startsWith("image/") && selectedPreviewUrl && <img src={selectedPreviewUrl} alt="پیش‌نمایش تصویر" />}
            {selectedFile.type.startsWith("audio/") && selectedPreviewUrl && <div className="hm-chat-preview-player"><span className="hm-chat-preview-icon">🎙</span><div><strong>{selectedFile.name.startsWith("voice-") ? "پیام صوتی شما" : "پیش‌نمایش فایل صوتی"}</strong><audio controls preload="metadata" src={selectedPreviewUrl} /></div></div>}
            {selectedFile.type.startsWith("video/") && selectedPreviewUrl && <div className="hm-chat-preview-player"><video controls playsInline preload="metadata" src={selectedPreviewUrl} /><div><strong>{selectedFile.name.startsWith("video-") ? "پیام ویدیویی شما" : "پیش‌نمایش ویدیو"}</strong><small>قبل از ارسال می‌توانید ویدیو را بررسی کنید.</small></div></div>}
            {!selectedFile.type.startsWith("image/") && !selectedFile.type.startsWith("audio/") && !selectedFile.type.startsWith("video/") && <span className="hm-chat-preview-icon">📎</span>}
            <div className="hm-chat-preview-file-details"><strong>{selectedFile.name}</strong><small>{(selectedFile.size / 1024 / 1024).toFixed(2)} مگابایت</small></div>
          </div>
          <button type="button" className="hm-chat-preview-remove" onClick={cancelSelectedFile} disabled={busy} aria-label="حذف رسانه انتخاب‌شده">×</button>
        </div>}

        <div className="hm-chat-composer-row">
          <button type="button" className="hm-chat-composer-icon hm-chat-attach-button" onClick={() => fileInputRef.current?.click()} disabled={busy || Boolean(recordingKind) || Boolean(selectedFile)} aria-label="پیوست فایل، عکس یا ویدیو" title="پیوست"><MessengerIcon name="attach" size={22} /></button>
          <input ref={fileInputRef} className="hm-chat-hidden-file-input" id="hm-chat-attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,video/webm,video/mp4" disabled={busy || Boolean(recordingKind)} onChange={(event) => { const file = event.target.files?.[0] || null; setSelectedFile(file); pendingMessageIdRef.current = null; if (file && file.size > 20 * 1024 * 1024) setError("حداکثر حجم فایل ۲۰ مگابایت است."); else setError(""); }} />

          <textarea
            id="hm-chat-message"
            value={text}
            onChange={(event) => { setText(event.target.value); pendingMessageIdRef.current = null; }}
            onKeyDown={onComposerKeyDown}
            rows={1}
            maxLength={2000}
            disabled={busy || Boolean(recordingKind)}
            placeholder={recordingKind ? "در حال ضبط..." : "پیام بنویسید..."}
            aria-label="متن پیام"
          />

          {recordingKind
            ? <button type="button" className="hm-chat-composer-send is-stop" onClick={() => stopRecording()} aria-label="پایان ضبط" title="پایان ضبط"><span><MessengerIcon name="stop" size={17} /></span></button>
            : (text.trim() || selectedFile)
              ? <button type="submit" className="hm-chat-composer-send" disabled={busy || Boolean(selectedFile && selectedFile.size > 20 * 1024 * 1024)} aria-label="ارسال پیام" title="ارسال">{busy ? <span className="hm-chat-send-spinner" /> : <MessengerIcon name="send" size={21} />}</button>
              : <button
                  type="button"
                  className={`hm-chat-composer-send is-record${recordingMode === "video" ? " is-video" : ""}`}
                  onPointerDown={(event) => {
                    if (event.button !== 0 || busy || selectedFile || pressRecordingRef.current) return;
                    event.preventDefault();
                    pressRecordingRef.current = true;
                    recordGestureStartedRef.current = false;
                    autoSendRecordedRef.current = false;
                    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
                    if (recordGestureTimerRef.current !== null) window.clearTimeout(recordGestureTimerRef.current);
                    recordGestureTimerRef.current = window.setTimeout(() => {
                      recordGestureTimerRef.current = null;
                      if (!pressRecordingRef.current) return;
                      recordGestureStartedRef.current = true;
                      void startRecording(recordingMode);
                    }, 230);
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === " " || event.key === "Enter") && !pressRecordingRef.current && !busy && !selectedFile) {
                      event.preventDefault();
                      pressRecordingRef.current = true;
                      recordGestureStartedRef.current = false;
                      autoSendRecordedRef.current = false;
                      if (recordGestureTimerRef.current !== null) window.clearTimeout(recordGestureTimerRef.current);
                      recordGestureTimerRef.current = window.setTimeout(() => {
                        recordGestureTimerRef.current = null;
                        if (!pressRecordingRef.current) return;
                        recordGestureStartedRef.current = true;
                        void startRecording(recordingMode);
                      }, 230);
                    }
                  }}
                  disabled={busy || Boolean(selectedFile)}
                  aria-label={recordingMode === "audio" ? "پیام صوتی؛ لمس کوتاه برای تغییر به ویدیو، نگه‌داشتن برای ضبط" : "پیام ویدیویی؛ لمس کوتاه برای تغییر به صدا، نگه‌داشتن برای ضبط"}
                  title={recordingMode === "audio" ? "لمس کوتاه: تغییر به ویدیو · نگه‌داشتن: ضبط صدا" : "لمس کوتاه: تغییر به صدا · نگه‌داشتن: ضبط ویدیو"}
                >
                  <span><MessengerIcon name={recordingMode === "audio" ? "mic" : "video"} size={21} /></span>
                </button>}
        </div>

        <div className="hm-chat-compose-hint"><small>{recordingKind ? `ضبط ${formatDuration(recordingSeconds)} · حداکثر ۲۰ مگابایت` : selectedFile ? "رسانه آماده ارسال است؛ برای ارسال دکمه سبز را بزنید." : text.trim() ? "Enter برای ارسال · Shift+Enter برای خط جدید" : "لمس کوتاه: تغییر بین صدا و ویدیو · نگه‌داشتن: ضبط و با رهاکردن ارسال می‌شود."}</small><small>{text.length.toLocaleString("fa-IR")} / ۲۰۰۰</small></div>
        {error && <p role="alert" className="hm-reply-error">{error}</p>}
      </form>
    </div>
  );
}
