import { type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft, Bell, FileText, HelpCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useMobileShell } from "../../mobile/MobileShellContext";

const legalUpdatedAt = "May 16, 2026";

const sharedNotices = [
  "Property Hub helps organize property discovery, communication, offers, documents, and support workflows. It does not replace licensed legal, tax, valuation, mortgage, survey, or title professionals.",
  "Users are responsible for checking property facts, identity documents, payment instructions, title records, inspection results, and professional advice before making financial decisions.",
  "Some mobile features depend on device permissions, network access, third-party providers, and workspace settings. Availability can vary by device, region, account role, and organization configuration.",
];

function LegalShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const { isMobileShell } = useMobileShell();

  return (
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <main className={isMobileShell ? "px-1 pb-6" : "px-4 pb-16 pt-24"}>
        <div className="mx-auto max-w-5xl">
          <Link
            to={isMobileShell ? "/?tab=me" : "/"}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Property Hub
          </Link>

          <section className="rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(246,244,238,1))] p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {eyebrow}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground">{intro}</p>
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Last updated: {legalUpdatedAt}
            </p>
          </section>

          <div className="mt-8 grid gap-5">{children}</div>

          <Card className="mt-8 border-amber-500/20 bg-amber-500/5 p-5">
            <p className="text-sm font-semibold text-amber-900">Production legal note</p>
            <p className="mt-2 text-sm leading-6 text-amber-950/80">
              This in-app notice gives users a clear consent and safety baseline. Have local counsel
              review and replace it with final Terms, Privacy, and consumer disclosures before a
              public production launch.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}

function LegalSection({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof FileText;
  title: string;
  items: string[];
}) {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <p key={item} className="text-sm leading-6 text-muted-foreground">
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TermsOfUse() {
  return (
    <LegalShell
      eyebrow="Terms of use"
      title="Use Property Hub with clear expectations."
      intro="These terms explain the practical rules users accept when they use Property Hub on web or mobile."
    >
      <LegalSection icon={FileText} title="Platform role" items={sharedNotices} />
      <LegalSection
        icon={Bell}
        title="Mobile alerts and communication"
        items={[
          "If you turn on alerts, Property Hub may send push notifications for saved searches, messages, viewings, deal room updates, security events, and support follow-up.",
          "You can change notification permissions in device settings. Critical account or security messages may still appear in the app or be sent through permitted account channels.",
          "Message drafts, offer notes, field notes, and support requests may be saved locally first, then synced when the device is online and your account is allowed to send them.",
        ]}
      />
      <LegalSection
        icon={LockKeyhole}
        title="Account, safety, and payments"
        items={[
          "Users must keep login credentials, device access, app lock codes, payment instructions, and verification documents secure.",
          "Property Hub may restrict, pause, or review activity that appears unsafe, fraudulent, abusive, automated, or outside the user role assigned to the account.",
          "Escrow, payments, inspections, title checks, and closing steps should be handled through qualified providers and verified channels. Do not rely on chat messages alone for payment instructions.",
        ]}
      />
      <LegalSection
        icon={HelpCircle}
        title="Guides, support, and availability"
        items={[
          "Buying guides, market context, AI concierge responses, checklists, and support flows are informational tools, not professional advice or a guarantee of a transaction outcome.",
          "Support teams can help route questions, collect context, and explain next steps, but they do not replace lawyers, lenders, surveyors, valuers, inspectors, or public registries.",
          "The app may change as features are improved, simplified, localized, or limited by account role, organization settings, law, provider availability, or security review.",
        ]}
      />
      <div className="flex flex-wrap gap-3">
        <Link to="/legal/privacy">
          <Button variant="outline">Read Privacy Notice</Button>
        </Link>
        <Link to="/signup">
          <Button>Create account</Button>
        </Link>
      </div>
    </LegalShell>
  );
}

export function PrivacyNotice() {
  return (
    <LegalShell
      eyebrow="Privacy notice"
      title="Privacy should feel understandable before users continue."
      intro="This notice summarizes the data needed for a simpler mobile property experience and the choices users keep."
    >
      <LegalSection
        icon={FileText}
        title="Information Property Hub may process"
        items={[
          "Account details such as name, email, phone, role, organization membership, sign-in security status, support requests, and communication preferences.",
          "Property activity such as searches, saved homes, comparisons, viewing requests, offers, deal room activity, referrals, uploaded documents, media, notes, and escrow milestones.",
          "Mobile context such as push notification tokens, device platform, app version, crash or diagnostics data, offline queue records, and optional location or camera output when users choose to use those tools.",
        ]}
      />
      <LegalSection
        icon={Bell}
        title="Alerts, drafts, and device permissions"
        items={[
          "Push alerts are optional and require device permission. Property Hub uses them to notify users about relevant account, listing, message, viewing, offer, and support events.",
          "Offline drafts can remain on the device until they are sent, deleted, or the local app data is cleared. Sensitive information should only be added when the device is trusted.",
          "Camera, document scanning, microphone, and location permissions are requested only when users open features that need them, and can be managed through device settings.",
        ]}
      />
      <LegalSection
        icon={ShieldCheck}
        title="Sharing and safeguards"
        items={[
          "Data may be shared with property teams, workspace members, service providers, payment or escrow providers, analytics and hosting providers, and support partners when needed to run requested features.",
          "Role-based access, app lock, two-factor authentication, audit trails, and review workflows help keep sensitive property workflows away from users who do not need them.",
          "Users can contact support to request help with account access, incorrect data, privacy questions, or deletion where legally and operationally permitted.",
        ]}
      />
      <div className="flex flex-wrap gap-3">
        <Link to="/legal/terms">
          <Button variant="outline">Read Terms of Use</Button>
        </Link>
        <Link to="/app/support">
          <Button>Contact support</Button>
        </Link>
      </div>
    </LegalShell>
  );
}
