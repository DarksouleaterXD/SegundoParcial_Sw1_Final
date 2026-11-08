import { dia, shapes } from '@joint/core';

import type {
  DiagramNodeLayout,
  UmlAttribute,
  UmlClass,
  UmlAssociationClass,
  UmlDataType,
  UmlVisibility,
} from '../model/project';
import {
  normalizeUmlClassLayout,
  UML_CLASS_HEADER_HEIGHT,
} from './uml-class-geometry';

export const UmlClassShape = dia.Element.define(
  'classforge.UmlClass',
  {
    attrs: {
      body: {
        width: 'calc(w)',
        height: 'calc(h)',
        fill: '#292b43',
        stroke: '#77718f',
        strokeWidth: 1.4,
        rx: 6,
        ry: 6,
        cursor: 'move',
      },
      header: {
        width: 'calc(w)',
        height: UML_CLASS_HEADER_HEIGHT,
        fill: '#d8c9ee',
        stroke: 'none',
        rx: 6,
        ry: 6,
        pointerEvents: 'none',
      },
      headerMask: {
        y: UML_CLASS_HEADER_HEIGHT - 12,
        width: 'calc(w)',
        height: 12,
        fill: '#d8c9ee',
        stroke: 'none',
        pointerEvents: 'none',
      },
      divider: {
        x1: 0,
        y1: UML_CLASS_HEADER_HEIGHT,
        x2: 'calc(w)',
        y2: UML_CLASS_HEADER_HEIGHT,
        stroke: '#a894c5',
        strokeWidth: 1,
        pointerEvents: 'none',
      },
      stereotype: {
        x: 16,
        y: 19,
        fill: '#665080',
        fontSize: 10,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, sans-serif',
        fontWeight: 700,
        letterSpacing: '0.12em',
        text: 'CLASS',
        pointerEvents: 'none',
      },
      className: {
        x: 16,
        y: 43,
        fill: '#302044',
        fontSize: 18,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, sans-serif',
        fontWeight: 750,
        text: 'Class',
        pointerEvents: 'none',
      },
      attributes: {
        x: 16,
        y: 84,
        fill: '#eee8f6',
        fontSize: 13,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: 22,
        text: '',
        pointerEvents: 'none',
      },
      methodDivider: { x1: 0, x2: 'calc(w)', stroke: '#77718f', strokeWidth: 1, pointerEvents: 'none' },
      methods: { x:16, fill:'#d8c9ee', fontSize:12, lineHeight:22,
        fontFamily:'Inter, ui-sans-serif, system-ui, sans-serif', pointerEvents:'none' },
    },
  },
  {
    markup: [
      {
        tagName: 'rect',
        selector: 'body',
      },
      {
        tagName: 'rect',
        selector: 'header',
      },
      {
        tagName: 'rect',
        selector: 'headerMask',
      },
      {
        tagName: 'line',
        selector: 'divider',
      },
      {
        tagName: 'text',
        selector: 'stereotype',
      },
      {
        tagName: 'text',
        selector: 'className',
      },
      {
        tagName: 'text',
        selector: 'attributes',
      },
      { tagName: 'line', selector: 'methodDivider' },
      { tagName: 'text', selector: 'methods' },
    ],
  },
);

export const classForgeCellNamespace = {
  ...shapes,
  classforge: {
    UmlClass: UmlClassShape,
  },
};

export function createUmlClassCell(
  umlClass: UmlClass | UmlAssociationClass,
  layout: DiagramNodeLayout,
  stereotype = 'CLASS',
): dia.Element {
  const normalized =
    normalizeUmlClassLayout(
      layout,
      umlClass.attributes.length,
      umlClass.methods?.length ?? 0,
    );

  const cell = new UmlClassShape({
    id: umlClass.id,
    position: {
      x: normalized.x,
      y: normalized.y,
    },
    size: {
      width: normalized.width,
      height: normalized.height,
    },
    attrs: {
      methodDivider: { y1: 100 + Math.max(1, umlClass.attributes.length) * 22,
        y2: 100 + Math.max(1, umlClass.attributes.length) * 22, display: umlClass.methods?.length ? 'block' : 'none' },
      methods: { y: 124 + Math.max(1, umlClass.attributes.length) * 22,
        text: (umlClass.methods ?? []).map(method => {
          const symbols = {PUBLIC:'+',PRIVATE:'−',PROTECTED:'#',PACKAGE:'~'};
          const signature = symbols[method.visibility] + ' ' + method.name + '(' + method.parameters.map(p => p.name + ': ' + p.type).join(', ') + '): ' + method.returnType;
          return signature.length > 42 ? signature.slice(0, 41) + '…' : signature;
        }).join('\n') },
      stereotype: { text: stereotype },
      className: {
        text: umlClass.name,
      },
      attributes: {
        text:
          umlClass.attributes.length === 0
            ? '  (sin atributos)'
            : umlClass.attributes
                .map(formatAttribute)
                .join('\n'),
        fill:
          umlClass.attributes.length === 0
            ? '#b9b1cd'
            : '#eee8f6',
      },
    },
  });

  cell.set('umlClassId', umlClass.id);

  return cell;
}

export function createUmlAssociationClassCell(
  associationClass: UmlAssociationClass,
  layout: DiagramNodeLayout,
): dia.Element {
  const cell = createUmlClassCell(associationClass, layout, 'ASSOCIATION CLASS');
  cell.attr('body/stroke', '#b4bbef');
  cell.attr('header/fill', '#ccd2f3');
  cell.attr('headerMask/fill', '#ccd2f3');
  cell.attr('stereotype/fill', '#515b8e');
  cell.attr('className/fill', '#262d50');
  cell.set('umlAssociationClassId', associationClass.id);
  return cell;
}

function formatAttribute(
  attribute: UmlAttribute,
): string {
  const visibility =
    visibilitySymbol(attribute.visibility);

  const type = dataTypeLabel(attribute);

  const identifier =
    attribute.identifier ? ' {id}' : '';

  const nullable =
    attribute.nullable ? ' [0..1]' : '';

  return `${visibility} ${attribute.name}: ${type}${identifier}${nullable}`;
}

function visibilitySymbol(
  visibility: UmlVisibility,
): string {
  switch (visibility) {
    case 'PUBLIC':
      return '+';
    case 'PROTECTED':
      return '#';
    case 'PACKAGE':
      return '~';
    default:
      return '-';
  }
}

function dataTypeLabel(
  attribute: UmlAttribute,
): string {
  if (
    attribute.dataType === 'CUSTOM'
    && attribute.customTypeName
  ) {
    return attribute.customTypeName;
  }

  const labels: Record<UmlDataType, string> = {
    STRING: 'String',
    INTEGER: 'int',
    LONG: 'Long',
    DECIMAL: 'Decimal',
    BOOLEAN: 'Boolean',
    DATE: 'Date',
    DATETIME: 'DateTime',
    UUID: 'UUID',
    CUSTOM: 'Custom',
  };

  return labels[attribute.dataType];
}
