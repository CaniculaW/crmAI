package com.canicula.crmai.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

@SpringBootTest
class OpenApiContractCoverageTest {

    private static final Set<String> DOCUMENTED_METHODS = Set.of("get", "post", "put", "patch", "delete");
    private static final Pattern PATH_LINE = Pattern.compile("^\\s{2}(/api[^:]+):\\s*$");
    private static final Pattern METHOD_LINE = Pattern.compile("^\\s{4}(get|post|put|patch|delete):\\s*$");

    @Autowired
    private RequestMappingHandlerMapping handlerMapping;

    @Test
    void openApiContractDocumentsEveryRuntimeApiEndpoint() throws IOException {
        Set<String> runtimeOperations = runtimeApiOperations();
        Set<String> documentedOperations = documentedOpenApiOperations();

        assertThat(documentedOperations)
                .as("docs/openapi/crm-v1-openapi.yaml must document every Spring MVC /api operation")
                .containsAll(runtimeOperations);
    }

    @Test
    void approvalSchemasMatchRuntimeRequestAndShortcutResponses() throws IOException {
        String contract = Files.readString(openApiSpecPath());

        assertThat(operationBlock(contract, "/api/approvals/instances:", "/api/approvals/instances/{instanceId}:"))
                .contains("required: [object_type, object_id, object_name]", "object_name:");
        assertThat(operationBlock(contract, "/api/solutions/{solutionId}/submit-approval:", "/api/contracts:"))
                .contains("description: Solution document detail.");
        assertThat(operationBlock(contract, "/api/contracts/{contractId}/submit-approval:", "/api/contracts/{contractId}/changes:"))
                .contains("description: Contract detail.");
    }

    private Set<String> runtimeApiOperations() {
        Set<String> operations = new LinkedHashSet<>();
        handlerMapping.getHandlerMethods().forEach((mapping, handlerMethod) ->
                runtimePaths(mapping).forEach(path ->
                        mapping.getMethodsCondition().getMethods().forEach(method -> {
                            if (path.startsWith("/api/")) {
                                operations.add(method.name().toLowerCase(Locale.ROOT) + " " + path);
                            }
                        })));
        return operations;
    }

    private Set<String> runtimePaths(RequestMappingInfo mapping) {
        if (mapping.getPathPatternsCondition() != null) {
            return mapping.getPathPatternsCondition().getPatternValues();
        }
        if (mapping.getPatternsCondition() != null) {
            return mapping.getPatternsCondition().getPatterns();
        }
        return Set.of();
    }

    private Set<String> documentedOpenApiOperations() throws IOException {
        Path specPath = openApiSpecPath();
        Set<String> operations = new LinkedHashSet<>();
        String currentPath = null;
        for (String line : Files.readAllLines(specPath)) {
            Matcher pathMatcher = PATH_LINE.matcher(line);
            if (pathMatcher.matches()) {
                currentPath = pathMatcher.group(1);
                continue;
            }
            Matcher methodMatcher = METHOD_LINE.matcher(line);
            if (methodMatcher.matches() && currentPath != null) {
                String method = methodMatcher.group(1);
                if (DOCUMENTED_METHODS.contains(method)) {
                    operations.add(method + " " + currentPath);
                }
            }
        }
        return operations;
    }

    private Path openApiSpecPath() {
        Path backendRelativePath = Path.of(System.getProperty("user.dir"))
                .resolve("../docs/openapi/crm-v1-openapi.yaml")
                .normalize();
        if (Files.exists(backendRelativePath)) {
            return backendRelativePath;
        }
        return Path.of(System.getProperty("user.dir"))
                .resolve("docs/openapi/crm-v1-openapi.yaml")
                .normalize();
    }

    private static String operationBlock(String contract, String startMarker, String endMarker) {
        int start = contract.indexOf("  " + startMarker);
        int end = contract.indexOf("  " + endMarker, start + startMarker.length());
        assertThat(start).as("OpenAPI start marker %s", startMarker).isGreaterThanOrEqualTo(0);
        assertThat(end).as("OpenAPI end marker %s", endMarker).isGreaterThan(start);
        return contract.substring(start, end);
    }
}
