import { useState, useEffect } from 'react';
import { aiApi } from '../api';

export default function RefineWithCue({
    isOpen,
    onClose,
    title,
    description,
    onUseTitle,
    onUseDescription,
    anchorRef
}) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleRefine = async () => {
        if (!title && !description) {
            setError('Please add a title or description first');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const data = await aiApi.refinePost(title, description);
            setResult(data);
        } catch (e) {
            setError(e?.message || 'Failed to refine. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-trigger refinement when panel opens
    useEffect(() => {
        if (isOpen && !result && !loading) {
            handleRefine();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop - subtle, non-blocking */}
            <div
                className="fixed inset-0 bg-black/10 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Slide-in Panel */}
            <div
                className="fixed right-0 top-0 bottom-0 w-[360px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right"
                style={{
                    animation: 'slideInRight 0.25s ease-out'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">Refine with CUE</h3>
                            <p className="text-xs text-gray-500">AI writing assistant</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full border-4 border-violet-100 border-t-violet-500 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-violet-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                </div>
                            </div>
                            <p className="mt-4 text-sm text-gray-500 font-medium">CUE is thinking...</p>
                            <p className="text-xs text-gray-400 mt-1">Polishing your content</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                            <p className="text-sm text-red-600">{error}</p>
                            <button
                                onClick={handleRefine}
                                className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {result && !loading && (
                        <div className="space-y-5">
                            {/* Improved Title */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Improved Title</span>
                                    <button
                                        onClick={() => {
                                            onUseTitle(result.improvedTitle);
                                            onClose();
                                        }}
                                        className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                                    >
                                        Use this title
                                    </button>
                                </div>
                                <p className="text-gray-900 font-medium leading-relaxed">{result.improvedTitle}</p>
                            </div>

                            {/* Improved Description */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Improved Description</span>
                                    <button
                                        onClick={() => {
                                            onUseDescription(result.improvedDescription);
                                            onClose();
                                        }}
                                        className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                                    >
                                        Use this description
                                    </button>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{result.improvedDescription}</p>
                            </div>

                            {/* What Changed */}
                            <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">What CUE improved</span>
                                <ul className="mt-3 space-y-2">
                                    {result.changes?.map((change, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                            <svg className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>{change}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">Suggestions are not auto-saved</p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Animation keyframes */}
            <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0.5;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
        </>
    );
}
