import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { MailCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { AuthShell } from "../../components/baytmiftah/AuthShell";
import { AppLoadingScreen } from "../../components/ux/AppLoadingScreen";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { isEmailVerified } from "../../../lib/security/password-policy";
import { resolvePostAuthRedirect } from "../../lib/auth-routing";

export function VerifyEmailPage() {
  const { user, profile, hasWorkspaceMembership } = useAuth();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user || !isEmailVerified(user)) return;
    navigate(
      resolvePostAuthRedirect(user, profile, null, { hasOrgMembership: hasWorkspaceMembership }),
      { replace: true },
    );
  }, [user, profile, hasWorkspaceMembership, navigate]);

  if (user && isEmailVerified(user)) {
    return <AppLoadingScreen label="Redirecting…" />;
  }

  const resend = async () => {
    if (!user?.email) return;
    try {
      setSending(true);
      const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
      if (error) throw error;
      toast.success("Verification email sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to resend email");
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Confirm your address to unlock payments, wallet, and workspace features."
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-5 text-center lg:text-left">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary lg:mx-0">
          <MailCheck className="h-6 w-6" />
        </div>
        <p className="text-sm leading-relaxed text-white/80 lg:text-ink-secondary">
          We sent a confirmation link to{" "}
          <strong className="text-white lg:text-ink">{user?.email || "your email"}</strong>.
        </p>
        <Button onClick={() => void resend()} disabled={sending} size="lg" className="w-full">
          {sending ? "Sending…" : "Resend verification email"}
        </Button>
      </div>
    </AuthShell>
  );
}
