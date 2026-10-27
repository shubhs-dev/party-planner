import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "./Avatar";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/join" className="btn btn-small">
        Join the fun
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Avatar animal={user.animal} name={user.name} size="sm" />
      <span className="hidden font-bold sm:inline">{user.name}</span>
      <form action={logout}>
        <button className="btn-ghost" type="submit">
          Log out
        </button>
      </form>
    </div>
  );
}
