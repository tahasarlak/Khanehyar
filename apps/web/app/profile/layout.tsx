import type { ReactNode } from "react";
import AccountLayout from "../_components/AccountLayout";

export default function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AccountLayout>{children}</AccountLayout>;
}