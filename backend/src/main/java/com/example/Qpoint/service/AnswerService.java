package com.example.Qpoint.service;

import com.example.Qpoint.dto.AnswerResponseDto;
import com.example.Qpoint.dto.CreateAnswerRequest;
import com.example.Qpoint.models.Answer;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.AnswerRepository;
import com.example.Qpoint.repository.PostRepository;
import com.example.Qpoint.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnswerService {

    private final AnswerRepository answerRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public AnswerService(AnswerRepository answerRepository,
                         PostRepository postRepository,
                         UserRepository userRepository) {
        this.answerRepository = answerRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public AnswerResponseDto createAnswer(Long questionId, Long authorId, CreateAnswerRequest request) {
        Post post = postRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Answer answer = new Answer();
        answer.setPost(post);
        answer.setAuthor(author);
        answer.setContent(request.getContent());

        Answer saved = answerRepository.save(answer);

        // Update post answer count
        post.setAnswerCount(post.getAnswerCount() + 1);
        postRepository.save(post);
        
        // Update user answer count
        author.setAnswersCount(author.getAnswersCount() + 1);
        
        // Add reputation for posting an answer (+3)
        author.setReputation(author.getReputation() + 3);
        userRepository.save(author);

        return convertToDto(saved);
    }

    @Transactional(readOnly = true)
    public Page<AnswerResponseDto> getUserAnswers(Long userId, int page, int size) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return answerRepository.findByAuthorOrderByCreatedAtDesc(user, pageable)
                .map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public Page<AnswerResponseDto> getAnswersByQuestion(Long questionId, int page, int size) {
        Post post = postRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return answerRepository.findByPostOrderByCreatedAtDesc(post, pageable)
                .map(this::convertToDto);
    }

    @Transactional
    public AnswerResponseDto updateAnswer(Long answerId, Long userId, CreateAnswerRequest request) {
        Answer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));

        if (!answer.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to update this answer");
        }

        answer.setContent(request.getContent());
        Answer saved = answerRepository.save(answer);
        return convertToDto(saved);
    }

    @Transactional
    public void deleteAnswer(Long answerId, Long userId) {
        Answer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));

        if (!answer.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to delete this answer");
        }

        Post post = answer.getPost();
        post.setAnswerCount(Math.max(0, post.getAnswerCount() - 1));
        postRepository.save(post);
        
        User author = answer.getAuthor();
        author.setAnswersCount(Math.max(0, author.getAnswersCount() - 1));
        userRepository.save(author);

        answerRepository.delete(answer);
    }
    
    @Transactional
    public AnswerResponseDto acceptAnswer(Long answerId, Long userId) {
        Answer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));
        
        Post post = answer.getPost();
        
        // Only question author can accept answer
        if (!post.getAuthor().getUserId().equals(userId)) {
             throw new RuntimeException("Only the question author can accept an answer");
        }
        
        answer.setAccepted(true);
        Answer saved = answerRepository.save(answer);
        
        User author = answer.getAuthor();
        author.setAcceptedAnswersCount(author.getAcceptedAnswersCount() + 1);
        // Bonus reputation for accepted answer (example: +15)
        author.setReputation(author.getReputation() + 15);
        userRepository.save(author);
        
        return convertToDto(saved);
    }

    private AnswerResponseDto convertToDto(Answer answer) {
        AnswerResponseDto dto = new AnswerResponseDto();
        dto.setId(answer.getId());
        dto.setPostId(answer.getPost().getId());
        dto.setContent(answer.getContent());
        dto.setUpvotes(answer.getUpvotes());
        dto.setDownvotes(answer.getDownvotes());
        dto.setAccepted(answer.getAccepted());
        dto.setCommentsCount(answer.getCommentsCount());
        dto.setCreatedAt(answer.getCreatedAt());
        dto.setUpdatedAt(answer.getUpdatedAt());

        AnswerResponseDto.AuthorDto authorDto = new AnswerResponseDto.AuthorDto();
        authorDto.setId(answer.getAuthor().getUserId());
        authorDto.setFullName(answer.getAuthor().getFullName());
        authorDto.setAvatarUrl(answer.getAuthor().getAvatarUrl());
        authorDto.setUsername(answer.getAuthor().getUsername());
        authorDto.setReputation(answer.getAuthor().getReputation());
        dto.setAuthor(authorDto);

        return dto;
    }
}