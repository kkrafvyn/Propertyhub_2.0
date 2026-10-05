import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { canAccessAdminSection, type AdminConsoleSection } from "../../../lib/platform-access";
import { Card } from "../../components/ui/Card";

export function AdminSectionGate({
  section,
  label,
  children,
}: {
  section: AdminConsoleSection;
  label: string;
  children: ReactNode;
}) {
  const { profile } = useAuth();
  if (!canAccessAdminSection(profile, section)) {
    return (
      <Card className="p-8">
        <h2 className="text-xl font-semibold mb-2">{label} access restricted</h2>
        <p className="text-muted-foreground">
          Your assigned platform roles do not include this area. Ask the platform owner to grant access.
        </p>
      </Card>
    );
  }
  return <>{children}</>;
}
