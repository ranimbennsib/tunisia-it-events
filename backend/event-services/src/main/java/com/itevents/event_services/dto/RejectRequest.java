package com.itevents.event_services.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RejectRequest(
        @NotBlank String reason,
        @NotNull Long adminId
) {}