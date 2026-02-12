package com.example.Qpoint.service;

import com.example.Qpoint.models.Topic;
import com.example.Qpoint.repository.TopicRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class TopicService {

    private final TopicRepository topicRepository;

    public TopicService(TopicRepository topicRepository) {
        this.topicRepository = topicRepository;
    }

    @CacheEvict(value = {"topics", "trendingTopics"}, allEntries = true)
    public Topic createTopic(String name, String description) {
        // Check if topic already exists
        var existingTopic = topicRepository.findByName(name);
        if (existingTopic.isPresent()) {
            throw new RuntimeException("Topic already exists");
        }

        Topic topic = new Topic();
        topic.setName(name);
        topic.setDescription(description);
        topic.setPostCount(0);

        return topicRepository.save(topic);
    }

    public Page<Topic> getAllTopics(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "postCount"));
        return topicRepository.findAll(pageable);
    }

    @Cacheable(value = "topics", key = "#id")
    public Topic getTopicById(Long id) {
        return topicRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Topic not found"));
    }

    @Cacheable(value = "trendingTopics", key = "#limit")
    public List<Topic> getTrendingTopics(int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "postCount"));
        return topicRepository.findAll(pageable).getContent();
    }

    @Cacheable(value = "topics", key = "'all'")
    public Iterable<Topic> getAll() {
        return topicRepository.findAll(Sort.by(Sort.Direction.DESC, "postCount"));
    }

    public Page<Topic> searchTopics(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "postCount"));
        return topicRepository.findByNameContainingIgnoreCase(query, pageable);
    }

    @org.springframework.transaction.annotation.Transactional
    public void refreshPostCounts() {
        topicRepository.updatePostCounts();
    }
}
