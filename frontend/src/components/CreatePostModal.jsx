import { useState, useRef, useEffect } from 'react';
import { useCurrentUser, useCreateQuestion } from '../api/queryHooks';
import { getAuthToken, API_URL } from '../api';
import RefineWithCue from './RefineWithCue';
import { useModal } from '../context/ModalContext';

export default function CreatePostModal() {
    const { isPostModalOpen, closePostModal } = useModal();
    const { data: currentUser } = useCurrentUser();

    const [activeCreateTab, setActiveCreateTab] = useState('QUESTION'); // 'QUESTION' or 'POST'
    const [questionTitle, setQuestionTitle] = useState('');
    const [questionContent, setQuestionContent] = useState('');
    const [tags, setTags] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Refine with CUE state
    const [refineOpen, setRefineOpen] = useState(false);

    const createQuestionMutation = useCreateQuestion();

    // Reset form when modal opens
    useEffect(() => {
        if (isPostModalOpen) {
            setQuestionTitle('');
            setQuestionContent('');
            setTags('');
            setImageUrl('');
            setActiveCreateTab('QUESTION');
        }
    }, [isPostModalOpen]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isPostModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isPostModalOpen]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const token = getAuthToken();
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            setImageUrl(data.url);
        } catch (err) {
            console.error(err);
            alert('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmitQuestion = async (e) => {
        e.preventDefault();
        if (!questionTitle.trim()) return;

        try {
            setCreateLoading(true);
            const parsedTags = tags
                .split(',')
                .map(t => t.trim())
                .map(t => t.trim())
                .filter(Boolean);

            if (parsedTags.length === 0) {
                alert('Please add at least one topic (tag) to your question.');
                setCreateLoading(false);
                return;
            }

            const payload = {
                title: questionTitle.trim(),
                content: questionContent.trim(),
                tags: parsedTags,
                imageUrl: imageUrl.trim() || null,
                type: activeCreateTab
            };

            await createQuestionMutation.mutateAsync(payload);

            // Reset and close
            setQuestionTitle('');
            setQuestionContent('');
            setTags('');
            setImageUrl('');
            closePostModal();
        } catch (err) {
            console.error(err);
            alert(err?.message || 'Failed to post question');
        } finally {
            setCreateLoading(false);
        }
    };

    if (!isPostModalOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header with Tabs */}
                <div className="flex border-b border-gray-100 relative">
                    <button
                        className={`flex-1 py-4 text-center font-semibold text-sm transition-colors relative ${activeCreateTab === 'QUESTION' ? 'text-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setActiveCreateTab('QUESTION')}
                    >
                        Add Question
                        {activeCreateTab === 'QUESTION' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
                    </button>
                    <button
                        className={`flex-1 py-4 text-center font-semibold text-sm transition-colors relative ${activeCreateTab === 'POST' ? 'text-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setActiveCreateTab('POST')}
                    >
                        Create Post
                        {activeCreateTab === 'POST' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
                    </button>
                    <button
                        onClick={closePostModal}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {/* User Context */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-sm">
                            {currentUser?.avatarUrl ? (
                                <img src={currentUser.avatarUrl} alt="Me" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span>{currentUser?.fullName?.charAt(0) || 'M'}</span>
                            )}
                        </div>
                        <span className="font-semibold text-gray-700">{currentUser?.fullName || 'Me'}</span>
                    </div>

                    <form onSubmit={handleSubmitQuestion} className="flex flex-col gap-4">
                        <div>
                            <input
                                type="text"
                                value={questionTitle}
                                onChange={(e) => setQuestionTitle(e.target.value)}
                                placeholder={activeCreateTab === 'QUESTION' ? 'Start your question with "What", "How", "Why", etc.' : "Post title"}
                                className="w-full text-lg font-semibold placeholder-gray-400 border-b border-gray-200 pb-2 focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <textarea
                                value={questionContent}
                                onChange={(e) => setQuestionContent(e.target.value)}
                                placeholder={activeCreateTab === 'QUESTION' ? "Add context to your question (optional)" : "What do you want to share?"}
                                className="w-full h-32 resize-none placeholder-gray-400 focus:outline-none text-gray-600 bg-transparent"
                            />
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex items-center gap-3">
                            <input
                                type="text"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="Image URL (optional)"
                                className="flex-1 bg-transparent text-sm focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center gap-2 text-gray-600 text-sm font-medium px-3 py-1 bg-white rounded border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                                {isUploading ? (
                                    <span className="w-4 h-4 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></span>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                                {isUploading ? 'Uploading...' : 'Upload'}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div>
                            <input
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="Tags (comma separated)"
                                className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-sm"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            {/* Refine with CUE button */}
                            <button
                                type="button"
                                onClick={() => setRefineOpen(true)}
                                disabled={!questionTitle && !questionContent}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                Refine with CUE
                            </button>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={closePostModal}
                                    className="px-5 py-2 text-gray-600 hover:bg-gray-100 font-medium rounded-full transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`px-6 py-2 text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all transform active:scale-95 ${activeCreateTab === 'QUESTION' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'}`}
                                    disabled={createLoading}
                                >
                                    {createLoading ? 'Publishing...' : (activeCreateTab === 'QUESTION' ? 'Add question' : 'Post')}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Refine with CUE Panel */}
                    <RefineWithCue
                        isOpen={refineOpen}
                        onClose={() => setRefineOpen(false)}
                        title={questionTitle}
                        description={questionContent}
                        onUseTitle={(newTitle) => setQuestionTitle(newTitle)}
                        onUseDescription={(newDesc) => setQuestionContent(newDesc)}
                        onUseTopics={(topics) => setTags(topics.join(', '))}
                    />
                </div>
            </div>
        </div>
    );
}
