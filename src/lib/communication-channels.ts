export type DeliveryNotificationChannel = "email" | "sms" | "push" | "in_app" | "whatsapp";

/** Channels to attempt for delivery; avoids duplicating in-app when already created by notify(). */
export function resolveNotificationDeliveryChannels(
  channels: DeliveryNotificationChannel[],
  skipInApp?: boolean,
): DeliveryNotificationChannel[] {
  return Array.from(
    new Set(skipInApp ? channels : (["in_app", ...channels] as DeliveryNotificationChannel[])),
  );
}
