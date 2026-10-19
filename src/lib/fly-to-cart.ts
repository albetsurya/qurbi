/** Animasi micro-fly: menerbangkan thumbnail produk ke ikon keranjang di header. */
export function flyToCart(imageUrl: string, fromEl: HTMLElement | null): boolean {
  try {
    const target = document.querySelector("[data-cart-icon]");
    if (!target || !fromEl || !imageUrl) return false;
    const from = fromEl.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (from.width === 0) return false;

    const size = Math.min(72, from.width);
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    Object.assign(img.style, {
      position: "fixed",
      left: `${from.left + from.width / 2 - size / 2}px`,
      top: `${from.top}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "0.75rem",
      objectFit: "cover",
      zIndex: "60",
      pointerEvents: "none",
      boxShadow: "0 8px 24px rgb(0 0 0 / 0.25)",
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(img);

    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - from.top;
    const anim = img.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(0.55)`, opacity: 0.9, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.4 },
      ],
      { duration: 650, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)" }
    );
    const done = () => {
      img.remove();
      window.dispatchEvent(new CustomEvent("qbk:cart-pulse"));
    };
    anim.onfinish = done;
    anim.oncancel = done;
    return true;
  } catch {
    return false;
  }
}

export function pulseCartIcon() {
  try {
    window.dispatchEvent(new CustomEvent("qbk:cart-pulse"));
  } catch {
    // abaikan
  }
}
