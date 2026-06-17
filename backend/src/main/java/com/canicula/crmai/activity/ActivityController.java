package com.canicula.crmai.activity;

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
public class ActivityController {

    private final ActivityService activityService;
    private final AuditLogService auditLogService;

    ActivityController(ActivityService activityService, AuditLogService auditLogService) {
        this.activityService = activityService;
        this.auditLogService = auditLogService;
    }

    @RequirePermission("activity.create")
    @PostMapping("/api/activities")
    ActivityResponse create(@Valid @RequestBody ActivityCreateRequest request, HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ActivityResponse response = activityService.create(request, actorUserId);
        audit(actorUserId, "activity.create", response, httpRequest);
        return response;
    }

    @RequirePermission("activity.read")
    @GetMapping("/api/activities")
    List<ActivityResponse> list(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "account_id", required = false) Long accountId,
            @RequestParam(name = "opportunity_id", required = false) Long opportunityId,
            @RequestParam(name = "owner_user_id", required = false) Long ownerUserId,
            @RequestParam(name = "participant_user_id", required = false) Long participantUserId,
            @RequestParam(name = "activity_type", required = false) String activityType,
            @RequestParam(name = "activity_status", required = false) String activityStatus,
            @RequestParam(name = "activity_result", required = false) String activityResult,
            @RequestParam(name = "risk_type", required = false) String riskType,
            @RequestParam(name = "activity_from", required = false) OffsetDateTime activityFrom,
            @RequestParam(name = "activity_to", required = false) OffsetDateTime activityTo,
            @RequestParam(name = "overdue", required = false) Boolean overdue,
            @RequestParam(name = "include_in_weekly_progress", required = false) Boolean includeInWeeklyProgress,
            HttpServletRequest httpRequest) {
        ActivityListFilter filter = new ActivityListFilter(
                keyword,
                accountId,
                opportunityId,
                ownerUserId,
                participantUserId,
                activityType,
                activityStatus,
                activityResult,
                riskType,
                activityFrom,
                activityTo,
                overdue,
                includeInWeeklyProgress);
        return activityService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("activity.read")
    @GetMapping("/api/accounts/{accountId}/activities")
    List<ActivityResponse> listByAccount(@PathVariable Long accountId, HttpServletRequest httpRequest) {
        ActivityListFilter filter = new ActivityListFilter(
                null, accountId, null, null, null, null, null, null, null, null, null, null, null);
        return activityService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("activity.read")
    @GetMapping("/api/opportunities/{opportunityId}/activities")
    List<ActivityResponse> listByOpportunity(@PathVariable Long opportunityId, HttpServletRequest httpRequest) {
        ActivityListFilter filter = new ActivityListFilter(
                null, null, opportunityId, null, null, null, null, null, null, null, null, null, null);
        return activityService.readableList(currentUserId(httpRequest), filter);
    }

    @RequirePermission("activity.read")
    @GetMapping("/api/activities/{activityId}")
    ActivityResponse detail(@PathVariable Long activityId, HttpServletRequest httpRequest) {
        return activityService.readableDetail(activityId, currentUserId(httpRequest));
    }

    @RequirePermission("activity.update")
    @PatchMapping("/api/activities/{activityId}")
    ActivityResponse update(
            @PathVariable Long activityId,
            @Valid @RequestBody ActivityUpdateRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ActivityResponse response = activityService.update(activityId, request, actorUserId);
        audit(actorUserId, "activity.update", response, httpRequest);
        return response;
    }

    @RequirePermission("activity.complete")
    @PostMapping("/api/activities/{activityId}/complete")
    ActivityResponse complete(
            @PathVariable Long activityId,
            @Valid @RequestBody ActivityCompleteRequest request,
            HttpServletRequest httpRequest) {
        Long actorUserId = currentUserId(httpRequest);
        ActivityResponse response = activityService.complete(activityId, request, actorUserId);
        audit(actorUserId, "activity.complete", response, httpRequest);
        return response;
    }

    private void audit(Long actorUserId, String actionCode, ActivityResponse response, HttpServletRequest request) {
        auditLogService.record(new AuditLogEntry(
                actorUserId,
                "activity",
                actionCode,
                "crm_sales_activity",
                response.id(),
                null,
                Map.of("subject", response.subject(), "account_id", response.account_id()),
                "success",
                null,
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                (String) request.getAttribute("crm.traceId")));
    }

    private static Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("crm.currentUserId");
    }
}
