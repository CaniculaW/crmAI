package com.canicula.crmai.system;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DictionaryControllerTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @LocalServerPort
    private int port;

    @Test
    void returnsActiveDictionaryItemsByCode() {
        HttpHeaders headers = traceHeaders("dict-query-trace-001");
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/system/dicts?dict_code=account_type",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getFirst("X-Trace-Id")).isEqualTo("dict-query-trace-001");
        JsonNode body = response.getBody();
        assertThat(body.path("code").asText()).isEqualTo("OK");
        assertThat(body.path("trace_id").asText()).isEqualTo("dict-query-trace-001");
        JsonNode accountType = body.path("data").path(0);
        assertThat(accountType.path("dict_code").asText()).isEqualTo("account_type");
        assertThat(accountType.path("items")).anySatisfy(item ->
                assertThat(item.path("item_code").asText()).isEqualTo("enterprise"));
    }

    @Test
    void createsAndDisablesDictionaryItems() throws Exception {
        HttpHeaders headers = traceHeaders("dict-manage-trace-001");
        ResponseEntity<JsonNode> typeResponse = restTemplate.exchange(
                "/api/system/dicts/types",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "dict_code", "sales_channel",
                        "dict_name", "销售渠道",
                        "description", "测试字典"), headers),
                JsonNode.class);
        Long dictTypeId = typeResponse.getBody().path("data").path("id").asLong();

        ResponseEntity<JsonNode> itemResponse = restTemplate.exchange(
                "/api/system/dicts/types/" + dictTypeId + "/items",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "item_code", "partner",
                        "item_name", "合作伙伴",
                        "sort_order", 10), headers),
                JsonNode.class);
        Long itemId = itemResponse.getBody().path("data").path("id").asLong();

        HttpResponse<String> disabledResponse = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder()
                        .uri(URI.create("http://localhost:" + port + "/api/system/dicts/items/" + itemId))
                        .header("Content-Type", "application/json")
                        .header("X-Trace-Id", "dict-manage-trace-001")
                        .method("PATCH", HttpRequest.BodyPublishers.ofString(
                                objectMapper.writeValueAsString(Map.of("is_active", false))))
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        ResponseEntity<JsonNode> activeOnlyResponse = restTemplate.exchange(
                "/api/system/dicts?dict_code=sales_channel",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                JsonNode.class);
        ResponseEntity<JsonNode> includeInactiveResponse = restTemplate.exchange(
                "/api/system/dicts?dict_code=sales_channel&include_inactive=true",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                JsonNode.class);

        assertThat(typeResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(itemResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(disabledResponse.statusCode()).isEqualTo(HttpStatus.OK.value());
        assertThat(activeOnlyResponse.getBody().path("data").path(0).path("items")).isEmpty();
        assertThat(includeInactiveResponse.getBody().path("data").path(0).path("items"))
                .anySatisfy(item -> {
                    assertThat(item.path("item_code").asText()).isEqualTo("partner");
                    assertThat(item.path("is_active").asBoolean()).isFalse();
                });
    }

    private static HttpHeaders traceHeaders(String traceId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Trace-Id", traceId);
        return headers;
    }
}
