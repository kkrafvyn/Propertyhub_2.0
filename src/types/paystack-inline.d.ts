interface PaystackCallbackResponse {
  reference: string;
  status: string;
  message?: string;
  trans?: string;
  transaction?: string;
}

interface PaystackInlineHandler {
  openIframe: () => void;
  openPopup: () => void;
}

interface PaystackInlineOptions {
  key?: string;
  email?: string;
  amount?: number;
  ref?: string;
  access_code?: string;
  currency?: string;
  channels?: string[];
  onClose?: () => void;
  callback?: (response: PaystackCallbackResponse) => void;
}

interface PaystackPopStatic {
  setup: (options: PaystackInlineOptions) => PaystackInlineHandler;
}

interface Window {
  PaystackPop?: PaystackPopStatic;
}
