import { useState, useEffect } from 'react';
import { aiApi } from '../api';

export default function RefineWithCue({
    isOpen,
    onClose,
    title,
    description,
    onUseTitle,
    onUseDescription,
    onUseTopics,
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
                className="fixed right-0 top-0 bottom-0 w-[480px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right"
                style={{
                    animation: 'slideInRight 0.25s ease-out'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/30 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/50 to-purple-900/50 opacity-50"></div>
                            <svg className="w-6 h-6 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="url(#q-gradient-header)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 16L19.5 19.5" stroke="url(#q-gradient-header)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                <defs>
                                    <linearGradient id="q-gradient-header" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#22d3ee" />
                                        <stop offset="50%" stopColor="#a855f7" />
                                        <stop offset="100%" stopColor="#ec4899" />
                                    </linearGradient>
                                </defs>
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
                            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-slate-900 shadow-xl shadow-purple-500/20 ring-2 ring-purple-500/30 overflow-hidden relative group animate-pulse">
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/50 to-purple-900/50 opacity-50"></div>
                                <svg className="w-10 h-10 relative z-10 animate-spin-slow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="url(#q-gradient-thinking)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M16 16L19.5 19.5" stroke="url(#q-gradient-thinking)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <defs>
                                        <linearGradient id="q-gradient-thinking" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#22d3ee" />
                                            <stop offset="50%" stopColor="#a855f7" />
                                            <stop offset="100%" stopColor="#ec4899" />
                                        </linearGradient>
                                    </defs>
                                </svg>
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
                                        }}
                                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm transform active:scale-95"
                                    >
                                        Use this title
                                    </button>
                                </div>
                                <p className="text-gray-900 font-semibold text-base leading-relaxed">{result.improvedTitle}</p>
                            </div>

                            {/* Improved Description */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Improved Description</span>
                                    <button
                                        onClick={() => {
                                            onUseDescription(result.improvedDescription);
                                        }}
                                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm transform active:scale-95"
                                    >
                                        Use this description
                                    </button>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{result.improvedDescription}</p>
                            </div>

                            {/* Suggested Topics */}
                            {result.suggestedTopics && result.suggestedTopics.length > 0 && onUseTopics && (
                                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Suggested Topics</span>
                                        <button
                                            onClick={() => {
                                                onUseTopics(result.suggestedTopics);
                                            }}
                                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm transform active:scale-95"
                                        >
                                            Use these topics
                                        </button>
                                    </div>
                                    <p className="text-gray-900 font-medium text-sm leading-relaxed">{result.suggestedTopics.join(', ')}</p>
                                </div>
                            )}

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
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 4s linear infinite;
        }
      `}</style>
        </>
    );
}
