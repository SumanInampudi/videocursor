import { redirect } from "next/navigation";
import { getUserBusinessChoices } from "@/app/actions/auth";
import { SelectBusinessForm } from "@/components/auth/SelectBusinessForm";
import { getPendingLoginUserId } from "@/lib/pending-login-server";
import { getSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string }>;

export default async function SelectBusinessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const session = await getSessionUser();
  const userId = session?.userId ?? (await getPendingLoginUserId());
  if (!userId) {
    redirect("/login");
  }

  const choices = await getUserBusinessChoices(userId);
  if (choices.length === 0) {
    redirect("/login");
  }
  if (choices.length === 1) {
    redirect(params.next || "/");
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-servora-charcoal">Choose business</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your account has access to multiple locations. Pick one to continue.
        </p>
        <SelectBusinessForm
          choices={choices.map((c) => ({
            businessId: c.business.id,
            name: c.business.name,
            slug: c.business.slug,
            role: c.role,
          }))}
          nextPath={params.next}
        />
      </div>
    </div>
  );
}
