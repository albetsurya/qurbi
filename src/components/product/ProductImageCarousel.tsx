"use client";

import { useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

export default function ProductImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const imgs = images.length > 0 ? images : [`https://picsum.photos/seed/${encodeURIComponent(name)}/800/800`];
  const current = imgs[Math.min(index, imgs.length - 1)];

  return (
    <div className="relative aspect-square w-full bg-black/5">
      <Image
        src={current}
        alt={`Foto ${name} ${index + 1}`}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {imgs.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Foto sebelumnya"
            onClick={() => setIndex((i) => (i - 1 + imgs.length) % imgs.length)}
            className="btn-press absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-pill bg-surface/90 text-ink shadow-subtle"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Foto berikutnya"
            onClick={() => setIndex((i) => (i + 1) % imgs.length)}
            className="btn-press absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-pill bg-surface/90 text-ink shadow-subtle"
          >
            <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {imgs.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-pill transition-all",
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
