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

## Docker Desktop

Start Docker Desktop with Linux containers. From the repository root, create the
ignored `.env` using `.env.example` and fill in `POSTGRES_HOST`, `POSTGRES_PORT`,
`POSTGRES`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. For email registration, also
fill in `RESEND_API_KEY` and `IDENTITY_MAIL_FROM` with an authorized sender.
Compose passes the database values and the Identity mail provider/key/sender to
the container; the file is not copied into the image.
For a database running on Windows itself, use `host.docker.internal` as the host.
The current configuration requires PostgreSQL SSL, including in development.

```powershell
docker compose up -d --build backend
docker compose ps
docker compose logs --tail 80 backend
```

Open `http://localhost:8080/api/v1/health` to verify HTTP startup. Identity now
provides registration, email verification, login, logout and Google login; see
[Identity setup](../docs/design/identity.md). `/login` is an entry point, not the
JSON login API. Use provisioned accounts for Admin and Cinema Staff.

If port 8080 is occupied, set `$env:BACKEND_PORT = '8081'` before starting Compose
and open `http://localhost:8081/login` instead. Stop the local deployment with
`docker compose down`.

The multi-stage Dockerfile builds with Java 21 and runs as a non-root user. Image
builds skip database-dependent tests; run those separately before release. Compose
uses the `dev` profile for local HTTP. The image defaults to `prod`, which requires
the same database variables, enables secure session cookies, and reads Render's
`PORT` variable. For Render, use `backend` as the root directory and `./Dockerfile`
as the Dockerfile path. Do not set `SERVER_PORT` there, so `PORT` takes effect.
Set `RESEND_API_KEY` and `IDENTITY_MAIL_FROM` in Render's environment as well;
the ignored local `.env` is not uploaded by a Git-based deployment. The mail
provider defaults to `resend`. See [Identity setup](../docs/design/identity.md)
for the required frontend origin and Google settings in production.

Both profiles disable Hibernate schema changes. Flyway is not yet wired into the
application, so starting the container does not apply the SQL migration.
