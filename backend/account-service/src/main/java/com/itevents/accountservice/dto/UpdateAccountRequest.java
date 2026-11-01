package com.itevents.accountservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateAccountRequest(

        @NotBlank @Size(max = 100)
        String lastName,

        @NotBlank @Size(max = 100)
        String firstName,

        @NotBlank @Pattern(regexp = "\\d{8}")
        String phoneNumber
) {}