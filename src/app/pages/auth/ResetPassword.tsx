import { Link } from "react-router";
import { Loader2, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { authService } from "../../../lib/auth.service";
import { supabase } from "../../../lib/supabase";

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

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              {mode === "request" ? <Mail className="w-6 h-6 text-white" /> : <Lock className="w-6 h-6 text-white" />}
            </div>
          </Link>
          <h1 className="text-3xl font-semibold mb-2">
            {mode === "request" ? "Reset Password" : "Choose a New Password"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "request"
              ? "We’ll email you a secure link to reset your password."
              : "Your recovery session is active. Set a new password below."}
          </p>
        </div>

        {mode === "request" ? (
          <form onSubmit={handleRequestReset} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending reset email...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <Input
              label="New Password"
              type="password"
              placeholder="Create a new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline font-semibold">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
