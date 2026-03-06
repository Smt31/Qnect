import React from 'react';

const Logo = ({ size = 44, fontSize = 'text-[1.5rem]', showText = true, className = "" }) => {
    return (
        <div className={`flex items-center gap-2.5 cursor-pointer group ${className}`}>
            <div className="flex items-center justify-center relative group-hover:scale-105 transition-transform duration-500 ease-out">
                <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
                    <defs>
                        <linearGradient id="qPremiumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fca5a5" />
                            <stop offset="40%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#be123c" />
                        </linearGradient>

                        <style>{`
              @keyframes nodePulse {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.2); opacity: 1; }
              }
              .logo-node { animation: nodePulse 3s infinite ease-in-out; transform-origin: center; }
            `}</style>
                    </defs>

                    {/* Light Completion Line */}
                    <path
                        d="M 67 70 C 75 62, 78 55, 78 48 C 78 32, 66 22, 48 22"
                        stroke="#fda4af"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.25"
                    />

                    {/* Main Q Body */}
                    <path
                        d="M 48 22 C 32 22, 20 34, 20 50 C 20 66, 32 78, 48 78 C 55 78, 62 75, 67 70"
                        stroke="url(#qPremiumGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                    />

                    {/* Q Tail */}
                    <path
                        d="M 52 65 C 58 65, 75 75, 80 85"
                        stroke="url(#qPremiumGradient)"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />

                    {/* Network nodes */}
                    <g>
                        <circle cx="85" cy="45" r="4.5" fill="url(#qPremiumGradient)" className="logo-node" style={{ animationDelay: '0s' }} />
                        <circle cx="75" cy="25" r="4.5" fill="url(#qPremiumGradient)" className="logo-node" style={{ animationDelay: '0.6s' }} />
                    </g>

                    {/* Depth/Gloss Effect */}
                    <path
                        d="M 30 40 C 35 28, 52 28, 58 35"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.3"
                    />
                </svg>
            </div>
            {showText && (
                <h2 className={`${fontSize} font-black tracking-[-0.03em] bg-gradient-to-br from-rose-500 via-rose-600 to-pink-700 bg-clip-text text-transparent font-['Outfit'] pt-0.5 ml-1.5`}>Qnect</h2>
            )}
        </div>
    );
};

export default Logo;
