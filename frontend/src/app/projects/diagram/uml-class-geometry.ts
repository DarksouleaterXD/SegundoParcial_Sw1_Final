import type { DiagramNodeLayout } from '../model/project';

export const UML_CLASS_MIN_WIDTH = 260;
export const UML_CLASS_MIN_HEIGHT = 160;
export const UML_CLASS_HEADER_HEIGHT = 58;
export const UML_CLASS_ATTRIBUTE_LINE_HEIGHT = 22;
export const UML_CLASS_ATTRIBUTE_TOP = 82;
export const UML_CLASS_BOTTOM_PADDING = 18;

export function umlClassHeight(
  attributeCount: number,
  methodCount = 0,
): number {
  const attributesHeight =
    Math.max(attributeCount, 1)
    * UML_CLASS_ATTRIBUTE_LINE_HEIGHT;

  return Math.max(
    UML_CLASS_MIN_HEIGHT,
    UML_CLASS_ATTRIBUTE_TOP + (methodCount > 0 ? 34 + methodCount * 22 : 0)
      + attributesHeight
      + UML_CLASS_BOTTOM_PADDING,
  );
}

export function normalizeUmlClassLayout(
  layout: DiagramNodeLayout,
  attributeCount: number,
  methodCount = 0,
): DiagramNodeLayout {
  return {
    x: layout.x,
    y: layout.y,
    width: Math.max(
      layout.width,
      methodCount > 0 ? 360 : UML_CLASS_MIN_WIDTH,
    ),
    height: Math.max(
      umlClassHeight(attributeCount, methodCount),
      UML_CLASS_MIN_HEIGHT,
    ),
  };
}
