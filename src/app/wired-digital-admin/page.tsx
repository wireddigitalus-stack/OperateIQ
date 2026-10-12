import { redirect } from "next/navigation";

// Legacy bookmark. Workspace access is decided by the signed-in user's
// membership on /admin — this URL no longer grants or switches anything.
export default function LegacyAdminAlias() {
  redirect("/admin");
}
