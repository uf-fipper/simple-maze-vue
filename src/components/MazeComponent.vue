<script setup lang="ts">
import { VueGame, VueAsyncGame, vueAsyncMapValue } from "@/components/vueMapValue/vueGame";
import type { Random } from "@/api/maze/random";
import { MoveStatus } from "@/api/maze/movestatus";
import {
  ref,
  type Component,
  shallowRef,
  type ShallowRef,
  onMounted,
  defineAsyncComponent,
} from "vue";

async function doNothing() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function newDisplayMap(map: Component[][]): ShallowRef<Component>[][] {
  let result: ShallowRef<Component>[][] = [];
  for (let row of map) {
    let inner: ShallowRef<Component>[] = [];
    for (let val of row) {
      inner.push(shallowRef(val));
    }
    result.push(inner);
  }
  return result;
}

function copyMap(map: Component[][]): void {
  for (let i in map) {
    for (let j in map[i]) {
      displayMap[i][j].value = map[i][j];
    }
  }
}

function init() {
  copyMap(game.mazeMap.map);
  game.onInit(() => {
    initSuccess.value = true;
    tips.value = "success";
    displayMap[game.mazeMap.st.x][game.mazeMap.st.y].value = game.mazeMap.getitem(game.mazeMap.st);
    displayMap[game.mazeMap.ed.x][game.mazeMap.ed.y].value = game.mazeMap.getitem(game.mazeMap.ed);
    operatorLock.value = false;
    // refleshDisplayMap(true);
  });
  game.onInitRoad(async (_, map, p) => {
    displayMap[p.x][p.y].value = map.map[p.x][p.y];
    await delay(initDelay.value);
    // await doNothing();
  });
  game.onMoved(async (_, p, lp) => {
    displayMap[lp.x][lp.y].value = MapMove;
    displayMap[p.x][p.y].value = MapPlayer;
    await delay(moveDelay.value);
    // await doNothing();
  });
}

onMounted(() => {
  if (operatorLock.value) {
    return;
  }
  operatorLock.value = true;
  // init();
});

function newGame() {
  if (operatorLock.value) {
    return;
  }
  operatorLock.value = true;
  initSuccess.value = false;
  tips.value = "reloading...";
  game = new gameType(config);
  init();
}

function mapSetPlayer() {
  displayMap[game.player.pos.x][game.player.pos.y].value = MapPlayer;
}

async function move(status: MoveStatus) {
  if (operatorLock.value) {
    return;
  }
  operatorLock.value = true;
  try {
    console.log(status);
    let lastMoves = game.lastMoves;
    for await (let p of lastMoves) {
      if (p.equals(game.player.pos)) {
        continue;
      }
      displayMap[p.x][p.y].value = game.mazeMap.map[p.x][p.y];
    }
    game.move(status).then(
      () => {
        operatorLock.value = false;
      },
      () => {
        operatorLock.value = false;
      },
    );
  } catch (e) {
    console.log(e);
  }
}

async function restart() {
  if (operatorLock.value) {
    return;
  }
  operatorLock.value = true;
  game.restart();
  tips.value = "";
  copyMap(game.mazeMap.map);
  operatorLock.value = false;
  // refleshDisplayMap();
}

async function changeSolve(s: boolean) {
  onSolve.value = s;
  if (onSolve.value) {
    game.solve().then(async (solveList) => {
      for await (const p of solveList) {
        if (p.equals(game.player.pos)) {
          continue;
        }
        displayMap[p.x][p.y].value = MapSolve;
      }
    });
  } else {
    await copyMap(game.mazeMap.map);
    mapSetPlayer();
  }
  // refleshDisplayMap();
}

window.addEventListener("keypress", (ev) => {
  switch (ev.key) {
    case "w":
    case "W":
      move(MoveStatus.up);
      break;
    case "s":
    case "S":
      move(MoveStatus.down);
      break;
    case "a":
    case "A":
      move(MoveStatus.left);
      break;
    case "d":
    case "D":
      move(MoveStatus.right);
      break;
  }
});

const gameType = VueAsyncGame;
const mapValue = vueAsyncMapValue;
const MapMove = defineAsyncComponent(() => import("./vueMapValue/MapMove.vue"));
const MapPlayer = defineAsyncComponent(() => import("./vueMapValue/MapPlayer.vue"));
const MapSolve = defineAsyncComponent(() => import("./vueMapValue/MapSolve.vue"));

const config = defineProps<{
  row: number;
  column: number;
  random?: Random;
  msDelay?: number;
}>();

let game = new gameType(config);
let initSuccess = ref(game.initSuccess);
let displayMap: ShallowRef<Component>[][] = newDisplayMap(game.mazeMap.map);
let onSolve = ref(false);
let tips = ref("");
let moveDelay = ref(200);
let initDelay = ref(2000);

let operatorLock = ref(false);

init();
</script>

<template>
  <div class="mapContainer">
    <template v-if="game.initSuccess || true">
      <div v-for="(line, index1) in displayMap" :key="index1" class="line">
        <div v-for="(value, index2) in line" :key="`${index1}-${index2}`" class="cell">
          <Suspense>
            <template #default>
              <component :is="value.value"></component>
            </template>
          </Suspense>
        </div>
      </div>
    </template>
  </div>
  <div>移动延迟</div>
  <input type="number" v-model="moveDelay" />
  <div>生成延迟</div>
  <input type="number" v-model="initDelay" />
  <button @click.left="move(MoveStatus.up)">上</button>
  <button @click.left="move(MoveStatus.down)">下</button>
  <button @click.left="move(MoveStatus.left)">左</button>
  <button @click.left="move(MoveStatus.right)">右</button>
  <button @click="restart">restart</button>
  <button @click="newGame">new</button>
  <button @click="changeSolve(!onSolve)">
    {{ onSolve ? "关闭解析" : "打开解析" }}
  </button>
  <br />
  <div>{{ tips }}</div>
  <div>{{ initSuccess }}</div>
</template>

<style scoped>
.mapContainer {
  display: grid;
  grid-template-rows: repeat(v-bind("game.row"), 20px);
  grid-gap: 4px;
  margin: 8px 0;
}
.line {
  display: grid;
  grid-template-columns: repeat(v-bind("game.column"), 20px);
  grid-gap: 4px;
  margin: 8px 0;
}
.cell {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 3px rgba(0, 0, 0, 0.1);
  -webkit-box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 3px rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  background-color: #ffffff18;
  word-break: break-word;
  hyphens: auto;
}
</style>
