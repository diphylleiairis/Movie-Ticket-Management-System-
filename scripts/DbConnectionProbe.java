import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

class DbConnectionProbe {
    public static void main(String[] args) {
        var env = System.getenv();
        var properties = new Properties();
        properties.setProperty("user", env.get("DB_PROBE_USER"));
        properties.setProperty("password", env.get("DB_PROBE_PASSWORD"));
        properties.setProperty("sslmode", "require");
        properties.setProperty("connectTimeout", "10");
        properties.setProperty("socketTimeout", "10");
        var host = env.get("DB_PROBE_HOST");
        if (host.contains(":")) host = "[" + host + "]";
        var url = "jdbc:postgresql://" + host + ":" + env.get("DB_PROBE_PORT")
            + "/" + env.get("DB_PROBE_DATABASE");
        try (var connection = DriverManager.getConnection(url, properties)) {
            connection.setReadOnly(true);
            System.out.println("PostgreSQL JDBC: TLS required (sslmode=require)");
            try (var statement = connection.createStatement()) {
                statement.setQueryTimeout(10);
                try (var result = statement.executeQuery("SELECT 1")) {
                    if (!result.next() || result.getInt(1) != 1) throw new SQLException("", "HY000");
                    System.out.println("PostgreSQL: CONNECTED; SELECT 1 = 1");
                }
                try (var result = statement.executeQuery(
                        "SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()")) {
                    System.out.println("PostgreSQL database-side TLS view: " + (result.next() && result.getBoolean(1) ? "ENABLED" : "NOT CONFIRMED (pooler may terminate client TLS)"));
                }
                try (var result = statement.executeQuery(
                        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'movie_app' AND table_type = 'BASE TABLE'")) {
                    result.next();
                    System.out.println("movie_app visible tables: " + result.getInt(1));
                }
            }
        } catch (SQLException error) {
            var state = error.getSQLState();
            System.out.println("PostgreSQL: FAILED (SQLSTATE " + (state == null ? "unknown" : state) + ")");
            System.exit(state != null && state.startsWith("08") ? 3 : 1);
        } catch (Exception error) {
            System.out.println("PostgreSQL: FAILED (runtime error; details suppressed)");
            System.exit(1);
        }
    }
}
