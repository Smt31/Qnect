package com.example.Qpoint;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.PropertySource;

@SpringBootApplication
@PropertySource("classpath:env.properties")
public class QpointApplication {

	public static void main(String[] args) {
		SpringApplication.run(QpointApplication.class, args);
	}

}
