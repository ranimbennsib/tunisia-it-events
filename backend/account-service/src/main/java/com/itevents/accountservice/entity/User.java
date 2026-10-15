package com.itevents.accountservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name= "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User extends Account{
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Occupation occupation = Occupation.Student;

    @Column(nullable = false)
    private String institution;
}
