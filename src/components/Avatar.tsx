import { animalImage, getAnimal } from "@/lib/animals";

const SIZES = { xs: "size-6 p-0.5", sm: "size-9 p-1", md: "size-12 p-1.5", lg: "size-20 p-3", xl: "size-28 p-4" };

export function Avatar({
  animal,
  name,
  size = "md",
  className = "",
}: {
  animal: string;
  name?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const a = getAnimal(animal);
  const hue = a?.hue ?? 0;
  return (
    <span
      title={name ? `${name} the ${a?.name ?? "animal"}` : a?.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-white ${SIZES[size]} ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 95% 85%), hsl(${(hue + 40) % 360} 90% 72%))` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG, no optimisation needed */}
      <img src={animalImage(animal)} alt={a?.name ?? animal} className="size-full" draggable={false} />
    </span>
  );
}

export function AvatarStack({ people, max = 8 }: { people: { id: string; name: string; animal: string }[]; max?: number }) {
  const shown = people.slice(0, max);
  return (
    <span className="inline-flex items-center">
      {shown.map((p, i) => (
        <Avatar key={p.id} animal={p.animal} name={p.name} size="xs" className={i ? "-ml-1.5" : ""} />
      ))}
      {people.length > max && <span className="ml-1 text-xs font-bold text-ink-soft">+{people.length - max}</span>}
    </span>
  );
}
