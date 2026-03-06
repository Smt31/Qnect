package com.example.Qpoint.service;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostScoreService {

    private final JdbcTemplate jdbcTemplate;

    public PostScoreService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Compute the hotness score for posts created in the last 30 days.
     * Base Score = log(10 + upvotes + 5*comments + 0.1*views)
     * Time Decay = (1 + age_in_hours / 12) ^ -1.5
     *
     * Runs on startup and every 5 minutes (300,000 ms).
     */
    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(fixedRate = 300000, initialDelay = 300000)
    @Transactional
    public void calculateHotnessScores() {
        String query = """
            UPDATE posts p
            SET base_hotness_score = 
                LN(10 + (p.upvotes * 1.0) + (p.comments_count * 5.0) + (p.views_count * 0.1)) 
                * POWER(1 + EXTRACT(EPOCH FROM (NOW() - p.created_at))/3600 / 12, -1.5)
            WHERE p.created_at > NOW() - INTERVAL '90 days'
        """;

        int updatedCount = jdbcTemplate.update(query);
        System.out.println("PostScoreService: updated base_hotness_score for " + updatedCount + " posts.");
    }
}
