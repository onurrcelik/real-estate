'use client';

import React from 'react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Note: Need to make sure Badge is available or use plain div

interface ComparisonViewerProps {
    beforeImage: string;
    afterImage: string;
    className?: string;
    originalLabel: string;
}

export function ComparisonViewer({ beforeImage, afterImage, className, originalLabel }: ComparisonViewerProps) {
    return (
        <div className={cn('relative rounded-xl overflow-hidden shadow-2xl border border-border/50', className)}>
            <ReactCompareSlider
                itemOne={<ReactCompareSliderImage src={beforeImage} alt="Original Room" />}
                itemTwo={<ReactCompareSliderImage src={afterImage} alt="Restyled Room" />}
                className="h-[300px] md:h-[500px] w-full object-contain"
                style={{ height: '100%', minHeight: '300px' }}
                changePositionOnHover={true}
            />
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-black/50 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                    {originalLabel}
                </div>
            </div>
            <div className="absolute top-4 right-4 z-10">
                <div className="bg-primary/80 text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                    Rinova AI
                </div>
            </div>
        </div>
    );
}
