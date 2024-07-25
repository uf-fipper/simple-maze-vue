<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  comp: Component;
}>();
</script>

<template>
  <comp></comp>
</template>
