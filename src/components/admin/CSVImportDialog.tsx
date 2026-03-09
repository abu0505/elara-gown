import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileText, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  colors?: string;
  sizes?: string;
  stock_qty?: string;
  image_urls?: string;
  _errors?: string[];
  _rowIndex?: number;
}

type Step = "upload" | "preview" | "importing" | "done";

const TEMPLATE_HEADERS = [
  "name", "description", "material", "fit_type", "occasion", "care_instructions",
  "category", "base_price", "sale_price", "discount_percent",
  "is_active", "is_featured", "is_new_arrival", "is_best_seller",
  "colors", "sizes", "stock_qty", "image_urls"
];

const TEMPLATE_ROWS = [
  [
    "Silk Maxi Dress", "A beautiful silk maxi dress", "Silk", "Regular", "Party,Wedding", "Dry clean only",
    "Dresses", "3999", "2999", "25",
    "true", "true", "true", "false",
    "Red:#FF0000,Blue:#0000FF", "S,M,L,XL", "15", ""
  ],
  [
    "Cotton Kurta Set", "Comfortable cotton kurta", "Cotton", "Relaxed", "Casual,Festive", "Machine wash",
    "Kurtas", "1999", "1499", "25",
    "true", "false", "true", "false",
    "White:#FFFFFF,Black:#000000", "M,L,XL", "20", ""
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

    for (const row of validRows) {
      try {
        const categoryId = await findOrCreateCategory(row.category || "");
        const slug = row.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();
        const occasionArr = row.occasion ? row.occasion.split(",").map(o => o.trim()).filter(Boolean) : null;

        const { data: product, error: pErr } = await supabase.from("products").insert({
          name: row.name.trim(),
          slug,
          description: row.description || null,
          material: row.material || null,
          fit_type: row.fit_type || null,
          occasion: occasionArr,
          care_instructions: row.care_instructions || null,
          category_id: categoryId,
          base_price: Number(row.base_price),
          sale_price: row.sale_price ? Number(row.sale_price) : null,
          discount_percent: row.discount_percent ? parseInt(row.discount_percent) : null,
          is_active: row.is_active ? parseBool(row.is_active) : true,
          is_featured: parseBool(row.is_featured),
          is_new_arrival: parseBool(row.is_new_arrival),
          is_best_seller: parseBool(row.is_best_seller),
        }).select("id").single();

        if (pErr) throw pErr;

        // Parse colors & sizes, create variants
        const colors = row.colors
          ? row.colors.split(",").map(c => {
              const [name, hex] = c.trim().split(":");
              return { name: name?.trim() || "Default", hex: hex?.trim() || "#000000" };
            })
          : [{ name: "Default", hex: "#000000" }];

        const sizes = row.sizes ? row.sizes.split(",").map(s => s.trim()).filter(Boolean) : ["Free"];
        const stockQty = row.stock_qty ? parseInt(row.stock_qty) : 10;

        const variants = colors.flatMap(color =>
          sizes.map(size => ({
            product_id: product.id,
            color_name: color.name,
            color_hex: color.hex,
            size,
            sku: `${slug}-${color.name}-${size}`.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
            stock_qty: stockQty,
          }))
        );

        if (variants.length > 0) {
          const { error: vErr } = await supabase.from("product_variants").insert(variants);
          if (vErr) throw vErr;
        }

        // Insert images if provided
        if (row.image_urls?.trim()) {
          const urls = row.image_urls.split(",").map(u => u.trim()).filter(Boolean);
          const images = urls.map((url, i) => ({
            product_id: product.id,
            public_url: url,
            storage_path: `csv-import/${product.id}/${i}`,
            is_primary: i === 0,
            sort_order: i,
          }));
          await supabase.from("product_images").insert(images);
        }

        done++;
        setImported(done);
        setProgress(Math.round((done / validRows.length) * 100));
      } catch (err: any) {
        errors.push({ row: row._rowIndex, name: row.name, error: err.message || "Unknown error" });
        done++;
        setProgress(Math.round((done / validRows.length) * 100));
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
                      <TableHead className="font-body text-xs">Colors</TableHead>
                      <TableHead className="font-body text-xs">Sizes</TableHead>
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
                        <TableCell className="font-body text-xs">{r.colors || "—"}</TableCell>
                        <TableCell className="font-body text-xs">{r.sizes || "—"}</TableCell>
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
