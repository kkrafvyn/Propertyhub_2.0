import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
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
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="max-w-xl mx-auto p-8 text-center text-muted-foreground">
          Loading invitation...
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <Card className="max-w-2xl mx-auto p-8 lg:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <MailCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-primary font-medium">Team Invitation</p>
            <h1 className="text-3xl font-semibold">Join this workspace</h1>
          </div>
        </div>

        {error ? (
          <>
            <p className="text-muted-foreground mb-6">{error}</p>
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
            <p className="text-muted-foreground mb-8">
              You&apos;ve been invited to join
              <span className="font-medium text-foreground"> {invitation?.organization?.name}</span>
              as a
              <span className="font-medium text-foreground"> {invitation?.role}</span>.
            </p>

            <div className="rounded-2xl border border-border bg-secondary/20 p-5 space-y-3 mb-8">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Invited email</span>
                <span className="font-medium">{invitation?.email}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Sent by</span>
                <span className="font-medium">
                  {invitation?.inviter?.full_name || invitation?.inviter?.email || "Workspace team"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="font-medium capitalize">
                  {isExpired && invitation?.status === "pending"
                    ? "expired"
                    : invitation?.status || "pending"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Expires</span>
                <span className="font-medium">
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
                    <Loader2 className="w-4 h-4 animate-spin" />
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
    </div>
  );
}
