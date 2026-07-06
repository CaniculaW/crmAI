package com.canicula.crmai.attachment;

import com.canicula.crmai.audit.AuditLogEntry;
import com.canicula.crmai.audit.AuditLogService;
import com.canicula.crmai.auth.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class AttachmentController {

    private final AttachmentService attachmentService;
    private final AuditLogService auditLogService;

    AttachmentController(AttachmentService attachmentService, AuditLogService auditLogService) {
        this.attachmentService = attachmentService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("attachment.create")
    @PostMapping("/api/attachments")
    AttachmentResponse create(@Valid @RequestBody AttachmentCreateRequest request, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        AttachmentResponse response = attachmentService.create(request, actorUserId);
        audit(actorUserId, "attachment.create", response, httpRequest);
        return response;
    }

    @RequirePermission("attachment.create")
    @PostMapping(value = "/api/attachments/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    AttachmentResponse upload(
            @RequestParam(name = "object_type") String objectType,
            @RequestParam(name = "object_id") Long objectId,
            @RequestParam(name = "file") MultipartFile file,
            @RequestParam(name = "file_type", required = false) String fileType,
            @RequestParam(name = "remark", required = false) String remark,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        AttachmentResponse response = attachmentService.upload(objectType, objectId, file, fileType, remark, actorUserId);
        audit(actorUserId, "attachment.create", response, httpRequest);
        return response;
    }

    @RequirePermission("attachment.read")
    @GetMapping("/api/attachments")
    List<AttachmentResponse> list(
            @RequestParam(name = "object_type") String objectType,
            @RequestParam(name = "object_id") Long objectId,
            HttpServletRequest httpRequest) {
        return attachmentService.listByObject(objectType, objectId, currentUserId(httpRequest));
    }

    @RequirePermission("attachment.read")
    @GetMapping("/api/attachments/{attachmentId}/download")
    ResponseEntity<Resource> download(@PathVariable Long attachmentId, HttpServletRequest httpRequest) throws IOException {
        AttachmentService.AttachmentDownload download = attachmentService.download(attachmentId, currentUserId(httpRequest));
        Resource resource = new UrlResource(download.path().toUri());
        return ResponseEntity
                .ok()
                .contentType(mediaType(download.attachment().mime_type()))
                .contentLength(Files.size(download.path()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(download.attachment().file_name(), StandardCharsets.UTF_8)
                                .build()
                                .toString())
                .body(resource);
    }

    @RequirePermission("attachment.delete")
    @DeleteMapping("/api/attachments/{attachmentId}")
    Map<String, Boolean> delete(@PathVariable Long attachmentId, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        AttachmentResponse response = attachmentService.delete(attachmentId, actorUserId);
        audit(actorUserId, "attachment.delete", response, httpRequest);
        return Map.of("deleted", true);
    }

    private void audit(Long actorUserId, String actionCode, AttachmentResponse response, HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "attachment",
                actionCode,
                "crm_attachment",
                response.id(),
                null,
                Map.of(
                        "object_type", response.object_type(),
                        "object_id", response.object_id(),
                        "file_name", response.file_name()),
                "success",
                null,
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                (String) request.getAttribute("crm.traceId")));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }

    private static MediaType mediaType(String mimeType) {
        if (mimeType == null || mimeType.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(mimeType);
        } catch (IllegalArgumentException exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
