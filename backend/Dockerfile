FROM eclipse-temurin:21-jdk-jammy AS build

WORKDIR /app

COPY . .

RUN chmod +x ./gradlew
RUN ./gradlew bootJar -x test --no-daemon

RUN JAR="$(find build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' | head -n 1)" \
    && test -n "$JAR" \
    && cp "$JAR" /tmp/classforge.jar

FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

COPY --from=build /tmp/classforge.jar /app/classforge.jar

ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "exec java -Dserver.port=${PORT:-8080} -jar /app/classforge.jar"]