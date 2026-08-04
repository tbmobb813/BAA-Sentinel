import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CreateOrganization } from "@clerk/nextjs";

export default async function OnboardingPage() {
  const { orgId } = await auth();

  if (orgId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your organization
        </h1>
        <p className="text-muted-foreground">
          This is the account your vendors and BAAs will roll up to. If
          you&rsquo;re a consultant managing multiple practices, create one
          organization per practice.
        </p>
      </div>
      <CreateOrganization afterCreateOrganizationUrl="/dashboard" />
    </div>
  );
}
