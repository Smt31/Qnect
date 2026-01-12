package com.example.Qpoint.models;


import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "users",
        indexes = {@Index(name = "idx_users_email", columnList = "email"),
                @Index(name = "idx_users_username", columnList = "username")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long userId;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false,unique = true, length = 80)
    private String username;

    @Column(nullable = false,length = 150)
    private String fullName;

    @Column(length = 13)
    private String mobileNumber;

    @Column(length = 512)
    private String avatarUrl;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(length = 255)
    private String location;

    @Column(length = 255)
    private String passwordHash;

    @Column(nullable = false)
    private Boolean verified = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean allowPublicMessages = false;

    @Column(nullable = false)
    private Integer reputation = 0;

    @Column(nullable = false)
    private Integer followersCount = 0;

    @Column(nullable = false)
    private Integer followingCount = 0;

    @Column(nullable = false)
    private Integer questionsCount = 0;

    @Column(nullable = false)
    private Integer answersCount = 0;



    @Builder.Default
    @Column(columnDefinition = "integer default 0")
    private Integer acceptedAnswersCount = 0;

    @ElementCollection
    @CollectionTable(name = "user_skills", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "skill")
    private List<String> skills;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_topics",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "topic_id")
    )
    @Builder.Default
    private java.util.Set<Topic> topics = new java.util.HashSet<>();

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
