# Runtime local del Asistente UML — CU08 cerrado

ClassForge no embebe los modelos dentro de Spring. Usa dos procesos locales persistentes.

## llama.cpp

Puerto esperado:

```text
127.0.0.1:8092
```

Runtime oficial del Assistant desde `C2-cu08-fix-014`:

```powershell
llama-server.exe `
  -hf bartowski/Qwen2.5-3B-Instruct-GGUF:Q4_K_M `
  --device Vulkan0 `
  --parallel 1 `
  --host 127.0.0.1 `
  --port 8092 `
  --alias local-model `
  -c 4096 `
  --jinja
```

El modelo 3B Q4_K_M fue elegido porque entra cómodamente en la GTX 1660 SUPER de referencia y sostuvo ~50-56 tokens/s durante las pruebas, mientras Qwen 7B hacía spill de VRAM. `--jinja` es obligatorio para el contrato native tools.

ClassForge verifica `/props` y exige `supports_tools=true` y `supports_tool_calls=true`.

Health oficial:

```text
GET http://127.0.0.1:8092/health
```

## whisper.cpp

Puerto esperado:

```text
127.0.0.1:8093
```

Ejemplo:

```powershell
whisper-server.exe `
  -m "F:\whisper\models\ggml-base.bin" `
  -l es `
  --host 127.0.0.1 `
  --port 8093 `
  -t 6 `
  -nfa `
  -nt
```

`-nfa` evita la ruta Flash Attention problemática observada durante las pruebas en GTX 1660 SUPER. `-nt` evita trabajo de timestamps que ClassForge no consume.

Health oficial:

```text
GET http://127.0.0.1:8093/health
```

## Pre-demo

Antes de abrir el caso de uso:

1. iniciar llama-server;
2. iniciar whisper-server;
3. iniciar Spring;
4. iniciar Astro;
5. abrir un proyecto;
6. comprobar que el panel muestra ambos runtimes en estado listo.

Texto requiere llama.cpp.

Voz requiere whisper.cpp y un proveedor de texto disponible.

## Modelo en la nube para consultas y propuestas

### Google Gemini

Crea una clave de API en [Google AI Studio](https://aistudio.google.com/apikey).
Para usarla en local, detén Spring Boot y ejecuta desde `backend`:

```powershell
$geminiSecret = Read-Host 'Clave de Google AI Studio' -AsSecureString
$env:GEMINI_API_KEY = [System.Net.NetworkCredential]::new('', $geminiSecret).Password
.\gradlew.bat bootRun '--args=--spring.datasource.url=jdbc:h2:file:./data/cierre-casos'
```

El modelo predeterminado es `gemini-3.5-flash`. Puedes cambiarlo con
`CLASSFORGE_GEMINI_MODEL`. Selecciona **Google Gemini** en **Texto y voz**.
Con ese proveedor, las consultas y propuestas envían el texto y el contexto pertinente
del proyecto a la API de Google. Whisper sigue transcribiendo el audio localmente.

### Amazon Bedrock

Puedes habilitar Amazon Bedrock en el arranque local de Spring Boot. El selector de
**Texto y voz** permite elegir el proveedor por proyecto. Whisper transcribe la grabación
en el equipo y el proveedor elegido recibe la transcripción y el contexto UML necesarios
para elaborar la propuesta.

Con credenciales AWS disponibles para el SDK y permiso de invocar el modelo, inicia
Spring Boot desde `backend` con las siguientes variables en esa consola. Usa este arranque
con la base de demostración `cierre-casos`.

```powershell
$env:AWS_REGION = 'us-east-1'
$env:CLASSFORGE_ASSISTANT_TEXT_PROVIDER = 'llama-cpp'
$env:CLASSFORGE_BEDROCK_ENABLED = 'true'
$env:CLASSFORGE_BEDROCK_TEXT_MODEL = 'us.amazon.nova-2-lite-v1:0'
.\gradlew.bat bootRun '--args=--spring.datasource.url=jdbc:h2:file:./data/cierre-casos'
```

En **Texto y voz**, selecciona **Amazon Bedrock** y envía una consulta de prueba.
El estado **Configurado** indica que se habilitó el proveedor. Una respuesta real
confirma que las credenciales y los permisos del modelo funcionan.

## Diagnóstico de puertos

El indicador verde ya no depende únicamente de `/health`. ClassForge verifica además la identidad del proceso esperado. Si otro proceso ocupa 8092, 8093 o 8094 y responde un health genérico, el panel mostrará `MISMATCH` en lugar de READY.

En Windows, si aparece `MISMATCH`, conviene comprobar qué proceso escucha el puerto antes de iniciar los runtimes locales:

```powershell
Get-NetTCPConnection -LocalPort 8092,8093,8094 -State Listen |
  Select-Object LocalPort, OwningProcess
```

Después puede inspeccionarse el proceso con `Get-Process -Id <PID>`.

## Runtime visual CU-09 — configuración vigente

CU-09 está CERRADO. El runtime multimodal seleccionado es independiente del planner textual y de whisper.cpp:

```text
8092 -> Qwen2.5-3B-Instruct Q4_K_M / native tools
8093 -> whisper.cpp
8094 -> Qwen3-VL-4B-Instruct Q4_K_M / Vision
```

Arranque recomendado del runtime visual:

```powershell
llama-server.exe `
  -hf Qwen/Qwen3-VL-4B-Instruct-GGUF:Q4_K_M `
  --device Vulkan0 `
  --parallel 1 `
  --host 127.0.0.1 `
  --port 8094 `
  --alias vision-model `
  -c 6144 `
  --fit on `
  --fit-target 768
```

Variables principales:

```text
CLASSFORGE_ASSISTANT_VISION_PROVIDER=llama-cpp
CLASSFORGE_ASSISTANT_VISION_URL=http://127.0.0.1:8094
CLASSFORGE_ASSISTANT_VISION_MODEL=vision-model
CLASSFORGE_ASSISTANT_VISION_TIMEOUT_SECONDS=180
CLASSFORGE_ASSISTANT_VISION_MAX_TOKENS=3200

CLASSFORGE_ASSISTANT_VISION_HYBRID=true
CLASSFORGE_ASSISTANT_VISION_HYBRID_MIN_CLASSES=4
CLASSFORGE_ASSISTANT_VISION_HYBRID_FALLBACK=false
CLASSFORGE_ASSISTANT_VISION_HYBRID_LOCALIZATION_TOKENS=1200
CLASSFORGE_ASSISTANT_VISION_HYBRID_RELATIONSHIP_TOKENS=512
CLASSFORGE_ASSISTANT_VISION_HYBRID_MULTIPLICITY_TOKENS=128
```

`CLASSFORGE_ASSISTANT_VISION_HYBRID=false` fuerza semantic-only como kill switch. `CLASSFORGE_ASSISTANT_VISION_HYBRID_FALLBACK=true` reactiva temporalmente el fallback semántico para rollback/debug; no es el default de producto.

### Health

`GET /api/projects/{projectId}/assistant/health` marca Vision READY sólo si:

1. `/health` responde correctamente;
2. `/v1/models` publica el alias configurado;
3. `/props` publica `modalities.vision=true`.

Smoke de transporte multimodal:

```powershell
pwsh -NoProfile -File .\scripts\assistant-vision-smoke.ps1
```

### Benchmark focal

Con el runtime levantado:

```powershell
pwsh -NoProfile -File .\scripts\assistant-vision-whiteboard.ps1 `
  -VisionMode hybrid-cv `
  -ImageStrategy original `
  -Attempts 3 `
  -ModelLabel "Qwen3-VL-4B Q4_K_M" `
  -TimeoutSeconds 180 `
  -MaxCompletionTokens 3200 `
  -HybridLocalizationTokens 1200 `
  -HybridRelationshipTokens 512 `
  -HybridMultiplicityTokens 128 `
  -VerboseAttempts
```

La evidencia final registrada para `library-whiteboard-realistic` fue 3/3 Exact, con 100 % en transporte, schema, grounding, clases, atributos, relaciones, multiplicidades, semantic exact y safety.

### Diagnostics de benchmark

Producción no retiene diagnostics pesados. Los modos de benchmark pueden escribir, según etapa:

```text
class-regions.json
class-regions-threshold.png
class-regions.png
mapping.json
geometry.json
threshold.png
segments.png
overlay.png
relationship-sheet.png
relationship-*.png
multiplicity-*-transcription-conditioned.png
multiplicity-*-current-support-mask.png
multiplicity-*-competitor-*-mask.png
multiplicity-*-final-suppression-mask.png
multiplicity-*-mask-debug-overlay.png
multiplicity-*-attribution.png
multiplicity-observations.json
```

### Acceptance automatizada

El agregador disponible es:

```powershell
pwsh -NoProfile -File .\scripts\assistant-vision-acceptance.ps1 `
  -Attempts 2 `
  -VisionModel "vision-model" `
  -ModelLabel "Qwen3-VL-4B Q4_K_M" `
  -VerboseAttempts
```

Este script sigue siendo la forma recomendada de producir una corrida agregada regression/holdout/hardening/E2E/CU-08. La decisión de cierre funcional del 5 de septiembre de 2026 se tomó con la evidencia consolidada en `docs/evidence/cu09/cu09-acceptance.json`; una corrida archivada post-Cal-017 de este agregador quedó explícitamente diferida y no debe presentarse como ejecutada.

### Nota histórica

Los experimentos `two-pass`, `board-crop`, `tiles` y la primera versión VLM->bbox se conservan como evidencia de calibración. No forman parte del routing productivo seleccionado. La arquitectura vigente está documentada en `docs/architecture/vision-input-pipeline.md`.
