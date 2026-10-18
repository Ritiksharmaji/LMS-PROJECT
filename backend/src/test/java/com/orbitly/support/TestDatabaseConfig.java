package com.orbitly.support;

import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/** Rebuilds the test schema from the migrations once per test run (the context is cached between classes). */
@TestConfiguration(proxyBeanMethods = false)
class TestDatabaseConfig {

	@Bean
	FlywayMigrationStrategy cleanMigrate() {
		return flyway -> {
			flyway.clean();
			flyway.migrate();
		};
	}
}
