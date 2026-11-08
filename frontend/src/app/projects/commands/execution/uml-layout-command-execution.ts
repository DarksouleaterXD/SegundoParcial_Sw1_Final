import type {
  DiagramNodeLayout,
  ProjectDocument,
  UmlAttribute,
  UmlClass,
  UmlRelationship,
} from '../../model/project';
import { normalizeUmlClassLayout } from '../../diagram/uml-class-geometry';
import { UmlCommandExecutionSupport } from './uml-command-execution-support';

export class UmlLayoutCommandExecution {
  constructor(
    private readonly support =
      new UmlCommandExecutionSupport(),
  ) {}

  moveClass(
    document: ProjectDocument,
    classId: string,
    layout: DiagramNodeLayout,
  ): void {
    const umlClass =
      this.support.requireClassifier(
        document,
        classId,
      );

    this.support.assertFiniteLayout(
      layout,
      classId,
    );

    document.layout.nodes[classId] =
      normalizeUmlClassLayout(
        layout,
        umlClass.attributes.length,
      );
  }

  defaultLayout(document: ProjectDocument): DiagramNodeLayout {
    return this.support.defaultLayout(document.umlModel.classes.length + (document.umlModel.associationClasses?.length ?? 0));
  }
}
