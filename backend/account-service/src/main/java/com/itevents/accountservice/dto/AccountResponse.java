package com.itevents.accountservice.dto;

import com.itevents.accountservice.entity.Account;
import com.itevents.accountservice.entity.AccountStatus;
import com.itevents.accountservice.entity.Role;

import java.time.Instant;

public record AccountResponse(
        Long id,
        String lastName,
        String firstName,
        String email,
        String phoneNumber,
        Role role,
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
                account.getRole(),
                account.getAccountStatus(),
                account.getCreatedAt()
                );
    }
}
