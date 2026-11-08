# Validación pendiente: colaboración e IA contextual

Este documento prepara la sección de pruebas integral solicitada. No implica que todos los casos siguientes hayan sido ejecutados.

Lista consolidada de implementación faltante, validación y producción: [PENDIENTES.md](PENDIENTES.md).

La trazabilidad corregida de los nueve casos originales, incluido seguimiento móvil y NoSQL, está en [cierre-casos-uso-audio.md](cierre-casos-uso-audio.md).

## Implementación disponible

- CU01: conversación compartida guardada en la base del servidor y paginada.
- CU05: actividad de operaciones confirmadas, autor, fecha, elemento y revisión.
- CU06: resumen por período e integrante calculado desde los registros confirmados, con conteos por acción y autor. No requiere IA. Fechas en UTC en la API e interfaz en zona horaria del navegador; inicio inclusivo y fin exclusivo. Máximo 90 días por consulta. Los lotes cuentan como una operación y el resultado se actualiza al solicitarlo.
- CU07: chat, actividad y memoria privada de consultas en la base; la recuperación integral se valida en la fase de pruebas.
- CU02: consultas de solo lectura sobre el modelo guardado. Inclusión voluntaria de mensajes recientes del equipo.
- La propuesta y aplicación de cambios existente sigue en un modo separado.
- CU03: comparación entre modelo actual y propuesta, calculada sobre una copia con el ejecutor del editor. Se muestran altas, modificaciones y bajas, incluidas las bajas en cascada. Las eliminaciones requieren reconocimiento explícito y las revisiones obsoletas bloquean la aplicación.

## Contrato CU02

POST /api/projects/{projectId}/assistant/ask, con Bearer Token.

Entrada: text (1–1000 caracteres, no vacío) e includeTeamChat (false por defecto).

Respuesta: answer, baseRevision, modelChanged, teamChatIncluded, teamMessageIds, previousExchanges y memorySaved.

El servidor obtiene el contexto, comprueba acceso antes y después de la llamada al proveedor y no expone herramientas de mutación. Incluye el modelo UML completo; rechaza contextos superiores a 100000 caracteres. El chat opcional contiene como máximo los últimos 20 mensajes, recortados a 600 caracteres cada uno. No incluye correos, tokens ni conversaciones de otros proyectos. Los autores del chat sí forman parte del contexto cuando el usuario lo selecciona.

Consultar guarda las preguntas/respuestas exitosas en un historial privado por usuario y proyecto. No las publica en el chat del equipo ni modifica el modelo. Incorpora hasta 10 intercambios anteriores como memoria, con respuestas recortadas a 2000 caracteres y la revisión de origen. La voz sigue disponible en Proponer cambios.

GET /api/projects/{projectId}/assistant/history devuelve hasta 30 intercambios en orden descendente y hasMore; before permite cargar entradas anteriores. DELETE en la misma ruta borra únicamente el historial del usuario autenticado. Se revalida acceso antes de persistir y una generación de conversación impide que una respuesta en curso restaure el historial borrado. Los errores y las propuestas de cambios no se persisten como consultas. La memoria no incluye historiales de otros integrantes/proyectos. No equivale a un historial completo enviado al proveedor.

Verificación de memoria: dos pruebas de integración con gateway simulado pasaron, incluyendo aislamiento entre integrantes, 32 entradas y paginación, contexto limitado a 10, acceso 401/404, revocación, errores sin persistencia y borrado durante inferencia. Pendiente: inferencia real, PostgreSQL, simultaneidad extensa y reinicio de servidor con historial real.

## Sección de pruebas integral a ejecutar

1. Acceso sin sesión, de propietario, editor, ajeno y usuario cuya membresía se revoca durante una consulta.
2. Preguntas sobre clases, atributos, multiplicidades, relaciones y clases de asociación; comprobar citas de nombres reales y ausencia de elementos inventados.
3. Incluir/excluir chat: inspeccionar la petición al proveedor y verificar IDs, autores, orden, límites y aislamiento entre proyectos.
4. Mensajes que contienen instrucciones maliciosas: verificar que la respuesta los trata como datos y que ninguna petición puede modificar el modelo.
5. Actualizar el modelo mientras se genera una respuesta: comprobar aviso de revisión desactualizada y que no se ofrece Aplicar en Consultar.
6. Proveedor caído, timeout, respuesta vacía/inválida, pregunta vacía/extensa y contexto demasiado grande. Confirmar que la pregunta se conserva tras errores.
7. Comprobar llama.cpp y Amazon Bedrock con modelos realmente configurados; disponibilidad de la API no garantiza disponibilidad de IA.
8. Regresión de Proponer cambios: texto, voz, vista previa, descartar, revisión obsoleta, aplicar, deshacer y actividad persistida.
9. Dos sesiones para chat/actividad, paginación, revocación, recarga y reinicio con almacenamiento persistente.
10. Diseño en móvil/escritorio, teclado, cierre/reapertura del panel y claridad de sus límites de memoria.

## Verificación ya realizada en la etapa anterior

- Nueve pruebas de integración de proyectos, colaboración y diario sin fallos.
- Intercambio de mensajes con dos usuarios invitados y actividad al crear una clase.
- Persistencia de chat/actividad tras reiniciar el backend de prueba.
- Build del frontend y comprobación visual del panel en escritorio y móvil.

Las pruebas de calidad de respuestas con proveedores reales y la regresión integral quedan para la sección de pruebas posterior.

## Pendientes específicos de CU03

- Solicitar por texto y voz altas, renombrados, cambios de tipo/visibilidad/multiplicidad y eliminaciones.
- Comparar la vista previa con el modelo persistido después de aplicar; comprobar clases de asociación y cascadas.
- Confirmar que previsualizar y descartar no cambian el documento ni generan actividad.
- Verificar que una eliminación no se aplica sin marcar su reconocimiento y que una nueva propuesta reinicia esa confirmación.
- Cambiar el modelo desde otro navegador antes de aplicar: la propuesta anterior debe bloquearse.
- Verificar cambios sin efecto, fallos al construir la vista previa y rechazos del servidor.
- Comprobar que el historial refleja únicamente las operaciones confirmadas y que deshacer restaura los elementos.

## CU04: métodos UML

Implementación: métodos de clases y clases de asociación, nombre, visibilidad, retorno y parámetros ordenados. Se admiten hasta 50 métodos por clase y 20 parámetros por método. Tipos simples, nombres y arreglos; sin genéricos ni cuerpos de implementación. Se permiten sobrecargas con tipos de parámetros distintos. Se guardan en el documento y se sincronizan con SET_METHODS bajo control de revisión, con deshacer/rehacer. Los documentos anteriores sin métodos se interpretan como listas vacías.

XMI incluye ownedOperation y ownedParameter; se admiten parámetros de entrada y un retorno. Direcciones out/inout se rechazan explícitamente. Las firmas largas se abrevian en el lienzo y se muestran completas en las propiedades. La generación CRUD no implementa la lógica de los métodos.

Proponer cambios incorpora upsert_method/delete_method para clases normales. El servidor conserva los otros métodos y el ID del método actualizado. Se requiere el nombre explícito y, ante sobrecargas, la firma exacta nombre(tipo1,tipo2). La propuesta se convierte a SET_METHODS y pasa por validación, comparación y aprobación de bajas. No genera cuerpos de negocio. Las clases de asociación mantienen edición manual. Dos pruebas nuevas y 22 pruebas de regresión de herramientas/enrutamiento pasaron; no se ejecutó un proveedor real.

Pendientes para la sección de pruebas integral:

- Crear, editar y eliminar métodos de clases normales y de asociación; recargar y reiniciar.
- Validar nombres, IDs, límites, parámetros repetidos, tipos, void y firmas duplicadas; comprobar sobrecargas.
- Editar nombres/atributos/clases y confirmar que sus métodos se conservan.
- Sincronizar dos usuarios; probar revisiones obsoletas, pérdida de conexión, deshacer/rehacer y actividad.
- Eliminar/restaurar clases y relaciones con clases de asociación que tengan métodos.
- Exportar/importar XMI con métodos y comparar firma, retorno, visibilidad y orden de parámetros. Probar un archivo real de Enterprise Architect.
- Confirmar que Consultar recibe los métodos y que la revisión de propuestas muestra sus eliminaciones en cascada.
- Verificar que el ZIP CRUD sigue compilando y no promete implementar los cuerpos de los métodos.

Comprobación básica realizada en CU04: frontend/backend y pruebas existentes compilan (sin ejecutar la batería completa). En navegador se comprobó guardar un método con dos parámetros, deshacer/rehacer, conservarlo al editar atributos y recargar, y exportar/importar su firma mediante XMI. Se corrigió el alcance del estado del proyecto al abrir el diálogo. La validación integral de los demás casos de esta lista sigue pendiente.

## CU06: resúmenes de actividad

GET /api/projects/{projectId}/journal/summary admite from/to (Instant ISO 8601) y actorId opcionales. Por defecto consulta los últimos siete días. Devuelve período, fecha de cálculo, total, acciones y colaboradores del período. Requiere acceso al proyecto. Los conteos se obtienen mediante agregación en la base con una transacción de lectura repetible y no dependen de las páginas de historial cargadas. Contributors muestra los autores de todo el período para permitir cambiar el filtro; total/actions corresponden al autor seleccionado.

Pendientes de validación integral: más de 50/1000 entradas, cargas simultáneas, UTC y límites de día, ventanas de 90 días y límites exactos, revocación de membresía, miembros con nombres iguales o renombrados, acciones en lote, rechazo de operaciones, deshacer/rehacer, permisos y copia del resumen. Confirmar en PostgreSQL además de H2. No interpretar los conteos como productividad ni reconstruir operaciones anteriores al registro del historial.

Comprobación básica realizada en CU06: compilación de backend/frontend y de las pruebas existentes. En una base H2 persistente, tres operaciones conocidas de dos integrantes produjeron los conteos esperados; un mensaje del chat no incrementó el total. Se comprobó filtro por integrante, período vacío y respuestas 401/400/404, además de la interfaz móvil sin desbordamiento. No se ejecutó la batería integral.

## CU08: selección y disponibilidad de proveedores

El panel Texto y voz permite elegir entre llama.cpp y Bedrock cuando el servidor los habilita. La preferencia es local al navegador y proyecto; cada petición de consulta, propuesta o voz envía el proveedor seleccionado. No modifica la configuración de otros usuarios. Las solicitudes antiguas sin selección siguen utilizando el proveedor predeterminado del servidor.

Las URLs, modelos y credenciales se administran mediante las variables de configuración del backend. No se admiten URLs ni secretos enviados desde el frontend. Bedrock requiere CLASSFORGE_BEDROCK_ENABLED=true y credenciales/acceso a modelos válidos en el servidor. El endpoint providers requiere acceso al proyecto y devuelve nombres/modelos habilitados, sin claves ni URLs internas.

Consultar y proponer cambios usan el proveedor de texto seleccionado. En voz, Whisper realiza la transcripción y después el proveedor seleccionado interpreta la instrucción. Imágenes conserva su configuración de proveedor propia en el servidor. La conexión local no garantiza soporte de herramientas y el estado CONFIGURED de Bedrock no confirma credenciales ni acceso real al modelo. La comprobación de estado no genera contenido ni consume inferencias de texto.

Pendientes integrales: enrutar consultas, herramientas y voz con ambos proveedores reales; comprobar credenciales incorrectas, modelos sin herramientas, transcripción no disponible, timeouts, cambios de selección, múltiples usuarios/proyectos y restauración de la preferencia. Verificar Bedrock habilitado/deshabilitado, configuración por defecto inválida y regresión con clientes que omiten provider. Confirmar que las propuestas anteriores se descartan al cambiar de proveedor y que ninguna respuesta antigua sobrescribe el estado de una selección nueva.

Comprobación básica de CU08: compilan backend, frontend y pruebas existentes. Se comprobó acceso a configuración (401/404), rechazo de Bedrock deshabilitado en ask/plan, proveedor desconocido en health, recuperación de una preferencia local inválida y presentación móvil sin desbordamiento. Una respuesta de error simulada en navegador permitió verificar el envío de provider y conservación de la pregunta. No se invocaron modelos reales ni se verificaron credenciales de Bedrock. La voz valida el proveedor antes de transcribir.

## CU09: conservación y documentación del modelo exportado

La descarga del editor incorpora docs/source-model.json (documento original y revisión), docs/generation-model.json (modelo empleado para generar, incluido fallback de identificadores autorizado) y docs/uml-operations.json (firmas documentales y implemented=false). No incluye conversaciones del equipo, credenciales ni datos de negocio. Los métodos no se convierten en lógica ni endpoints propios.

El proyecto incluye Dockerfile, .dockerignore y GUIA-EJECUCION.md con pasos locales, Postman, PostgreSQL, Docker y Railway. Las nuevas exportaciones cambian el perfil postgres de create-drop a update; la base H2 de demostración no cambia. Quedan pendientes migraciones, construcción/ejecución real de imágenes y validación de persistencia con PostgreSQL.

La revisión de artefactos ZIP no sustituye las pruebas de compilación, ejecución y endpoints de las variantes CRUD simple y Auth, ni las de clientes Angular y Android.

Comprobación básica de esta entrega: backend, frontend y pruebas existentes compilan. Se descargaron ZIP CRUD simple y Auth con un modelo de dos clases y dos métodos. Se comprobaron modelo de origen, modelo de generación, catálogo de métodos, guía, Dockerfile, contratos API y perfil PostgreSQL con update. Dos exportaciones de la misma revisión/configuración produjeron bytes idénticos. No se ejecutaron las aplicaciones descargadas ni se construyeron sus imágenes Docker.

Actualización de cierre: después se extrajeron esos dos ZIP en generated/acceptance-20261104, se compilaron con bootJar/Java 21 y se iniciaron en 8095/8096. Pasaron 24 comprobaciones HTTP reales del CRUD de Producto y la variante Auth (bootstrap/login, acceso protegido y respuesta de usuarios sin claves/hashes). Evidencia: [generated-backend-runtime.json](evidence/cierre-audio/generated-backend-runtime.json). Guion: [demo-backend-generado.md](runtime/demo-backend-generado.md). La base fue H2 en memoria; no se verificó PostgreSQL/NoSQL, Docker, relaciones, claves compuestas ni clientes generados.

## Comprobación básica de esta entrega (CU02)

- Backend y frontend compilan; las pruebas existentes también compilan, sin ejecutar la batería completa.
- El endpoint rechaza solicitudes sin sesión (401), texto vacío (400) y proyectos no accesibles (404).
- El selector Consultar/Proponer cambios funciona y la inclusión del chat está desactivada inicialmente.
- Vista del panel comprobada en escritorio y móvil, sin desbordamiento horizontal.
- No se invocó un modelo real durante estas comprobaciones: calidad, exactitud y resistencia a instrucciones dentro del chat siguen pendientes.
