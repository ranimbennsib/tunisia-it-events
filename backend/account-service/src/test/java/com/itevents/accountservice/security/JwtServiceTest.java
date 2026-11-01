package com.itevents.accountservice.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtServiceTest {

    @Test
    void generatesAndParsesAccessToken() {
        JwtService jwt = new JwtService("test-secret-test-secret-test-secret-1234", 30, 7);
        User user = new User();
        user.setId(5L);

        String token = jwt.generateAccessToken(user);
        Claims claims = jwt.parse(token);

        assertEquals("5", claims.getSubject());
        assertEquals("USER", claims.get("role", String.class));
        assertEquals("access", claims.get("type", String.class));
    }

    @Test
    void generatesRefreshToken() {
        JwtService jwt = new JwtService("test-secret-test-secret-test-secret-1234", 30, 7);
        User user = new User();
        user.setId(5L);

        Claims claims = jwt.parse(jwt.generateRefreshToken(user));

        assertEquals("refresh", claims.get("type", String.class));
    }
}