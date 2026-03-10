import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileText, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/utils/cloudinaryUpload";

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

const CSVImportDialog = ({ open, onOpenChange, onImportComplete }: CSVImportDialogProps) => {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<(ParsedRow & { _errors: string[]; _rowIndex: number })[]>([]);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [imported, setImported] = useState(0);
  const [failed, setFailed] = useState<{ row: number; name: string; error: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setProgress(0);
    setTotal(0);
    setImported(0);
    setFailed([]);
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

  const findOrCreateCategory = async (name: string): Promise<string | null> => {
    if (!name.trim()) return null;
    const { data: existing } = await supabase.from("categories").select("id").eq("name", name.trim()).maybeSingle();
    if (existing) return existing.id;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data: created, error } = await supabase.from("categories").insert({ name: name.trim(), slug: slug + "-" + Date.now() }).select("id").single();
    if (error) throw error;
    return created.id;
  };

  const parseBool = (v?: string) => v?.toLowerCase() === "true";

  const startImport = async () => {
    const validRows = rows.filter(r => r._errors.length === 0);
    setTotal(validRows.length);
    setImported(0);
    setFailed([]);
    setStep("importing");

    const errors: { row: number; name: string; error: string }[] = [];
    let done = 0;

    // Group rows by product name
    const productGroups = validRows.reduce((acc, row) => {
      const gName = row.name.trim();
      if (!acc[gName]) acc[gName] = [];
      acc[gName].push(row);
      return acc;
    }, {} as Record<string, typeof validRows>);

    const groupNames = Object.keys(productGroups);
    setTotal(groupNames.length);

    for (const pName of groupNames) {
      const group = productGroups[pName];
      const baseRow = group[0]; // Use the first row for base product details

      try {
        const categoryId = await findOrCreateCategory(baseRow.category || "");
        const slug = baseRow.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();
        const occasionArr = baseRow.occasion ? baseRow.occasion.split(",").map(o => o.trim()).filter(Boolean) : null;

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

        // Process Variants (Create one for each row in the group)
        const variantsToInsert = group.map((row, index) => {
          const colorName = row.color_name?.trim() || "Default";
          const colorHex = row.color_hex?.trim() || "#000000";
          const size = row.size?.trim() || "Free";
          const stockQty = row.stock_qty ? parseInt(row.stock_qty) : 10;

          return {
            product_id: product.id,
            color_name: colorName,
            color_hex: colorHex,
            size,
            sku: `${slug}-${colorName}-${size}-${index}`.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
            stock_qty: stockQty,
          };
        });

        if (variantsToInsert.length > 0) {
          const { error: vErr } = await supabase.from("product_variants").insert(variantsToInsert);
          if (vErr) throw vErr;
        }

        // Process Images using the baseRow (first row of group)
        const imagesToInsert = [];
        let sortOrder = 0;

        // Process Thumbnail
        if (baseRow.thumbnail_url?.trim()) {
          const originalUrl = baseRow.thumbnail_url.trim();
          let finalUrl = originalUrl;

          try {
            const response = await fetch(originalUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
            const blob = await response.blob();
            const uploadResult = await uploadToCloudinary(blob);
            finalUrl = uploadResult.secure_url;
          } catch (imgErr) {
            console.warn(`Failed to process thumbnail ${originalUrl} for group ${pName}:`, imgErr);
          }

          imagesToInsert.push({
            product_id: product.id,
            public_url: finalUrl,
            storage_path: `csv-import/${product.id}/thumb`,
            is_primary: true,
            sort_order: sortOrder++,
          });
        }

        // Process Gallery Images
        if (baseRow.gallery_urls?.trim()) {
          const urls = baseRow.gallery_urls.split(",").map(u => u.trim()).filter(Boolean);

          for (let i = 0; i < urls.length; i++) {
            const originalUrl = urls[i];
            let finalUrl = originalUrl;

            try {
              const response = await fetch(originalUrl);
              if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
              const blob = await response.blob();
              const uploadResult = await uploadToCloudinary(blob);
              finalUrl = uploadResult.secure_url;
            } catch (imgErr) {
              console.warn(`Failed to process gallery image ${originalUrl} for group ${pName}:`, imgErr);
            }

            imagesToInsert.push({
              product_id: product.id,
              public_url: finalUrl,
              storage_path: `csv-import/${product.id}/gallery-${i}`,
              is_primary: false,
              sort_order: sortOrder++,
            });
          }
        }

        if (imagesToInsert.length > 0) {
          const { error: imgErr } = await supabase.from("product_images").insert(imagesToInsert);
          if (imgErr) console.error(`Image insert error for ${pName}:`, imgErr);
        }

        done++;
        setImported(done);
        setProgress(Math.round((done / groupNames.length) * 100));
      } catch (err: any) {
        errors.push({ row: baseRow._rowIndex || 0, name: pName, error: err.message || "Unknown error" });
        done++;
        setProgress(Math.round((done / groupNames.length) * 100));
      }
    }

    setFailed(errors);
    setStep("done");
    if (errors.length === 0) {
      toast.success(`All ${done} products imported successfully!`);
    } else {
      toast.warning(`${done - errors.length} imported, ${errors.length} failed`);
    }
    onImportComplete();
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
              <p className="text-sm font-body text-center">Importing products...</p>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground font-body text-center">{imported} / {total} completed</p>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-2" />
                <p className="font-body font-medium">Import Complete</p>
                <p className="text-sm text-muted-foreground font-body">
                  {imported - failed.length} products imported successfully
                  {failed.length > 0 && `, ${failed.length} failed`}
                </p>
              </div>

              {failed.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-destructive">Failed rows:</p>
                  {failed.map((f, i) => (
                    <p key={i} className="text-xs text-muted-foreground font-body">
                      Row {f.row} ({f.name}): {f.error}
                    </p>
                  ))}
                </div>
              )}

              <Button onClick={() => handleClose(false)} className="w-full">Done</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CSVImportDialog;
