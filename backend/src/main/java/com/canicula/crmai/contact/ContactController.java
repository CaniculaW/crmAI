package com.canicula.crmai.contact;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ContactController {

    private final ContactService contactService;
    private final AuditLogService auditLogService;

    ContactController(ContactService contactService, AuditLogService auditLogService) {
        this.contactService = contactService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("contact.create")
    @PostMapping("/api/contacts")
    ContactResponse create(@Valid @RequestBody ContactCreateRequest request, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ContactResponse response = contactService.create(request, actorUserId);
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "contact",
                "contact.create",
                "crm_contact",
                response.id(),
                null,
                Map.of("name", response.name(), "account_id", response.account_id()),
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return response;
    }

    @RequirePermission("contact.read")
    @GetMapping("/api/contacts")
    List<ContactResponse> list(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "contact_type", required = false) String contactType,
            @RequestParam(name = "attitude", required = false) String attitude,
            @RequestParam(name = "relationship_heat", required = false) String relationshipHeat,
            @RequestParam(name = "importance_level", required = false) String importanceLevel,
            @RequestParam(name = "project_role", required = false) String projectRole,
            @RequestParam(name = "last_communication_from", required = false) OffsetDateTime lastCommunicationFrom,
            @RequestParam(name = "last_communication_to", required = false) OffsetDateTime lastCommunicationTo,
            HttpServletRequest httpRequest) {
        ContactListFilter filter = new ContactListFilter(
                keyword,
                accountId,
                contactType,
                attitude,
                relationshipHeat,
                importanceLevel,
                projectRole,
                lastCommunicationFrom,
                lastCommunicationTo);
        return contactService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("contact.read")
    @GetMapping("/api/accounts/{accountId}/contacts")
    List<ContactResponse> listByAccount(@PathVariable Long accountId, HttpServletRequest httpRequest) {
        ContactListFilter filter = new ContactListFilter(
                null,
                accountId,
                null,
                null,
                null,
                null,
                null,
                null,
                null);
        return contactService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("contact.read")
    @GetMapping("/api/contacts/{contactId}")
    ContactResponse detail(@PathVariable Long contactId, HttpServletRequest httpRequest) {
        return contactService.readableDetail(contactId, currentUserId(httpRequest));
    }

    @RequirePermission("contact.update")
    @PatchMapping("/api/contacts/{contactId}")
    ContactResponse update(
            @PathVariable Long contactId,
            @Valid @RequestBody ContactUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ContactResponse response = contactService.update(contactId, request, actorUserId);
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "contact",
                "contact.update",
                "crm_contact",
                response.id(),
                null,
                Map.of("name", response.name(), "account_id", response.account_id()),
                "success",
                null,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                (String) httpRequest.getAttribute("crm.traceId")));
        return response;
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
