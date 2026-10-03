/** DOM product previews — delegates to workspace-style compositions. */

import { ProductPresentation, type ProductPresentationVariant } from "./ProductPresentation";

export type ProductPreviewKind =
  | "listings"
  | "leads"
  | "payments"
  | "maintenance"
  | "portfolio"
  | "resident";

const KIND_TO_VARIANT: Record<ProductPreviewKind, ProductPresentationVariant> = {
  portfolio: "portfolio",
  listings: "dashboard",
  leads: "leasing",
  payments: "finance",
  maintenance: "maintenance",
  resident: "dashboard",
};

export function CinematicProductPreviews({
  kinds,
  layout = "grid",
  stage = 0,
}: {
  kinds: ProductPreviewKind[];
  layout?: "grid" | "stack";
  stage?: number;
}) {
  const primary = kinds[0];
  if (!primary) return null;
  const variant = KIND_TO_VARIANT[primary];

  return (
    <div
      className={`mk-cinema-product-previews mk-cinema-product-previews--${layout}`}
      aria-label="Product preview"
    >
      <ProductPresentation variant={variant} stage={stage} />
      <p className="mk-cinema-preview-note">Sample data for demonstration.</p>
    </div>
  );
}
