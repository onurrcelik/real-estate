import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Language } from '@/lib/translations';

// Messages for different languages
const STATUS_MESSAGES = {
    en: [
        "Uploading high-quality image...",
        "Analyzing room geometry...",
        "Generating new interior design...",
        "Enhancing details...",
        "Applying lighting models...",
        "Finalizing render..."
    ],
    it: [
        "Caricamento immagine alta definizione...",
        "Analisi geometria stanza...",
        "Generazione nuovo design...",
        "Miglioramento dettagli...",
        "Applicazione modelli luce...",
        "Finalizzazione render..."
    ]
};

const ESTIMATED_TIME = {
    en: "Estimated time: ~40 seconds",
    it: "Tempo stimato: ~40 secondi"
};

const FINALIZING_MESSAGES = {
    en: "Finalizing...",
    it: "Finalizzazione..."
};

export function LoadingOverlay({
    isVisible,
    lang = 'en'
}: {
    isVisible: boolean;
    lang?: Language;
}) {
    const [progress, setProgress] = useState(0);
    const [messageIndex, setMessageIndex] = useState(0);
    const messages = STATUS_MESSAGES[lang] || STATUS_MESSAGES.en;

    useEffect(() => {
        if (!isVisible) {
            setProgress(0);
            setMessageIndex(0);
            return;
        }

        const duration = 40000; // 40 seconds target
        const interval = 100;
        const targetPercent = 95;
        const steps = duration / interval;
        const increment = targetPercent / steps;

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= targetPercent) return targetPercent;
                return prev + increment;
            });
        }, interval);

        const messageTimer = setInterval(() => {
            setMessageIndex(prev => (prev + 1) % messages.length);
        }, 5000); // Change message every 5 seconds for 40s duration

        return () => {
            clearInterval(timer);
            clearInterval(messageTimer);
        };
    }, [isVisible, messages.length]);

    if (!isVisible) return null;

    // Use current message, or "Finalizing..." if stuck at 95%
    const currentMessage = progress >= 95
        ? (FINALIZING_MESSAGES[lang] || FINALIZING_MESSAGES.en)
        : messages[messageIndex % messages.length];

    return (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center z-50 p-8 text-center animate-in fade-in duration-500">
            <div className="w-full max-w-md space-y-8">
                <div className="relative flex flex-col items-center">
                    <div className="relative">
                        <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 text-primary animate-pulse" />
                        </div>
                    </div>

                    <div className="mt-8 space-y-2 w-full">
                        <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 animate-pulse">
                            {currentMessage}
                        </h3>
                        <p className="text-muted-foreground text-sm font-medium">
                            {ESTIMATED_TIME[lang] || ESTIMATED_TIME.en}
                        </p>
                    </div>

                    <div className="w-full h-3 bg-secondary/50 rounded-full mt-6 overflow-hidden border border-border/50">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-primary transition-all duration-300 ease-out rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                        {Math.round(progress)}%
                    </p>
                </div>
            </div>
        </div>
    );
}
