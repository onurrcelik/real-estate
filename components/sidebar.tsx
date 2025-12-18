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
}

export function Sidebar({ onSelectGeneration, onNewChat, isOpen, setIsOpen, lang }: SidebarProps) {
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [loading, setLoading] = useState(true);
    const t = translations[lang];

    const fetchHistory = async () => {
        try {
            const response = await fetch('/api/history');
            if (response.ok) {
                const data = await response.json();
                setGenerations(data.generations || []);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const getThumbnail = (gen: Generation) => {
        try {
            const parsed = JSON.parse(gen.generated_image);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed[0];
            }
            return gen.generated_image;
        } catch (e) {
            return gen.generated_image;
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent selecting the item
        if (!confirm(t.app.deleteConfirm)) return;

        try {
            const res = await fetch('/api/history', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error('Failed to delete');

            setGenerations((prev) => prev.filter((g) => g.id !== id));
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Failed to delete');
        }
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
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r shadow-xl transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:shadow-none flex flex-col",
                    isOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="p-4 border-b">
                    <Button
                        onClick={onNewChat}
                        className="w-full justify-start gap-2 bg-muted/50 hover:bg-muted text-foreground border-0 shadow-none"
                        variant="outline"
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
            </div>
        </>
    );
}
