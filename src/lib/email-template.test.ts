import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const brandDir = path.resolve(process.cwd(), "public/brand");
const templatePath = path.resolve(
  process.cwd(),
  "supabase/functions/_shared/email-template.ts",
);

describe("BaytMiftah email template", () => {
  it("ships the email logo asset referenced by all templates", () => {
    const svg = readFileSync(path.join(brandDir, "email-logo.svg"), "utf8");
    expect(svg).toContain("BAYTMIFTAH");
    expect(svg).toContain("#0F2922");
  });

  it("uses the shared logo URL helper in the edge template module", () => {
    const source = readFileSync(templatePath, "utf8");
    expect(source).toContain("resolveEmailLogoUrl");
    expect(source).toContain("/brand/email-logo.svg");
    expect(source).toContain('variant: "transactional"');
  });

  it("routes all Resend sends through the branded mail helper", () => {
    const resendMailPath = path.resolve(
      process.cwd(),
      "supabase/functions/_shared/resend-mail.ts",
    );
    const source = readFileSync(resendMailPath, "utf8");
    expect(source).toContain("buildTransactionalEmail");
    expect(source).toContain("sendBrandedTransactionalEmail");
  });

  it("includes a local HTML preview file", () => {
    const preview = readFileSync(path.join(brandDir, "email-template.html"), "utf8");
    expect(preview).toContain("email-logo.svg");
    expect(preview).toContain("BaytMiftah");
  });
});
