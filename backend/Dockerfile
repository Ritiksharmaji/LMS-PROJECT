# Build: docker build -t orbitly-api backend
FROM eclipse-temurin:17-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies > /dev/null
COPY src src
RUN ./gradlew --no-daemon bootJar -x test && cp build/libs/*-SNAPSHOT.jar app.jar

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 1001 orbitly && mkdir -p /app/storage && chown orbitly /app/storage
COPY --from=build /src/app.jar app.jar
USER orbitly
EXPOSE 8080
ENV MEDIA_LOCAL_ROOT=/app/storage
HEALTHCHECK --interval=15s --timeout=3s --retries=10 CMD curl -fsS http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
