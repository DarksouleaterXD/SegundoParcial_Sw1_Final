import { useService,signal,DIALOG_DATA,DIALOG_HANDLE } from '../../../core/view-state';
import { AbstractControl,FormControl,FormGroup,ValidationErrors,ValidatorFn,Validators } from '../../../core/forms';
import { DialogHandle } from '../../../core/dialogs';
import {
finalize,
} from 'rxjs';

import {
SpringBootGenerationApiService,
} from '../../data/spring-boot-generation-api.service';
import {
SpringBootGenerationMode,
} from '../../generation/spring-boot-generation.model';
import {
SPRING_ARTIFACT_NAME_PATTERN,
defaultSpringArtifactName,
defaultSpringBasePackage,
isValidSpringBasePackage,
SpringBootGenerationErrorCopy,
springBootGenerationErrorCopy,
} from '../../generation/spring-boot-generation.utils';
import {
UmlAttribute,
UmlClass,
} from '../../model/project';

export interface SpringBootExportDialogData {
  projectId: string;
  projectName: string;
  baseRevision: number;
  classes: UmlClass[];
}

export class SpringBootExportDialogComponent {
  readonly data = useService<SpringBootExportDialogData>(DIALOG_DATA);
  readonly dialogRef = useService<DialogHandle<SpringBootExportDialogComponent>>(DIALOG_HANDLE);
  private readonly generationApi = useService(SpringBootGenerationApiService);

  readonly generating = signal(false);
  readonly errorCopy = signal<SpringBootGenerationErrorCopy | null>(null);

  private readonly defaultArtifact = defaultSpringArtifactName(this.data.projectName);

  readonly form = new FormGroup({
    mode: new FormControl<SpringBootGenerationMode>('SIMPLE_CRUD', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    authClassId: new FormControl<string | null>(null),
    usernameAttributeId: new FormControl<string | null>(null),
    passwordAttributeId: new FormControl<string | null>(null),
    artifactName: new FormControl(this.defaultArtifact, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(SPRING_ARTIFACT_NAME_PATTERN),
      ],
    }),
    basePackage: new FormControl(defaultSpringBasePackage(this.defaultArtifact), {
      nonNullable: true,
      validators: [Validators.required, this.javaPackageValidator()],
    }),
    primaryColor: new FormControl('#2563EB', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    }),
  });

  authMode(): boolean {
    return this.form.controls.mode.value === 'AUTH_INFORMATION_SYSTEM';
  }

  authAttributes(): UmlAttribute[] {
    const selectedClass = this.data.classes.find(
      (umlClass) => umlClass.id === this.form.controls.authClassId.value,
    );
    return (selectedClass?.attributes ?? [])
      .filter((attribute) => attribute.dataType === 'STRING');
  }

  modeChanged(): void {
    if (!this.authMode()) {
      this.form.controls.authClassId.setValue(null);
      this.form.controls.usernameAttributeId.setValue(null);
      this.form.controls.passwordAttributeId.setValue(null);
    }
    this.updateAuthValidators();
  }

  authClassChanged(): void {
    this.form.controls.usernameAttributeId.setValue(null);
    this.form.controls.passwordAttributeId.setValue(null);
  }

  generate(useFirstAttributeAsIdentifier = false): void {
    this.updateAuthValidators();
    this.form.markAllAsTouched();

    if (this.form.invalid || this.generating()) {
      return;
    }

    this.generating.set(true);
    this.errorCopy.set(null);
    const value = this.form.getRawValue();

    this.generationApi
      .generate(this.data.projectId, {
        baseRevision: this.data.baseRevision,
        artifactName: value.artifactName,
        basePackage: value.basePackage,
        useFirstAttributeAsIdentifier,
        mode: value.mode,
        authClassId: value.mode === 'AUTH_INFORMATION_SYSTEM' ? value.authClassId : null,
        usernameAttributeId: value.mode === 'AUTH_INFORMATION_SYSTEM' ? value.usernameAttributeId : null,
        passwordAttributeId: value.mode === 'AUTH_INFORMATION_SYSTEM' ? value.passwordAttributeId : null,
        primaryColor: value.primaryColor.toUpperCase(),
      })
      .pipe(finalize(() => this.generating.set(false)))
      .subscribe({
        next: (download) => {
          this.download(download.content, download.fileName);
          this.dialogRef.close(true);
        },
        error: (error: unknown) => {
          console.error('Spring Boot generation failed', error);
          this.errorCopy.set(springBootGenerationErrorCopy(error));
        },
      });
  }

  private updateAuthValidators(): void {
    const validators = this.authMode() ? [Validators.required] : [];
    for (const control of [
      this.form.controls.authClassId,
      this.form.controls.usernameAttributeId,
      this.form.controls.passwordAttributeId,
    ]) {
      control.setValidators(validators);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private javaPackageValidator(): ValidatorFn {
    return (control: AbstractControl<string>): ValidationErrors | null =>
      isValidSpringBasePackage(control.value) ? null : { javaPackage: true };
  }

  private download(content: Blob, fileName: string): void {
    const url = URL.createObjectURL(content);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
