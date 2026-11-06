package com.itevents.profileservice.dto;

import com.itevents.profileservice.entity.Occupation;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateProfileRequest(
        @NotNull Long accountId,
        @NotNull ProfileRole role,
        // USER
        Occupation occupation,
        @Size(max = 150) String institution,
        // ORGANIZER
        @Size(max = 150) String organizationName,
        @Size(max = 2000) String description,
        @Size(max = 255) String website,
        @Size(max = 500) String logo
) {
}
