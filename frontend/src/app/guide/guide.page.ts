import { signal } from '../core/view-state';
export class GuidePage {
  readonly copyMessage = signal('');
  readonly commands = {
    versions: 'java -version\njavac -version\nnode --version\nnpm --version',
    platformApi: 'cd backend\n.\\gradlew.bat bootRun',
    platformWeb: 'cd frontend\nnpm install\nnpm start',
    generated: '.\\gradlew.bat bootRun',
    generatedPort: '.\\gradlew.bat bootRun --args="--server.port=8081"',
    postgres: '$env:SPRING_PROFILES_ACTIVE = "postgres"\n$env:DB_URL = "jdbc:postgresql://localhost:5432/mi_aplicacion"\n$env:DB_USERNAME = "mi_usuario"\n$env:DB_PASSWORD = "TU_PASSWORD"\n$env:SPRING_JPA_HIBERNATE_DDL_AUTO = "update"\n.\\gradlew.bat bootRun',
    platformDeploy: 'railway login\nrailway link\nrailway up .\\backend --path-as-root --service api\nrailway up .\\frontend --path-as-root --service web',
    platformVariables: 'PORT=8080\nSPRING_DATASOURCE_URL=jdbc:postgresql://HOST_INTERNO:5432/BASE\nSPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver\nSPRING_DATASOURCE_USERNAME=USUARIO\nSPRING_DATASOURCE_PASSWORD=PASSWORD\nSPRING_JPA_HIBERNATE_DDL_AUTO=update\nSPRING_H2_CONSOLE_ENABLED=false\nCLASSFORGE_JWT_SECRET=SECRETO_ALEATORIO_PRIVADO\nCLASSFORGE_WEBSOCKET_ALLOWED_ORIGINS=https://TU_DOMINIO_WEB',
    generatedVariables: 'SERVER_PORT=8080\nSPRING_PROFILES_ACTIVE=postgres\nDB_URL=jdbc:postgresql://HOST_INTERNO:5432/BASE\nDB_USERNAME=USUARIO\nDB_PASSWORD=PASSWORD\nSPRING_JPA_HIBERNATE_DDL_AUTO=update\nJWT_SECRET=SECRETO_ALEATORIO_PRIVADO',
    generatedDocker: 'FROM eclipse-temurin:21-jdk-jammy AS build\nWORKDIR /app\nCOPY . .\nRUN chmod +x gradlew && ./gradlew bootJar --no-daemon\nRUN find build/libs -maxdepth 1 -name "*.jar" ! -name "*-plain.jar" -exec cp {} /app/application.jar \\;\nFROM eclipse-temurin:21-jre-jammy\nWORKDIR /app\nCOPY --from=build /app/application.jar /app/application.jar\nEXPOSE 8080\nENTRYPOINT ["java", "-jar", "/app/application.jar"]',
    generatedDeploy: 'railway login\nrailway link\nrailway up . --path-as-root --service mi-backend',
    ai: 'CLASSFORGE_ASSISTANT_TEXT_PROVIDER=llama-cpp\nCLASSFORGE_ASSISTANT_LLAMA_URL=http://127.0.0.1:8092\nCLASSFORGE_ASSISTANT_WHISPER_URL=http://127.0.0.1:8093\nCLASSFORGE_ASSISTANT_VISION_PROVIDER=llama-cpp\nCLASSFORGE_ASSISTANT_VISION_URL=http://127.0.0.1:8094',
  };

  async copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copyMessage.set('Comandos copiados.');
    } catch {
      this.copyMessage.set('No se pudo copiar. Selecciona el texto del bloque y cópialo manualmente.');
    }
  }
}
