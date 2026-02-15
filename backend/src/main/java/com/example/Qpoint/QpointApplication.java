package com.example.Qpoint;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;


@SpringBootApplication
@org.springframework.cache.annotation.EnableCaching
public class QpointApplication {

	public static void main(String[] args) {
		SpringApplication.run(QpointApplication.class, args);
	}

}
