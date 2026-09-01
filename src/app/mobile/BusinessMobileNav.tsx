import type { MemberRole } from "../../lib/workspace";
import {
  getBusinessMobileTabs,
  mapMemberRoleToMobileJobRole,
} from "../lib/business-mobile-nav";
import { BusinessMobileTabBar } from "./BusinessMobileTabBar";

export interface BusinessMobileNavProps {
  role?: MemberRole | null;
  organizationSlug?: string;
}

export function BusinessMobileNav({ role, organizationSlug = "default" }: BusinessMobileNavProps) {
  const jobRole = mapMemberRoleToMobileJobRole(role);
  const tabs = getBusinessMobileTabs(jobRole, organizationSlug, role);

  return <BusinessMobileTabBar tabs={tabs} />;
}
