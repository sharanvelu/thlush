import { describe, expect, it } from "vitest";
import { lineTitle, optionsSuffix } from "@/lib/line-label";

describe("optionsSuffix", () => {
  it("rebuilds the saved label's ending", () => {
    expect(optionsSuffix(null)).toBe("");
    expect(optionsSuffix({ variant: "Large" })).toBe(" (Large)");
    expect(optionsSuffix({ addons: [{ name: "Mayo", price: "1" }] })).toBe(" (+ Mayo)");
    expect(optionsSuffix({ variant: "Large", addons: [{ name: "Shot", price: "1", quantity: 3 }, { name: "Mayo", price: "1" }] })).toBe(
      " (Large + Shot x3, Mayo)",
    );
  });
});

describe("lineTitle", () => {
  it("keeps the variant in brackets and drops the add-ons", () => {
    expect(lineTitle("Coffee (Large + Shot x2)", { variant: "Large", addons: [{ name: "Shot", price: "1", quantity: 2 }] })).toBe("Coffee (Large)");
  });
  it("drops the whole bracket when there is only add-ons", () => {
    expect(lineTitle("Dosa (+ Mayo)", { addons: [{ name: "Mayo", price: "1" }] })).toBe("Dosa");
  });
  it("keeps a name that does not match the label, adding the variant if it is not already there", () => {
    expect(lineTitle("Renamed thing", { variant: "Large" })).toBe("Renamed thing (Large)");
    expect(lineTitle("Renamed thing (Large + Mayo)", { variant: "Large" })).toBe("Renamed thing (Large + Mayo)");
    expect(lineTitle("Dosa", null)).toBe("Dosa");
  });
});
