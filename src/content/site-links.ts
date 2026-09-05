import { WORKSPACE_ENTRY_PATH } from "../lib/workspace";
import { CONSUMER_ROUTES } from "../app/lib/consumer-routes";
import { FOOTER_LEGAL_LINKS, getLegalPath } from "./legal";

/** Public routes that exist in the app router (consumer + legal + workspace entry). */
export const SITE_MAP_SECTIONS = [
  {
    title: "Discover",
    links: [
      { label: "Home", to: CONSUMER_ROUTES.home },
      { label: "Search homes", to: CONSUMER_ROUTES.search },
      { label: "For rent", to: "/search?listingType=rental" },
      { label: "For sale", to: "/search?listingType=sale" },
      { label: "For lease", to: "/search?listingType=lease" },
      { label: "Short stays", to: "/search?listingType=short_stay" },
      { label: "Verified listings", to: "/search?verified=1" },
      { label: "Compare homes", to: CONSUMER_ROUTES.compare },
      { label: "Property explorer", to: "/explorer" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Centre", to: "/help" },
      { label: "Safety", to: "/legal/safety" },
      { label: "Cancellation options", to: "/cancellation" },
      { label: "Trust & Verification", to: "/legal/trust-verification" },
      { label: "File a complaint", to: "/complaint" },
      { label: "System status", to: "/status" },
    ],
  },
  {
    title: "Hosting & workspace",
    links: [
      { label: "List your property", to: `${WORKSPACE_ENTRY_PATH}?next=new` },
      { label: "Host resources", to: "/host-resources" },
      { label: "Agency workspace", to: WORKSPACE_ENTRY_PATH },
      { label: "Workspace enrollment", to: "/enrollment" },
      { label: "Refer a friend", to: "/referral" },
      { label: "Host terms", to: "/legal/host-terms" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Sign in", to: CONSUMER_ROUTES.login },
      { label: "Create account", to: "/signup" },
      { label: "Saved homes", to: CONSUMER_ROUTES.saved },
      { label: "Messages", to: CONSUMER_ROUTES.messages },
      { label: "Viewings & offers", to: CONSUMER_ROUTES.viewings },
      { label: "Leases & e-sign", to: CONSUMER_ROUTES.leases },
      { label: "Payments & wallet", to: CONSUMER_ROUTES.wallet },
      { label: "Identity verification", to: CONSUMER_ROUTES.kyc },
      { label: "Settings", to: CONSUMER_ROUTES.settings },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      ...FOOTER_LEGAL_LINKS.map((item) => ({
        label: item.label,
        to: getLegalPath(item.slug),
      })),
      { label: "All policies", to: "/legal" },
      { label: "E-signatures", to: "/legal/e-signatures" },
      { label: "Acceptable use", to: "/legal/acceptable-use" },
    ],
  },
] as const;

export const FOOTER_SUPPORT_LINKS = [
  { labelKey: "footer.helpCentre", to: "/help" },
  { labelKey: "footer.safety", to: "/legal/safety" },
  { labelKey: "footer.cancellation", to: "/cancellation" },
] as const;

export const FOOTER_HOSTING_LINKS: Array<{
  labelKey: string;
  to: string;
  useListPropertyPath?: boolean;
}> = [
  { labelKey: "footer.listProperty", to: `${WORKSPACE_ENTRY_PATH}?next=new`, useListPropertyPath: true },
  { labelKey: "footer.hostResources", to: "/host-resources" },
  { labelKey: "footer.workspaceEnrollment", to: "/enrollment" },
  { labelKey: "footer.referrals", to: "/referral" },
];

export const FOOTER_DISCOVER_LINKS = [
  { labelKey: "footer.searchHomes", to: CONSUMER_ROUTES.search },
  { labelKey: "footer.forRent", to: "/search?listingType=rental" },
  { labelKey: "footer.forSale", to: "/search?listingType=sale" },
  { labelKey: "footer.forLease", to: "/search?listingType=lease" },
  { labelKey: "footer.compare", to: CONSUMER_ROUTES.compare },
] as const;

export const FOOTER_COMPANY_LINKS = [
  { labelKey: "footer.about", to: "/about" },
  { labelKey: "footer.careers", to: "/careers" },
  { labelKey: "footer.contact", to: "/contact" },
] as const;
