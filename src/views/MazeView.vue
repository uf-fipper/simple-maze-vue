<script setup lang="ts">
import Maze from "../components/MazeComponent.vue";
</script>

<template>
  <Suspense>
    <template #default>
      <Maze :row="20" :column="40"></Maze>
    </template>
    <template #fallback>加载中</template>
  </Suspense>
</template>
