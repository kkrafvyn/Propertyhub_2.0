import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { isEmailVerified } from "../../../lib/security/password-policy";

export function VerifyEmailPage() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user && isEmailVerified(user)) {
      window.location.replace("/app");
    }
  }, [user]);

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
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Verify your email</h1>
        <p className="text-muted-foreground">
          We sent a confirmation link to <strong>{user?.email}</strong>. Verify your email before
          using payments, wallet, or workspace features.
        </p>
        <Button onClick={() => void resend()} disabled={sending}>
          {sending ? "Sending…" : "Resend verification email"}
        </Button>
        <p className="text-sm">
          <Link to="/login" className="text-primary underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
