import { redirect } from "next/navigation";

export const instant = false;

export default function MessagesRedirect() {
  redirect("/dashboard/messages");
}