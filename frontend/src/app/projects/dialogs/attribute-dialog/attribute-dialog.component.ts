import { useService,DIALOG_DATA,DIALOG_HANDLE } from '../../../core/view-state';
import { AbstractControl,FormControl,FormGroup,ValidationErrors,ValidatorFn,Validators } from '../../../core/forms';
import { DialogHandle } from '../../../core/dialogs';
import {
UmlAttribute,
UmlDataType,
UmlVisibility,
} from '../../model/project';

export interface AttributeDialogData {
  mode: 'create' | 'edit';
  className: string;
  attribute?: UmlAttribute;
  reservedNames: string[];
}

export interface AttributeDialogResult {
  name: string;
  dataType: UmlDataType;
  customTypeName: string | null;
  visibility: UmlVisibility;
  nullable: boolean;
  identifier: boolean;
}

export class AttributeDialogComponent {
  readonly data = useService<AttributeDialogData>(DIALOG_DATA);
  readonly dialogRef = useService<DialogHandle<AttributeDialogComponent, AttributeDialogResult>>(DIALOG_HANDLE);

  readonly dataTypes: { value: UmlDataType; label: string }[] = [
    { value: 'STRING', label: 'String' },
    { value: 'INTEGER', label: 'Integer' },
    { value: 'LONG', label: 'Long' },
    { value: 'DECIMAL', label: 'Decimal' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'DATE', label: 'Date' },
    { value: 'DATETIME', label: 'DateTime' },
    { value: 'UUID', label: 'UUID' },
    { value: 'CUSTOM', label: 'Personalizado' },
  ];

  readonly visibilityOptions: {
    value: UmlVisibility;
    symbol: string;
    label: string;
  }[] = [
    { value: 'PUBLIC', symbol: '+', label: 'Public' },
    { value: 'PRIVATE', symbol: '-', label: 'Private' },
    { value: 'PROTECTED', symbol: '#', label: 'Protected' },
    { value: 'PACKAGE', symbol: '~', label: 'Package' },
  ];

  readonly form = new FormGroup({
    name: new FormControl(
      this.data.attribute?.name ?? '',
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
    dataType: new FormControl<UmlDataType>(
      this.data.attribute?.dataType ?? 'STRING',
      {
        nonNullable: true,
        validators: [Validators.required],
      },
    ),
    customTypeName: new FormControl(
      this.data.attribute?.customTypeName ?? '',
      { nonNullable: true },
    ),
    visibility: new FormControl<UmlVisibility>(
      this.data.attribute?.visibility ?? 'PRIVATE',
      {
        nonNullable: true,
        validators: [Validators.required],
      },
    ),
    nullable: new FormControl(
      this.data.attribute?.nullable ?? true,
      { nonNullable: true },
    ),
    identifier: new FormControl(
      this.data.attribute?.identifier ?? false,
      { nonNullable: true },
    ),
  });

  constructor() {
    this.form.controls.identifier.valueChanges.subscribe((identifier) => {
      if (identifier) {
        this.form.controls.nullable.setValue(false, { emitEvent: false });
      }
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    const raw = this.form.getRawValue();

    if (raw.dataType === 'CUSTOM') {
      this.form.controls.customTypeName.setValidators([
        Validators.required,
        Validators.maxLength(120),
        Validators.pattern(/^[A-Za-z_][A-Za-z0-9_]*$/),
      ]);
    } else {
      this.form.controls.customTypeName.clearValidators();
    }

    this.form.controls.customTypeName.updateValueAndValidity({
      emitEvent: false,
    });

    if (this.form.invalid) {
      return;
    }

    this.dialogRef.close({
      name: raw.name.trim(),
      dataType: raw.dataType,
      customTypeName:
        raw.dataType === 'CUSTOM'
          ? raw.customTypeName.trim()
          : null,
      visibility: raw.visibility,
      nullable: raw.identifier ? false : raw.nullable,
      identifier: raw.identifier,
    });
  }

  private duplicateNameValidator(): ValidatorFn {
    const current = this.data.attribute?.name.toLowerCase() ?? null;
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
