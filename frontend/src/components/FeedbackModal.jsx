import './FeedbackModal.css';

const feedbackOptions = [
    {
        emoji: '🐞',
        label: 'Report a Bug',
        desc: 'Something isn\'t working as expected',
        url: 'https://qpoint.canny.io/bug-reports',
    },
    {
        emoji: '💡',
        label: 'Request a Feature',
        desc: 'Suggest a new idea or capability',
        url: 'https://qpoint.canny.io/feature-requests',
    },
    {
        emoji: '🛠',
        label: 'Suggest Improvement',
        desc: 'Help us make something better',
        url: 'https://qpoint.canny.io/improvements',
    },
];

export default function FeedbackModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="feedback-overlay" onClick={onClose}>
            <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
                <div className="feedback-header">
                    <h2>Send Feedback</h2>
                    <p>Let us know how we can improve Qnect</p>
                </div>

                <div className="feedback-options">
                    {feedbackOptions.map((opt) => (
                        <a
                            key={opt.label}
                            href={opt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="feedback-option"
                            onClick={onClose}
                        >
                            <span className="feedback-emoji">{opt.emoji}</span>
                            <div>
                                <div className="feedback-label">{opt.label}</div>
                                <div className="feedback-desc">{opt.desc}</div>
                            </div>
                        </a>
                    ))}
                </div>

                <div className="feedback-footer">
                    <button className="feedback-cancel" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
