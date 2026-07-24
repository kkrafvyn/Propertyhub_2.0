type HtmlDivProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

interface CardProps extends HtmlDivProps {
  children: React.ReactNode;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false, onClick, ...props }: CardProps) {
  const baseStyles = "bg-card rounded-xl border border-border overflow-hidden";
  const hoverStyles = hover
    ? "cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
    : "";

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`} onClick={onClick} {...props}>
      {children}
    </div>
  );
}
