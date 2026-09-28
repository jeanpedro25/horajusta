import { describe, expect, it } from "vitest";
import { hasActivePaidEntitlement } from "./active-paid-entitlement";

const now = new Date("2026-09-22T12:00:00.000Z");

describe("hasActivePaidEntitlement", () => {
  it("blocks a current monthly or annual plan", () => {
    expect(hasActivePaidEntitlement({ plano: "pro", plano_vencimento: "2026-10-22T12:00:00Z" }, now)).toBe(true);
    expect(hasActivePaidEntitlement({ plano: "anual", plano_vencimento: "2027-09-22T12:00:00Z" }, now)).toBe(true);
  });

  it("blocks active manual grants but permits a trial and expired plans", () => {
    expect(hasActivePaidEntitlement({ is_pro: true, subscription_status: "active" }, now)).toBe(true);
    expect(hasActivePaidEntitlement({ plano: "free", subscription_status: "trial" }, now)).toBe(false);
    expect(hasActivePaidEntitlement({ plano: "pro", plano_vencimento: "2026-09-22T11:59:59Z" }, now)).toBe(false);
  });

  it("does not block a missing profile or an ordinary free profile", () => {
    expect(hasActivePaidEntitlement(null, now)).toBe(false);
    expect(hasActivePaidEntitlement({ plano: "free", is_pro: false, subscription_status: "inactive" }, now)).toBe(false);
  });
});
