import { motion } from "motion/react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hover = false, onClick }: CardProps) {
  const baseStyles = "bg-card rounded-xl border border-border overflow-hidden";
  const hoverStyles = hover ? "cursor-pointer transition-all duration-200" : "";

  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0, 0, 0, 0.08)" }}
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
