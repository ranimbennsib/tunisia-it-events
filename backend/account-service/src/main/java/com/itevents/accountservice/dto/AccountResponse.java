package com.itevents.accountservice.dto;

import com.itevents.accountservice.entity.Account;
import com.itevents.accountservice.entity.AccountStatus;

import java.time.Instant;

public record AccountResponse(
        Long id,
        String lastName,
        String firstName,
        String email,
        String phoneNumber,
        AccountStatus accountStatus,
        Instant createdAt

) {
    public static AccountResponse from (Account account){
        return new AccountResponse(
                account.getId(),
                account.getLastName(),
                account.getFirstName(),
                account.getEmail(),
                account.getPhoneNumber(),
                account.getAccountStatus(),
                account.getCreatedAt()
                );
    }
}
