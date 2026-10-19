import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { phone: "081234567890" },
    update: { role: "ADMIN" },
    create: {
      phone: "081234567890",
      name: "Admin QurbanKu",
      email: "admin@qurbanku.id",
      role: "ADMIN",
    },
  });
  console.log("Admin:", admin.phone);

  const ternakMakmur = await prisma.breeder.upsert({
    where: { id: "breeder-ternak-makmur" },
    update: {},
    create: {
      id: "breeder-ternak-makmur",
      name: "Ternak Makmur Farm",
      location: "Bogor, Jawa Barat",
      isVerified: true,
      rating: 4.9,
      reviewCount: 132,
    },
  });

  const barokah = await prisma.breeder.upsert({
    where: { id: "breeder-barokah" },
    update: {},
    create: {
      id: "breeder-barokah",
      name: "Kandang Barokah",
      location: "Cianjur, Jawa Barat",
      isVerified: true,
      rating: 4.7,
      reviewCount: 89,
    },
  });

  const dummy = [
    {
      slug: "kambing-jawa-25kg",
      name: "Kambing Jawa Super 25kg",
      type: "KAMBING" as const,
      purpose: "BOTH" as const,
      price: 2750000,
      weightKg: 25,
      ageMonths: 14,
      gender: "JANTAN" as const,
      stock: 8,
      description:
        "Kambing Jawa sehat, gemuk, dan terawat. Cocok untuk qurban maupun aqiqah. Sudah melalui pemeriksaan kesehatan hewan.",
      images: [
        "https://picsum.photos/seed/kambing-jawa-1/800/800",
        "https://picsum.photos/seed/kambing-jawa-2/800/800",
        "https://picsum.photos/seed/kambing-jawa-3/800/800",
      ],
      vaccines: [
        { name: "Enterotoxemia", date: "2026-05-10" },
        { name: "Antraks", date: "2026-06-01" },
      ],
      isVerified: true,
      breederId: ternakMakmur.id,
    },
    {
      slug: "domba-garut-30kg",
      name: "Domba Garut 30kg",
      type: "DOMBA" as const,
      purpose: "QURBAN" as const,
      price: 4200000,
      weightKg: 30,
      ageMonths: 16,
      gender: "JANTAN" as const,
      stock: 5,
      description: "Domba Garut asli dengan bulu tebal dan postur ideal. Termasuk jasa sembelih syar'i.",
      images: [
        "https://picsum.photos/seed/domba-garut-1/800/800",
        "https://picsum.photos/seed/domba-garut-2/800/800",
      ],
      vaccines: [{ name: "Enterotoxemia", date: "2026-05-20" }],
      isVerified: true,
      breederId: barokah.id,
    },
    {
      slug: "sapi-limosin-350kg",
      name: "Sapi Limousin 350kg",
      type: "SAPI" as const,
      purpose: "QURBAN" as const,
      price: 24500000,
      weightKg: 350,
      ageMonths: 24,
      gender: "JANTAN" as const,
      stock: 3,
      description:
        "Sapi Limousin premium bobot 350kg. Bisa patungan 1/7 (seperangkat). Termasuk dokumen kesehatan lengkap.",
      images: [
        "https://picsum.photos/seed/sapi-limosin-1/800/800",
        "https://picsum.photos/seed/sapi-limosin-2/800/800",
        "https://picsum.photos/seed/sapi-limosin-3/800/800",
      ],
      vaccines: [
        { name: "FMD (PMK)", date: "2026-04-15" },
        { name: "Antraks", date: "2026-05-01" },
      ],
      isVerified: true,
      breederId: ternakMakmur.id,
    },
    {
      slug: "kambing-etawa-28kg",
      name: "Kambing Etawa 28kg",
      type: "KAMBING" as const,
      purpose: "AQIQAH" as const,
      price: 3200000,
      weightKg: 28,
      ageMonths: 12,
      gender: "JANTAN" as const,
      stock: 6,
      description: "Kambing Etawa jantan, badan besar dan tenang. Favorit untuk aqiqah anak.",
      images: [
        "https://picsum.photos/seed/kambing-etawa-1/800/800",
        "https://picsum.photos/seed/kambing-etawa-2/800/800",
      ],
      vaccines: [{ name: "Enterotoxemia", date: "2026-06-10" }],
      isVerified: false,
      breederId: barokah.id,
    },
    {
      slug: "sapi-simental-400kg",
      name: "Sapi Simental 400kg",
      type: "SAPI" as const,
      purpose: "QURBAN" as const,
      price: 27500000,
      weightKg: 400,
      ageMonths: 28,
      gender: "JANTAN" as const,
      stock: 2,
      description: "Sapi Simental super besar. Hidup jinak, kondisi gemuk, siap qurban.",
      images: ["https://picsum.photos/seed/sapi-simental-1/800/800"],
      vaccines: [{ name: "FMD (PMK)", date: "2026-04-20" }],
      isVerified: true,
      breederId: barokah.id,
    },
    {
      slug: "domba-texel-27kg",
      name: "Domba Texel 27kg",
      type: "DOMBA" as const,
      purpose: "AQIQAH" as const,
      price: 3600000,
      weightKg: 27,
      ageMonths: 11,
      gender: "JANTAN" as const,
      stock: 10,
      description: "Domba Texel daging tebal, pertumbuhan cepat. Stok melimpah untuk aqiqah.",
      images: ["https://picsum.photos/seed/domba-texel-1/800/800"],
      vaccines: [],
      isVerified: false,
      breederId: ternakMakmur.id,
    },
  ];

  for (const d of dummy) {
    await prisma.livestock.upsert({
      where: { slug: d.slug },
      update: {},
      create: d,
    });
  }
  console.log("Seeded", dummy.length, "produk hewan");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
