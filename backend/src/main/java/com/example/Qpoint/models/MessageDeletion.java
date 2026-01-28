package com.example.Qpoint.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "message_deletions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageDeletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "deletion_type", nullable = false, length = 20)
    private DeletionType deletionType;

    @Column(name = "deleted_at", nullable = false)
    private LocalDateTime deletedAt;

    public enum DeletionType {
        FOR_ME,
        FOR_EVERYONE
    }
}
