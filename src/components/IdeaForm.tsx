"use client";

import { keepValues } from "./forms";
import { useActionState, useRef, useState } from "react";
import { addIdea, previewLink } from "@/app/actions/ideas";
import { uploadImage } from "@/app/actions/uploads";
import { burst, originOf } from "./confetti";

const MAX_IMAGES = 6;

/** Shrinks a photo to at most 1280px and ~700KB of JPEG before it leaves the browser. */
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  for (const [maxSide, quality] of [[1280, 0.82], [1024, 0.75], [800, 0.7]] as const) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size < 700_000) return blob;
  }
  throw new Error("That photo is too big, even after shrinking.");
}

export function IdeaForm({ partyId }: { partyId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const lastPreviewed = useRef("");

  const [state, action, pending] = useActionState(
    async (prev: { error?: string } | undefined, form: FormData) => {
      const res = await addIdea(partyId, prev, form);
      if (!res?.error) {
        if (submitRef.current) burst(originOf(submitRef.current));
        formRef.current?.reset();
        setName("");
        setLink("");
        setImages([]);
        setPrice(null);
        setHint(null);
        setOpen(false);
      }
      return res;
    },
    undefined,
  );

  function addImage(url: string) {
    setImages((imgs) => (imgs.includes(url) || imgs.length >= MAX_IMAGES ? imgs : [...imgs, url]));
  }

  async function fetchPreview(raw: string) {
    const url = raw.trim();
    if (!/^https?:\/\//.test(url) || url === lastPreviewed.current) return;
    lastPreviewed.current = url;
    setBusy("Peeking at that link…");
    setHint(null);
    const res = await previewLink(url);
    setBusy(null);
    if ("error" in res) return setHint(`No preview: ${res.error}`);
    if (res.title && !name.trim()) setName(res.title);
    if (res.image) addImage(res.image);
    if (!res.title && !res.image) setHint("That link didn't share a preview. Add photos below!");
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setHint(null);
    for (const file of [...files].slice(0, MAX_IMAGES - images.length)) {
      setBusy(`Uploading ${file.name}…`);
      try {
        const fd = new FormData();
        fd.set("file", new File([await downscale(file)], "photo.jpg", { type: "image/jpeg" }));
        const res = await uploadImage(fd);
        if ("error" in res) setHint(res.error);
        else addImage(res.url);
      } catch (e) {
        setHint(e instanceof Error ? e.message : "Upload failed.");
      }
    }
    setBusy(null);
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary w-full py-3 text-lg" onClick={() => setOpen(true)}>
        ➕ Add an idea
      </button>
    );
  }

  return (
    <form ref={formRef} onSubmit={keepValues(action)} className="card flex flex-col gap-4 border-pink animate-pop">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">New idea 💡</h3>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>

      <label>
        <span className="label">Google Maps or website link</span>
        <input
          className="input"
          name="link"
          type="url"
          inputMode="url"
          placeholder="https://maps.app.goo.gl/…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onBlur={() => fetchPreview(link)}
          onPaste={(e) => fetchPreview(e.clipboardData.getData("text"))}
        />
        <span className="mt-1 block text-xs text-ink-soft">We&apos;ll try to grab the name and a photo for you.</span>
      </label>

      <label>
        <span className="label">Name</span>
        <input
          className="input"
          name="name"
          required
          maxLength={100}
          placeholder="Bowling + tacos at Lucky Strike"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div>
        <span className="label">Photos</span>
        <input type="hidden" name="images" value={JSON.stringify(images)} />
        {images.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {images.map((src) => (
              <span key={src} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied hosts */}
                <img src={src} alt="" className="h-20 w-28 rounded-xl border-2 border-line object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-ink text-xs text-white"
                  onClick={() => setImages((imgs) => imgs.filter((i) => i !== src))}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        {images.length < MAX_IMAGES && (
          <div className="flex flex-wrap gap-2">
            <input
              className="input min-w-0 flex-1"
              type="url"
              placeholder="Paste an image link"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (/^https?:\/\//.test(imageUrl.trim())) addImage(imageUrl.trim());
                  setImageUrl("");
                }
              }}
            />
            <button
              type="button"
              className="btn btn-small"
              disabled={!/^https?:\/\//.test(imageUrl.trim())}
              onClick={() => {
                addImage(imageUrl.trim());
                setImageUrl("");
              }}
            >
              Add
            </button>
            <label className="btn btn-small btn-sun cursor-pointer">
              📷 Upload
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
            </label>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="label">Price level</span>
          <input type="hidden" name="priceLevel" value={price ?? ""} />
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setPrice(price === lvl ? null : lvl)}
                className={`flex-1 rounded-xl border-2 py-1.5 font-bold transition ${
                  price === lvl ? "border-mint bg-mint text-white" : "border-line bg-white text-ink-soft hover:border-mint"
                }`}
              >
                {"$".repeat(lvl)}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span className="label">Cost per person (USD)</span>
          <input className="input" name="costPerPerson" type="number" min={0} step="0.01" placeholder="45" />
        </label>
      </div>
      <label>
        <span className="label">Cost notes</span>
        <input className="input" name="costNotes" maxLength={200} placeholder="Drinks extra, group deal for 10+" />
      </label>
      <label>
        <span className="label">Why it&apos;s great</span>
        <textarea className="input min-h-20" name="notes" maxLength={1000} placeholder="Private room, karaoke, amazing dumplings…" />
      </label>

      {(busy || hint) && <p className="text-sm font-semibold text-ink-soft">{busy ?? hint}</p>}
      {state?.error && <p className="error-box">{state.error}</p>}
      <button ref={submitRef} className="btn btn-primary" disabled={pending || Boolean(busy)}>
        {pending ? "Adding…" : "Add idea ✨"}
      </button>
    </form>
  );
}
