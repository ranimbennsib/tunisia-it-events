package com.itevents.profileservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.itevents.profileservice.entity.Occupation;
import jakarta.validation.constraints.Size;

// ignoreUnknown = false : un champ inconnu (ex. commissionRate, role) donne 400 au lieu d'être ignoré
@JsonIgnoreProperties(ignoreUnknown = false)
public record UpdateProfileRequest(
        // champs USER
        Occupation occupation,
        @Size(max = 150) String institution,
        // champs ORGANIZER
        @Size(max = 150) String organizationName,
        @Size(max = 2000) String description,
        @Size(max = 255) String website,
        @Size(max = 500) String logo
) {
}