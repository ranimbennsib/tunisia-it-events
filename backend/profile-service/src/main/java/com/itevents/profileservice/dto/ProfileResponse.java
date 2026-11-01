package com.itevents.profileservice.dto;

import com.itevents.profileservice.entity.Occupation;

import java.math.BigDecimal;
import java.time.Instant;

public record ProfileResponse(
        Long accountId,
        ProfileRole role,
        Occupation occupation,
        String institution,
        String organizationName,
        String description,
        String website,
        String logo,
        BigDecimal commissionRate,
        Instant createdAt
) {
}