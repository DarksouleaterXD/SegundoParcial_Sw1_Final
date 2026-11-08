import { useService,DIALOG_DATA,DIALOG_HANDLE } from '../../../core/view-state';
import { DialogHandle } from '../../../core/dialogs';
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  icon?: string;
}

export class ConfirmDialogComponent {
  readonly data = useService<ConfirmDialogData>(DIALOG_DATA);
  readonly dialogRef = useService<DialogHandle<ConfirmDialogComponent, boolean>>(DIALOG_HANDLE);
}
