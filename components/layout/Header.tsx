import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/Button";
import type { SessionUser } from "@/lib/session-types";

type HeaderProps = {
  user?: SessionUser | null;
};

export function Header({ user }: HeaderProps) {
  return (
    <header className="fixed top-0 z-40 w-full border-b border-brand-200/60 bg-white/95 shadow-header backdrop-blur-md">
      <div className="h-1 w-full bg-brand-gradient" aria-hidden />
      <div className="flex h-[3.75rem] items-center justify-between px-4 text-charcoal md:px-6">
        <Link href="/" className="flex items-center gap-4 transition-opacity hover:opacity-90">
          <Image
            src="/servora-logo.png"
            alt="Servora"
            width={160}
            height={48}
            priority
            className="h-9 w-auto md:h-10"
          />
        </Link>
        <p className="ml-4 hidden flex-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700/80 lg:block">
          Smart POS · Better Service · Growing Together
        </p>
        {user ? (
          <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="hidden rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-200 sm:inline">
              {user.businessName}
            </span>
            <UserMenu user={user} />
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" variant="secondary">
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
