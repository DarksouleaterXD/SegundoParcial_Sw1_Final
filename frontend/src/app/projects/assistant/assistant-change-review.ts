import { UmlCommandExecutor } from '../commands/uml-command-executor';
import type { UmlCommand } from '../commands/uml-command';
import type { ProjectDocument, UmlAttribute, UmlModel, UmlRelationship } from '../model/project';

interface ModelItem { label: string; description: string; fingerprint: string; }
export interface AssistantChange {
  id: string; kind: 'ADDED' | 'UPDATED' | 'REMOVED'; label: string;
  before: string | null; after: string | null;
}
export interface AssistantChangeReview {
  commandId: string; changes: AssistantChange[]; added: number; updated: number; removed: number;
}
function attributeText(attribute: UmlAttribute): string {
  return [attribute.name + ': ' + (attribute.dataType === 'CUSTOM' ? attribute.customTypeName : attribute.dataType),
    attribute.visibility, attribute.identifier ? 'identificador' : '',
    attribute.nullable ? 'opcional' : 'obligatorio'].filter(Boolean).join(' · ');
}
function modelItems(model: UmlModel): Map<string, ModelItem> {
  const items = new Map<string, ModelItem>();
  const classes = [...model.classes, ...(model.associationClasses ?? [])];
  const name = (id: string) => classes.find(value => value.id === id)?.name ?? 'Clase no disponible';
  for (const classifier of classes) {
    const associationId = 'associationId' in classifier ? classifier.associationId : null;
    items.set('class:' + classifier.id, {
      label: associationId ? 'Clase de asociación' : 'Clase', description: classifier.name,
      fingerprint: JSON.stringify({name: classifier.name, associationId}),
    });
    for (const attribute of classifier.attributes) {
      items.set('attribute:' + classifier.id + ':' + attribute.id, {
        label: 'Atributo de ' + classifier.name, description: attributeText(attribute),
        fingerprint: JSON.stringify([attribute.name, attribute.dataType, attribute.customTypeName,
          attribute.visibility, attribute.identifier, attribute.nullable]),
      });
    }
    for (const method of classifier.methods ?? []) {
      items.set('method:' + classifier.id + ':' + method.id, {
        label: 'Método de ' + classifier.name,
        description: method.visibility + ' ' + method.name + '(' + method.parameters.map(value => value.name + ': ' + value.type).join(', ') + '): ' + method.returnType,
        fingerprint: JSON.stringify([method.name, method.visibility, method.returnType, method.parameters.map(value => [value.name, value.type])]),
      });
    }
  }
  const multiplicity = (value: UmlRelationship['sourceMultiplicity']) =>
    value ? value.lower + '..' + (value.upper === null ? '*' : value.upper) : '—';
  for (const relation of model.relationships) {
    items.set('relationship:' + relation.id, {
      label: 'Relación', description: name(relation.sourceClassId) + ' → ' + name(relation.targetClassId)
        + ' · ' + relation.type + ' · ' + multiplicity(relation.sourceMultiplicity) + ' → ' + multiplicity(relation.targetMultiplicity),
      fingerprint: JSON.stringify([relation.sourceClassId, relation.targetClassId, relation.type,
        relation.sourceMultiplicity?.lower ?? null, relation.sourceMultiplicity?.upper ?? null,
        relation.targetMultiplicity?.lower ?? null, relation.targetMultiplicity?.upper ?? null]),
    });
  }
  return items;
}
/** Replays the exact canonical command on a clone. Never mutates the workspace. */
export function reviewAssistantCommand(document: ProjectDocument, command: UmlCommand): AssistantChangeReview {
  const preview = new UmlCommandExecutor().execute(document, command);
  const before = modelItems(document.umlModel), after = modelItems(preview.umlModel);
  const changes: AssistantChange[] = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const old = before.get(id), next = after.get(id);
    if (old?.fingerprint === next?.fingerprint) continue;
    changes.push({ id, kind: !old ? 'ADDED' : !next ? 'REMOVED' : 'UPDATED',
      label: next?.label ?? old!.label, before: old?.description ?? null, after: next?.description ?? null });
  }
  // Include moves of existing elements; positions of new/deleted classes are already implied.
  for (const classifier of [...document.umlModel.classes, ...(document.umlModel.associationClasses ?? [])]) {
    const old = document.layout.nodes[classifier.id], next = preview.layout.nodes[classifier.id];
    if (old && next && JSON.stringify(old) !== JSON.stringify(next)) {
      changes.push({id: 'layout:' + classifier.id, kind: 'UPDATED', label: 'Posición de ' + classifier.name,
        before: old.x + ', ' + old.y, after: next.x + ', ' + next.y });
    }
  }
  return {commandId: command.commandId, changes,
    added: changes.filter(value => value.kind === 'ADDED').length,
    updated: changes.filter(value => value.kind === 'UPDATED').length,
    removed: changes.filter(value => value.kind === 'REMOVED').length};
}
