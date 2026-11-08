# Pendientes consolidados de Órbita / ClassForge

Actualizado el 7 de noviembre de 2026. Cada bloque tiene un criterio de cierre y una evidencia que se puede guardar.

La numeración siguiente identifica entregas posteriores. Los nueve casos originales y su estado están en [cierre-casos-uso-audio.md](cierre-casos-uso-audio.md).

## Estado por caso de uso

| Caso | Implementación disponible | Pendiente para cierre |
| --- | --- | --- |
| CU01 | Chat compartido persistente y paginado. | Concurrencia, reconexión, historial extenso y revocación de acceso. |
| CU02 | Consultas privadas y compartidas. Las compartidas incluyen chat, actividad, memoria del equipo y publicación del intercambio. | Calidad con proveedores reales y resistencia a instrucciones dentro del contexto. |
| CU03 | Comparación antes/después, cascadas y confirmación de bajas. | Texto/voz reales, revisiones obsoletas, aplicación y rechazo del servidor. |
| CU04 | Métodos documentales, guardado, deshacer/rehacer, XMI y propuestas de IA para métodos de clases normales. | Proveedores reales, casos límite, métodos de clases de asociación mediante IA y archivos reales de Enterprise Architect. |
| CU05 | Actividad con autor, fecha, acción, elemento y revisión. | Cobertura de todos los caminos, lotes y operaciones rechazadas. No reconstruye actividad antigua. |
| CU06 | Resúmenes por período e integrante desde la base. | Carga, concurrencia, límites temporales y PostgreSQL. |
| CU07 | Modelo, chat, actividad y consultas privadas y compartidas almacenados en el servidor. | Recuperar la sesión completa tras reiniciar y verificar PostgreSQL. |
| CU08 | Selector local de texto/voz y comprobación de estado. | Ambos proveedores reales, credenciales, herramientas, transcripción y fallos de red. Visión conserva su configuración propia. |
| CU09 | CRUD/Auth, contratos, clientes, catálogo UML, modelo de origen, Dockerfile y guía. Dos ZIP compilados/ejecutados con 24 comprobaciones HTTP. | Relaciones, claves compuestas, clientes, despliegue y persistencia real. No implementa lógica de métodos UML. |

## Pendientes de implementación y demostración

- **NoSQL:** pendiente de presentación por decisión del usuario. La plataforma conserva su almacenamiento SQL.
- **Seguimiento móvil de la plataforma:** comprobado con dos cuentas en Edge y pantalla móvil emulada a 390 y 320 px. La segunda sesión recibió una clase creada en escritorio, el mensaje del equipo y la actividad. Falta la demostración en un teléfono físico.
- **Lógica de métodos UML y endpoints personalizados (opcional):** la aclaración posterior del usuario fija el avance en la generación Spring Boot CRUD/Auth existente. No hacen falta reglas de negocio para ese cierre; generar cuerpos para métodos arbitrarios sería una ampliación.
- **Métodos de clases de asociación mediante IA:** la edición manual existe; las herramientas nuevas de IA se limitan a las clases normales.
- **Selector de visión en la interfaz:** imágenes usa el proveedor configurado en el servidor. La elección de texto/voz no lo cambia.

La lógica de negocio personalizada, los métodos de clases de asociación mediante IA y el selector de visión son ampliaciones opcionales.

## Entrega de cierre: memoria y herramientas de métodos

- Historial privado por usuario/proyecto: recuperación de 30 intercambios por página y borrado con confirmación. Solo se guardan consultas respondidas correctamente, no errores ni propuestas de cambio. La IA recibe hasta 10 intercambios anteriores, con respuestas recortadas a 2000 caracteres y sus revisiones; el modelo actual sigue siendo la fuente de verdad.
- Se revalida el acceso al guardar. Borrar el historial invalida el guardado de respuestas que ya estaban en curso. No se envía ni se muestra el historial de otros miembros.
- Herramientas upsert_method/delete_method para clases normales: conservan otros métodos; las actualizaciones mantienen el ID; las sobrecargas requieren la firma exacta. Se usa la revisión y aprobación existente, con deshacer/rehacer.
- Verificación local: dos pruebas de integración de memoria y 24 pruebas de herramientas/enrutamiento pasaron; backend y frontend compilan. Estas pruebas usan un proveedor simulado. La inferencia real, la revisión visual y la recuperación después de reiniciar siguen en la sección integral.

## Orden de cierre

### 1. Preparar la sesión de prueba

- [x] Iniciar la API en 8082 con JDK 21 y la base H2 de archivo `./data/cierre-casos`. Para repetir, entrar en `backend` y ejecutar `.\gradlew.bat bootRun --args="--spring.datasource.url=jdbc:h2:file:./data/cierre-casos"`.
- [x] Iniciar el frontend en 4200 con el proxy a la API y WebSocket de 8082. Para repetir, entrar en `frontend`, instalar dependencias con `npm ci` si faltan y ejecutar `npm start`.
- [x] Comprobar salud de la API a través del proxy, acceso a la página de login y autenticación de Fernando y Ana. Crear el proyecto **Cierre de casos de uso**, aceptar la invitación y verificar los roles de propietario y editor.

**Evidencia inicial:** revisión 1 visible para ambas cuentas, clase Pedido, un mensaje y dos eventos de actividad. La prueba interactiva con dos perfiles de navegador sigue en el paso 2. [Proyecto local](http://127.0.0.1:4200/projects/9f7e3ead-aa3e-4b85-940d-dfdeb48cc215).

### 2. Colaboración, permisos y actividad

- [ ] Fernando crea `Pedido` y Ana añade un atributo. Confirmar que ambas sesiones muestran el mismo diagrama y la misma revisión. Cada cuenta envía un mensaje y la otra lo lee. Recargar y comprobar que el chat vuelve a aparecer.
- [ ] Desconectar temporalmente una sesión y reconectarla. Comprobar que recupera la revisión actual. Ejecutar las pruebas existentes de revisiones obsoletas y comandos inválidos, y confirmar que sus operaciones rechazadas no generan actividad.
- [ ] Cargar páginas anteriores de un historial extenso y comprobar que las entradas mantienen su orden y aparecen una sola vez.
- [ ] Abrir **Actividad** y comprobar autor, acción y revisión. En **Resumen**, elegir un período y filtrar por integrante. Comparar el conteo con las operaciones confirmadas, probar un período sin actividad y verificar los límites de fecha.
- [ ] Abrir el proyecto con una tercera cuenta sin invitación. Revocar después el acceso de Ana en el proyecto de prueba y comprobar que pierde acceso a edición, chat e historial compartido. Restaurar su participación para las etapas siguientes.

**Cierre:** captura de las dos sesiones con la misma revisión, resumen filtrado y evidencia de acceso denegado. Ya pasaron comprobaciones de revisiones, permisos WebSocket e historial. Quedan estos escenarios combinados con el navegador.

### 3. Recuperación completa en SQL

- [ ] Con la base H2 de archivo del paso 1, anotar revisión, clases, mensajes y una operación de actividad. Reiniciar el backend con el mismo comando y volver a abrir el proyecto desde ambas cuentas.
- [ ] Cuando el paso 4 esté disponible, guardar una consulta privada y una compartida. Repetir el reinicio y comprobar que cada historial conserva su contenido y sus permisos. Guardar capturas antes y después con la misma revisión.
- [ ] Repetir con PostgreSQL en una base de prueba. Configurar las variables `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_DRIVER_CLASS_NAME`, `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD` según **Guía y despliegue**. Probar una copia y restauración en otra base, y comparar el contenido desde la plataforma.

**Cierre:** la sesión completa sobrevive al reinicio y se recupera desde la copia restaurada. El chat y la actividad ya se comprobaron con persistencia local. Falta la evidencia conjunta de los historiales de IA y PostgreSQL.

### 4. Proveedor de IA real

- [ ] Iniciar llama.cpp con un modelo que soporte herramientas y seleccionar el proveedor en **Texto y voz**. Si la demostración usa Bedrock, habilitarlo y configurar sus credenciales y modelos en el servidor. Comprobar el estado y enviar una consulta real. [Configuración de los servicios locales](runtime/assistant-local.md).
- [x] Ana envió una consulta compartida con llama.cpp real. La respuesta atribuyó a Fernando la adición de un atributo en la revisión 2, en concordancia con Actividad. Se comprobó que la misma respuesta aparece en el historial de Fernando.
- [ ] Realizar una pregunta de seguimiento desde la segunda cuenta. Hacer una consulta privada de control con el proveedor real y verificar su aislamiento.
- [ ] Pedir por texto un cambio con nombre, tipo y parámetros concretos. Revisar la propuesta y la comparación, aplicar un cambio y descartar otro. Con una propuesta abierta, modificar el diagrama desde la otra cuenta y comprobar el bloqueo por revisión obsoleta.
- [ ] Completar el caso original de propuestas basadas en acuerdos del equipo. Permitir que se incluya contexto compartido con una selección explícita y comprobar que el asistente prepara una propuesta revisable a partir de ese acuerdo. La consulta compartida ya tiene ese contexto.
- [ ] Repetir con voz mediante Whisper y con una imagen conocida mediante el proveedor visual. Revisar transcripción, clases y relaciones reconocidas. Probar una caída del proveedor y contenido del chat que intente dar instrucciones al asistente.

**Evidencia inicial:** consulta compartida en la revisión 2 con llama.cpp y Qwen2.5-3B-Instruct Q4_K_M. Para cerrar, registrar también la respuesta y revisión de las pruebas restantes con el proveedor real.

### 5. Modelo UML, XMI y teléfono físico

- [ ] En un proyecto de prueba, crear clases, una relación con multiplicidades, una clase de asociación y un método con parámetros. Guardar, deshacer, rehacer y recargar. Comprobar firmas, relaciones y cascadas al eliminar.
- [ ] Importar un archivo real de Enterprise Architect, validar la vista previa y exportar la revisión resultante. Reimportar en otro proyecto y comparar clases, atributos, multiplicidades, métodos y orden de parámetros. Guardar el XMI de entrada y de salida. La regresión de intercambio del repositorio ya pasó.
- [ ] Probar también un XMI con una asociación que referencia una clase ausente. Comprobar que la vista previa identifica la referencia y que el documento guardado conserva su revisión.
- [ ] Abrir la plataforma desde un teléfono físico mediante una URL accesible desde el dispositivo. Con una cuenta en escritorio y otra en el teléfono, repetir **Diagrama → Conversación → Actividad**. Probar zoom, ajuste al contenido y lectura tras un cambio remoto. Ya se hizo este recorrido en Edge con tamaños emulados de 390 y 320 px.

**Cierre:** guardar el par de archivos XMI, una captura del modelo reimportado y un video corto del teléfono recibiendo el cambio.

### 6. Backend Spring Boot y clientes generados

- [ ] Usar un diagrama que tenga una relación y una entidad con clave compuesta. Exportar CRUD y Auth desde una revisión guardada. En cada carpeta extraída, ejecutar `.\gradlew.bat bootJar` y después arrancar la aplicación. Importar su `postman_collection.json`.
- [ ] Crear primero el registro referenciado. Verificar CRUD sobre la relación y consultar, modificar y eliminar la entidad compuesta mediante la ruta `/by-id` indicada en OpenAPI. Probar el aviso y la exportación con primer atributo como identificador en otro modelo de prueba.
- [ ] Iniciar un ZIP con perfil `postgres` y variables `DB_URL`, `DB_USERNAME` y `DB_PASSWORD`. Crear un registro, reiniciar y recuperarlo. Ejecutar el cliente Angular del ZIP y el cliente Flutter en Android contra esa API.

**Cierre:** guardar ZIP, revisión, respuestas HTTP, comprobación del reinicio y captura de ambos clientes. Ya pasaron 24 peticiones HTTP en los ZIP CRUD/Auth con UUID simple. [Guion de la prueba realizada](runtime/demo-backend-generado.md).

### 7. Railway y presentación

- [ ] Si se usará una URL pública, preparar un entorno de prueba, copia de PostgreSQL y estrategia de migración. Configurar secretos, acceso a la base y orígenes WebSocket en el servidor. Construir las imágenes y revisar los logs de arranque.
- [ ] Publicar `api` y `web` en el proyecto y entorno elegidos con el procedimiento de **Guía y despliegue**. Verificar dominio HTTPS, login, sincronización con dos cuentas, chat, historial y descarga del ZIP. Si se presenta la API generada en línea, alojarla en un servicio separado y probar su colección Postman con esa URL.
- [ ] Ensayar la presentación en este orden. Mostrar dos cuentas, una edición sincronizada, la consulta sobre el autor, la actividad desde el teléfono, la recuperación de la sesión y el CRUD generado. Anotar NoSQL como pendiente de presentación.

**Cierre:** guion con resultados, enlaces y capturas. Para cada comprobación registrar fecha, entorno, resultado y evidencia. Mantener abiertos los pasos que fallen o que dependan de un servicio aún sin configurar.

## Límites actuales de producción

- update no reemplaza migraciones versionadas ni copias de seguridad.
- Las claves JWT, credenciales de IA y URLs internas deben configurarse en el servidor, sin publicarlas en frontend/Git.
- Las imágenes Docker nuevas todavía deben construirse y ejecutarse.
- No se ha realizado un nuevo despliegue Railway durante estas entregas.
- Los servicios y proveedores del editor no se copian automáticamente a la aplicación generada.

## Seguimiento

Escenarios y comprobaciones parciales: [validacion-etapas-colaboracion-ia.md](validacion-etapas-colaboracion-ia.md).

El recorrido móvil previo usó frontend 4217 y API 8083. Para nuevas comprobaciones, arrancar el código actual siguiendo el paso 1 y anotar qué instancia se está probando.
