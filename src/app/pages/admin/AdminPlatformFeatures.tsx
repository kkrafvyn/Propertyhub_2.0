import { useEffect, useState } from "react";
import { Bot, Loader2, MessageSquare, Phone, Video } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/switch";
import { useAuth } from "../../context/AuthContext";
import {
  loadPlatformFeatureFlags,
  savePlatformFeatureFlags,
  type PlatformFeatureFlags,
} from "../../../lib/platform-feature-flags";

const toggles: Array<{
  key: keyof PlatformFeatureFlags;
  label: string;
  description: string;
  icon: typeof MessageSquare;
}> = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    description: "WhatsApp Hub, outbound templates, and webhook-driven automations.",
    icon: MessageSquare,
  },
  {
    key: "voiceCalls",
    label: "Voice calls",
    description: "Click-to-call and in-app voice when demo simulation is not active.",
    icon: Phone,
  },
  {
    key: "videoCalls",
    label: "Video calls",
    description: "Video rooms and tours when a video provider env is configured.",
    icon: Video,
  },
  {
    key: "aiAssistant",
    label: "AI assistant",
    description: "Workspace AI assistant, command center, and ai-assistant edge function.",
    icon: Bot,
  },
];

export function AdminPlatformFeatures() {
  const { profile } = useAuth();
  const isPlatformAdmin = Boolean(profile?.is_platform_admin);
  const [flags, setFlags] = useState<PlatformFeatureFlags | null>(null);
  const [draft, setDraft] = useState<PlatformFeatureFlags | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadPlatformFeatureFlags(true).then(setFlags).catch(() => setFlags(null));
  }, []);

  useEffect(() => {
    if (flags) setDraft(flags);
  }, [flags]);

  if (!isPlatformAdmin) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Only platform administrators can change global app features.
        </p>
      </Card>
    );
  }

  if (!draft) {
    return (
      <Card className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading feature flags…
      </Card>
    );
  }

  const save = async () => {
    try {
      setBusy(true);
      const saved = await savePlatformFeatureFlags(draft);
      setFlags(saved);
      toast.success("App features updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save feature flags.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">App feature switches</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Turn major capabilities on or off for all organizations. Integration credentials are still
          required per org where applicable.
        </p>
      </div>

      <ul className="space-y-4">
        {toggles.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.key}
              className="flex items-start justify-between gap-4 rounded-xl border border-border p-4"
            >
              <div className="flex gap-3">
                <div className="rounded-lg bg-secondary p-2">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
              <Switch
                checked={draft[item.key]}
                onCheckedChange={(checked) =>
                  setDraft((current) => (current ? { ...current, [item.key]: checked } : current))
                }
                aria-label={`Toggle ${item.label}`}
              />
            </li>
          );
        })}
      </ul>

      <Button disabled={busy} onClick={() => void save()}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save feature switches"
        )}
      </Button>
    </Card>
  );
}
