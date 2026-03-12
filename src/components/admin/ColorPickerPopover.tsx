import { useState, useMemo, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Search, Pipette, Check } from "lucide-react";

/* ─── Curated Fashion Color Palette ─── */
interface PresetColor {
    name: string;
    hex: string;
    category: string;
}

const PRESET_COLORS: PresetColor[] = [
    // Neutrals
    { name: "Snow White", hex: "#FFFAFA", category: "Neutrals" },
    { name: "Ivory", hex: "#FFFFF0", category: "Neutrals" },
    { name: "Cream", hex: "#FFFDD0", category: "Neutrals" },
    { name: "Beige", hex: "#F5F5DC", category: "Neutrals" },
    { name: "Sand", hex: "#C2B280", category: "Neutrals" },
    { name: "Taupe", hex: "#483C32", category: "Neutrals" },
    { name: "Charcoal", hex: "#36454F", category: "Neutrals" },
    { name: "Jet Black", hex: "#0A0A0A", category: "Neutrals" },

    // Reds & Pinks
    { name: "Rose Pink", hex: "#FF007F", category: "Reds & Pinks" },
    { name: "Blush", hex: "#DE5D83", category: "Reds & Pinks" },
    { name: "Coral", hex: "#FF7F50", category: "Reds & Pinks" },
    { name: "Salmon", hex: "#FA8072", category: "Reds & Pinks" },
    { name: "Dusty Rose", hex: "#DCAE96", category: "Reds & Pinks" },
    { name: "Hot Pink", hex: "#FF69B4", category: "Reds & Pinks" },
    { name: "Fuchsia", hex: "#FF00FF", category: "Reds & Pinks" },
    { name: "Crimson", hex: "#DC143C", category: "Reds & Pinks" },
    { name: "Maroon", hex: "#800000", category: "Reds & Pinks" },
    { name: "Wine Red", hex: "#722F37", category: "Reds & Pinks" },

    // Blues
    { name: "Sky Blue", hex: "#87CEEB", category: "Blues" },
    { name: "Powder Blue", hex: "#B0E0E6", category: "Blues" },
    { name: "Royal Blue", hex: "#4169E1", category: "Blues" },
    { name: "Navy Blue", hex: "#000080", category: "Blues" },
    { name: "Midnight Blue", hex: "#191970", category: "Blues" },
    { name: "Teal", hex: "#008080", category: "Blues" },
    { name: "Turquoise", hex: "#40E0D0", category: "Blues" },
    { name: "Aqua", hex: "#00FFFF", category: "Blues" },

    // Greens
    { name: "Mint", hex: "#98FF98", category: "Greens" },
    { name: "Sage", hex: "#BCB88A", category: "Greens" },
    { name: "Olive", hex: "#808000", category: "Greens" },
    { name: "Emerald", hex: "#50C878", category: "Greens" },
    { name: "Forest Green", hex: "#228B22", category: "Greens" },
    { name: "Hunter Green", hex: "#355E3B", category: "Greens" },

    // Yellows & Oranges
    { name: "Lemon", hex: "#FFF44F", category: "Yellows & Oranges" },
    { name: "Mustard", hex: "#FFDB58", category: "Yellows & Oranges" },
    { name: "Marigold", hex: "#EAA221", category: "Yellows & Oranges" },
    { name: "Peach", hex: "#FFCBA4", category: "Yellows & Oranges" },
    { name: "Tangerine", hex: "#FF9966", category: "Yellows & Oranges" },
    { name: "Burnt Orange", hex: "#CC5500", category: "Yellows & Oranges" },
    { name: "Rust", hex: "#B7410E", category: "Yellows & Oranges" },

    // Purples
    { name: "Lavender", hex: "#E6E6FA", category: "Purples" },
    { name: "Lilac", hex: "#C8A2C8", category: "Purples" },
    { name: "Mauve", hex: "#E0B0FF", category: "Purples" },
    { name: "Plum", hex: "#8E4585", category: "Purples" },
    { name: "Violet", hex: "#7F00FF", category: "Purples" },
    { name: "Eggplant", hex: "#614051", category: "Purples" },
    { name: "Royal Purple", hex: "#7851A9", category: "Purples" },

    // Metallics
    { name: "Champagne Gold", hex: "#F7E7CE", category: "Metallics" },
    { name: "Rose Gold", hex: "#B76E79", category: "Metallics" },
    { name: "Antique Gold", hex: "#CFB53B", category: "Metallics" },
    { name: "Silver", hex: "#C0C0C0", category: "Metallics" },
    { name: "Pewter", hex: "#8BA8B7", category: "Metallics" },
    { name: "Bronze", hex: "#CD7F32", category: "Metallics" },
    { name: "Copper", hex: "#B87333", category: "Metallics" },
];

const CATEGORIES = [...new Set(PRESET_COLORS.map((c) => c.category))];

/* ─── Helpers ─── */
function hexDistance(a: string, b: string): number {
    const parse = (h: string) => {
        const v = h.replace("#", "");
        return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    };
    const [r1, g1, b1] = parse(a);
    const [r2, g2, b2] = parse(b);
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function closestPresetName(hex: string): string {
    let best = PRESET_COLORS[0];
    let bestDist = Infinity;
    for (const p of PRESET_COLORS) {
        const d = hexDistance(hex, p.hex);
        if (d < bestDist) {
            bestDist = d;
            best = p;
        }
    }
    return best.name;
}

function isLightColor(hex: string): boolean {
    const v = hex.replace("#", "");
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

/* ─── Component ─── */
interface ColorPickerPopoverProps {
    value: string; // current hex
    colorName: string;
    onColorChange: (hex: string, name: string) => void;
}

export default function ColorPickerPopover({ value, colorName, onColorChange }: ColorPickerPopoverProps) {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const nativeRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        if (!search.trim()) return null; // show all categories when no search
        const q = search.toLowerCase();
        return PRESET_COLORS.filter(
            (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q)
        );
    }, [search]);

    const handlePresetClick = (preset: PresetColor) => {
        onColorChange(preset.hex, preset.name);
        setOpen(false);
        setSearch("");
    };

    const handleNativeChange = (hex: string) => {
        const suggested = closestPresetName(hex);
        onColorChange(hex, suggested);
    };

    const handleHexInput = (raw: string) => {
        let hex = raw.startsWith("#") ? raw : `#${raw}`;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            const suggested = closestPresetName(hex);
            onColorChange(hex, suggested);
        }
    };

    const renderSwatches = (colors: PresetColor[]) =>
        colors.map((c) => {
            const isActive = c.hex.toLowerCase() === value.toLowerCase();
            const light = isLightColor(c.hex);
            return (
                <button
                    key={c.name}
                    type="button"
                    title={`${c.name} (${c.hex})`}
                    onClick={() => handlePresetClick(c)}
                    className="group relative h-7 w-7 rounded-full border-2 transition-all duration-150 hover:scale-125 hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                    style={{
                        backgroundColor: c.hex,
                        borderColor: isActive ? "hsl(var(--primary))" : "rgba(0,0,0,0.1)",
                        boxShadow: isActive ? "0 0 0 2px hsl(var(--primary) / 0.3)" : undefined,
                    }}
                >
                    {isActive && (
                        <Check
                            className="absolute inset-0 m-auto h-3.5 w-3.5"
                            style={{ color: light ? "#111" : "#fff" }}
                        />
                    )}
                    {/* Tooltip */}
                    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        {c.name}
                    </span>
                </button>
            );
        });

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="h-9 w-12 rounded-lg border-2 border-black/10 cursor-pointer transition-all hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 relative overflow-hidden"
                    style={{ backgroundColor: value }}
                    title={`${colorName || "Pick a color"} (${value})`}
                >
                    {/* Checkerboard for very light colors */}
                    <span
                        className="absolute inset-0 -z-10"
                        style={{
                            backgroundImage:
                                "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                            backgroundSize: "8px 8px",
                            backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                        }}
                    />
                </button>
            </PopoverTrigger>

            <PopoverContent
                className="w-80 p-0 overflow-hidden"
                align="start"
                sideOffset={8}
            >
                {/* ── Search ── */}
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                        type="text"
                        placeholder="Search colors... (e.g. blue, pink, gold)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-body"
                        autoFocus
                    />
                </div>

                {/* ── Swatches ── */}
                <div className="max-h-64 overflow-y-auto px-3 py-2 space-y-3 scrollbar-thin">
                    {filtered ? (
                        // Search results
                        filtered.length > 0 ? (
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-body">
                                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {renderSwatches(filtered)}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-4 font-body">
                                No colors found. Try the custom picker below.
                            </p>
                        )
                    ) : (
                        // Show by category
                        CATEGORIES.map((cat) => (
                            <div key={cat}>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-body">
                                    {cat}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {renderSwatches(PRESET_COLORS.filter((c) => c.category === cat))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* ── Footer: Hex input + custom picker ── */}
                <div className="border-t border-border px-3 py-2.5 flex items-center gap-2 bg-muted/30">
                    {/* Live preview */}
                    <div
                        className="h-7 w-7 rounded-md border border-black/10 shrink-0 shadow-inner"
                        style={{ backgroundColor: value }}
                    />
                    {/* Hex input */}
                    <Input
                        value={value}
                        onChange={(e) => handleHexInput(e.target.value)}
                        placeholder="#C2185B"
                        className="h-7 text-xs font-mono flex-1 px-2"
                        maxLength={7}
                    />
                    {/* Native picker trigger */}
                    <button
                        type="button"
                        onClick={() => nativeRef.current?.click()}
                        className="h-7 px-2 rounded-md border border-border bg-background hover:bg-muted text-xs font-body flex items-center gap-1 shrink-0 transition-colors"
                        title="Open system color picker"
                    >
                        <Pipette className="h-3 w-3" />
                        <span className="hidden sm:inline">Custom</span>
                    </button>
                    <input
                        ref={nativeRef}
                        type="color"
                        value={value}
                        onChange={(e) => handleNativeChange(e.target.value)}
                        className="sr-only"
                        tabIndex={-1}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
