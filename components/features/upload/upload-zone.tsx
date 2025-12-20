import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
    onImageSelected: (file: File) => void;
    className?: string;
    title: string;
    dragActiveTitle: string;
    description: string;
    supportedFormats: string;
    isProcessing?: boolean;
}

export function UploadZone({
    onImageSelected,
    className,
    title,
    dragActiveTitle,
    description,
    supportedFormats,
    isProcessing = false
}: UploadZoneProps) {
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0 && !isProcessing) {
                onImageSelected(acceptedFiles[0]);
            }
        },
        [onImageSelected, isProcessing]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic'],
        },
        maxFiles: 1,
        disabled: isProcessing
    });

    return (
        <Card
            {...getRootProps()}
            className={cn(
                'border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-6 md:p-12 text-center group bg-background/50 backdrop-blur-sm relative overflow-hidden',
                isDragActive
                    ? 'border-primary bg-primary/10 scale-[1.02]'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                isProcessing && 'cursor-wait opacity-80',
                className
            )}
        >
            <input {...getInputProps()} />

            {isProcessing && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                    <p className="text-sm font-medium text-foreground animate-pulse">Processing Image...</p>
                </div>
            )}

            <div className="relative mb-4">
                <div className={cn("absolute inset-0 bg-primary/20 blur-xl rounded-full transition-opacity duration-300", isDragActive || "group-hover:opacity-100 opacity-0")} />
                <UploadCloud
                    className={cn(
                        'w-12 h-12 transition-colors duration-300 relative z-10',
                        isDragActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                    )}
                />
            </div>
            <h3 className="text-lg font-semibold mb-2">
                {isDragActive ? dragActiveTitle : title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
                {description}. {supportedFormats}
            </p>
        </Card>
    );
}
