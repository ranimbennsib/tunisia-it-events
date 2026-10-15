package com.itevents.accountservice.repository;

import com.itevents.accountservice.entity.Organizer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizerRepository extends JpaRepository<Organizer,Long> {
}
