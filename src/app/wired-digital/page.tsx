import { redirect } from "next/navigation";

// Legacy URL → the organization's canonical public site.
export default function LegacyWiredSiteAlias() {
  redirect("/site/wired-digital-llc");
}
