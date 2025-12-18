'use client';

import React, { useState } from 'react';
// ... imports
import { signOutAction } from '@/app/lib/actions';
import { UploadZone } from '@/components/upload-zone';
import { StyleSelector } from '@/components/style-selector';
import { ComparisonViewer } from '@/components/comparison-viewer';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw, Download, Palette, Home as HomeIcon, Briefcase, Coffee, Ghost, Sun, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations, Language } from '@/lib/translations';

export default function Home() {
  const [lang, setLang] = useState<Language>('it'); // Default to Italian
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [selectedStyle, setSelectedStyle] = useState<string>('Modern');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('living_room');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const t = translations[lang];

  // Dynamic Styles based on Language
  const styleOptions = [
    { id: 'Modern', label: t.styles.modern.label, icon: HomeIcon, description: t.styles.modern.desc },
    { id: 'Scandinavian', label: t.styles.scandinavian.label, icon: Sun, description: t.styles.scandinavian.desc },
    { id: 'Industrial', label: t.styles.industrial.label, icon: Briefcase, description: t.styles.industrial.desc },
    { id: 'Bohemian', label: t.styles.bohemian.label, icon: Coffee, description: t.styles.bohemian.desc },
    { id: 'Minimalist', label: t.styles.minimalist.label, icon: Ghost, description: t.styles.minimalist.desc },
    { id: 'Contemporary', label: t.styles.contemporary.label, icon: Palette, description: t.styles.contemporary.desc },
  ];

  const roomOptions = [
    { id: 'living_room', label: t.rooms.living_room },
    { id: 'bedroom', label: t.rooms.bedroom },
    { id: 'kitchen', label: t.rooms.kitchen },
    { id: 'dining_room', label: t.rooms.dining_room },
    { id: 'bathroom', label: t.rooms.bathroom },
    { id: 'office', label: t.rooms.office },
    { id: 'studio', label: t.rooms.studio },
    { id: 'outdoor', label: t.rooms.outdoor },
  ];

  const toggleLanguage = (value: string) => {
    setLang(value as Language);
  };

  // Helper to resize image
  const resizeImage = async (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const maxDim = 2048;
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Use standard quality settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
            URL.revokeObjectURL(img.src);
          },
          'image/jpeg',
          0.95
        );
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(img.src);
        reject(err);
      };
    });
  };

  // Import heic2any deeply
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const handleImageSelect = async (file: File) => {
    setIsProcessing(true);
    let processFile = file;

    try {
      // 1. Handle HEIC files
      if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
        const heic2any = (await import('heic2any')).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.95
        });
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        processFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
      }

      // 2. Resize/Optimize ALL images (Standardize)
      const resizedBlob = await resizeImage(processFile);

      // Convert back to File for consistency with FileReader logic (optional, but good for name preservation)
      // Note: we might lose the original name extension if we aren't careful, but we output jpeg.
      // We'll keep the base name and ensure .jpg extension.
      const newName = processFile.name.replace(/\.[^/.]+$/, "") + ".jpg";
      processFile = new File([resizedBlob], newName, { type: 'image/jpeg' });

    } catch (e) {
      console.error("Image processing failed:", e);
      setError("Failed to process image. Please try another file.");
      setIsProcessing(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setIsProcessing(false);
      if (e.target?.result) {
        const result = e.target.result as string;
        setOriginalImage(result);
        const img = new Image();
        img.onload = () => {
          const width = Math.round(img.width / 16) * 16;
          const height = Math.round(img.height / 16) * 16;
          setImageSize({ width, height });
        };
        img.src = result;
        setGeneratedImages([]);
        setSelectedImageIndex(0);
        setError(null);
      }
    };
    reader.onerror = () => setIsProcessing(false);
    reader.readAsDataURL(processFile);
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
          roomType: selectedRoomType,
          imageSize: imageSize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || t.app.errorGenerating);
      }

      if (data.generatedImages && data.generatedImages.length > 0) {
        // Preload images before displaying
        await Promise.all(data.generatedImages.map((src: string) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = resolve;
            img.onerror = reject;
          });
        }));

        setGeneratedImages(data.generatedImages);
        setSelectedImageIndex(0);
      } else {
        throw new Error(t.app.errorNoImages);
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
    setSelectedRoomType('living_room');
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
      console.error('Failed to download', e);
    }
  };

  const handleSelectGeneration = (gen: any) => {
    setOriginalImage(gen.original_image);
    try {
      const parsed = JSON.parse(gen.generated_image);
      if (Array.isArray(parsed)) {
        setGeneratedImages(parsed);
      } else {
        setGeneratedImages([gen.generated_image]);
      }
    } catch (e) {
      setGeneratedImages([gen.generated_image]);
    }
    setSelectedImageIndex(0);
    setSelectedStyle(gen.style || 'Modern');
    setError(null);
    setIsSidebarOpen(false);
  };

  const handleNewChat = () => {
    handleReset();
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground">
      <Sidebar
        onSelectGeneration={handleSelectGeneration}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        lang={lang}
      />

      <main className={cn(
        "flex-1 min-h-screen bg-gradient-to-b from-[#F2F5FF] to-white overflow-y-auto transition-all",
        originalImage ? "p-4" : "p-4 md:p-8"
      )}>
        {/* Header Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </Button>
            </div>
            {/* Compact Title when in Workspace mode */}
            {originalImage && (
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                {t.app.title}
              </h1>
            )}
          </div>

          <div className="flex-1 flex justify-end items-center gap-2">
            <form action={async () => {
              await signOutAction();
            }}>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign Out
              </Button>
            </form>
            <Select value={lang} onValueChange={toggleLanguage}>
              <SelectTrigger className="w-[140px] bg-background/50 backdrop-blur-sm border-muted-foreground/20">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="it">🇮🇹 Italiano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={cn(
          "mx-auto transition-all duration-500",
          originalImage ? "max-w-[1600px] h-full" : "max-w-6xl space-y-12"
        )}>

          {/* Large Title - Only show on Landing Page */}
          {!originalImage && (
            <header className="text-center space-y-4 py-8 md:py-16">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white animate-in fade-in slide-in-from-top-4 duration-700 drop-shadow-sm">
                {t.app.title}
              </h1>
              <p className="text-muted-foreground text-xl md:text-2xl max-w-2xl mx-auto font-light animate-in fade-in slide-in-from-top-5 duration-700 delay-150">
                {t.app.subtitle}
              </p>
            </header>
          )}

          <div className={cn("transition-all", originalImage ? "h-full" : "space-y-10")}>


            {/* Upload Zone */}
            {!originalImage && (
              <div className="max-w-2xl mx-auto animate-in fade-in zoom-in duration-500">
                <UploadZone
                  onImageSelected={handleImageSelect}
                  title={t.app.uploadMainTitle}
                  dragActiveTitle={t.app.uploadDragActive}
                  description={t.app.uploadDesc}
                  supportedFormats={t.app.uploadSupportedFormats}
                  isProcessing={isProcessing}
                />
              </div>
            )}

            {/* Workspace */}
            {originalImage && (
              <div className="space-y-8 animate-in slide-in-from-bottom duration-500">

                <div className="grid lg:grid-cols-[500px_1fr] gap-8 items-start">

                  {/* Options Panel */}
                  <div className="space-y-6 lg:sticky lg:top-8">
                    <Card className="p-6 space-y-8 shadow-xl border-border/40 bg-card/80 backdrop-blur-sm">

                      <div className="space-y-4">
                        <label className="text-sm font-semibold tracking-wide text-foreground/80 uppercase">
                          {t.app.roomType}
                        </label>
                        <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
                          <SelectTrigger className="w-full h-11 bg-background">
                            <SelectValue placeholder={t.app.roomType} />
                          </SelectTrigger>
                          <SelectContent>
                            {roomOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold tracking-wide text-foreground/80 uppercase">{t.app.selectStyle}</h3>
                        <StyleSelector
                          currentStyle={selectedStyle}
                          onStyleSelect={setSelectedStyle}
                          className="grid-cols-2 gap-3"
                          styles={styleOptions}
                        />
                      </div>

                      <div className="pt-2 flex flex-col gap-4">
                        <Button
                          onClick={handleGenerate}
                          disabled={isGenerating || generatedImages.length > 0}
                          size="lg"
                          className="w-full text-lg font-semibold shadow-lg shadow-blue-500/20 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-[1.02]"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              {t.app.generating}
                            </>
                          ) : generatedImages.length > 0 ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              {t.app.regenerate}
                            </>
                          ) : (
                            t.app.generate
                          )}
                        </Button>

                        {generatedImages.length > 0 && (
                          <Button variant="outline" onClick={handleDownload} className="w-full h-12 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors">
                            <Download className="mr-2 h-4 w-4" />
                            {t.app.download}
                          </Button>
                        )}

                        <Button variant="ghost" onClick={handleReset} className="w-full h-12 text-muted-foreground hover:text-destructive transition-colors">
                          {t.app.startOver}
                        </Button>
                      </div>

                      {error && (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20 flex items-center gap-2">
                          <span className="font-semibold">Error:</span> {error}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Viewer Panel */}
                  <div className="flex flex-col gap-6">
                    <div className="bg-card border rounded-2xl overflow-hidden shadow-2xl min-h-[500px] flex items-center justify-center relative ring-1 ring-border/50">
                      {generatedImages.length === 0 ? (
                        <div className="relative w-full h-full min-h-[600px] flex items-center justify-center bg-muted/10">
                          <img
                            src={originalImage}
                            alt="Original"
                            className="max-w-full max-h-[700px] h-auto w-auto object-contain drop-shadow-xl"
                          />
                          {!isGenerating && (
                            <div className="absolute top-4 right-4 animate-in fade-in duration-300">
                              <div className="bg-background/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20 text-sm font-medium flex items-center gap-2">
                                {t.app.originalPreview}
                              </div>
                            </div>
                          )}
                          <LoadingOverlay isVisible={isGenerating} lang={lang} />
                        </div>
                      ) : (
                        <ComparisonViewer
                          beforeImage={originalImage}
                          afterImage={generatedImages[selectedImageIndex]}
                          originalLabel={t.app.originalLabel}
                        />
                      )}
                    </div>

                    {/* Thumbnails */}
                    {generatedImages.length > 1 && (
                      <div className="grid grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                        {generatedImages.map((img, i) => (
                          <div
                            key={i}
                            className={cn(
                              "cursor-pointer rounded-xl overflow-hidden border-2 transition-all h-28 relative hover:scale-[1.03] hover:shadow-lg",
                              selectedImageIndex === i ? "border-primary ring-4 ring-primary/10 shadow-xl scale-[1.03]" : "border-transparent opacity-60 hover:opacity-100 grayscale hover:grayscale-0"
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
