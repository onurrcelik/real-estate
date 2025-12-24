
import * as fal from "@fal-ai/serverless-client";
import { NextRequest, NextResponse } from "next/server";
import { stylePrompts, negativePrompt } from "../generate/prompt-utils";
import { createClient } from "@supabase/supabase-js";
import { v4 } from "uuid";
import { auth } from "@/lib/auth/auth";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.FAL_KEY && process.env.NEXT_PUBLIC_FAL_KEY) {
        process.env.FAL_KEY = process.env.NEXT_PUBLIC_FAL_KEY;
    }

    try {
        const { images, style, roomType, numImagesPerAngle = 1 } = await req.json();

        if (!images || !Array.isArray(images) || images.length === 0 || !style) {
            return NextResponse.json(
                { error: "Missing images or style" },
                { status: 400 }
            );
        }

        // --- CHECK LIMITS ---
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: user, error: userError } = await supabaseAdmin
            .from('clients-real-estate')
            .select('role, generation_count')
            .eq('id', session.user.id)
            .single();

        if (!userError && user) {
            const LIMITS = { admin: 100, general: 10 }; // Increased limit potential for batch?? Or stick to standard?
            // User requested NO logic change. Standard users have limit of 3.
            // Batch generation of 3 images counts as 3 generations or 1 "batch"?
            // Plan said: "treat each Angle as a separate generation".
            // So if I upload 3 images, I valid cost is 3.

            const limit = user.role === 'admin' ? 100 : 3;
            // Calculate how many we are about to generate
            // Actually, for batch mode, usually we might generate 1 variation per angle to keep it sane, or multiple.
            // Let's assume 1 variation per angle per batch request for now to save quota, or use numImagesPerAngle.
            // Default numImagesPerAngle = 1.
            const cost = images.length * numImagesPerAngle;

            if ((user.generation_count + cost) > limit) {
                return NextResponse.json({
                    error: `Generation limit reached. This batch requires ${cost} credits, you have ${limit - user.generation_count} left.`,
                    code: 'LIMIT_REACHED'
                }, { status: 403 });
            }
        }

        console.time('Batch_Total_Execution');
        const roomLabel = roomType ? roomType.replace(/_/g, ' ') : 'room';
        const styleDescription = stylePrompts[style] || style;

        // Single consistency seed for the whole batch (for reproducibility across angles)
        const consistencySeed = Math.floor(Math.random() * 10000000);

        // Construct Prompts (Same logic as valid single route)
        let specificPrompt = "";
        if (roomType === 'living_room') {
            specificPrompt = "IMPORTANT: If a media console or TV stand is visible, place a large modern flat-screen TV on it. Replace any painting or artwork above the unit with the TV.";
        } else if (roomType === 'bathroom') {
            specificPrompt = "IMPORTANT: STRICTLY PRESERVE existing wall tiles, floor tiles, vanity cabinet, sink, tap, and toilet. Do NOT change tile patterns, size, or material. Do NOT change the vanity or sink. Only enhance lighting and update movable decor like towels, mirrors, or shower curtains.";
        } else if (roomType === 'kitchen') {
            specificPrompt = "IMPORTANT: STRICTLY PRESERVE the entire kitchen cabinetry, countertops, backsplash, sink, tap, stove, and oven. Do NOT change colors, materials, or styles of these permanent fixtures. ONLY add or update movable items like fruit bowls, appliances on counter, rugs, or lighting. The goal is VIRTUAL STAGING of decor, NOT RENOVATION.";
        } else if (roomType === 'bedroom') {
            specificPrompt = "IMPORTANT: Keep the bed in its original position. Focus on upgrading the bedding, headboard, nightstands, and rugs.";
        } else if (roomType === 'dining_room') {
            specificPrompt = "IMPORTANT: Preserve the dining table's location and the ceiling light fixture position. Focus on updating the table style and chairs.";
        }


        // Simplified prompt matching the single route for better spatial consistency
        const prompt = `Strictly preserve exact room structure, perspective, and original dimensions. Do NOT change the camera angle or field of view.
    Virtual staging of a ${roomLabel} in ${style} style. ${styleDescription}
    High quality, photorealistic, interior design, 8k resolution.
    Keep all walls, windows, floors, and ceiling exactly as they are. Only replace movable furniture and decor to match ${style}.
    ${specificPrompt}`;

        // Use supabaseAdmin (service role) for all database/storage operations
        const supabase = supabaseAdmin;

        // --- Process Each Image in Parallel ---
        // We map each image to a promise that handles: Original Upload -> AI Gen -> Result Upload -> DB Insert
        const processImagePromise = async (base64Image: string, index: number) => {
            const recordId = v4();
            const cleanStyle = style.replace(/[^a-zA-Z0-9]/g, '_');
            const cleanRoom = roomType ? roomType.replace(/[^a-zA-Z0-9]/g, '_') : 'room';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const storageFolder = `${cleanStyle}_${cleanRoom}_batch_${timestamp}_${recordId}`;

            // 1. Upload Original
            let originalUrl = "";
            if (supabase) {
                const base64Data = base64Image.split(',')[1]; // Handle data:image/jpeg;base64,...
                const contentType = base64Image.match(/data:(.*);base64/)?.[1] || 'image/png';
                const fileExt = contentType.split('/')[1] || 'png';
                const originalPath = `${storageFolder}/original_${index}.${fileExt}`;

                const { error: upErr } = await supabase.storage
                    .from('real-estate-generations')
                    .upload(originalPath, Buffer.from(base64Data, 'base64'), { contentType, upsert: false });

                if (!upErr) {
                    const { data } = supabase.storage.from('real-estate-generations').getPublicUrl(originalPath);
                    originalUrl = data.publicUrl;
                }
            }

            // 2. Call AI
            // NOTE: Only use seed for subsequent angles - seed interferes with spatial_consistency
            const falInput: any = {
                prompt: prompt,
                image_urls: [base64Image],
                output_format: "jpeg",
                image_size: "square_hd",
                negative_prompt: negativePrompt,
                num_images: numImagesPerAngle,
                spatial_consistency: "on_structure_match" // Lock depth map for structure preservation
            };

            // Only add seed for subsequent angles (first angle matches single route exactly)
            if (index > 0) {
                falInput.seed = consistencySeed;
            }

            const result: any = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
                input: falInput,
                logs: false,
            });

            // 3. Process Results
            const generatedUrls: string[] = [];
            if (result.images && result.images.length > 0) {
                if (supabase && storageFolder) {
                    await Promise.all(result.images.map(async (img: any, i: number) => {
                        const genUrl = img.url;
                        const genRes = await fetch(genUrl);
                        const genBlob = await genRes.arrayBuffer();
                        const genPath = `${storageFolder}/generated_${index}_${i}.jpeg`;

                        await supabase.storage.from('real-estate-generations')
                            .upload(genPath, genBlob, { contentType: 'image/jpeg', upsert: false });

                        const { data } = supabase.storage.from('real-estate-generations').getPublicUrl(genPath);
                        generatedUrls.push(data.publicUrl);
                    }));
                } else {
                    // If no supabase, just use FAL urls
                    generatedUrls.push(...result.images.map((i: any) => i.url));
                }
            }

            // 4. Record to DB
            return {
                original: originalUrl || base64Image, // Fallback to base64 if upload failed or no supabase
                generated: generatedUrls
            };
        };

        const imagePromises = images.map((img: string, idx: number) => processImagePromise(img, idx));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any[] = await Promise.all(imagePromises);

        console.timeEnd('Batch_Total_Execution');

        // 4. Record to DB (Single Entry for Batch)
        // We use the first image as the "cover" original_image for the history thumbnail.
        // We store the full structured results in generated_image JSON.
        if (supabase && results.length > 0) {
            const coverImage = results[0].original;

            // Construct the Batch Generation Object
            // Structure matching what page.tsx expects: { isBatch: true, results: [...] }
            const batchData = {
                isBatch: true,
                results: results
            };

            await supabase.from('real-estate-generations').insert({
                id: v4(), // New ID for the batch record
                original_image: coverImage,
                generated_image: JSON.stringify(batchData),
                style: style,
                prompt: prompt,
                room_type: roomType,
                user: session.user.id
            });
        }

        // Increment count by total generated items
        if (user) {
            const totalGenerated = images.length * numImagesPerAngle;
            await supabaseAdmin
                .from('clients-real-estate')
                .update({ generation_count: (user.generation_count || 0) + totalGenerated })
                .eq('id', session.user.id);
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error("Batch Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate batch", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
