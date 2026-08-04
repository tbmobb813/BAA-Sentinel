import Link from "next/link";
import { getCurrentOrgContext } from "@/lib/data/org";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organization } = await getCurrentOrgContext();

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
          <span className="text-sm text-muted-foreground">{organization.name}</span>
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Log out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
