import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { getLegalPath, type LegalDocument } from "../../../content/legal";

export function LegalPolicyCard({ document }: { document: LegalDocument }) {
  return (
    <Link
      to={getLegalPath(document.slug)}
      className="group block rounded-2xl border border-surface-border/80 dark:border-white/[0.08] bg-surface/90 dark:bg-card/80 backdrop-blur-xs p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-forest/40 dark:hover:border-white/20 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-serif font-medium text-foreground tracking-tight text-base group-hover:text-primary transition-colors">
          {document.title}
        </span>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary shrink-0 mt-0.5" />
      </div>
      <p className="mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
        {document.description}
      </p>
    </Link>
  );
}
