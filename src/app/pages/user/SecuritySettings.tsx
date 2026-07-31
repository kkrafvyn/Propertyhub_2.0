import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

export function SecuritySettingsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const mfaRequired = searchParams.get("mfa") === "required";
  const workspaceMfaRequired = searchParams.get("mfa") === "workspace-required";
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [sessions, setSessions] = useState<
    Array<{ id: string; session_label: string | null; last_seen_at: string; user_agent: string | null }>
  >([]);

  useEffect(() => {
    void loadSessions();
  }, [user?.id]);

  const loadSessions = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("user_sessions")
      .select("id, session_label, last_seen_at, user_agent")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false });
    setSessions(data || []);
  };

  const startMfaEnrollment = async () => {
    try {
      setEnrolling(true);
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setFactorId(data.id);
      setQrCode(data.totp?.qr_code || null);
      toast.success("Scan the QR code with your authenticator app.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start MFA enrollment");
    } finally {
      setEnrolling(false);
    }
  };

  const verifyMfaEnrollment = async () => {
    if (!factorId || !verifyCode.trim()) return;
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode.trim(),
      });
      if (verify.error) throw verify.error;

      toast.success("Two-factor authentication enabled.");
      setQrCode(null);
      setVerifyCode("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid verification code");
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!window.confirm("Revoke this session?")) return;
    await supabase
      .from("user_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", sessionId);
    toast.success("Session revoked.");
    void loadSessions();
  };

  const signOutEverywhere = async () => {
    if (!window.confirm("Sign out on all devices?")) return;
    await supabase.auth.signOut({ scope: "global" });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Security</h1>
        <p className="text-muted-foreground">Manage MFA, sessions, and account protection.</p>
      </div>

      {mfaRequired ? (
        <Card className="p-4 border-amber-300 bg-amber-50 text-amber-900">
          Platform admin access requires two-factor authentication. Enroll below to continue.
        </Card>
      ) : null}
      {workspaceMfaRequired ? (
        <Card className="p-4 border-amber-300 bg-amber-50 text-amber-900">
          Agency owners and managers must enable two-factor authentication before using the workspace.
        </Card>
      ) : null}

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Two-factor authentication (TOTP)</h2>
        {!qrCode ? (
          <Button onClick={() => void startMfaEnrollment()} disabled={enrolling}>
            {enrolling ? "Starting…" : "Enable authenticator app"}
          </Button>
        ) : (
          <div className="space-y-3">
            {qrCode ? (
              <img src={qrCode} alt="MFA QR code" className="w-48 h-48 border rounded-lg" />
            ) : null}
            <Input
              value={verifyCode}
              onChange={(event) => setVerifyCode(event.target.value)}
              placeholder="Enter 6-digit code"
              inputMode="numeric"
            />
            <Button onClick={() => void verifyMfaEnrollment()}>Verify and enable MFA</Button>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Active sessions</h2>
          <Button variant="outline" size="sm" onClick={() => void signOutEverywhere()}>
            Sign out everywhere
          </Button>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tracked sessions yet.</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium">{session.session_label || "Browser session"}</p>
                <p className="text-xs text-muted-foreground">
                  {session.user_agent || "Unknown device"} · Last seen{" "}
                  {new Date(session.last_seen_at).toLocaleString()}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void revokeSession(session.id)}>
                Revoke
              </Button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
