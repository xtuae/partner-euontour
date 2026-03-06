import React, { useEffect } from 'react';

interface ImageModalProps {
    isOpen: boolean;
    imageUrl: string | null;
    altText?: string;
    onClose: () => void;
}

export function ImageModal({ isOpen, imageUrl, altText = 'Image', onClose }: ImageModalProps) {
    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !imageUrl) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="relative max-w-full max-h-full flex items-center justify-center pointer-events-none">
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="absolute -top-4 -right-4 md:-top-6 md:-right-6 m-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors pointer-events-auto shadow-sm"
                    aria-label="Close image"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <img
                    src={imageUrl}
                    alt={altText}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl pointer-events-auto bg-gray-900/50"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    );
}
