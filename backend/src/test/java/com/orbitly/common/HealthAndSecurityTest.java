package com.orbitly.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import com.orbitly.support.IntegrationTest;

@IntegrationTest
class HealthAndSecurityTest {

	@Autowired
	MockMvc mvc;

	@Test
	void healthIsPublic() throws Exception {
		mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	void protectedEndpointsReturnProblemJson401() throws Exception {
		mvc.perform(get("/api/me"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("unauthorized"));
	}

	@Test
	void openApiDocsArePublic() throws Exception {
		mvc.perform(get("/api/docs")).andExpect(status().isOk());
	}
}
