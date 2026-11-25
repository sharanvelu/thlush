import { describe, expect, it } from "vitest";
import { addonLabel, addonsKey, normalizeAddons } from "@/lib/addons";

describe("addonLabel", () => {
  it("shows the count only when there is more than one", () => {
    expect(addonLabel({ name: "Cheese" })).toBe("+ Cheese");
    expect(addonLabel({ name: "Cheese", quantity: 1 })).toBe("+ Cheese");
    expect(addonLabel({ name: "Cheese", quantity: 3 })).toBe("+ Cheese x3");
  });
});

describe("addonsKey", () => {
  it("ignores order and treats a missing count as one", () => {
    expect(addonsKey([{ name: "B" }, { name: "A", quantity: 2 }])).toBe(
      addonsKey([
        { name: "A", quantity: 2 },
        { name: "B", quantity: 1 },
      ]),
    );
    expect(addonsKey([{ name: "A", quantity: 2 }])).not.toBe(addonsKey([{ name: "A", quantity: 3 }]));
  });
});

describe("normalizeAddons", () => {
  it("reads older plain names as one each", () => {
    expect(normalizeAddons(["Cheese", "Mayo"])).toEqual([
      { name: "Cheese", quantity: 1 },
      { name: "Mayo", quantity: 1 },
    ]);
  });
  it("keeps valid counts, and fixes bad ones", () => {
    expect(
      normalizeAddons([
        { name: "Cheese", quantity: 3 },
        { name: "Mayo", quantity: 0 },
        { name: "Egg", quantity: 99 },
      ]),
    ).toEqual([
      { name: "Cheese", quantity: 3 },
      { name: "Mayo", quantity: 1 },
      { name: "Egg", quantity: 20 },
    ]);
  });
  it("drops anything unusable", () => {
    expect(normalizeAddons(undefined)).toEqual([]);
    expect(normalizeAddons([null, 5, {}])).toEqual([]);
  });
});
