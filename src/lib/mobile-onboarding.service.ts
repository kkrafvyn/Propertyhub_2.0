import { Preferences } from "@capacitor/preferences";

export const MOBILE_ONBOARDING_VERSION = "2026-05-16";

export interface MobileOnboardingRecord {
  version: string;
  completedAt: string;
  acceptedLegalAt: string;
  acceptedItems: string[];
}

export interface MobileOnboardingStatus {
  completed: boolean;
  record: MobileOnboardingRecord | null;
}

const MOBILE_ONBOARDING_KEY = "baytmiftah_mobile_onboarding_v1";
const DEFAULT_ACCEPTED_ITEMS = [
  "terms-of-use",
  "privacy-notice",
  "push-alerts-disclosure",
  "offline-drafts-disclosure",
  "buying-guide-disclaimer",
  "support-disclaimer",
] as const;

async function readRawValue() {
  try {
    return (await Preferences.get({ key: MOBILE_ONBOARDING_KEY })).value;
  } catch {
    if (typeof window === "undefined") return null;

    return window.localStorage.getItem(MOBILE_ONBOARDING_KEY);
  }
}

async function writeRawValue(value: string | null) {
  try {
    if (value) {
      await Preferences.set({ key: MOBILE_ONBOARDING_KEY, value });
    } else {
      await Preferences.remove({ key: MOBILE_ONBOARDING_KEY });
    }
  } catch {
    if (typeof window === "undefined") return;

    if (value) {
      window.localStorage.setItem(MOBILE_ONBOARDING_KEY, value);
    } else {
      window.localStorage.removeItem(MOBILE_ONBOARDING_KEY);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("baytmiftah:mobile-onboarding-change"));
  }
}

function parseRecord(value: string | null): MobileOnboardingRecord | null {
  if (!value) return null;

  try {
    const record = JSON.parse(value) as MobileOnboardingRecord;

    if (!record.completedAt || !record.acceptedLegalAt || !Array.isArray(record.acceptedItems)) {
      return null;
    }

    return record;
  } catch {
    return null;
  }
}

export const mobileOnboardingService = {
  async getStatus(): Promise<MobileOnboardingStatus> {
    const record = parseRecord(await readRawValue());

    return {
      completed: record?.version === MOBILE_ONBOARDING_VERSION,
      record,
    };
  },

  async complete(acceptedItems: readonly string[] = DEFAULT_ACCEPTED_ITEMS) {
    const acceptedAt = new Date().toISOString();
    const record: MobileOnboardingRecord = {
      version: MOBILE_ONBOARDING_VERSION,
      completedAt: acceptedAt,
      acceptedLegalAt: acceptedAt,
      acceptedItems: [...acceptedItems],
    };

    await writeRawValue(JSON.stringify(record));

    return record;
  },

  async reset() {
    await writeRawValue(null);
  },
};
