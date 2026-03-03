import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  mobile: z.string().regex(/^\d{10}$/, "Enter valid 10-digit number"),
  email: z.string().email("Enter valid email"),
  address1: z.string().min(3, "Address is required"),
  address2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "Select a state"),
  pincode: z.string().regex(/^\d{6}$/, "Enter valid 6-digit PIN"),
  delivery: z.enum(["standard", "express"]),
  saveAddress: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

const steps = [
  { label: "Cart", completed: true },
  { label: "Address", active: true },
  { label: "Payment", locked: true },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getSubtotal, getDeliveryCharge, getDiscount, getTotal, clearCart } = useCartStore();
  const [summaryOpen, setSummaryOpen] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delivery: "standard", saveAddress: false },
  });

  const delivery = watch("delivery");

  const onSubmit = () => {
    // TODO: Phase 2 - Razorpay Integration
    // Replace with: create Razorpay order → open checkout → verify payment
    clearCart();
    navigate("/checkout/success");
  };

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <p className="font-heading text-xl mb-4">No items in cart</p>
        <Button asChild><Link to="/products">Shop Now</Link></Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div className="container py-4 md:py-8 max-w-4xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium font-body",
                s.completed ? "bg-success text-success-foreground" :
                s.active ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                {s.completed ? <Check className="h-4 w-4" /> : s.locked ? <Lock className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn("text-sm font-body", s.active ? "font-semibold" : "text-muted-foreground")}>{s.label}</span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-2" />}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="md:col-span-3 space-y-6">
            {/* Contact */}
            <section>
              <h2 className="font-heading text-lg font-bold mb-4">Contact Information</h2>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" className="font-body text-sm">Full Name *</Label>
                  <Input id="name" {...register("name")} className="mt-1" />
                  {errors.name && <p className="text-xs text-destructive mt-1 font-body">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="mobile" className="font-body text-sm">Mobile Number *</Label>
                  <Input id="mobile" {...register("mobile")} className="mt-1" />
                  {errors.mobile && <p className="text-xs text-destructive mt-1 font-body">{errors.mobile.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email" className="font-body text-sm">Email Address *</Label>
                  <Input id="email" type="email" {...register("email")} className="mt-1" />
                  {errors.email && <p className="text-xs text-destructive mt-1 font-body">{errors.email.message}</p>}
                </div>
              </div>
            </section>

            <Separator />

            {/* Address */}
            <section>
              <h2 className="font-heading text-lg font-bold mb-4">Delivery Address</h2>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="address1" className="font-body text-sm">Address Line 1 *</Label>
                  <Input id="address1" placeholder="House/Flat/Block No." {...register("address1")} className="mt-1" />
                  {errors.address1 && <p className="text-xs text-destructive mt-1 font-body">{errors.address1.message}</p>}
                </div>
                <div>
                  <Label htmlFor="address2" className="font-body text-sm">Address Line 2</Label>
                  <Input id="address2" placeholder="Street / Area" {...register("address2")} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="landmark" className="font-body text-sm">Landmark</Label>
                  <Input id="landmark" {...register("landmark")} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city" className="font-body text-sm">City *</Label>
                    <Input id="city" {...register("city")} className="mt-1" />
                    {errors.city && <p className="text-xs text-destructive mt-1 font-body">{errors.city.message}</p>}
                  </div>
                  <div>
                    <Label className="font-body text-sm">State *</Label>
                    <Select onValueChange={(v) => setValue("state", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.state && <p className="text-xs text-destructive mt-1 font-body">{errors.state.message}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="pincode" className="font-body text-sm">PIN Code *</Label>
                  <Input id="pincode" {...register("pincode")} className="mt-1" />
                  {errors.pincode && <p className="text-xs text-destructive mt-1 font-body">{errors.pincode.message}</p>}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox onCheckedChange={(v) => setValue("saveAddress", !!v)} />
                  <span className="text-sm font-body">Save this address for future orders</span>
                </label>
              </div>
            </section>

            <Separator />

            {/* Delivery option */}
            <section>
              <h2 className="font-heading text-lg font-bold mb-4">Delivery Option</h2>
              <RadioGroup value={delivery} onValueChange={(v) => setValue("delivery", v as "standard" | "express")} className="space-y-3">
                <label className={cn("flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors", delivery === "standard" ? "border-primary bg-primary/5" : "border-border")}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="standard" />
                    <div>
                      <p className="text-sm font-medium font-body">Standard Delivery</p>
                      <p className="text-xs text-muted-foreground font-body">3–5 business days</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold font-body text-success">{getSubtotal() >= 599 ? "FREE" : "₹49"}</span>
                </label>
                <label className={cn("flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors", delivery === "express" ? "border-primary bg-primary/5" : "border-border")}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="express" />
                    <div>
                      <p className="text-sm font-medium font-body">Express Delivery</p>
                      <p className="text-xs text-muted-foreground font-body">1–2 business days</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold font-body">₹99</span>
                </label>
              </RadioGroup>
            </section>

            <Button type="submit" className="w-full h-12 text-base">
              <Lock className="h-4 w-4 mr-2" /> Place Order
            </Button>
          </form>

          {/* Order summary */}
          <div className="md:col-span-2">
            {/* Mobile collapsible */}
            <div className="md:hidden mb-6">
              <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border">
                  <span className="text-sm font-medium font-body">Show Order Summary</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold font-body">₹{getTotal().toLocaleString()}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", summaryOpen && "rotate-180")} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <OrderSummaryContent />
                </CollapsibleContent>
              </Collapsible>
            </div>
            {/* Desktop always visible */}
            <div className="hidden md:block sticky top-20">
              <OrderSummaryContent />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function OrderSummaryContent() {
  const { items, getSubtotal, getDeliveryCharge, getDiscount, getTotal, couponCode } = useCartStore();
  return (
    <div className="p-4 rounded-lg border border-border space-y-4">
      <h3 className="font-heading text-base font-semibold">Order Summary</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <img src={item.image} alt={item.name} className="w-12 h-15 object-cover rounded" width={48} height={60} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium font-body line-clamp-1">{item.name}</p>
              <p className="text-[10px] text-muted-foreground font-body">{item.colorName} · {item.size} · Qty: {item.quantity}</p>
              <p className="text-xs font-semibold font-body">₹{(item.price * item.quantity).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
      <Separator />
      <div className="space-y-2 text-sm font-body">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{getSubtotal().toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{getDeliveryCharge() === 0 ? "FREE" : `₹${getDeliveryCharge()}`}</span></div>
        {getDiscount() > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount ({couponCode})</span><span className="text-success">-₹{getDiscount().toLocaleString()}</span></div>}
      </div>
      <Separator />
      <div className="flex justify-between font-semibold font-body text-base">
        <span>Total</span>
        <span>₹{getTotal().toLocaleString()}</span>
      </div>
    </div>
  );
}

export default Checkout;
