import DirectAdminRedirect from "@/components/DirectAdminRedirect";

export const metadata = {
  title: "WIRED DIGITAL LLC Admin Workspace — OperateIQ",
  description: "Direct workspace entry for WIRED DIGITAL LLC property operations.",
};

export default function WiredDigitalAdminPage() {
  return (
    <DirectAdminRedirect
      orgSlug="wired-digital"
      orgName="WIRED DIGITAL LLC"
      targetPath="/admin"
    />
  );
}
