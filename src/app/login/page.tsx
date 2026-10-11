import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Log in | OperateIQ" };

export default function LoginPage() {
  redirect("/admin/login");
}
