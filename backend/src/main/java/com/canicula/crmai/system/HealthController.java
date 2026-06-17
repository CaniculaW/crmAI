package com.canicula.crmai.system;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    HealthResponse health() {
        return new HealthResponse("UP", "crm-ai-backend");
    }

    public record HealthResponse(String status, String service) {
    }
}
