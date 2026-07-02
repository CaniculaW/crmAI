package com.canicula.crmai.system;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.AuthService;
import com.canicula.crmai.auth.RequirePermission;
import com.canicula.crmai.auth.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DictionaryController {

    private final DictionaryService dictionaryService;
    private final AuthService authService;
    private final AuditLogService auditLogService;

    DictionaryController(
            DictionaryService dictionaryService,
            AuthService authService,
            AuditLogService auditLogService) {
        this.dictionaryService = dictionaryService;
        this.authService = authService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/api/system/dicts")
    List<DictionaryTypeResponse> list(
            @RequestParam(name = "dict_code", required = false) String dictCode,
            @RequestParam(name = "include_inactive", defaultValue = "false") boolean includeInactive) {
        return dictionaryService.list(dictCode, includeInactive);
    }

    @RequirePermission("system.dict.manage")
    @PostMapping("/api/system/dicts/types")
    DictionaryTypeResponse createType(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody DictionaryTypeRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        DictionaryTypeResponse response = dictionaryService.createType(request);
        audit(actorUserId, "system.dict.type.create", "dict_type", response.id(), null, response, httpRequest);
        return response;
    }

    @RequirePermission("system.dict.manage")
    @PostMapping("/api/system/dicts/types/{dictTypeId}/items")
    DictionaryItemResponse createItem(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable Long dictTypeId,
            @Valid @RequestBody DictionaryItemRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        DictionaryItemResponse response = dictionaryService.createItem(dictTypeId, request);
        audit(actorUserId, "system.dict.item.create", "dict_item", response.id(), null, response, httpRequest);
        return response;
    }

    @RequirePermission("system.dict.manage")
    @PatchMapping("/api/system/dicts/items/{itemId}")
    DictionaryItemResponse updateItem(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable Long itemId,
            @Valid @RequestBody DictionaryItemUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = authService.currentUserId(bearerToken(authorization));
        DictionaryItemResponse response = dictionaryService.updateItem(itemId, request);
        audit(actorUserId, "system.dict.item.update", "dict_item", itemId, null, response, httpRequest);
        return response;
    }

    private void audit(
            Long actorUserId,
            String actionCode,
            String objectType,
            Long objectId,
            Object beforeData,
            Object afterData,
            HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "system",
                actionCode,
                objectType,
                objectId,
                beforeData,
                afterData,
                "success",
                null,
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                (String) request.getAttribute("crm.traceId")));
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("登录状态已失效");
        }
        return authorization.substring("Bearer ".length());
    }
}
