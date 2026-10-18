import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import ReplyForm from "./ReplyForm";
import MarkReadButton from "./MarkReadButton";
import "./messages.css";

export const instant = false;

type ConversationItem = {
  id: string;
  listingId: string;
  senderId: string;
  recipientId: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  listing: {
    id: string;
    title: string;
  };
  sender: {
    name: string | null;
  };
  recipient: {
    name: string | null;
  };
};

type Conversation = {
  key: string;
  listingId: string;
  listingTitle: string;
  counterpartId: string;
  counterpartName: string;
  messages: ConversationItem[];
};

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function MessagesPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="hm-page" dir="rtl">
        <div className="hm-container hm-empty">
          <h1>گفت‌وگوهای خانه‌یار</h1>
          <p>برای دیدن مکالمات، ابتدا وارد حساب شوید.</p>
          <Link
            href="/login?next=%2Fmy%2Fmessages"
            className="hm-button"
          >
            ورود به حساب
          </Link>
        </div>
      </main>
    );
  }

  const records = await prisma.inquiry.findMany({
    where: {
      OR: [
        { senderId: user.id },
        { recipientId: user.id },
      ],
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: 200,
    select: {
      id: true,
      listingId: true,
      senderId: true,
      recipientId: true,
      message: true,
      createdAt: true,
      isRead: true,
      listing: {
        select: { id: true, title: true },
      },
      sender: {
        select: { name: true },
      },
      recipient: {
        select: { name: true },
      },
    },
  });

  const conversations = new Map<string, Conversation>();

  for (const item of records) {
    const outgoing = item.senderId === user.id;

    const counterpartId = outgoing
      ? item.recipientId
      : item.senderId;

    const counterpartName = outgoing
      ? item.recipient.name || "کاربر خانه‌یار"
      : item.sender.name || "کاربر خانه‌یار";

    const key = `${item.listingId}:${counterpartId}`;
    let conversation = conversations.get(key);

    if (!conversation) {
      conversation = {
        key,
        listingId: item.listingId,
        listingTitle: item.listing.title,
        counterpartId,
        counterpartName,
        messages: [],
      };

      conversations.set(key, conversation);
    }

    conversation.messages.push(item);
  }

  const totalUnread = await prisma.inquiry.count({
    where: {
      recipientId: user.id,
      isRead: false,
    },
  });

  const threads = Array.from(conversations.values());

  for (const thread of threads) {
    thread.messages.reverse();
  }

  return (
    <main className="hm-page" dir="rtl">


      <div className="hm-container hm-content">
        <div className="hm-dashboard-page-title">
  <div>
    <h1>گفت‌وگوهای من</h1>
    <p>پیام‌ها و مکالمات مربوط به آگهی‌های شما</p>
  </div>
</div>


        <div className="hm-section-head">
          <h2>مکالمات</h2>
          <span>{threads.length.toLocaleString("fa-IR")}</span>
        </div>

        {threads.length === 0 ? (
          <div className="hm-empty">
            <h2>هنوز مکالمه‌ای نداری</h2>
            <p>
              برای شروع، وارد صفحه یک آگهی شو و به مالک پیام بده.
            </p>
            <Link href="/search" className="hm-button">
              جست‌وجوی ملک
            </Link>
          </div>
        ) : (
          <div className="hm-thread-list">
            {threads.map((thread) => {
              const latest = thread.messages.at(-1);

              const unreadCount = thread.messages.filter(
                (message) =>
                  message.recipientId === user.id &&
                  !message.isRead
              ).length;

              return (
                <section key={thread.key} className="hm-thread">
                  <div className="hm-thread-header">
                    <div>
                      <span className="hm-thread-kicker">
                        مکالمه درباره ملک
                      </span>

                      <h2>{thread.listingTitle}</h2>

                      <p>
                        طرف گفت‌وگو: {thread.counterpartName}
                      </p>

                      {unreadCount > 0 && (
                        <span className="hm-thread-unread">
                          {unreadCount.toLocaleString("fa-IR")} پیام جدید
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/listings/${encodeURIComponent(
                        thread.listingId
                      )}`}
                      className="hm-listing-link"
                    >
                      مشاهده آگهی ←
                    </Link>
                  </div>

                  <div className="hm-thread-messages">
                    {thread.messages.map((item) => {
                      const own = item.senderId === user.id;

                      return (
                        <article
                          key={item.id}
                          className={
                            own
                              ? "hm-bubble hm-bubble-own"
                              : "hm-bubble hm-bubble-other"
                          }
                        >
                          <span className="hm-bubble-author">
                            {own ? "شما" : thread.counterpartName}
                          </span>

                          <p>{item.message}</p>

                          <time dateTime={item.createdAt.toISOString()}>
                            {dateLabel(item.createdAt)}
                          </time>
                        </article>
                      );
                    })}
                  </div>

                  <MarkReadButton
                    listingId={thread.listingId}
                    counterpartId={thread.counterpartId}
                    unreadCount={unreadCount}
                  />

                  {latest && latest.recipientId === user.id ? (
                    <ReplyForm replyToId={latest.id} />
                  ) : (
                    <div className="hm-awaiting">
                      آخرین پیام را شما ارسال کرده‌اید؛
                      برای پاسخ طرف مقابل منتظر بمانید.
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <p className="hm-limit-note">
          در این نسخه حداکثر ۲۰۰ پیام اخیر بارگذاری می‌شود.
          گفت‌وگوهای طولانی‌تر در مرحله صفحه‌بندی تکمیل خواهند شد.
        </p>
      </div>
    </main>
  );
}