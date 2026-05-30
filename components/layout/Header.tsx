import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="flex h-16 items-center border-b border-gray-200 bg-white px-6">
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
      <p className="ml-6 hidden text-xs uppercase tracking-wide text-gray-500 sm:block">
        Smart POS · Better Service · Growing Together
      </p>
    </header>
  );
}
