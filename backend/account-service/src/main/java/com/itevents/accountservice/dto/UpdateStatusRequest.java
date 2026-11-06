package com.itevents.accountservice.dto;

import com.itevents.accountservice.entity.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(
        @NotNull
        AccountStatus status
) {}