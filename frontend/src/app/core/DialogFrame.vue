<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import type { DialogEntry } from './dialogs';
import { provideDialogContext } from './view-state';

const props = defineProps<{ entry: DialogEntry }>();
provideDialogContext(props.entry.context, props.entry.options.data, props.entry.handle);
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const titleId = 'studio-dialog-title-' + props.entry.id;
onMounted(() => {
  const element = dialog.value!;
  const title = element.querySelector('.studio-dialog-title');
  if (title) title.id = titleId;
  else element.removeAttribute('aria-labelledby');
  element.showModal();
});

function cancel(event: Event): void {
  event.preventDefault();
  if (!props.entry.options.disableClose) props.entry.handle.close();
}

function dismissBackdrop(event: MouseEvent): void {
  const bounds = dialog.value!.getBoundingClientRect();
  const outside =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;
  if (outside && !props.entry.options.disableClose) props.entry.handle.close();
}
</script>

<template>
  <dialog
    ref="dialog"
    class="studio-dialog"
    :aria-labelledby="titleId"
    :style="{ width: entry.options.width, maxWidth: entry.options.maxWidth ?? '80vw' }"
    @cancel="cancel"
    @click.self="dismissBackdrop"
  >
    <slot />
  </dialog>
</template>
