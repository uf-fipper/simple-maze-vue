import { DefaultMazeMap, type BaseMazeMap } from "./mazemap";
import { Point } from "./point";
import type { Random } from "./random";
import { Player } from "./player";
import type { MoveStatus } from "./movestatus";
import { GameException, MapIndexError } from "./exceptions";

export interface GameInitConfig {
  row: number;
  column: number;
  random?: Random;
  msDelay?: number;
}

export abstract class BaseGame<
  TMapValueR = any,
  TMazeMap extends BaseMazeMap<TMapValueR> = BaseMazeMap<TMapValueR>,
> {
  mazeMap: TMazeMap;
  /**是否移动过 */
  isMove: boolean;
  /**上次移动的路径 */
  lastMoves: Point[] = [];
  createTime: Date = new Date();
  startTime: Date | null = null;
  finishTime: Date | null = null;
  /**移动后回调 */
  private _movedCallback: ((game: this, p: Point, lp: Point) => any)[] = [];

  private _player: Player | null;
  get player() {
    if (this._player === null) {
      throw new GameException("player is null");
    }
    return this._player;
  }
  set player(value: Player) {
    this._player = value;
  }

  abstract newMazeMap(config: GameInitConfig): TMazeMap;

  constructor(config: GameInitConfig) {
    this.mazeMap = this.newMazeMap(config);
    this._player = null;
    this.isMove = false;
    this.onInit(() => {
      this.player = new Player(this.mazeMap.st);
    });
  }

  private async _callCallback<P extends any[]>(callbacks: ((...args: P) => any)[], params: P) {
    for (const callback of callbacks) {
      await Promise.resolve(callback(...params));
    }
  }

  onInit(callback: (game: this, map: TMazeMap) => any) {
    const mapCallback = async (map: TMazeMap) => {
      await Promise.resolve(callback(this, map));
    };
    return this.mazeMap.onInit(mapCallback);
  }

  onInitRoad(callback: (game: this, map: TMazeMap, p: Point) => any) {
    const mapCallback = async (map: TMazeMap, p: Point) => {
      await Promise.resolve(callback(this, map, p));
    };
    return this.mazeMap.onInitRoad(mapCallback);
  }

  onMoved(callback: (game: this, p: Point, lp: Point) => any) {
    this._movedCallback.push(callback);
  }

  onSolving(
    callback: (game: this, map: TMazeMap, p: Point, lp: Point | null, step: number) => any,
  ) {
    const mapCallback = async (map: TMazeMap, p: Point, lp: Point | null, step: number) => {
      await Promise.resolve(callback(this, map, p, lp, step));
    };
    return this.mazeMap.onSolving(mapCallback);
  }

  restart() {
    this.player = new Player(this.mazeMap.st);
    this.isMove = false;
  }

  get row() {
    return this.mazeMap.row;
  }
  get column() {
    return this.mazeMap.column;
  }
  get random() {
    return this.mazeMap.random;
  }
  get initSuccess() {
    return this.mazeMap.initSuccess;
  }

  /**
   * 判断该点附近是否有路可走
   * @param p 这个点
   * @param lp 上一个点
   * @returns 有路可走，返回下一个点坐标，否则返回null
   */
  _moveFindRoad(p: Point, lp: Point): Point | null {
    let res: Point | null = null;
    for (const _p of p.get_range()) {
      if (this.mazeMap.isOverrange(_p)) continue;
      if (_p.equals(lp)) continue;
      if (this.mazeMap.getitem(_p) == this.mazeMap.mapValue.wall) continue;
      if (res != null) return null;
      res = _p;
    }
    return res;
  }

  /**
   * 移动
   * @param move 移动方向
   * @returns 是否移动成功
   */
  async move(move: MoveStatus): Promise<void> {
    if (!this.initSuccess) {
      return;
    }
    if (this.startTime === null) {
      this.startTime = new Date();
    }
    if (this.isWin) {
      if (this.finishTime === null) {
        this.finishTime = new Date();
      }
      return;
    }
    let lp = this.player.pos;
    let p = move.get_next(lp);

    if (this.mazeMap.isOverrange(p)) return;
    if (this.mazeMap.getitem(p) == this.mazeMap.mapValue.wall) return;

    const move_list = [lp, p];
    await this._callCallback(this._movedCallback, [this, p, lp]);
    let next_road = this._moveFindRoad(p, lp);
    while (next_road != null && !p.equals(this.mazeMap.ed)) {
      lp = p;
      p = next_road;
      move_list.push(p);
      await this._callCallback(this._movedCallback, [this, p, lp]);
      next_road = this._moveFindRoad(p, lp);
    }
    this.player.pos = move_list[move_list.length - 1];
    this.isMove = true;
    this.player.step += move_list.length - 1;
    this.player.move_times++;
    this.lastMoves = move_list;
  }

  move_player(pos: Point) {
    if (this.mazeMap.isOverrange(pos)) {
      throw new MapIndexError(`point ${pos} is outside the map`);
    }
    const temp: TMapValueR[] = [
      this.mazeMap.mapValue.road,
      this.mazeMap.mapValue.st,
      this.mazeMap.mapValue.ed,
    ];
    if (temp.indexOf(this.mazeMap.getitem(pos)) == -1) return false;

    this.player.pos = pos;
    return true;
  }

  async solve(pos?: Point): Promise<Point[]> {
    if (pos === undefined) {
      pos = this.player.pos;
    }
    return await this.mazeMap.solve(pos);
  }

  get isWin(): boolean {
    return this.mazeMap.ed.equals(this.player.pos);
  }

  toString(): string {
    const resultList: string[] = [];

    this.mazeMap.map.forEach((line, i) => {
      const inner: string[] = [];
      line.forEach((data, j) => {
        if (this.player.pos.equals(new Point(i, j))) {
          inner.push("P");
          return;
        }
        inner.push(String(data));
      });
      resultList.push(inner.join(""));
    });

    return resultList.join("\n");
  }
}

export class DefaultGame extends BaseGame<string, DefaultMazeMap> {
  override newMazeMap(config: GameInitConfig): DefaultMazeMap {
    return new DefaultMazeMap({
      row: config.row,
      column: config.column,
      random: config.random,
    });
  }
}
