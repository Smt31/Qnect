import React from 'react';

const ConversationSkeleton = () => {
    const skeletonItems = Array.from({ length: 6 });

    return (
        <div className="py-2">
            {skeletonItems.map((_, index) => (
                <div
                    key={index}
                    className="flex items-center px-4 py-3 mx-2 rounded-xl mb-1 animate-pulse"
                >
                    {/* Avatar skeleton */}
                    <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                    </div>

                    {/* Content skeleton */}
                    <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ConversationSkeleton;
