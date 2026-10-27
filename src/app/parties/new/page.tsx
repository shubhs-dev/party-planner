import { NewPartyForm } from "@/components/NewPartyForm";
import { requireUser } from "@/lib/auth";

export default async function NewPartyPage() {
  await requireUser("/parties/new");
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-4xl font-bold">Start a party 🎈</h1>
      <p className="mb-6 text-ink-soft">
        You&apos;ll be the organizer: you can move things along and break ties when needed.
      </p>
      <NewPartyForm />
    </div>
  );
}
