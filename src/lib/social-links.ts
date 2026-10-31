/** Official BaytMiftah social profiles (store listings, footer, press). */
export const BAYTMIFTAH_SOCIAL = {
  facebook: "https://www.facebook.com/baytmiftah/",
  instagram: "https://www.instagram.com/bayt_miftah/",
  tiktok: "https://www.tiktok.com/@baytmiftah",
} as const;

export const BAYTMIFTAH_SOCIAL_LINKS = [
  { id: "facebook", label: "Facebook", href: BAYTMIFTAH_SOCIAL.facebook },
  { id: "instagram", label: "Instagram", href: BAYTMIFTAH_SOCIAL.instagram },
  { id: "tiktok", label: "TikTok", href: BAYTMIFTAH_SOCIAL.tiktok },
] as const;
