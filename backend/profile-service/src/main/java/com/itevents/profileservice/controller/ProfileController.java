package com.itevents.profileservice.controller;

import com.itevents.profileservice.dto.ProfileResponse;
import com.itevents.profileservice.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.itevents.profileservice.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/me")
    public ProfileResponse me(Authentication authentication) {
        // L'identité vient uniquement du JWT (principal = accountId), jamais de l'URL.
        Long accountId = (Long) authentication.getPrincipal();
        return profileService.get(accountId);
    }
    @PutMapping("/me")
    public ProfileResponse updateMe(Authentication authentication,
                                    @Valid @RequestBody UpdateProfileRequest request) {
        Long accountId = (Long) authentication.getPrincipal();
        return profileService.update(accountId, request);
    }
}