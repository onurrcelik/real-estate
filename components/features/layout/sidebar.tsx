'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Clock, History, ChevronLeft, ChevronRight, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { translations, Language } from '@/lib/translations';

interface Generation {
    id: string;
    created_at: string;
    style: string;
    original_image: string;
    generated_image: string;
    room_type?: string;
}

interface SidebarProps {
    onSelectGeneration: (gen: Generation) => void;
    onNewChat: () => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    lang: Language;
    generations: Generation[];
    loading: boolean;
    onDeleteGeneration: (id: string) => void;
    userLimit?: { role: string; count: number } | null;
    onSignOut?: () => void;
    onLanguageChange?: (lang: Language) => void;
}

export function Sidebar({
    onSelectGeneration,
    onNewChat,
    isOpen,
    setIsOpen,
    lang,
    generations,
    loading,
    onDeleteGeneration,
    userLimit,
    onSignOut,
    onLanguageChange
}: SidebarProps) {
    const t = translations[lang];

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onDeleteGeneration(id);
    };

    const formatRoomLabel = (gen: Generation) => {
        const style = gen.style || 'Design';
        // Try to translate room type if available
        let roomLabel = '';
        if (gen.room_type) {
            const key = gen.room_type as keyof typeof t.rooms;
            roomLabel = t.rooms[key] || gen.room_type.replace(/_/g, ' ');
        }

        // Capitalize for display if falling back to English/Raw
        if (roomLabel && gen.room_type && !t.rooms[gen.room_type as keyof typeof t.rooms]) {
            roomLabel = roomLabel.charAt(0).toUpperCase() + roomLabel.slice(1);
        }

        return roomLabel ? `${style} ${roomLabel}` : style;
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-72 bg-card border-r shadow-2xl transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:w-64 md:h-screen md:shadow-none flex flex-col",
                    isOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="p-4 border-b space-y-4">
                    <Button
                        onClick={onNewChat}
                        className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        {t.app.newDesign}
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{t.app.recent}</div>
                    {loading ? (
                        <div className="text-sm text-center py-4 text-muted-foreground">{t.app.loadingHistory}</div>
                    ) : generations.length === 0 ? (
                        <div className="text-sm text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                            <History className="w-8 h-8 opacity-20" />
                            <p>{t.app.noDesigns}</p>
                        </div>
                    ) : (
                        generations.map((gen) => (
                            <div
                                key={gen.id}
                                onClick={() => {
                                    onSelectGeneration(gen);
                                    if (window.innerWidth < 768) setIsOpen(false); // Close on mobile select
                                }}
                                className="w-full p-2 rounded-lg hover:bg-muted/50 transition-colors group flex items-start gap-3 cursor-pointer relative pr-8"
                            >
                                <div className="w-8 h-8 rounded bg-muted overflow-hidden flex-shrink-0 mt-0.5">
                                    <img src={gen.original_image} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                                        {formatRoomLabel(gen)}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {new Date(gen.created_at).toLocaleDateString()} {new Date(gen.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(e, gen.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Mobile Only Controls at Bottom */}
                <div className="p-4 border-t bg-muted/20 space-y-4 md:hidden">
                    {userLimit && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <span>{t.app?.usage || "Usage"}</span>
                                <span>{userLimit.role === 'admin' ? '∞' : `${userLimit.count} / 3`}</span>
                            </div>
                            {userLimit.role !== 'admin' && (
                                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden border border-border/50">
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-500",
                                            userLimit.count >= 3 ? "bg-destructive" : "bg-primary"
                                        )}
                                        style={{ width: `${Math.min((userLimit.count / 3) * 100, 100)}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2">
                        {onLanguageChange && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-9 text-xs"
                                onClick={() => onLanguageChange(lang === 'it' ? 'en' : 'it')}
                            >
                                {lang === 'it' ? '🇬🇧 English' : '🇮🇹 Italiano'}
                            </Button>
                        )}

                        {onSignOut && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                    if (confirm(t.auth.signOutConfirm)) onSignOut();
                                }}
                            >
                                {t.auth.signOut}
                            </Button>
                        )}
                    </div>
                </div>

            </div>
        </>
    );
}
