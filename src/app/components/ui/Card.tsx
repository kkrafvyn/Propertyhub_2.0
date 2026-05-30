import { motion } from "motion/react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hover = false, onClick }: CardProps) {
  const baseStyles =
    "bg-white/92 text-card-foreground rounded-[1.75rem] border border-white/80 shadow-[0_18px_48px_rgba(255,56,92,0.08)] ring-1 ring-black/[0.03] overflow-hidden backdrop-blur-xl";
  const hoverStyles = hover
    ? "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_24px_60px_rgba(255,45,92,0.14)]"
    : "transition-colors";

  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -3, boxShadow: "0 24px 60px rgba(255, 45, 92, 0.12)" }}
        className={`${baseStyles} ${hoverStyles} ${className}`}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${baseStyles} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
