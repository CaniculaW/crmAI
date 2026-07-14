alter table crm_contracts
    add constraint ck_crm_contracts_positive_amount
    check (contract_amount > 0);
