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

  const unreadMessages = await prisma.inquiry.count({
    where: {
      recipientId: user.id,
      isRead: false,
    },
  });

  return (
    <AccountShell
      userName={user.name ?? ""}
      email={user.email}
      role={user.role}
      unreadMessages={unreadMessages}
    >
      {children}
    </AccountShell>
  );
}