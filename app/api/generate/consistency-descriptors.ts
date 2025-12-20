
interface ConsistencyOptions {
    furniture: string[];
    lighting: string[];
    rugs: string[];
    curtains: string[];
    decor: string[];
}

export const consistencyDescriptors: Record<string, ConsistencyOptions> = {
    Modern: {
        furniture: [
            "sleek grey upholstered dining chairs with black metal legs and a glass dining table",
            "minimalist white molded plastic chairs with wooden dowel legs and a white round table",
            "modern brown leather dining chairs and a solid walnut dining table",
            "black matte dining chairs with curved backs and a dark grey stone dining table"
        ],
        lighting: [
            "matte black modern linear pendant light tailored for high ceilings",
            "sculptural glass globe chandelier with brass accents",
            "minimalist recessed LED strip lighting in coves",
            "large arc floor lamp with chrome finish"
        ],
        rugs: [
            "light grey geometric pattern wool area rug",
            "solid charcoal textured woven rug",
            "abstract modern rug with beige and muted blue tones",
            "low pile off-white rug with subtle border"
        ],
        curtains: [
            "floor-to-ceiling sheer white linen curtains",
            "modern light grey grommet top drapes",
            "no curtains, clean unobstructed windows with matte black frames",
            "automated white roller shades"
        ],
        decor: [
            "minimalist ceramic white vases and coffee table art books",
            "abstract metal sculpture and fresh green potted plant",
            "monochromatic gallery wall prints and glass candle holders",
            "sleek digital clock and decorative concrete tray"
        ]
    },
    Scandinavian: {
        furniture: [
            "light oak wishbone chairs with woven seats and a light ash wood table",
            "white wooden spindle-back chairs and a simple pine dining table",
            "grey wool fabric dining chairs with light wood legs"
        ],
        lighting: [
            "oversized white paper lantern pendant",
            "simple wood and white metal pendant light",
            "warm ambient floor lamp with fabric shade"
        ],
        rugs: [
            "handwoven off-white wool rug with high texture",
            "grey faux fur rug",
            "light beige jute rug"
        ],
        curtains: [
            "sheer white cotton curtains letting in maximum light",
            "light beige linen drapes",
            "no window treatments to maximize natural light"
        ],
        decor: [
            "hygge style candles, knit throw blanket, and dried flowers",
            "simple wooden tray with ceramic cups",
            "minimalist botanical prints in oak frames"
        ]
    },
    Industrial: {
        furniture: [
            "cognac leather tufted dining chairs and a reclaimed wood table with iron pipe legs",
            "black metal Tolix style chairs and a raw concrete dining table",
            "distressed brown leather sofa and a coffee table made of wood and metal wheels"
        ],
        lighting: [
            "exposed Edison bulb pendant lights with black wire cages",
            "vintage metal factory pendant lamp",
            "track lighting with black spotlights"
        ],
        rugs: [
            "distressed persian style runner rug in faded red/blue",
            "cowhide rug",
            "dark grey flatweave wool rug"
        ],
        curtains: [
            "heavy dark grey velvet curtains",
            "wooden slat blinds",
            "exposed large industrial windows without curtains"
        ],
        decor: [
            "vintage metal clock, leather bound books, and metal gear sculpture",
            "reclaimed wood shelving with antique glass bottles",
            "large abstract black and white art leaning on wall"
        ]
    },
    // Fallbacks for other styles using Modern or Generic mix if needed
    // ... For brevity, default others to Modern logic or partial map
};

// Default fallback if style not found
const defaultOptions = consistencyDescriptors['Modern'];

export function getDidacticConsistencyPrompts(style: string, seed: number): string {
    const options = consistencyDescriptors[style] || defaultOptions;

    // Deterministic selection for each category using offsets to avoid picking index 0 for everything
    const furnIndex = seed % options.furniture.length;
    const lightIndex = (seed + 1) % options.lighting.length;
    const rugIndex = (seed + 2) % options.rugs.length;
    const decorIndex = (seed + 4) % options.decor.length;
    return `
    Furniture constrained to: ${options.furniture[furnIndex]}.
    Lighting feature: ${options.lighting[lightIndex]}.
    Rug style: ${options.rugs[rugIndex]}.
    Decor theme: ${options.decor[decorIndex]}.
    `;
}
