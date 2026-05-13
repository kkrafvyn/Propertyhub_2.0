import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Building2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { organizationService } from "../../../lib/organization.service";
import {
  WORKSPACE_ENTRY_PATH,
  getWorkspaceRoute,
  normalizeOrganizationMemberships,
  toOrganizationSlug,
  type MembershipRow,
  type OrganizationMembership,
} from "../../../lib/workspace";

const ALLOWED_WORKSPACE_PAGES = new Set([
  "new",
  "listings",
  "leads",
  "team",
  "settings",
  "market-intelligence",
  "automation",
  "ai-assistant",
  "vendors",
  "location-intelligence",
  "org-insights",
  "notifications",
  "whitelabel",
  "mobile-settings",
  "blockchain",
  "advanced-search",
  "predictive-analytics",
  "recommendations",
  "team-collaboration",
  "workflows",
]);

function sanitizeRequestedPage(value: string | null) {
  if (!value) return "";
  return ALLOWED_WORKSPACE_PAGES.has(value) ? value : "";
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "We couldn't create your workspace right now.";
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }

  return "";
}

export function WorkspaceEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [slugEdited, setSlugEdited] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    email: user?.email || "",
    phone: "",
    website: "",
  });

  const requestedPage = useMemo(
    () => sanitizeRequestedPage(searchParams.get("next")),
    [searchParams]
  );

  const loadMemberships = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setLoadError(null);
      const rows = (await organizationService.getUserOrganizations(user.id)) as MembershipRow[];
      setMemberships(normalizeOrganizationMemberships(rows));
    } catch (error) {
      console.error("Failed to load workspace memberships:", error);
      setLoadError("We couldn't load your workspace organizations right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMemberships();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.email) return;

    setForm((current) => ({
      ...current,
      email: current.email || user.email || "",
    }));
  }, [user?.email]);

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugEdited ? current.slug : toOrganizationSlug(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setForm((current) => ({
      ...current,
      slug: toOrganizationSlug(value),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error("You need to be signed in to create a workspace.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Organization name is required.");
      return;
    }

    const nextSlug = toOrganizationSlug(form.slug || form.name);
    if (!nextSlug) {
      toast.error("Enter a valid workspace slug.");
      return;
    }

    try {
      setCreating(true);
      const organization = await organizationService.createOrganization({
        name: form.name.trim(),
        slug: nextSlug,
        description: form.description.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        owner_id: user.id,
      });

      toast.success("Workspace created. You can start listing properties now.");
      navigate(getWorkspaceRoute(organization.slug, requestedPage || undefined), {
        replace: true,
      });
    } catch (error) {
      console.error("Failed to create organization:", error);
      const message = getErrorMessage(error);
      const code = getErrorCode(error);
      if (code === "23505" || message.includes("duplicate") || message.includes("slug")) {
        toast.error("That workspace slug is already taken. Try another one.");
      } else {
        toast.error(message);
      }
    } finally {
      setCreating(false);
    }
  };

  const firstMembership = memberships[0] || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="max-w-xl mx-auto p-8 text-center text-muted-foreground">
          Loading workspace...
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="max-w-xl mx-auto p-8 text-center">
          <h1 className="text-2xl font-semibold mb-3">Workspace unavailable</h1>
          <p className="text-muted-foreground mb-6">{loadError}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => void loadMemberships()}>Try Again</Button>
            <Link to="/">
              <Button variant="outline">Back Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (firstMembership) {
    return (
      <Navigate
        to={getWorkspaceRoute(
          firstMembership.organization.slug,
          requestedPage || undefined
        )}
        replace
      />
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-8">
        <Card className="p-8 lg:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-primary font-medium">Workspace Setup</p>
              <h1 className="text-3xl font-semibold">Create your organization</h1>
            </div>
          </div>

          <p className="text-muted-foreground mb-8">
            Your account is ready, but you still need a workspace before you can publish
            listings, manage leads, or invite teammates.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Organization Name"
              value={form.name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Prime Properties Ghana"
              required
            />

            <Input
              label="Workspace Slug"
              value={form.slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="prime-properties-ghana"
              required
            />

            <div>
              <label className="block mb-2 text-sm text-foreground">Description</label>
              <textarea
                className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground min-h-32"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Tell clients and teammates what this organization does."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Public Email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="hello@example.com"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="+233 24 000 0000"
              />
            </div>

            <Input
              label="Website"
              value={form.website}
              onChange={(event) =>
                setForm((current) => ({ ...current, website: event.target.value }))
              }
              placeholder="https://example.com"
            />

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" size="lg" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating workspace...
                  </>
                ) : (
                  "Create Workspace"
                )}
              </Button>
              <Link to="/">
                <Button type="button" size="lg" variant="outline">
                  Back Home
                </Button>
              </Link>
            </div>
          </form>
        </Card>

        <Card className="p-8 lg:p-10 bg-secondary/30">
          <div className="flex items-center gap-2 text-primary mb-6">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">What you unlock</span>
          </div>

          <div className="space-y-5">
            <div>
              <h2 className="font-semibold mb-1">Publish listings quickly</h2>
              <p className="text-sm text-muted-foreground">
                Create properties, manage pricing, and control public visibility from one
                dashboard.
              </p>
            </div>
            <div>
              <h2 className="font-semibold mb-1">Manage leads as a team</h2>
              <p className="text-sm text-muted-foreground">
                Track deal cases, stay on top of conversations, and invite teammates when
                you&apos;re ready.
              </p>
            </div>
            <div>
              <h2 className="font-semibold mb-1">Grow into the full platform</h2>
              <p className="text-sm text-muted-foreground">
                The same workspace becomes the entry point for analytics, automation,
                blockchain verification, and enterprise features.
              </p>
            </div>
          </div>

          <div className="mt-8 p-5 rounded-2xl bg-white border border-border">
            <p className="text-sm text-muted-foreground">
              After setup, you&apos;ll land in
              <span className="font-medium text-foreground"> {WORKSPACE_ENTRY_PATH}</span>
              and we&apos;ll route you into the right organization automatically.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
