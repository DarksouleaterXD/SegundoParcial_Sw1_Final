FROM eclipse-temurin:${model.javaVersion}-jdk-jammy AS build
WORKDIR /app
COPY . .
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon
RUN find build/libs -maxdepth 1 -name '*.jar' ! -name '*-plain.jar' -exec cp '{}' /app/application.jar ';'
FROM eclipse-temurin:${model.javaVersion}-jre-jammy
WORKDIR /app
COPY --from=build /app/application.jar /app/application.jar
ENV SERVER_PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/application.jar"]
