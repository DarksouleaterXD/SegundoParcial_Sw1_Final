# Ejecutar y demostrar tu aplicación

## Qué contiene el ZIP

Este backend es independiente del editor Órbita/ClassForge. Sus endpoints administran los datos de tu aplicación.
El chat del equipo, la actividad y las preferencias de proveedores del editor no se copian a esta aplicación.

- openapi.yaml y postman_collection.json: contrato real de los endpoints generados, cuando el modo exportado incluye API.
- domain-manifest.json: entidades y capacidades utilizadas por los clientes generados.
- docs/source-model.json: documento UML original y revisión usados al descargar. No incluye usuarios, mensajes, claves ni datos de negocio.
- docs/generation-model.json: modelo empleado para generar, incluida la elección de identificadores por primer atributo si se autorizó.
- docs/uml-operations.json: métodos UML, parámetros, retorno y visibilidad de clases y clases de asociación.

Los métodos UML son documentación. El catálogo indica implemented=false: no se generan cuerpos de negocio ni endpoints para esas firmas.
No deben confundirse con los métodos CRUD que sí implementa la API. Para implementar una operación de negocio hay que definir sus reglas,
validaciones, permisos, transacción, entrada/salida y comportamiento de error antes de escribir su servicio y controlador.

## Herramientas

Instala JDK 21 y comprueba java -version y javac -version. El Gradle Wrapper está incluido; no hace falta instalar Gradle.
La primera compilación necesita acceso a Internet para descargar dependencias.
Para el cliente Angular necesitas Node.js/npm compatibles con frontend/package.json; para mobile, Flutter y Android SDK.
Docker es opcional. PostgreSQL se necesita para el perfil persistente postgres.

## Iniciar en Windows

Abre PowerShell en la carpeta extraída que contiene build.gradle y gradlew.bat:

~~~powershell
.\gradlew.bat bootRun
~~~

Por defecto la API escucha en http://localhost:8080. Espera Started ...Application.
bootRun permanece en ejecución mientras el servidor atiende; IDLE no es un error. Detén con Ctrl+C.
Si 8080 está ocupado:

~~~powershell
.\gradlew.bat bootRun --args="--server.port=8081"
~~~

En Linux/macOS: chmod +x gradlew y ./gradlew bootRun.

## Demostrar endpoints

1. Importa postman_collection.json en Postman y configura su URL base con el puerto real de tu API.
2. Consulta openapi.yaml para rutas, parámetros y cuerpos exactos. No supongas pluralización de los nombres UML.
3. Crea primero los registros referenciados por relaciones; luego prueba crear, listar, obtener, actualizar, contar y eliminar.
4. Las claves compuestas usan /by-id con parámetros; sigue la colección.
5. En modo Auth, usa /api/auth/bootstrap para la primera cuenta con el DTO de la entidad seleccionada, luego /api/auth/login.
   Envía el JWT como Bearer Token. Define JWT_SECRET en el servidor y no lo guardes en el código.

No se añade un endpoint especial para cada método de docs/uml-operations.json.

## Conservar datos con PostgreSQL

La configuración H2 predeterminada es de demostración: memoria y create-drop. Sus registros desaparecen al reiniciar.
El perfil postgres de esta versión usa update para conservar tablas y registros; no equivale a una estrategia de migraciones para producción.
Crea primero la base y el usuario, después usa valores reales:

~~~powershell
$env:SPRING_PROFILES_ACTIVE = "postgres"
$env:DB_URL = "jdbc:postgresql://localhost:5432/mi_aplicacion"
$env:DB_USERNAME = "mi_usuario"
$env:DB_PASSWORD = "TU_PASSWORD"
$env:SPRING_JPA_HIBERNATE_DDL_AUTO = "update"
.\gradlew.bat bootRun
~~~

Antes de una publicación con datos reales, prepara migraciones versionadas, copias de seguridad y una política de esquema como validate.

## Docker

Desde la raíz extraída:

~~~powershell
docker build -t mi-backend .
docker run --rm -p 8080:8080 mi-backend
~~~

Ese ejemplo usa H2 de demostración. Para persistencia, configura el perfil postgres y las variables de base con un archivo local privado:

~~~powershell
docker run --rm --env-file .env -p 8080:8080 mi-backend
~~~

No incluyas credenciales en la imagen ni subas .env a Git. En el contenedor, localhost identifica el propio contenedor:
usa una dirección de PostgreSQL accesible desde él. El Dockerfile publica SERVER_PORT=8080.

## Railway

Crea un servicio separado para esta API, por ejemplo mi-backend, y añade PostgreSQL.
Desde la carpeta extraída, después de instalar/enlazar Railway CLI con el proyecto y entorno correctos:

~~~powershell
railway login
railway link
railway up . --path-as-root --service mi-backend
~~~

En Variables del servicio configura:

~~~text
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=postgres
DB_URL=jdbc:postgresql://HOST_INTERNO:5432/BASE
DB_USERNAME=USUARIO
DB_PASSWORD=PASSWORD
SPRING_JPA_HIBERNATE_DDL_AUTO=update
JWT_SECRET=SECRETO_ALEATORIO_PRIVADO
~~~

JWT_SECRET se utiliza en modo Auth. Reemplaza los valores de ejemplo; Railway entrega credenciales de PostgreSQL,
pero DB_URL debe ser una URL JDBC. No confundas la URL JDBC con una URL postgres:// de otros clientes.
Genera un dominio público con puerto destino 8080 y úsalo como base en Postman.
Comprueba el despliegue y los logs en Railway. Esto publica la API; Angular y Flutter tienen configuración/publicación independientes.

Referencia de CLI: https://docs.railway.com/cli/deploying

## IA opcional y clientes

El asistente de la aplicación generada tiene su configuración propia: LLAMA_URL, LLAMA_MODEL, WHISPER_URL,
WHISPER_LANGUAGE y APP_API_BASE_URL. No hereda el selector de proveedores del editor.
No necesita IA para ejecutar CRUD. Un proveedor caído afecta al asistente, no demuestra que los endpoints CRUD fallen.

En frontend/: npm install y npm start; el proxy espera la API en 8080.
En mobile/: flutter pub get y flutter run; el emulador Android usa 10.0.2.2:8080.
Si cambias el puerto/host, actualiza la URL base de cada cliente y APP_API_BASE_URL.
