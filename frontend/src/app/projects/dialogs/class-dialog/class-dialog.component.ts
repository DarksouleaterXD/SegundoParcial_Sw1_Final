import { useService,DIALOG_DATA,DIALOG_HANDLE } from '../../../core/view-state';
import { AbstractControl,FormControl,FormGroup,ValidationErrors,ValidatorFn,Validators } from '../../../core/forms';
import { DialogHandle } from '../../../core/dialogs';
export interface ClassDialogData {
  mode: 'create' | 'edit';
  kind?: 'class' | 'associationClass';
  currentName?: string;
  reservedNames: string[];
}

export class ClassDialogComponent {
  readonly data = useService<ClassDialogData>(DIALOG_DATA);
  readonly dialogRef = useService<DialogHandle<ClassDialogComponent, string>>(DIALOG_HANDLE);

  readonly form = new FormGroup({
    name: new FormControl(
      this.data.currentName ?? '',
      {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.maxLength(80),
          Validators.pattern(/^[A-Za-z_][A-Za-z0-9_]*$/),
          this.duplicateNameValidator(),
        ],
      },
    ),
  });

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.dialogRef.close(
      this.form.controls.name.value.trim(),
    );
  }

  private duplicateNameValidator(): ValidatorFn {
    const current = this.data.currentName?.toLowerCase() ?? null;
    const reserved = new Set(
      this.data.reservedNames.map((name) => name.toLowerCase()),
    );

    return (
      control: AbstractControl<string>,
    ): ValidationErrors | null => {
      const value = control.value.trim().toLowerCase();

      if (!value || value === current) {
        return null;
      }

      return reserved.has(value) ? { duplicate: true } : null;
    };
  }
}
