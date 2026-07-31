import { Link, useLocation } from "react-router";
import { Card } from "../../../components/ui/Card";
import { REVENUE_NAV, resolveRevenueSection } from "./revenue-nav";
import { RevenueDashboard } from "./RevenueDashboard";
import { RevenueRuleEditor } from "./RevenueRuleEditor";
import { SubscriptionPlansEditor } from "./SubscriptionPlansEditor";
import { PromoCodesEditor } from "./PromoCodesEditor";
import { PaymentGatewaysEditor } from "./PaymentGatewaysEditor";
import { TaxesSettingsEditor } from "./TaxesSettingsEditor";

function renderSection(section: ReturnType<typeof resolveRevenueSection>) {
  switch (section) {
    case "dashboard":
      return <RevenueDashboard />;
    case "listing-fees":
      return (
        <RevenueRuleEditor
          category="listing_fees"
          title="Listing Fees"
          description="Premium and featured listing pricing by listing type."
          showListingTypes
        />
      );
    case "agency-plans":
      return <SubscriptionPlansEditor />;
    case "transaction-fees":
      return (
        <RevenueRuleEditor
          category="transaction_fees"
          title="Transaction Fees"
          description="Platform fees on property transactions."
        />
      );
    case "booking-fees":
      return (
        <RevenueRuleEditor
          category="booking_fees"
          title="Booking Fees"
          description="Guest and host commissions on short-stay bookings."
        />
      );
    case "escrow-fees":
      return (
        <RevenueRuleEditor
          category="escrow_fees"
          title="Escrow Fees"
          description="Fees applied when escrow holds are created or released."
        />
      );
    case "wallet-fees":
      return (
        <RevenueRuleEditor
          category="wallet_fees"
          title="Wallet Fees"
          description="Top-up and payout fees for BaytMiftah wallets."
        />
      );
    case "payment-settings":
      return <PaymentGatewaysEditor />;
    case "marketplace-commissions":
      return (
        <RevenueRuleEditor
          category="marketplace_commissions"
          title="Marketplace Commissions"
          description="Vendor marketplace commission rules."
        />
      );
    case "verification-fees":
      return (
        <RevenueRuleEditor
          category="verification_fees"
          title="Verification Fees"
          description="Agency, agent, and property verification pricing."
        />
      );
    case "enterprise-pricing":
      return (
        <RevenueRuleEditor
          category="enterprise_pricing"
          title="Enterprise Pricing"
          description="Setup and per-seat enterprise fees."
        />
      );
    case "promo-codes":
      return <PromoCodesEditor />;
    case "taxes":
      return <TaxesSettingsEditor />;
    default:
      return <RevenueDashboard />;
  }
}

export function AdminRevenueManagement() {
  const location = useLocation();
  const section = resolveRevenueSection(location.pathname);

  return (
    <div className="flex gap-6">
      <aside className="w-64 shrink-0">
        <Card className="p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 pb-2">
            Revenue Management
          </p>
          {REVENUE_NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </Card>
      </aside>
      <div className="flex-1 min-w-0">{renderSection(section)}</div>
    </div>
  );
}
