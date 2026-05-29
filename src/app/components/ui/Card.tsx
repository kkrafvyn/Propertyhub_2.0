import { motion } from "motion/react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hover = false, onClick }: CardProps) {
  const baseStyles =
    "bg-card/95 text-card-foreground rounded-2xl border border-border/70 shadow-[0_18px_45px_rgba(15,23,42,0.06)] overflow-hidden backdrop-blur-sm";
  const hoverStyles = hover
    ? "cursor-pointer transition-all duration-200 hover:border-primary/25 hover:shadow-[0_24px_60px_rgba(255,45,92,0.12)]"
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
