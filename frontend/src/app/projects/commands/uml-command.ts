import type {
  DiagramNodeLayout,
  UmlAttribute,
  UmlMethod,
  UmlAssociationClass,
  UmlClass,
  UmlRelationship,
} from '../model/project';

interface UmlCommandBase {
  commandId: string;
  issuedAt: string;
}

export type UmlCommand =
  | (UmlCommandBase & { type: 'SET_METHODS'; classId: string; methods: UmlMethod[] })
  | (UmlCommandBase & {
      type: 'CREATE_CLASS';
      umlClass: UmlClass;
      layout: DiagramNodeLayout;
    })
  | (UmlCommandBase & {
      type: 'CREATE_ASSOCIATION_CLASS';
      associationClass: UmlAssociationClass;
      layout: DiagramNodeLayout;
    })
  | (UmlCommandBase & {
      type: 'DELETE_ASSOCIATION_CLASS';
      associationClassId: string;
    })
  | (UmlCommandBase & {
      type: 'RESTORE_ASSOCIATION_CLASS';
      associationClass: UmlAssociationClass;
      layout: DiagramNodeLayout | null;
    })
  | (UmlCommandBase & {
      type: 'RENAME_CLASS';
      classId: string;
      name: string;
    })
  | (UmlCommandBase & {
      type: 'DELETE_CLASS';
      classId: string;
    })
  | (UmlCommandBase & {
      type: 'RESTORE_CLASS';
      umlClass: UmlClass;
      layout: DiagramNodeLayout | null;
      relationships: UmlRelationship[];
    })
  | (UmlCommandBase & {
      type: 'ADD_ATTRIBUTE';
      classId: string;
      attribute: UmlAttribute;
    })
  | (UmlCommandBase & {
      type: 'UPDATE_ATTRIBUTE';
      classId: string;
      attribute: UmlAttribute;
    })
  | (UmlCommandBase & {
      type: 'DELETE_ATTRIBUTE';
      classId: string;
      attributeId: string;
    })
  | (UmlCommandBase & {
      type: 'CREATE_RELATIONSHIP';
      relationship: UmlRelationship;
    })
  | (UmlCommandBase & {
      type: 'UPDATE_RELATIONSHIP';
      relationship: UmlRelationship;
    })
  | (UmlCommandBase & {
      type: 'DELETE_RELATIONSHIP';
      relationshipId: string;
    })
  | (UmlCommandBase & {
      type: 'MOVE_CLASS';
      classId: string;
      layout: DiagramNodeLayout;
    })
  | (UmlCommandBase & {
      type: 'BATCH';
      label: string;
      commands: UmlCommand[];
    });

export type UmlCommandType = UmlCommand['type'];

export function commandMetadata(): Pick<
  UmlCommandBase,
  'commandId' | 'issuedAt'
> {
  return {
    commandId: crypto.randomUUID(),
    issuedAt: new Date().toISOString(),
  };
}
