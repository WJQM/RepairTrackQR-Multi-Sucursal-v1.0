import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal RepairTrackQR",
  description: "Consulta el estado de tu reparación",
  manifest: "/manifest-portal.json",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
