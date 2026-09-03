import { FileSignature } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

type SignatureActionBannerProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export function SignatureActionBanner({
  title,
  description,
  actionLabel,
  onAction,
}: SignatureActionBannerProps) {
  return (
    <Card className="p-4 border-amber-500/30 bg-amber-500/5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <FileSignature className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </Card>
  );
}
