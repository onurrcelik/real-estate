
import React from 'react';
import { translations, Language } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MismatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    detectedType: string;
    selectedType: string;
    lang: Language;
}

export function MismatchModal({
    isOpen,
    onClose,
    onConfirm,
    detectedType,
    selectedType,
    lang
}: MismatchModalProps) {
    if (!isOpen) return null;

    const t = translations[lang];

    // Helper to get localized room name safely
    const getRoomName = (type: string) => {
        return t.rooms[type as keyof typeof t.rooms] || type;
    };

    const detectedName = getRoomName(detectedType);
    const selectedName = getRoomName(selectedType);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-card border border-border rounded-xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 text-center items-center">
                        <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                        </div>
                        <h2 className="text-lg font-semibold leading-none tracking-tight">
                            {t.app.roomMismatchTitle}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {t.app.roomMismatchMsg
                                .replace('{detected}', detectedName)
                                .replace('{selected}', selectedName)
                            }
                        </p>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 mt-2">
                        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                            {t.app.keepSelected.replace('{selected}', selectedName)}
                        </Button>
                        <Button onClick={onConfirm} className="w-full sm:w-auto">
                            {t.app.useDetected.replace('{detected}', detectedName)}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
