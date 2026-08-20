import { redirect } from "next/navigation";

import { defaultPage } from "@/lib/nav";

export default function HomePage() {
  redirect(defaultPage.href);
}