package com.example.Qpoint.service;

import sendinblue.ApiClient;
import sendinblue.Configuration;
import sendinblue.auth.ApiKeyAuth;
import sibApi.TransactionalEmailsApi;
import sibModel.SendSmtpEmail;
import sibModel.SendSmtpEmailSender;
import sibModel.SendSmtpEmailTo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BrevoMailService {

    private final TransactionalEmailsApi apiInstance;
    private final String fromEmail;
    private final String fromName;

    public BrevoMailService(
            @Value("${brevo.api.key}") String apiKey,
            @Value("${brevo.from.email}") String fromEmail,
            @Value("${brevo.from.name:Qpoint}") String fromName) {
        
        // Configure API client
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        ApiKeyAuth apiKeyAuth = (ApiKeyAuth) defaultClient.getAuthentication("api-key");
        apiKeyAuth.setApiKey(apiKey);
        
        this.apiInstance = new TransactionalEmailsApi();
        this.fromEmail = fromEmail;
        this.fromName = fromName;
    }

    public void sendOtpEmail(String to, String code) throws Exception {
        String htmlContent = buildOtpEmailHtml(code);
        String textContent = buildOtpEmailText(code);

        SendSmtpEmailSender sender = new SendSmtpEmailSender();
        sender.setEmail(fromEmail);
        sender.setName(fromName);

        SendSmtpEmailTo recipient = new SendSmtpEmailTo();
        recipient.setEmail(to);

        SendSmtpEmail email = new SendSmtpEmail();
        email.setSender(sender);
        email.setTo(List.of(recipient));
        email.setSubject("Your Qpoint OTP Code");
        email.setHtmlContent(htmlContent);
        email.setTextContent(textContent);

        apiInstance.sendTransacEmail(email);
        System.out.println("Email sent successfully via Brevo to: " + to);
    }

    private String buildOtpEmailHtml(String code) {
        return String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Qpoint</h1>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; margin-top: 0;">Your OTP Code</h2>
                        <p style="font-size: 16px; color: #666;">Use the following code to complete your verification:</p>
                        <div style="background-color: #fff; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                            <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">%s</span>
                        </div>
                        <p style="font-size: 14px; color: #999; margin-bottom: 0;">
                            This code is valid for <strong>5 minutes</strong>.<br>
                            If you didn't request this code, please ignore this email.
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                        <p>&copy; 2026 Qpoint. All rights reserved.</p>
                    </div>
                </body>
                </html>
                """, code);
    }

    private String buildOtpEmailText(String code) {
        return String.format("""
                Your Qpoint OTP Code
                
                Your OTP code is: %s
                
                This code is valid for 30 Seconds.
                
                © 2026 Qpoint. All rights reserved.
                """, code);
    }
}
