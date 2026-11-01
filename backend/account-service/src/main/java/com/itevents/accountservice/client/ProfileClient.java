package com.itevents.accountservice.client;

import com.itevents.accountservice.entity.Role;

import java.util.Map;

public interface ProfileClient {

    void createProfile(Long accountId, Role role, Map<String, Object> profile);

    void deleteProfile(Long accountId);
}