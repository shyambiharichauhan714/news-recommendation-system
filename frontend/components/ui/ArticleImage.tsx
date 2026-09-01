"use client";

// Article thumbnail with a guaranteed floor.
//
// The real photo comes from the Unsplash CDN. If that request errors — or
// simply never resolves, which is how the previous host failed (503 behind an
// IPv6-only DNS answer, so onError never fired and cards sat blank forever) —
// this swaps in the locally generated SVG instead. There is no state in which
// the card renders an empty box.

import { useEffect, useRef, useState } from "react";
import { photoFor } from "@/lib/photos";
import { thumbnailFor } from "@/lib/placeholder";

const STALL_TIMEOUT_MS = 4000;

interface ArticleImageProps {
  article: { news_id: string; category: string; subcategory?: string; title?: string };
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
  /** Skip lazy loading for above-the-fold images (e.g. the reader modal). */
  eager?: boolean;
}

export default function ArticleImage({
  article,
  className,
  alt = "",
  width = 600,
  height = 400,
  eager,
}: ArticleImageProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A hung request fires neither load nor error, so a timer is the only way
  // out. It must not start until the browser has actually begun fetching:
  // a lazy image still below the fold is also "not complete", and timing that
  // out would swap every off-screen card to the fallback for no reason.
  useEffect(() => {
    setFailed(false);
    const img = imgRef.current;
    if (!img) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const armStallTimer = () => {
      if (timer || img.complete) return;
      timer = setTimeout(() => {
        if (!img.complete) setFailed(true);
      }, STALL_TIMEOUT_MS);
    };

    // currentSrc is populated once the fetch has been kicked off.
    if (img.currentSrc) armStallTimer();

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) armStallTimer();
      },
      { rootMargin: "200px" }
    );
    observer.observe(img);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [article.news_id]);

  const src = failed
    ? thumbnailFor(article)
    : photoFor(article, width, height);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}
