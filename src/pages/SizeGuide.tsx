import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sizes = [
  { size: "XS", bust: "32", waist: "25", hips: "35", bustCm: "81", waistCm: "64", hipsCm: "89" },
  { size: "S", bust: "34", waist: "27", hips: "37", bustCm: "86", waistCm: "69", hipsCm: "94" },
  { size: "M", bust: "36", waist: "29", hips: "39", bustCm: "91", waistCm: "74", hipsCm: "99" },
  { size: "L", bust: "38", waist: "31", hips: "41", bustCm: "97", waistCm: "79", hipsCm: "104" },
  { size: "XL", bust: "40", waist: "33", hips: "43", bustCm: "102", waistCm: "84", hipsCm: "109" },
  { size: "XXL", bust: "42", waist: "35", hips: "45", bustCm: "107", waistCm: "89", hipsCm: "114" },
];

const SizeGuide = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container py-8 md:py-12 max-w-3xl">
    <h1 className="font-heading text-2xl md:text-3xl font-bold mb-4">Size Guide</h1>
    <p className="text-muted-foreground font-body mb-8">Use the chart below to find your perfect fit. Measure yourself wearing light clothing for accuracy.</p>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-body">Size</TableHead>
          <TableHead className="font-body">Bust (in)</TableHead>
          <TableHead className="font-body">Waist (in)</TableHead>
          <TableHead className="font-body">Hips (in)</TableHead>
          <TableHead className="font-body hidden md:table-cell">Bust (cm)</TableHead>
          <TableHead className="font-body hidden md:table-cell">Waist (cm)</TableHead>
          <TableHead className="font-body hidden md:table-cell">Hips (cm)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sizes.map(s => (
          <TableRow key={s.size}>
            <TableCell className="font-body font-medium">{s.size}</TableCell>
            <TableCell className="font-body">{s.bust}</TableCell>
            <TableCell className="font-body">{s.waist}</TableCell>
            <TableCell className="font-body">{s.hips}</TableCell>
            <TableCell className="font-body hidden md:table-cell">{s.bustCm}</TableCell>
            <TableCell className="font-body hidden md:table-cell">{s.waistCm}</TableCell>
            <TableCell className="font-body hidden md:table-cell">{s.hipsCm}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <div className="mt-6 space-y-2 text-sm text-muted-foreground font-body">
      <p>💡 If you're between sizes, we recommend sizing up for comfort.</p>
      <p>📏 Stretch fabrics may fit differently — refer to product descriptions for fabric details.</p>
    </div>
  </motion.div>
);

export default SizeGuide;
