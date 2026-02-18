import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DevSidebar } from "@/components/dev/dev-sidebar";

export default async function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgRole } = await auth();

  // Allow access for admin/developer roles, or when no role is set (dev mode)
  const allowedRoles = ["org:admin", "org:developer", "admin", "developer"];
  if (orgRole && !allowedRoles.includes(orgRole)) {
    redirect("/analytics");
  }

  return (
    <div className="fixed inset-0 flex" style={{ backgroundColor: "var(--bg)" }}>
      <DevSidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
