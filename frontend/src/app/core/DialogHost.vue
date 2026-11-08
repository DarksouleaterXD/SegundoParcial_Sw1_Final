<script setup lang="ts">
import DialogFrame from './DialogFrame.vue';
import { activeDialogs } from './dialogs';
import { AttributeDialogComponent } from '../projects/dialogs/attribute-dialog/attribute-dialog.component';
import AttributeView from '../projects/dialogs/attribute-dialog/attribute-dialog.component.vue';
import { ClassDialogComponent } from '../projects/dialogs/class-dialog/class-dialog.component';
import ClassView from '../projects/dialogs/class-dialog/class-dialog.component.vue';
import { CollaboratorsDialogComponent } from '../projects/dialogs/collaborators-dialog/collaborators-dialog.component';
import CollaboratorsView from '../projects/dialogs/collaborators-dialog/collaborators-dialog.component.vue';
import { ConfirmDialogComponent } from '../projects/dialogs/confirm-dialog/confirm-dialog.component';
import ConfirmView from '../projects/dialogs/confirm-dialog/confirm-dialog.component.vue';
import { RelationshipDialogComponent } from '../projects/dialogs/relationship-dialog/relationship-dialog.component';
import RelationshipView from '../projects/dialogs/relationship-dialog/relationship-dialog.component.vue';
import { SpringBootExportDialogComponent } from '../projects/dialogs/spring-boot-export-dialog/spring-boot-export-dialog.component';
import ExportView from '../projects/dialogs/spring-boot-export-dialog/spring-boot-export-dialog.component.vue';
import { MethodDialogComponent } from '../projects/methods/class-methods.component';
import MethodView from '../projects/methods/method-dialog.component.vue';
import { XmiInterchangeDialogComponent } from '../projects/xmi/xmi-interchange-dialog.component';
import XmiView from '../projects/xmi/xmi-interchange-dialog.component.vue';

const views = new Map<unknown, any>([
  [AttributeDialogComponent, AttributeView],
  [ClassDialogComponent, ClassView],
  [CollaboratorsDialogComponent, CollaboratorsView],
  [ConfirmDialogComponent, ConfirmView],
  [RelationshipDialogComponent, RelationshipView],
  [SpringBootExportDialogComponent, ExportView],
  [MethodDialogComponent, MethodView],
  [XmiInterchangeDialogComponent, XmiView],
]);
</script>

<template>
  <DialogFrame v-for="entry in activeDialogs" :key="entry.id" :entry="entry">
    <component :is="views.get(entry.controller)" />
  </DialogFrame>
</template>
