package com.itevents.accountservice.controller;

import com.itevents.accountservice.dto.AccountResponse;
import com.itevents.accountservice.dto.ChangePasswordRequest;
import com.itevents.accountservice.dto.UpdateAccountRequest;
import com.itevents.accountservice.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/me")
    public ResponseEntity<AccountResponse> me(Authentication authentication) {
        return ResponseEntity.ok(accountService.getById(currentAccountId(authentication)));
    }

    @PutMapping("/me")
    public ResponseEntity<AccountResponse> update(Authentication authentication,
                                                  @Valid @RequestBody UpdateAccountRequest request) {
        return ResponseEntity.ok(accountService.update(currentAccountId(authentication), request));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(Authentication authentication,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        accountService.changePassword(currentAccountId(authentication), request);
        return ResponseEntity.noContent().build();
    }

    private Long currentAccountId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}