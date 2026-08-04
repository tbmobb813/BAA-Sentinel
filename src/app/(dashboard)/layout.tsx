import Link from "next/link";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { getCurrentOrgContext } from "@/lib/data/org";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getCurrentOrgContext();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            BAA Sentinel
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Overview
            </Link>
            <Link href="/vendors" className="hover:text-foreground">
              Vendors
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <OrganizationSwitcher afterSelectOrganizationUrl="/dashboard" />
          <UserButton />
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
