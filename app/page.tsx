'use client';

import React, { useState } from 'react';
import { UploadZone } from '@/components/upload-zone';
import { StyleSelector } from '@/components/style-selector';
import { ComparisonViewer } from '@/components/comparison-viewer';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
// Removed unused toast import

// "I want you to use shadcn/ui". Shadcn toast is great but needs setup.
// I'll use a simple error state rendering.

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [selectedStyle, setSelectedStyle] = useState<string>('Modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (file: File) => {
    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const result = e.target.result as string;
        setOriginalImage(result);

        // Determine aspect ratio
        const img = new Image();
        img.onload = () => {
          // Round dimensions to nearest 16px for optimal generation
          const width = Math.round(img.width / 16) * 16;
          const height = Math.round(img.height / 16) * 16;
          console.log(`Image dimensions: ${img.width}x${img.height}, Rounded: ${width}x${height}`);
          setImageSize({ width, height });
        };
        img.src = result;

        setGeneratedImages([]); // Reset generation
        setSelectedImageIndex(0);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!originalImage) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: originalImage,
          style: selectedStyle,
          imageSize: imageSize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate image');
      }

      if (data.generatedImages && data.generatedImages.length > 0) {
        setGeneratedImages(data.generatedImages);
        setSelectedImageIndex(0);
      } else {
        throw new Error('No images returned from API');
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setGeneratedImages([]);
    setSelectedImageIndex(0);
    setImageSize(null);
    setError(null);
  };

  const handleDownload = async () => {
    if (generatedImages.length === 0) return;

    try {
      const response = await fetch(generatedImages[selectedImageIndex]);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `staged-room-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download image', e);
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSelectGeneration = (gen: any) => {
    setOriginalImage(gen.original_image);
    setGeneratedImages([gen.generated_image]);
    setSelectedImageIndex(0);
    setSelectedStyle(gen.style || 'Modern');
    setError(null);
    // On mobile, close sidebar after selection
    setIsSidebarOpen(false);
  };

  const handleNewChat = () => {
    handleReset();
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar
        onSelectGeneration={handleSelectGeneration}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <main className="flex-1 min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8 overflow-y-auto">
        {/* Mobile Sidebar Toggle */}
        <div className="md:hidden mb-4">
          <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </Button>
        </div>

        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <header className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Virtual Staging AI
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Transform your real estate photos instantly with Gemini 2.5.
              Upload, choose a style, and see the magic.
            </p>
          </header>

          {/* Main Interface */}
          <div className="space-y-8">

            {/* 1. Upload Section - Show only if no image selected */}
            {!originalImage && (
              <div className="max-w-xl mx-auto animate-in fade-in zoom-in duration-500">
                <UploadZone onImageSelected={handleImageSelect} />
              </div>
            )}

            {/* 2. Workspace - Show if image is selected */}
            {originalImage && (
              <div className="space-y-8 animate-in slide-in-from-bottom duration-500">

                {/* Controls and Preview */}
                <div className="grid md:grid-cols-[300px_1fr] gap-8">

                  {/* Sidebar / Options */}
                  <div className="space-y-6">
                    <div className="bg-card border rounded-xl p-4 shadow-sm">
                      <h3 className="font-semibold mb-4">Select Style</h3>
                      <StyleSelector
                        currentStyle={selectedStyle}
                        onStyleSelect={setSelectedStyle}
                        className="grid-cols-2 md:grid-cols-2 gap-2"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || generatedImages.length > 0}
                        size="lg"
                        className="w-full text-lg shadow-lg shadow-primary/20"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating...
                          </>
                        ) : generatedImages.length > 0 ? (
                          "Regenerate"
                        ) : (
                          "Generate Design"
                        )}
                      </Button>



                      {generatedImages.length > 0 && (
                        <Button variant="outline" onClick={handleDownload} className="w-full">
                          <Download className="mr-2 h-4 w-4" />
                          Download Photo
                        </Button>
                      )}

                      <Button variant="ghost" onClick={handleReset} className="w-full text-muted-foreground">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Start Over
                      </Button>
                    </div>

                    {error && (
                      <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                  </div>

                  {/* Main Viewer area */}
                  <div className="flex flex-col gap-4">
                    <div className="bg-card border rounded-xl overflow-hidden shadow-sm min-h-[500px] flex items-center justify-center relative">
                      {generatedImages.length === 0 ? (
                        // Show original only
                        <div className="relative w-full h-full min-h-[500px] flex items-center justify-center bg-muted/20">
                          <img
                            src={originalImage}
                            alt="Original"
                            className="max-w-full max-h-[600px] h-auto w-auto object-contain shadow-sm"
                          />
                          {!isGenerating && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                              <div className="bg-background/90 px-4 py-2 rounded-full shadow-lg text-sm font-medium">
                                Original Preview
                              </div>
                            </div>
                          )}
                          {isGenerating && (
                            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                              <p className="font-medium text-lg animate-pulse">Designing your room...</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Show Comparison
                        <ComparisonViewer
                          beforeImage={originalImage}
                          afterImage={generatedImages[selectedImageIndex]}
                        />
                      )}
                    </div>

                    {/* Thumbnails */}
                    {generatedImages.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {generatedImages.map((img, i) => (
                          <div
                            key={i}
                            className={cn(
                              "cursor-pointer rounded-lg overflow-hidden border-2 transition-all h-24 relative",
                              selectedImageIndex === i ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-70 hover:opacity-100"
                            )}
                            onClick={() => setSelectedImageIndex(i)}
                          >
                            <img
                              src={img}
                              alt={`Variation ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
