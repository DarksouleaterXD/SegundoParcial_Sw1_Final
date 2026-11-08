# Demostración del backend Spring Boot generado

## Comprobación realizada

Se compilaron los ZIP CRUD y Auth con Java 21 y `bootJar`. Ambas aplicaciones se iniciaron y se verificaron 24 peticiones HTTP reales: crear, listar, consultar, contar, actualizar, eliminar, dato requerido ausente, recurso eliminado, acceso sin token, bootstrap inicial, rechazo de segundo bootstrap, login correcto e incorrecto y listado de usuarios sin exponer contraseña ni hash.

La evidencia está en [generated-backend-runtime.json](../evidence/cierre-audio/generated-backend-runtime.json). Modelo de ejemplo: Producto con id UUID y nombre String; Usuario con id UUID, login String y clave String. Las dos variantes se descargaron desde la plataforma en la entrega previa. Esta comprobación se hizo sobre esos ZIP, no sobre un proyecto Spring construido manualmente.

Las aplicaciones usan H2 en memoria para esta demostración. No prueba persistencia PostgreSQL, MongoDB, relaciones, claves compuestas, clientes Angular/Flutter ni despliegue Docker/Railway. El requisito NoSQL de la plataforma se trata por separado en [cierre-casos-uso-audio.md](../cierre-casos-uso-audio.md).

## Arranque local

Requisitos: JDK 21 y el Gradle Wrapper incluido. Desde la carpeta descomprimida de cada proyecto, en terminales diferentes:

```powershell
# Variante CRUD
.\gradlew.bat bootRun --args="--server.port=8095"
```

```powershell
# Variante con autenticación
.\gradlew.bat bootRun --args="--server.port=8096"
```

El proceso permanece ejecutándose mientras atiende peticiones. `bootRun` activo o `IDLE` no significa por sí solo que esté detenido; comprobar la línea de arranque y una petición HTTP. H2 pierde los datos cuando se detiene el proceso.

## Recorrido en Postman

Importar `postman_collection.json` del ZIP y ajustar la URL base según la variante. Para Producto, la ruta es singular: `/api/producto`.

1. `POST http://localhost:8095/api/producto`, cuerpo JSON `{"nombre":"Producto de demostración"}`. Debe responder 201. Copiar el id recibido.
2. `GET http://localhost:8095/api/producto`. Debe aparecer el producto en la página de resultados.
3. `GET http://localhost:8095/api/producto/{id}`. Debe devolver el producto creado.
4. `PUT http://localhost:8095/api/producto/{id}`, cuerpo `{"nombre":"Producto actualizado"}`. Comprobar el cambio.
5. `DELETE http://localhost:8095/api/producto/{id}`. Responde 204. Una consulta posterior al mismo id responde 404.

Para Auth, el primer arranque tiene la tabla de usuarios vacía:

1. `GET http://localhost:8096/api/producto` sin token. La variante actual responde 403.
2. `POST http://localhost:8096/api/auth/bootstrap`, JSON `{"login":"demo","clave":"BackendDemo2026!"}`. Solo funciona mientras no existen usuarios. No repetir si ya se creó el usuario.
3. `POST http://localhost:8096/api/auth/login`, JSON `{"username":"demo","password":"BackendDemo2026!"}`. Copiar `accessToken` de la respuesta.
4. Configurar Authorization → Bearer Token y pegar ese token. Repetir el CRUD en 8096.
5. Consultar `/api/usuario` con token y verificar que no devuelve el campo clave ni su hash.

Estas credenciales son exclusivamente de la demostración local del backend descargado; no son las cuentas de Órbita Studio. En producción hay que configurar el secreto JWT y una base persistente.
