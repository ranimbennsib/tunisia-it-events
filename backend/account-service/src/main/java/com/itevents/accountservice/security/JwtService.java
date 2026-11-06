package com.itevents.accountservice.security;

import com.itevents.accountservice.entity.Account;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration accessDuration;
    private final Duration refreshDuration;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.access-expiration-minutes}") long accessMinutes,
                      @Value("${jwt.refresh-expiration-days}") long refreshDays) {
        if (secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 characters");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessDuration = Duration.ofMinutes(accessMinutes);
        this.refreshDuration = Duration.ofDays(refreshDays);
    }

    public String generateAccessToken(Account account) {
        return buildToken(account, "access", accessDuration);
    }

    public String generateRefreshToken(Account account) {
        return buildToken(account, "refresh", refreshDuration);
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private String buildToken(Account account, String type, Duration duration) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(account.getId()))
                .claim("role", account.getRole().name())
                .claim("type", type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(duration)))
                .signWith(key)
                .compact();
    }
}