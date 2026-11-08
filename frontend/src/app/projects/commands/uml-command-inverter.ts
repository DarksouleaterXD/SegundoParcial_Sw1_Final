import type {
  ProjectDocument,
  UmlAttribute,
  UmlClass,
  UmlAssociationClass,
  UmlRelationship,
} from '../model/project';
import { commandMetadata } from './uml-command';
import type { UmlCommand } from './uml-command';
import {
  UmlCommandError,
} from './uml-command-error';
import {
  UmlCommandExecutor,
} from './uml-command-executor';

export class UmlCommandInverter {
  private readonly executor =
    new UmlCommandExecutor();
  invert(
    before: ProjectDocument,
    command: UmlCommand,
  ): UmlCommand {
    switch (command.type) {
      case 'SET_METHODS':
        return { ...commandMetadata(), type: 'SET_METHODS', classId: command.classId,
          methods: structuredClone(this.requireClass(before, command.classId).methods ?? []) };
      case 'CREATE_CLASS':
        return {
          ...commandMetadata(),
          type: 'DELETE_CLASS',
          classId: command.umlClass.id,
        };

      case 'CREATE_ASSOCIATION_CLASS':
        return { ...commandMetadata(), type: 'DELETE_ASSOCIATION_CLASS', associationClassId: command.associationClass.id };

      case 'DELETE_ASSOCIATION_CLASS': {
        const associationClass = this.requireAssociationClass(before, command.associationClassId);
        return { ...commandMetadata(), type: 'RESTORE_ASSOCIATION_CLASS', associationClass: structuredClone(associationClass), layout: structuredClone(before.layout.nodes[associationClass.id] ?? null) };
      }

      case 'RESTORE_ASSOCIATION_CLASS':
        return { ...commandMetadata(), type: 'DELETE_ASSOCIATION_CLASS', associationClassId: command.associationClass.id };

      case 'RENAME_CLASS': {
        const umlClass =
          this.requireClass(
            before,
            command.classId,
          );

        return {
          ...commandMetadata(),
          type: 'RENAME_CLASS',
          classId: command.classId,
          name: umlClass.name,
        };
      }

      case 'DELETE_CLASS': {
        const umlClass =
          this.requireRegularClass(
            before,
            command.classId,
          );

        const layout =
          before.layout.nodes[
            command.classId
          ] ?? null;

        const relationships =
          before.umlModel.relationships
            .filter(
              (relationship) =>
                relationship.sourceClassId
                  === command.classId
                || relationship.targetClassId
                  === command.classId,
            )
            .map(
              (relationship) =>
                structuredClone(
                  relationship,
                ),
            );

        const associatedClasses =
          (before.umlModel.associationClasses ?? [])
            .filter((associationClass) =>
              relationships.some((relationship) => relationship.id === associationClass.associationId),
            );
        const restoreClass: UmlCommand = {
          ...commandMetadata(),
          type: 'RESTORE_CLASS',
          umlClass:
            structuredClone(
              umlClass,
            ),
          layout:
            layout
              ? structuredClone(layout)
              : null,
          relationships,
        };

        return associatedClasses.length === 0
          ? restoreClass
          : {
              ...commandMetadata(),
              type: 'BATCH',
              label: 'Restaurar clase y clases de asociación',
              commands: [
                restoreClass,
                ...associatedClasses.map((associationClass) => ({
                  ...commandMetadata(),
                  type: 'RESTORE_ASSOCIATION_CLASS' as const,
                  associationClass: structuredClone(associationClass),
                  layout: structuredClone(before.layout.nodes[associationClass.id] ?? null),
                })),
              ],
            };
      }

      case 'RESTORE_CLASS':
        return {
          ...commandMetadata(),
          type: 'DELETE_CLASS',
          classId: command.umlClass.id,
        };

      case 'ADD_ATTRIBUTE':
        return {
          ...commandMetadata(),
          type: 'DELETE_ATTRIBUTE',
          classId: command.classId,
          attributeId:
            command.attribute.id,
        };

      case 'UPDATE_ATTRIBUTE': {
        const attribute =
          this.requireAttribute(
            before,
            command.classId,
            command.attribute.id,
          );

        return {
          ...commandMetadata(),
          type: 'UPDATE_ATTRIBUTE',
          classId: command.classId,
          attribute:
            structuredClone(
              attribute,
            ),
        };
      }

      case 'DELETE_ATTRIBUTE': {
        const attribute =
          this.requireAttribute(
            before,
            command.classId,
            command.attributeId,
          );

        return {
          ...commandMetadata(),
          type: 'ADD_ATTRIBUTE',
          classId: command.classId,
          attribute:
            structuredClone(
              attribute,
            ),
        };
      }

      case 'CREATE_RELATIONSHIP':
        return {
          ...commandMetadata(),
          type: 'DELETE_RELATIONSHIP',
          relationshipId:
            command.relationship.id,
        };

      case 'UPDATE_RELATIONSHIP': {
        const relationship =
          this.requireRelationship(
            before,
            command.relationship.id,
          );

        return {
          ...commandMetadata(),
          type: 'UPDATE_RELATIONSHIP',
          relationship:
            structuredClone(
              relationship,
            ),
        };
      }

      case 'DELETE_RELATIONSHIP': {
        const relationship =
          this.requireRelationship(
            before,
            command.relationshipId,
          );

        const associatedClasses =
          (before.umlModel.associationClasses ?? [])
            .filter((associationClass) => associationClass.associationId === relationship.id);
        const restoreRelationship: UmlCommand = {
          ...commandMetadata(),
          type: 'CREATE_RELATIONSHIP',
          relationship:
            structuredClone(
              relationship,
            ),
        };

        return associatedClasses.length === 0
          ? restoreRelationship
          : {
              ...commandMetadata(),
              type: 'BATCH',
              label: 'Restaurar relación y clase de asociación',
              commands: [
                restoreRelationship,
                ...associatedClasses.map((associationClass) => ({
                  ...commandMetadata(),
                  type: 'RESTORE_ASSOCIATION_CLASS' as const,
                  associationClass: structuredClone(associationClass),
                  layout: structuredClone(before.layout.nodes[associationClass.id] ?? null),
                })),
              ],
            };
      }

      case 'MOVE_CLASS': {
        const layout =
          before.layout.nodes[
            command.classId
          ];

        if (!layout) {
          throw new UmlCommandError(
            'LAYOUT_NOT_FOUND',
            'No existe un layout anterior para deshacer el movimiento.',
            command.classId,
          );
        }

        return {
          ...commandMetadata(),
          type: 'MOVE_CLASS',
          classId: command.classId,
          layout:
            structuredClone(
              layout,
            ),
        };
      }

      case 'BATCH': {
        let current =
          structuredClone(before);

        const inverses: UmlCommand[] = [];

        for (const child of command.commands) {
          inverses.push(
            this.invert(
              current,
              child,
            ),
          );

          current =
            this.executor.execute(
              current,
              child,
            );
        }

        return {
          ...commandMetadata(),
          type: 'BATCH',
          label:
            `Deshacer: ${command.label}`,
          commands:
            inverses.reverse(),
        };
      }
    }
  }

  private requireClass(
    document: ProjectDocument,
    classId: string,
  ): UmlClass | UmlAssociationClass {
    const umlClass =
      document.umlModel.classes.find(
        (candidate) =>
          candidate.id === classId,
      ) ?? (document.umlModel.associationClasses ?? []).find(
        (candidate) => candidate.id === classId,
      );

    if (!umlClass) {
      throw new UmlCommandError(
        'CLASS_NOT_FOUND',
        'No existe la clase necesaria para construir el comando inverso.',
        classId,
      );
    }

    return umlClass;
  }

  private requireAttribute(
    document: ProjectDocument,
    classId: string,
    attributeId: string,
  ): UmlAttribute {
    const umlClass =
      this.requireClass(
        document,
        classId,
      );

    const attribute =
      umlClass.attributes.find(
        (candidate) =>
          candidate.id === attributeId,
      );

    if (!attribute) {
      throw new UmlCommandError(
        'ATTRIBUTE_NOT_FOUND',
        'No existe el atributo necesario para construir el comando inverso.',
        classId,
      );
    }

    return attribute;
  }

  private requireRegularClass(
    document: ProjectDocument,
    classId: string,
  ): UmlClass {
    const umlClass = document.umlModel.classes.find(
      (candidate) => candidate.id === classId,
    );
    if (!umlClass) {
      throw new UmlCommandError(
        'CLASS_NOT_FOUND',
        'No existe la clase necesaria para construir el comando inverso.',
        classId,
      );
    }
    return umlClass;
  }

  private requireRelationship(
    document: ProjectDocument,
    relationshipId: string,
  ): UmlRelationship {
    const relationship =
      document.umlModel.relationships.find(
        (candidate) =>
          candidate.id
            === relationshipId,
      );

    if (!relationship) {
      throw new UmlCommandError(
        'RELATIONSHIP_NOT_FOUND',
        'No existe la relacion necesaria para construir el comando inverso.',
        relationshipId,
      );
    }

    return relationship;
  }

  private requireAssociationClass(document: ProjectDocument, id: string): UmlAssociationClass {
    const associationClass = (document.umlModel.associationClasses ?? []).find(value => value.id === id);
    if (!associationClass) throw new UmlCommandError('ASSOCIATION_CLASS_NOT_FOUND', 'No existe la clase de asociación necesaria para deshacer el cambio.', id);
    return associationClass;
  }
}
