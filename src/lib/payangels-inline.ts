import { getPayangelsPublicKey } from "./integrations";

const PAYANGELS_SCRIPT_SRC = "https://js.payangels.co/v1/inline.js";

let scriptPromise: Promise<PayAngelsPopStatic> | null = null;

export type OpenPayAngelsInlineInput = {
  email: string;
  amountMinor: number;
  currency?: string;
  reference: string;
  accessCode: string;
  onSuccess: (reference: string) => void | Promise<void>;
  onClose?: () => void;
};

function resolveInlinePop(): PayAngelsPopStatic | undefined {
  if (typeof window === "undefined") return undefined;
  return window.PayAngelsPop || window.PaystackPop;
}

export function loadPayAngelsInline(): Promise<PayAngelsPopStatic> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Checkout is only available in the browser."));
  }

  const existingPop = resolveInlinePop();
  if (existingPop) {
    return Promise.resolve(existingPop);
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const finish = () => {
        const pop = resolveInlinePop();
        if (pop) resolve(pop);
        else reject(new Error("Checkout failed to load."));
      };

      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${PAYANGELS_SCRIPT_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", finish);
        existing.addEventListener("error", () => reject(new Error("Checkout failed to load.")));
        return;
      }

      const script = document.createElement("script");
      script.src = PAYANGELS_SCRIPT_SRC;
      script.async = true;
      script.onload = finish;
      script.onerror = () => reject(new Error("Checkout failed to load."));
      document.body.appendChild(script);
    });
  }

  return scriptPromise;
}

export async function openPayAngelsInline(input: OpenPayAngelsInlineInput) {
  const publicKey = getPayangelsPublicKey();
  if (!publicKey) {
    throw new Error("Checkout is not configured.");
  }

  const PayAngelsPop = await loadPayAngelsInline();

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const handler = PayAngelsPop.setup({
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
