import React from 'react';

const Skeleton = ({ className = '', variant = 'text', width, height }) => {
    const baseClasses = "bg-gray-200 animate-pulse";

    const variants = {
        text: "rounded",
        circle: "rounded-full",
        rect: "rounded-md",
    };

    const style = {
        width: width,
        height: height,
    };

    return (
        <div
            className={`${baseClasses} ${variants[variant]} ${className}`}
            style={style}
        />
    );
};

export default Skeleton;
