import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = { title: "تنظیمات حساب | خانه‌یار", robots: { index: false, follow: false } };
export default function SettingsPage() { return <SettingsClient />; }
