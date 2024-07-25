<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  arg: FormArg;
}>();

const emit = defineEmits<{ (e: "onInput", formModel: { [key: string]: any }): void }>();

interface FormArg {
  key: number;
  name: string;
  type: string;
  max?: number;
  min?: number;
  maxlength?: number;
  label?: string;
  required?: boolean;
  checked?: boolean;
  value?: string;
  options?: FormArgOption[];
}

interface FormArgOption {
  key: number;
  text?: string;
  value: string;
  selected?: boolean;
}

let formModel: { [key: string]: any } = ref({});

function onInput(event: Event, arg: FormArg) {
  if (!(event instanceof InputEvent)) {
    return;
  }
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }
  if (arg.type === "text") {
    if (event.target.value === "") {
      delete formModel[arg.name];
    } else {
      formModel[arg.name] = event.target.value;
    }
    return;
  }
  if (arg.type === "number") {
    if (event.target.value === "") {
      delete formModel[arg.name];
    } else {
      formModel[arg.name] = Number(event.target.value);
    }
    return;
  }
  console.log(event.target.value);
}
</script>

<template>
  <template v-if="arg.type === 'select'">
    <td>
      <select v-model="formModel[arg.name]">
        <option
          v-for="option in arg.options"
          :value="option.value"
          v-text="option.text || option.value"
          :key="option.key"
          :selected="option.selected"
        ></option>
      </select>
    </td>
  </template>
  <template v-else>
    <td>
      <input
        v-model="formModel[arg.name]"
        :type="arg.type"
        :maxlength="arg.maxlength"
        :name="arg.name"
        :required="arg.required"
        :value="formModel[arg.name] === undefined ? arg.value : formModel[arg.name]"
        :checked="arg.checked"
        :placeholder="arg.label || arg.name"
        @input="
          (event) => {
            onInput(event, arg);
            emit('onInput', formModel);
          }
        "
      />
    </td>
  </template>
</template>
