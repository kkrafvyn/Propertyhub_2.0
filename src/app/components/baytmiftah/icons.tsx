import {
  Building2,
  Home,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Heart,
  Map,
  Bell,
  MessageCircle,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  User,
  CreditCard,
  LayoutGrid,
  ShieldCheck,
  Trees,
  Building,
  type LucideIcon,
} from "lucide-react";

export const IconSearch = Search;
export const IconMenu = Menu;
export const IconChevronLeft = ChevronLeft;
export const IconChevronRight = ChevronRight;
export const IconClose = X;
export const IconHome = Home;
export const IconPin = MapPin;
export const IconCard = CreditCard;
export const IconSun = Sun;
export const IconMoon = Moon;
export const IconHeart = Heart;
export const IconStar = Star;
export const IconSliders = SlidersHorizontal;
export const IconMap = Map;
export const IconBell = Bell;
export const IconMessage = MessageCircle;
export const IconUser = User;

export const categoryIcons: Record<string, LucideIcon> = {
  all: LayoutGrid,
  apartment: Building2,
  house: Home,
  office: Building,
  commercial: Building,
  verified: ShieldCheck,
};

export const propertyTypeIcons: Record<string, LucideIcon> = {
  apartment: Building2,
  house: Home,
  townhouse: Home,
  office: Building,
  land: Trees,
  shortStay: Home,
};

export function IconHeartFilled({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <Heart className={className} fill={filled ? "currentColor" : "none"} strokeWidth={filled ? 0 : 2} />
  );
}
