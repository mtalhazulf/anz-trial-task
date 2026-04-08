import { redirect } from "next/navigation";
import { getDashboardAgencyContext } from "@/lib/agency/server";
import AgencyShell from "@/components/AgencyShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getDashboardAgencyContext();
  if (!ctx) {
    redirect("/login");
  }

  return (
    <AgencyShell
      agencies={ctx.agencies}
      activeAgencyId={ctx.activeAgencyId}
      ownedAgencyIds={ctx.ownedAgencyIds}
      profile={ctx.profile}
    >
      {children}
    </AgencyShell>
  );
}
