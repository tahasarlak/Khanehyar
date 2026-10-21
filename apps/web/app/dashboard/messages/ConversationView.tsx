"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type ChatMessage = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
};

type Props = {
  conversationId: string;
  currentUserId: string;
  counterpartName: string;
  initialMessages: ChatMessage[];
  initialUnread: number;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function ConversationView({ conversationId, currentUserId, counterpartName, initialMessages, initialUnread }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    const refreshMessages = async () => {
      if (requestInFlight || document.visibilityState === "hidden") return;
      requestInFlight = true;
      try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
          credentials: "same-origin", cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json() as { messages?: ChatMessage[] };
        if (active && Array.isArray(data.messages)) {
          setMessages(data.messages);
          if (data.messages.some((message) => message.senderId !== currentUserId && !message.readAt)) {
            const readResponse = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/read`, {
              method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}",
            });
            if (readResponse.ok && active) {
              const readAt = new Date().toISOString();
              setMessages((current) => current.map((message) => message.senderId !== currentUserId && !message.readAt ? { ...message, readAt } : message));
              router.refresh();
            }
          }
        }
      } catch {
        // Keep the current conversation visible during temporary network issues.
      } finally { requestInFlight = false; }
    };
    const interval = window.setInterval(() => { void refreshMessages(); }, 10000);
    return () => { active = false; window.clearInterval(interval); };
  }, [conversationId, currentUserId, router]);

  useEffect(() => {
    if (initialUnread <= 0) return;
    const controller = new AbortController();
    void fetch(`/api/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: "{}", signal: controller.signal,
    }).then((response) => {
      if (response.ok) router.refresh();
    }).catch(() => undefined);
    return () => controller.abort();
  }, [conversationId, initialUnread, router]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();
    if (busy || !message) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await response.json() as { error?: string; message?: ChatMessage };
      if (!response.ok || !result.message) throw new Error(result.error || "ارسال پیام ناموفق بود.");
      setMessages((current) => [...current, result.message!]);
      setText("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ارتباط با سرور برقرار نشد.");
    } finally { setBusy(false); }
  }

  return (
    <div className="hm-chat-shell">
      <div className="hm-chat-messages" aria-live="polite">
        {messages.length === 0 ? <p className="hm-chat-first">گفت‌وگو را با ارسال پیام شروع کنید.</p> : messages.map((message) => {
          const own = message.senderId === currentUserId;
          return <article key={message.id} className={own ? "hm-chat-bubble hm-chat-own" : "hm-chat-bubble hm-chat-other"}>
            <span className="hm-chat-author">{own ? "شما" : counterpartName}</span>
            <p>{message.body}</p>
            <time dateTime={message.createdAt}>{dateLabel(message.createdAt)}</time>
            {own && message.readAt && <span className="hm-chat-read">خوانده شد</span>}
          </article>;
        })}
        <div ref={scrollRef} />
      </div>
      <form className="hm-chat-compose" onSubmit={submit}>
        <label htmlFor="hm-chat-message">پیام شما</label>
        <textarea id="hm-chat-message" value={text} onChange={(event) => setText(event.target.value)} rows={3} maxLength={2000} required disabled={busy} placeholder="پیامت را بنویس..." />
        <div className="hm-chat-compose-footer">
          <small>{text.length.toLocaleString("fa-IR")} / ۲۰۰۰</small>
          <button type="submit" disabled={busy || !text.trim()}>{busy ? "در حال ارسال..." : "ارسال پیام ←"}</button>
        </div>
        {error && <p role="alert" className="hm-reply-error">{error}</p>}
      </form>
    </div>
  );
}
