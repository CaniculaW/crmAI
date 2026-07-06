package com.canicula.crmai.ai;

import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.activity.ActivityResponse;
import com.canicula.crmai.contact.ContactResponse;
import com.canicula.crmai.contract.ContractResponse;
import com.canicula.crmai.opportunity.OpportunityResponse;
import com.canicula.crmai.receivable.ReceivablePlanResponse;
import com.canicula.crmai.solution.SolutionDocumentResponse;
import java.util.List;

public record AiAccountContextResponse(
        AccountResponse account,
        List<ContactResponse> contacts,
        List<OpportunityResponse> opportunities,
        List<ActivityResponse> recent_activities,
        List<SolutionDocumentResponse> solutions,
        List<ContractResponse> contracts,
        List<ReceivablePlanResponse> receivables,
        List<AiEvidenceItem> evidence) {
}
