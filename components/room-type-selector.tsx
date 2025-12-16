'use client';

import { Home, Utensils, Bed, Bath, Briefcase, Sofa, Car, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomType {
    id: string;
    label: string;
    icon: React.ReactNode;
}

const roomTypes: RoomType[] = [
    { id: 'living_room', label: 'Living Room', icon: <Sofa className="h-5 w-5" /> },
    { id: 'bedroom', label: 'Bedroom', icon: <Bed className="h-5 w-5" /> },
    { id: 'kitchen', label: 'Kitchen', icon: <Utensils className="h-5 w-5" /> },
    { id: 'bathroom', label: 'Bathroom', icon: <Bath className="h-5 w-5" /> },
    { id: 'dining_room', label: 'Dining Room', icon: <Home className="h-5 w-5" /> },
    { id: 'office', label: 'Office', icon: <Briefcase className="h-5 w-5" /> },
    { id: 'garage', label: 'Garage', icon: <Car className="h-5 w-5" /> },
    { id: 'outdoor', label: 'Outdoor', icon: <Building2 className="h-5 w-5" /> },
];

interface RoomTypeSelectorProps {
    currentRoomType: string;
    onRoomTypeSelect: (roomType: string) => void;
    className?: string;
}

export function RoomTypeSelector({
    currentRoomType,
    onRoomTypeSelect,
    className,
}: RoomTypeSelectorProps) {
    return (
        <div className={cn('grid gap-2', className)}>
            {roomTypes.map((room) => (
                <button
                    key={room.id}
                    onClick={() => onRoomTypeSelect(room.id)}
                    className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                        'hover:bg-accent hover:border-primary/50',
                        currentRoomType === room.id
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border bg-background text-foreground'
                    )}
                >
                    <span className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-md',
                        currentRoomType === room.id ? 'bg-primary/10' : 'bg-muted'
                    )}>
                        {room.icon}
                    </span>
                    <span className="font-medium text-sm">{room.label}</span>
                </button>
            ))}
        </div>
    );
}

export { roomTypes };
