import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { AppLoadingScreen } from "../../components/ux/AppLoadingScreen";
import { StandalonePageShell } from "../../components/ux/StandalonePageShell";
import { communicationService } from "../../../lib/communication.service";
import { organizationService } from "../../../lib/organization.service";
import { getWorkspaceRoute } from "../../../lib/workspace";

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "We couldn't load that invitation.";
}

export function WorkspaceInviteAccept() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invitation");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any | null>(null);

  useEffect(() => {
    if (!invitationId) {
      setLoading(false);
      setError("This invitation link is missing the invitation id.");
      return;
    }

    let cancelled = false;

    const loadInvitation = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await organizationService.getInvitationById(invitationId);
        if (!cancelled) {
          setInvitation(data);
        }
      } catch (loadError) {
        console.error("Failed to load invitation:", loadError);
        if (!cancelled) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  const isExpired = useMemo(() => {
    if (!invitation?.expires_at) return false;
    return new Date(invitation.expires_at).getTime() < Date.now();
  }, [invitation?.expires_at]);

  const handleAccept = async () => {
    if (!invitationId) return;

    try {
      setAccepting(true);
      const result = await organizationService.acceptInvitation(invitationId);

      if (user) {
        try {
          await communicationService.createInAppNotification({
            userId: user.id,
            notificationType: "team_invitation_accepted",
            subject: `You joined ${invitation?.organization?.name || "your workspace"}`,
            content: `Your ${invitation?.role || "team"} access is active now.`,
            actionUrl: getWorkspaceRoute(result.organization_slug),
          });
        } catch (notificationError) {
          console.error("Failed to create invite acceptance notification:", notificationError);
        }
      }

      toast.success("Invitation accepted. Your workspace is ready.");
      navigate(getWorkspaceRoute(result.organization_slug), { replace: true });
    } catch (acceptError) {
      console.error("Failed to accept invitation:", acceptError);
      toast.error(getErrorMessage(acceptError));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <AppLoadingScreen label="Loading invitation…" />;
  }

  return (
    <StandalonePageShell maxWidthClassName="max-w-2xl">
      <Card className="my-10 p-8 lg:p-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Team Invitation</p>
            <h1 className="app-page-title text-3xl">Join this workspace</h1>
          </div>
        </div>

        {error ? (
          <>
            <p className="mb-6 text-ink-secondary">{error}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/workspace">
                <Button>Back to Workspace</Button>
              </Link>
              <Link to="/">
                <Button variant="outline">Home</Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mb-8 text-ink-secondary">
              You&apos;ve been invited to join
              <span className="font-medium text-ink"> {invitation?.organization?.name}</span>
              as a
              <span className="font-medium text-ink"> {invitation?.role}</span>.
            </p>

            <div className="app-surface-card mb-8 space-y-3 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink-secondary">Invited email</span>
                <span className="font-medium text-ink">{invitation?.email}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink-secondary">Sent by</span>
                <span className="font-medium text-ink">
                  {invitation?.inviter?.full_name || invitation?.inviter?.email || "Workspace team"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink-secondary">Status</span>
                <span className="font-medium capitalize text-ink">
                  {isExpired && invitation?.status === "pending"
                    ? "expired"
                    : invitation?.status || "pending"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink-secondary">Expires</span>
                <span className="font-medium text-ink">
                  {invitation?.expires_at
                    ? new Date(invitation.expires_at).toLocaleString()
                    : "Not set"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => void handleAccept()}
                disabled={
                  accepting ||
                  !invitation ||
                  invitation.status !== "pending" ||
                  isExpired
                }
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining workspace...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
              <Link to="/workspace">
                <Button variant="outline">Maybe Later</Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </StandalonePageShell>
  );
}
