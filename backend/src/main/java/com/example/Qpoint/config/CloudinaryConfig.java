package com.example.Qpoint.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfig {

    @Value("${cloudinary.cloud-name:#{null}}")
    private String cloudName;

    @Value("${cloudinary.api-key:#{null}}")
    private String apiKey;

    @Value("${cloudinary.api-secret:#{null}}")
    private String apiSecret;

    @Bean
    public Cloudinary cloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName != null ? cloudName : System.getenv("CLOUDINARY_CLOUD_NAME"),
                "api_key", apiKey != null ? apiKey : System.getenv("CLOUDINARY_API_KEY"),
                "api_secret", apiSecret != null ? apiSecret : System.getenv("CLOUDINARY_API_SECRET"),
                "secure", true
        ));
    }
}