import { describe, it, expect } from "vitest";
import { daysUntilExpiry, urgencyClass, urgencyLabel } from "../src/lib/utils";

const DAY = 1000 * 60 * 60 * 24;

function dateOffset(days) {
  return new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
}

describe("daysUntilExpiry", () => {
  it("returns a negative number for a past date", () => {
    expect(daysUntilExpiry(dateOffset(-5))).toBeLessThan(0);
  });

  it("returns 0 or 1 for today", () => {
    const result = daysUntilExpiry(dateOffset(0));
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("returns a positive number for a future date", () => {
    expect(daysUntilExpiry(dateOffset(10))).toBeGreaterThan(0);
  });
});

describe("urgencyClass", () => {
  it("returns 'expired' for negative days", () => {
    expect(urgencyClass(-1)).toBe("expired");
    expect(urgencyClass(-10)).toBe("expired");
  });

  it("returns 'critical' for 0–3 days", () => {
    expect(urgencyClass(0)).toBe("critical");
    expect(urgencyClass(3)).toBe("critical");
  });

  it("returns 'warning' for 4–7 days", () => {
    expect(urgencyClass(4)).toBe("warning");
    expect(urgencyClass(7)).toBe("warning");
  });

  it("returns 'ok' for more than 7 days", () => {
    expect(urgencyClass(8)).toBe("ok");
    expect(urgencyClass(30)).toBe("ok");
  });
});

describe("urgencyLabel", () => {
  it("shows days ago for expired items", () => {
    expect(urgencyLabel(-3)).toBe("Expired 3d ago");
  });

  it("shows 'Expires today' for 0 days", () => {
    expect(urgencyLabel(0)).toBe("Expires today");
  });

  it("shows 'Expires tomorrow' for 1 day", () => {
    expect(urgencyLabel(1)).toBe("Expires tomorrow");
  });

  it("shows days remaining for future items", () => {
    expect(urgencyLabel(5)).toBe("5 days left");
  });
});
