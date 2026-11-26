import { Vector3, type BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import { CAT_CELL, PANE_CELLS, PANE_SIZE, PANE_VARIANTS, buildWindowGeometries, paneCell, paneUvRange } from "./window-geometry";
import { WINDOWS, type WindowKey } from "./stage-data";

const geo = buildWindowGeometries(WINDOWS);
const KINDS: WindowKey[] = ["a", "b", "s"];

const quadCount = (g: BufferGeometry | undefined) => (g ? g.getAttribute("position").count / 4 : 0);

/** Normal of the first triangle of a quad, from its winding. */
function faceNormal(g: BufferGeometry, quad: number): Vector3 {
  const p = g.getAttribute("position");
  const i = quad * 4;
  const a = new Vector3().fromBufferAttribute(p, i);
  const b = new Vector3().fromBufferAttribute(p, i + 1);
  const c = new Vector3().fromBufferAttribute(p, i + 2);
  return b.sub(a).cross(c.sub(a)).normalize();
}

describe("paneCell", () => {
  it("rotates through the designs and keeps the cat cell for the cat window", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => paneCell(i, false))).toEqual([0, 1, 2, 3, 4, 0, 1]);
    expect(paneCell(3, true)).toBe(CAT_CELL);
    expect(CAT_CELL).toBe(PANE_VARIANTS);
  });
});

describe("paneUvRange", () => {
  it("covers a whole cell for wide panes and two thirds of it for narrow ones", () => {
    const [a0, a1] = paneUvRange("a", 2);
    expect(a1 - a0).toBeCloseTo(1 / PANE_CELLS, 6);
    const [s0, s1] = paneUvRange("s", 2);
    expect(s1 - s0).toBeCloseTo((2 / 3) / PANE_CELLS, 6);
    expect(s0).toBeCloseTo(a0, 6);
  });
});

describe("buildWindowGeometries", () => {
  it("makes one pane quad per window, grouped by window kind", () => {
    for (const kind of KINDS) expect(quadCount(geo.panes[kind])).toBe(WINDOWS.filter((w) => w.key === kind).length);
    const total = KINDS.reduce((sum, k) => sum + quadCount(geo.panes[k]), 0);
    expect(total).toBe(WINDOWS.length);
  });

  it("puts a halo around every window, and a pool of light on the cobbles in front of ground-floor ones only", () => {
    expect(quadCount(geo.halo)).toBe(WINDOWS.length);
    expect(quadCount(geo.groundSpill)).toBe(WINDOWS.filter((w) => w.level === 0).length);
  });

  it("keeps every texture coordinate inside the atlas", () => {
    for (const g of [...Object.values(geo.panes), geo.halo, geo.groundSpill]) {
      for (const v of g!.getAttribute("uv").array) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1 + 1e-6);
      }
    }
  });

  it("gives every window its own flicker phase, the same on all four corners of its pane", () => {
    const phases: number[] = [];
    for (const kind of KINDS) {
      const g = geo.panes[kind];
      if (!g) continue;
      const a = g.getAttribute("aPhase");
      for (let q = 0; q < a.count / 4; q++) {
        const first = a.getX(q * 4);
        for (let k = 1; k < 4; k++) expect(a.getX(q * 4 + k)).toBe(first);
        phases.push(first);
      }
    }
    expect(new Set(phases).size).toBe(WINDOWS.length);
  });

  it("puts the cat design in exactly one pane", () => {
    expect(WINDOWS.filter((w) => w.cat)).toHaveLength(1);
    const [c0] = paneUvRange("a", CAT_CELL);
    const uv = geo.panes.a!.getAttribute("uv");
    let withCat = 0;
    for (let q = 0; q < uv.count / 4; q++) if (Math.abs(uv.getX(q * 4) - c0) < 1e-6) withCat++;
    expect(withCat).toBe(1);
  });

  it("faces panes and halos toward +Z, and the pool of light up", () => {
    for (const kind of KINDS) {
      const g = geo.panes[kind];
      if (g) for (let q = 0; q < quadCount(g); q++) expect(faceNormal(g, q).z).toBeCloseTo(1, 5);
    }
    for (let q = 0; q < quadCount(geo.halo); q++) expect(faceNormal(geo.halo, q).z).toBeCloseTo(1, 5);
    for (let q = 0; q < quadCount(geo.groundSpill); q++) expect(faceNormal(geo.groundSpill, q).y).toBeCloseTo(1, 5);
  });

  it("sizes each pane from its kind", () => {
    for (const kind of KINDS) {
      const g = geo.panes[kind];
      if (!g) continue;
      const p = g.getAttribute("position");
      const [w, h] = PANE_SIZE[kind];
      expect(p.getX(1) - p.getX(0)).toBeCloseTo(w, 6);
      expect(p.getY(2) - p.getY(1)).toBeCloseTo(h, 6);
    }
  });

  it("lays the ground light on the floor, a little above the cobbles", () => {
    const p = geo.groundSpill.getAttribute("position");
    for (let i = 0; i < p.count; i++) expect(p.getY(i)).toBeCloseTo(0.012, 6);
  });
});

describe("the light that comes out of the windows", () => {
  const box = (g: BufferGeometry, quad: number) => {
    const p = g.getAttribute("position");
    const xs = [0, 1, 2, 3].map((k) => p.getX(quad * 4 + k));
    const ys = [0, 1, 2, 3].map((k) => p.getY(quad * 4 + k));
    return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys), z: p.getZ(quad * 4) };
  };
  /** The pane quad of window `index`: panes are grouped by kind, in window order inside each kind. */
  const paneOf = (index: number) => {
    const kind = WINDOWS[index].key;
    const ordinal = WINDOWS.slice(0, index).filter((w) => w.key === kind).length;
    return box(geo.panes[kind]!, ordinal);
  };

  it("surrounds every pane with a halo that sits just behind it and reaches lower than it", () => {
    WINDOWS.forEach((_, i) => {
      const halo = box(geo.halo, i);
      const pane = paneOf(i);
      expect(halo.left, `window ${i}`).toBeLessThan(pane.left);
      expect(halo.right, `window ${i}`).toBeGreaterThan(pane.right);
      expect(halo.top, `window ${i}`).toBeGreaterThan(pane.top);
      expect(halo.bottom, `window ${i}`).toBeLessThan(pane.bottom);
      expect(halo.z, `window ${i}`).toBeLessThan(pane.z);
      // Lower than it is higher: the light bleeds down the wall from the sill.
      expect(pane.bottom - halo.bottom).toBeGreaterThan(halo.top - pane.top);
    });
  });

  it("keeps every halo inside its own wall panel and off the ground, so nothing can cut it off", () => {
    WINDOWS.forEach((w, i) => {
      const halo = box(geo.halo, i);
      expect(halo.left, `window ${i}`).toBeGreaterThan(w.x - 0.5);
      expect(halo.right, `window ${i}`).toBeLessThan(w.x + 0.5);
      expect(halo.bottom, `window ${i}`).toBeGreaterThan(w.level);
      expect(halo.top, `window ${i}`).toBeLessThan(w.level + 1);
    });
  });

  it("gives each halo and each pool the phase of its window, so light and window breathe together", () => {
    const phaseOf = (index: number) => index * 1.9 + 0.7;
    const haloPhase = geo.halo.getAttribute("aPhase");
    WINDOWS.forEach((_, i) => expect(haloPhase.getX(i * 4), `halo ${i}`).toBeCloseTo(phaseOf(i), 5));
    const poolPhase = geo.groundSpill.getAttribute("aPhase");
    const groundWindows = WINDOWS.map((w, i) => ({ w, i })).filter(({ w }) => w.level === 0);
    groundWindows.forEach(({ i }, j) => expect(poolPhase.getX(j * 4), `pool ${j}`).toBeCloseTo(phaseOf(i), 5));
  });

  it("starts each pool at the wall under its window and about as wide as that window", () => {
    const groundWindows = WINDOWS.filter((w) => w.level === 0);
    groundWindows.forEach((w, j) => {
      const pool = box(geo.groundSpill, j);
      const [pw] = PANE_SIZE[w.key];
      expect(pool.z, `pool ${j}`).toBeGreaterThan(w.z);
      expect((pool.left + pool.right) / 2, `pool ${j}`).toBeCloseTo(w.x, 6);
      // The brightest part of the pool is about half the quad wide (see poolAlpha), so the quad is about 1.8 panes wide.
      expect((pool.right - pool.left) / pw, `pool ${j}`).toBeGreaterThan(1.5);
      expect((pool.right - pool.left) / pw, `pool ${j}`).toBeLessThan(2.1);
    });
  });
});
