package com.canicula.crmai.ai.config;

import com.canicula.crmai.api.BusinessRuleException;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiModelConfigService {

    private static final String OPENAI_PROVIDER = "openai";

    private final JdbcTemplate jdbcTemplate;
    private final HttpClient httpClient;

    AiModelConfigService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public List<AiModelConfigResponse> list() {
        return jdbcTemplate.query(
                """
                select *
                from sys_ai_model_configs
                order by enabled desc, updated_at desc nulls last, created_at desc, id desc
                """,
                (rs, rowNum) -> new AiModelConfigResponse(
                        rs.getLong("id"),
                        rs.getString("provider"),
                        rs.getString("base_url"),
                        rs.getString("model_name"),
                        rs.getString("api_key_masked"),
                        rs.getBoolean("enabled"),
                        rs.getString("last_test_status"),
                        rs.getString("last_test_message"),
                        rs.getObject("last_test_at", java.time.OffsetDateTime.class),
                        rs.getLong("created_by"),
                        rs.getObject("created_at", java.time.OffsetDateTime.class),
                        nullableLong(rs, "updated_by"),
                        rs.getObject("updated_at", java.time.OffsetDateTime.class)));
    }

    public AiModelConfigResponse find(Long configId) {
        return jdbcTemplate.queryForObject(
                """
                select *
                from sys_ai_model_configs
                where id = ?
                """,
                (rs, rowNum) -> new AiModelConfigResponse(
                        rs.getLong("id"),
                        rs.getString("provider"),
                        rs.getString("base_url"),
                        rs.getString("model_name"),
                        rs.getString("api_key_masked"),
                        rs.getBoolean("enabled"),
                        rs.getString("last_test_status"),
                        rs.getString("last_test_message"),
                        rs.getObject("last_test_at", java.time.OffsetDateTime.class),
                        rs.getLong("created_by"),
                        rs.getObject("created_at", java.time.OffsetDateTime.class),
                        nullableLong(rs, "updated_by"),
                        rs.getObject("updated_at", java.time.OffsetDateTime.class)),
                configId);
    }

    @Transactional
    public AiModelConfigResponse create(AiModelConfigUpsertRequest request, Long actorUserId) {
        String provider = normalizeProvider(request.provider());
        String apiKey = cleanRequired(request.api_key(), "API Key不能为空");
        String baseUrl = normalizeBaseUrl(request.base_url());
        boolean enabled = Boolean.TRUE.equals(request.enabled());
        if (enabled) {
            disableOtherConfigs(provider, null, actorUserId);
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    insert into sys_ai_model_configs (
                        provider, base_url, model_name, api_key_secret, api_key_masked,
                        enabled, created_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[]{"id"});
            ps.setString(1, provider);
            ps.setString(2, baseUrl);
            ps.setString(3, cleanRequired(request.model_name(), "模型名称不能为空"));
            ps.setString(4, apiKey);
            ps.setString(5, maskApiKey(apiKey));
            ps.setBoolean(6, enabled);
            ps.setLong(7, actorUserId);
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("AI模型配置创建失败");
        }
        return find(key.longValue());
    }

    @Transactional
    public AiModelConfigResponse update(Long configId, AiModelConfigUpsertRequest request, Long actorUserId) {
        String provider = normalizeProvider(request.provider());
        String baseUrl = normalizeBaseUrl(request.base_url());
        boolean enabled = Boolean.TRUE.equals(request.enabled());
        String newApiKey = cleanOptional(request.api_key());
        if (enabled) {
            disableOtherConfigs(provider, configId, actorUserId);
        }
        int updatedRows;
        if (newApiKey == null) {
            updatedRows = jdbcTemplate.update(
                    """
                    update sys_ai_model_configs
                    set provider = ?,
                        base_url = ?,
                        model_name = ?,
                        enabled = ?,
                        updated_by = ?,
                        updated_at = current_timestamp
                    where id = ?
                    """,
                    provider,
                    baseUrl,
                    cleanRequired(request.model_name(), "模型名称不能为空"),
                    enabled,
                    actorUserId,
                    configId);
        } else {
            updatedRows = jdbcTemplate.update(
                    """
                    update sys_ai_model_configs
                    set provider = ?,
                        base_url = ?,
                        model_name = ?,
                        api_key_secret = ?,
                        api_key_masked = ?,
                        enabled = ?,
                        updated_by = ?,
                        updated_at = current_timestamp
                    where id = ?
                    """,
                    provider,
                    baseUrl,
                    cleanRequired(request.model_name(), "模型名称不能为空"),
                    newApiKey,
                    maskApiKey(newApiKey),
                    enabled,
                    actorUserId,
                    configId);
        }
        if (updatedRows != 1) {
            throw new BusinessRuleException("AI模型配置不存在");
        }
        return find(configId);
    }

    @Transactional
    public AiModelConfigResponse testConnection(Long configId, Long actorUserId) {
        SecretConfig config = secretConfig(configId);
        TestResult result = testOpenAiModel(config);
        jdbcTemplate.update(
                """
                update sys_ai_model_configs
                set last_test_status = ?,
                    last_test_message = ?,
                    last_test_at = current_timestamp,
                    updated_by = ?,
                    updated_at = current_timestamp
                where id = ?
                """,
                result.status(),
                result.message(),
                actorUserId,
                configId);
        return find(configId);
    }

    private TestResult testOpenAiModel(SecretConfig config) {
        URI uri = URI.create(config.baseUrl() + "/models/" + URLEncoder.encode(config.modelName(), StandardCharsets.UTF_8));
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + config.apiKey())
                .header("Accept", "application/json")
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return new TestResult("success", "OpenAI模型连接成功：" + config.modelName());
            }
            return new TestResult("failed", "OpenAI模型连接失败，HTTP " + response.statusCode());
        } catch (IOException exception) {
            return new TestResult("failed", "OpenAI模型连接失败：" + exception.getMessage());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new TestResult("failed", "OpenAI模型连接被中断");
        } catch (IllegalArgumentException exception) {
            return new TestResult("failed", "OpenAI模型配置无效：" + exception.getMessage());
        }
    }

    private SecretConfig secretConfig(Long configId) {
        return jdbcTemplate.queryForObject(
                """
                select id, provider, base_url, model_name, api_key_secret
                from sys_ai_model_configs
                where id = ?
                """,
                (rs, rowNum) -> new SecretConfig(
                        rs.getLong("id"),
                        rs.getString("provider"),
                        rs.getString("base_url"),
                        rs.getString("model_name"),
                        rs.getString("api_key_secret")),
                configId);
    }

    private void disableOtherConfigs(String provider, Long exceptConfigId, Long actorUserId) {
        if (exceptConfigId == null) {
            jdbcTemplate.update(
                    """
                    update sys_ai_model_configs
                    set enabled = false,
                        updated_by = ?,
                        updated_at = current_timestamp
                    where provider = ?
                      and enabled = true
                    """,
                    actorUserId,
                    provider);
            return;
        }
        jdbcTemplate.update(
                """
                update sys_ai_model_configs
                set enabled = false,
                    updated_by = ?,
                    updated_at = current_timestamp
                where provider = ?
                  and enabled = true
                  and id <> ?
                """,
                actorUserId,
                provider,
                exceptConfigId);
    }

    private static String normalizeProvider(String provider) {
        String normalized = cleanRequired(provider, "服务商不能为空").toLowerCase(Locale.ROOT);
        if (!OPENAI_PROVIDER.equals(normalized)) {
            throw new BusinessRuleException("当前仅支持OpenAI模型配置");
        }
        return normalized;
    }

    private static String normalizeBaseUrl(String baseUrl) {
        String normalized = cleanRequired(baseUrl, "API Base URL不能为空");
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (!normalized.startsWith("https://") && !normalized.startsWith("http://127.0.0.1:")) {
            throw new BusinessRuleException("API Base URL必须使用HTTPS");
        }
        return normalized;
    }

    private static String cleanRequired(String value, String message) {
        String cleaned = cleanOptional(value);
        if (cleaned == null) {
            throw new BusinessRuleException(message);
        }
        return cleaned;
    }

    private static String cleanOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.strip();
    }

    private static String maskApiKey(String apiKey) {
        if (apiKey.length() <= 8) {
            return "****";
        }
        return apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length() - 4);
    }

    private static Long nullableLong(java.sql.ResultSet rs, String columnName) throws java.sql.SQLException {
        long value = rs.getLong(columnName);
        return rs.wasNull() ? null : value;
    }

    private record SecretConfig(Long id, String provider, String baseUrl, String modelName, String apiKey) {
    }

    private record TestResult(String status, String message) {
    }
}
