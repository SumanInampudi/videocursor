import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "@/components/auth/UserMenu";
import type { SessionUser } from "@/lib/session-types";

type HeaderProps = {
  user?: SessionUser | null;
};

export function Header({ user }: HeaderProps) {
  return (
    <header className="fixed top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 text-gray-900 shadow-md md:px-6">
      <Link href="/" className="flex items-center gap-4">
        <Image
          src="/servora-logo.png"
          alt="Servora"
          width={160}
          height={48}
          priority
          className="h-10 w-auto"
        />
      </Link>
      <p className="ml-6 hidden flex-1 text-xs uppercase tracking-wide text-gray-500 lg:block">
        Smart POS · Better Service · Growing Together
      </p>
      {user ? (
        <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="hidden text-xs text-gray-500 sm:inline">{user.businessName}</span>
          <UserMenu user={user} />
        </div>
      ) : (
        <Link
          href="/login"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
        >
          Sign in
        </Link>
      )}
    </header>
  );
}
