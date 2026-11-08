import { Component, ViewContainerRef, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ProjectWorkspaceStore } from '../state/project-workspace.store';
import type { UmlClassifier, UmlMethod } from '../model/project';
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog/confirm-dialog.component';

export function methodSignature(method: UmlMethod): string {
  const symbols = {PUBLIC: '+', PRIVATE: '−', PROTECTED: '#', PACKAGE: '~'};
  return symbols[method.visibility] + ' ' + method.name + '(' +
    method.parameters.map(parameter => parameter.name + ': ' + parameter.type).join(', ') + '): ' + method.returnType;
}
@Component({
  selector: 'app-method-dialog', imports: [FormsModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.method ? 'Editar método' : 'Nuevo método' }}</h2>
    <mat-dialog-content>
      <p>Clase {{ data.classifier.name }} · Operación UML de documentación.</p>
      <form id="method-form" (ngSubmit)="submit()">
        <label>Nombre del método<input name="name" [(ngModel)]="name" maxlength="80" required /></label>
        <div class="fields"><label>Visibilidad<select name="visibility" [(ngModel)]="visibility"><option value="PUBLIC">+ Público</option><option value="PRIVATE">− Privado</option><option value="PROTECTED"># Protegido</option><option value="PACKAGE">~ Paquete</option></select></label>
        <label>Tipo de retorno<input name="returnType" [(ngModel)]="returnType" maxlength="120" placeholder="void, String, Cliente…" required /></label></div>
        <label>Parámetros<textarea name="parameters" [(ngModel)]="parameters" rows="4" maxlength="5000" placeholder="Un parámetro por línea. Ejemplo:&#10;id: UUID&#10;nombre: String"></textarea></label>
        <small>Hasta 20 parámetros. Tipos simples, nombres de clase o arreglos como String[]. No se implementa el cuerpo del método.</small>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button type="button" (click)="ref.close()">Cancelar</button><button mat-flat-button class="cf-button-primary" form="method-form" type="submit">Guardar método</button></mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content { width:min(520px,80vw); box-sizing:border-box; }
    form,label { display:grid; gap:8px; }form { gap:16px; }label { font-size:12px; color:#4e3b70; }
    p,small { font-size:11px; color:#82778e; line-height:1.8; }
    input,select,textarea { font:inherit; font-size:13px; padding:10px; background:#fcfaff; border:1px solid #d9d1e7; border-radius:7px; width:100%; box-sizing:border-box; color:#222337; }
    textarea { resize:vertical; }.fields { display:grid; grid-template-columns:1fr 1fr; gap:12px; }.error { color:#a72c40; }
    @media(max-width:600px) { .fields { grid-template-columns:1fr; } }
  `,
})
export class MethodDialogComponent {
  readonly data = inject<{classifier: UmlClassifier; method?: UmlMethod}>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<MethodDialogComponent, UmlMethod>);
  private readonly store = inject(ProjectWorkspaceStore);
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
@Component({
  selector: 'app-class-methods', imports: [MatButtonModule],
  template: `
    <section class="methods-section" aria-label="Métodos de la clase">
      <header><strong>MÉTODOS <span>{{ classifier().methods?.length ?? 0 }}</span></strong>
        <button mat-button class="cf-button-secondary" type="button" [disabled]="(classifier().methods?.length ?? 0) >= 50" (click)="edit()">+ Método</button></header>
      <div class="method-list">@for (method of classifier().methods ?? []; track method.id) {
        <article><span class="signature">{{ signature(method) }}</span><div class="actions">
          <button type="button" [attr.aria-label]="'Editar método ' + method.name" (click)="edit(method)"><span class="material-symbols-rounded" aria-hidden="true">edit</span></button>
          <button type="button" [attr.aria-label]="'Eliminar método ' + method.name" (click)="remove(method)"><span class="material-symbols-rounded" aria-hidden="true">delete</span></button>
        </div></article>
      } @empty { <p>Sin métodos definidos.</p> }</div>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    </section>
  `,
  styles: `
    :host { display:block; min-width:0; }.methods-section { border-top:1px solid #e5ddef; margin-top:14px; padding-top:12px; }
    header { display:flex; align-items:center; justify-content:space-between; gap:8px; }header strong { font-size:9px; letter-spacing:1px; color:#80649f; }header strong span { margin-left:5px; color:#6944b5; }
    header button { font-size:10px; padding:0 7px; min-height:28px; box-shadow:none; }.method-list { max-height:180px; overflow:auto; scrollbar-width:thin; }
    article { display:flex; align-items:center; gap:6px; padding:8px 0; border-bottom:1px solid #eee8f6; }.signature { flex:1; font-size:11px; line-height:1.7; overflow-wrap:anywhere; min-width:0; color:#4e3b70; }.actions { display:flex; flex-shrink:0; }.actions button { display:grid; place-items:center; width:26px; height:28px; background:transparent; color:#80649f; border:0; border-radius:4px; cursor:pointer; }.actions button:hover { background:#eee7f9; }.actions button:last-child { color:#a72c40; }.material-symbols-rounded { font-size:15px; }p { font-size:10px; color:#82778e; line-height:1.8; }.error { color:#a72c40; }
  `,
})
export class ClassMethodsComponent {
  readonly classifier = input.required<UmlClassifier>();
  readonly error = signal('');
  readonly signature = methodSignature;
  private readonly dialog = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly store = inject(ProjectWorkspaceStore);
  edit(method?: UmlMethod): void {
    this.error.set('');
    const classifier = this.classifier();
    this.dialog.open(MethodDialogComponent, {viewContainerRef:this.viewContainerRef, maxWidth:'94vw', data:{classifier, method}})
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
