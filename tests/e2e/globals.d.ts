import type { User } from "@supabase/supabase-js";

declare global {
  interface Window {
    __BAYTMIFTAH_AUTH_OVERRIDE__?:
      | {
          user?: User | null;
          authAssurance?: {
            currentLevel?: string | null;
            nextLevel?: string | null;
          };
        }
      | null;
    __BAYTMIFTAH_MOCK_LOGS__?: Array<Record<string, unknown>>;
  }
}

export {};
