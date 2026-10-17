package com.itevents.accountservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterOrganizerRequest(
    @NotBlank @Size(max=100)
    String lastName,
    @NotBlank @Size(max=100)
    String firstName,
    @NotBlank @Email
    String email,
    @NotBlank @Size(min =8 , max = 64)
    String password,
    @NotBlank @Pattern(regexp = "\\d{8}")
    String phoneNumber,
    @NotBlank
    String organizationName,
    @NotBlank @Size(max = 1000)
    String description,
    String website,
    @NotBlank
    String logo
){}
