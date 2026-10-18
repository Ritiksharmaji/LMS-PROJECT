package com.orbitly.support;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * Full application context against the local {@code orbitly_test} Postgres database. Tests isolate themselves by
 * creating their own organization (see {@link Api#newOrg()}), so no per-test cleanup is needed.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({ TestDatabaseConfig.class, Api.class, RecordingMailer.class })
public @interface IntegrationTest {
}
