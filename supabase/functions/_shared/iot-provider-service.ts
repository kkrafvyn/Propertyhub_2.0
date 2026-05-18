import { HttpError } from "./http.ts";

type SmartAccessProvider = "ttlock" | "yale" | "tuya" | "manual";

type SmartAccessCommand =
  | "generate_viewing_code"
  | "send_access_grant"
  | "revoke_access_grant"
  | "sync_device_health";

function envPrefix(provider: SmartAccessProvider) {
  return provider.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

function endpointFor(provider: SmartAccessProvider, command: SmartAccessCommand) {
  const prefix = envPrefix(provider);
  const commandKey = command.toUpperCase();
  return (
    Deno.env.get(`${prefix}_${commandKey}_ENDPOINT`) ||
    Deno.env.get(`${prefix}_COMMAND_ENDPOINT`)
  );
}

function accessTokenFor(provider: SmartAccessProvider) {
  const prefix = envPrefix(provider);
  return Deno.env.get(`${prefix}_ACCESS_TOKEN`) || Deno.env.get(`${prefix}_API_TOKEN`);
}

function providerReference(provider: SmartAccessProvider, command: SmartAccessCommand) {
  return `${provider}-${command}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function redactSensitivePayload(payload: Record<string, unknown>) {
  const clone = { ...payload };
  for (const key of ["code", "pin", "password", "accessToken", "secret"]) {
    if (key in clone) {
      clone[key] = "[redacted]";
    }
  }
  return clone;
}

export async function sendSmartAccessProviderCommand(input: {
  provider: SmartAccessProvider;
  command: SmartAccessCommand;
  payload: Record<string, unknown>;
}) {
  if (input.provider === "manual") {
    return {
      commandStatus: "skipped",
      providerReference: providerReference(input.provider, input.command),
      responsePayload: {
        provider: "manual",
        message: "Manual access provider selected. Agency action is required.",
        request: redactSensitivePayload(input.payload),
      },
    };
  }

  const endpoint = endpointFor(input.provider, input.command);
  if (!endpoint) {
    throw new HttpError(
      501,
      `${input.provider} ${input.command} endpoint is not configured`
    );
  }

  const accessToken = accessTokenFor(input.provider);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(input.payload),
  });

  const responseText = await response.text();
  let responsePayload: Record<string, unknown> = {};
  try {
    responsePayload = responseText ? JSON.parse(responseText) : {};
  } catch {
    responsePayload = { raw: responseText };
  }

  if (!response.ok) {
    throw new HttpError(
      502,
      `${input.provider} command failed with status ${response.status}`
    );
  }

  return {
    commandStatus: "succeeded",
    providerReference:
      (responsePayload.reference as string | undefined) ||
      (responsePayload.id as string | undefined) ||
      providerReference(input.provider, input.command),
    responsePayload,
  };
}

export function buildSmartAccessCode() {
  const digits = new Uint32Array(1);
  crypto.getRandomValues(digits);
  return String(100000 + (digits[0] % 900000));
}

export function publicCodeHint(code: string) {
  return `ends in ${code.slice(-4)}`;
}

export function safeSmartAccessRequest(payload: Record<string, unknown>) {
  return redactSensitivePayload(payload);
}
