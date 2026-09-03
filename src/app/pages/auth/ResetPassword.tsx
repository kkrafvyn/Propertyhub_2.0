import { Link } from "react-router";
import { Loader2, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { AuthShell } from "../../components/baytmiftah/AuthShell";
import { authService } from "../../../lib/auth.service";
import { supabase } from "../../../lib/supabase";
import { validatePassword } from "../../../lib/security/password-policy";

type ResetMode = "request" | "reset";

export function ResetPassword() {
  const [mode, setMode] = useState<ResetMode>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const resolveMode = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      const hash = window.location.hash;
      if (data.session || hash.includes("type=recovery")) {
        setMode("reset");
      }
    };

    resolveMode();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setMode("reset");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await authService.resetPassword(email, `${window.location.origin}/forgot-password`);
      toast.success("Password reset email sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      toast.error(passwordCheck.errors[0] || "Password does not meet requirements");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await authService.updatePassword(password);
      toast.success("Password updated successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={mode === "request" ? "Reset password" : "Choose a new password"}
      subtitle={
        mode === "request"
          ? "We'll email you a secure link to reset your password."
          : "Your recovery session is active. Set a new password below."
      }
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to login
        </Link>
      }
    >
      {mode === "request" ? (
        <form onSubmit={handleRequestReset} className="space-y-5">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending reset email...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Send reset link
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <Input
            label="New password"
            type="password"
            placeholder="Create a new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm password"
            type="password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating password...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Update password
              </>
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
