import { type ReactNode, type TouchEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bath,
  BedDouble,
  BriefcaseBusiness,
  Building,
  Building2,
  Calculator,
  CalendarDays,
  Camera,
  ChevronRight,
  CheckCircle2,
  Compass,
  Crown,
  Eye,
  Download,
  FileText,
  Fingerprint,
  GraduationCap,
  Globe2,
  Heart,
  Home,
  HousePlus,
  Bitcoin,
  KeyRound,
  Landmark,
  Leaf,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Mic,
  Moon,
  MoreVertical,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Radio,
  Shield,
  ShieldAlert,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  Share2,
  SlidersHorizontal,
  Star,
  Trophy,
  TrendingUp,
  Users,
  UserRound,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { APP_THEME_OPTIONS, useAppTheme } from "../context/AppThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  getUserDashboardSection,
  USER_DASHBOARD_ROUTE_CONFIG,
} from "../features/expansion/section-navigation";
import { communicationService, type NotificationRecord } from "../../lib/communication.service";
import { dealCaseService } from "../../lib/dealcase.service";
import { listingService } from "../../lib/listing.service";
import { messageService } from "../../lib/message.service";
import { mobileAppLockService, type MobileAppLockStatus } from "../../lib/mobile-app-lock.service";
import { mobileDeepLinkService } from "../../lib/mobile-deep-link.service";
import {
  mobileDocumentScannerService,
  type MobileScannedDocument,
} from "../../lib/mobile-document-scanner.service";
import { mobileMediaService, type MobileCapturedPhoto } from "../../lib/mobile-media.service";
import { mobileNativeService } from "../../lib/mobile-native.service";
import { mobileOnboardingService } from "../../lib/mobile-onboarding.service";
import { mobileOfflineQueueService } from "../../lib/mobile-offline-queue.service";
import { mobileOfflineSyncService } from "../../lib/mobile-offline-sync.service";
import { organizationService } from "../../lib/organization.service";
import { paymentService } from "../../lib/payment.service";
import { propertyViewingService } from "../../lib/property-viewing.service";
import { getPropertyCoverImage } from "../../lib/property-media";
import { pushNotificationService } from "../../lib/push-notification.service";
import { savedSearchAlertService } from "../../lib/saved-search-alert.service";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";
import { MobileShellProvider } from "./MobileShellContext";
import "./mobile.css";

type MobileTab =
  | "home"
  | "search"
  | "saved"
  | "messages"
  | "profile"
  | "insights"
  | "invest"
  | "valuation";

const mobileHomeCategories: Array<{
  label: string;
  detail: string;
  icon: typeof Home;
}> = [
  { label: "Apartments", detail: "340+ verified", icon: Building2 },
  { label: "Family Homes", detail: "190+ ready", icon: Home },
  { label: "Offices", detail: "80+ spaces", icon: BriefcaseBusiness },
  { label: "Luxury", detail: "Private picks", icon: Crown },
  { label: "Student Housing", detail: "Near campus", icon: GraduationCap },
];

const mobileHomeIntentFilters = [
  { label: "Rent", to: "/search?listingType=rental" },
  { label: "Buy", to: "/search?listingType=sale" },
  { label: "Short Stay", to: "/search?q=short%20stay" },
  { label: "Land", to: "/search?propertyType=land" },
  { label: "Commercial", to: "/search?propertyType=office" },
];

const mobileTrustIndicators: Array<{
  title: string;
  detail: string;
  icon: typeof Home;
}> = [
  { title: "Verified Properties", detail: "Reviewed documents and active moderation.", icon: ShieldCheck },
  { title: "Verified Agencies", detail: "Approved teams with public reputation signals.", icon: Building },
  { title: "Secure Transactions", detail: "Provider-neutral payments with audit trails.", icon: Wallet },
  { title: "Fraud Protection", detail: "Reports, risk checks, and human review.", icon: CheckCircle2 },
];

const mobileFallbackListings = [
  {
    id: "demo-airport-residential",
    listing_type: "rental",
    price: 18000,
    currency: "GHS",
    quality_score: 82,
    organization: { verified: true },
    property: {
      address: "45 Liberation Road, Airport Residential",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "Airport Residential",
      bedrooms: 2,
      bathrooms: 2,
      category: "Apartment",
    },
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=85&auto=format&fit=crop",
  },
  {
    id: "demo-labone-apartment",
    listing_type: "rental",
    price: 6200,
    currency: "GHS",
    quality_score: 79,
    organization: { verified: true },
    property: {
      address: "12 Fifth Avenue, Labone",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "Labone",
      bedrooms: 2,
      bathrooms: 2,
      category: "Apartment",
    },
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=85&auto=format&fit=crop",
  },
  {
    id: "demo-cantonments-villa",
    listing_type: "sale",
    price: 3200000,
    currency: "GHS",
    quality_score: 91,
    organization: { verified: true },
    property: {
      address: "7 Second Rangoon Close, Cantonments",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "Cantonments",
      bedrooms: 3,
      bathrooms: 3,
      category: "Villa",
    },
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=85&auto=format&fit=crop",
  },
  {
    id: "demo-east-legon-office",
    listing_type: "lease",
    price: 8500,
    currency: "GHS",
    quality_score: 84,
    organization: { verified: true },
    property: {
      address: "19 Lagos Avenue, East Legon",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "East Legon",
      bedrooms: 4,
      bathrooms: 4,
      category: "Office",
    },
    image:
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=900&q=85&auto=format&fit=crop",
  },
];

const mobileSearchResidences = [
  {
    id: "obsidian-pavilion",
    tag: "Limited Release",
    title: "The Obsidian Pavilion",
    price: "AED 42.5M",
    location: "Fairway Vistas, Dubai Hills",
    beds: 6,
    baths: 8,
    area: "12,400 sqft",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85&auto=format&fit=crop",
  },
  {
    id: "azure-heights",
    tag: "New Construction",
    title: "Azure Heights",
    price: "AED 28.9M",
    location: "Parkway Vistas, Dubai Hills",
    beds: 5,
    baths: 6,
    area: "9,800 sqft",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=85&auto=format&fit=crop",
  },
  {
    id: "palm-grove-villa",
    tag: "",
    title: "Palm Grove Villa",
    price: "AED 31.0M",
    location: "Sidra, Dubai Hills",
    beds: 6,
    baths: 7,
    area: "10,200 sqft",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=85&auto=format&fit=crop",
  },
];

const mobileExploreCategories = [
  {
    label: "Apartments",
    count: "1,240 verified",
    icon: Building2,
  },
  {
    label: "Family Homes",
    count: "845 verified",
    icon: Home,
  },
  {
    label: "Offices",
    count: "312 verified",
    icon: Building,
  },
  {
    label: "Luxury",
    count: "128 verified",
    icon: Star,
  },
];

const mobileExploreFeaturedListings = [
  {
    id: "east-legon-luxury-suites",
    title: "East Legon Luxury Suites",
    price: "$2,400",
    suffix: "/month",
    beds: 3,
    baths: 3,
    area: "2,400",
    image:
      "https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=900&q=90&auto=format&fit=crop",
  },
  {
    id: "labone-family-villa",
    title: "The Residence at Labone",
    price: "$1,950",
    suffix: "/month",
    beds: 5,
    baths: 4,
    area: "3,100",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=90&auto=format&fit=crop",
  },
  {
    id: "cantonments-office-loft",
    title: "Cantonments Office Loft",
    price: "$3,800",
    suffix: "/month",
    beds: 0,
    baths: 2,
    area: "1,850",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=90&auto=format&fit=crop",
  },
  {
    id: "airport-residential-townhome",
    title: "Airport Residential Townhome",
    price: "$4,600",
    suffix: "/month",
    beds: 4,
    baths: 4,
    area: "3,450",
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=900&q=90&auto=format&fit=crop",
  },
];

const mobileExploreAgents = [
  {
    name: "Kwame Mensah",
    agency: "Accra Prime Realty",
    rating: "4.9",
    listings: "142",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=220&q=90&auto=format&fit=crop",
  },
  {
    name: "Akosua Addo",
    agency: "Coastal Realty GH",
    rating: "5.0",
    listings: "118",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=220&q=90&auto=format&fit=crop",
  },
  {
    name: "Kojo Asare",
    agency: "Airport Homes GH",
    rating: "4.8",
    listings: "96",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=220&q=90&auto=format&fit=crop",
  },
  {
    name: "Ama Ofori",
    agency: "Cantonments Collective",
    rating: "4.9",
    listings: "104",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=220&q=90&auto=format&fit=crop",
  },
];

const mobileExploreAgencies = [
  { name: "Accra Prime Homes", initials: "APH" },
  { name: "Coastal Realty GH", initials: "CRG" },
  { name: "Airport Homes GH", initials: "AHG" },
  { name: "Cantonments Collective", initials: "CC" },
];

const mobileExploreRecentlyViewed = [
  {
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=420&q=90&auto=format&fit=crop",
    title: "Kitchen suite",
  },
  {
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=420&q=90&auto=format&fit=crop",
    title: "Sunset lounge",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=420&q=90&auto=format&fit=crop",
    title: "Gallery hall",
  },
];

const mobileAreaGuideGems = [
  {
    title: "The Obsidian Lounge",
    category: "Fine Dining & Cocktails",
    rating: "4.9",
    detail: "Exceptional mixology and a clandestine atmosphere for the discerning palate.",
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "Aether Wellness",
    category: "Holistic Spa & Spa",
    rating: "5.0",
    detail: "Bespoke restorative treatments in a setting of absolute architectural silence.",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "Crestwood Club",
    category: "Private Social Club",
    rating: "4.8",
    detail: "World-class amenities and a network of global leaders in an informal setting.",
    image:
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=900&q=85&auto=format&fit=crop",
  },
];

const mobileValuationComparables = [
  {
    title: "Bel-Air Crest Manor",
    status: "Recently Sold",
    price: "$18,500,000",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "The Obsidian Point",
    status: "Active Listing",
    price: "$14,200,000",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "Onyx Heights Penthouse",
    status: "Pending Sale",
    price: "$9,800,000",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=85&auto=format&fit=crop",
  },
];

const mobileSoldLedgerAcquisitions = [
  {
    title: "The Obsidian Penthouse",
    location: "14 Curzon St, Mayfair",
    price: "£14,250,000",
    days: "12 Days",
    performance: "+4.2%",
    date: "Oct 24",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "Belgrave Garden House",
    location: "Chester Square, Belgravia",
    price: "£8,900,000",
    days: "45 Days",
    performance: "Par",
    date: "Oct 19",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "Marble Arch Residence",
    location: "Oxford Street Mews",
    price: "£5,400,000",
    days: "8 Days",
    performance: "+8.1%",
    date: "Oct 12",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=85&auto=format&fit=crop",
  },
];

const mobilePaymentMethods = [
  {
    title: "Private Wealth Account",
    detail: "**** 8829",
    icon: Landmark,
    primary: true,
  },
  {
    title: "Digital Asset Wallet",
    detail: "0x71C...4f92",
    icon: Bitcoin,
    primary: false,
  },
];

const mobileUpcomingInstallments = [
  {
    property: "Burj Khalifa Residences",
    milestone: "Q3 Construction Milestone",
    dueDate: "Oct 14, 2024",
    amount: "$450,000",
  },
  {
    property: "Emirates Hills Villa",
    milestone: "Monthly Service Charge",
    dueDate: "Nov 01, 2024",
    amount: "$12,500",
  },
];

const mobilePaymentHistory = [
  {
    title: "One&Only Private Homes",
    detail: "Initial Booking Deposit • Transaction #9921",
    amount: "$2,500,000",
    date: "Aug 24, 2024",
  },
  {
    title: "Downton View Luxury Loft",
    detail: "Final Handover Payment • Transaction #9810",
    amount: "$1,200,000",
    date: "July 12, 2024",
  },
];

const mobileAgencyListingMetrics = [
  { label: "Total Inventory", value: "24", helper: "+3 this month", tone: "positive" },
  { label: "Total Value", value: "$142.5M", helper: "High-yield portfolio", tone: "neutral" },
  { label: "Avg. Days on Market", value: "18", helper: "Top 1% Performance", tone: "positive" },
  { label: "Active Inquiries", value: "86", helper: "12 Urgent Leads", tone: "warning" },
];

const mobileAgencyListings = [
  {
    title: "The Obsidian Villa",
    status: "Active",
    price: "$18,500,000",
    address: "1422 North Hillcrest Rd, Beverly Hills, CA",
    views: "1,240",
    inquiries: "12",
    dom: "4",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "Skyline Penthouse",
    status: "Under Offer",
    price: "$12,200,000",
    address: "721 Fifth Avenue, New York, NY",
    views: "842",
    inquiries: "45",
    dom: "22",
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "The Gilded Manor",
    status: "Sold",
    price: "$32,000,000",
    address: "Biscayne Bay, Miami, FL",
    views: "3,120",
    inquiries: "112",
    dom: "41",
    image:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "Azure Retreat",
    status: "Active",
    price: "$9,800,000",
    address: "Lake Tahoe, NV",
    views: "420",
    inquiries: "6",
    dom: "2",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=85&auto=format&fit=crop",
  },
];

const mobileAgencyFinancialForecast = [
  { month: "Jan", height: "28%", tone: "muted" },
  { month: "", height: "40%", tone: "muted" },
  { month: "Mar", height: "22%", tone: "muted" },
  { month: "", height: "52%", tone: "muted" },
  { month: "May", height: "64%", tone: "accent", value: "$310k" },
  { month: "", height: "32%", tone: "muted" },
  { month: "Jul", height: "72%", tone: "peak", value: "Peak" },
  { month: "", height: "48%", tone: "muted" },
  { month: "Sep", height: "36%", tone: "muted" },
  { month: "", height: "29%", tone: "muted" },
  { month: "Nov", height: "22%", tone: "muted" },
];

const mobileAgencyEscrowBreakdown = [
  { label: "Under Contract", amount: "$14.2M", progress: "74%", tone: "gold" },
  { label: "Inspection Phase", amount: "$8.5M", progress: "50%", tone: "light" },
  { label: "Final Approval", amount: "$22.1M", progress: "100%", tone: "gold" },
];

const mobileAgencyPayouts = [
  {
    property: "The Obsidian Penthouse",
    invoice: "INV-882910",
    status: "Settled",
    type: "Sales Comm",
  },
  {
    property: "Bel Air Estate - West Wing",
    invoice: "INV-882904",
    status: "Pending",
    type: "Interim",
  },
  {
    property: "St. Regis Residences Unit 402",
    invoice: "INV-882898",
    status: "Settled",
    type: "Lease Referral",
  },
  {
    property: "Pacific Coast Retreat",
    invoice: "INV-882855",
    status: "Settled",
    type: "Sales Comm",
  },
];

const mobileAgencyFinancialDocuments = [
  { title: "Q3 Earnings Statement", detail: "Available for PDF download", icon: FileText },
  { title: "Tax Summary 2023", detail: "Year-to-date breakdown", icon: Calculator },
  { title: "Expense Reports", detail: "Validated marketing deductions", icon: Landmark },
];

const mobileAgencyTeamMembers = [
  {
    name: "Julian Vane",
    role: "Senior Partner • 12 Years",
    value: "$42.5M YTD",
    badges: ["Lead", "High Yield", "Mentor"],
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=180&q=85&auto=format&fit=crop",
  },
  {
    name: "Elena Rossi",
    role: "Junior Agent • 2 Years",
    value: "$18.4M YTD",
    badges: ["Junior", "Rising Star", "Aggressive"],
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=180&q=85&auto=format&fit=crop",
  },
  {
    name: "Marcus Thorne",
    role: "Market Analyst • 5 Years",
    value: "Forecasts",
    badges: ["Analyst", "Data Driven", "Risk Expert"],
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=180&q=85&auto=format&fit=crop",
  },
  {
    name: "Sarah Jenkins",
    role: "Exec. Operations • 8 Years",
    value: "Ops Lead",
    badges: ["Admin", "Process Lead", "Strategic"],
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=180&q=85&auto=format&fit=crop",
  },
];

const mobileAgencyAccessHierarchy = [
  {
    tier: "Tier I: Principal",
    detail: "Full oversight, financial management, and ultimate strategic approval.",
    icon: Shield,
  },
  {
    tier: "Tier II: Associate",
    detail: "Listing management, lead negotiation, and CRM authority.",
    icon: Star,
  },
  {
    tier: "Tier III: Support",
    detail: "Read-only access to intelligence, administrative duties, and analyst viewing.",
    icon: Eye,
  },
];

const mobileAgencyLeadMetrics = [
  { label: "Active Hot Leads", value: "24", helper: "+12%", icon: Zap, tone: "positive" },
  { label: "Unread Messages", value: "156", helper: "8 New", icon: MessageCircle, tone: "warning" },
  { label: "Scheduled Viewings", value: "6", helper: "Today", icon: CalendarDays, tone: "neutral" },
  { label: "Pipeline Value", value: "$48.2M", helper: "+2.4M", icon: TrendingUp, tone: "positive" },
];

const mobileAgencyPriorityLeads = [
  {
    name: "Julian Vane",
    property: "Looking for Penthouse in Mayfair",
    note: '"The balcony view is non-negotiable..."',
    status: "Hot",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=180&q=85&auto=format&fit=crop",
  },
  {
    name: "Elena Rossi",
    property: "Pre-approved: $4.5M investment",
    note: '"Sent over the financial statements..."',
    status: "Warm",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=180&q=85&auto=format&fit=crop",
  },
  {
    name: "Marcus Thorne",
    property: "Past inquiry: Waterfront Estate",
    note: '"No response to follow-up email..."',
    status: "Cold",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=180&q=85&auto=format&fit=crop",
  },
];

const mobileAgencyLeadActivity = [
  {
    title: "New Email from Sarah Lin",
    detail: '"Is the owner willing to negotiate on the closing date for the Hampton property?"',
    time: "2 mins ago",
    icon: Mail,
    tone: "mail",
  },
  {
    title: "Viewing Confirmed",
    detail: "David K. confirmed for 14:00 tomorrow at Skyloft Penthouse.",
    time: "1 hour ago",
    icon: CalendarDays,
    tone: "info",
  },
  {
    title: "Offer Accepted",
    detail: "The offer for Unit 402 has been signed and notarized.",
    time: "3 hours ago",
    icon: CheckCircle2,
    tone: "success",
  },
  {
    title: "Missed Call: Robert G.",
    detail: "Client called from +1 (555) 012-3456. Voicemail left.",
    time: "5 hours ago",
    icon: Phone,
    tone: "danger",
  },
];

const mobileBuyerTools = [
  {
    title: "Buying Guide",
    detail: "The 2024 Luxury Acquisition Report",
    icon: FileText,
  },
  {
    title: "Legal Advisory",
    detail: "Regulatory framework & compliance",
    icon: Landmark,
  },
  {
    title: "Priority Access",
    detail: "Chat with a Private Client Manager",
    icon: Crown,
  },
];

const mobileTourCalendarDays = [
  { label: "29", muted: true },
  { label: "30", muted: true },
  { label: "1" },
  { label: "2" },
  { label: "3", marked: true },
  { label: "4" },
  { label: "5" },
  { label: "6", active: true },
  { label: "7" },
  { label: "8", marked: true },
  { label: "9" },
  { label: "10" },
  { label: "11" },
  { label: "12", marked: true },
  { label: "13" },
  { label: "14" },
  { label: "15" },
  { label: "16" },
  { label: "17" },
  { label: "18" },
  { label: "19" },
  { label: "20" },
  { label: "21" },
];

const mobileTourSchedule = [
  {
    time: "10:00 AM - 11:30 AM",
    title: "Villa Mariposa, Emirates Hills",
    client: "Khalid Al-Mansour (VIP Lead)",
    status: "Confirmed",
  },
  {
    time: "2:00 PM - 3:00 PM",
    title: "Skyline Penthouse, Downtown",
    client: "Sarah Jenkins (Private Wealth)",
    status: "Active Now",
  },
  {
    time: "5:30 PM - 6:30 PM",
    title: "Coastal Retreat, Palm Jumeirah",
    client: "Dr. Robert Chen",
    status: "Pending",
  },
];

const mobileSmartAccessKeys = [
  {
    name: "Leila Ben-Youssef",
    detail: "Interior Designer • Permanent",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=85&auto=format&fit=crop",
    muted: false,
  },
  {
    name: "Maintenance Crew",
    detail: "Expires in 4h 12m • Temporal",
    image: "",
    muted: false,
  },
  {
    name: "Aramex Delivery",
    detail: "Expired 2h ago",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=75&auto=format&fit=crop",
    muted: true,
  },
];

const mobileSmartAccessLog = [
  {
    title: "Entrance Door Unlocked",
    detail: "By Khalid Al-Mansour • 12:42 PM",
    tone: "secure",
  },
  {
    title: "New Access Key Generated",
    detail: "Maintenance Task #842 • 10:15 AM",
    tone: "info",
  },
  {
    title: "Invalid Biometric Attempt",
    detail: "Guest Entry Point • 08:30 AM",
    tone: "danger",
  },
  {
    title: "Auto-Lock Sequence Complete",
    detail: "Night Protocol • 11:00 PM (Yesterday)",
    tone: "muted",
  },
];

const mobileApplicationStats = [
  { label: "Active Applications", value: "04", icon: CalendarDays },
  { label: "In Escrow", value: "01", icon: KeyRound },
  { label: "Total Portfolio Value", value: "$12.4M", icon: Landmark, featured: true },
];

const mobileApplications = [
  {
    status: "Escrow Opened",
    title: "The Al-Barari Obsidian Villa",
    location: "Sector 4, Al Barari, Dubai",
    amount: "$8,450,000",
    type: "Purchase Offer",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=85&auto=format&fit=crop",
    steps: ["Offer Sent", "Accepted", "Escrow", "Finalized"],
    activeStep: 2,
    actions: ["Contact Concierge", "View Documents"],
  },
  {
    status: "Under Review",
    title: "One Hyde Park Penthouse",
    location: "Knightsbridge, London",
    amount: "$12,500 /mo",
    type: "Rental Application",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85&auto=format&fit=crop",
    steps: ["Applied", "Review", "Interview", "Decision"],
    activeStep: 1,
    actions: ["Withdraw", "Details"],
  },
];

const mobileVerificationStats = [
  { label: "Identity Status", value: "Gold", icon: ShieldCheck },
  { label: "Documents Cleared", value: "07", icon: FileText },
  { label: "Escrow Fast Track", value: "On", icon: KeyRound, featured: true },
];

const mobileVerificationChecks = [
  {
    status: "Verified",
    title: "Ghana Card / Passport Identity",
    location: "KYC profile - Human reviewed",
    amount: "Complete",
    type: "Identity Check",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=900&q=85&auto=format&fit=crop",
    steps: ["Submitted", "Matched", "Reviewed", "Approved"],
    activeStep: 3,
    actions: ["View Receipt", "Update ID"],
  },
  {
    status: "Ready",
    title: "Proof of Funds & Residence",
    location: "Documents vault - Private access",
    amount: "Cleared",
    type: "Buyer File",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=85&auto=format&fit=crop",
    steps: ["Uploaded", "Review", "Signed", "Ready"],
    activeStep: 3,
    actions: ["Open Vault", "Share"],
  },
];

const mobileLuxuryAlerts = {
  transactions: [
    {
      title: "Escrow Milestone Reached",
      property: "The Sapphire Penthouse",
      time: "2h ago",
      detail:
        "Inspection has been completed and cleared. Final closing documents are ready for signature.",
      image:
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80&auto=format&fit=crop",
      action: "View Deal",
    },
    {
      title: "Dividend Payment Received",
      property: "Palm Jumeirah Commercial REIT",
      time: "Yesterday",
      detail: "Your monthly yields have been deposited into your vault.",
      image: "",
      action: "",
    },
  ],
  property: [
    {
      tag: "Price Drop",
      title: "Burj Khalifa Suite 104",
      time: "4h ago",
      detail: "Reduced by $250,000. This matches your High Yield investment filter.",
      highlighted: true,
    },
    {
      tag: "New Listing",
      title: "Al Barari Eco-Villa",
      time: "8h ago",
      detail: "Exclusive off-market access granted for your tier.",
      highlighted: false,
    },
  ],
};

const mobileFallbackAgencies = [
  {
    id: "agency-accra-prime",
    name: "Accra Prime Homes",
    slug: "accra-prime-homes",
    logo_url: "",
    cover_image_url:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=85&auto=format&fit=crop",
    active_listings_count: 42,
    rating: "4.9",
  },
  {
    id: "agency-coastal-realty",
    name: "Coastal Realty GH",
    slug: "coastal-realty-gh",
    logo_url: "",
    cover_image_url:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?w=900&q=85&auto=format&fit=crop",
    active_listings_count: 31,
    rating: "4.8",
  },
  {
    id: "agency-urban-gate",
    name: "UrbanGate Properties",
    slug: "urban-gate-properties",
    logo_url: "",
    cover_image_url:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=85&auto=format&fit=crop",
    active_listings_count: 28,
    rating: "4.7",
  },
];

const mobileAgentPreview = [
  {
    name: "Kwame Mensah",
    role: "Real Estate Advisor",
    rating: "4.9",
    deals: "120",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=240&q=80&auto=format&fit=crop",
  },
  {
    name: "Akosua Addo",
    role: "Property Consultant",
    rating: "4.8",
    deals: "98",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=240&q=80&auto=format&fit=crop",
  },
  {
    name: "Kojo Asare",
    role: "Senior Realtor",
    rating: "4.7",
    deals: "89",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop",
  },
  {
    name: "Ama Ofori",
    role: "Real Estate Advisor",
    rating: "4.9",
    deals: "110",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&q=80&auto=format&fit=crop",
  },
];

const mobileOnboardingAcceptedItems = [
  "terms-of-use",
  "privacy-notice",
  "push-alerts-disclosure",
  "offline-drafts-disclosure",
  "buying-guide-disclaimer",
  "support-disclaimer",
] as const;

const mobileOnboardingSteps: Array<{
  title: string;
  detail: string;
  legal: string;
  icon: typeof Home;
}> = [
  {
    title: "Turn on alerts",
    detail: "Get listing, viewing, message, offer, and safety updates when you choose push notifications.",
    legal: "Alerts are optional and can be changed in device settings.",
    icon: Bell,
  },
  {
    title: "Send drafts",
    detail: "Keep notes, message drafts, offer drafts, photos, and documents safe until your phone is online.",
    legal: "Drafts may stay on this device until sent, deleted, or app data is cleared.",
    icon: FileText,
  },
  {
    title: "Buying guide",
    detail: "Use simple checklists for costs, timing, remote-buyer steps, and safer verification.",
    legal: "Guides are informational only and do not replace professional advice.",
    icon: Compass,
  },
  {
    title: "Get help",
    detail: "Reach support for account access, property handoff, aftercare, and next-step questions.",
    legal: "Support can route and explain workflows, but it is not legal, tax, valuation, or lending advice.",
    icon: MessageCircle,
  },
];

const validMobileTabs = new Set<MobileTab>([
  "home",
  "search",
  "saved",
  "messages",
  "profile",
  "insights",
  "invest",
  "valuation",
]);

function getTabHref(tab: MobileTab) {
  if (tab === "home") return "/";
  if (tab === "search") return "/search";
  if (tab === "insights") return "/app/insights";
  if (tab === "invest") return "/app/payments";
  if (tab === "valuation") return "/valuation";
  return `/?tab=${tab}`;
}

function getActiveMobileTab(searchParams: URLSearchParams): MobileTab {
  const requested = searchParams.get("tab");
  return requested && validMobileTabs.has(requested as MobileTab)
    ? (requested as MobileTab)
    : "home";
}

function getPathDrivenMobileTab(pathname: string): MobileTab {
  if (
    pathname.startsWith("/search") ||
    pathname.startsWith("/property/") ||
    pathname.startsWith("/guides") ||
    pathname.startsWith("/market-trends") ||
    pathname.startsWith("/sold-ledger") ||
    pathname.startsWith("/buyer-requests") ||
    pathname.startsWith("/projects")
  ) {
    return "home";
  }

  if (pathname.startsWith("/app")) {
    const section = getUserDashboardSection(pathname);

    if (section === "insights") return "insights";
    if (section === "payments") return "invest";

    if (["deals", "messages", "applications", "viewings", "concierge"].includes(section)) {
      return "messages";
    }

    if (["compare", "buying-tools", "saved", "alerts", "groups"].includes(section)) {
      return "saved";
    }

    return "profile";
  }

  if (pathname.startsWith("/workspace")) {
    return "profile";
  }

  if (
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/get-the-app") ||
    pathname.startsWith("/legal")
  ) {
    return "profile";
  }

  if (pathname.startsWith("/valuation")) return "valuation";

  return "home";
}

function getCurrentMobileTab(pathname: string, searchParams: URLSearchParams): MobileTab {
  return pathname === "/" ? getActiveMobileTab(searchParams) : getPathDrivenMobileTab(pathname);
}

function getMobileRouteTitle(pathname: string) {
  if (pathname.startsWith("/property/")) return "Property";
  if (pathname.startsWith("/search")) return "Search results";
  if (pathname.startsWith("/agencies/")) return "Agency";
  if (pathname.startsWith("/agencies")) return "Agencies";
  if (pathname.startsWith("/guides/")) return "Area guide";
  if (pathname.startsWith("/guides")) return "Area guides";
  if (pathname.startsWith("/market-trends")) return "Market trends";
  if (pathname.startsWith("/sold-ledger")) return "Sold ledger";
  if (pathname.startsWith("/reviews")) return "Public reviews";
  if (pathname.startsWith("/buyer-requests")) return "Buyer requests";
  if (pathname.startsWith("/projects/")) return "Project";
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/valuation")) return "Home valuation";
  if (pathname.startsWith("/get-the-app")) return "Get the app";
  if (pathname.startsWith("/legal/terms")) return "Terms of Use";
  if (pathname.startsWith("/legal/privacy")) return "Privacy Notice";
  if (pathname.startsWith("/workspace/accept")) return "Workspace invite";
  if (pathname.startsWith("/workspace")) return "Workspace";
  if (pathname.startsWith("/app")) {
    if (pathname === "/app") return "Overview";

    const matchedRoute = USER_DASHBOARD_ROUTE_CONFIG.find(
      (route) =>
        route.section !== "overview" &&
        (route.href === pathname || pathname.startsWith(`${route.href}/`))
    );

    return matchedRoute?.label || "Dashboard";
  }

  return "BaytMiftah";
}

function formatPrice(amount?: number | null, currency = "GHS") {
  if (!amount) return "Price on request";

  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Recently";

  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function formatViewingTime(value?: string | null) {
  if (!value) return "Pending confirmation";

  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getListingLabel(type?: string) {
  if (type === "sale") return "For sale";
  if (type === "lease") return "Lease";
  return "For rent";
}

function MobilePaneHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mobile-nav-header">
      <div>
        <p className="mobile-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle ? <p className="mobile-nav-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="mobile-nav-action">{action}</div> : null}
    </header>
  );
}

function MobileQuickLink({
  to,
  icon: Icon,
  title,
  detail,
}: {
  to: string;
  icon: typeof Home;
  title: string;
  detail: string;
}) {
  return (
    <Link to={to} className="mobile-quick-link">
      <div className="mobile-quick-link-icon">
        <Icon aria-hidden="true" />
      </div>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <ChevronRight aria-hidden="true" />
    </Link>
  );
}

function MobileShellTabLink({
  tab,
  icon,
  title,
  detail,
}: {
  tab: MobileTab;
  icon: typeof Home;
  title: string;
  detail: string;
}) {
  return <MobileQuickLink to={getTabHref(tab)} icon={icon} title={title} detail={detail} />;
}

function MobileStatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="mobile-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

function MobilePropertySkeleton() {
  return (
    <div className="mobile-card mobile-property-card mobile-skeleton-card" aria-hidden="true">
      <div className="mobile-skeleton mobile-skeleton-image" />
      <div className="mobile-property-body">
        <div className="mobile-skeleton mobile-skeleton-line short" />
        <div className="mobile-skeleton mobile-skeleton-line" />
        <div className="mobile-skeleton mobile-skeleton-line medium" />
        <div className="mobile-property-footer">
          <div className="mobile-skeleton mobile-skeleton-line short" />
          <div className="mobile-skeleton mobile-skeleton-pill" />
        </div>
      </div>
    </div>
  );
}

function MobileBottomSheet({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="mobile-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="mobile-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="mobile-sheet-handle"
          aria-label="Close panel"
          onClick={onClose}
        />
        <header className="mobile-sheet-header">
          <h2>{title}</h2>
          <button type="button" className="mobile-text-button" onClick={onClose}>
            Done
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function MobilePropertyCard({
  listing,
  distanceLabel,
}: {
  listing: any;
  distanceLabel?: string | null;
}) {
  const property = listing.property || {};

  return (
    <Link to={`/property/${listing.id}`} className="mobile-card mobile-property-card">
      <img
        src={getPropertyCoverImage(property)}
        alt={property.address || "Property"}
        className="mobile-property-image"
      />
      <div className="mobile-property-body">
        <div className="mobile-property-meta">
          <span>{getListingLabel(listing.listing_type)}</span>
          {listing.organization?.verified && (
            <span className="mobile-verified">
              <ShieldCheck aria-hidden="true" />
              Verified
            </span>
          )}
          {listing.quality_score >= 75 && (
            <span className="mobile-verified">
              <ShieldCheck aria-hidden="true" />
              Trust {listing.quality_score}
            </span>
          )}
        </div>
        <h3>{property.address || "Ghana property"}</h3>
        <p>
          {[property.neighborhood, property.city, property.region].filter(Boolean).join(", ") || "Ghana"}
        </p>
        <div className="mobile-property-footer">
          <strong>{formatPrice(listing.price, listing.currency)}</strong>
          <span>{distanceLabel || (property.bedrooms ? `${property.bedrooms} bed` : property.category || "Property")}</span>
        </div>
      </div>
    </Link>
  );
}

function getMobileListingImage(listing: any, fallbackImage: string) {
  if (listing?.image) return listing.image;

  try {
    const cover = listing?.property ? getPropertyCoverImage(listing.property) : "";
    return cover || fallbackImage;
  } catch {
    return fallbackImage;
  }
}

function getMobileListingTitle(listing: any) {
  return listing?.property?.address || listing?.title || "Verified Ghana property";
}

function getMobileListingLocation(listing: any) {
  const property = listing?.property || {};
  return [property.neighborhood, property.city, property.region].filter(Boolean).join(", ") || "Accra, Ghana";
}

function getMobileListingBedrooms(listing: any) {
  return listing?.property?.bedrooms || listing?.bedrooms || 2;
}

function getMobileListingBathrooms(listing: any) {
  return listing?.property?.bathrooms || listing?.bathrooms || getMobileListingBedrooms(listing);
}

function getAgencyInitials(agency: any) {
  return (agency?.name || "BaytMiftah")
    .split(/\s+/)
    .filter(Boolean)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function getAgencyCoverImage(agency: any, index: number) {
  return (
    agency?.cover_image_url ||
    agency?.banner_url ||
    mobileFallbackAgencies[index % mobileFallbackAgencies.length]?.cover_image_url ||
    mobileFallbackAgencies[0].cover_image_url
  );
}

function MobileHomeSection({
  title,
  actionLabel = "See All",
  actionTo,
  children,
}: {
  title: string;
  actionLabel?: string;
  actionTo?: string;
  children: ReactNode;
}) {
  return (
    <section className="mobile-luxe-section">
      <div className="mobile-luxe-section-heading">
        <h2>{title}</h2>
        {actionTo ? <Link to={actionTo}>{actionLabel}</Link> : null}
      </div>
      {children}
    </section>
  );
}

function MobileCategoryCard({
  label,
  detail,
  icon: Icon,
}: {
  label: string;
  detail: string;
  icon: typeof Home;
}) {
  return (
    <Link to={`/search?q=${encodeURIComponent(label)}`} className="mobile-luxe-category-card">
      <span>
        <Icon aria-hidden="true" />
      </span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </Link>
  );
}

function MobileVerifiedAgentCard({
  agent,
}: {
  agent: (typeof mobileAgentPreview)[number];
}) {
  return (
    <article className="mobile-luxe-agent-card">
      <div className="mobile-luxe-agent-photo-wrap">
        <img src={agent.image} alt={agent.name} />
        <span aria-label="Verified agent">
          <ShieldCheck aria-hidden="true" />
        </span>
      </div>
      <strong>{agent.name}</strong>
      <p>{agent.role}</p>
      <div className="mobile-luxe-agent-stats">
        <span>{agent.rating} rating</span>
        <span>{agent.deals} listings</span>
      </div>
      <Link to="/app/messages" className="mobile-luxe-message-button">
        Message
      </Link>
    </article>
  );
}

function MobilePremiumListingCard({
  listing,
  index,
}: {
  listing: any;
  index: number;
}) {
  const fallback = mobileFallbackListings[index % mobileFallbackListings.length];
  const image = getMobileListingImage(listing, fallback.image);

  return (
    <article className="mobile-luxe-listing-card">
      <Link to={`/property/${listing.id}`} className="mobile-luxe-listing-image-link">
        <img src={image} alt={getMobileListingTitle(listing)} />
        <span className="mobile-luxe-verified-badge">
          <ShieldCheck aria-hidden="true" />
          Verified
        </span>
      </Link>
      <button type="button" className="mobile-luxe-favorite" aria-label="Save property">
        <Heart aria-hidden="true" />
      </button>
      <div className="mobile-luxe-listing-body">
        <strong>{formatPrice(listing.price, listing.currency)}</strong>
        <Link to={`/property/${listing.id}`}>{getMobileListingTitle(listing)}</Link>
        <p>
          <MapPin aria-hidden="true" />
          {getMobileListingLocation(listing)}
        </p>
        <div className="mobile-luxe-listing-facts">
          <span>
            <BedDouble aria-hidden="true" />
            {getMobileListingBedrooms(listing)} bed
          </span>
          <span>
            <Bath aria-hidden="true" />
            {getMobileListingBathrooms(listing)} bath
          </span>
        </div>
      </div>
    </article>
  );
}

function MobileDarkPropertyCard({
  listing,
  index,
}: {
  listing: any;
  index: number;
}) {
  const fallback = mobileFallbackListings[index % mobileFallbackListings.length];
  const image = getMobileListingImage(listing, fallback.image);

  return (
    <Link to={`/property/${listing.id}`} className="mobile-luxe-recent-card">
      <img src={image} alt={getMobileListingTitle(listing)} />
      <div>
        <strong>{getMobileListingTitle(listing)}</strong>
        <span>{formatPrice(listing.price, listing.currency)}</span>
      </div>
    </Link>
  );
}

function MobileSavedLuxeCard({
  item,
  index,
}: {
  item: any;
  index: number;
}) {
  const listing = item.listing || item;
  const fallback = mobileFallbackListings[index % mobileFallbackListings.length];
  const image = getMobileListingImage(listing, fallback.image);
  const price = formatPrice(listing.price || fallback.price, listing.currency || fallback.currency);
  const title = getMobileListingTitle(listing);
  const bedrooms = getMobileListingBedrooms(listing);
  const bathrooms = getMobileListingBathrooms(listing);

  return (
    <Link to={`/property/${listing.id}`} className="mobile-saved-luxe-card">
      <div className="mobile-saved-luxe-image">
        <img src={image} alt={title} />
        {index === 0 ? <span>New Listing</span> : null}
        <button type="button" aria-label="Remove saved property" onClick={(event) => event.preventDefault()}>
          <Heart aria-hidden="true" />
        </button>
      </div>
      <div className="mobile-saved-luxe-body">
        <strong>{price}</strong>
        <h3>{title}</h3>
        <div>
          <span>
            <BedDouble aria-hidden="true" />
            {bedrooms}
          </span>
          <span>
            <Bath aria-hidden="true" />
            {bathrooms}
          </span>
          <span>
            <Landmark aria-hidden="true" />
            {listing.property?.area_sqm || listing.property?.square_feet || "Verified"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function MobileSearchResidenceCard({
  residence,
}: {
  residence: (typeof mobileSearchResidences)[number];
}) {
  return (
    <Link to={`/property/${residence.id}`} className="mobile-search-luxe-card">
      <div className="mobile-search-luxe-image">
        <img src={residence.image} alt={residence.title} />
        {residence.tag ? <span>{residence.tag}</span> : null}
        <button type="button" aria-label={`Save ${residence.title}`} onClick={(event) => event.preventDefault()}>
          <Heart aria-hidden="true" />
        </button>
      </div>
      <div className="mobile-search-luxe-body">
        <div className="mobile-search-luxe-title-row">
          <h2>{residence.title}</h2>
          <strong>{residence.price}</strong>
        </div>
        <p>
          <MapPin aria-hidden="true" />
          {residence.location}
        </p>
        <div className="mobile-search-luxe-stats">
          <span>
            <BedDouble aria-hidden="true" />
            {residence.beds}
          </span>
          <span>
            <Bath aria-hidden="true" />
            {residence.baths}
          </span>
          <span>
            <Ruler aria-hidden="true" />
            {residence.area}
          </span>
        </div>
      </div>
    </Link>
  );
}

function MobileAreaGuideGemCard({
  gem,
}: {
  gem: (typeof mobileAreaGuideGems)[number];
}) {
  return (
    <article className="mobile-area-guide-gem">
      <img src={gem.image} alt={gem.title} />
      <div>
        <span>
          <strong>{gem.title}</strong>
          <em>
            <Star aria-hidden="true" />
            {gem.rating}
          </em>
        </span>
        <small>{gem.category}</small>
        <p>{gem.detail}</p>
      </div>
    </article>
  );
}

function MobileValuationComparableCard({
  comparable,
}: {
  comparable: (typeof mobileValuationComparables)[number];
}) {
  return (
    <article className="mobile-valuation-comparable-card">
      <img src={comparable.image} alt={comparable.title} />
      <div>
        <span>{comparable.status}</span>
        <h3>{comparable.title}</h3>
        <strong>{comparable.price}</strong>
      </div>
    </article>
  );
}

function MobileSoldLedgerCard({
  acquisition,
}: {
  acquisition: (typeof mobileSoldLedgerAcquisitions)[number];
}) {
  return (
    <article className="mobile-sold-ledger-card">
      <img src={acquisition.image} alt={acquisition.title} />
      <div className="mobile-sold-ledger-card-body">
        <header>
          <div>
            <h3>{acquisition.title}</h3>
            <p>{acquisition.location}</p>
          </div>
          <span>Closed</span>
        </header>
        <dl>
          <div>
            <dt>Final Price</dt>
            <dd>{acquisition.price}</dd>
          </div>
          <div>
            <dt>Time on Market</dt>
            <dd>{acquisition.days}</dd>
          </div>
          <div>
            <dt>Area Performance</dt>
            <dd className={acquisition.performance.startsWith("+") ? "is-positive" : ""}>
              {acquisition.performance}
            </dd>
          </div>
          <div>
            <dt>Sold Date</dt>
            <dd>{acquisition.date}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function MobileProfileRow({
  icon: Icon,
  label,
  value,
  to,
  badge,
  ariaLabel,
}: {
  icon: typeof Home;
  label: string;
  value?: string;
  to?: string;
  badge?: string;
  ariaLabel?: string;
}) {
  const content = (
    <>
      <span>
        <Icon aria-hidden="true" />
      </span>
      <strong>{label}</strong>
      {badge ? <em>{badge}</em> : value ? <small>{value}</small> : null}
      <ChevronRight aria-hidden="true" />
    </>
  );

  if (to) {
    return (
      <Link to={to} className="mobile-profile-luxe-row" aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return <div className="mobile-profile-luxe-row">{content}</div>;
}

function MobileProfileGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{
    icon: typeof Home;
    label: string;
    to: string;
    value?: string;
    badge?: string;
    ariaLabel?: string;
  }>;
}) {
  return (
    <section className="mobile-profile-luxe-group">
      <h3>{title}</h3>
      <div>
        {items.map((item) => (
          <MobileProfileRow key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}

function MobileVerifiedAgencyCard({
  agency,
  index,
}: {
  agency: any;
  index: number;
}) {
  const cover = getAgencyCoverImage(agency, index);
  const listingsCount =
    agency?.active_listings_count || agency?.listing_count || agency?.listings_count || 24 + index * 7;
  const rating = agency?.rating || (4.9 - index * 0.1).toFixed(1);

  return (
    <article className="mobile-luxe-agency-card">
      <img src={cover} alt="" className="mobile-luxe-agency-cover" />
      <div className="mobile-luxe-agency-body">
        <div className="mobile-luxe-agency-logo">
          {agency?.logo_url ? <img src={agency.logo_url} alt="" /> : <span>{getAgencyInitials(agency)}</span>}
        </div>
        <div>
          <strong>{agency.name}</strong>
          <p>
            <ShieldCheck aria-hidden="true" />
            Verified agency
          </p>
        </div>
        <div className="mobile-luxe-agency-stats">
          <span>{listingsCount} listings</span>
          <span>
            <Star aria-hidden="true" />
            {rating}
          </span>
        </div>
        <Link to={`/agencies/${agency.slug || agency.id}`} className="mobile-luxe-agency-action">
          View Agency
        </Link>
      </div>
    </article>
  );
}

function MobileTrustIndicatorCard({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail: string;
  icon: typeof Home;
}) {
  return (
    <article className="mobile-luxe-trust-card">
      <span>
        <Icon aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </article>
  );
}

const mobilePortfolioAssets = [
  {
    title: "Villa Signature, Palm",
    detail: "6 Bedroom • 12,000 SQFT",
    value: "18.5M",
    yield: "7.2%",
    tag: "High Yield",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "Sky Garden Penthouse",
    detail: "4 Bedroom • 8,500 SQFT",
    value: "12.2M",
    yield: "6.4%",
    tag: "Capital Growth",
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=900&q=85&auto=format&fit=crop",
  },
  {
    title: "Marina Residenza",
    detail: "3 Bedroom • 3,200 SQFT",
    value: "7.15M",
    yield: "6.9%",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=85&auto=format&fit=crop",
  },
];

function MobileInsightMetricCard({
  label,
  value,
  detail,
  growth,
}: {
  label: string;
  value: string;
  detail?: string;
  growth?: string;
}) {
  return (
    <article className="mobile-insights-metric">
      <div>
        <span>
          <Wallet aria-hidden="true" />
        </span>
        {growth ? <em>{growth}</em> : null}
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : <i aria-hidden="true" />}
    </article>
  );
}

function MobileInsightAssetCard({ asset }: { asset: (typeof mobilePortfolioAssets)[number] }) {
  return (
    <article className="mobile-insights-asset">
      <img src={asset.image} alt={asset.title} />
      {asset.tag ? <span>{asset.tag}</span> : null}
      <div>
        <h3>{asset.title}</h3>
        <p>{asset.detail}</p>
      </div>
      <dl>
        <div>
          <dt>Valuation</dt>
          <dd>{asset.value}</dd>
        </div>
        <div>
          <dt>Yield</dt>
          <dd>{asset.yield}</dd>
        </div>
      </dl>
    </article>
  );
}

function MobileInsightsNav() {
  return (
    <nav className="mobile-insights-nav" aria-label="Insights navigation">
      {[
        { label: "Home", icon: Home, to: "/" },
        { label: "Listings", icon: Building2, to: "/search" },
        { label: "Invest", icon: Landmark, to: "/app/insights", active: true },
        { label: "Leads", icon: UserRound, to: "/app/messages" },
        { label: "Menu", icon: Menu, to: "/?tab=profile" },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileInvestmentNav() {
  return (
    <nav className="mobile-insights-nav" aria-label="Investment navigation">
      {[
        { label: "Home", icon: Home, to: "/" },
        { label: "Listings", icon: Building2, to: "/search" },
        { label: "Invest", icon: Wallet, to: "/app/payments", active: true },
        { label: "Leads", icon: UserRound, to: "/app/messages" },
        { label: "Menu", icon: Menu, to: "/?tab=profile" },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileBuyerToolsNav() {
  return (
    <nav className="mobile-insights-nav" aria-label="Buyer tools navigation">
      {[
        { label: "Home", icon: Home, to: "/" },
        { label: "Listings", icon: Building2, to: "/search" },
        { label: "Invest", icon: Landmark, to: "/app/insights" },
        { label: "Leads", icon: UserRound, to: "/app/buying-tools", active: true },
        { label: "Menu", icon: Menu, to: "/?tab=profile" },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileTourManagementNav() {
  return (
    <nav className="mobile-tour-nav" aria-label="Tour management navigation">
      {[
        { label: "Home", icon: Home, to: "/" },
        { label: "Listings", icon: Building2, to: "/search" },
        { label: "Tours", icon: CalendarDays, to: "/app/concierge", active: true },
        { label: "Leads", icon: UserRound, to: "/app/messages" },
        { label: "Menu", icon: Menu, to: "/?tab=profile" },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileSmartAccessNav() {
  return (
    <nav className="mobile-smart-access-nav" aria-label="Smart access navigation">
      {[
        { label: "Home", icon: Home, to: "/" },
        { label: "Listings", icon: Building2, to: "/app/access", active: true },
        { label: "Invest", icon: Wallet, to: "/app/payments" },
        { label: "Leads", icon: UserRound, to: "/app/messages" },
        { label: "Menu", icon: Menu, to: "/?tab=profile" },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileApplicationsNav() {
  return (
    <nav className="mobile-applications-nav" aria-label="Applications navigation">
      {[
        { label: "Home", icon: Home, to: "/" },
        { label: "Listings", icon: Building2, to: "/app/applications", active: true },
        { label: "Invest", icon: Wallet, to: "/app/payments" },
        { label: "Leads", icon: UserRound, to: "/app/messages" },
        { label: "Menu", icon: Menu, to: "/?tab=profile" },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileSupportNav() {
  return (
    <nav className="mobile-support-nav" aria-label="Support navigation">
      {[
        { label: "Home", icon: Home, to: "/" },
        { label: "Listings", icon: Building2, to: "/search" },
        { label: "Invest", icon: Wallet, to: "/app/payments" },
        { label: "Support", icon: Compass, to: "/app/support", active: true },
        { label: "Menu", icon: Menu, to: "/?tab=profile" },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileSettingsNav() {
  return (
    <nav className="mobile-settings-luxe-nav" aria-label="Settings navigation">
      {[
        { label: "Home", icon: Home, to: "/" },
        { label: "Listings", icon: Building2, to: "/search" },
        { label: "Invest", icon: Wallet, to: "/app/payments" },
        { label: "Leads", icon: UserRound, to: "/app/messages" },
        { label: "Menu", icon: Menu, to: "/app/settings", active: true },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobilePublicVerificationNav() {
  return (
    <nav className="mobile-public-verification-nav" aria-label="Public verification navigation">
      {[
        { label: "Explore", icon: Compass, to: "/" },
        { label: "Saved", icon: Heart, to: "/?tab=saved" },
        { label: "Messages", icon: Mail, to: "/app/messages" },
        { label: "Profile", icon: UserRound, to: "/?tab=profile", active: true },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileAgencyNav() {
  return (
    <nav className="mobile-agency-nav" aria-label="Agency navigation">
      {[
        { label: "Dashboard", icon: TrendingUp, to: `${WORKSPACE_ENTRY_PATH}?next=dashboard` },
        { label: "Properties", icon: Building2, to: `${WORKSPACE_ENTRY_PATH}?next=listings`, active: true },
        { label: "Leads", icon: UserRound, to: `${WORKSPACE_ENTRY_PATH}?next=leads` },
        { label: "Team", icon: BriefcaseBusiness, to: `${WORKSPACE_ENTRY_PATH}?next=team` },
        { label: "Wealth", icon: Wallet, to: `${WORKSPACE_ENTRY_PATH}?next=wealth` },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileAgencyNewListingNav() {
  return (
    <nav className="mobile-agency-nav" aria-label="Agency new listing navigation">
      {[
        { label: "Dashboard", icon: TrendingUp, to: `${WORKSPACE_ENTRY_PATH}?next=dashboard` },
        { label: "Properties", icon: HousePlus, to: `${WORKSPACE_ENTRY_PATH}?next=listings`, active: true },
        { label: "Leads", icon: UserRound, to: `${WORKSPACE_ENTRY_PATH}?next=leads` },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileAgencyLeadsNav() {
  return (
    <nav className="mobile-agency-nav" aria-label="Agency leads navigation">
      {[
        { label: "Dashboard", icon: TrendingUp, to: `${WORKSPACE_ENTRY_PATH}?next=dashboard` },
        { label: "Properties", icon: Building2, to: `${WORKSPACE_ENTRY_PATH}?next=listings` },
        { label: "Leads", icon: UserRound, to: `${WORKSPACE_ENTRY_PATH}?next=leads`, active: true },
        { label: "Team", icon: BriefcaseBusiness, to: `${WORKSPACE_ENTRY_PATH}?next=team` },
        { label: "Wealth", icon: Wallet, to: `${WORKSPACE_ENTRY_PATH}?next=wealth` },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileAgencyFinancialNav() {
  return (
    <nav className="mobile-agency-nav" aria-label="Agency financial navigation">
      {[
        { label: "Dashboard", icon: TrendingUp, to: `${WORKSPACE_ENTRY_PATH}?next=dashboard` },
        { label: "Properties", icon: Building2, to: `${WORKSPACE_ENTRY_PATH}?next=listings` },
        { label: "Leads", icon: UserRound, to: `${WORKSPACE_ENTRY_PATH}?next=leads` },
        { label: "Wealth", icon: Wallet, to: `${WORKSPACE_ENTRY_PATH}?next=wealth`, active: true },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileAgencySettingsNav() {
  return (
    <nav className="mobile-agency-nav" aria-label="Agency settings navigation">
      {[
        { label: "Dashboard", icon: TrendingUp, to: `${WORKSPACE_ENTRY_PATH}?next=dashboard` },
        { label: "Properties", icon: Building2, to: `${WORKSPACE_ENTRY_PATH}?next=listings` },
        { label: "Leads", icon: UserRound, to: `${WORKSPACE_ENTRY_PATH}?next=leads` },
        { label: "Team", icon: CalendarDays, to: `${WORKSPACE_ENTRY_PATH}?next=settings`, active: true },
        { label: "Wealth", icon: Wallet, to: `${WORKSPACE_ENTRY_PATH}?next=wealth` },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileAgencyTeamNav() {
  return (
    <nav className="mobile-agency-nav" aria-label="Agency team navigation">
      {[
        { label: "Dashboard", icon: TrendingUp, to: `${WORKSPACE_ENTRY_PATH}?next=dashboard` },
        { label: "Properties", icon: Building2, to: `${WORKSPACE_ENTRY_PATH}?next=listings` },
        { label: "Team", icon: UserRound, to: `${WORKSPACE_ENTRY_PATH}?next=team`, active: true },
        { label: "Schedule", icon: CalendarDays, to: "/app/concierge" },
        { label: "Wealth", icon: Wallet, to: `${WORKSPACE_ENTRY_PATH}?next=wealth` },
      ].map(({ label, icon: Icon, to, active }) => (
        <Link
          key={label}
          to={to}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Search;
  title: string;
  body?: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="mobile-empty">
      <Icon aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {body ? <p>{body}</p> : null}
      </div>
      {action && (
        <Link to={action.to} className="mobile-primary-link">
          {action.label}
          <ChevronRight aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function MobileTabButton({
  active,
  icon: Icon,
  label,
  to,
  badge,
}: {
  active: boolean;
  icon: typeof Home;
  label: string;
  to: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className={`mobile-tab-button ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
      {badge && badge > 0 ? (
        <strong className="mobile-tab-badge">{badge > 99 ? "99+" : badge}</strong>
      ) : null}
    </Link>
  );
}

export function MobileAppShell({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { preference: themePreference, setPreference: setThemePreference } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [dealCases, setDealCases] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [propertyViewings, setPropertyViewings] = useState<any[]>([]);
  const [propertyPayments, setPropertyPayments] = useState<any[]>([]);
  const [savedAlerts, setSavedAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [fieldNote, setFieldNote] = useState("");
  const [lastLocation, setLastLocation] = useState<string | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<MobileCapturedPhoto[]>([]);
  const [scannedDocuments, setScannedDocuments] = useState<MobileScannedDocument[]>([]);
  const [pushStatus, setPushStatus] = useState<"idle" | "registered" | "denied" | "unsupported" | "failed">(
    "idle"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [appLockStatus, setAppLockStatus] = useState<MobileAppLockStatus>({
    enabled: false,
    locked: false,
    lockedAt: null,
    biometryAvailable: false,
    biometryLabel: null,
    deviceCredentialAvailable: false,
    nativeUnlockAvailable: false,
  });
  const [appLockSheetOpen, setAppLockSheetOpen] = useState(false);
  const [appLockCode, setAppLockCode] = useState("");
  const isNativeApp = mobileNativeService.isNative();
  const [onboardingReady, setOnboardingReady] = useState(() => !isNativeApp);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const pullStartY = useRef<number | null>(null);

  const initialsSource = user?.user_metadata?.full_name || user?.email || "BaytMiftah";
  const initials = initialsSource
    .split(/[ @.]/)
    .filter(Boolean)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [listingRows, agencyRows] = await Promise.all([
          listingService.getPublicListings(10, 0),
          organizationService.getVerifiedOrganizations(6),
        ]);

        if (!cancelled) {
          setListings(listingRows || []);
          setAgencies(agencyRows || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOnboardingStatus = async () => {
      if (!isNativeApp) {
        setOnboardingReady(true);
        setShowOnboarding(false);
        return;
      }

      try {
        const status = await mobileOnboardingService.getStatus();

        if (!cancelled) {
          setShowOnboarding(!status.completed);
          setOnboardingReady(true);
        }
      } catch {
        if (!cancelled) {
          setShowOnboarding(true);
          setOnboardingReady(true);
        }
      }
    };

    void loadOnboardingStatus();

    return () => {
      cancelled = true;
    };
  }, [isNativeApp]);

  useEffect(() => {
    if (!user) {
      setSaved([]);
      setOrganizations([]);
      setDealCases([]);
      setConversations([]);
      setPropertyViewings([]);
      setPropertyPayments([]);
      setSavedAlerts([]);
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }

    let cancelled = false;

    const loadPrivateData = async () => {
      const [
        savedRows,
        orgRows,
        dealRows,
        chatRows,
        viewingRows,
        paymentRows,
        alertRows,
        unreadCount,
        notificationRows,
      ] =
        await Promise.all([
          savedPropertyService.getSavedProperties(user.id).catch(() => []),
          organizationService.getUserOrganizations(user.id).catch(() => []),
          dealCaseService.getDealCasesByUser(user.id).catch(() => []),
          messageService.getUserConversations(user.id).catch(() => []),
          propertyViewingService.getUserViewings(user.id).catch(() => []),
          paymentService.getUserPropertyTransactions(user.id).catch(() => []),
          savedSearchAlertService.getUserAlerts(user.id).catch(() => []),
          communicationService.getUnreadCount(user.id).catch(() => 0),
          communicationService.getNotificationHistory(user.id, 4).catch(() => []),
        ]);

      if (!cancelled) {
        setSaved(savedRows || []);
        setOrganizations(orgRows || []);
        setDealCases(dealRows || []);
        setConversations(chatRows || []);
        setPropertyViewings(viewingRows || []);
        setPropertyPayments(paymentRows || []);
        setSavedAlerts(alertRows || []);
        setUnreadNotifications(unreadCount || 0);
        setNotifications(notificationRows || []);
      }
    };

    void loadPrivateData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const updateQueueCount = () => {
      void mobileOfflineQueueService.count().then((count) => {
        if (!cancelled) setOfflineQueueCount(count);
      });
    };

    updateQueueCount();
    window.addEventListener("online", updateQueueCount);
    window.addEventListener("baytmiftah:offline-queue-change", updateQueueCount);

    return () => {
      cancelled = true;
      window.removeEventListener("online", updateQueueCount);
      window.removeEventListener("baytmiftah:offline-queue-change", updateQueueCount);
    };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let mounted = true;

    void mobileNativeService
      .watchPushOpens((url) => {
        navigate(mobileDeepLinkService.toAppPath(url));
      })
      .then((nextCleanup) => {
        if (mounted) cleanup = nextCleanup;
        else nextCleanup();
      });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    const updateAppLockStatus = () => {
      void mobileAppLockService.getStatus().then((status) => {
        if (!cancelled) setAppLockStatus(status);
      });
    };

    updateAppLockStatus();
    window.addEventListener("baytmiftah:app-lock-change", updateAppLockStatus);

    return () => {
      cancelled = true;
      window.removeEventListener("baytmiftah:app-lock-change", updateAppLockStatus);
    };
  }, []);

  const activeTab = getCurrentMobileTab(location.pathname, searchParams);
  const isSearchRoute = location.pathname.startsWith("/search");
  const isPropertyDetailRoute = location.pathname.startsWith("/property/");
  const isGuideRoute = location.pathname.startsWith("/guides");
  const isPrivacyRoute = location.pathname.startsWith("/legal/privacy");
  const isValuationRoute = location.pathname.startsWith("/valuation");
  const isSoldLedgerRoute = location.pathname.startsWith("/sold-ledger");
  const isPublicVerificationRoute = location.pathname.startsWith("/verify/");
  const isAlertsRoute = location.pathname.startsWith("/app/alerts");
  const isPaymentsRoute = location.pathname.startsWith("/app/payments");
  const isBuyingToolsRoute = location.pathname.startsWith("/app/buying-tools");
  const isConciergeRoute = location.pathname.startsWith("/app/concierge");
  const isAccessRoute = location.pathname.startsWith("/app/access");
  const isApplicationsRoute =
    location.pathname.startsWith("/app/applications") ||
    location.pathname.startsWith("/app/verification");
  const isSupportRoute = location.pathname.startsWith("/app/support");
  const isSettingsRoute = location.pathname.startsWith("/app/settings");
  const isVerificationRoute = false;
  const isWorkspaceListingsRoute =
    location.pathname.startsWith("/workspace") &&
    (searchParams.get("next") === "listings" || location.pathname.includes("/listings"));
  const isWorkspaceNewListingRoute =
    location.pathname.startsWith("/workspace") &&
    (searchParams.get("next") === "new-listing" ||
      searchParams.get("next") === "create-listing" ||
      location.pathname.endsWith("/new") ||
      location.pathname.includes("/new-listing"));
  const isWorkspaceLeadsRoute =
    location.pathname.startsWith("/workspace") &&
    (searchParams.get("next") === "leads" ||
      searchParams.get("next") === "crm" ||
      location.pathname.includes("/messages") ||
      location.pathname.includes("/leads"));
  const isWorkspaceWealthRoute =
    location.pathname.startsWith("/workspace") &&
    (searchParams.get("next") === "wealth" ||
      searchParams.get("next") === "financial" ||
      location.pathname.includes("/finance") ||
      location.pathname.includes("/payments") ||
      location.pathname.includes("/wealth") ||
      location.pathname.includes("/financial"));
  const isWorkspaceSettingsRoute =
    location.pathname.startsWith("/workspace") &&
    (searchParams.get("next") === "settings" ||
      searchParams.get("next") === "agency-settings" ||
      location.pathname.includes("/settings"));
  const isWorkspaceTeamRoute =
    location.pathname.startsWith("/workspace") &&
    (searchParams.get("next") === "team" ||
      searchParams.get("next") === "operations" ||
      location.pathname.includes("/team"));
  const isHomeRoute = location.pathname === "/" || location.pathname === "/app";
  const isMobileTabShellRoute =
    isHomeRoute ||
    isSearchRoute ||
    isPropertyDetailRoute ||
    isGuideRoute ||
    isPrivacyRoute ||
    isValuationRoute ||
    isSoldLedgerRoute ||
    isPublicVerificationRoute ||
    isAlertsRoute ||
    isPaymentsRoute ||
    isBuyingToolsRoute ||
    isConciergeRoute ||
    isAccessRoute ||
    isApplicationsRoute ||
    isSupportRoute ||
    isSettingsRoute ||
    isWorkspaceListingsRoute ||
    isWorkspaceNewListingRoute ||
    isWorkspaceLeadsRoute ||
    isWorkspaceWealthRoute ||
    isWorkspaceSettingsRoute ||
    isWorkspaceTeamRoute ||
    activeTab === "insights" ||
    activeTab === "invest";
  const homeListings = listings;

  const featuredListing = homeListings[0] || listings[0];
  const workspacePath = `${WORKSPACE_ENTRY_PATH}?next=dashboard`;
  const hasWorkspaceAccess = organizations.length > 0;
  const openDeals = dealCases.filter(
    (dealCase) => !["won", "lost"].includes(dealCase.pipeline_stage || "")
  );
  const upcomingViewings = propertyViewings.slice(0, 2);
  const routeTitle = getMobileRouteTitle(location.pathname);
  const activityBadgeCount =
    openDeals.length + propertyViewings.length + propertyPayments.length + unreadNotifications;
  const savedBadgeCount = saved.length + savedAlerts.length;
  const accountBadgeCount = organizations.length;
  const hasMobileTabBar =
    (Boolean(user) || activeTab === "home") &&
    !isPrivacyRoute &&
    !isAlertsRoute &&
    !isPublicVerificationRoute;
  const profileName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "BaytMiftah user";
  const profileEmail = user?.email || "Add an email";
  const profilePhone = user?.phone || user?.user_metadata?.phone || "Add phone";
  const accountSubtitle = organizations.length
    ? `${organizations.length} workspace${organizations.length === 1 ? "" : "s"} connected`
    : "Premium Buyer Account";
  const currentThemeOption =
    APP_THEME_OPTIONS.find((option) => option.value === themePreference) || APP_THEME_OPTIONS[0];
  const profileAvatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.photo_url;
  const pushNotificationsEnabled = pushStatus === "registered";
  const locationServicesEnabled = Boolean(lastLocation);

  const cycleThemePreference = () => {
    const themeCycle = ["aureus", "baytmiftah", "system"] as const;
    const currentIndex = themeCycle.findIndex((option) => option === themePreference);
    const nextValue = themeCycle[(currentIndex + 1) % themeCycle.length];
    const nextOption = APP_THEME_OPTIONS.find((option) => option.value === nextValue);

    if (nextOption) {
      setThemePreference(nextOption.value);
      toast.success(`${nextOption.label} appearance selected.`);
    }
  };

  const refreshMobileData = async () => {
    try {
      setIsRefreshing(true);
      const [listingRows, agencyRows] = await Promise.all([
        listingService.getPublicListings(10, 0).catch(() => listings),
        organizationService.getVerifiedOrganizations(6).catch(() => agencies),
      ]);

      setListings(listingRows || []);
      setAgencies(agencyRows || []);

      if (user) {
        const [
          savedRows,
          orgRows,
          dealRows,
          chatRows,
          viewingRows,
          paymentRows,
          alertRows,
          unreadCount,
          notificationRows,
        ] = await Promise.all([
          savedPropertyService.getSavedProperties(user.id).catch(() => saved),
          organizationService.getUserOrganizations(user.id).catch(() => organizations),
          dealCaseService.getDealCasesByUser(user.id).catch(() => dealCases),
          messageService.getUserConversations(user.id).catch(() => conversations),
          propertyViewingService.getUserViewings(user.id).catch(() => propertyViewings),
          paymentService.getUserPropertyTransactions(user.id).catch(() => propertyPayments),
          savedSearchAlertService.getUserAlerts(user.id).catch(() => savedAlerts),
          communicationService.getUnreadCount(user.id).catch(() => unreadNotifications),
          communicationService.getNotificationHistory(user.id, 4).catch(() => notifications),
        ]);

        setSaved(savedRows || []);
        setOrganizations(orgRows || []);
        setDealCases(dealRows || []);
        setConversations(chatRows || []);
        setPropertyViewings(viewingRows || []);
        setPropertyPayments(paymentRows || []);
        setSavedAlerts(alertRows || []);
        setUnreadNotifications(unreadCount || 0);
        setNotifications(notificationRows || []);
      }

      setOfflineQueueCount(await mobileOfflineQueueService.count());
      await mobileNativeService.impact();
      toast.success("Mobile data refreshed.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (window.scrollY <= 4) {
      pullStartY.current = event.touches[0]?.clientY ?? null;
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (pullStartY.current == null || isRefreshing) {
      pullStartY.current = null;
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? pullStartY.current;
    const distance = endY - pullStartY.current;
    pullStartY.current = null;

    if (distance > 72 && window.scrollY <= 4) {
      void refreshMobileData();
    }
  };

  const handleSettingsSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out.");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Failed to sign out:", error);
      toast.error("Couldn't sign you out right now.");
    }
  };

  const saveFieldNote = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const note = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `field-note-${Date.now()}`,
      note: fieldNote.trim() || "Quick field note",
      location: lastLocation,
      createdAt: new Date().toISOString(),
    };
    await mobileOfflineQueueService.enqueue("field-note", note);
    setOfflineQueueCount(await mobileOfflineQueueService.count());
    setFieldNote("");
    await mobileNativeService.impact();
    toast.success("Saved to offline queue.");
  };

  const syncOfflineQueue = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (offlineQueueCount === 0) {
      toast.message("Offline queue is already clear.");
      return;
    }

    try {
      setIsSyncingOffline(true);
      const result = await mobileOfflineSyncService.syncQueuedItems(user.id);

      setOfflineQueueCount(result.remaining);
      await mobileNativeService.impact();

      if (result.offline) {
        toast.message("You are offline. We will keep these items queued.");
        return;
      }

      if (result.failed > 0) {
        toast.error(
          `${result.failed} item${result.failed === 1 ? "" : "s"} need another try.`
        );
        return;
      }

      toast.success(
        result.synced > 0
          ? `Synced ${result.synced} queued item${result.synced === 1 ? "" : "s"}.`
          : "No queued items needed syncing."
      );
    } catch (error) {
      console.error("Failed to sync offline queue:", error);
      toast.error("We couldn't sync the offline queue yet.");
    } finally {
      setIsSyncingOffline(false);
    }
  };

  const refreshAppLockStatus = async () => {
    setAppLockStatus(await mobileAppLockService.getStatus());
  };

  const openAppLockSheet = () => {
    setAppLockCode("");
    setAppLockSheetOpen(true);
  };

  const handleEnableAppLock = async () => {
    try {
      await mobileAppLockService.enable(appLockCode);
      await refreshAppLockStatus();
      setAppLockCode("");
      await mobileNativeService.impact();
      toast.success("App lock enabled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to enable app lock.");
    }
  };

  const handleVerifyAppLock = async () => {
    const verified = await mobileAppLockService.verify(appLockCode);
    setAppLockCode("");
    await refreshAppLockStatus();

    if (verified) {
      await mobileNativeService.impact();
      toast.success("App unlocked.");
      return;
    }

    toast.error("That app lock code did not match.");
  };

  const handleDeviceUnlock = async () => {
    const unlocked = await mobileAppLockService.unlockWithDevice();
    await refreshAppLockStatus();

    if (unlocked) {
      await mobileNativeService.impact();
      toast.success("Unlocked with device security.");
      return;
    }

    toast.error(appLockStatus.nativeUnlockReason || "Device unlock was not completed.");
  };

  const handleDisableAppLock = async () => {
    await mobileAppLockService.disable();
    await refreshAppLockStatus();
    setAppLockCode("");
    await mobileNativeService.impact();
    toast.success("App lock turned off.");
  };

  const handleLockNow = async () => {
    await mobileAppLockService.lock();
    await refreshAppLockStatus();
    setAppLockCode("");
    await mobileNativeService.impact();
    toast.success("App locked.");
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not available on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        setLastLocation(value);
        toast.success("GPS captured for this visit.");
      },
      () => toast.error("Unable to capture GPS. Check location permissions."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(getTabHref(activeTab));
  };

  const handleNotificationOpen = async (notification: NotificationRecord) => {
    if (!notification.read) {
      try {
        await communicationService.markAsRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read: true,
                  read_at: new Date().toISOString(),
                }
              : item
          )
        );
        setUnreadNotifications((current) => Math.max(0, current - 1));
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    navigate(notification.action_url || getTabHref("messages"));
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!user || unreadNotifications === 0) {
      return;
    }

    try {
      await communicationService.markAllAsRead(user.id);
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          read_at: item.read_at || new Date().toISOString(),
        }))
      );
      setUnreadNotifications(0);
      toast.success("Notifications marked as read.");
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      toast.error("We couldn't update your notifications.");
    }
  };

  const enablePushNotifications = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const result = await pushNotificationService.registerPush(user.id, {
        onOpenUrl: (url) => navigate(mobileDeepLinkService.toAppPath(url)),
      });

      setPushStatus(result.status);

      if (result.status === "registered") {
        await mobileNativeService.impact();
        toast.success("Push notifications are enabled.");
      } else if (result.status === "denied") {
        toast.error("Notification permission was denied.");
      } else if (result.status === "unsupported") {
        toast.error("Push notifications are not supported here.");
      } else {
        toast.error("Push notifications could not be enabled.");
      }
    } catch (error) {
      setPushStatus("failed");
      console.error("Failed to enable push notifications:", error);
      toast.error(error instanceof Error ? error.message : "Unable to enable push notifications.");
    }
  };

  const completeMobileOnboarding = async () => {
    try {
      await mobileOnboardingService.complete(mobileOnboardingAcceptedItems);
      setShowOnboarding(false);
      await mobileNativeService.impact();
      toast.success("Mobile onboarding complete.");
    } catch {
      toast.error("We could not save onboarding yet. Please try again.");
    }
  };

  const captureListingPhoto = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const photo = await mobileMediaService.capturePropertyPhoto();
      await mobileOfflineQueueService.enqueue("listing-photo", {
        photo,
        location: lastLocation,
        capturedBy: user.id,
      });
      setCapturedPhotos((current) => [photo, ...current].slice(0, 6));
      setOfflineQueueCount(await mobileOfflineQueueService.count());
      await mobileNativeService.impact();
      toast.success("Photo queued for listing upload.");
    } catch (error) {
      console.error("Failed to capture listing photo:", error);
      toast.error("We couldn't capture that photo.");
    }
  };

  const scanDealDocument = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const scan = await mobileDocumentScannerService.scanDocument(
        fieldNote.trim() ? `Scanned document - ${fieldNote.trim().slice(0, 36)}` : "Scanned deal document"
      );
      await mobileOfflineQueueService.enqueue("deal-document", {
        scan,
        title: scan.title,
        createdBy: user.id,
        location: lastLocation,
      });
      setScannedDocuments((current) => [scan, ...current].slice(0, 6));
      setOfflineQueueCount(await mobileOfflineQueueService.count());
      await mobileNativeService.impact();
      toast.success("Document scanned and queued.");
    } catch (error) {
      console.error("Failed to scan document:", error);
      toast.error("We couldn't scan that document.");
    }
  };

  const saveOfflineDraft = async (
    type: "message-draft" | "offer-draft" | "maintenance-report" | "viewing-request"
  ) => {
    if (!user) {
      navigate("/login");
      return;
    }

    const content = fieldNote.trim() || "Draft saved from BaytMiftah mobile.";
    const payload =
      type === "message-draft"
        ? { content, createdAt: new Date().toISOString() }
        : type === "offer-draft"
          ? { message: content, userId: user.id, createdAt: new Date().toISOString() }
          : type === "viewing-request"
            ? { requesterNote: content, userId: user.id, createdAt: new Date().toISOString() }
            : { note: content, location: lastLocation, createdAt: new Date().toISOString() };

    await mobileOfflineQueueService.enqueue(type, payload);
    setOfflineQueueCount(await mobileOfflineQueueService.count());
    setFieldNote("");
    await mobileNativeService.impact();
    toast.success("Draft saved to offline queue.");
  };

  const renderContent = () => {
    if (isPrivacyRoute) {
      return (
        <section className="mobile-privacy-luxe" aria-label="Privacy policy">
          <header className="mobile-privacy-topbar">
            <button type="button" aria-label="Go back" onClick={handleGoBack}>
              <ArrowLeft aria-hidden="true" />
            </button>
            <Link to="/" aria-label="BaytMiftah home">BaytMiftah</Link>
            <Link to="/settings" aria-label="Open settings">
              <SlidersHorizontal aria-hidden="true" />
            </Link>
          </header>

          <section className="mobile-privacy-hero">
            <span>Effective Date: October 24, 2023</span>
            <h1>Privacy Policy &amp; Data Protection</h1>
            <p>
              At BaytMiftah, your privacy is the cornerstone of our exclusive relationship. This
              document outlines how we protect your information with the same rigor we apply to
              securing the world&apos;s most prestigious properties.
            </p>
          </section>

          <section className="mobile-privacy-section">
            <h2>
              <FileText aria-hidden="true" />
              1. Collection of Information
            </h2>
            <article className="mobile-privacy-card">
              <p>
                We collect information that identifies, relates to, describes, or is reasonably
                capable of being associated with you. This includes:
              </p>
              <ul>
                <li>
                  <strong>Identity Data:</strong> Full name, professional title, and government-issued
                  identification where required for high-value transactions.
                </li>
                <li>
                  <strong>Financial Data:</strong> Verified proof of funds, credit history for lease
                  applications, and secure transaction metadata.
                </li>
                <li>
                  <strong>Digital Presence:</strong> IP addresses, browsing patterns on our exclusive
                  portal, and interaction logs with property viewings.
                </li>
              </ul>
            </article>
          </section>

          <section className="mobile-privacy-section">
            <h2>
              <ShieldCheck aria-hidden="true" />
              2. Information Usage
            </h2>
            <p>
              Your data is processed exclusively to provide a seamless and personalized real estate
              experience. We do not engage in mass-marketing or selling of user profiles.
            </p>
            <div className="mobile-privacy-mini-grid">
              <article>
                <strong>Service Optimization</strong>
                <span>Using preferences to curate listings that match your architectural taste.</span>
              </article>
              <article>
                <strong>Compliance</strong>
                <span>Fulfilling AML, KYC, and regulatory requirements.</span>
              </article>
            </div>
          </section>

          <img
            className="mobile-privacy-image"
            src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=900&q=85&auto=format&fit=crop"
            alt="Architectural privacy detail"
          />

          <section className="mobile-privacy-section">
            <h2>
              <Globe2 aria-hidden="true" />
              3. Your Global Rights
            </h2>
            <article className="mobile-privacy-card">
              <p>
                Regardless of your jurisdiction, BaytMiftah extends elite privacy controls aligned
                with modern global data protection standards.
              </p>
              <details>
                <summary>Right to Erasure</summary>
                <p>Request removal of account data where law and active transaction records permit.</p>
              </details>
              <details>
                <summary>Data Portability</summary>
                <p>Request a readable export of your profile and transaction information.</p>
              </details>
              <details>
                <summary>Restrict Processing</summary>
                <p>Limit optional personalization and marketing-style processing.</p>
              </details>
            </article>
          </section>

          <section className="mobile-privacy-section">
            <h2>
              <Shield aria-hidden="true" />
              4. Security Protocols
            </h2>
            <article className="mobile-privacy-security-card">
              <span>
                <Shield aria-hidden="true" />
              </span>
              <p>
                We use encryption at rest and in transit. Servers are hosted in controlled
                infrastructure with biometric access controls and 24/7 monitoring.
              </p>
            </article>
          </section>

          <section className="mobile-privacy-concierge">
            <h2>Privacy Concierge</h2>
            <p>
              Should you have inquiries regarding your data or these policies, our dedicated privacy
              team is available for a private consultation.
            </p>
            <Link to="/app/support">Submit Inquiry</Link>
          </section>

          <footer className="mobile-privacy-footer">
            <strong>BaytMiftah</strong>
            <span>© 2023 BaytMiftah International. All rights reserved.</span>
            <nav>
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/terms">Terms of Service</Link>
            </nav>
          </footer>
        </section>
      );
    }

    if (isValuationRoute) {
      return (
        <section className="mobile-valuation-luxe" aria-label="Home valuation">
          <header className="mobile-valuation-topbar">
            <Link to="/" className="mobile-valuation-brand" aria-label="BaytMiftah home">
              <MapPin aria-hidden="true" />
              <strong>BaytMiftah</strong>
            </Link>
            <Link to="/search" aria-label="Open filters">
              <SlidersHorizontal aria-hidden="true" />
            </Link>
          </header>

          <section className="mobile-valuation-hero">
            <span>AI-Powered Analysis</span>
            <h1>
              Discover your property&apos;s <em>true market value.</em>
            </h1>
            <p>
              Leverage our proprietary BaytMiftah Intelligence engine to analyze over 500 data
              points, including real-time market trends, neighborhood acoustics, and structural
              exclusivity.
            </p>
          </section>

          <div className="mobile-valuation-proof-grid" aria-label="Valuation benefits">
            <article>
              <ShieldCheck aria-hidden="true" />
              <strong>99.2% Accuracy</strong>
              <span>Validated against final sale prices</span>
            </article>
            <article>
              <Search aria-hidden="true" />
              <strong>Instant Results</strong>
              <span>Real-time market synchronization</span>
            </article>
          </div>

          <form className="mobile-valuation-form" aria-label="Calculate estimate">
            <label className="mobile-valuation-field mobile-valuation-field-full">
              <span>Property Address</span>
              <div>
                <Search aria-hidden="true" />
                <input type="text" placeholder="123 Emerald Ridge, Beverly" />
              </div>
            </label>

            <label className="mobile-valuation-field">
              <span>Bedrooms</span>
              <select defaultValue="5+ Beds">
                <option>5+ Beds</option>
                <option>4 Beds</option>
                <option>3 Beds</option>
              </select>
            </label>

            <label className="mobile-valuation-field">
              <span>Property Type</span>
              <select defaultValue="Single Family">
                <option>Single Family</option>
                <option>Apartment</option>
                <option>Villa</option>
              </select>
            </label>

            <label className="mobile-valuation-field mobile-valuation-field-full">
              <span>Estimated Interior (sq ft)</span>
              <input type="text" placeholder="e.g. 5200" />
            </label>

            <button type="button">
              Calculate Estimate
              <TrendingUp aria-hidden="true" />
            </button>
            <p>No registration required for initial range estimate.</p>
          </form>

          <section className="mobile-valuation-comps">
            <div className="mobile-valuation-comps-heading">
              <div>
                <h2>Comparable High-Value Estates</h2>
                <p>Properties that influence your current market valuation.</p>
              </div>
              <Link to="/market-trends">
                View Market Report
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>

            <div className="mobile-valuation-comps-list">
              {mobileValuationComparables.map((comparable) => (
                <MobileValuationComparableCard key={comparable.title} comparable={comparable} />
              ))}
            </div>
          </section>
        </section>
      );
    }

    if (isSoldLedgerRoute) {
      return (
        <section className="mobile-sold-ledger-luxe" aria-label="Sold ledger">
          <header className="mobile-sold-ledger-topbar">
            <Link to="/" className="mobile-sold-ledger-brand" aria-label="BaytMiftah home">
              <MapPin aria-hidden="true" />
              <strong>Obsidian Estate</strong>
            </Link>
            <Link to="/search" aria-label="Open filters">
              <SlidersHorizontal aria-hidden="true" />
            </Link>
          </header>

          <section className="mobile-sold-ledger-hero">
            <p>Sold Ledger</p>
            <h1>High-fidelity market data for luxury real estate transactions.</h1>
            <span>Real-time insights into liquidity and asset valuation.</span>
          </section>

          <div className="mobile-sold-ledger-metrics">
            <article>
              <strong>Average Premium</strong>
              <span>+12.4%</span>
            </article>
            <article>
              <strong>Avg. Days on Market</strong>
              <span>18 Days</span>
            </article>
          </div>

          <section className="mobile-sold-ledger-sector">
            <img
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=900&q=80&auto=format&fit=crop"
              alt="Luxury market map"
            />
            <div>
              <strong>Active Sector</strong>
              <span>Mayfair &amp; Belgravia</span>
            </div>
          </section>

          <section className="mobile-sold-ledger-filters" aria-label="Area filters">
            <h2>Area Filters</h2>
            {["Chelsea Waterfront", "Kensington Gardens", "Knightsbridge Central"].map((area, index) => (
              <button type="button" key={area} className={index === 0 ? "is-selected" : ""}>
                <span>{area}</span>
                <Radio aria-hidden="true" />
              </button>
            ))}
          </section>

          <section className="mobile-sold-ledger-recent">
            <div className="mobile-sold-ledger-recent-heading">
              <h2>Recent Acquisitions</h2>
              <Link to="/sold-ledger?download=report">
                Download Report
                <Share2 aria-hidden="true" />
              </Link>
            </div>
            <div className="mobile-sold-ledger-list">
              {mobileSoldLedgerAcquisitions.map((acquisition) => (
                <MobileSoldLedgerCard key={acquisition.title} acquisition={acquisition} />
              ))}
            </div>
          </section>

          <button type="button" className="mobile-sold-ledger-history">
            View Historical Ledger (2020 - 2024)
            <ChevronRight aria-hidden="true" />
          </button>
        </section>
      );
    }

    if (isPublicVerificationRoute) {
      return (
        <section className="mobile-public-verification-luxe" aria-label="Public verification receipt">
          <header className="mobile-public-verification-topbar">
            <Link to="/" className="mobile-public-verification-brand" aria-label="BaytMiftah home">
              <MapPin aria-hidden="true" />
              <strong>Obsidian Estate</strong>
            </Link>
            <Link to="/search" aria-label="Open filters">
              <SlidersHorizontal aria-hidden="true" />
            </Link>
          </header>

          <article className="mobile-public-verification-card">
            <ShieldCheck className="mobile-public-verification-watermark" aria-hidden="true" />

            <section className="mobile-public-verification-intro">
              <span>Authenticity Certificate</span>
              <h1>Verification Receipt</h1>
              <p>ID: OE-7729-BF-2024</p>
            </section>

            <figure className="mobile-public-verification-qr">
              <div>
                <img
                  src="https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=360&q=80&auto=format&fit=crop"
                  alt="Verification QR code displayed on a secure device"
                />
              </div>
              <figcaption>Scan to Validate</figcaption>
            </figure>

            <div className="mobile-public-verification-rule" aria-hidden="true" />

            <section className="mobile-public-verification-status">
              <span>
                <ShieldCheck aria-hidden="true" />
              </span>
              <p>
                <strong>Authenticity Verified</strong>
                Validated by Obsidian Compliance Board on Oct 24, 2024
              </p>
            </section>

            <dl className="mobile-public-verification-details">
              <div>
                <dt>Verified Entity</dt>
                <dd>
                  <strong>The Obsidian Penthouse</strong>
                  782 Belvedere Ave, Monaco
                </dd>
              </div>
              <div>
                <dt>Principal Representative</dt>
                <dd>
                  <strong>Julian Thorne</strong>
                  Lic. #RE-990-112
                </dd>
              </div>
              <div>
                <dt>Valuation Accuracy</dt>
                <dd className="mobile-public-verification-accuracy">
                  <strong>99.8%</strong>
                  <span>High Tier</span>
                </dd>
              </div>
              <div>
                <dt>Document Hash</dt>
                <dd className="mobile-public-verification-hash">f7e8a9c1d2b3a4f5e67890abcdef12345678</dd>
              </div>
            </dl>

            <figure className="mobile-public-verification-asset">
              <img
                src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=85&auto=format&fit=crop"
                alt="Verified luxury property interior"
              />
              <figcaption>Primary Asset View</figcaption>
            </figure>

            <div className="mobile-public-verification-rule" aria-hidden="true" />

            <p className="mobile-public-verification-proof">
              This document serves as public proof of verification for the aforementioned entity. It
              is cryptographically linked to the Obsidian Estate Global Registry. Any alterations to
              this digital receipt will void its legitimacy.
            </p>
          </article>

          <div className="mobile-public-verification-actions">
            <button type="button">
              <FileText aria-hidden="true" />
              Download
            </button>
            <button type="button">
              <Share2 aria-hidden="true" />
              Share
            </button>
          </div>

          <MobilePublicVerificationNav />
        </section>
      );
    }

    if (isAlertsRoute) {
      return (
        <section className="mobile-alerts-luxe" aria-label="Notifications">
          <header className="mobile-alerts-topbar">
            <Link to={getTabHref("profile")} className="mobile-alerts-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
            <Link to="/" className="mobile-alerts-brand" aria-label="BaytMiftah home">
              BaytMiftah
            </Link>
            <Link to="/app/alerts" className="mobile-alerts-bell" aria-label="Open alerts">
              <Bell aria-hidden="true" />
              <span aria-hidden="true" />
            </Link>
          </header>

          <section className="mobile-alerts-hero">
            <span>Intelligence Center</span>
            <h1>Notifications</h1>
          </section>

          <div className="mobile-alerts-tabs" role="tablist" aria-label="Notification filters">
            <button type="button" className="is-active">All Activity</button>
            <button type="button">Unread</button>
          </div>

          <section className="mobile-alerts-section">
            <header className="mobile-alerts-section-header">
              <div>
                <Wallet aria-hidden="true" />
                <h2>Transaction Updates</h2>
              </div>
              <span>2 Action Required</span>
            </header>

            <div className="mobile-alerts-card-list">
              {mobileLuxuryAlerts.transactions.map((alert) => (
                <article className="mobile-alerts-transaction-card" key={alert.title}>
                  {alert.image ? (
                    <img src={alert.image} alt="" />
                  ) : (
                    <div className="mobile-alerts-placeholder" aria-hidden="true">
                      <Wallet aria-hidden="true" />
                    </div>
                  )}
                  <header>
                    <h3>{alert.title}</h3>
                    <span>{alert.time}</span>
                  </header>
                  <p>
                    {alert.title === "Escrow Milestone Reached" ? "Inspection for " : "Your monthly yields from the "}
                    <strong>{alert.property}</strong>
                    {alert.title === "Escrow Milestone Reached"
                      ? " has been completed and cleared. Final closing documents are ready for signature."
                      : " have been deposited into your vault."}
                  </p>
                  {alert.action ? (
                    <div className="mobile-alerts-actions">
                      <Link to="/app/deals">{alert.action}</Link>
                      <Link to="/app/deals">Details</Link>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="mobile-alerts-section">
            <header className="mobile-alerts-section-header">
              <div>
                <Building2 aria-hidden="true" />
                <h2>Property Alerts</h2>
              </div>
            </header>

            <div className="mobile-alerts-property-list">
              {mobileLuxuryAlerts.property.map((alert) => (
                <article
                  className={`mobile-alerts-property-card ${alert.highlighted ? "is-highlighted" : ""}`}
                  key={alert.title}
                >
                  <div>
                    <span>{alert.tag}</span>
                    <small>{alert.time}</small>
                  </div>
                  <h3>{alert.title}</h3>
                  <p>{alert.detail}</p>
                  {alert.highlighted ? (
                    <Link to="/search">
                      View Listing
                      <ChevronRight aria-hidden="true" />
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="mobile-alerts-section">
            <header className="mobile-alerts-section-header">
              <div>
                <Shield aria-hidden="true" />
                <h2>Security Alerts</h2>
              </div>
            </header>

            <article className="mobile-alerts-security-card">
              <Shield aria-hidden="true" />
              <div>
                <h3>New Device Login</h3>
                <p>Chrome on MacOS (London, UK) accessed your vault settings.</p>
                <Link to="/app/settings">Check Security Logs</Link>
              </div>
            </article>
          </section>

          <footer className="mobile-alerts-footer">
            <strong>BaytMiftah</strong>
            <span>(c) 2024 BaytMiftah Luxury Real Estate. All Rights Reserved.</span>
            <nav>
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/terms">Terms of Service</Link>
              <Link to="/app/concierge">Concierge</Link>
            </nav>
          </footer>

          <nav className="mobile-alerts-bottom-nav" aria-label="Alerts navigation">
            <Link to="/">
              <Home aria-hidden="true" />
              Home
            </Link>
            <Link to="/search">
              <Building aria-hidden="true" />
              Listings
            </Link>
            <Link to="/app/alerts" aria-current="page">
              <Bell aria-hidden="true" />
              Alerts
            </Link>
            <Link to="/app/messages">
              <UserRound aria-hidden="true" />
              Leads
            </Link>
            <Link to={getTabHref("profile")}>
              <Menu aria-hidden="true" />
              Menu
            </Link>
          </nav>
        </section>
      );
    }

    if (isBuyingToolsRoute) {
      return (
        <section className="mobile-buyer-tools-luxe" aria-label="Buyer concierge">
          <header className="mobile-buyer-tools-topbar">
            <Link to={getTabHref("profile")} className="mobile-buyer-tools-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
            <Link to="/" className="mobile-buyer-tools-brand" aria-label="BaytMiftah home">
              BaytMiftah
            </Link>
            <Link to="/app/alerts" aria-label="Open notifications">
              <Bell aria-hidden="true" />
            </Link>
          </header>

          <section className="mobile-buyer-tools-hero">
            <h1>Buyer Concierge</h1>
            <p>
              Exquisite tools designed for the discerning investor. Precision meets elegance in
              your journey to acquire world-class assets.
            </p>
          </section>

          <section className="mobile-buyer-tools-card mobile-buyer-tools-wealth">
            <header>
              <div>
                <h2>Wealth Architect</h2>
                <span>Mortgage Simulation</span>
              </div>
              <Calculator aria-hidden="true" />
            </header>

            <label className="mobile-buyer-tools-field">
              <span>Asset Value</span>
              <input type="text" value="$ 2500000" readOnly aria-label="Asset value" />
            </label>

            <div className="mobile-buyer-tools-slider" aria-label="Down payment percentage">
              <span>Down Payment (%)</span>
              <div>
                <i />
              </div>
              <p>
                <small>10%</small>
                <strong>25% ($625,000)</strong>
                <small>80%</small>
              </p>
            </div>

            <article className="mobile-buyer-tools-estimate">
              <span>Estimated Monthly Commitment</span>
              <strong>$12,450</strong>
              <p>Based on 4.5% APR for 30 years</p>
              <button type="button">Speak to an Advisor</button>
            </article>
          </section>

          <section className="mobile-buyer-tools-card mobile-buyer-tools-exchange">
            <h2>
              <RefreshCw aria-hidden="true" />
              Global Exchange
            </h2>
            <div className="mobile-buyer-tools-rate">
              <span>USD</span>
              <strong>US Dollar</strong>
              <em>1.00</em>
            </div>
            <button type="button" aria-label="Swap currencies">
              <RefreshCw aria-hidden="true" />
            </button>
            <div className="mobile-buyer-tools-rate">
              <span>AED</span>
              <strong>UAE Dirham</strong>
              <em>3.67</em>
            </div>
            <p>Live market rates provided by BaytMiftah Treasury.</p>
          </section>

          <section className="mobile-buyer-tools-card mobile-buyer-tools-valuation">
            <span>Expert Appraisal</span>
            <h2>Request a Bespoke Valuation</h2>
            <p>
              Our specialists provide institutional-grade appraisals for high-value properties.
              Discover the true market potential of your portfolio.
            </p>
            <input type="text" placeholder="Enter Property Address" aria-label="Property address" />
            <button type="button">Get Assessment</button>
            <img
              src="https://images.unsplash.com/photo-1613977257363-707ba9348227?w=900&q=85&auto=format&fit=crop"
              alt=""
            />
          </section>

          <section className="mobile-buyer-tools-stack" aria-label="Concierge resources">
            {mobileBuyerTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <Link to="/app/concierge" className="mobile-buyer-tools-resource" key={tool.title}>
                  <span>
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{tool.title}</strong>
                    <p>{tool.detail}</p>
                  </div>
                </Link>
              );
            })}
          </section>

          <footer className="mobile-buyer-tools-footer">
            <strong>BaytMiftah</strong>
            <nav>
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/terms">Terms of Service</Link>
              <Link to="/legal/privacy">Investment Disclosure</Link>
              <Link to="/app/concierge">Concierge</Link>
            </nav>
            <span>(c) 2024 BaytMiftah Luxury Real Estate. All Rights Reserved.</span>
          </footer>
        </section>
      );
    }

    if (isConciergeRoute) {
      return (
        <section className="mobile-tour-luxe" aria-label="Tour management">
          <header className="mobile-tour-topbar">
            <Link to={getTabHref("profile")} className="mobile-tour-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
            <Link to="/" className="mobile-tour-brand" aria-label="BaytMiftah home">
              BaytMiftah
            </Link>
            <Link to="/app/alerts" aria-label="Open notifications">
              <Bell aria-hidden="true" />
            </Link>
          </header>

          <section className="mobile-tour-hero">
            <h1>Tour Management</h1>
            <p>
              Manage confirmed viewings for your elite portfolio. Seamless coordination for a
              signature client experience.
            </p>
          </section>

          <section className="mobile-tour-card mobile-tour-calendar" aria-label="October 2024 calendar">
            <header>
              <h2>October 2024</h2>
              <div>
                <button type="button" aria-label="Previous month">{"<"}</button>
                <button type="button" aria-label="Next month">{">"}</button>
              </div>
            </header>
            <div className="mobile-tour-weekdays" aria-hidden="true">
              {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mobile-tour-days">
              {mobileTourCalendarDays.map((day, index) => (
                <button
                  type="button"
                  key={`${day.label}-${index}`}
                  className={[
                    day.muted ? "is-muted" : "",
                    day.active ? "is-active" : "",
                    day.marked ? "is-marked" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mobile-tour-card mobile-tour-schedule">
            <h2>Daily Schedule</h2>
            <div>
              {mobileTourSchedule.map((tour) => (
                <article key={tour.title}>
                  <header>
                    <span>{tour.time}</span>
                    <em>{tour.status}</em>
                  </header>
                  <strong>{tour.title}</strong>
                  <p>
                    <UserRound aria-hidden="true" />
                    {tour.client}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mobile-tour-card mobile-tour-map" aria-label="Current tour location">
            <div className="mobile-tour-map-actions" aria-hidden="true">
              <button type="button">+</button>
              <button type="button">-</button>
            </div>
            <div className="mobile-tour-map-pill">
              <MapPin aria-hidden="true" />
              <div>
                <span>Current Tour Location</span>
                <strong>Downtown Skyline Penthouse B4</strong>
              </div>
            </div>
          </section>

          <section className="mobile-tour-card mobile-tour-detail">
            <article className="mobile-tour-guide">
              <span>Assigned Guide</span>
              <div>
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
                <p>
                  <strong>Elena Rossi</strong>
                  Elite Concierge
                </p>
              </div>
            </article>

            <article className="mobile-tour-highlights">
              <span>Property Highlights</span>
              <dl>
                <div>
                  <BedDouble aria-hidden="true" />
                  <dt>6 Bedrooms</dt>
                </div>
                <div>
                  <Leaf aria-hidden="true" />
                  <dt>Infinity Pool</dt>
                </div>
                <div>
                  <Ruler aria-hidden="true" />
                  <dt>12,400 Sq Ft</dt>
                </div>
              </dl>
            </article>

            <article className="mobile-tour-notes">
              <span>Viewing Notes</span>
              <blockquote>
                "Client expressed specific interest in the smart-home automation system and the
                temperature-controlled wine cellar. Ensure the automated lighting scenes are set to
                'Sunset Mode' prior to arrival. Guide should emphasize the 24/7 private security
                detail included in the HOA."
              </blockquote>
            </article>

            <div className="mobile-tour-actions">
              <button type="button">Edit Details</button>
              <button type="button">Reschedule</button>
            </div>
          </section>

          <Link to="/app/viewings" className="mobile-tour-floating-action" aria-label="Add tour">
            <Plus aria-hidden="true" />
          </Link>
        </section>
      );
    }

    if (isAccessRoute) {
      return (
        <section className="mobile-smart-access-luxe" aria-label="Smart access portfolio">
          <header className="mobile-smart-access-topbar">
            <Link to={getTabHref("profile")} className="mobile-smart-access-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
            <Link to="/" className="mobile-smart-access-brand" aria-label="BaytMiftah home">
              BaytMiftah
            </Link>
            <Link to="/app/alerts" aria-label="Open notifications">
              <Bell aria-hidden="true" />
            </Link>
          </header>

          <section className="mobile-smart-access-hero">
            <span>Security Hub</span>
            <h1>Elite Access Portfolio</h1>
            <p>
              Manage biometric entry, digital encryption keys, and real-time security logs for your
              luxury estates from a single secure interface.
            </p>
          </section>

          <section className="mobile-smart-access-lock-card">
            <header>
              <div>
                <h2>Villa Al-Majd</h2>
                <p>
                  <i aria-hidden="true" />
                  System Secure • 256-bit Encrypted
                </p>
              </div>
              <span>Main Entry</span>
            </header>
            <button type="button" aria-label="Cycle security state">
              <span>
                <LockKeyhole aria-hidden="true" />
                <strong>Locked</strong>
              </span>
            </button>
            <p>Tap to cycle security state</p>
          </section>

          <section className="mobile-smart-access-stats" aria-label="Access activity summary">
            <article>
              <ShieldCheck aria-hidden="true" />
              <span>24H Activity</span>
              <strong>12</strong>
              <p>Authorized Entries</p>
            </article>
            <article>
              <Shield aria-hidden="true" />
              <span>Active Guests</span>
              <strong>03</strong>
              <p>Temporal Access Keys</p>
            </article>
          </section>

          <section className="mobile-smart-access-card mobile-smart-access-keys">
            <header>
              <h2>Digital Keys</h2>
              <button type="button">Grant Access</button>
            </header>
            <div>
              {mobileSmartAccessKeys.map((accessKey) => (
                <article key={accessKey.name} className={accessKey.muted ? "is-muted" : undefined}>
                  {accessKey.image ? (
                    <img src={accessKey.image} alt="" />
                  ) : (
                    <span>
                      <UserRound aria-hidden="true" />
                    </span>
                  )}
                  <div>
                    <strong>{accessKey.name}</strong>
                    <p>{accessKey.detail}</p>
                  </div>
                  {accessKey.muted ? (
                    <RefreshCw aria-hidden="true" />
                  ) : (
                    <MoreVertical aria-hidden="true" />
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="mobile-smart-access-card mobile-smart-access-log">
            <header>
              <h2>Security Log</h2>
              <SlidersHorizontal aria-hidden="true" />
            </header>
            <div>
              {mobileSmartAccessLog.map((event) => (
                <article key={event.title} className={`is-${event.tone}`}>
                  <span>
                    {event.tone === "danger" ? (
                      <ShieldAlert aria-hidden="true" />
                    ) : event.tone === "info" ? (
                      <KeyRound aria-hidden="true" />
                    ) : (
                      <LockKeyhole aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <footer className="mobile-smart-access-footer">
            <strong>BaytMiftah</strong>
            <span>© 2024 BaytMiftah Luxury Real Estate. All Rights Reserved.</span>
            <nav>
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/terms">Terms of Service</Link>
            </nav>
          </footer>
        </section>
      );
    }

    if (isVerificationRoute) {
      return (
        <section className="mobile-applications-luxe mobile-verification-luxe" aria-label="Verification portfolio">
          <header className="mobile-applications-topbar">
            <Link to="/" className="mobile-applications-brand" aria-label="BaytMiftah home">
              BaytMiftah
            </Link>
            <Link to="/app/alerts" aria-label="Open notifications">
              <Bell aria-hidden="true" />
            </Link>
            <Link to={getTabHref("profile")} className="mobile-applications-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
          </header>

          <section className="mobile-applications-hero">
            <h1>Verification</h1>
            <p>Manage your identity, documents, and escrow readiness from one secure vault.</p>
          </section>

          <section className="mobile-applications-stats" aria-label="Verification summary">
            {mobileVerificationStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <article key={stat.label} className={stat.featured ? "is-featured" : undefined}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <Icon aria-hidden="true" />
                </article>
              );
            })}
          </section>

          <section className="mobile-applications-list" aria-label="Verification checks">
            {mobileVerificationChecks.map((check) => (
              <article className="mobile-application-card" key={check.title}>
                <div className="mobile-application-image">
                  <img src={check.image} alt="" />
                  <span>{check.status}</span>
                </div>
                <div className="mobile-application-body">
                  <header>
                    <div>
                      <h2>{check.title}</h2>
                      <p>
                        <MapPin aria-hidden="true" />
                        {check.location}
                      </p>
                    </div>
                    <strong>
                      {check.amount}
                      <small>{check.type}</small>
                    </strong>
                  </header>

                  <ol className="mobile-application-steps" aria-label={`${check.title} progress`}>
                    {check.steps.map((step, index) => (
                      <li
                        key={step}
                        className={[
                          index < check.activeStep ? "is-done" : "",
                          index === check.activeStep ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span />
                        <em>{step}</em>
                      </li>
                    ))}
                  </ol>

                  <footer>
                    {check.actions.map((action) => (
                      <button type="button" key={action}>
                        {action}
                      </button>
                    ))}
                  </footer>
                </div>
              </article>
            ))}
          </section>

          <section className="mobile-application-kyc">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>Your KYC verification is complete</strong>
              <p>
                Your identity and document checks are ready for escrow, agency review, and premium
                transaction workflows.
              </p>
            </div>
          </section>

          <footer className="mobile-applications-footer">
            <strong>BaytMiftah</strong>
            <span>© 2024 BaytMiftah Luxury Real Estate. All Rights Reserved.</span>
            <nav>
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/terms">Terms of Service</Link>
            </nav>
          </footer>
        </section>
      );
    }

    if (isApplicationsRoute) {
      return (
        <section className="mobile-applications-luxe" aria-label="Applications portfolio">
          <header className="mobile-applications-topbar">
            <Link to="/" className="mobile-applications-brand" aria-label="BaytMiftah home">
              BaytMiftah
            </Link>
            <Link to="/app/alerts" aria-label="Open notifications">
              <Bell aria-hidden="true" />
            </Link>
            <Link to={getTabHref("profile")} className="mobile-applications-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
          </header>

          <section className="mobile-applications-hero">
            <h1>My Applications</h1>
            <p>Track your high-value acquisitions and exclusive rental agreements.</p>
          </section>

          <section className="mobile-applications-stats" aria-label="Application summary">
            {mobileApplicationStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <article key={stat.label} className={stat.featured ? "is-featured" : undefined}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <Icon aria-hidden="true" />
                </article>
              );
            })}
          </section>

          <section className="mobile-applications-list" aria-label="Active applications">
            {mobileApplications.map((application) => (
              <article className="mobile-application-card" key={application.title}>
                <div className="mobile-application-image">
                  <img src={application.image} alt="" />
                  <span>{application.status}</span>
                </div>
                <div className="mobile-application-body">
                  <header>
                    <div>
                      <h2>{application.title}</h2>
                      <p>
                        <MapPin aria-hidden="true" />
                        {application.location}
                      </p>
                    </div>
                    <strong>
                      {application.amount}
                      <small>{application.type}</small>
                    </strong>
                  </header>

                  <ol className="mobile-application-steps" aria-label={`${application.title} progress`}>
                    {application.steps.map((step, index) => (
                      <li
                        key={step}
                        className={[
                          index < application.activeStep ? "is-done" : "",
                          index === application.activeStep ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span />
                        <em>{step}</em>
                      </li>
                    ))}
                  </ol>

                  <footer>
                    {application.actions.map((action) => (
                      <button type="button" key={action}>
                        {action}
                      </button>
                    ))}
                  </footer>
                </div>
              </article>
            ))}
          </section>

          <section className="mobile-application-kyc">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>Your KYC verification is complete</strong>
              <p>
                As a Gold Member, your escrow process is fast-tracked. No further action needed at
                this time.
              </p>
            </div>
          </section>

          <footer className="mobile-applications-footer">
            <strong>BaytMiftah</strong>
            <span>© 2024 BaytMiftah Luxury Real Estate. All Rights Reserved.</span>
            <nav>
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/terms">Terms of Service</Link>
            </nav>
          </footer>
        </section>
      );
    }

    if (isSupportRoute) {
      return (
        <section className="mobile-support-luxe" aria-label="Priority support">
          <header className="mobile-support-topbar">
            <Link to="/" className="mobile-support-brand" aria-label="BaytMiftah home">
              BaytMiftah
            </Link>
            <Link to="/app/alerts" aria-label="Open notifications">
              <Bell aria-hidden="true" />
            </Link>
            <Link to={getTabHref("profile")} className="mobile-support-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
          </header>

          <section className="mobile-support-hero">
            <h1>Priority Support</h1>
            <p>
              Elite assistance available 24/7 for our distinguished members. Experience seamless
              resolution through our dedicated concierge and technical teams.
            </p>
          </section>

          <label className="mobile-support-search">
            <Search aria-hidden="true" />
            <input type="search" placeholder="Search the Luxury Protocol FAQ..." />
          </label>

          <section className="mobile-support-card mobile-support-concierge-card">
            <span className="mobile-support-kicker">
              <ShieldCheck aria-hidden="true" />
              Priority Access
            </span>
            <div>
              <h2>Contact Personal Concierge</h2>
              <p>
                Immediate connection to your dedicated luxury advisor for bespoke property requests
                and lifestyle management.
              </p>
            </div>
            <footer>
              <Link to="/app/concierge">Start Direct Call</Link>
              <Link to="/app/messages">Secure Message</Link>
            </footer>
          </section>

          <section className="mobile-support-card mobile-support-inquiry-card">
            <span>
              <Landmark aria-hidden="true" />
            </span>
            <h2>Submit Technical Inquiry</h2>
            <p>
              Report issues with smart home integration, transaction portals, or secure document
              vaults.
            </p>
            <footer>
              <strong>Average response: 12 min</strong>
              <Link to="/app/messages" aria-label="Submit technical inquiry">
                <ChevronRight aria-hidden="true" />
              </Link>
            </footer>
          </section>

          <section className="mobile-support-protocol">
            <header>
              <div>
                <h2>Luxury Protocol</h2>
                <p>Our standards of engagement and property excellence.</p>
              </div>
              <Link to="/legal/terms">View All Protocols</Link>
            </header>
            {[
              "How do I authorize anonymous property viewing?",
              'What is the "Gold Key" transaction protocol?',
              "Emergency maintenance for global portfolios?",
              "Secure document storage standards?",
            ].map((question) => (
              <button type="button" key={question}>
                <span>{question}</span>
                <Plus aria-hidden="true" />
              </button>
            ))}
          </section>

          <section className="mobile-support-stats" aria-label="Support performance">
            {[
              ["24/7", "Availability"],
              ["100%", "Discretion"],
              ["15m", "Response Time"],
              ["Global", "Service Network"],
            ].map(([value, label]) => (
              <article key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </article>
            ))}
          </section>

          <footer className="mobile-support-footer">
            <strong>BaytMiftah</strong>
            <nav>
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/terms">Terms of Service</Link>
              <Link to="/app/insights">Investment Disclosure</Link>
              <Link to="/app/concierge">Concierge</Link>
            </nav>
            <span>© 2024 BaytMiftah Luxury Real Estate. All Rights Reserved.</span>
          </footer>
        </section>
      );
    }

    if (isSettingsRoute) {
      const settingsAvatar =
        profileAvatarUrl ||
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=85&auto=format&fit=crop";

      return (
        <section className="mobile-settings-luxe" aria-label="Settings">
          <header className="mobile-settings-luxe-topbar">
            <Link to={getTabHref("profile")} className="mobile-settings-luxe-avatar" aria-label="Open profile">
              <img src={settingsAvatar} alt="" />
            </Link>
            <Link to="/" className="mobile-settings-luxe-brand" aria-label="BaytMiftah home">
              BaytMiftah
            </Link>
            <Link to="/app/alerts" aria-label="Open notifications">
              <Bell aria-hidden="true" />
            </Link>
          </header>

          <section className="mobile-settings-luxe-profile">
            <img
              src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=760&q=86&auto=format&fit=crop"
              alt=""
              className="mobile-settings-luxe-cover"
            />
            <img src={settingsAvatar} alt="" className="mobile-settings-luxe-portrait" />
            <div>
              <h1>Khalid Al-Mansour</h1>
              <p>
                <strong>Elite Agency Partner</strong>
                <span> • Verified Gold Member</span>
              </p>
            </div>
            <button type="button">Edit Profile</button>
          </section>

          <section className="mobile-settings-luxe-card mobile-settings-security-card">
            <h2>
              <ShieldCheck aria-hidden="true" />
              Security &amp; Privacy
            </h2>
            <article>
              <div>
                <strong>Two-Factor Authentication</strong>
                <p>Add an extra layer of security to your account.</p>
              </div>
              <button
                type="button"
                className="mobile-settings-luxe-toggle is-on"
                role="switch"
                aria-checked="true"
                aria-label="Two-Factor Authentication"
              />
            </article>
            <Link to="/app/alerts">
              <div>
                <strong>Login History</strong>
                <p>Review your recent activity across all devices.</p>
              </div>
              <ChevronRight aria-hidden="true" />
            </Link>
            <article>
              <div>
                <strong>Data Encryption</strong>
                <p>Advanced end-to-end protection for your documents.</p>
              </div>
              <span>Active</span>
            </article>
          </section>

          <section className="mobile-settings-luxe-card mobile-settings-biometrics-card">
            <h2>
              <Fingerprint aria-hidden="true" />
              Biometrics
            </h2>
            <p>Enable seamless access using FaceID or TouchID for transactions and logins.</p>
            <div>
              <Fingerprint aria-hidden="true" />
              <strong>FaceID Enabled</strong>
            </div>
            <button type="button">Manage Biometrics</button>
          </section>

          <section className="mobile-settings-luxe-card mobile-settings-portfolio-card">
            <h2>
              <Wallet aria-hidden="true" />
              Portfolio Preferences
            </h2>
            <label>
              <span>Base Currency</span>
              <select defaultValue="USD - US Dollar" aria-label="Base currency">
                <option>USD - US Dollar</option>
                <option>GHS - Ghana Cedi</option>
                <option>AED - UAE Dirham</option>
              </select>
            </label>
            <div>
              <span>Investment Tier</span>
              <div>
                <button type="button">Commercial</button>
                <button type="button" className="is-active">
                  Residential
                </button>
                <button type="button">Land</button>
              </div>
            </div>
          </section>

          <section className="mobile-settings-luxe-card mobile-settings-notifications-card">
            <h2>
              <Bell aria-hidden="true" />
              Notifications
            </h2>
            {[
              ["New Listing Alerts", "Instant"],
              ["Price Change Updates", "Daily Digest"],
              ["Investment Reports", "Monthly"],
              ["Concierge Messages", "Instant"],
            ].map(([label, value]) => (
              <p key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </p>
            ))}
            <button type="button">Configure Channels</button>
          </section>

          <button
            type="button"
            className="mobile-settings-luxe-signout"
            onClick={() => void handleSettingsSignOut()}
          >
            <LogOut aria-hidden="true" />
            Sign Out of All Devices
          </button>

          <footer className="mobile-settings-luxe-footer">
            <strong>BaytMiftah</strong>
            <span>© 2024 BaytMiftah Luxury Real Estate. All Rights Reserved.</span>
            <nav>
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/terms">Terms of Service</Link>
            </nav>
          </footer>
        </section>
      );
    }

    if (isWorkspaceNewListingRoute) {
      const agencyName = organizations[0]?.name || "Estate Elite";
      const listingSteps = [
        { number: "01", title: "Basics", detail: "General Info", active: true },
        { number: "02", title: "Location", detail: "Map & Address" },
        { number: "03", title: "Features", detail: "Amenities & Specs" },
        { number: "04", title: "Media", detail: "Visual Assets" },
      ];

      return (
        <section className="mobile-agency-new-listing" aria-label="Create exclusive listing">
          <header className="mobile-agency-new-listing-topbar">
            <Link to={`${WORKSPACE_ENTRY_PATH}?next=analytics`}>analytics</Link>
            <strong>{agencyName}</strong>
            <Link to={getTabHref("profile")} className="mobile-agency-new-listing-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <span>{initials}</span>
              )}
            </Link>
          </header>

          <section className="mobile-agency-new-listing-hero">
            <h1>Create Exclusive Listing</h1>
            <p>
              Initialize a new ultra-premium property record. Ensure all details reflect the luxury standard of
              the Elite Portfolio.
            </p>
          </section>

          <section className="mobile-agency-listing-steps" aria-label="Listing setup steps">
            {listingSteps.map((step) => (
              <article className={`mobile-agency-listing-step ${step.active ? "is-active" : ""}`} key={step.number}>
                <span>{step.number}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </div>
              </article>
            ))}
          </section>

          <form className="mobile-agency-listing-form">
            <h2>Property Essentials</h2>
            <label className="mobile-agency-new-listing-field" htmlFor="exclusive-listing-title">
              <span>Listing Title</span>
              <input id="exclusive-listing-title" type="text" placeholder="e.g. The Penthouse at Azure Height" />
            </label>

            <label className="mobile-agency-new-listing-field" htmlFor="exclusive-property-type">
              <span>Property Type</span>
              <select id="exclusive-property-type" defaultValue="Luxury Villa">
                <option>Luxury Villa</option>
                <option>Penthouse</option>
                <option>Office Complex</option>
                <option>Warehouse</option>
                <option>Car Park</option>
              </select>
            </label>

            <label className="mobile-agency-new-listing-field" htmlFor="exclusive-listing-price">
              <span>Price (USD)</span>
              <div>
                <b>$</b>
                <input id="exclusive-listing-price" inputMode="decimal" type="text" placeholder="0.00" />
              </div>
            </label>

            <label className="mobile-agency-new-listing-field" htmlFor="exclusive-year-built">
              <span>Year Built</span>
              <input id="exclusive-year-built" inputMode="numeric" type="text" placeholder="2024" />
            </label>

            <label className="mobile-agency-new-listing-field" htmlFor="exclusive-description">
              <span>Confidential Description</span>
              <textarea
                id="exclusive-description"
                rows={5}
                placeholder="Describe the architectural narrative and exclusive highlights..."
              />
            </label>
          </form>

          <div className="mobile-agency-new-listing-actions">
            <button type="button">Continue</button>
          </div>
        </section>
      );
    }

    if (isWorkspaceListingsRoute) {
      const agencyName = organizations[0]?.name || "Estate Elite";

      return (
        <section className="mobile-agency-listings" aria-label="Listing management">
          <header className="mobile-agency-listings-topbar">
            <Link to={WORKSPACE_ENTRY_PATH} aria-label="Open workspace dashboard">
              <Building2 aria-hidden="true" />
              <strong>{agencyName}</strong>
            </Link>
          </header>

          <h1>Listing Management</h1>

          <section className="mobile-agency-metrics" aria-label="Portfolio metrics">
            {mobileAgencyListingMetrics.map((metric) => (
              <article key={metric.label} className={`mobile-agency-metric is-${metric.tone}`}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.helper}</small>
              </article>
            ))}
          </section>

          <section className="mobile-agency-controls" aria-label="Listing tools">
            <label>
              <Search aria-hidden="true" />
              <input type="search" placeholder="Search by address, client name, or ID" />
            </label>
            <div>
              <button type="button">
                <SlidersHorizontal aria-hidden="true" />
                Filters
              </button>
              <Link to={`${WORKSPACE_ENTRY_PATH}?next=new-listing`} className="is-primary">
                <Plus aria-hidden="true" />
                New Listing
              </Link>
            </div>
          </section>

          <section className="mobile-agency-listing-stack" aria-label="Managed listings">
            {mobileAgencyListings.map((listing) => (
              <article className="mobile-agency-listing-card" key={listing.title}>
                <div className="mobile-agency-listing-image">
                  <img src={listing.image} alt="" />
                  <span className={`is-${listing.status.toLowerCase().replace(/\s+/g, "-")}`}>
                    {listing.status}
                  </span>
                </div>
                <div className="mobile-agency-listing-body">
                  <header>
                    <div>
                      <h2>{listing.title}</h2>
                      <p>{listing.address}</p>
                    </div>
                    <strong>{listing.price}</strong>
                  </header>
                  <dl>
                    <div>
                      <dt>Views</dt>
                      <dd>{listing.views}</dd>
                    </div>
                    <div>
                      <dt>Inquiries</dt>
                      <dd>{listing.inquiries}</dd>
                    </div>
                    <div>
                      <dt>DOM</dt>
                      <dd>{listing.dom}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </section>
        </section>
      );
    }

    if (isWorkspaceLeadsRoute) {
      const agencyName = organizations[0]?.name || "Estate Elite";

      return (
        <section className="mobile-agency-leads" aria-label="Lead CRM">
          <header className="mobile-agency-leads-topbar">
            <Link to={WORKSPACE_ENTRY_PATH} aria-label="Open workspace dashboard">
              <Building2 aria-hidden="true" />
              <strong>{agencyName}</strong>
            </Link>
            <Link to={getTabHref("profile")} className="mobile-agency-leads-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <span>{initials}</span>
              )}
            </Link>
          </header>

          <section className="mobile-agency-leads-hero">
            <p>Lead Ecosystem</p>
            <h1>Client Intelligence</h1>
            <div>
              <button type="button">
                <UserRound aria-hidden="true" />
                New Lead
              </button>
              <button type="button">
                <SlidersHorizontal aria-hidden="true" />
                Filters
              </button>
            </div>
          </section>

          <section className="mobile-agency-lead-metrics" aria-label="Lead metrics">
            {mobileAgencyLeadMetrics.map(({ label, value, helper, icon: Icon, tone }) => (
              <article className={`is-${tone}`} key={label}>
                <div>
                  <Icon aria-hidden="true" />
                  <small>{helper}</small>
                </div>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>

          <section className="mobile-agency-priority">
            <header>
              <div>
                <h2>Priority Queue</h2>
                <span>12 High Priority</span>
              </div>
              <label>
                <Search aria-hidden="true" />
                <input type="search" placeholder="Search leads..." />
              </label>
            </header>

            <div className="mobile-agency-priority-list">
              {mobileAgencyPriorityLeads.map((lead) => (
                <article key={lead.name}>
                  <img src={lead.image} alt="" />
                  <div>
                    <header>
                      <h3>{lead.name}</h3>
                      <span className={`is-${lead.status.toLowerCase()}`}>{lead.status}</span>
                    </header>
                    <p>
                      <MapPin aria-hidden="true" />
                      {lead.property}
                    </p>
                    <em>{lead.note}</em>
                    <footer>
                      <button type="button" aria-label={`Call ${lead.name}`}>
                        <Phone aria-hidden="true" />
                      </button>
                      <button type="button" aria-label={`Message ${lead.name}`}>
                        <MessageCircle aria-hidden="true" />
                      </button>
                      <button type="button">Schedule</button>
                    </footer>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mobile-agency-lead-activity">
            <header>
              <h2>Recent Activity</h2>
              <MoreVertical aria-hidden="true" />
            </header>
            <div>
              {mobileAgencyLeadActivity.map(({ title, detail, time, icon: Icon, tone }) => (
                <article className={`is-${tone}`} key={title}>
                  <span>
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p>{detail}</p>
                    <small>{time}</small>
                  </div>
                </article>
              ))}
            </div>
            <Link to="/app/messages">View All Communication</Link>
          </section>

          <aside className="mobile-agency-ai-insight">
            <h2>
              <MessageCircle aria-hidden="true" />
              AI Prospecting Insight
            </h2>
            <p>
              Julian Vane has viewed the **Mayfair Penthouse** digital tour 4 times in the last 24 hours.
              Consider a direct follow-up with the updated floor plans.
            </p>
            <button type="button">Generate Personalized Email</button>
          </aside>
        </section>
      );
    }

    if (isWorkspaceWealthRoute) {
      const agencyName = organizations[0]?.name || "Estate Elite";

      return (
        <section className="mobile-agency-financial" aria-label="Agency financial management">
          <header className="mobile-agency-financial-topbar">
            <Link to={`${WORKSPACE_ENTRY_PATH}?next=analytics`}>analytics</Link>
            <strong>{agencyName}</strong>
            <Link to={getTabHref("profile")} className="mobile-agency-financial-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
          </header>

          <section className="mobile-agency-financial-hero">
            <h1>Wealth Management</h1>
            <p>Comprehensive financial performance and future revenue projections.</p>
            <article>
              <span>Commission Earned YTD</span>
              <strong>$2,410,500.00</strong>
            </article>
          </section>

          <section className="mobile-agency-financial-card mobile-agency-revenue-card">
            <header>
              <h2>Revenue Forecast</h2>
              <div>
                <span>12 Months</span>
                <button type="button">YTD</button>
              </div>
            </header>
            <div className="mobile-agency-revenue-chart" aria-label="Revenue forecast chart">
              {mobileAgencyFinancialForecast.map((bar, index) => (
                <div className="mobile-agency-revenue-bar-wrap" key={`${bar.month}-${index}`}>
                  {bar.value ? <em>{bar.value}</em> : null}
                  <i className={`is-${bar.tone}`} style={{ height: bar.height }} />
                  <small>{bar.month}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="mobile-agency-financial-card mobile-agency-escrow-card">
            <h2>Escrow Breakdown</h2>
            <div className="mobile-agency-escrow-list">
              {mobileAgencyEscrowBreakdown.map((row) => (
                <article key={row.label}>
                  <div>
                    <span>{row.label}</span>
                    <strong>{row.amount}</strong>
                  </div>
                  <p>
                    <i className={`is-${row.tone}`} style={{ width: row.progress }} />
                  </p>
                </article>
              ))}
            </div>
            <div className="mobile-agency-pipeline-health">
              <span>Pipeline Health</span>
              <p>
                Total Pending Volume: <strong>$44.8M</strong>
              </p>
            </div>
          </section>

          <section className="mobile-agency-financial-card mobile-agency-payouts-card">
            <header>
              <h2>Recent Payouts &amp; Billing</h2>
              <div>
                <button type="button">
                  <SlidersHorizontal aria-hidden="true" />
                  Filter
                </button>
                <button type="button">
                  <CalendarDays aria-hidden="true" />
                  Date Range
                </button>
              </div>
            </header>
            <div className="mobile-agency-payout-head" aria-hidden="true">
              <span>Property Ref</span>
              <span>Status</span>
              <span>Trans Type</span>
            </div>
            <div className="mobile-agency-payout-list">
              {mobileAgencyPayouts.map((payout) => (
                <article key={payout.invoice}>
                  <div>
                    <strong>{payout.property}</strong>
                    <small>{payout.invoice}</small>
                  </div>
                  <span className={payout.status.toLowerCase()}>{payout.status}</span>
                  <p>{payout.type}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mobile-agency-financial-docs" aria-label="Financial documents">
            {mobileAgencyFinancialDocuments.map((document) => {
              const Icon = document.icon;

              return (
                <article key={document.title}>
                  <span>
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{document.title}</strong>
                    <small>{document.detail}</small>
                  </div>
                  <button type="button" aria-label={`Download ${document.title}`}>
                    <Download aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </section>
        </section>
      );
    }

    if (isWorkspaceTeamRoute) {
      const agencyName = organizations[0]?.name || "Estate Elite";

      return (
        <section className="mobile-agency-team" aria-label="Agency team management">
          <header className="mobile-agency-team-topbar">
            <Link to={WORKSPACE_ENTRY_PATH} aria-label="Open workspace dashboard">
              <Building2 aria-hidden="true" />
              <strong>{agencyName}</strong>
            </Link>
            <Link to={getTabHref("profile")} className="mobile-agency-team-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
          </header>

          <section className="mobile-agency-team-hero">
            <p>
              <span>Operations</span>
              <ChevronRight aria-hidden="true" />
              <strong>Agency Team Management</strong>
            </p>
            <h1>Sterling Group Hierarchy</h1>
            <p>
              Manage your agency's top-tier talent. Oversee role assignments, monitor high-performance
              metrics, and expand your exclusive professional network.
            </p>
            <button type="button">
              <UserRound aria-hidden="true" />
              Invite New Member
            </button>
          </section>

          <section className="mobile-agency-team-metrics" aria-label="Team operations metrics">
            <article>
              <TrendingUp aria-hidden="true" />
              <span>Group GMV</span>
              <strong>$128.4M</strong>
              <small>+12% vs last quarter</small>
            </article>
            <article>
              <Building2 aria-hidden="true" />
              <span>Active Listings</span>
              <strong>42</strong>
              <small>High-net-worth portfolio</small>
            </article>
            <article className="mobile-agency-team-efficiency">
              <span>Team Efficiency</span>
              <strong>Exceeding Targets</strong>
              <div>
                {mobileAgencyTeamMembers.slice(0, 3).map((member) => (
                  <img key={member.name} src={member.image} alt="" />
                ))}
                <small>+18 Experts</small>
              </div>
            </article>
          </section>

          <section className="mobile-agency-directory" aria-label="Team directory">
            <header>
              <h2>Team Directory</h2>
              <label>
                <Search aria-hidden="true" />
                <input type="search" placeholder="Filter by name or role..." />
              </label>
            </header>

            <div className="mobile-agency-directory-list">
              {mobileAgencyTeamMembers.map((member) => (
                <article key={member.name}>
                  <img src={member.image} alt="" />
                  <div>
                    <header>
                      <h3>{member.name}</h3>
                      <strong>{member.value}</strong>
                    </header>
                    <p>{member.role}</p>
                    <div>
                      {member.badges.map((badge) => (
                        <span key={badge}>{badge}</span>
                      ))}
                    </div>
                  </div>
                  <Link to={`${WORKSPACE_ENTRY_PATH}?next=team`}>Detail</Link>
                </article>
              ))}
            </div>
          </section>

          <section className="mobile-agency-access" aria-label="Access hierarchy">
            <h2>Access Hierarchy</h2>
            <div>
              {mobileAgencyAccessHierarchy.map((item, index) => {
                const Icon = item.icon;

                return (
                  <article key={item.tier}>
                    <Icon aria-hidden="true" />
                    <strong>{item.tier}</strong>
                    <p>{item.detail}</p>
                    {index < mobileAgencyAccessHierarchy.length - 1 ? (
                      <ChevronRight aria-hidden="true" className="mobile-agency-access-down" />
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      );
    }

    if (isWorkspaceSettingsRoute) {
      const agencyName = organizations[0]?.name || "Estate Elite";

      return (
        <section className="mobile-agency-settings" aria-label="Agency settings">
          <header className="mobile-agency-settings-topbar">
            <Link to={WORKSPACE_ENTRY_PATH} aria-label="Open workspace dashboard">
              <Building2 aria-hidden="true" />
              <strong>{agencyName}</strong>
            </Link>
            <Link to={getTabHref("profile")} className="mobile-agency-settings-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
          </header>

          <section className="mobile-agency-settings-hero">
            <h1>Agency Settings</h1>
            <p>Refine your brokerage operations, branding, and lead distribution protocols.</p>
          </section>

          <section className="mobile-agency-settings-card mobile-agency-commission-card">
            <header>
              <span>
                <Wallet aria-hidden="true" />
              </span>
              <h2>Commission Structure</h2>
              <em>Active Strategy</em>
            </header>
            <label>
              <span>Base Split</span>
              <strong>
                85 / 15 <small>%</small>
              </strong>
            </label>
            <label>
              <span>Cap Threshold</span>
              <strong>$100,000</strong>
            </label>
            <div className="mobile-agency-settings-multipliers">
              <p>Tiered Multipliers</p>
              <article>
                <span>Volume &gt; $10M</span>
                <strong>90 / 10 Split</strong>
              </article>
              <article className="is-muted">
                <span>Volume &gt; $25M</span>
                <strong>95 / 5 Split</strong>
              </article>
            </div>
          </section>

          <section className="mobile-agency-settings-card mobile-agency-branding-card">
            <h2>
              <Crown aria-hidden="true" />
              Branding
            </h2>
            <div className="mobile-agency-color-row">
              <span>Primary Gold</span>
              <i className="is-gold" />
            </div>
            <div className="mobile-agency-color-row">
              <span>Midnight Navy</span>
              <i className="is-navy" />
            </div>
            <div className="mobile-agency-logo-preview">
              <span>Logotype Preview</span>
              <strong>Sterling &amp; Co.</strong>
            </div>
            <button type="button">Update Assets</button>
          </section>

          <section className="mobile-agency-settings-card mobile-agency-lead-card">
            <h2>
              <SlidersHorizontal aria-hidden="true" />
              Lead Assignment
            </h2>
            {[
              { title: "Round Robin", detail: "Distribute evenly among all active agents.", active: true },
              { title: "Performance Based", detail: "Route high-value leads to top producers.", active: false },
              { title: "Geographic Routing", detail: "Match zip codes to agent specialties.", active: false },
            ].map(({ title, detail, active }) => (
              <article key={title}>
                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
                <span className={active ? "is-on" : undefined} aria-hidden="true" />
              </article>
            ))}
          </section>

          <section className="mobile-agency-settings-card mobile-agency-priority-card">
            <h2>
              <Bell aria-hidden="true" />
              Priority Routing
            </h2>
            {[
              {
                title: "Contract Milestones",
                detail: "Email digest to Principal & Compliance Officer",
                icon: Mail,
              },
              {
                title: "Instant Lead SMS",
                detail: "Direct to Assigned Agent & Manager",
                icon: MessageCircle,
              },
              {
                title: "CRM Webhooks",
                detail: "Push data to Salesforce & Slack Channels",
                icon: Share2,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Link to={`${WORKSPACE_ENTRY_PATH}?next=settings`} key={item.title}>
                  <Icon aria-hidden="true" />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              );
            })}
          </section>

          <section className="mobile-agency-settings-card mobile-agency-intelligence-card">
            <span>
              <Star aria-hidden="true" />
            </span>
            <div>
              <h2>Intelligence Engine</h2>
              <p>Our proprietary AI is currently optimizing commission splits based on Q3 retention data.</p>
            </div>
            <button type="button">View Report</button>
          </section>
        </section>
      );
    }

    if (isPaymentsRoute) {
      return (
        <section className="mobile-payments-luxe" aria-label="Payments">
          <header className="mobile-payments-topbar">
            <Link to="/" className="mobile-payments-brand" aria-label="BaytMiftah home">
              BaytMiftah
            </Link>
            <div>
              <Link to="/app/alerts" aria-label="Open notifications">
                <Bell aria-hidden="true" />
              </Link>
              <Link to={getTabHref("profile")} className="mobile-payments-avatar" aria-label="Open profile">
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt="" />
                ) : (
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=85&auto=format&fit=crop"
                    alt=""
                  />
                )}
              </Link>
            </div>
          </header>

          <section className="mobile-payments-hero">
            <h1>Financial Overview</h1>
            <p>Manage your property investments, installments, and escrow security.</p>
            <button type="button">
              <Wallet aria-hidden="true" />
              Make Payment
            </button>
          </section>

          <section className="mobile-payments-card">
            <h2>Payment Methods</h2>
            <div className="mobile-payments-methods">
              {mobilePaymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <article key={method.title} className="mobile-payments-method">
                    <span>
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{method.title}</strong>
                      <small>{method.detail}</small>
                    </div>
                    {method.primary ? <em>Primary</em> : <MoreVertical aria-hidden="true" />}
                  </article>
                );
              })}
            </div>
            <button type="button" className="mobile-payments-add-method">
              + Add New Method
            </button>
          </section>

          <section className="mobile-payments-card mobile-payments-escrow">
            <h2>Escrow Status</h2>
            <div className="mobile-payments-escrow-row">
              <span>The Palm Jumeirah Penthouse</span>
              <strong>$12,400,000</strong>
            </div>
            <div className="mobile-payments-progress" aria-label="Escrow 75 percent secured">
              <span style={{ width: "75%" }} />
            </div>
            <div className="mobile-payments-escrow-row is-muted">
              <span>Verified (Phase 3/4)</span>
              <span>75% Secured</span>
            </div>
            <article className="mobile-payments-protected">
              <ShieldCheck aria-hidden="true" />
              <div>
                <strong>Funds Protected</strong>
                <p>Secured by BaytMiftah Trust Vault with provider escrow and audit controls active.</p>
              </div>
            </article>
          </section>

          <section className="mobile-payments-card mobile-payments-installments">
            <header>
              <h2>Upcoming Installments</h2>
              <span>Due Soon</span>
            </header>
            <div className="mobile-payments-installment-head" aria-hidden="true">
              <span>Property / Milestone</span>
              <span>Due Date</span>
              <span>Amount</span>
            </div>
            {mobileUpcomingInstallments.map((installment) => (
              <article className="mobile-payments-installment" key={installment.property}>
                <div>
                  <strong>{installment.property}</strong>
                  <small>{installment.milestone}</small>
                </div>
                <span>{installment.dueDate}</span>
                <strong>{installment.amount}</strong>
              </article>
            ))}
          </section>

          <section className="mobile-payments-card mobile-payments-history">
            <header>
              <h2>Payment History</h2>
              <button type="button">
                <SlidersHorizontal aria-hidden="true" />
                Filter
              </button>
            </header>
            {mobilePaymentHistory.map((payment) => (
              <article className="mobile-payments-history-item" key={payment.title}>
                <span>
                  <CheckCircle2 aria-hidden="true" />
                </span>
                <div>
                  <strong>{payment.title}</strong>
                  <small>{payment.detail}</small>
                </div>
                <div>
                  <strong>{payment.amount}</strong>
                  <small>{payment.date}</small>
                </div>
              </article>
            ))}
            <Link to="/app/payments?receipts=all" className="mobile-payments-receipts">
              View All Receipts
            </Link>
          </section>
        </section>
      );
    }

    if (isSearchRoute) {
      return (
        <section className="mobile-search-luxe" aria-label="Search results">
          <header className="mobile-search-luxe-topbar">
            <Link to="/" className="mobile-search-luxe-brand" aria-label="BaytMiftah home">
              <MapPin aria-hidden="true" />
              <strong>BaytMiftah</strong>
            </Link>
            <Link to="/search" className="mobile-search-luxe-control" aria-label="Open search filters">
              <SlidersHorizontal aria-hidden="true" />
            </Link>
            <Link to={getTabHref("profile")} className="mobile-search-luxe-avatar" aria-label="Open profile">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=85&auto=format&fit=crop"
                  alt=""
                />
              )}
            </Link>
          </header>

          <nav className="mobile-search-luxe-breadcrumb" aria-label="Search location">
            <Link to="/search?country=uae">UAE</Link>
            <span>&gt;</span>
            <Link to="/search?city=dubai">Dubai</Link>
            <span>&gt;</span>
            <Link to="/search?area=dubai-hills">Dubai Hills Estate</Link>
          </nav>

          <section className="mobile-search-luxe-hero">
            <h1>Exclusive Residences</h1>
            <p>142 bespoke properties available for discerning collectors.</p>
          </section>

          <div className="mobile-search-luxe-filters" aria-label="Active filters">
            <button type="button">
              Villa
              <X aria-hidden="true" />
            </button>
            <button type="button">
              5+ Beds
              <X aria-hidden="true" />
            </button>
            <button type="button" className="is-muted">
              Price Range
              <ChevronRight aria-hidden="true" />
            </button>
          </div>

          <div className="mobile-search-luxe-list">
            {mobileSearchResidences.map((residence) => (
              <MobileSearchResidenceCard key={residence.id} residence={residence} />
            ))}
          </div>

          <Link to="/search?view=map" className="mobile-search-luxe-map">
            <Navigation aria-hidden="true" />
            Show Map
          </Link>
        </section>
      );
    }

    if (isGuideRoute) {
      return (
        <section className="mobile-area-guide-luxe" aria-label="Area guide">
          <header className="mobile-area-guide-topbar">
            <Link to="/" className="mobile-area-guide-brand" aria-label="BaytMiftah home">
              <MapPin aria-hidden="true" />
              <strong>BaytMiftah</strong>
            </Link>
            <Link to="/search" aria-label="Open filters">
              <SlidersHorizontal aria-hidden="true" />
            </Link>
          </header>

          <section className="mobile-area-guide-hero">
            <img
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85&auto=format&fit=crop"
              alt="Bel Air Crest residence"
            />
            <div className="mobile-area-guide-hero-copy">
              <span>Prime Market</span>
              <h1>Bel Air Crest</h1>
              <p>An enclave of unparalleled privacy and architectural mastery, perched above the city of angels.</p>
            </div>
          </section>

          <h2 className="mobile-area-guide-section-title">Neighborhood Essence</h2>

          <section className="mobile-area-guide-essence">
            <article className="mobile-area-guide-atmosphere">
              <h3>The Atmosphere</h3>
              <p>
                Bel Air Crest is characterized by its silent, tree-lined streets and the discreet hum
                of security-guarded gates. It's where old-world prestige meets contemporary innovation.
                The air is cooler here, the vistas wider, and the sense of isolation is meticulously
                curated to provide a sanctuary for those who value peace above all else.
              </p>
              <div>
                <span>
                  <Trophy aria-hidden="true" />
                  High Security
                </span>
                <span>
                  <Leaf aria-hidden="true" />
                  Lush Greenery
                </span>
              </div>
            </article>

            <div className="mobile-area-guide-score-grid">
              <article>
                <strong>A+</strong>
                <span>Safety Rating</span>
              </article>
              <article>
                <strong>9.4</strong>
                <span>School Score</span>
              </article>
              <article>
                <strong>15 min</strong>
                <span>To Beverly Hills</span>
              </article>
              <article>
                <strong>Private</strong>
                <span>Club Access</span>
              </article>
            </div>
          </section>

          <section className="mobile-area-guide-gems-section">
            <div className="mobile-area-guide-gems-heading">
              <div>
                <h2>Curated Local Gems</h2>
                <p>Exclusive establishments favored by the local elite.</p>
              </div>
              <Link to="/search?view=map">
                View Full Map
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>

            <div className="mobile-area-guide-gems-list">
              {mobileAreaGuideGems.map((gem) => (
                <MobileAreaGuideGemCard key={gem.title} gem={gem} />
              ))}
            </div>
          </section>

          <section className="mobile-area-guide-map-card">
            <img
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=900&q=80&auto=format&fit=crop"
              alt="Bel Air Crest map"
            />
            <div>
              <span>Currently Viewing</span>
              <strong>Upper Bel Air Environs</strong>
            </div>
            <Link to="/search?area=bel-air-crest">
              Explore Properties Here
            </Link>
          </section>
        </section>
      );
    }

    if (isPropertyDetailRoute) {
      return (
        <section className="mobile-property-luxe-detail" aria-label="Property detail">
          <div className="mobile-property-luxe-hero">
            <img
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=90&auto=format&fit=crop"
              alt="The Glass House"
            />
            <div className="mobile-property-luxe-hero-scrim" />
            <Link to="/" className="mobile-property-luxe-icon is-left" aria-label="Back to explore">
              <ArrowLeft aria-hidden="true" />
            </Link>
            <Link to="/app/saved" className="mobile-property-luxe-icon is-right" aria-label="Save property">
              <Heart className="is-filled" aria-hidden="true" />
            </Link>
          </div>

          <div className="mobile-property-luxe-panel">
            <section className="mobile-property-luxe-title">
              <h1>The Glass House</h1>
              <p>
                <MapPin aria-hidden="true" />
                Malibu Highlands, CA
              </p>
              <strong>$12,450,000</strong>
              <div>
                <span>Booked tours (12)</span>
                <span>Fully furnished</span>
              </div>
            </section>

            <section className="mobile-property-luxe-stats" aria-label="Property facts">
              <div>
                <BedDouble aria-hidden="true" />
                <strong>5</strong>
                <span>Beds</span>
              </div>
              <div>
                <Bath aria-hidden="true" />
                <strong>7</strong>
                <span>Baths</span>
              </div>
              <div>
                <Ruler aria-hidden="true" />
                <strong>8.4k</strong>
                <span>Sqft</span>
              </div>
            </section>

            <section className="mobile-property-luxe-section">
              <h2>Description</h2>
              <p>
                A masterwork of contemporary architecture curated by BaytMiftah, The Glass
                House redefines coastal living with its seamless integration of obsidian
                steel, ultra-clear glass, and raw stone. Suspended above the Pacific, this
                residence offers 270-degree panoramic views through structural glass
                curtains. Every detail has been curated for the discerning collector of
                experiences, from the custom champagne-lit wine cellar to the automated
                gallery-grade lighting throughout.
              </p>
            </section>

            <section className="mobile-property-luxe-section">
              <h2>Amenities</h2>
              <div className="mobile-property-luxe-amenities">
                {[
                  { label: "Infinity Edge Pool", icon: Leaf },
                  { label: "Private Cinema", icon: Camera },
                  { label: "Wellness Center", icon: Zap },
                  { label: "Wine Obsidian Room", icon: Trophy },
                  { label: "Full Smart Automation", icon: BriefcaseBusiness },
                  { label: "6-Car Gallery", icon: Home },
                ].map(({ label, icon: Icon }) => (
                  <div key={label}>
                    <span>
                      <Icon aria-hidden="true" />
                    </span>
                    <strong>{label}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="mobile-property-luxe-agent" aria-label="Listing agent">
              <img
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=220&q=90&auto=format&fit=crop"
                alt="Julian Sterling"
              />
              <h2>Julian Sterling</h2>
              <p>BaytMiftah Senior Portfolio Director</p>
              <span>
                <Star aria-hidden="true" />
                4.9 (124 reviews)
              </span>
              <div>
                <button type="button" aria-label="Message Julian Sterling">
                  <MessageCircle aria-hidden="true" />
                </button>
                <button type="button" aria-label="Call Julian Sterling">
                  <Phone aria-hidden="true" />
                </button>
              </div>
            </section>

            <div className="mobile-property-luxe-cta">
              <button type="button">
                <MessageCircle aria-hidden="true" />
                Contact Agent
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === "home") {
      return (
        <section className="mobile-explore-home mobile-ghana-home" aria-label="BaytMiftah home">
          <header className="mobile-explore-topbar">
            <Link to={getTabHref("profile")} className="mobile-ghana-avatar" aria-label="Open profile">
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=90&auto=format&fit=crop"
                alt=""
              />
            </Link>
            <strong>BaytMiftah</strong>
            <Link to={user ? getTabHref("messages") : "/login"} className="mobile-ghana-bell" aria-label="Open notifications">
              <Bell aria-hidden="true" />
            </Link>
          </header>

          <div className="mobile-ghana-search-label">
            <MapPin aria-hidden="true" />
            <span>Current Search Area</span>
          </div>

          <Link to="/search?q=Cantonments%2C%20Accra" className="mobile-explore-search" aria-label="Search Cantonments, Accra">
            <Search aria-hidden="true" />
            <span>Cantonments, Accra</span>
          </Link>

          <div className="mobile-ghana-intents" aria-label="Property intent filters">
            {["Rent", "Buy", "Short Stay", "Land"].map((intent, index) => (
              <Link key={intent} to={`/search?q=${encodeURIComponent(intent)}`} className={index === 0 ? "is-active" : undefined}>
                {intent}
              </Link>
            ))}
          </div>

          <section className="mobile-ghana-categories" aria-label="Property categories">
            {mobileExploreCategories.map(({ label, count, icon: Icon }) => (
              <Link key={label} to={`/search?category=${encodeURIComponent(label)}`}>
                <span>
                  <Icon aria-hidden="true" />
                </span>
                <strong>{label}</strong>
                <small>{count}</small>
              </Link>
            ))}
          </section>

          <section className="mobile-ghana-hero" aria-label="Verified property">
            <img
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=90&auto=format&fit=crop"
              alt="45 Liberation Road"
            />
            <div className="mobile-ghana-hero-scrim" />
            <div className="mobile-ghana-hero-badge">
              <ShieldCheck aria-hidden="true" />
              Verified Property
            </div>
            <div className="mobile-ghana-hero-copy">
              <h1>45 Liberation Road</h1>
              <p>
                <MapPin aria-hidden="true" />
                Airport Residential, Accra
              </p>
              <div>
                <strong>GHC<br />14,500,000</strong>
                <Link to="/property/demo-airport-residential">
                  Explore<br />Property
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          <section className="mobile-explore-section mobile-explore-latest">
            <div className="mobile-explore-section-header">
              <h2>Featured Listings</h2>
              <Link to="/search">View All</Link>
            </div>
            <div className="mobile-ghana-featured-row">
              {mobileExploreFeaturedListings.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/property/${listing.id}`}
                  className="mobile-ghana-featured-card"
                >
                  <div className="mobile-ghana-featured-image">
                    <img src={listing.image} alt={listing.title} />
                    <button type="button" aria-label={`Save ${listing.title}`} onClick={(event) => event.preventDefault()}>
                      <Heart aria-hidden="true" />
                    </button>
                    <span>Verified</span>
                  </div>
                  <div className="mobile-ghana-featured-body">
                    <div>
                      <strong>{listing.price}</strong>
                      <span>{listing.suffix}</span>
                    </div>
                    <h3>{listing.title}</h3>
                    <div className="mobile-ghana-mini-stats">
                      <span>
                        <BedDouble aria-hidden="true" />
                        {listing.beds}
                      </span>
                      <span>
                        <Bath aria-hidden="true" />
                        {listing.baths}
                      </span>
                      <span>
                        <Ruler aria-hidden="true" />
                        {listing.area}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mobile-explore-section">
            <div className="mobile-explore-section-header">
              <h2>Verified Agents</h2>
            </div>
            <div className="mobile-ghana-agent-row">
              {mobileExploreAgents.map((agent) => (
                <article key={agent.name} className="mobile-ghana-agent-card">
                  <div className="mobile-ghana-agent-photo">
                    <img src={agent.image} alt={agent.name} />
                    <span>
                      <ShieldCheck aria-hidden="true" />
                    </span>
                  </div>
                  <strong>{agent.name}</strong>
                  <p>{agent.agency}</p>
                  <div>
                    <span>
                      <b>{agent.rating}</b>
                      Rating
                    </span>
                    <span>
                      <b>{agent.listings}</b>
                      Listings
                    </span>
                  </div>
                  <Link to="/app/messages">Message</Link>
                </article>
              ))}
            </div>
          </section>

          <section className="mobile-explore-section">
            <div className="mobile-explore-section-header">
              <h2>Verified Agencies</h2>
            </div>
            <div className="mobile-ghana-agency-row">
              {mobileExploreAgencies.map((agency) => (
                <Link key={agency.name} to="/agencies" className="mobile-ghana-agency-card">
                  <span>
                    <Building aria-hidden="true" />
                  </span>
                  <strong>{agency.name}</strong>
                </Link>
              ))}
            </div>
          </section>

          <section className="mobile-explore-section">
            <h2 className="mobile-ghana-small-title">Recently Viewed</h2>
            <div className="mobile-ghana-recent-row">
              {mobileExploreRecentlyViewed.map((item) => (
                <Link key={item.title} to="/property/demo-airport-residential">
                  <img src={item.image} alt={item.title} />
                </Link>
              ))}
            </div>
          </section>

          <section className="mobile-ghana-trust">
            <h2>Trust Built In</h2>
            <p>Every listing, every agent, fully vetted.</p>
            <div>
              {[
                { label: "Verified Properties", icon: ShieldCheck },
                { label: "Verified Agencies", icon: Building },
                { label: "Secure Transactions", icon: Shield },
                { label: "Fraud Protection", icon: CheckCircle2 },
              ].map(({ label, icon: Icon }) => (
                <span key={label}>
                  <Icon aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </section>
        </section>
      );
    }
    if (activeTab === "messages") {
      if (!user) {
        return (
          <section className="mobile-pane">
            <MobilePaneHeader
              eyebrow="Messages"
              title="Stay connected"
              subtitle="Messages, deal rooms, payments, and upcoming viewings."
            />
            <EmptyState
              icon={MessageCircle}
              title="Sign in to track messages, deals, and viewing updates."
              body="This area keeps your in-progress buyer activity together in one stream."
              action={{ label: "Log in", to: "/login" }}
            />
          </section>
        );
      }

      return (
        <section className="mobile-messages-luxe" aria-label="Messages">
          <header className="mobile-messages-luxe-header">
            <Link to="/" className="mobile-saved-luxe-location">
              <KeyRound aria-hidden="true" />
              <strong>BaytMiftah</strong>
            </Link>
            <div>
              <Link to="/search" aria-label="Search messages">
                <Search aria-hidden="true" />
              </Link>
              <Link to="/app/settings" aria-label="Message filters">
                <SlidersHorizontal aria-hidden="true" />
              </Link>
            </div>
          </header>

          <div className="mobile-messages-luxe-title">
            <h1>Messages</h1>
            <div aria-label="Message filters">
              <button type="button" className="is-active">All</button>
              <button type="button">Unread</button>
            </div>
          </div>

          <div className="mobile-messages-luxe-list">
            {[
              {
                name: "Julian Sterling",
                propertyLabel: "The Glass House \u2022 Malibu",
                property: "45 Liberation Road • Airport",
                message: "I've confirmed the private viewing window for tomorrow.",
                time: "2:45 PM",
                image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=220&q=85&auto=format&fit=crop",
                unread: true,
              },
              {
                name: "Elena Vance",
                propertyLabel: "Azure Penthouse \u2022 NYC",
                property: "Cantonments Villa • Accra",
                message: "The contract details for the Azure Penthouse are ready.",
                time: "Yesterday",
                image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=220&q=85&auto=format&fit=crop",
              },
              {
                name: "Alistair Thorne",
                property: "Shadow Creek Estate",
                message: "Thank you for the feedback. I'll send the updated terms.",
                time: "Tue",
                image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=220&q=85&auto=format&fit=crop",
              },
              {
                name: "Marcus Wei",
                propertyLabel: "The Zenith \u2022 Tokyo",
                property: "The Zenith • Tokyo",
                message: "The owner is open to a slightly lower offer.",
                time: "Mon",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=220&q=85&auto=format&fit=crop",
              },
              {
                name: "Seraphina Gray",
                property: "Ironwood Sanctuary",
                message: "Just received new photographs from the private gallery.",
                time: "Aug 12",
                image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=220&q=85&auto=format&fit=crop",
                unread: true,
              },
            ].map((message, index) => (
              <Link
                key={`${message.name}-${message.time}`}
                to="/app/messages"
                className={`mobile-messages-luxe-card ${index === 0 || index === 3 ? "is-featured" : ""}`}
              >
                <span className="mobile-messages-avatar">
                  <img src={message.image} alt="" />
                  <i className={message.unread ? "is-online" : ""} />
                </span>
                <span className="mobile-messages-copy">
                  <strong>{message.name}</strong>
                  <small>{message.propertyLabel || message.property}</small>
                  <em>{message.message}</em>
                </span>
                <span className="mobile-messages-time">
                  {message.time}
                  {message.unread ? <i /> : null}
                </span>
              </Link>
            ))}
          </div>

          <Link to="/app/messages" className="mobile-messages-archive">
            Archive older conversations
          </Link>
        </section>
      );
    }

    if (activeTab === "insights") {
      return (
        <section className="mobile-insights-luxe" aria-label="Portfolio insights">
          <header className="mobile-insights-topbar">
            <span className="mobile-insights-avatar">
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=180&q=85&auto=format&fit=crop"
                alt=""
              />
            </span>
            <Link to={getTabHref("messages")} aria-label="Open alerts">
              <Bell aria-hidden="true" />
            </Link>
          </header>

          <section className="mobile-insights-hero">
            <p>Market Intelligence</p>
            <h1>Portfolio Insights</h1>
            <span>
              Exclusively curated data for Khalid Al-Mansour. High-yield forecasting and
              capital appreciation metrics for your prime UAE assets.
            </span>
            <div>
              <Link to="/app/documents">Download Report</Link>
              <Link to="/app/concierge">Consult Concierge</Link>
            </div>
          </section>

          <div className="mobile-insights-metrics">
            <MobileInsightMetricCard label="Current Value" value="AED 42,850,000" growth="+12.4%" />
            <MobileInsightMetricCard
              label="Annual Rental Yield"
              value="6.8% AVG"
              growth="+0.8%"
              detail="Below market: 2.8M / Current revenue: 2.45M"
            />
            <MobileInsightMetricCard label="5-Year Forecast" value="AED 58.2M" detail="3 analyst agreements" />
          </div>

          <section className="mobile-insights-heatmap">
            <img
              src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&q=85&auto=format&fit=crop"
              alt=""
            />
            <div>
              <p>Neighborhood Heatmap</p>
              <h2>Palm Jumeirah</h2>
              <span>High Appreciation</span>
              <span>Stable Yield</span>
            </div>
          </section>

          <section className="mobile-insights-trends">
            <h2>Market Trends</h2>
            <article>
              <span>H1 2024 Analysis</span>
              <strong>Ultra-Luxury Segment Grows 24% in Dubai South</strong>
              <p>New infrastructure developments are driving massive capital gains.</p>
            </article>
            <article>
              <span>Yield Alert</span>
              <strong>Off-Plan Secondary Market Reaches New Peak</strong>
              <p>Investors are seeing 15% ROI on immediate flips in Jumeirah.</p>
            </article>
            <article>
              <span>Macro Forecast</span>
              <strong>Golden Visa Expansion Impact on Property Values</strong>
              <p>Long-stay residency is stabilizing the high-end rental market.</p>
            </article>
            <Link to="/market-trends">View all insights</Link>
          </section>

          <section className="mobile-insights-assets">
            <div>
              <h2>Top Performing Assets</h2>
              <p>Sort by Yield High-Low</p>
            </div>
            {mobilePortfolioAssets.map((asset) => (
              <MobileInsightAssetCard key={asset.title} asset={asset} />
            ))}
          </section>

          <footer className="mobile-insights-footer">
            <strong>BaytMiftah</strong>
            <p>© 2024 BaytMiftah Luxury Real Estate. All Rights Reserved.</p>
            <div>
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/terms">Terms of Service</Link>
            </div>
          </footer>
        </section>
      );
    }

    if (activeTab === "saved") {
      if (!user) {
        return (
          <section className="mobile-pane">
            <MobilePaneHeader
              eyebrow="Saved"
              title="Keep your shortlist"
              subtitle="Favorites, comparisons, alerts, and buyer planning."
            />
            <EmptyState
              icon={Heart}
              title="Log in to keep favorites, alerts, and comparisons together."
              body="Saved homes become more useful when your alerts and buyer tools sit beside them."
              action={{ label: "Log in", to: "/login" }}
            />
          </section>
        );
      }

      return (
        <section className="mobile-saved-luxe" aria-label="Saved listings">
          <header className="mobile-saved-luxe-header">
            <div className="mobile-saved-luxe-location">
              <KeyRound aria-hidden="true" />
              <strong>BaytMiftah</strong>
            </div>
            <Link to="/app/alerts" aria-label="Saved alert filters">
              <SlidersHorizontal aria-hidden="true" />
            </Link>
          </header>

          <div className="mobile-saved-luxe-copy">
            <h1>Saved Listings</h1>
            <p>
              Your curated collection of verified properties. Compare your favorites and find
              your next sanctuary.
            </p>
          </div>

          <div className="mobile-saved-luxe-actions">
            <Link to="/app/saved" className="is-muted">
              Clear All
            </Link>
            <Link to="/app/compare" aria-label="Compare saved listings">
              <Share2 aria-hidden="true" />
              Share List
            </Link>
          </div>

          {saved.length ? (
            <div className="mobile-saved-luxe-grid">
              {saved.map((item, index) => (
                <MobileSavedLuxeCard key={item.id} item={item} index={index} />
              ))}
            </div>
          ) : (
            <div className="mobile-saved-luxe-grid">
              {mobileFallbackListings.map((listing, index) => (
                <MobileSavedLuxeCard key={listing.id} item={{ listing }} index={index} />
              ))}
            </div>
          )}
        </section>
      );
    }

    return (
      <section className="mobile-profile-luxe">
        {user ? (
          <>
            <header className="mobile-profile-luxe-topbar">
              <Link to="/" className="mobile-saved-luxe-location">
                <KeyRound aria-hidden="true" />
                <strong>BaytMiftah</strong>
              </Link>
              <Link to="/app/settings" aria-label="Profile settings">
                <SlidersHorizontal aria-hidden="true" />
              </Link>
            </header>

            <div className="mobile-profile-luxe-card">
              <div className="mobile-profile-luxe-avatar" aria-hidden="true">
                {profileAvatarUrl ? <img src={profileAvatarUrl} alt="" /> : <span>{initials}</span>}
                <button type="button" aria-label="Edit profile">
                  <Camera aria-hidden="true" />
                </button>
              </div>
              <h2>{profileName}</h2>
              <p>
                <ShieldCheck aria-hidden="true" />
                Platinum member
              </p>
            </div>

            <div className="mobile-profile-luxe-stats">
              <span><strong>{saved.length}</strong>Saved</span>
              <span><strong>{propertyViewings.length}</strong>Tours</span>
              <span><strong>{openDeals.length}</strong>Offered</span>
            </div>

            <MobileProfileGroup
              title="Account settings"
              items={[
                { icon: UserRound, label: "Personal Info", to: "/app/settings" },
                { icon: Shield, label: "Security", to: "/app/verification" },
                { icon: Bell, label: "Notifications", to: "/app/messages", badge: unreadNotifications ? `${unreadNotifications} New` : undefined },
              ]}
            />

            <MobileProfileGroup
              title="Property management"
              items={[
                { icon: Home, label: "My Listings", to: `${WORKSPACE_ENTRY_PATH}?next=listings` },
                { icon: CalendarDays, label: "Scheduled Tours", to: "/app/viewings" },
                { icon: FileText, label: "Documents", to: "/app/documents" },
              ]}
            />

            <section className="mobile-profile-luxe-group">
              <h3>Preferences</h3>
              <div>
                <MobileProfileRow icon={Wallet} label="Currency" value="USD ($)" to="/app/settings" />
                <MobileProfileRow icon={Globe2} label="Language" value="English (US)" to="/app/settings" />
                <button
                  type="button"
                  className="mobile-profile-luxe-row"
                  onClick={cycleThemePreference}
                  role="switch"
                  aria-checked={currentThemeOption.value === "aureus"}
                >
                  <span><Moon aria-hidden="true" /></span>
                  <strong>Aureus UI</strong>
                  <i className={`mobile-profile-switch ${currentThemeOption.value === "aureus" ? "is-on" : ""}`} />
                </button>
              </div>
            </section>

            <MobileProfileGroup
              title="Support"
              items={[
                { icon: Compass, label: "Help Center", to: "/app/support", ariaLabel: "Support" },
                { icon: MessageCircle, label: "Contact Us", to: "/app/messages" },
                { icon: ShieldCheck, label: "Privacy Policy", to: "/legal/privacy" },
              ]}
            />

            <button type="button" className="mobile-profile-logout" onClick={() => void handleSettingsSignOut()}>
              <LogOut aria-hidden="true" />
              Logout {profileName.split(" ")[0] || "Account"}
            </button>

            <MobileBottomSheet
              open={appLockSheetOpen}
              title="App lock"
              onClose={() => setAppLockSheetOpen(false)}
            >
              <div className="mobile-sheet-section mobile-app-lock-sheet">
                <span>{appLockStatus.enabled ? "Security status" : "Create app lock"}</span>
                <p>
                  {appLockStatus.enabled
                    ? appLockStatus.nativeUnlockAvailable
                      ? `${appLockStatus.biometryLabel} is available. You can unlock with device security or your local backup code.`
                      : appLockStatus.nativeUnlockReason ||
                        "This device has a local app lock. Use your backup code to unlock."
                    : appLockStatus.nativeUnlockAvailable
                      ? `Set a local backup code. ${appLockStatus.biometryLabel} will be offered when the app is locked.`
                      : "Set a local code for this device. Native device unlock can be enabled once the platform supports it."}
                </p>
                <label>
                  <span>{appLockStatus.enabled && !appLockStatus.locked ? "Update code" : "App lock code"}</span>
                  <input
                    value={appLockCode}
                    onChange={(event) => setAppLockCode(event.target.value)}
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="At least 4 characters"
                  />
                </label>

                {!appLockStatus.enabled ? (
                  <button
                    type="button"
                    className="mobile-primary-button"
                    onClick={() => void handleEnableAppLock()}
                  >
                    Enable app lock
                  </button>
                ) : appLockStatus.locked ? (
                  <div className="mobile-app-lock-actions">
                    {appLockStatus.nativeUnlockAvailable ? (
                      <button
                        type="button"
                        className="mobile-primary-button"
                        onClick={() => void handleDeviceUnlock()}
                      >
                        <ShieldCheck aria-hidden="true" />
                        Use {appLockStatus.biometryLabel}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={appLockStatus.nativeUnlockAvailable ? "mobile-secondary-button" : "mobile-primary-button"}
                      onClick={() => void handleVerifyAppLock()}
                    >
                      Unlock with code
                    </button>
                  </div>
                ) : (
                  <div className="mobile-app-lock-actions">
                    <button
                      type="button"
                      className="mobile-primary-button"
                      onClick={() => void handleEnableAppLock()}
                    >
                      Update code
                    </button>
                    <button
                      type="button"
                      className="mobile-secondary-button"
                      onClick={() => void handleLockNow()}
                    >
                      Lock now
                    </button>
                    <button
                      type="button"
                      className="mobile-text-button"
                      onClick={() => void handleDisableAppLock()}
                    >
                      Turn off app lock
                    </button>
                  </div>
                )}
              </div>
            </MobileBottomSheet>
          </>
        ) : (
          <>
            <EmptyState
              icon={KeyRound}
              title="Log in to manage searches, saved listings, payments, and workspace access."
              body="You can still browse public listings, reviews, projects, and valuation tools without signing in."
              action={{ label: "Log in", to: "/login" }}
            />

            <div className="mobile-action-list mobile-grouped-list">
              <MobileQuickLink
                to="/valuation"
                icon={HousePlus}
                title="Seller tools"
                detail="Estimate value or prepare to list a property."
              />
              <MobileQuickLink
                to="/reviews"
                icon={ShieldCheck}
                title="Public reviews"
                detail="Read trust signals before you reach out."
              />
            </div>
          </>
        )}
      </section>
    );
  };

  const renderMobileOnboarding = () => (
    <section
      className="mobile-onboarding"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-onboarding-title"
    >
      <div className="mobile-onboarding-card">
        <div className="mobile-onboarding-hero">
          <span>First run setup</span>
          <h1 id="mobile-onboarding-title">Start with confidence.</h1>
          <p>
            Before you use the mobile app, review the simple tools we surface here and the legal
            notices behind them.
          </p>
        </div>

        <div className="mobile-onboarding-actions" aria-label="Mobile onboarding features">
          {mobileOnboardingSteps.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="mobile-onboarding-action">
                <div className="mobile-onboarding-action-icon">
                  <Icon aria-hidden="true" />
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <span>{item.legal}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mobile-onboarding-legal">
          <div className="mobile-onboarding-legal-icon">
            <ShieldCheck aria-hidden="true" />
          </div>
          <div>
            <strong>Legal acceptance</strong>
            <p>
              By continuing, you agree to the Terms of Use and Privacy Notice. You also understand
              that BaytMiftah guides, AI help, alerts, drafts, support, and marketplace data are
              workflow tools, not legal, tax, valuation, title, mortgage, or investment advice.
            </p>
            <div className="mobile-onboarding-legal-links">
              <Link to="/legal/terms">Terms of Use</Link>
              <Link to="/legal/privacy">Privacy Notice</Link>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mobile-primary-button mobile-onboarding-continue"
          onClick={() => void completeMobileOnboarding()}
        >
          I agree and continue
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );

  const renderAppLockGate = () => (
    <section className="mobile-pane mobile-lock-gate">
      <div className="mobile-lock-orb">
        <KeyRound aria-hidden="true" />
      </div>
      <MobilePaneHeader
        eyebrow="App lock"
        title="Unlock BaytMiftah"
        subtitle="Your mobile workspace is protected on this device."
      />
      <div className="mobile-app-lock-card">
        {appLockStatus.nativeUnlockAvailable ? (
          <button
            type="button"
            className="mobile-primary-button"
            onClick={() => void handleDeviceUnlock()}
          >
            <ShieldCheck aria-hidden="true" />
            Use {appLockStatus.biometryLabel}
          </button>
        ) : null}
        <label>
          <span>App lock code</span>
          <input
            value={appLockCode}
            onChange={(event) => setAppLockCode(event.target.value)}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter your code"
          />
        </label>
        <button
          type="button"
          className={appLockStatus.nativeUnlockAvailable ? "mobile-secondary-button" : "mobile-primary-button"}
          onClick={() => void handleVerifyAppLock()}
        >
          Unlock with code
        </button>
      </div>
    </section>
  );

  return (
    <MobileShellProvider value={{ isMobileShell: true }}>
      <main
        className={`mobile-app-shell ${hasMobileTabBar ? "has-mobile-tab-bar" : "is-guest-mobile-shell"}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {onboardingReady && showOnboarding ? renderMobileOnboarding() : null}
        <div className={`mobile-refresh-indicator ${isRefreshing ? "is-active" : ""}`} aria-live="polite">
          <Loader2 aria-hidden="true" />
          <span>{isRefreshing ? "Refreshing..." : "Pull to refresh"}</span>
        </div>
        <div className="mobile-content">
          {appLockStatus.locked ? (
            renderAppLockGate()
          ) : isMobileTabShellRoute ? (
            renderContent()
          ) : (
            <section className="mobile-shell-route">
              <header className="mobile-route-header">
                <button
                  type="button"
                  className="mobile-route-back"
                  onClick={handleGoBack}
                  aria-label="Go back"
                >
                  <ArrowLeft aria-hidden="true" />
                </button>
                <div>
                  <p className="mobile-eyebrow">BaytMiftah mobile</p>
                  <h1>{routeTitle}</h1>
                </div>
                {user ? (
                  <Link
                    to={getTabHref("messages")}
                    className="mobile-route-notifications"
                    aria-label="Open messages"
                  >
                    <Bell aria-hidden="true" />
                    {unreadNotifications > 0 ? (
                      <strong>{unreadNotifications > 99 ? "99+" : unreadNotifications}</strong>
                    ) : null}
                  </Link>
                ) : (
                  <Link
                    to={getTabHref("profile")}
                    className="mobile-route-notifications"
                    aria-label="Open profile"
                  >
                    <UserRound aria-hidden="true" />
                  </Link>
                )}
              </header>
              <div className="mobile-route-body">{children}</div>
            </section>
          )}
        </div>
        {hasMobileTabBar && isWorkspaceNewListingRoute ? (
          <MobileAgencyNewListingNav />
        ) : hasMobileTabBar && isWorkspaceLeadsRoute ? (
          <MobileAgencyLeadsNav />
        ) : hasMobileTabBar && isWorkspaceTeamRoute ? (
          <MobileAgencyTeamNav />
        ) : hasMobileTabBar && isWorkspaceSettingsRoute ? (
          <MobileAgencySettingsNav />
        ) : hasMobileTabBar && isWorkspaceWealthRoute ? (
          <MobileAgencyFinancialNav />
        ) : hasMobileTabBar && isWorkspaceListingsRoute ? (
          <MobileAgencyNav />
        ) : hasMobileTabBar && isApplicationsRoute ? (
          <MobileApplicationsNav />
        ) : hasMobileTabBar && isSupportRoute ? (
          <MobileSupportNav />
        ) : hasMobileTabBar && isSettingsRoute ? (
          <MobileSettingsNav />
        ) : hasMobileTabBar && isAccessRoute ? (
          <MobileSmartAccessNav />
        ) : hasMobileTabBar && isConciergeRoute ? (
          <MobileTourManagementNav />
        ) : hasMobileTabBar && isBuyingToolsRoute ? (
          <MobileBuyerToolsNav />
        ) : hasMobileTabBar && activeTab === "invest" ? (
          <MobileInvestmentNav />
        ) : hasMobileTabBar && activeTab === "insights" ? (
          <MobileInsightsNav />
        ) : hasMobileTabBar && activeTab === "home" ? (
          <nav className="mobile-tab-bar mobile-ghana-home-nav" aria-label="BaytMiftah home navigation">
            <MobileTabButton
              active
              icon={Home}
              label="Home"
              to={getTabHref("home")}
            />
            <MobileTabButton
              active={false}
              icon={Building2}
              label="Listings"
              to="/search"
            />
            <MobileTabButton
              active={false}
              icon={Landmark}
              label="Invest"
              to="/app/payments"
            />
            <MobileTabButton
              active={false}
              icon={Users}
              label="Leads"
              to="/app/messages"
            />
            <MobileTabButton
              active={false}
              icon={Menu}
              label="Menu"
              to="/app/settings"
            />
          </nav>
        ) : hasMobileTabBar ? (
          <nav className="mobile-tab-bar" aria-label="Primary mobile navigation">
            <MobileTabButton
              active={activeTab === "home"}
              icon={Compass}
              label="Explore"
              to={getTabHref("home")}
            />
            <MobileTabButton
              active={activeTab === "saved"}
              icon={Heart}
              label="Saved"
              to={getTabHref("saved")}
              badge={savedBadgeCount}
            />
            {activeTab === "valuation" ? (
              <MobileTabButton
                active
                icon={Calculator}
                label="Valuation"
                to={getTabHref("valuation")}
              />
            ) : (
              <MobileTabButton
                active={activeTab === "messages"}
                icon={MessageCircle}
                label="Messages"
                to={getTabHref("messages")}
                badge={activityBadgeCount}
              />
            )}
            <MobileTabButton
              active={activeTab === "profile"}
              icon={UserRound}
              label="Profile"
              to={getTabHref("profile")}
              badge={accountBadgeCount}
            />
          </nav>
        ) : null}
      </main>
    </MobileShellProvider>
  );
}

function CardPreview({
  title,
  subtitle,
  detail,
}: {
  title: string;
  subtitle: string;
  detail: string;
}) {
  return (
    <div className="mobile-card mobile-inline-card">
      <strong>{title}</strong>
      <p>{subtitle}</p>
      <span>{detail}</span>
    </div>
  );
}
