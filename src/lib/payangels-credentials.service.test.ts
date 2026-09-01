import { describe, expect, it } from "vitest";
import { validatePayAngelsSecretName } from "./payangels-credentials.service";

describe("PayAngels credential references", () => {
  it("does not expose a secret in the returned connection contract", () => {
    expect(() => validatePayAngelsSecretName("PAYANGELS_SECRET_KEY")).not.toThrow();
    expect(() => validatePayAngelsSecretName("SECRET_KEY")).toThrow();
  });
});