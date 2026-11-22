// stage.js — stage outline geometry shared by the 3D view (matches the shape drawn on the plot).
import { GRID } from "./constants.js";

// Returns the stage floor outline as [[x,y],...] in canvas px, same coordinates as the plot.
export function stageOutline(venue, stageW, stageH) {
  const SW = stageW * GRID, SH = stageH * GRID;
  const apron = venue.curvedApron, recess = venue.notch;
  const srWingW = (venue.notchW ? (36 - venue.notchW) / 2 : 11.083) * GRID;
  const centerW = (venue.notchW || 13.875) * GRID;
  const cx1 = srWingW, cx2 = srWingW + centerW, stepD = (venue.notchD || 4.5) * GRID;
  const aD = (venue.apronDepth || 4.833) * GRID, aR = (SW * SW / 4 + aD * aD) / (2 * aD);
  const arc = () => {            // from (SW,SH) to (0,SH), bulging toward the audience
    const pts = [], cy = SH + aD - aR;
    for (let i = 1; i < 24; i++) { const x = SW - (SW * i) / 24; pts.push([x, cy + Math.sqrt(Math.max(0, aR * aR - (x - SW / 2) ** 2))]); }
    return pts;
  };
  if (apron && recess) return [[0, stepD], [cx1, stepD], [cx1, 0], [cx2, 0], [cx2, stepD], [SW, stepD], [SW, SH], ...arc(), [0, SH]];
  if (apron) return [[0, 0], [SW, 0], [SW, SH], ...arc(), [0, SH]];
  if (recess) return [[0, stepD], [cx1, stepD], [cx1, 0], [cx2, 0], [cx2, stepD], [SW, stepD], [SW, SH], [0, SH]];
  return [[0, 0], [SW, 0], [SW, SH], [0, SH]];
}

// Default heights (inches) for pieces that don't have their own height or elevation yet.
export const DEFAULT_HEIGHT_IN = {
  flat: 96, door_flat: 96, wall: 96, backdrop: 144, scrim: 144, leg_drape: 144, traveler: 144,
  chair: 18, table: 30, round_table: 30, stool: 24, sofa: 32, bed: 24, door: 80, window: 48, podium: 42,
  platform: 0, tri_platform: 0, stairs: 0, curved_flat: 96, column: 96, arch_flat: 96,
};
