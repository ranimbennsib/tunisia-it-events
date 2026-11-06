package com.itevents.profileservice.controller;

import com.itevents.profileservice.dto.CreateProfileRequest;
import com.itevents.profileservice.dto.ProfileResponse;
import com.itevents.profileservice.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/profiles")
@RequiredArgsConstructor
public class InternalProfileController {

    private final ProfileService profileService;

    @PostMapping
    public ResponseEntity<ProfileResponse> create(@Valid @RequestBody CreateProfileRequest request) {
        ProfileService.CreationResult result = profileService.create(request);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.profile());
    }
    @DeleteMapping("/{accountId}")
    public ResponseEntity<Void> delete(@PathVariable Long accountId) {
        profileService.delete(accountId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{accountId}")
    public ProfileResponse get(@PathVariable Long accountId) {
        return profileService.get(accountId);
    }
}