/**
 * 地图元素
 */
export interface MapValue<T> {
  /** 我也不太清楚 */
  empty: T;
  /** 墙 */
  wall: T;
  /** 路 */
  road: T;
  /** 边界 */
  border: T;
  /** 起点 */
  st: T;
  /** 终点 */
  ed: T;
}

export const defaultMapValue: MapValue<string> = {
  /** 我也不太清楚 */
  empty: "?",
  /** 墙 */
  wall: "O",
  /** 路 */
  road: " ",
  /** 边界 */
  border: "X",
  /** 起点 */
  st: "S",
  /** 终点 */
  ed: "E",
};
