import { Link, useLocation } from "react-router";
import { buttonVariants } from "../../components/ui/Button";
import { CONSUMER_ROUTES } from "../../lib/consumer-routes";
import { cn } from "../../components/ui/utils";

const LINKS = [
  { href: CONSUMER_ROUTES.mortgage, label: "Mortgage" },
  { href: CONSUMER_ROUTES.insurance, label: "Insurance" },
  { href: CONSUMER_ROUTES.vendors, label: "Vendors" },
] as const;

export function FinancialServicesNav() {
  const location = useLocation();

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          className={cn(
            buttonVariants({
              size: "sm",
              variant: location.pathname === link.href ? "default" : "outline",
            }),
          )}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
