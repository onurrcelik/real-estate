'use client';

import React, { useState, useEffect } from 'react';
// ... imports
import { signOutAction } from '@/app/actions';
import { UploadZone } from '@/components/features/upload/upload-zone';
import { StyleSelector } from '@/components/features/style/style-selector';
import { ComparisonViewer } from '@/components/features/viewer/comparison-viewer';
import { FlythroughViewer } from '@/components/features/viewer/flythrough-viewer';
import { LoadingOverlay } from '@/components/features/layout/loading-overlay';
import { Sidebar } from '@/components/features/layout/sidebar';
import { LimitPopup } from '@/components/features/layout/limit-popup';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { MismatchModal } from '@/components/features/layout/mismatch-modal';
import { Loader2, RefreshCw, Download, Palette, Home as HomeIcon, Briefcase, Coffee, Ghost, Sun, Globe, Layers, Image as SingleImageIcon, Play } from 'lucide-react';
import { BatchUploadZone } from '@/components/features/upload/batch-upload-zone';
import { cn } from '@/lib/utils';
import { translations, Language } from '@/lib/translations';

export default function Home() {
  const [lang, setLang] = useState<Language>('it'); // Default to Italian
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [numImages, setNumImages] = useState<number>(4);
  const [selectedStyle, setSelectedStyle] = useState<string>('Modern');
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('living_room');
  const [isGenerating, setIsGenerating] = useState(false);

  // Mode State
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  // Batch State
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [batchResults, setBatchResults] = useState<{ original: string; generated: string[] }[]>([]);
  const [showFlythrough, setShowFlythrough] = useState(false);

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generations, setGenerations] = useState<any[]>([]);
  const [userLimit, setUserLimit] = useState<{ role: string; count: number } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const t = translations[lang];

  // Room Detection State
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const detectRoomType = async (base64Image: string) => {
    setIsDetecting(true);
    setDetectedType(null); // Reset
    try {
      const response = await fetch('/api/detect-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.roomType && data.roomType !== 'unknown') {
          console.log("Detected Room Type:", data.roomType);
          setDetectedType(data.roomType);
        }
      }
    } catch (error) {
      console.error("Room detection failed:", error);
    } finally {
      setIsDetecting(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
        if (data.user) {
          setUserLimit({
            role: data.user.role || 'general',
            count: data.user.generation_count || 0
          });
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDeleteGeneration = async (id: string) => {
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
        detectRoomType(result);
      }
    };
    reader.onerror = () => setIsProcessing(false);
    reader.readAsDataURL(processFile);
  };

  const handleBatchImagesSelect = async (files: File[]) => {
    setIsProcessing(true);
    try {
      const processed = await Promise.all(files.map(async (file) => {
        // 1. Handle HEIC, Resize etc. (Duplicate logic for now or refactor)
        // For simplicity, reusing same logic but inside loop
        let processFile = file;
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
          const heic2any = (await import('heic2any')).default;
          const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
          const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          processFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
        }
        const resizedBlob = await resizeImage(processFile);
        const newName = processFile.name.replace(/\.[^/.]+$/, "") + ".jpg";
        processFile = new File([resizedBlob], newName, { type: 'image/jpeg' });

        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(processFile);
        });
      }));

      setOriginalImages(processed);
      setBatchResults([]);
      setError(null);
      if (processed.length > 0) {
        detectRoomType(processed[0]);
      }
    } catch (e) {
      console.error("Batch processing failed", e);
      setError("Failed to process some images.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateClick = () => {
    if (detectedType && detectedType !== 'unknown' && detectedType !== selectedRoomType) {
      setShowMismatchModal(true);
    } else {
      if (mode === 'single') handleGenerate();
      else handleBatchGenerate();
    }
  };

  const handleGenerate = async () => {
    if (!originalImage) return;
    setIsGenerating(true);
    setError(null);
    setErrorCode(null);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: originalImage,
          style: selectedStyle,
          roomType: selectedRoomType,
          imageSize: imageSize,
          numImages: numImages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code) {
          setErrorCode(data.code);
        }
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
        // Refresh history to update limit count and show new generation in sidebar
        fetchHistory();

        // Auto-scroll to results on mobile
        setTimeout(() => {
          if (window.innerWidth < 1024 && resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
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

  const handleBatchGenerate = async () => {
    if (originalImages.length === 0) return;
    setIsGenerating(true);
    setError(null);
    setErrorCode(null);

    try {
      // We use default numImagesPerAngle = 1 for now or hardcode or let user choose.
      // User didn't specify multi-variations per angle in batch req, but "consistency".
      // Let's assume 1 variation per angle is enough for a "project".
      const response = await fetch('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: originalImages,
          style: selectedStyle,
          roomType: selectedRoomType,
          numImagesPerAngle: 1 // Default
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.code) setErrorCode(data.code);
        throw new Error(data.details || data.error || "Batch generation failed");
      }

      if (data.results) {
        setBatchResults(data.results);
        fetchHistory();
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
    setOriginalImages([]);
    setBatchResults([]);
    setSelectedImageIndex(0);
    setImageSize(null);
    setError(null);
    setIsProcessing(false);
    setSelectedRoomType('living_room');
  };

  const downloadImage = async (url: string, filename = `staged-room-${Date.now()}.png`) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Failed to download', e);
    }
  };

  const handleDownload = () => {
    if (generatedImages.length === 0) return;
    downloadImage(generatedImages[selectedImageIndex]);
  };

  const handleSelectGeneration = (gen: any) => {
    try {
      const parsed = JSON.parse(gen.generated_image);

      // 1. Check if it's a batch generation
      if (parsed.isBatch && parsed.results) {
        setMode('batch');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setOriginalImages(parsed.results.map((r: any) => r.original));
        setBatchResults(parsed.results);

        setOriginalImage(null);
        setGeneratedImages([]);
      } else {
        // 2. Standard Single Generation
        setMode('single');
        setOriginalImage(gen.original_image);
        if (Array.isArray(parsed)) {
          setGeneratedImages(parsed);
        } else {
          setGeneratedImages([gen.generated_image]);
        }
        setBatchResults([]);
        setOriginalImages([]);
      }
    } catch (e) {
      // Fallback for very old data or errors
      setMode('single');
      setOriginalImage(gen.original_image);
      setGeneratedImages([gen.generated_image]);
      setBatchResults([]);
      setOriginalImages([]);
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
        generations={generations}
        loading={loadingHistory}
        onDeleteGeneration={handleDeleteGeneration}
        userLimit={userLimit}
        onSignOut={signOutAction}
        onLanguageChange={setLang}
      />

      <LimitPopup
        isOpen={errorCode === 'LIMIT_REACHED'}
        onClose={() => setErrorCode(null)}
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

          <div className="flex-1 hidden md:flex justify-end items-center gap-4">
            {/* Usage Limit Display */}
            {userLimit && (
              <div className="flex flex-col items-end mr-2">
                {userLimit.role === 'admin' ? (
                  <div className="flex items-center justify-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-5 py-1.5 rounded-full shadow-xl border border-white/10 ring-1 ring-black/10">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/90">
                      {t.app?.limitless || "Usage Limit: Unlimited"}
                    </span>
                  </div>
                ) : (
                  <div className="w-32 flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                      <span>{t.app?.usage || "Usage"}</span>
                      <span>{userLimit.count} / 3</span>
                    </div>
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden border border-border/50">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          userLimit.count >= 3 ? "bg-destructive" : "bg-primary"
                        )}
                        style={{ width: `${Math.min((userLimit.count / 3) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <form action={async () => {
              await signOutAction();
            }} onSubmit={(e) => {
              if (!confirm(t.auth.signOutConfirm)) {
                e.preventDefault();
              }
            }}>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                {t.auth.signOut}
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
          {(!originalImage && originalImages.length === 0) && (
            <header className="text-center space-y-4 py-8 md:py-16">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white animate-in fade-in slide-in-from-top-4 duration-700 drop-shadow-sm">
                {t.app.title}
              </h1>
              <p className="text-muted-foreground text-xl md:text-2xl max-w-2xl mx-auto font-light animate-in fade-in slide-in-from-top-5 duration-700 delay-150">
                {t.app.subtitle}
              </p>
            </header>
          )}

          {/* Mode Toggle - Only show when no images selected yet */}
          {(!originalImage && originalImages.length === 0) && (
            <div className="flex justify-center animate-in fade-in zoom-in duration-500 delay-200">
              <div className="bg-secondary/50 p-1 rounded-full border border-border/50 flex gap-2">
                <Button
                  variant={mode === 'single' ? 'default' : 'ghost'}
                  className="rounded-full px-6"
                  onClick={() => setMode('single')}
                >
                  <SingleImageIcon className="w-4 h-4 mr-2" />
                  {t.app.singleRoom}
                </Button>
                <Button
                  variant={mode === 'batch' ? 'default' : 'ghost'}
                  className="rounded-full px-6"
                  onClick={() => setMode('batch')}
                >
                  <Layers className="w-4 h-4 mr-2" />
                  {t.app.multiAngleProject}
                </Button>
              </div>
            </div>
          )}

          <div className={cn("transition-all", originalImage ? "h-full" : "space-y-10")}>


            {/* Upload Zone */}
            {(!originalImage && originalImages.length === 0) && (
              <div className="max-w-2xl mx-auto animate-in fade-in zoom-in duration-500">
                {mode === 'single' ? (
                  <UploadZone
                    onImageSelected={handleImageSelect}
                    title={t.app.uploadMainTitle}
                    dragActiveTitle={t.app.uploadDragActive}
                    description={t.app.uploadDesc}
                    supportedFormats={t.app.uploadSupportedFormats}
                    isProcessing={isProcessing}
                  />
                ) : (
                  <BatchUploadZone
                    onImagesSelected={handleBatchImagesSelect}
                    isProcessing={isProcessing}
                    title={t.app.batchUploadTitle}
                    description={t.app.batchDesc}
                    dropTitle={t.app.batchDropActive}
                    processingTitle={t.app.batchProcessing}
                    maxFilesText={t.app.maxImages}
                  />
                )}
              </div>
            )}

            {/* Workspace - Single or Batch */}
            {(originalImage || originalImages.length > 0) && (
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

                      <div className="space-y-4">
                        <label className="text-sm font-semibold tracking-wide text-foreground/80 uppercase">
                          {t.app.numberOfImages || "Number of Images"}
                        </label>
                        {mode === 'single' ? (
                          <div className="grid grid-cols-2 gap-3 p-1 bg-secondary/30 rounded-lg border border-border/50">
                            {[2, 4].map((num) => (
                              <Button
                                key={num}
                                variant={numImages === num ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setNumImages(num)}
                                className={cn(
                                  "w-full transition-all text-sm font-medium",
                                  numImages === num
                                    ? "bg-gray-900 text-white shadow-md dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                                    : "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                              >
                                {num} {lang === 'it' ? (num === 2 ? 'Immagini' : 'Immagini') : (num === 2 ? 'Images' : 'Images')}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">
                            {t.app.batchConsistencyMsg}
                          </div>
                        )}
                        {mode === 'single' && (
                          <p className="text-[11px] text-muted-foreground/80 font-medium italic flex items-center gap-1.5 px-1">
                            <span className="text-primary">✨</span>
                            {t.app.imageRecommendation || "We recommend 4 images for best results"}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 flex flex-col gap-4">
                        {/* Mismatch Warning Modal */}

                        <Button
                          className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] border-0"
                          size="lg"
                          disabled={isGenerating || isProcessing || (!originalImage && originalImages.length === 0)}
                          onClick={handleGenerateClick}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              {t.app.generating}
                            </>
                          ) : (mode === 'single' ? generatedImages.length > 0 : batchResults.length > 0) ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              {t.app.regenerate}
                            </>
                          ) : (
                            t.app.generate
                          )}

                        </Button>

                        {/* Download removed for batch for now or needs update */}
                        {mode === 'single' && generatedImages.length > 0 && (
                          <Button variant="outline" onClick={handleDownload} className="w-full h-12 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors">
                            <Download className="mr-2 h-4 w-4" />
                            {t.app.download}
                          </Button>
                        )}
                      </div>

                      <MismatchModal
                        isOpen={showMismatchModal}
                        onClose={() => {
                          setShowMismatchModal(false);
                          // If they close without verifying, maybe just proceed? 
                          // Or do nothing? "Keep selected" implies proceeding.
                          if (mode === 'single') handleGenerate(); else handleBatchGenerate();
                        }}
                        onConfirm={() => {
                          if (detectedType) setSelectedRoomType(detectedType);
                          setShowMismatchModal(false);
                          // Don't auto-generate, let them see the switch.
                        }}
                        detectedType={detectedType || ''}
                        selectedType={selectedRoomType}
                        lang={lang}
                      />

                      <Button variant="ghost" onClick={handleReset} className="w-full h-12 text-muted-foreground hover:text-destructive transition-colors">
                        {t.app.startOver}
                      </Button>

                      {error && (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20 mt-4">
                          {errorCode === 'LIMIT_REACHED' ? (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2 font-semibold">
                                <span>⚠️</span>
                                {t.app.limitReachedError}
                              </div>
                              <div className="pl-6 flex flex-col gap-2 text-destructive/90">
                                <p className="font-medium bg-background/50 w-fit px-3 py-1 rounded-md border border-destructive/10">
                                  {t.app.contactSupport}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-green-600">WhatsApp:</span>
                                  <span>{t.app.whatsappContact}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Error:</span> {error}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Viewer Panel */}
                  <div className="flex flex-col gap-6" ref={resultsRef}>
                    {mode === 'single' ? (
                      <>
                        <div className="bg-card border rounded-2xl overflow-hidden shadow-2xl min-h-[300px] md:min-h-[500px] flex items-center justify-center relative ring-1 ring-border/50">
                          {generatedImages.length === 0 ? (
                            <div className="relative w-full h-full min-h-[300px] md:min-h-[600px] flex items-center justify-center bg-muted/10">
                              <img
                                src={originalImage || ''}
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
                              beforeImage={originalImage || ''}
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
                      </>
                    ) : (
                      // Batch Results View
                      <div className="space-y-8 min-h-[600px] relative">
                        {batchResults.length === 0 ? (
                          <div className="grid grid-cols-2 gap-4">
                            {originalImages.map((img, idx) => (
                              <div key={idx} className="bg-card border rounded-xl overflow-hidden relative shadow-sm h-64 flex items-center justify-center bg-muted/10">
                                <img src={img} className="max-w-full max-h-full object-contain" />
                                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">{t.app.angle} {idx + 1}</div>
                              </div>
                            ))}
                            <LoadingOverlay isVisible={isGenerating} lang={lang} />
                          </div>
                        ) : (
                          <div className="space-y-8">
                            {/* Flythrough Button */}
                            <div className="flex justify-center">
                              <Button
                                onClick={() => setShowFlythrough(true)}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                                size="lg"
                              >
                                <Play className="w-5 h-5 mr-2" />
                                {t.app.watchFlythrough}
                              </Button>
                            </div>

                            {/* Batch Results Grid */}
                            <div className="space-y-12">
                              {batchResults.map((result, idx) => (
                                <div key={idx} className="space-y-4">
                                  <h3 className="text-lg font-bold text-muted-foreground flex items-center gap-2">
                                    <SingleImageIcon className="w-5 h-5" /> {t.app.angle} {idx + 1}
                                  </h3>
                                  <div className="h-[400px] bg-card border rounded-2xl overflow-hidden shadow-lg ring-1 ring-border/50 relative group">
                                    <ComparisonViewer
                                      beforeImage={result.original}
                                      afterImage={result.generated[0]}
                                      originalLabel={`${t.app.originalLabel} (${t.app.angle} ${idx + 1})`}
                                    />
                                    {/* Save Button for Batch Result */}
                                    {result.generated[0] && (
                                      <Button
                                        size="icon"
                                        variant="secondary"
                                        className="absolute bottom-4 right-4 z-20 shadow-lg hover:scale-105 transition-transform bg-white/90 hover:bg-white text-gray-900"
                                        onClick={(e) => {
                                          e.stopPropagation(); // prevent interfering with comparison viewer if any
                                          downloadImage(result.generated[0], `angle-${idx + 1}-${Date.now()}.png`);
                                        }}
                                        title="Download Generated Image"
                                      >
                                        <Download className="w-5 h-5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Flythrough Viewer Modal */}
                            {showFlythrough && (
                              <FlythroughViewer
                                images={batchResults.map(r => r.generated[0]).filter(Boolean)}
                                onClose={() => setShowFlythrough(false)}
                                lang={lang}
                              />
                            )}
                          </div>
                        )}
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
  )
}
