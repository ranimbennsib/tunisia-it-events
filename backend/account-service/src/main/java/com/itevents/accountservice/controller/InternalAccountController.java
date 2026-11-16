package com.itevents.accountservice.controller;

import com.itevents.accountservice.dto.AccountContactResponse;
import com.itevents.accountservice.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.itevents.accountservice.dto.AccountIdsResponse;
import org.springframework.web.bind.annotation.RequestParam;
@RestController
@RequestMapping("/internal/accounts")
@RequiredArgsConstructor
public class InternalAccountController {

    private final AccountService accountService;

    @GetMapping("/{id}/contact")
    public ResponseEntity<AccountContactResponse> contact(@PathVariable Long id) {
        return ResponseEntity.ok(accountService.getContact(id));
    }
    
    @GetMapping("/user-ids")
    public ResponseEntity<AccountIdsResponse> userIds(@RequestParam(defaultValue = "0") int page,
                                                      @RequestParam(defaultValue = "100") int size) {
        return ResponseEntity.ok(accountService.getActiveUserIds(page, size));
    }
}