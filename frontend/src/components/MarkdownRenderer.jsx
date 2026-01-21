import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';
import './MarkdownRenderer.css';

/**
 * MarkdownRenderer component for displaying formatted Markdown content
 * from the Gemini API with syntax highlighting support.
 * 
 * @param {Object} props
 * @param {string} props.content - The Markdown string to render
 * @param {string} props.className - Optional additional CSS classes
 */
const MarkdownRenderer = ({ content, className = '' }) => {
    const [copiedCode, setCopiedCode] = useState(null);

    // Helper function to extract text from React children
    const getTextContent = (children) => {
        if (typeof children === 'string') {
            return children;
        }
        if (Array.isArray(children)) {
            return children.map(getTextContent).join('');
        }
        if (children?.props?.children) {
            return getTextContent(children.props.children);
        }
        return '';
    };

    const handleCopyCode = async (code, index) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(index);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    return (
        <div className={`markdown-renderer ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    // Custom renderers for better styling control
                    p: ({ node, ...props }) => <p className="markdown-paragraph" {...props} />,
                    ul: ({ node, ...props }) => <ul className="markdown-list" {...props} />,
                    ol: ({ node, ...props }) => <ol className="markdown-ordered-list" {...props} />,
                    li: ({ node, ...props }) => <li className="markdown-list-item" {...props} />,
                    code: ({ node, inline, className, children, ...props }) => {
                        if (inline) {
                            return (
                                <code className="markdown-inline-code" {...props}>
                                    {children}
                                </code>
                            );
                        }

                        // For code blocks, extract the code text properly
                        const codeContent = getTextContent(children).replace(/\n$/, '');

                        // If it's a very short code block (likely meant to be inline), render it as inline
                        const lines = codeContent.split('\n');
                        const isSingleLine = lines.length === 1;
                        const isShort = codeContent.length < 60;

                        if (isSingleLine && isShort) {
                            return (
                                <code className="markdown-inline-code" {...props}>
                                    {children}
                                </code>
                            );
                        }

                        const codeBlockIndex = node?.position?.start?.line || Math.random();

                        return (
                            <div className="markdown-code-block-wrapper">
                                <button
                                    onClick={() => handleCopyCode(codeContent, codeBlockIndex)}
                                    className="code-copy-button"
                                    title={copiedCode === codeBlockIndex ? "Copied!" : "Copy code"}
                                >
                                    {copiedCode === codeBlockIndex ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                                <pre className="markdown-code-block">
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                </pre>
                            </div>
                        );
                    },
                    pre: ({ node, children, ...props }) => {
                        // Don't wrap in pre if it's already wrapped by our code component
                        return <>{children}</>;
                    },
                    h1: ({ node, ...props }) => <h1 className="markdown-h1" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="markdown-h2" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="markdown-h3" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="markdown-blockquote" {...props} />,
                    a: ({ node, ...props }) => <a className="markdown-link" target="_blank" rel="noopener noreferrer" {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
