import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/badge";
import { aiAssistantService } from "../../../lib/ai-assistant.service";
import type { AiSource } from "../../../lib/ai-assistant.service";
import { useTranslation } from "../../i18n/LocaleContext";

const KYC_TIPS = [
  "Use a well-lit photo with all four corners of the ID visible.",
  "Match the legal name exactly as printed on your Ghana Card or passport.",
  "Avoid glare, shadows, and blurry screenshots.",
  "JPG or PNG photos work best; PDFs are reviewed manually.",
  "Ghana Card, passport, national ID, or driver's license are accepted.",
];

export function KycAiGuide({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [source, setSource] = useState<AiSource | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    const message = query.trim();
    if (!message) return;

    try {
      setLoading(true);
      const result = await aiAssistantService.askAssistant({
        message,
        context: "kyc",
      });
      setAnswer(result.answer);
      setSource(result.source);
    } catch (error) {
      console.error(error);
      setAnswer(t("kycPage.aiGuideFailed"));
      setSource("local");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-border bg-muted/30 p-4 space-y-3"
          : "rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4"
      }
    >
      <div className="flex items-start gap-2">
        <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{t("kycPage.aiGuideTitle")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("kycPage.aiGuideSubtitle")}</p>
        </div>
      </div>

      <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
        {KYC_TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("kycPage.aiGuidePlaceholder")}
            onKeyDown={(event) => {
              if (event.key === "Enter") void ask();
            }}
          />
          <Button type="button" variant="outline" disabled={loading} onClick={() => void ask()}>
            {loading ? t("common.loading") : t("kycPage.aiGuideAsk")}
          </Button>
        </div>
        {answer ? (
          <div className="rounded-lg border border-border bg-background p-3 text-sm space-y-2">
            <p>{answer}</p>
            {source ? (
              <Badge variant="outline" className="text-xs capitalize">
                {source === "local" ? t("kycPage.aiGuideLocal") : `AI · ${source}`}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
