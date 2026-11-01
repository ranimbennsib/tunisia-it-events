package com.itevents.accountservice.security;

import com.itevents.accountservice.entity.Account;
import com.itevents.accountservice.entity.Role;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtServiceTest {

    private final JwtService jwt = new JwtService("test-secret-test-secret-test-secret-1234", 30, 7);

    private Account account(long id, Role role) {
        Account account = new Account();
        account.setId(id);
        account.setRole(role);
        return account;
    }

    @Test
    void generatesAndParsesAccessToken() {
        Claims claims = jwt.parse(jwt.generateAccessToken(account(5L, Role.USER)));

        assertEquals("5", claims.getSubject());
        assertEquals("USER", claims.get("role", String.class));
        assertEquals("access", claims.get("type", String.class));
    }

    @Test
    void generatesRefreshToken() {
        Claims claims = jwt.parse(jwt.generateRefreshToken(account(5L, Role.USER)));

        assertEquals("refresh", claims.get("type", String.class));
    }

    @Test
    void tokenContainsOrganizerRole() {
        Claims claims = jwt.parse(jwt.generateAccessToken(account(8L, Role.ORGANIZER)));

        assertEquals("ORGANIZER", claims.get("role", String.class));
    }
}