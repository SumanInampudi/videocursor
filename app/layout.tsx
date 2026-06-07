import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ShellSwitcher } from "@/components/layout/ShellSwitcher";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { getAuthContext } from "@/lib/auth";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#F5A623",
};

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Servora Inventory",
  description: "Smart inventory management for food service — track stock and calculate recipe yields.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuthContext();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>
          <ShellSwitcher userRoles={auth.roles} user={auth.user}>
            {children}
          </ShellSwitcher>
        </ThemeProvider>
      </body>
    </html>
  );
}
