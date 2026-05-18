import { motion } from "motion/react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hover = false, onClick }: CardProps) {
  const baseStyles =
    "bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden";
  const hoverStyles = hover
    ? "cursor-pointer transition-all duration-200 hover:border-primary/20 hover:shadow-lg"
    : "transition-colors";

  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -3, boxShadow: "0 18px 36px rgba(34, 34, 34, 0.1)" }}
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
