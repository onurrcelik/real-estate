'use client';

import React from 'react';
import { X, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translations, Language } from '@/lib/translations';

interface LimitPopupProps {
    isOpen: boolean;
    onClose: () => void;
    lang: Language;
}

export function LimitPopup({ isOpen, onClose, lang }: LimitPopupProps) {
    if (!isOpen) return null;

    const t = translations[lang];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-card p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-border relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center gap-4 py-2">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-2xl">
                        ⚠️
                    </div>

                    <h3 className="text-lg font-bold text-foreground">
                        {t.app.limitReached}
                    </h3>

                    <p className="text-sm text-muted-foreground">
                        {t.app.limitReachedError}
                    </p>

                    <div className="w-full space-y-3 mt-2">


                        <Button
                            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white flex items-center gap-2"
                            onClick={() => window.open('https://wa.me/393517843713', '_blank')}
                        >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp +39 3517843713
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full mt-2"
                    >
                        {t.app.close || "Close"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
