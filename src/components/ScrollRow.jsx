import { useCallback, useEffect, useRef, useState } from "react";

const SCROLL_STEP = 274;

const ScrollRow = ({ children }) => {
  const ref = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true });
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [update]);

  const scroll = (dir) => {
    ref.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: "smooth" });
  };

  return (
    <div className="scroll-row-wrap">
      {canScrollLeft && (
        <button
          type="button"
          className="scroll-row-btn scroll-row-btn-prev"
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
        >
          ‹
        </button>
      )}
      <div ref={ref} className="home-scroll-row">
        {children}
      </div>
      {canScrollRight && (
        <button
          type="button"
          className="scroll-row-btn scroll-row-btn-next"
          onClick={() => scroll(1)}
          aria-label="Scroll right"
        >
          ›
        </button>
      )}
    </div>
  );
};

export default ScrollRow;
