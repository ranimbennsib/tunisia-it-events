package com.itevents.accountservice.repository;

import com.itevents.accountservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User,Long> {
}
