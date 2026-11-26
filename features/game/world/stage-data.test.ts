import { describe, expect, it } from "vitest";
import { GLOWS, HOUSES, LAMP_HEADS, STAGE_PLACEMENTS, WINDOWS, buildHouse } from "./stage-data";

describe("houses", () => {
  it("describe exactly one letter per column on every floor", () => {
    for (const house of HOUSES) for (const floor of house.floors) expect(floor).toHaveLength(house.cols);
  });

  it("put a corner post at both ends of every floor", () => {
    for (const house of HOUSES) for (const floor of house.floors) {
      expect(floor[0]).toBe("c");
      expect(floor[floor.length - 1]).toBe("c");
    }
  });

  it("turn each facade into a wall, roof and (when asked) chimney", () => {
    const house = HOUSES[0];
    const { placements } = buildHouse(house);
    const roofs = placements.filter((p) => p.piece === house.roof);
    expect(roofs).toHaveLength(house.cols);
    expect(placements.filter((p) => p.piece === "chimney")).toHaveLength(1);
    // Roof pieces sit directly on top of the highest floor.
    for (const roof of roofs) expect(roof.position[1]).toBe(house.floors.length);
  });
});

describe("windows", () => {
  it("match the window letters in the facades, one for one", () => {
    const letters = HOUSES.flatMap((h) => h.floors.flatMap((f) => [...f])).filter((k) => "abs".includes(k));
    expect(WINDOWS).toHaveLength(letters.length);
  });

  it("each sit on a window wall piece in the front row", () => {
    const wallFor: Record<string, string[]> = {
      a: ["wall-window-shutters", "wall-wood-window-shutters"],
      b: ["wall-window-glass", "wall-wood-window-glass"],
      s: ["wall-window-small", "wall-wood-window-small"],
    };
    for (const w of WINDOWS) {
      const wall = STAGE_PLACEMENTS.find((p) => p.position[0] === w.x && p.position[1] === w.level && p.position[2] === w.z - 0.5);
      expect(wall, `window at x=${w.x} level=${w.level}`).toBeDefined();
      expect(wallFor[w.key]).toContain(wall!.piece);
    }
  });

  it("never share a spot", () => {
    const spots = new Set(WINDOWS.map((w) => `${w.x},${w.level},${w.z}`));
    expect(spots.size).toBe(WINDOWS.length);
  });
});

describe("street furniture", () => {
  it("puts a lamp post under every lamp head", () => {
    for (const head of LAMP_HEADS) {
      const post = STAGE_PLACEMENTS.find((p) => p.piece === "lantern" && p.position[0] === head[0] && p.position[2] === head[2]);
      expect(post, `lamp at ${head}`).toBeDefined();
    }
  });

  it("gives every lamp a halo", () => {
    expect(GLOWS.filter((g) => g.kind === "lamp")).toHaveLength(LAMP_HEADS.length);
  });

  it("stays on the ground plane (40 x 40 units)", () => {
    for (const p of STAGE_PLACEMENTS) {
      expect(Math.abs(p.position[0])).toBeLessThan(20);
      expect(Math.abs(p.position[2])).toBeLessThan(20);
    }
  });
});
