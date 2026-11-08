import assert from 'node:assert/strict';
import test from 'node:test';

import type { ProjectDocument, UmlAttribute } from '../model/project.ts';
import { commandMetadata } from './uml-command.ts';
import type { UmlCommand } from './uml-command.ts';
import { UmlCommandExecutor } from './uml-command-executor.ts';
import { UmlCommandInverter } from './uml-command-inverter.ts';
import { createUmlAssociationClassCell } from '../diagram/uml-class-shape.ts';
import {
  createAssociationClassConnector,
  createUmlRelationshipCell,
} from '../diagram/uml-relationship-shape.ts';

const layout = (x: number, y: number) => ({ x, y, width: 260, height: 160 });
const attribute = (id: string, name: string, dataType: UmlAttribute['dataType']): UmlAttribute => ({
  id, name, dataType, customTypeName: null, visibility: 'PRIVATE', nullable: false, identifier: false,
});

function documentWithVentaProducto(): ProjectDocument {
  return {
    schemaVersion: '1.0',
    umlModel: {
      classes: [
        { id: 'venta', name: 'Venta', attributes: [] },
        { id: 'producto', name: 'Producto', attributes: [] },
      ],
      relationships: [{
        id: 'venta-producto', sourceClassId: 'venta', targetClassId: 'producto', type: 'ASSOCIATION',
        sourceMultiplicity: { lower: 0, upper: null }, targetMultiplicity: { lower: 1, upper: null },
      }],
      associationClasses: [],
    },
    layout: { nodes: { venta: layout(100, 100), producto: layout(520, 100) } },
  };
}

function createDetalle(): UmlCommand {
  return {
    ...commandMetadata(), type: 'CREATE_ASSOCIATION_CLASS',
    associationClass: { id: 'detalle', name: 'Detalle', associationId: 'venta-producto', attributes: [] },
    layout: layout(310, 310),
  };
}

test('creates an AssociationClass tied to exactly one existing association and reuses attributes', () => {
  const executor = new UmlCommandExecutor();
  let current = executor.execute(documentWithVentaProducto(), createDetalle());
  current = executor.execute(current, { ...commandMetadata(), type: 'ADD_ATTRIBUTE', classId: 'detalle', attribute: attribute('cantidad', 'cantidad', 'INTEGER') });
  current = executor.execute(current, { ...commandMetadata(), type: 'ADD_ATTRIBUTE', classId: 'detalle', attribute: attribute('precio', 'precioUnitario', 'DECIMAL') });

  assert.deepEqual(current.umlModel.associationClasses, [{
    id: 'detalle', name: 'Detalle', associationId: 'venta-producto',
    attributes: [attribute('cantidad', 'cantidad', 'INTEGER'), attribute('precio', 'precioUnitario', 'DECIMAL')],
  }]);
  assert.equal(current.umlModel.relationships.length, 1, 'the association class never creates a duplicate UML association');
  assert.ok(current.layout.nodes.detalle);
});

test('deleting an association cascades its AssociationClass and undo restores both layout and attributes', () => {
  const executor = new UmlCommandExecutor();
  const inverter = new UmlCommandInverter();
  const before = executor.execute(documentWithVentaProducto(), createDetalle());
  const command: UmlCommand = { ...commandMetadata(), type: 'DELETE_RELATIONSHIP', relationshipId: 'venta-producto' };
  const deleted = executor.execute(before, command);

  assert.equal(deleted.umlModel.relationships.length, 0);
  assert.equal(deleted.umlModel.associationClasses?.length, 0);
  assert.equal(deleted.layout.nodes.detalle, undefined);
  const restored = executor.execute(deleted, inverter.invert(before, command));
  assert.deepEqual(restored.umlModel.classes.map((item) => item.id).sort(), ['producto', 'venta']);
  assert.deepEqual(restored.umlModel.relationships, before.umlModel.relationships);
  assert.deepEqual(restored.umlModel.associationClasses, before.umlModel.associationClasses);
  assert.deepEqual(restored.layout.nodes, before.layout.nodes);
});

test('deleting an endpoint cascades its association class while preserving the other endpoint after undo/redo', () => {
  const executor = new UmlCommandExecutor();
  const inverter = new UmlCommandInverter();
  const before = executor.execute(documentWithVentaProducto(), createDetalle());
  const command: UmlCommand = { ...commandMetadata(), type: 'DELETE_CLASS', classId: 'venta' };
  const deleted = executor.execute(before, command);

  assert.deepEqual(deleted.umlModel.classes.map((item) => item.id), ['producto']);
  assert.equal(deleted.umlModel.associationClasses?.length, 0);
  const restored = executor.execute(deleted, inverter.invert(before, command));
  assert.deepEqual(restored.umlModel.classes.map((item) => item.id).sort(), ['producto', 'venta']);
  assert.deepEqual(restored.umlModel.relationships, before.umlModel.relationships);
  assert.deepEqual(restored.umlModel.associationClasses, before.umlModel.associationClasses);
  assert.deepEqual(restored.layout.nodes, before.layout.nodes);
});

test('projection uses one principal association and one visual-only dashed association-class connector', () => {
  const document = new UmlCommandExecutor().execute(documentWithVentaProducto(), createDetalle());
  const relationship = document.umlModel.relationships[0];
  const detalle = document.umlModel.associationClasses?.[0];
  assert.ok(detalle);

  const detalleCell = createUmlAssociationClassCell(detalle, document.layout.nodes.detalle);
  const relationshipCell = createUmlRelationshipCell(relationship);
  const connector = createAssociationClassConnector(
    detalle,
    relationship,
    document.layout.nodes.venta,
    document.layout.nodes.producto,
  );

  assert.equal(relationshipCell.get('umlRelationshipId'), 'venta-producto');
  assert.equal(detalleCell.get('umlAssociationClassId'), 'detalle');
  assert.equal(connector.get('isAssociationClassConnector'), true);
  assert.equal(connector.attr('line/strokeDasharray'), '6 5');
  assert.equal(document.umlModel.relationships.length, 1);
});
