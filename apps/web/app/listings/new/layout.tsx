import type { Metadata } from "next";
import type { ReactNode } from "react";
import AccountLayout from "../../_components/AccountLayout";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function NewListingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AccountLayout>{children}</AccountLayout>;
}