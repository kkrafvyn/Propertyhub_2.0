import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Building2,
  ExternalLink,
  Loader2,
  Users,
  FileText,
  Home,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { adminService, type AdminOrganizationProfile } from "../../../lib/admin.service";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { formatCapabilityList } from "../../../lib/company-model";
import type { CompanyCapability } from "../../../lib/company-model";
import { getWorkspaceRoute } from "../../../lib/workspace";
import { getRoleLabel } from "../../../lib/company-model";

interface AdminOrganizationDetailProps {
  organizationId: string;
  onBack: () => void;
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function AdminOrganizationDetail({ organizationId, onBack }: AdminOrganizationDetailProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminOrganizationProfile | null>(null);

  useEffect(() => {
    void loadProfile();
  }, [organizationId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await adminService.getOrganizationProfile(organizationId);
      setProfile(data);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load organization profile.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="flex min-h-[320px] items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="p-8">
        <p className="text-muted-foreground">Organization not found.</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          Back to organizations
        </Button>
      </Card>
    );
  }

  const { organization, stats, members, recentListings, recentProperties } = profile;
  const capabilities = (organization.enabled_capabilities || []) as CompanyCapability[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={onBack}>
            ← All organizations
          </Button>
          <h2 className="text-2xl font-semibold">{organization.name}</h2>
          <p className="text-sm text-muted-foreground">/{organization.slug}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {organization.verified ? <Badge>Verified</Badge> : <Badge variant="outline">Pending</Badge>}
            {organization.suspended ? <Badge variant="destructive">Suspended</Badge> : null}
            {organization.company_setup_completed ? (
              <Badge variant="secondary">Setup complete</Badge>
            ) : (
              <Badge variant="outline">Setup pending</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={getWorkspaceRoute(organization.slug)} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open workspace
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() =>
              void (async () => {
                try {
                  await adminService.updateOrganization(organization.id, {
                    verified: !organization.verified,
                  });
                  toast.success(
                    organization.verified ? "Organization unverified." : "Organization verified.",
                  );
                  await loadProfile();
                } catch (error) {
                  console.error(error);
                  toast.error("Could not update organization verification.");
                }
              })()
            }
          >
            {organization.verified ? "Revoke verify" : "Verify organization"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Members</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{stats.memberCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Home className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Properties</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{stats.propertyCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Listings</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{stats.listingCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Open tasks</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{stats.openTaskCount}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Company profile</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Business types</dt>
              <dd className="mt-1">
                {(organization.business_types || []).length
                  ? (organization.business_types || []).join(", ")
                  : "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Enabled capabilities</dt>
              <dd className="mt-1">
                {capabilities.length ? formatCapabilityList(capabilities).join(" · ") : "All modules (legacy)"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-1">{formatTimestamp(organization.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Owner user ID</dt>
              <dd className="mt-1 font-mono text-xs">{organization.owner_id}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Team roster</h3>
          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members.</p>
            ) : (
              members.map((member) => (
                <div key={member.user_id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{member.user?.full_name || member.user?.email || "Member"}</p>
                      <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                    </div>
                    <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Scope: {member.scope_mode || "organization"} · Joined {formatTimestamp(member.joined_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Building2 className="h-4 w-4" />
            Recent properties
          </h3>
          <div className="space-y-2">
            {recentProperties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No properties yet.</p>
            ) : (
              recentProperties.map((property) => (
                <div key={property.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="font-medium">{property.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {property.city}, {property.region} · {formatTimestamp(property.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <FileText className="h-4 w-4" />
            Recent listings
          </h3>
          <div className="space-y-2">
            {recentListings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No listings yet.</p>
            ) : (
              recentListings.map((listing) => (
                <div key={listing.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {(listing.property as { address?: string } | null)?.address || "Listing"}
                    </p>
                    <Badge variant="outline">{listing.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {listing.currency} {listing.price?.toLocaleString()} · {formatTimestamp(listing.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
