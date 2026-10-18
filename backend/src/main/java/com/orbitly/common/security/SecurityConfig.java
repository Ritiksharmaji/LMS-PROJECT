package com.orbitly.common.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.orbitly.common.config.OrbitlyProperties;

@Configuration
@EnableMethodSecurity
class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationConverter jwtAuthenticationConverter,
			ProblemAuthenticationHandlers handlers) throws Exception {
		http.csrf(csrf -> csrf.disable())
			.cors(cors -> {
			})
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
				.requestMatchers("/api/auth/**", "/api/public/**", "/api/webhooks/**").permitAll()
				.requestMatchers("/actuator/health/**", "/api/docs/**", "/swagger-ui/**").permitAll()
				.requestMatchers("/api/admin/**").hasRole(Role.ADMIN.name())
				.requestMatchers("/api/instructor/**").hasAnyRole(Role.INSTRUCTOR.name(), Role.ADMIN.name())
				.anyRequest().authenticated())
			.oauth2ResourceServer(oauth -> oauth
				.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
				.authenticationEntryPoint(handlers))
			.exceptionHandling(e -> e.authenticationEntryPoint(handlers).accessDeniedHandler(handlers));
		return http.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(OrbitlyProperties properties) {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(properties.cors().allowedOrigins());
		config.addAllowedMethod("*");
		config.addAllowedHeader("*");
		config.setAllowCredentials(true);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}
}
