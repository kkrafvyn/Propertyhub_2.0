interface PayAngelsCallbackResponse {
  reference: string;
  status: string;
  message?: string;
  trans?: string;
  transaction?: string;
}

interface PayAngelsInlineHandler {
  openIframe: () => void;
  openPopup: () => void;
}

interface PayAngelsInlineOptions {
  key?: string;
  email?: string;
  amount?: number;
  ref?: string;
  access_code?: string;
  currency?: string;
  channels?: string[];
  onClose?: () => void;
  callback?: (response: PayAngelsCallbackResponse) => void;
}

interface PayAngelsPopStatic {
  setup: (options: PayAngelsInlineOptions) => PayAngelsInlineHandler;
}

interface Window {
  PayAngelsPop?: PayAngelsPopStatic;
  /** Some PayAngels CDN builds historically exposed this Paystack-compatible global. */
  PaystackPop?: PayAngelsPopStatic;
}
