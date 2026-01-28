import React from 'react';

const MessageSkeleton = () => {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Received message */}
            <div className="flex justify-start mb-1">
                <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 animate-pulse flex-shrink-0"></div>
                <div className="flex flex-col items-start max-w-[70%]">
                    <div className="px-4 py-2.5 bg-gray-200 rounded-2xl rounded-bl-md h-10 w-48 animate-pulse"></div>
                </div>
            </div>

            {/* Sent message */}
            <div className="flex justify-end mb-1">
                <div className="flex flex-col items-end max-w-[70%]">
                    <div className="px-4 py-2.5 bg-gray-200 rounded-2xl rounded-br-md h-10 w-40 animate-pulse"></div>
                </div>
            </div>

            {/* Received message */}
            <div className="flex justify-start mb-1">
                <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 animate-pulse flex-shrink-0"></div>
                <div className="flex flex-col items-start max-w-[70%]">
                    <div className="px-4 py-2.5 bg-gray-200 rounded-2xl rounded-bl-md h-10 w-56 animate-pulse"></div>
                </div>
            </div>

            {/* Sent message */}
            <div className="flex justify-end mb-1">
                <div className="flex flex-col items-end max-w-[70%]">
                    <div className="px-4 py-2.5 bg-gray-200 rounded-2xl rounded-br-md h-10 w-52 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
};

export default MessageSkeleton;
