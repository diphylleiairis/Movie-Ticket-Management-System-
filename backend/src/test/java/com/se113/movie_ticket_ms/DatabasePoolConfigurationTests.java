package com.se113.movie_ticket_ms;

import com.zaxxer.hikari.HikariConfig;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import static org.junit.jupiter.api.Assertions.*;

class DatabasePoolConfigurationTests {
    @Test void documentedDeploymentVariablesOverridePoolSettingsWithoutOpeningConnections() {
        var environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new SystemEnvironmentPropertySource("deployment", Map.of(
            "SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE", "4",
            "SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE", "0",
            "SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT", "60000")));
        var config = new HikariConfig();
        Binder.get(environment).bind("spring.datasource.hikari", Bindable.ofInstance(config));
        assertEquals(4, config.getMaximumPoolSize());
        assertEquals(0, config.getMinimumIdle());
        assertEquals(60000, config.getIdleTimeout());
    }
}
