import type { ReactNode } from "react";
import AccountLayout from "../_components/AccountLayout";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AccountLayout>{children}</AccountLayout>;
}