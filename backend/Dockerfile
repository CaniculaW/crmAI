ARG BACKEND_BUILD_IMAGE=maven:3.9-eclipse-temurin-17
ARG BACKEND_RUNTIME_IMAGE=eclipse-temurin:17-jre

FROM ${BACKEND_BUILD_IMAGE} AS build

WORKDIR /workspace

COPY pom.xml .
RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests package

FROM ${BACKEND_RUNTIME_IMAGE}

WORKDIR /app

COPY --from=build /workspace/target/crm-ai-backend-*.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
