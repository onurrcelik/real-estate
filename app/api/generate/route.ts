import * as fal from "@fal-ai/serverless-client";
import { NextRequest, NextResponse } from "next/server";
import { stylePrompts, negativePrompt } from "./prompt-utils";
import { createClient } from "@supabase/supabase-js";
import { v4 } from "uuid";

export async function POST(req: NextRequest) {
    // Ensure fal library finds the key if user used NEXT_PUBLIC_ prefix
    if (!process.env.FAL_KEY && process.env.NEXT_PUBLIC_FAL_KEY) {
        process.env.FAL_KEY = process.env.NEXT_PUBLIC_FAL_KEY;
    }

    try {
        const { image, style, imageSize, roomType } = await req.json();

        if (!image || !style) {
            return NextResponse.json(
                { error: "Missing image or style" },
                { status: 400 }
            );
        }

        // Configure fal
        // Note: In server context, it uses FAL_KEY env var automatically or we can set it via config if needed, 
        // but usually process.env.FAL_KEY is sufficient for server-side calls if configured.
        // However, the fal client is often used client-side. For server-side proxying:

        // We will use the 'fal.subscribe' method which handles the queueing.

        const roomLabel = roomType ? roomType.replace(/_/g, ' ') : 'room';
        const styleDescription = stylePrompts[style] || style;
        const prompt = `Strictly preserve exact room structure, perspective, and original dimensions. Do NOT change the camera angle or field of view.
    Virtual staging of a ${roomLabel} in ${style} style. ${styleDescription}
    High quality, photorealistic, interior design, 8k resolution.
    Keep all walls, windows, floors, and ceiling exactly as they are. Only replace movable furniture and decor to match ${style}.
    IMPORTANT: If a media console or TV stand is visible, place a large modern flat-screen TV on it. Replace any painting or artwork above the unit with the TV.`;

        console.log(`Generating with dimensions: ${imageSize ? `${imageSize.width}x${imageSize.height}` : 'default'}`);

        // Using Nano Banana Pro (Gemini 3) for image editing
        const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
            input: {
                prompt: prompt,
                image_urls: [image], // Nano Banana accepts a list of URLs
                output_format: "png",
                image_size: imageSize || "square_hd",
                negative_prompt: negativePrompt,
                num_images: 4,
                // sync_mode: false, // Optional
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === 'IN_PROGRESS') {
                    console.log(update.logs.map((log) => log.message).join('\n'));
                }
            },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result as any; // Temporary cast
        if (data.images && data.images.length > 0) {
            // --- Supabase Integration ---
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

                if (supabaseUrl && supabaseKey) {
                    const supabase = createClient(supabaseUrl, supabaseKey);

                    // 1. Upload Original Image ONCE
                    const uuidOriginal = v4();
                    const base64Data = image.split(',')[1];
                    const contentType = image.substring(image.indexOf(':') + 1, image.indexOf(';')) || 'image/png';
                    const fileExt = contentType.split('/')[1] || 'png';
                    const originalPath = `${uuidOriginal}_original.${fileExt}`;

                    const { error: uploadError1 } = await supabase.storage
                        .from('real-estate-generations')
                        .upload(originalPath, Buffer.from(base64Data, 'base64'), {
                            contentType: contentType,
                            upsert: false
                        });

                    if (uploadError1) console.error("Upload Original Error:", uploadError1);

                    const { data: publicUrlData1 } = supabase.storage.from('real-estate-generations').getPublicUrl(originalPath);
                    const finalOriginalUrl = publicUrlData1.publicUrl;

                    // 2. Loop through ALL generated images and save them
                    await Promise.all(data.images.map(async (img: any, index: number) => {
                        const generatedImageUrl = img.url;
                        const uuidGen = v4();

                        // Upload Generated Image
                        const genRes = await fetch(generatedImageUrl);
                        const genBlob = await genRes.arrayBuffer();
                        const genPath = `${uuidGen}_generated_${index}.jpeg`;

                        const { error: uploadError2 } = await supabase.storage
                            .from('real-estate-generations')
                            .upload(genPath, genBlob, {
                                contentType: 'image/jpeg',
                                upsert: false
                            });

                        if (uploadError2) console.error(`Upload Generated Error (${index}):`, uploadError2);

                        const { data: publicUrlData2 } = supabase.storage.from('real-estate-generations').getPublicUrl(genPath);
                        const finalGeneratedUrl = publicUrlData2.publicUrl;

                        // Insert into Database
                        const { error: dbError } = await supabase
                            .from('real-estate-generations')
                            .insert({
                                id: uuidGen,
                                original_image: finalOriginalUrl,
                                generated_image: finalGeneratedUrl,
                                style: style,
                                prompt: prompt
                            });

                        if (dbError) console.error(`Database Insert Error (${index}):`, dbError);
                    }));
                }
            } catch (err) {
                console.error("Supabase storage error (non-fatal):", err);
            }
            // --- End Supabase Integration ---

            return NextResponse.json({
                generatedImages: data.images.map((img: any) => img.url)
            });
        } else {
            throw new Error("No images generated");
        }
    } catch (error) {
        console.error("Error generating image with fal.ai:", error);
        return NextResponse.json(
            { error: "Failed to generate image", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
