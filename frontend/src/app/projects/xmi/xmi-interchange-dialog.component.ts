import { useService,signal,DIALOG_DATA,DIALOG_HANDLE } from '../../core/view-state';
import { HttpErrorResponse,HttpResponse } from '../../core/api/http-client';
import { DialogHandle } from '../../core/dialogs';
import { finalize } from 'rxjs';

import {
XmiImportPreview,
XmiInterchangeApiService,
} from './xmi-interchange-api.service';

export interface XmiInterchangeDialogData {
  projectId: string;
  projectName: string;
}

export class XmiInterchangeDialogComponent {
  readonly data = useService<XmiInterchangeDialogData>(DIALOG_DATA);
  readonly dialogRef = useService<DialogHandle<XmiInterchangeDialogComponent>>(DIALOG_HANDLE);
  private readonly api = useService(XmiInterchangeApiService);

  readonly selectedFile = signal<File | null>(null);
  readonly preview = signal<XmiImportPreview | null>(null);
  readonly previewing = signal(false);
  readonly applying = signal(false);
  readonly exporting = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal(false);
  readonly busy = () => this.previewing() || this.applying() || this.exporting();

  fileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.preview.set(null);
    this.message.set(null);
    this.error.set(false);
  }

  previewImport(): void {
    const file = this.selectedFile();
    if (!file || this.busy()) {
      return;
    }
    this.previewing.set(true);
    this.preview.set(null);
    this.message.set(null);
    this.error.set(false);
    this.api.previewImport(this.data.projectId, file)
      .pipe(finalize(() => this.previewing.set(false)))
      .subscribe({
        next: (preview) => this.preview.set(preview),
        error: (failure: HttpErrorResponse) => this.fail(failure, 'No pudimos analizar el XMI.'),
      });
  }

  applyImport(): void {
    const preview = this.preview();
    if (!preview || this.busy()) {
      return;
    }
    this.applying.set(true);
    this.message.set(null);
    this.error.set(false);
    this.api.applyImport(this.data.projectId, preview.previewToken)
      .pipe(finalize(() => this.applying.set(false)))
      .subscribe({
        next: () => this.dialogRef.close({ applied: true }),
        error: (failure: HttpErrorResponse) => this.fail(
          failure,
          failure.status === 409
            ? 'El proyecto cambio desde el preview. Analiza el XMI nuevamente.'
            : 'No pudimos aplicar el XMI.',
        ),
      });
  }

  exportXmi(): void {
    if (this.busy()) {
      return;
    }
    this.exporting.set(true);
    this.message.set(null);
    this.error.set(false);
    this.api.export(this.data.projectId)
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (response) => {
          this.download(response);
          this.message.set('XMI 2.1 generado correctamente.');
        },
        error: (failure: HttpErrorResponse) => this.fail(failure, 'No pudimos exportar el XMI.'),
      });
  }

  private download(response: HttpResponse<Blob>): void {
    const body = response.body;
    if (!body) {
      throw new Error('Empty XMI response');
    }
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename\*?=(?:UTF-8''|\")?([^\";]+)/i.exec(disposition);
    const filename = match ? decodeURIComponent(match[1].replace(/\"/g, '').trim()) : 'classforge-enterprise-architect.xmi';
    const url = URL.createObjectURL(body);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private fail(failure: HttpErrorResponse, fallback: string): void {
    const serverMessage = typeof failure.error === 'object' && failure.error?.message
      ? String(failure.error.message)
      : null;
    this.error.set(true);
    this.message.set(serverMessage ?? fallback);
  }
}
