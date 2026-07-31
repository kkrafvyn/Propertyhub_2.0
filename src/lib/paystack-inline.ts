import { getPaystackPublicKey } from "./integrations";

const PAYSTACK_SCRIPT_SRC = "https://js.paystack.co/v1/inline.js";

let scriptPromise: Promise<NonNullable<Window["PaystackPop"]>> | null = null;

export function loadPaystackInline(): Promise<NonNullable<Window["PaystackPop"]>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paystack inline is only available in the browser."));
  }

  if (window.PaystackPop) {
    return Promise.resolve(window.PaystackPop);
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${PAYSTACK_SCRIPT_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", () => {
          if (window.PaystackPop) resolve(window.PaystackPop);
          else reject(new Error("Paystack inline failed to load."));
        });
        existing.addEventListener("error", () => reject(new Error("Paystack inline failed to load.")));
        return;
      }

      const script = document.createElement("script");
      script.src = PAYSTACK_SCRIPT_SRC;
      script.async = true;
      script.onload = () => {
        if (window.PaystackPop) resolve(window.PaystackPop);
        else reject(new Error("Paystack inline failed to load."));
      };
      script.onerror = () => reject(new Error("Paystack inline failed to load."));
      document.body.appendChild(script);
    });
  }

  return scriptPromise;
}

export type OpenPaystackInlineInput = {
  email: string;
  amountMinor: number;
  currency?: string;
  reference: string;
  accessCode: string;
  onSuccess: (reference: string) => void | Promise<void>;
  onClose?: () => void;
};

export async function openPaystackInline(input: OpenPaystackInlineInput) {
  const publicKey = getPaystackPublicKey();
  if (!publicKey) {
    throw new Error("Paystack public key is not configured.");
  }

  const PaystackPop = await loadPaystackInline();

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const handler = PaystackPop.setup({
      key: publicKey,
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency || "GHS",
      ref: input.reference,
      access_code: input.accessCode,
      channels: ["card", "mobile_money", "bank", "bank_transfer"],
      onClose: () => {
        input.onClose?.();
        if (!settled) {
          settled = true;
          reject(new Error("Payment window closed."));
        }
      },
      callback: (response) => {
        if (settled) return;
        settled = true;
        void Promise.resolve(input.onSuccess(response.reference))
          .then(() => resolve())
          .catch(reject);
      },
    });

    handler.openIframe();
  });
}
