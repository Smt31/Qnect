package com.example.Qpoint.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "posts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Post {

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    @Builder.Default
    private PostType type = PostType.QUESTION;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    // Optional image URL for featured/preview cards
    @Column(length = 2048)
    private String imageUrl;

    // External URL for NEWS_DISCUSSION posts (links to news article)
    @Column(length = 2048)
    private String externalUrl;

    @ElementCollection
    @CollectionTable(name = "post_tags", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "tag")
    private List<String> tags;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "post_topics",
        joinColumns = @JoinColumn(name = "post_id"),
        inverseJoinColumns = @JoinColumn(name = "topic_id")
    )
    @org.hibernate.annotations.BatchSize(size = 25)
    @Builder.Default
    private java.util.Set<Topic> topics = new java.util.HashSet<>();

    @Builder.Default
    @Column(nullable = false)
    private Integer upvotes = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer downvotes = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer commentsCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer answerCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer viewsCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Builder.Default
    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Bookmark> bookmarks;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostView> postViews;

    @OneToMany(
            mappedBy = "question",   // MUST match field name in AnswerRequest
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<AnswerRequest> answerRequests = new ArrayList<>();


    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}