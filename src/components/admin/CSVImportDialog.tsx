import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileText, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadToCloudinary, uploadToCloudinaryByUrl } from "@/utils/cloudinaryUpload";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ParsedRow {
  name: string;
  description?: string;
  material?: string;
  fit_type?: string;
  occasion?: string;
  care_instructions?: string;
  category?: string;
  base_price: string;
  sale_price?: string;
  discount_percent?: string;
  is_active?: string;
  is_featured?: string;
  is_new_arrival?: string;
  is_best_seller?: string;
  color_name?: string;
  color_hex?: string;
  size?: string;
  stock_qty?: string;
  thumbnail_url?: string;
  gallery_urls?: string;
  _errors?: string[];
  _rowIndex?: number;
}

type Step = "upload" | "preview" | "importing" | "done";

const TEMPLATE_HEADERS = [
  "name", "description", "material", "fit_type", "occasion", "care_instructions",
  "color_name", "color_hex", "size", "stock_qty", "thumbnail_url", "gallery_urls"
];

const TEMPLATE_ROWS = [
  [
    "Silk Maxi Dress", "A beautiful silk maxi dress", "Silk", "Regular", "Party,Wedding", "Dry clean only",
    "Dresses", "3999", "2999", "25",
    "true", "true", "true", "false",
    "Red", "#FF0000", "S", "10", "https://example.com/thumb1.jpg", "https://example.com/gal1.jpg,https://example.com/gal2.jpg"
  ],
  [
    "Silk Maxi Dress", "A beautiful silk maxi dress", "Silk", "Regular", "Party,Wedding", "Dry clean only",
    "Dresses", "3999", "2999", "25",
    "true", "true", "true", "false",
    "Red", "#FF0000", "M", "5", "", ""
  ],
  [
    "Silk Maxi Dress", "A beautiful silk maxi dress", "Silk", "Regular", "Party,Wedding", "Dry clean only",
    "Dresses", "3999", "2999", "25",
    "true", "true", "true", "false",
    "Blue", "#0000FF", "S", "15", "", ""
  ]
];

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
  return { headers, rows };
}

function validateRow(row: Record<string, string>, index: number): ParsedRow & { _errors: string[]; _rowIndex: number } {
  const errors: string[] = [];
  if (!row.name?.trim()) errors.push("Missing name");
  if (!row.base_price?.trim() || isNaN(Number(row.base_price))) errors.push("Invalid base_price");
  return { ...row, _errors: errors, _rowIndex: index + 1 } as any;
}

// ─── Concurrency Limiter ─────────────────────────────────────────────
function createConcurrencyLimiter(maxConcurrent: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => { if (queue.length > 0 && active < maxConcurrent) { active++; queue.shift()!(); } };
  return <T,>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => fn().then(resolve, reject).finally(() => { active--; next(); });
      queue.push(run);
      next();
    });
}

// ─── Parallel map with concurrency limit ─────────────────────────────
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const limiter = createConcurrencyLimiter(concurrency);
  return Promise.all(items.map((item, i) => limiter(() => fn(item, i))));
}

// ─── GLOBAL image concurrency limiter (shared across all products) ────
// At 200-300 products this prevents browser/API throttling while maximizing throughput
const GLOBAL_IMAGE_CONCURRENCY = 15;
const globalImageLimiter = createConcurrencyLimiter(GLOBAL_IMAGE_CONCURRENCY);

const CSVImportDialog = ({ open, onOpenChange, onImportComplete }: CSVImportDialogProps) => {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<(ParsedRow & { _errors: string[]; _rowIndex: number })[]>([]);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [imported, setImported] = useState(0);
  const [failed, setFailed] = useState<{ row: number; name: string; error: string }[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [imagesProcessed, setImagesProcessed] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const cancellationRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setProgress(0);
    setTotal(0);
    setImported(0);
    setFailed([]);
    setSkipped([]);
    setElapsedMs(0);
    setImagesProcessed(0);
    setTotalImages(0);
    cancellationRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const downloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS.join(","), ...TEMPLATE_ROWS.map(r => r.map(v => v.includes(",") ? `"${v}"` : v).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "product_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows: rawRows } = parseCSV(text);
      const validated = rawRows.map((r, i) => validateRow(r, i));
      setRows(validated);
      setStep("preview");
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Category cache: resolve once, reuse everywhere ──────────────────
  const categoryCache = useRef<Map<string, string | null>>(new Map());

  const resolveCategory = async (name: string): Promise<string | null> => {
    const key = name.trim().toLowerCase();
    if (!key) return null;
    if (categoryCache.current.has(key)) return categoryCache.current.get(key)!;
    const { data } = await supabase.from("categories").select("id").eq("name", name.trim()).maybeSingle();
    if (!data) throw new Error(`Category '${name.trim()}' does not exist. Please create it first.`);
    categoryCache.current.set(key, data.id);
    return data.id;
  };

  const parseBool = (v?: string) => v?.toLowerCase() === "true";

  // ── Process a single image (using global limiter) ────────────────
  const processImage = async (
    url: string,
    productId: string,
    isPrimary: boolean,
    sortOrder: number,
    storageSuffix: string,
    onDone: () => void
  ) => {
    // Run through global limiter to cap total concurrent uploads
    return globalImageLimiter(async () => {
      let finalUrl = url;

      try {
        // ⚡ Use remote URL upload — Cloudinary fetches the image directly
        // Eliminates browser download step (1 network hop instead of 2)
        const uploadResult = await uploadToCloudinaryByUrl(url);
        finalUrl = uploadResult.secure_url;
      } catch {
        // Fallback: download blob then upload (handles CORS-restricted URLs)
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
          const blob = await response.blob();
          const uploadResult = await uploadToCloudinary(blob);
          finalUrl = uploadResult.secure_url;
        } catch (imgErr) {
          console.warn(`Image processing failed for ${url}:`, imgErr);
        }
      }

      onDone();
      return {
        product_id: productId,
        public_url: finalUrl,
        storage_path: `csv-import/${productId}/${storageSuffix}`,
        is_primary: isPrimary,
        sort_order: sortOrder,
      };
    });
  };

  // ── Process a single product group ─────────────────────────────────
  const processProductGroup = async (
    pName: string,
    group: (ParsedRow & { _errors: string[]; _rowIndex: number })[],
    onImageDone: () => void
  ) => {
    const baseRow = group[0];
    const categoryId = await resolveCategory(baseRow.category || "");
    const slug = baseRow.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const occasionArr = baseRow.occasion ? baseRow.occasion.split(",").map(o => o.trim()).filter(Boolean) : null;

    // Insert product
    const { data: product, error: pErr } = await supabase.from("products").insert({
      name: baseRow.name.trim(),
      slug,
      description: baseRow.description || null,
      material: baseRow.material || null,
      fit_type: baseRow.fit_type || null,
      occasion: occasionArr,
      care_instructions: baseRow.care_instructions || null,
      category_id: categoryId,
      base_price: Number(baseRow.base_price),
      sale_price: baseRow.sale_price ? Number(baseRow.sale_price) : null,
      is_active: baseRow.is_active ? parseBool(baseRow.is_active) : true,
      is_featured: parseBool(baseRow.is_featured),
      is_new_arrival: parseBool(baseRow.is_new_arrival),
      is_best_seller: parseBool(baseRow.is_best_seller),
    }).select("id").single();

    if (pErr) throw pErr;

    // Insert variants (already batched)
    const variantsToInsert = group.map((row, index) => ({
      product_id: product.id,
      color_name: row.color_name?.trim() || "Default",
      color_hex: row.color_hex?.trim() || "#000000",
      size: row.size?.trim() || "Free",
      sku: `${slug}-${(row.color_name || "DEF").trim()}-${(row.size || "FREE").trim()}-${index}`.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
      stock_qty: row.stock_qty ? parseInt(row.stock_qty) : 10,
      is_active: true,
    }));

    if (variantsToInsert.length > 0) {
      const { error: vErr } = await supabase.from("product_variants").insert(variantsToInsert);
      if (vErr) throw vErr;
    }

    // Collect all image URLs
    const imageJobs: { url: string; isPrimary: boolean; sortOrder: number; suffix: string }[] = [];

    if (baseRow.thumbnail_url?.trim()) {
      imageJobs.push({ url: baseRow.thumbnail_url.trim(), isPrimary: true, sortOrder: 0, suffix: "thumb" });
    }

    if (baseRow.gallery_urls?.trim()) {
      const urls = baseRow.gallery_urls.split(",").map(u => u.trim()).filter(Boolean);
      urls.forEach((u, i) => {
        imageJobs.push({ url: u, isPrimary: false, sortOrder: i + 1, suffix: `gallery-${i}` });
      });
    }

    // ⚡ Process ALL images — each goes through the global limiter
    if (imageJobs.length > 0) {
      const imageResults = await Promise.all(
        imageJobs.map(job =>
          processImage(job.url, product.id, job.isPrimary, job.sortOrder, job.suffix, onImageDone)
        )
      );

      // Batch insert all images for this product
      const { error: imgErr } = await supabase.from("product_images").insert(imageResults);
      if (imgErr) console.error(`Image insert error for ${pName}:`, imgErr);
    }
  };

  // ── Main import orchestrator ───────────────────────────────────────
  const startImport = async () => {
    const validRows = rows.filter(r => r._errors.length === 0);
    setImported(0);
    setFailed([]);
    setSkipped([]);
    setImagesProcessed(0);
    cancellationRef.current = false;
    categoryCache.current.clear();

    // Group rows by product name
    const productGroups = validRows.reduce((acc, row) => {
      const gName = row.name.trim();
      if (!acc[gName]) acc[gName] = [];
      acc[gName].push(row);
      return acc;
    }, {} as Record<string, typeof validRows>);

    const groupEntries = Object.entries(productGroups);
    
    // Check for existing products
    const uniqueNames = Object.keys(productGroups);
    const existingNames = new Set<string>();

    const CHUNK_SIZE = 50;
    for (let i = 0; i < uniqueNames.length; i += CHUNK_SIZE) {
      const chunk = uniqueNames.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabase
        .from("products")
        .select("name")
        .in("name", chunk);
        
      if (!error && data) {
        data.forEach(p => existingNames.add(p.name));
      }
    }

    const filteredGroupEntries: [string, typeof validRows][] = [];
    const skippedNames: string[] = [];

    for (const [pName, group] of groupEntries) {
      if (existingNames.has(pName)) {
        skippedNames.push(pName);
      } else {
        filteredGroupEntries.push([pName, group]);
      }
    }

    setSkipped(skippedNames);
    setTotal(filteredGroupEntries.length);

    // Count total images for progress display
    let totalImgCount = 0;
    for (const [, group] of filteredGroupEntries) {
      const base = group[0];
      if (base.thumbnail_url?.trim()) totalImgCount++;
      if (base.gallery_urls?.trim()) totalImgCount += base.gallery_urls.split(",").filter(u => u.trim()).length;
    }
    setTotalImages(totalImgCount);

    // Start timer
    startTimeRef.current = performance.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(performance.now() - startTimeRef.current);
    }, 200);

    if (filteredGroupEntries.length === 0) {
      setStep("done");
      if (timerRef.current) clearInterval(timerRef.current);
      if (skippedNames.length > 0) {
        toast.info(`${skippedNames.length} products skipped (already exist).`);
      }
      return;
    }

    setStep("importing");
    console.log(`⚡ Starting import: ${filteredGroupEntries.length} new products (skipped ${skippedNames.length}), ${totalImgCount} images`);

    // ── Phase 1: Pre-resolve all unique categories ──────────────────
    const filteredRows = filteredGroupEntries.flatMap(([, group]) => group);
    const uniqueCategories = [...new Set(filteredRows.map(r => r.category?.trim()).filter(Boolean))] as string[];
    console.time("📂 Category pre-resolution");
    try {
      await Promise.all(uniqueCategories.map(cat => resolveCategory(cat)));
    } catch (err: any) {
      toast.error(err.message);
      setStep("upload");
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    console.timeEnd("📂 Category pre-resolution");

    // ── Phase 2: Process products in parallel batches (3 concurrent) ─
    const errors: { row: number; name: string; error: string }[] = [];
    let doneCount = 0;
    let imgDoneCount = 0;

    console.time("🚀 Total import time");

    await parallelMap(
      filteredGroupEntries,
      async ([pName, group]) => {
        if (cancellationRef.current) return;
        try {
          await processProductGroup(pName, group, () => {
            imgDoneCount++;
            setImagesProcessed(imgDoneCount);
          });
        } catch (err: any) {
          errors.push({ row: group[0]._rowIndex || 0, name: pName, error: err.message || "Unknown error" });
        }
        doneCount++;
        setImported(doneCount);
        setProgress(Math.round((doneCount / filteredGroupEntries.length) * 100));
      },
      5 // ⚡ 5 products processed concurrently (images throttled by global limiter)
    );

    console.timeEnd("🚀 Total import time");

    // Cleanup timer
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setElapsedMs(performance.now() - startTimeRef.current);

    setFailed(errors);
    setStep("done");

    const successCount = doneCount - errors.length;
    const totalSec = ((performance.now() - startTimeRef.current) / 1000).toFixed(1);
    const skipMsg = skippedNames.length > 0 ? ` (${skippedNames.length} skipped)` : "";

    if (errors.length === 0) {
      toast.success(`${successCount} products imported in ${totalSec}s!${skipMsg}`);
    } else {
      toast.warning(`${successCount} imported, ${errors.length} failed (${totalSec}s)${skipMsg}`);
    }
    console.log(`✅ Import complete: ${successCount} products, ${imgDoneCount} images in ${totalSec}s${skipMsg}`);
    onImportComplete();
  };

  const handleCancel = () => {
    cancellationRef.current = true;
    toast.info("Importing stopped. Please wait for the current item to finish...");
  };

  const validCount = rows.filter(r => r._errors.length === 0).length;
  const errorCount = rows.filter(r => r._errors.length > 0).length;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-body">Import Products from CSV</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {step === "upload" && (
            <>
              <p className="text-sm text-muted-foreground font-body">
                Upload a CSV file with product data. Download the template to see the expected format.
              </p>
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" /> Download CSV Template
              </Button>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground font-body mb-3">Select a .csv file to import</p>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
                <Button onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Choose File
                </Button>
              </div>
            </>
          )}

          {step === "preview" && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="font-body">{rows.length} rows found</Badge>
                <Badge variant="secondary" className="font-body text-green-600">{validCount} valid</Badge>
                {errorCount > 0 && <Badge variant="destructive" className="font-body">{errorCount} with errors</Badge>}
              </div>

              {errorCount > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Rows with errors will be skipped:
                  </p>
                  {rows.filter(r => r._errors.length > 0).slice(0, 5).map(r => (
                    <p key={r._rowIndex} className="text-xs text-muted-foreground font-body">
                      Row {r._rowIndex}: {r._errors.join(", ")}
                    </p>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto border rounded-md max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-body text-xs">Row</TableHead>
                      <TableHead className="font-body text-xs">Name</TableHead>
                      <TableHead className="font-body text-xs">Price</TableHead>
                      <TableHead className="font-body text-xs">Category</TableHead>
                      <TableHead className="font-body text-xs">Color</TableHead>
                      <TableHead className="font-body text-xs">Size</TableHead>
                      <TableHead className="font-body text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 20).map(r => (
                      <TableRow key={r._rowIndex} className={r._errors.length > 0 ? "bg-destructive/5" : ""}>
                        <TableCell className="font-body text-xs">{r._rowIndex}</TableCell>
                        <TableCell className="font-body text-xs font-medium">{r.name || "—"}</TableCell>
                        <TableCell className="font-body text-xs">₹{r.base_price || "—"}</TableCell>
                        <TableCell className="font-body text-xs">{r.category || "—"}</TableCell>
                        <TableCell className="font-body text-xs">{r.color_name || "—"}</TableCell>
                        <TableCell className="font-body text-xs">{r.size || "—"}</TableCell>
                        <TableCell>
                          {r._errors.length === 0
                            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                            : <AlertTriangle className="h-4 w-4 text-destructive" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 20 && <p className="text-xs text-muted-foreground font-body">Showing first 20 of {rows.length} rows</p>}

              <div className="flex gap-2">
                <Button variant="outline" onClick={reset} className="flex-1">
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button onClick={startImport} disabled={validCount === 0} className="flex-1">
                  <Upload className="h-4 w-4 mr-1" /> Import {validCount} Products
                </Button>
              </div>
            </>
          )}

          {step === "importing" && (
            <div className="space-y-4 py-8">
              <p className="text-sm font-body text-center font-medium">⚡ Importing products in parallel...</p>
              <Progress value={progress} className="h-3" />
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground font-body">
                  Products: {imported} / {total} • Images: {imagesProcessed} / {totalImages}
                </p>
                <p className="text-xs text-muted-foreground font-body">
                  Elapsed: {(elapsedMs / 1000).toFixed(1)}s
                  {imported > 0 && total > imported && (
                    <> • ETA: {(((elapsedMs / imported) * (total - imported)) / 1000).toFixed(0)}s remaining</>
                  )}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCancel} className="w-full mt-2">
                <X className="h-4 w-4 mr-1" /> Stop Import
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-2" />
                <p className="font-body font-medium">⚡ Import Complete</p>
                <p className="text-sm text-muted-foreground font-body">
                  {imported - failed.length} products imported successfully
                  {failed.length > 0 && `, ${failed.length} failed`}
                  {skipped.length > 0 && `, ${skipped.length} skipped`}
                </p>
                <p className="text-xs text-muted-foreground font-body">
                  {imagesProcessed} images processed in {(elapsedMs / 1000).toFixed(1)}s
                </p>
              </div>

              {failed.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-4 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-destructive">Failed rows:</p>
                  {failed.map((f, i) => (
                    <p key={i} className="text-xs text-muted-foreground font-body">
                      Row {f.row} ({f.name}): {f.error}
                    </p>
                  ))}
                </div>
              )}

              {skipped.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-md p-3 mt-4 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-orange-600">Skipped (already exist):</p>
                  {skipped.map((sName, i) => (
                    <p key={i} className="text-xs text-muted-foreground font-body">
                      {sName}
                    </p>
                  ))}
                </div>
              )}

              <Button onClick={() => handleClose(false)} className="w-full mt-4">Done</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CSVImportDialog;
