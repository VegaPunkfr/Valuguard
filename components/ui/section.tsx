"use client";

import { motion } from "framer-motion";
import { reveal, revealTransition } from "@/lib/tokens";

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
  return (
    <motion.section
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.06 }}
      transition={revealTransition(delay)}
      style={{ marginBottom: 0, ...style }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
