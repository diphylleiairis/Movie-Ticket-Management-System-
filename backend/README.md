# Backend

Spring Boot application copied from the `demo` project. The Maven project and wrapper live in this directory. The application entry point is `src/main/java/com/se113/movie_ticket_ms/DemoApplication.java`.

Business modules live under `src/main/java/com/se113/movie_ticket_ms/modules/`. Configuration profiles and Flyway migrations remain under `src/main/resources/`.

The project requires Java 21. From this `backend/` directory, start the development profile with:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'dev'
.\mvnw.cmd spring-boot:run
```

The Spring Boot 4 dotenv integration reads the ignored `.env` in the repository root. Operating-system environment variables override local `.env` entries.

Run the current backend smoke test from this directory with `.\mvnw.cmd test` in PowerShell after selecting Java 21. The `test` profile reads `TEST_DB_URL`, `TEST_DB_USER`, and `TEST_DB_PASSWORD` from the root `.env` when present. For the current context-load test, it falls back to the existing `POSTGRES_*` connection if those test keys are absent; no manual database-variable assignment is needed. Configure a separate test database before adding tests that change data.
