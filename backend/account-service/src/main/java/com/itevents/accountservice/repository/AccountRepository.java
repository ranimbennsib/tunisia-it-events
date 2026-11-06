package com.itevents.accountservice.repository;

import com.itevents.accountservice.entity.Account;
import com.itevents.accountservice.entity.AccountStatus;
import com.itevents.accountservice.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account,Long> {
    Optional<Account> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhoneNumber(String phoneNumber);
    boolean existsByRole(Role role);
    @Query("""
            select a from Account a
            where (:role is null or a.role = :role)
              and (:status is null or a.accountStatus = :status)
              and (:search = ''
                   or lower(a.email) like lower(concat('%', :search, '%'))
                   or lower(a.lastName) like lower(concat('%', :search, '%'))
                   or lower(a.firstName) like lower(concat('%', :search, '%')))
            """)
    Page<Account> search(@Param("role") Role role,
                         @Param("status") AccountStatus status,
                         @Param("search") String search,
                         Pageable pageable);

}
