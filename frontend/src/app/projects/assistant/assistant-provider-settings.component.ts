import { Component, effect, inject, input, output, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AssistantApiService } from './assistant-api.service';
import type { AssistantRuntimeHealthResponse } from './assistant-model';
interface Option {id:string; name:string; model:string; enabled:boolean; note:string}
@Component({
 selector:'app-assistant-provider-settings',
 template:`
 <section class="provider-settings" aria-label="Proveedor de inteligencia artificial">
  <header><label for="assistant-provider">Proveedor de texto y voz</label>
   <button type="button" [disabled]="checking() || !selected()" (click)="refresh()">{{ checking() ? 'Comprobando…' : 'Comprobar conexión' }}</button></header>
  <select id="assistant-provider" [value]="selected()" [disabled]="busy() || loading()" (change)="select($any($event.target).value)">
   @for (option of options(); track option.id) { <option [value]="option.id" [disabled]="!option.enabled">{{ option.name }}{{ option.enabled ? '' : ' · No habilitado' }}</option> }
  </select>
  @if (loading()) { <p role="status">Cargando proveedores habilitados…</p> }
  @for (option of options(); track option.id) { @if (option.id === selected()) {
   <p class="model">{{ option.model }}</p><p>{{ option.note }}</p>
  } }
  <p>La selección se conserva en este navegador para este proyecto. No cambia la configuración de otros usuarios. Las claves y direcciones se administran en el servidor; imágenes usa su proveedor propio.</p>
  @if (status(); as health) {
   <div class="availability"><span [class.available]="health.llama.available">Texto: {{ state(health.llama.state) }}</span><span [class.available]="health.whisper.available">Transcripción: {{ state(health.whisper.state) }}</span></div>
   <p>{{ health.llama.state === 'CONFIGURED' ? 'Bedrock está configurado; el acceso real al modelo aún no está comprobado.' : 'La conexión no garantiza que el modelo soporte las herramientas necesarias para proponer cambios.' }}</p>
   <small>Última comprobación: {{ checkedAt() }}</small>
  }
  @if (error()) { <p class="error" role="status">{{ error() }}</p><button type="button" [disabled]="busy()" (click)="loadAgain()">Recargar configuración</button> }
 </section>`,
 styles:`
  :host { display:block; }.provider-settings { padding:14px; background:#faf8fd; border-bottom:1px solid #e5ddef; }header { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:9px; }label { color:#4e3b70; font-size:11px; font-weight:600; }button { font:inherit; font-size:10px; color:#6944b5; border:1px solid #ded5e8; border-radius:6px; padding:7px 9px; background:white; cursor:pointer; }button:disabled { opacity:.6; cursor:not-allowed; }
  select { width:100%; box-sizing:border-box; border:1px solid #d9d1e7; border-radius:7px; padding:10px; font:inherit; font-size:12px; color:#4e3b70; background:white; }p { font-size:10px; line-height:1.8; color:#82778e; margin:8px 0; }.model { font-size:11px; color:#6944b5; overflow-wrap:anywhere; }.availability { display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }.availability span { border-radius:5px; padding:5px 7px; font-size:10px; background:#fceef2; color:#9c435c; }.availability span.available { background:#eee7f9; color:#6944b5; }small { font-size:9px; color:#82778e; }.error { color:#a72c40; }
 `,
})
export class AssistantProviderSettingsComponent {
 readonly projectId=input.required<string>(); readonly busy=input(false);
 readonly selectedChange=output<string>(); readonly healthChange=output<AssistantRuntimeHealthResponse|null>();
 private readonly api=inject(AssistantApiService);
 readonly options=signal<Option[]>([]); readonly selected=signal(''); readonly status=signal<AssistantRuntimeHealthResponse|null>(null);
 readonly loading=signal(true); readonly checking=signal(false); readonly error=signal(''); readonly checkedAt=signal('');
 private readonly reload=signal(0); private healthRequest?:Subscription;
 private readonly initialize=effect(onCleanup=>{
  const id=this.projectId(); this.reload(); this.healthRequest?.unsubscribe();
  this.options.set([]); this.selected.set(''); this.status.set(null); this.loading.set(true); this.error.set('');
  this.selectedChange.emit(''); this.healthChange.emit(null);
  const request=this.api.providers(id).subscribe({
   next:config=>{
    this.options.set(config.providers); this.loading.set(false);
    let remembered='';try{remembered=localStorage.getItem('orbita.assistant.provider.'+id)??'';}catch{}
    const valid=(value:string)=>config.providers.some(p=>p.id===value&&p.enabled);
    this.select(valid(remembered)?remembered:valid(config.defaultProvider)?config.defaultProvider:config.providers.find(p=>p.enabled)?.id??'');
   },
   error:()=>{this.loading.set(false);this.error.set('No se pudo cargar la configuración. Comprueba tu acceso al proyecto.');}
  });
  onCleanup(()=>{request.unsubscribe();this.healthRequest?.unsubscribe();});
 });
 loadAgain():void { this.reload.update(value=>value+1); }
 select(provider:string):void {
  if(!this.options().some(option=>option.id===provider&&option.enabled))return;
  this.selected.set(provider); this.selectedChange.emit(provider);
  try{localStorage.setItem('orbita.assistant.provider.'+this.projectId(),provider);}catch{}
  this.refresh();
 }
 refresh():void {
  if(!this.selected())return;
  this.healthRequest?.unsubscribe();this.checking.set(true);this.error.set('');this.status.set(null);this.healthChange.emit(null);
  const id=this.projectId(),provider=this.selected();
  this.healthRequest=this.api.providerHealth(id,provider).subscribe({
   next:health=>{if(id!==this.projectId()||provider!==this.selected())return;this.status.set(health);this.checkedAt.set(new Date(health.checkedAt).toLocaleTimeString());this.checking.set(false);this.healthChange.emit(health);},
   error:()=>{this.checking.set(false);this.error.set('No se pudo comprobar el estado. Revisa tu acceso y la conexión del servidor.');}
  });
 }
 state(value:string):string {
  return ({READY:'Disponible',CONFIGURED:'Configurado',LOADING:'Cargando',UNAVAILABLE:'No disponible',UNREACHABLE:'Sin conexión'} as Record<string,string>)[value]??'Sin confirmar';
 }
}
