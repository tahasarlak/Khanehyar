import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "../../src/lib/prisma";
import { getCurrentUser } from "../../src/lib/auth";
import AccountShell from "./AccountShell";

export default async function AccountLayout({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(
      requireAdmin
        ? "/login?next=%2Fadmin%2Flistings"
        : "/login?next=%2Fdashboard",
    );
  }

  if (requireAdmin && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const participantFilter = { is: { OR: [{ buyerId: user.id }, { sellerId: user.id }] } };
  const [unreadMessages, unreadNotifications] = await Promise.all([
    prisma.message.count({ where: { conversation: participantFilter, senderId: { not: user.id }, readAt: null, deletedAt: null } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return (
    <AccountShell
      userName={user.name ?? ""}
      email={user.email}
      role={user.role}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AccountShell>
  );
}