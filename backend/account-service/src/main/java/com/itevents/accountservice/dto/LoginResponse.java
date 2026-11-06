package com.itevents.accountservice.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        AccountResponse account
) { }
