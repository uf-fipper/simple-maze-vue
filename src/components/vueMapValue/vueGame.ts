import { type Component, defineAsyncComponent } from "vue";
import type { MapValue } from "../../api/maze/mapvalue";
import MapEmpty from "./MapEmpty.vue";
import MapWall from "./MapWall.vue";
import MapRoad from "./MapRoad.vue";
import MapBorder from "./MapBorder.vue";
import MapSt from "./MapSt.vue";
import MapEd from "./MapEd.vue";
import { BaseGame, type GameInitConfig } from "../../api/maze/game";
import { BaseMazeMap } from "../../api/maze/mazemap";

export const vueMapValue: MapValue<Component> = {
  /** 我也不太清楚 */
  empty: MapEmpty,
  /** 墙 */
  wall: MapWall,
  /** 路 */
  road: MapRoad,
  /** 边界 */
  border: MapBorder,
  /** 起点 */
  st: MapSt,
  /** 终点 */
  ed: MapEd,
};

export const vueAsyncMapValue: MapValue<Component> = {
  /** 我也不太清楚 */
  empty: defineAsyncComponent(() => import("./MapEmpty.vue")),
  /** 墙 */
  wall: defineAsyncComponent(() => import("./MapWall.vue")),
  /** 路 */
  road: defineAsyncComponent(() => import("./MapRoad.vue")),
  /** 边界 */
  border: defineAsyncComponent(() => import("./MapBorder.vue")),
  /** 起点 */
  st: defineAsyncComponent(() => import("./MapSt.vue")),
  /** 终点 */
  ed: defineAsyncComponent(() => import("./MapEd.vue")),
};

export class VueGame extends BaseGame<Component> {
  newMazeMap(config: GameInitConfig): BaseMazeMap<Component> {
    return new BaseMazeMap({
      row: config.row,
      column: config.column,
      mapValue: vueMapValue,
      random: config.random,
    });
  }
}

export class VueAsyncGame extends BaseGame<Component> {
  newMazeMap(config: GameInitConfig): BaseMazeMap<Component> {
    return new BaseMazeMap({
      row: config.row,
      column: config.column,
      mapValue: vueAsyncMapValue,
      random: config.random,
    });
  }
}
