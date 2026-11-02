package com.itevents.accountservice.controller;

import com.itevents.accountservice.dto.AccountResponse;
import com.itevents.accountservice.dto.PageResponse;
import com.itevents.accountservice.entity.AccountStatus;
import com.itevents.accountservice.entity.Role;
import com.itevents.accountservice.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.itevents.accountservice.dto.UpdateStatusRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
@RestController
@RequestMapping("/api/admin/accounts")
@RequiredArgsConstructor
public class AdminAccountController {

    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<PageResponse<AccountResponse>> list(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(accountService.search(role, status, search, page, size));
    }
    @PatchMapping("/{id}/status")
    public ResponseEntity<AccountResponse> updateStatus(@PathVariable Long id,
                                                        @Valid @RequestBody UpdateStatusRequest request,
                                                        Authentication authentication) {
        Long adminId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(accountService.updateStatus(adminId, id, request.status()));
    }
}