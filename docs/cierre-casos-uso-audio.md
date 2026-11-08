# Cierre de los casos de uso del audio

## Fuente y alcance

La propuesta inicial de este chat tenía nueve casos centrados en colaboración e IA. La lista posterior de entregas cambió la numeración e incorporó generación Spring Boot, desplazando el seguimiento móvil. Este documento recupera la trazabilidad original para no considerar terminado un requisito distinto.

El alcance parte del audio local Voz 299.m4a.mp4. Por decisión del usuario, NoSQL queda como pendiente de presentación. Las sesiones se guardan en H2 o PostgreSQL.

## Casos originales y trabajo de cierre

| Caso original | Disponible | Falta para cerrar |
| --- | --- | --- |
| 01. Participar en sesión colaborativa | Acceso por membresía, presencia y edición sincronizada del diagrama. | Validación final con dos usuarios, desconexión y revocación. |
| 02. Conversar con el equipo | Chat compartido persistente, autor, fecha y paginación. | Completar los escenarios de concurrencia y reconexión. |
| 03. Consultar IA con contexto compartido | La modalidad compartida guarda la pregunta, la respuesta y el nombre del autor para los miembros del proyecto. La IA recibe el modelo, chat, actividad y consultas compartidas recientes. | Validar con un proveedor de IA real. |
| 04. Solicitar y aplicar cambios de IA | Texto/voz, herramientas UML, comparación, aprobación y control de revisión. | Verificar con proveedor real y colaboración; contextualizar con el espacio compartido. |
| 05. Modelar métodos UML | Edición manual, diagrama, guardado, XMI y propuestas IA para clases normales. | Validación de límites y clases de asociación con IA si se incluyen. Los cuerpos de negocio no son necesarios para el alcance CRUD aclarado por el usuario. |
| 06. Consultar actividad y ponerse al día | Registro con autor y revisión, resúmenes por período y autor, y hasta 30 operaciones confirmadas en el contexto de las consultas. | Comprobar la calidad de la atribución con un proveedor real. |
| 07. Retomar una sesión | Persistencia SQL de modelo, chat, actividad y consultas privadas y compartidas. | Demostrar la recuperación del contexto completo después de reiniciar. |
| 08. Seguimiento móvil de la plataforma | Barra inferior con accesos al diagrama, la conversación y la actividad. Se comprobó con dos cuentas en Edge, con pantalla móvil emulada a 390 y 320 px. | Demostrar el recorrido en un teléfono físico. |
| 09. Configurar/comprobar proveedor IA | Selección texto/voz habilitada por servidor, estado y errores. | Proveedor real, credenciales, inferencia y transcripción; selector de visión es adicional. |

## Conservación del primer parcial

Autenticación, proyectos, UML, XMI y generación Spring Boot deben conservarse. El alcance aclarado de generación es CRUD y variante autenticada; las operaciones de negocio personalizadas quedan como ampliación opcional. No es necesario pedir reglas de negocio para validar ese generador.

La comprobación de los ZIP descargados incluye compilación, arranque y endpoints reales. Debe registrarse la evidencia y cualquier limitación, sin confundir construcción exitosa con despliegue o validación en PostgreSQL.

## Demostración de colaboración

La primera entrega incorpora la consulta compartida y la actividad en el contexto del asistente. Para demostrarla, Fernando crea la clase Pedido y Ana abre el mismo proyecto y usa Texto y voz → Consultar → Compartida con el equipo. Ana pregunta qué hizo Fernando y ambos pueden consultar el historial compartido.

La segunda cuenta puede seguir el proyecto desde la vista móvil. Usar la barra inferior para abrir el diagrama, comprobar el cambio de Fernando, leer el mensaje del equipo y consultar la actividad con autor y revisión.

La compilación del frontend pasó. Pasaron siete pruebas de colaboración, permisos WebSocket e intercambio XMI, y dos pruebas del historial en una ejecución separada tras un error de carga de Spring en la batería conjunta.

El resto de escenarios se mantiene en [validacion-etapas-colaboracion-ia.md](validacion-etapas-colaboracion-ia.md).
