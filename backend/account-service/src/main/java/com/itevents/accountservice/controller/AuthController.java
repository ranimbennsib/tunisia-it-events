package com.itevents.accountservice.controller;

import com.itevents.accountservice.dto.AccountResponse;
import com.itevents.accountservice.dto.LoginRequest;
import com.itevents.accountservice.dto.RegisterOrganizerRequest;
import com.itevents.accountservice.dto.RegisterUserRequest;
import com.itevents.accountservice.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register/user")
    public ResponseEntity<AccountResponse> registerUser(
            @Valid @RequestBody RegisterUserRequest request) {
        AccountResponse response = authService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/register/organizer")
    public ResponseEntity<AccountResponse> registerOrganizer(
            @Valid @RequestBody RegisterOrganizerRequest request) {
        AccountResponse response = authService.registerOrganizer(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }


    @PostMapping("/login")
    public ResponseEntity<AccountResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}