package com.canicula.crmai.api;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(ApiResponseContractTest.ValidationProbeController.class)
class ApiResponseContractTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void returnsValidationErrorsWithFieldDetailsAndTraceId() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Trace-Id", "validation-trace-001");

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                "/api/test/validation",
                HttpMethod.POST,
                new HttpEntity<>("{}", headers),
                new ParameterizedTypeReference<>() {
                });

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getHeaders().getFirst("X-Trace-Id")).isEqualTo("validation-trace-001");
        assertThat(response.getBody())
                .containsEntry("code", "VALIDATION_ERROR")
                .containsEntry("message", "参数校验失败")
                .containsEntry("trace_id", "validation-trace-001");
        assertThat(response.getBody()).extractingByKey("data")
                .asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .extractingByKey("field_errors")
                .asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.LIST)
                .satisfies(fieldErrors -> assertThat((List<?>) fieldErrors)
                        .anySatisfy(fieldError -> assertThat(((Map<?, ?>) fieldError).get("field"))
                                .isEqualTo("name")));
    }

    @RestController
    static class ValidationProbeController {

        @PostMapping("/api/test/validation")
        ValidationProbeResponse validate(@Valid @RequestBody ValidationProbeRequest request) {
            return new ValidationProbeResponse(request.name());
        }
    }

    record ValidationProbeRequest(@NotBlank String name) {
    }

    record ValidationProbeResponse(String name) {
    }
}
