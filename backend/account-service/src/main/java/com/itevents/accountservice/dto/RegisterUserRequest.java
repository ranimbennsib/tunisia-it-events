package com.itevents.accountservice.dto;

import com.itevents.accountservice.entity.Occupation;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterUserRequest(

        @NotBlank @Size(max = 100)
        String lastName,

        @NotBlank @Size(max = 100)
        String firstName,

        @NotBlank @Email
        String email,

        @NotBlank @Size(min = 8, max = 64)
        String password,

        @NotBlank @Pattern(regexp = "\\d{8}")
        String phoneNumber,

        @NotNull
        Occupation occupation,

        @NotBlank
        String institution
) {}