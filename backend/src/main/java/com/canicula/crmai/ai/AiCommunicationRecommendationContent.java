package com.canicula.crmai.ai;

import java.util.List;

public record AiCommunicationRecommendationContent(
        Long opportunity_id,
        Long account_id,
        Long contact_id,
        Long owner_department_id,
        Long owner_user_id,
        String opportunity_name,
        String account_name,
        String contact_name,
        String contact_title,
        List<String> recommended_channels,
        List<String> tone,
        List<String> key_messages,
        List<String> timing,
        List<String> escalation_path,
        List<String> do_not_say,
        String opening_message,
        List<AiEvidenceItem> evidence,
        Integer source_activity_count,
        Integer source_evidence_count) {
}
