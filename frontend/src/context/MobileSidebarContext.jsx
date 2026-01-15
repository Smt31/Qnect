import { createContext, useContext, useState, useCallback } from 'react';

const MobileSidebarContext = createContext(null);

export function MobileSidebarProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    return (
        <MobileSidebarContext.Provider value={{ isOpen, open, close, toggle }}>
            {children}
        </MobileSidebarContext.Provider>
    );
}

export function useMobileSidebar() {
    const context = useContext(MobileSidebarContext);
    if (!context) {
        throw new Error('useMobileSidebar must be used within MobileSidebarProvider');
    }
    return context;
}
