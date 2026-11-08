import { useService,DIALOG_DATA,DIALOG_HANDLE } from '../../../core/view-state';
import { FormControl,FormGroup,Validators } from '../../../core/forms';
import { DialogHandle } from '../../../core/dialogs';
import {
Multiplicity,
UmlClass,
UmlRelationship,
UmlRelationshipType,
} from '../../model/project';

export interface RelationshipDialogData {
  mode: 'create' | 'edit';
  classes: UmlClass[];
  relationship?: UmlRelationship;
  sourceClassId?: string;
  targetClassId?: string;
}

export interface RelationshipDialogResult {
  sourceClassId: string;
  targetClassId: string;
  type: UmlRelationshipType;
  sourceMultiplicity: Multiplicity | null;
  targetMultiplicity: Multiplicity | null;
}

type MultiplicityOption =
  | '1'
  | '0..1'
  | '0..*'
  | '1..*';

export class RelationshipDialogComponent {
  readonly data =
    useService<RelationshipDialogData>(
      DIALOG_DATA,
    );

  readonly dialogRef = useService<DialogHandle<
      RelationshipDialogComponent,
      RelationshipDialogResult
    >>(DIALOG_HANDLE);

  readonly typeOptions: {
    value: UmlRelationshipType;
    label: string;
  }[] = [
    {
      value: 'ASSOCIATION',
      label: 'Asociacion',
    },
    {
      value: 'AGGREGATION',
      label: 'Agregacion',
    },
    {
      value: 'COMPOSITION',
      label: 'Composicion',
    },
    {
      value: 'GENERALIZATION',
      label: 'Generalizacion',
    },
  ];

  readonly multiplicityOptions:
    MultiplicityOption[] = [
      '1',
      '0..1',
      '0..*',
      '1..*',
    ];

  readonly form = new FormGroup({
    sourceClassId: new FormControl(
      this.data.relationship?.sourceClassId
        ?? this.data.sourceClassId
        ?? '',
      {
        nonNullable: true,
        validators: [Validators.required],
      },
    ),
    targetClassId: new FormControl(
      this.data.relationship?.targetClassId
        ?? this.data.targetClassId
        ?? '',
      {
        nonNullable: true,
        validators: [Validators.required],
      },
    ),
    type: new FormControl<UmlRelationshipType>(
      this.data.relationship?.type
        ?? 'ASSOCIATION',
      {
        nonNullable: true,
        validators: [Validators.required],
      },
    ),
    sourceMultiplicity:
      new FormControl<MultiplicityOption>(
        this.toOption(
          this.data.relationship
            ?.sourceMultiplicity,
        ),
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
    targetMultiplicity:
      new FormControl<MultiplicityOption>(
        this.toOption(
          this.data.relationship
            ?.targetMultiplicity,
          '0..*',
        ),
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
  });

  constructor() {
    this.form.valueChanges.subscribe(
      () => this.validateGeneralization(),
    );

    this.validateGeneralization();
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.validateGeneralization();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    const isGeneralization =
      raw.type === 'GENERALIZATION';

    this.dialogRef.close({
      sourceClassId: raw.sourceClassId,
      targetClassId: raw.targetClassId,
      type: raw.type,
      sourceMultiplicity:
        isGeneralization
          ? null
          : this.parseMultiplicity(
              raw.sourceMultiplicity,
            ),
      targetMultiplicity:
        isGeneralization
          ? null
          : this.parseMultiplicity(
              raw.targetMultiplicity,
            ),
    });
  }

  private validateGeneralization(): void {
    const source =
      this.form.controls.sourceClassId.value;

    const target =
      this.form.controls.targetClassId.value;

    const isGeneralization =
      this.form.controls.type.value
        === 'GENERALIZATION';

    const currentErrors = {
      ...(
        this.form.controls
          .targetClassId.errors ?? {}
      ),
    };

    delete currentErrors['selfGeneralization'];

    if (
      isGeneralization
      && source
      && target
      && source === target
    ) {
      currentErrors['selfGeneralization'] =
        true;
    }

    this.form.controls.targetClassId
      .setErrors(
        Object.keys(currentErrors).length
          > 0
          ? currentErrors
          : null,
        {
          emitEvent: false,
        },
      );
  }

  private parseMultiplicity(
    option: MultiplicityOption,
  ): Multiplicity {
    switch (option) {
      case '0..1':
        return {
          lower: 0,
          upper: 1,
        };
      case '0..*':
        return {
          lower: 0,
          upper: null,
        };
      case '1..*':
        return {
          lower: 1,
          upper: null,
        };
      default:
        return {
          lower: 1,
          upper: 1,
        };
    }
  }

  private toOption(
    multiplicity:
      | Multiplicity
      | null
      | undefined,
    fallback: MultiplicityOption = '1',
  ): MultiplicityOption {
    if (!multiplicity) {
      return fallback;
    }

    if (
      multiplicity.lower === 0
      && multiplicity.upper === 1
    ) {
      return '0..1';
    }

    if (
      multiplicity.lower === 0
      && multiplicity.upper === null
    ) {
      return '0..*';
    }

    if (
      multiplicity.lower === 1
      && multiplicity.upper === null
    ) {
      return '1..*';
    }

    return '1';
  }
}
