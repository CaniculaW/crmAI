package com.canicula.crmai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthControllerTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void returnsServiceHealth() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Trace-Id", "health-trace-001");
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                "/api/health",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                new ParameterizedTypeReference<>() {
                });

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getFirst("X-Trace-Id")).isEqualTo("health-trace-001");
        assertThat(response.getBody())
                .containsEntry("code", "OK")
                .containsEntry("message", "success")
                .containsEntry("trace_id", "health-trace-001");
        assertThat(response.getBody()).extractingByKey("data")
                .asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .containsEntry("status", "UP")
                .containsEntry("service", "crm-ai-backend");
    }
}
