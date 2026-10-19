import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@/components/ui/badge";
import { TrackProductClick } from "./ProductTracking";
import type { ProductListItem } from "@/lib/queries/products";
import { formatRupiah, formatWeight } from "@/lib/utils";

export default function ProductGrid({ items }: { items: ProductListItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {items.map((p) => {
        const outOfStock = p.stock <= 0;
        const lowStock = !outOfStock && p.stock <= 5;
        return (
        <li key={p.id}>
          <TrackProductClick productId={p.id}>
          <Link
              href={`/produk/${p.slug}`}
              aria-disabled={outOfStock}
              className="btn-press group block overflow-hidden rounded-card bg-surface shadow-subtle transition-shadow duration-200 hover:shadow-medium"
            >
              <div className="relative aspect-square overflow-hidden bg-black/5">
                <Image
                  src={p.images?.[0] || `https://picsum.photos/seed/${p.slug}/600/600`}
                  alt={p.name}
                  fill
                  sizes="50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                  {p.isVerified && (
                    <Badge variant="verified" className="bg-surface/95 shadow-subtle backdrop-blur">
                      <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />
                      Terverifikasi
                    </Badge>
                  )}
                  {outOfStock ? (
                    <Badge variant="error" className="bg-surface/95 shadow-subtle backdrop-blur">
                      Stok habis
                    </Badge>
                  ) : lowStock ? (
                    <Badge variant="warning" className="bg-surface/95 shadow-subtle backdrop-blur">
                      Tersisa {p.stock} ekor
                    </Badge>
                  ) : (
                    <Badge variant="success" className="bg-surface/95 shadow-subtle backdrop-blur">
                      Tersedia
                    </Badge>
                  )}
                  {p.type === "SAPI" && !outOfStock && (
                    <Badge variant="primary" className="bg-surface/95 shadow-subtle backdrop-blur">
                      Bisa patungan 1/7
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-ink-muted">
                  {formatWeight(p.weightKg)} · {p.type}
                </p>
                <p className="font-heading text-sm font-bold text-primary">{formatRupiah(p.price)}</p>
              </div>
            </Link>
          </TrackProductClick>
          </li>
        );
      })}
    </ul>
  );
}
