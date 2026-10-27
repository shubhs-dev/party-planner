import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Party Planner 🎉",
  description: "Pitch ideas, vote, pick a date. Party.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight">
            <span className="inline-block animate-float">🎉</span> Party<span className="text-pink">Planner</span>
          </Link>
          <Suspense>
            <UserMenu />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">{children}</main>
        <footer className="py-6 text-center text-xs text-ink-soft">
          Animal art by{" "}
          <a className="underline" href="https://github.com/jdecked/twemoji" target="_blank" rel="noreferrer">
            Twemoji
          </a>{" "}
          (CC-BY 4.0)
        </footer>
      </body>
    </html>
  );
}
