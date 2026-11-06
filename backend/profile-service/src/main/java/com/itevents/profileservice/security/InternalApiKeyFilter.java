package com.itevents.profileservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class InternalApiKeyFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-Internal-Key";

    private final byte[] expectedKey;

    public InternalApiKeyFilter(String apiKey) {
        this.expectedKey = apiKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/internal/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String provided = request.getHeader(HEADER);
        boolean valid = provided != null
                && MessageDigest.isEqual(expectedKey, provided.getBytes(StandardCharsets.UTF_8));

        if (!valid) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Invalid or missing internal key\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}