type HtmlDivProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

interface CardProps extends HtmlDivProps {
  children: React.ReactNode;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false, onClick, ...props }: CardProps) {
  const baseStyles =
    "bg-card/90 dark:bg-card/80 backdrop-blur-xs rounded-2xl border border-border/80 dark:border-white/[0.08] shadow-xs dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] overflow-hidden transition-colors duration-200";
  const hoverStyles = hover
    ? "cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 dark:hover:border-white/20 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
    : "";

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`} onClick={onClick} {...props}>
      {children}
    </div>
  );
}
