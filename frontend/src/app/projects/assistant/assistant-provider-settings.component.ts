import { effect,useService,signal,viewProp,viewEvent } from '../../core/view-state';
import { Subscription } from 'rxjs';
import { AssistantApiService } from './assistant-api.service';
import type { AssistantRuntimeHealthResponse } from './assistant-model';
interface Option {id:string; name:string; model:string; enabled:boolean; note:string}

export class AssistantProviderSettingsComponent {
 readonly projectId=viewProp<string>('projectId'); readonly busy=viewProp('busy', false);
 readonly selectedChange=viewEvent<string>('selectedChange'); readonly healthChange=viewEvent<AssistantRuntimeHealthResponse|null>('healthChange');
 private readonly api=useService(AssistantApiService);
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
