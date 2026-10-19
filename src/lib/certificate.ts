/** Teks niat qurban siap salin. */
export function buildNiatText(names: string[], orderNumber: string): string {
  return (
    "Bismillahirrahmanirrahim.\n\n" +
    "Ya Allah, qurban ini diniatkan untuk:\n" +
    names.map((n, i) => `${i + 1}. ${n}`).join("\n") +
    `\n\nNomor pesanan: ${orderNumber} (QurbanKu).\n` +
    "Taqabbalallahu minna wa minkum."
  );
}

/** Gambar sertifikat qurban digital (PNG) lalu unduh — murni client-side via canvas. */
export function downloadCertificate(opts: { names: string[]; orderNumber: string; date: string }): void {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Latar + bingkai ganda
  ctx.fillStyle = "#FAF9F6";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#1B4332";
  ctx.lineWidth = 10;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.lineWidth = 3;
  ctx.strokeRect(60, 60, W - 120, H - 120);

  // Pita kepala
  ctx.fillStyle = "#1B4332";
  ctx.fillRect(60, 60, W - 120, 150);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = "700 52px Georgia, serif";
  ctx.fillText("QurbanKu", W / 2, 130);
  ctx.font = "400 28px Georgia, serif";
  ctx.fillStyle = "#D8F3DC";
  ctx.fillText("Qurban & Aqiqah Online", W / 2, 172);

  ctx.fillStyle = "#1B4332";
  ctx.font = "700 64px Georgia, serif";
  ctx.fillText("SERTIFIKAT QURBAN", W / 2, 300);
  ctx.fillStyle = "#6B7280";
  ctx.font = "400 30px Georgia, serif";
  ctx.fillText("Diberikan dengan bangga kepada shohibul qurban:", W / 2, 352);

  // Daftar nama
  ctx.fillStyle = "#1F2937";
  const startY = 440;
  const lineH = 72;
  const visible = opts.names.slice(0, 7);
  visible.forEach((n, i) => {
    ctx.font = "700 44px Georgia, serif";
    ctx.fillText(`${i + 1}. ${n}`, W / 2, startY + i * lineH);
  });

  const footY = startY + visible.length * lineH + 70;
  ctx.fillStyle = "#6B7280";
  ctx.font = "400 28px Georgia, serif";
  ctx.fillText(`Nomor pesanan: ${opts.orderNumber}`, W / 2, footY);
  ctx.fillText(opts.date, W / 2, footY + 44);

  ctx.fillStyle = "#40916C";
  ctx.font = "italic 400 30px Georgia, serif";
  ctx.fillText("\u201CTaqabbalallahu minna wa minkum\u201D", W / 2, H - 140);

  const a = document.createElement("a");
  a.download = `sertifikat-qurban-${opts.orderNumber}.png`;
  a.href = canvas.toDataURL("image/png");
  document.body.appendChild(a);
  a.click();
  a.remove();
}
