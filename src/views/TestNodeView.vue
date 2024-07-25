<script setup lang="tsx">
import { ref, type VNode, type Ref, computed } from "vue";

let content = ref("hello world");
let node: Ref<VNode> = computed(() => <div>{content.value}</div>);
</script>

<template>
  <div>{{ content }}</div>
  <component :is="node"></component>
  <input type="text" v-model="content" />
</template>
