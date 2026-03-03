import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sizes = [
  { size: "XS", bust: "32", waist: "24", hip: "34" },
  { size: "S", bust: "34", waist: "26", hip: "36" },
  { size: "M", bust: "36", waist: "28", hip: "38" },
  { size: "L", bust: "38", waist: "30", hip: "40" },
  { size: "XL", bust: "40", waist: "32", hip: "42" },
  { size: "XXL", bust: "42", waist: "34", hip: "44" },
];

interface SizeGuideModalProps {
  trigger: React.ReactNode;
}

export function SizeGuideModal({ trigger }: SizeGuideModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Size Guide</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground font-body mb-4">
          All measurements are in inches. Measure yourself and compare with the chart below.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-body">Size</TableHead>
              <TableHead className="font-body">Bust</TableHead>
              <TableHead className="font-body">Waist</TableHead>
              <TableHead className="font-body">Hip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sizes.map((s) => (
              <TableRow key={s.size}>
                <TableCell className="font-semibold font-body">{s.size}</TableCell>
                <TableCell className="font-body">{s.bust}"</TableCell>
                <TableCell className="font-body">{s.waist}"</TableCell>
                <TableCell className="font-body">{s.hip}"</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
