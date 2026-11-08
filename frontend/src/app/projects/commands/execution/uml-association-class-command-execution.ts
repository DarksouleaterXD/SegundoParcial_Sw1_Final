import type { DiagramNodeLayout, ProjectDocument, UmlAssociationClass } from '../../model/project';
import { normalizeUmlClassLayout } from '../../diagram/uml-class-geometry';
import { UmlCommandError } from '../uml-command-error';
import { UmlCommandExecutionSupport } from './uml-command-execution-support';

export class UmlAssociationClassCommandExecution {
  constructor(private readonly support = new UmlCommandExecutionSupport()) {}

  create(document: ProjectDocument, associationClass: UmlAssociationClass, layout: DiagramNodeLayout): void {
    const associations = document.umlModel.associationClasses ??= [];
    this.support.assertClassName(document, associationClass.name, null);
    const relationship = document.umlModel.relationships.find(value => value.id === associationClass.associationId);
    if (!relationship) {
      throw new UmlCommandError('ASSOCIATION_NOT_FOUND', 'La relación seleccionada ya no existe.', associationClass.associationId);
    }
    if (relationship.type !== 'ASSOCIATION') {
      throw new UmlCommandError('ASSOCIATION_CLASS_REQUIRES_ASSOCIATION', 'Una clase de asociación solo puede vincular una asociación UML.', associationClass.associationId);
    }
    if (associations.some(value => value.associationId === associationClass.associationId)) {
      throw new UmlCommandError('ASSOCIATION_ALREADY_HAS_ASSOCIATION_CLASS', 'Esta relación ya tiene una clase de asociación.', associationClass.associationId);
    }
    if (associations.some(value => value.id === associationClass.id) || document.umlModel.classes.some(value => value.id === associationClass.id)) {
      throw new UmlCommandError('DUPLICATE_ASSOCIATION_CLASS_ID', 'El identificador de la clase de asociación ya existe.', associationClass.id);
    }
    this.support.assertFiniteLayout(layout, associationClass.id);
    associations.push(structuredClone(associationClass));
    document.layout.nodes[associationClass.id] = normalizeUmlClassLayout(layout, associationClass.attributes.length);
  }

  delete(document: ProjectDocument, associationClassId: string): void {
    const associations = document.umlModel.associationClasses ?? [];
    if (!associations.some(value => value.id === associationClassId)) {
      throw new UmlCommandError('ASSOCIATION_CLASS_NOT_FOUND', 'La clase de asociación ya no existe.', associationClassId);
    }
    document.umlModel.associationClasses = associations.filter(value => value.id !== associationClassId);
    delete document.layout.nodes[associationClassId];
  }
}
