package com.itevents.profileservice.repository;

import com.itevents.profileservice.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, Long> {
}