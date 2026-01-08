# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app

COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN mvn dependency:go-offline -q

COPY src src
RUN mvn clean package -DskipTests -q

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
ENV SPRING_PROFILES_ACTIVE=prod

RUN addgroup -g 1001 -S spring && adduser -u 1001 -S spring -G spring
USER 1001:1001

WORKDIR /app
COPY --from=builder /app/target/*.jar application.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "application.jar"]
