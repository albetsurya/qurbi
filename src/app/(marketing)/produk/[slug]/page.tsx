import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faCircleCheck, faRotateLeft, faSyringe, faVideo, faWeightScale, faCakeCandles } from "@fortawesome/free-solid-svg-icons";
import { prisma } from "@/lib/prisma";
import ProductImageCarousel from "@/components/product/ProductImageCarousel";
import ProductActions from "@/components/product/ProductActions";
import { TrackProductView } from "@/components/product/ProductTracking";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatRupiah, formatWeight } from "@/lib/utils";

export const revalidate = 300;

export default async function ProdukDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.livestock.findUnique({
    where: { slug },
    include: { breeder: true },
  });
  if (!product || !product.isActive) notFound();

  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const vaccines = Array.isArray(product.vaccines) ? (product.vaccines as { name: string; date: string }[]) : [];

  return (
    <div className="pb-24">
      <TrackProductView productId={product.id} />
      <ProductImageCarousel images={images} name={product.name} />

      <div className="container-app space-y-5 py-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">{product.type}</Badge>
            <Badge variant="neutral">{product.purpose === "BOTH" ? "Qurban & Aqiqah" : product.purpose}</Badge>
            {product.isVerified && (
              <Badge variant="verified"><FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />Terverifikasi</Badge>
            )}
          </div>
          <h1 className="font-heading text-h1 font-bold">{product.name}</h1>
          <p className="font-heading text-display font-bold text-primary">{formatRupiah(Number(product.price))}</p>
        </div>

        <Card>
          <h2 className="mb-3 font-heading text-h3 font-semibold">Spesifikasi</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faWeightScale} className="h-4 w-4 text-secondary" />
              <div><dt className="text-ink-muted text-xs">Bobot</dt><dd className="font-semibold">{formatWeight(Number(product.weightKg))}</dd></div>
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCakeCandles} className="h-4 w-4 text-secondary" />
              <div><dt className="text-ink-muted text-xs">Umur</dt><dd className="font-semibold">{product.ageMonths} bulan</dd></div>
            </div>
            <div><dt className="text-ink-muted text-xs">Jenis Kelamin</dt><dd className="font-semibold">{product.gender}</dd></div>
            <div><dt className="text-ink-muted text-xs">Stok</dt><dd className="font-semibold">{product.stock} ekor</dd></div>
          </dl>
        </Card>

        {product.description && (
          <Card><h2 className="mb-2 font-heading text-h3 font-semibold">Deskripsi</h2>
            <p className="text-sm leading-relaxed text-ink-muted">{product.description}</p></Card>
        )}

        {vaccines.length > 0 && (
          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-heading text-h3 font-semibold">
              <FontAwesomeIcon icon={faSyringe} className="h-4 w-4 text-secondary" /> Riwayat Vaksin
            </h2>
            <ul className="space-y-2 text-sm">
              {vaccines.map((v, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span>{v.name}</span>
                  <span className="text-xs text-ink-muted">{v.date}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <h2 className="mb-2 font-heading text-h3 font-semibold">Peternak</h2>
          <p className="font-semibold">{product.breeder.name}</p>
          <p className="text-sm text-ink-muted">{product.breeder.location}</p>
          {product.breeder.isVerified && (
            <Badge variant="verified"><FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />Peternak Terverifikasi</Badge>
          )}
        </Card>

        {product.cctvUrl && (
          <Card>
            <h2 className="mb-2 flex items-center gap-2 font-heading text-h3 font-semibold">
              <FontAwesomeIcon icon={faVideo} className="h-4 w-4 text-secondary" /> Live CCTV Kandang
            </h2>
            <iframe
              src={product.cctvUrl}
              title={`CCTV ${product.name}`}
              className="aspect-video w-full rounded-control"
              sandbox="allow-scripts allow-same-origin"
              allowFullScreen
            />
          </Card>
        )}

        <div className="grid gap-2 rounded-card bg-primary/5 p-4 text-xs leading-relaxed">
          <p className="flex items-start gap-2">
            <FontAwesomeIcon icon={faRotateLeft} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span><strong>Garansi diganti baru</strong> jika hewan sakit/mati sebelum Hari-H, tanpa biaya tambahan.</span>
          </p>
          <p className="flex items-start gap-2">
            <FontAwesomeIcon icon={faCamera} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span><strong>Laporan foto & video penyembelihan</strong> dikirim ke WhatsApp kamu sebagai bukti distribusi.</span>
          </p>
        </div>
      </div>

      <ProductActions
        livestockId={product.id}
        slug={product.slug}
        name={product.name}
        type={product.type}
        price={Number(product.price)}
        image={images[0] ?? ""}
        weightKg={Number(product.weightKg)}
        stock={product.stock}
      />
    </div>
  );
}
