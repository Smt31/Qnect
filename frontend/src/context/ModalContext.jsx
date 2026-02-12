import { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);

    const openPostModal = useCallback(() => setIsPostModalOpen(true), []);
    const closePostModal = useCallback(() => setIsPostModalOpen(false), []);

    return (
        <ModalContext.Provider value={{ isPostModalOpen, openPostModal, closePostModal }}>
            {children}
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within ModalProvider');
    }
    return context;
}
