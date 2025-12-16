import * as fal from "@fal-ai/serverless-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    // Ensure fal library finds the key if user used NEXT_PUBLIC_ prefix
    if (!process.env.FAL_KEY && process.env.NEXT_PUBLIC_FAL_KEY) {
        process.env.FAL_KEY = process.env.NEXT_PUBLIC_FAL_KEY;
    }

    try {
        const { image, style, aspectRatio } = await req.json();

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

        const prompt = `Virtual staging of a room in ${style} style. 
    High quality, photorealistic, interior design, 8k resolution.
    Keep the room structure, replace furniture and decor to match ${style}.`;

        console.log(`Generating with aspect ratio: ${aspectRatio || 'default'}`);

        // Using Nano Banana Pro (Gemini 3) for image editing
        const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
            input: {
                prompt: prompt,
                image_urls: [image], // Nano Banana accepts a list of URLs
                output_format: "png",
                image_size: aspectRatio || "square_hd", // Pass calculated aspect ratio
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
            return NextResponse.json({ generatedImage: data.images[0].url });
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
