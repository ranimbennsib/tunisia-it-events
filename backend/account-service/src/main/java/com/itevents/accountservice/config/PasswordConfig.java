package com.itevents.accountservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration//pour lire cette classe au demerage
public class PasswordConfig {
    //permet de hacher le mot de passe apres dans le bases de donnee
   @Bean//l’objet renvoyé par la méthode est créé une seule fois, puis injecté partout où on le demande.
    public PasswordEncoder passwordEncoder(){
       return new BCryptPasswordEncoder();
   }

}
