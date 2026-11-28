import { describe, expect, it } from "vitest";
import { EMOTES } from "./clips";
import { ICON_CELL, ICON_ORDER, ICON_ROWS, ICON_SIZE, makeIconSheet } from "./bubble-icons";

describe("the floating icons", () => {
  it("are all 11 by 11 pixels", () => {
    for (const name of ICON_ORDER) {
      expect(ICON_ROWS[name], name).toHaveLength(ICON_SIZE);
      for (const row of ICON_ROWS[name]) expect(row.length, name).toBe(ICON_SIZE);
    }
  });
  it("cover every icon an emote can ask for, plus the sleeper's", () => {
    for (const e of EMOTES) expect(ICON_ORDER, e.id).toContain(e.icon);
    expect(ICON_ORDER).toContain("zzz");
  });
  it("draw something in every cell and leave a pixel of room all round", () => {
    const sheet = makeIconSheet();
    expect(sheet.width).toBe(ICON_CELL * ICON_ORDER.length);
    ICON_ORDER.forEach((name, i) => {
      let filled = 0;
      for (let y = 0; y < ICON_CELL; y++) for (let x = 0; x < ICON_CELL; x++) {
        const solid = sheet.data[((y * sheet.width) + i * ICON_CELL + x) * 4 + 3] > 0;
        if (solid) filled++;
        if (solid && (x === 0 || y === 0 || x === ICON_CELL - 1 || y === ICON_CELL - 1)) throw new Error(`${name} touches its cell's edge`);
      }
      expect(filled, name).toBeGreaterThan(14);
    });
  });
});
