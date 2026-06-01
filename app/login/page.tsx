import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-servora-charcoal">Sign in to Servora</h1>
        <p className="mt-2 text-sm text-gray-500">
          Admin, POS register, and kitchen displays use separate roles.
        </p>
        <LoginForm nextPath={params.next} />
        <div className="mt-6 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <p className="font-medium text-servora-charcoal">Demo accounts (after seed)</p>
          <ul className="mt-1 space-y-0.5">
            <li>admin@restaurant.com — full access</li>
            <li>pos@restaurant.com — register only</li>
            <li>kitchen@restaurant.com — kitchen display</li>
          </ul>
          <p className="mt-2 text-gray-400">Default password: changeme</p>
        </div>
      </div>
    </div>
  );
}
