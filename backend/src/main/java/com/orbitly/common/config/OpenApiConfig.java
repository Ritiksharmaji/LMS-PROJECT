package com.orbitly.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
class OpenApiConfig {

	@Bean
	OpenAPI orbitlyOpenApi() {
		return new OpenAPI().info(new Info().title("Orbitly LMS API").version("v1"))
			.components(new Components().addSecuritySchemes("bearer",
					new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
			.addSecurityItem(new SecurityRequirement().addList("bearer"));
	}
}
