'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Language } from '@/lib/translations';

interface FlythroughViewerProps {
    images: string[];
    onClose: () => void;
    lang?: Language;
}

const flythroughTranslations = {
    en: {
        play: 'Play',
        pause: 'Pause',
        exit: 'Exit Flythrough',
        fullscreen: 'Fullscreen',
        exitFullscreen: 'Exit Fullscreen',
    },
    it: {
        play: 'Riproduci',
        pause: 'Pausa',
        exit: 'Esci dal Tour',
        fullscreen: 'Schermo Intero',
        exitFullscreen: 'Esci da Schermo Intero',
    }
};

// Ken Burns animation variants for variety
const kenBurnsVariants = [
    'kenburns-zoom-in',
    'kenburns-zoom-out',
    'kenburns-pan-left',
    'kenburns-pan-right',
    'kenburns-pan-up',
    'kenburns-pan-down',
];

export function FlythroughViewer({ images, onClose, lang = 'en' }: FlythroughViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [animationClass, setAnimationClass] = useState(kenBurnsVariants[0]);

    const t = flythroughTranslations[lang];

    // Pick a random animation for each slide
    const pickRandomAnimation = useCallback(() => {
        const randomIndex = Math.floor(Math.random() * kenBurnsVariants.length);
        setAnimationClass(kenBurnsVariants[randomIndex]);
    }, []);

    // Auto-advance slides
    useEffect(() => {
        if (!isPlaying || images.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => {
                const next = (prev + 1) % images.length;
                pickRandomAnimation();
                return next;
            });
        }, 5000); // 5 seconds per slide

        return () => clearInterval(timer);
    }, [isPlaying, images.length, pickRandomAnimation]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    goToPrevious();
                    break;
                case 'ArrowRight':
                    goToNext();
                    break;
                case ' ':
                    e.preventDefault();
                    setIsPlaying((p) => !p);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Fullscreen handling
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        pickRandomAnimation();
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        pickRandomAnimation();
    };

    const toggleFullscreen = async () => {
        const container = document.getElementById('flythrough-container');
        if (!container) return;

        if (!document.fullscreenElement) {
            await container.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    };

    const progress = ((currentIndex + 1) / images.length) * 100;

    return (
        <div
            id="flythrough-container"
            className="fixed inset-0 z-50 bg-black flex flex-col"
        >
            {/* Ken Burns CSS Animations */}
            <style jsx global>{`
                @keyframes kenburns-zoom-in {
                    0% { transform: scale(1) translate(0, 0); }
                    100% { transform: scale(1.15) translate(-2%, -1%); }
                }
                @keyframes kenburns-zoom-out {
                    0% { transform: scale(1.15) translate(-2%, -1%); }
                    100% { transform: scale(1) translate(0, 0); }
                }
                @keyframes kenburns-pan-left {
                    0% { transform: scale(1.1) translate(3%, 0); }
                    100% { transform: scale(1.1) translate(-3%, 0); }
                }
                @keyframes kenburns-pan-right {
                    0% { transform: scale(1.1) translate(-3%, 0); }
                    100% { transform: scale(1.1) translate(3%, 0); }
                }
                @keyframes kenburns-pan-up {
                    0% { transform: scale(1.1) translate(0, 3%); }
                    100% { transform: scale(1.1) translate(0, -3%); }
                }
                @keyframes kenburns-pan-down {
                    0% { transform: scale(1.1) translate(0, -3%); }
                    100% { transform: scale(1.1) translate(0, 3%); }
                }
                .kenburns-zoom-in { animation: kenburns-zoom-in 5s ease-out forwards; }
                .kenburns-zoom-out { animation: kenburns-zoom-out 5s ease-out forwards; }
                .kenburns-pan-left { animation: kenburns-pan-left 5s ease-out forwards; }
                .kenburns-pan-right { animation: kenburns-pan-right 5s ease-out forwards; }
                .kenburns-pan-up { animation: kenburns-pan-up 5s ease-out forwards; }
                .kenburns-pan-down { animation: kenburns-pan-down 5s ease-out forwards; }
            `}</style>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
                <div className="flex items-center gap-4">
                    <span className="text-white/90 text-sm font-medium">
                        {currentIndex + 1} / {images.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleFullscreen}
                        className="text-white hover:bg-white/20"
                        title={isFullscreen ? t.exitFullscreen : t.fullscreen}
                    >
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-white hover:bg-white/20"
                        title={t.exit}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Main Image Container */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                {images.map((img, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            'absolute inset-0 flex items-center justify-center transition-opacity duration-1000',
                            idx === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        )}
                    >
                        <img
                            src={img}
                            alt={`Room angle ${idx + 1}`}
                            className={cn(
                                'max-w-full max-h-full w-auto h-auto object-contain',
                                idx === currentIndex && isPlaying && animationClass
                            )}
                        />
                    </div>
                ))}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-4">
                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPrevious}
                        className="text-white hover:bg-white/20 w-12 h-12"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="text-white hover:bg-white/20 w-14 h-14 rounded-full border border-white/30"
                    >
                        {isPlaying ? (
                            <Pause className="w-6 h-6" />
                        ) : (
                            <Play className="w-6 h-6 ml-1" />
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNext}
                        className="text-white hover:bg-white/20 w-12 h-12"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                </div>

                {/* Dot Indicators */}
                <div className="flex items-center justify-center gap-2 mt-4">
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setCurrentIndex(idx);
                                pickRandomAnimation();
                            }}
                            className={cn(
                                'w-2 h-2 rounded-full transition-all duration-300',
                                idx === currentIndex
                                    ? 'bg-white w-6'
                                    : 'bg-white/40 hover:bg-white/60'
                            )}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
