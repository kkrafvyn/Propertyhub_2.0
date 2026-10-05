import { useAuth } from "../../context/AuthContext";
import { PlatformCommandCenter } from "./PlatformCommandCenter";
import { StaffOverview } from "./StaffOverview";

export function AdminHome() {
  const { profile } = useAuth();
  if (profile?.is_platform_admin) {
    return <PlatformCommandCenter />;
  }
  return <StaffOverview />;
}
