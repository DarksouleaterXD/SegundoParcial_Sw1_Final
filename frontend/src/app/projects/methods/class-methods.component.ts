import { useService,signal,DIALOG_DATA,viewProp,DIALOG_HANDLE } from '../../core/view-state';
import { DialogService,DialogHandle } from '../../core/dialogs';
import { ProjectWorkspaceStore } from '../state/project-workspace.store';
import type { UmlClassifier,UmlMethod } from '../model/project';
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog/confirm-dialog.component';

export function methodSignature(method: UmlMethod): string {
  const symbols = {PUBLIC: '+', PRIVATE: '−', PROTECTED: '#', PACKAGE: '~'};
  return symbols[method.visibility] + ' ' + method.name + '(' +
    method.parameters.map(parameter => parameter.name + ': ' + parameter.type).join(', ') + '): ' + method.returnType;
}

export class MethodDialogComponent {
  readonly data = useService<{classifier: UmlClassifier; method?: UmlMethod}>(DIALOG_DATA);
  readonly ref = useService<DialogHandle<MethodDialogComponent, UmlMethod>>(DIALOG_HANDLE);
  private readonly store = useService(ProjectWorkspaceStore);
  private readonly revision = this.store.revision();
  name = this.data.method?.name ?? '';
  visibility: UmlMethod['visibility'] = this.data.method?.visibility ?? 'PUBLIC';
  returnType = this.data.method?.returnType ?? 'void';
  parameters = this.data.method?.parameters.map(value => value.name + ': ' + value.type).join('\n') ?? '';
  readonly error = signal('');
  submit(): void {
    if (this.store.revision() !== this.revision || this.store.assistantPlanningBlockReason()) {
      this.error.set('El modelo cambió o tiene operaciones pendientes. Cierra el diálogo y vuelve a abrirlo cuando esté sincronizado.'); return;
    }
    const name = this.name.trim(), returnType = this.returnType.trim();
    const type = /^[A-Za-z_][A-Za-z0-9_.]*(\[\])?$/;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || !type.test(returnType)) {
      this.error.set('Usa nombres y tipos válidos, sin espacios ni símbolos especiales.'); return;
    }
    const parameters: UmlMethod['parameters'] = [];
    for (const line of this.parameters.split('\n').filter(value => value.trim())) {
      const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_.]*(?:\[\])?)$/);
      if (!match || match[1].length > 80 || match[2].length > 120 || match[2] === 'void' || parameters.some(value => value.name === match[1])) {
        this.error.set('Cada parámetro debe tener nombre único y formato nombre: Tipo. No se permite void.'); return;
      }
      parameters.push({name: match[1], type: match[2]});
    }
    if (parameters.length > 20) { this.error.set('Se permiten hasta 20 parámetros.'); return; }
    if ((this.data.classifier.methods ?? []).some(value => value.id !== this.data.method?.id && value.name === name
      && value.parameters.map(parameter => parameter.type).join(',') === parameters.map(parameter => parameter.type).join(','))) {
      this.error.set('Ya existe un método con ese nombre y los mismos tipos de parámetros.'); return;
    }
    this.ref.close({id: this.data.method?.id ?? crypto.randomUUID(), name, visibility: this.visibility, returnType, parameters});
  }
}

export class ClassMethodsComponent {
  readonly classifier = viewProp<UmlClassifier>('classifier');
  readonly error = signal('');
  readonly signature = methodSignature;
  private readonly dialog = useService(DialogService);

  private readonly store = useService(ProjectWorkspaceStore);
  edit(method?: UmlMethod): void {
    this.error.set('');
    const classifier = this.classifier();
    this.dialog.open(MethodDialogComponent, {maxWidth:'94vw', data:{classifier, method}})
      .afterClosed().subscribe((result?: UmlMethod) => {
        if (!result) return;
        const current = [...this.store.classes(), ...this.store.associationClasses()].find(value => value.id === classifier.id);
        if (!current) return;
        const methods = [...(current.methods ?? [])];
        const index = methods.findIndex(value => value.id === result.id);
        if (index < 0) methods.push(result); else methods[index] = result;
        this.store.setMethods(classifier.id, methods);
      });
  }
  remove(method: UmlMethod): void {
    const classifier = this.classifier(), revision = this.store.revision();
    this.dialog.open(ConfirmDialogComponent, {maxWidth:'94vw', data:{
      title:'Eliminar método', message:'Se eliminará ' + method.name + ' de ' + classifier.name + '.', confirmLabel:'Eliminar', icon:'delete'
    }}).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      if (revision !== this.store.revision() || this.store.assistantPlanningBlockReason()) {
        this.error.set('El modelo cambió o tiene operaciones pendientes. Vuelve a intentarlo cuando esté sincronizado.'); return;
      }
      this.store.setMethods(classifier.id, (classifier.methods ?? []).filter(value => value.id !== method.id));
    });
  }
}
