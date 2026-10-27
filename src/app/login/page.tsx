import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { safeNext } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-center text-4xl font-bold">Welcome back! 🥳</h1>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link className="font-bold text-pink underline" href={`/join?next=${encodeURIComponent(next)}`}>
          Pick your animal
        </Link>
      </p>
    </div>
  );
}
