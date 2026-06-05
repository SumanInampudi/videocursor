import { LoginForm } from "@/components/auth/LoginForm";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-surface px-4">
      <div className="auth-panel">
        <div className="auth-panel-accent" aria-hidden />
        <div className="mb-2 flex items-center gap-2">
          <h1 className="page-title text-xl md:text-2xl">Sign in to Servora</h1>
          <Badge variant="primary">Secure</Badge>
        </div>
        <p className="page-subtitle">
          Admin, POS register, and kitchen displays use separate roles.
        </p>
        <LoginForm nextPath={params.next} />
        <div className="mt-6 rounded-xl border border-brand-200/60 bg-brand-50/50 p-4 text-xs text-charcoal-muted">
          <p className="font-semibold text-brand-900">Default accounts (after seed)</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Badge variant="outline" className="mr-1 normal-case">
                Admin
              </Badge>
              admin@restaurant.com — full access
            </li>
            <li>
              <Badge variant="outline" className="mr-1 normal-case">
                POS
              </Badge>
              pos@restaurant.com — register only
            </li>
            <li>
              <Badge variant="outline" className="mr-1 normal-case">
                Kitchen
              </Badge>
              kitchen@restaurant.com — kitchen display
            </li>
          </ul>
          <p className="mt-3 text-charcoal-muted/80">Default password: changeme</p>
        </div>
      </div>
    </div>
  );
}
