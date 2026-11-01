package com.itevents.accountservice.controller;

import com.itevents.accountservice.dto.AccountResponse;
import com.itevents.accountservice.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/me")
    public ResponseEntity<AccountResponse> me(Authentication authentication) {
        Long accountId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(accountService.getById(accountId));
    }
}