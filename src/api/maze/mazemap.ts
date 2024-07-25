import { Point } from "./point";
import { Random } from "./random";
import { defaultMapValue, type MapValue } from "./mapvalue";
import { Queue } from "./queue";
import { SolveException, QueueEmptyException, MapInitException } from "./exceptions";

export interface MazeMapInitConfig<R> {
  row: number;
  column: number;
  random?: Random;
  mapValue?: MapValue<R>;
  delayMs?: number;
}

async function switchAsync() {
  // await new Promise((resolve) => setTimeout(resolve, 0));
}

export class BaseMazeMap<TMapValue = any> implements Iterable<TMapValue[]> {
  /**随机数引擎 */
  private _random: Random;
  /**地图 */
  private _map: TMapValue[][];
  /**初始化地图时选取的起始点 */
  private _inst_st: Point;
  /**地图起点 */
  private _st: Point;
  /**地图终点 */
  private _ed: Point;
  /**地图高 */
  private _row: number;
  /**地图宽 */
  private _column: number;
  /**mapValue */
  mapValue: MapValue<TMapValue>;
  /**是否成功初始化 */
  private _initSuccess: boolean = false;
  /**异步等待延迟交出执行权的时间 */
  delayMs: number = 50;
  /**地图完全加载完成后的回调 */
  private _initCallback: ((mazeMap: this) => any | Promise<any>)[] = [];
  /**成功生成一条道路后的回调 */
  private _initRoadCallback: ((mazeMap: this, p: Point) => any | Promise<any>)[] = [];
  /**寻找下一个可能的解时的回调 */
  private _solvingCallback: ((
    mazeMap: this,
    p: Point,
    lp: Point | null,
    step: number,
  ) => any | Promise<any>)[] = [];

  get random() {
    return this._random;
  }
  get map() {
    return this._map;
  }
  get inst_st() {
    return this._inst_st;
  }
  get st() {
    return this._st;
  }
  get ed() {
    return this._ed;
  }
  get row() {
    return this._row;
  }
  get column() {
    return this._column;
  }
  get initSuccess() {
    return this._initSuccess;
  }

  /**
   * 判断某个点是否越界
   * @param p 点
   * @returns 返回是否越界
   */
  public isOverrange(p: Point): boolean {
    if (p.x < 0 || p.y < 0) return true;
    if (p.x >= this.row || p.y >= this.column) return true;
    return false;
  }

  /**
   * 返回所有合法的点
   * @param p 这个点
   * @param lp 上一个点
   * @returns 返回所有合法的点
   */
  protected async _initGetWalls(p: Point, lp: Point): Promise<Point[]> {
    const resTemp = p.get_range();
    const res: Point[] = [];
    for (const point of resTemp) {
      if (this.isOverrange(point)) continue;
      if (point.equals(lp)) continue;
      res.push(point);
    }
    return res;
  }

  /**
   * 检查这个墙是否能生成道路
   * @param p 这个点
   * @param lp 上一个点
   * @returns 能生成返回true
   */
  protected async _initCheckWall(p: Point, lp: Point): Promise<boolean> {
    const temp = await this._initGetWalls(p, lp);
    if (!temp) return false;
    for (const t of temp) {
      if (this.getitem(t) != this.mapValue.wall) return false;
    }
    return true;
  }

  protected async _initMap() {
    /**初始化地图时所用的初始点 */
    const inst_st = (this._inst_st = new Point(
      this.random.int(0, this.row),
      this.random.int(0, this.column),
    ));
    const stack: [Point, Point, number][] = [];
    let p = inst_st;
    let lp = new Point(-1, -1);
    let step = 0;
    stack.push([p, lp, step]);
    let nextSwitchTime = new Date();
    while (stack.length > 0) {
      const pop_item = stack.pop();
      if (pop_item === undefined) {
        throw RangeError("stack is empty");
      }
      [p, lp, step] = pop_item;
      if (!(await this._initCheckWall(p, lp))) continue;
      // 成功生成了一个道路
      this.setitem(p, this.mapValue.road);
      await this._callCallback(this._initRoadCallback, [this, p]);

      const around_walls = await this._initGetWalls(p, lp);
      if (around_walls.length == 0) continue;
      this.random.shuffle(around_walls);
      for (const wall of around_walls) {
        stack.push([wall, p, step + 1]);
      }
      const now = new Date();
      if (now.getTime() > nextSwitchTime.getTime()) {
        await switchAsync();
        nextSwitchTime = new Date(now.getTime() + this.delayMs);
      }
    }

    /**是否获取了 st 和 ed */
    let st_get = false;
    let ed_get = false;
    for (let i = 0; i < this.row; ++i) {
      for (let j = 0; j < this.column; ++j) {
        if (st_get && ed_get) return;
        if (!st_get && this.getitem(i, j) == this.mapValue.road) {
          this._st = new Point(i, j);
          this.setitem(this.st, this.mapValue.st);
          st_get = true;
        }
        const ed_idx = new Point(this.row - 1 - i, this.column - 1 - j);
        if (!ed_get && this.getitem(ed_idx) == this.mapValue.road) {
          this._ed = ed_idx;
          this.setitem(this.ed, this.mapValue.ed);
          ed_get = true;
        }
      }
    }
    if (!st_get) throw new MapInitException("st not found");
    if (!ed_get) throw new MapInitException("ed not found");
  }

  /**
   * 实例化地图对象
   * @param row 地图宽
   * @param column 地图长
   * @param random 随机数
   */
  public constructor(config: MazeMapInitConfig<TMapValue>) {
    const row = config.row;
    const column = config.column;
    const random = config.random;
    const mapValue = config.mapValue;
    if (row < 2 || column < 2) {
      throw new MapInitException("row and column must be greater than 2");
    }
    if (mapValue === undefined) {
      throw new MapInitException("mapValue cannot be undefined");
    }
    if (random === undefined) {
      this._random = new Random();
    } else {
      this._random = random;
    }
    this._row = row;
    this._column = column;
    this.mapValue = mapValue;
    this._map = Array(row)
      .fill(column)
      .map(() => Array(column).fill(this.mapValue.wall));
    this._inst_st = Point.zero;
    this._st = Point.zero;
    this._ed = Point.zero;
    if (config.delayMs !== undefined) {
      this.delayMs = config.delayMs;
    }
    this._init();
  }

  private async _init() {
    if (this.initSuccess) {
      return;
    }
    await this._initMap();
    this._initSuccess = true;
    await this._callCallback(this._initCallback, [this]);
  }

  private async _callCallback<P extends any[]>(callbacks: ((...args: P) => any)[], params: P) {
    for (const callback of callbacks) {
      await Promise.resolve(callback(...params));
    }
  }

  onInit(callback: (mazeMap: this) => any): void {
    this._initCallback.push(callback);
  }

  /**
   * 成功生成一条道路后的回调
   * @param callback.mazeMap this
   * @param callback.p 成功生成的路的点
   */
  onInitRoad(callback: (mazeMap: this, p: Point) => any): void {
    this._initRoadCallback.push(callback);
  }

  onSolving(
    callback: (mazeMap: this, p: Point, lp: Point | null, step: number) => any | Promise<any>,
  ): void {
    this._solvingCallback.push(callback);
  }

  /**
   * 获取一个点周围所有没被遍历过的路
   * @param map_temp 记录是否遍历过的地图
   * @param p 这个点
   * @returns 所有周围的路
   */
  _solveGetRoads(map_temp: (Point | null)[][], p: Point): Point[] {
    const res_temp = p.get_range();
    const res: Point[] = [];

    for (const _p of res_temp) {
      if (this.isOverrange(_p)) continue;
      const idx = map_temp[_p.x][_p.y];
      if (idx != null) continue;
      if (this.getitem(_p) == this.mapValue.wall) continue;
      res.push(_p);
    }

    return res;
  }

  async solve(pos?: Point): Promise<Point[]> {
    if (pos === undefined) pos = this.st;
    if (this.row <= 1 || this.column <= 1) return [];
    const queue = new Queue<[Point, Point | null, number]>(this.row * this.column);
    /**
     *
     * map_temp 用于记录遍历到某个点时的上一个点是什么
     * 如果没有遍历过，则是 null
     *
     * 例如：
     * map_temp[1, 2] = Point(0, 2)
     * 则 (1, 2) 的前一个点是 (0, 2)
     */
    const map_temp: (Point | null)[][] = Array(this.row)
      .fill(this.column)
      .map(() => Array(this.column).fill(null));
    let p = pos;
    let lp: Point | null = null;
    let step = 0;
    queue.add([p, lp, step]);
    while (!p.equals(this.ed)) {
      await this._callCallback(this._solvingCallback, [this, p, lp, step]);
      const _temp = queue.leave();
      if (_temp === undefined) {
        throw new QueueEmptyException("queue is empty");
      }
      [p, lp, step] = _temp;
      map_temp[p.x][p.y] = lp;
      const roads = this._solveGetRoads(map_temp, p);
      for (const road of roads) {
        queue.add([road, p, step + 1]);
      }
    }

    let rp = map_temp[this.ed.x][this.ed.y];
    const res: Point[] = Array(step + 1).fill(Point.zero);
    res[step] = this.ed;
    for (let i = step - 1; i >= 0; --i) {
      if (rp == null) {
        throw new SolveException("solve a null point");
      }
      res[i] = rp;
      rp = map_temp[rp.x][rp.y];
    }
    if (!res[0].equals(pos)) {
      throw new SolveException(`solve list is not start from pos: ${pos}`);
    }

    return res;
  }

  getitem(x: number, y: number): TMapValue;
  getitem(p: Point): TMapValue;
  getitem(...args: [number, number] | [Point]) {
    if (args.length == 1) {
      const p: Point = args[0];
      return this.map[p.x][p.y];
    } else {
      const [x, y]: [number, number] = args;
      return this.map[x][y];
    }
  }

  setitem(x: number, y: number, value: TMapValue): void;
  setitem(p: Point, value: TMapValue): void;
  setitem(...args: [number, number, TMapValue] | [Point, TMapValue]) {
    if (args.length == 2) {
      const [p, value]: [Point, TMapValue] = args;
      this.map[p.x][p.y] = value;
    } else {
      const [x, y, value]: [number, number, TMapValue] = args;
      this.map[x][y] = value;
    }
  }

  [Symbol.iterator](): Iterator<TMapValue[]> {
    return this.map[Symbol.iterator]();
  }

  toString(): string {
    let result = "";
    for (const row of this.map) {
      for (const data of row) {
        result += String(data);
      }
      result += "\n";
    }
    return result;
  }
}

export class DefaultMazeMap extends BaseMazeMap<string> {
  public constructor(config: MazeMapInitConfig<string>) {
    config.mapValue = defaultMapValue;
    super(config);
  }
}
