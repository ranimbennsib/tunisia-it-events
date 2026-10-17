package com.itevents.accountservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterOrganizerRequest(
    @NotBlank @Size(max=100)
    String LastName,
    @NotBlank @Size(max=100)
    String FirstName,
    @NotBlank @Email
    String email,
    @NotBlank @Size(min =8 , max = 64)
    String password,
    @NotBlank @Pattern(regexp = "\\d{8}")
    String phoneNumber,
    @NotBlank
    String organizationName,

    String website,
    @NotBlank
    String logo
){}
