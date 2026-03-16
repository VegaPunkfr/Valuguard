"use client";

import { useEffect, useRef } from "react";

export default function Section({
  delay = 0,
  style,
  className,
  children,
}: {
  delay?: number;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (delay) {
      el.style.transitionDelay = `${delay}ms`;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("gt-scroll-reveal--visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.06 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <section
      ref={ref}
      className={`gt-scroll-reveal ${className || ""}`}
      style={{ marginBottom: 0, ...style }}
    >
      {children}
    </section>
  );
}
