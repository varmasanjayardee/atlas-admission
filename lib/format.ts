// "+919810041122" -> "+91 98100 41122"; emails pass through
export function formatIdentifier(v: string) {
  const m = v.match(/^(\+?\d*?)(\d{5})(\d{5})$/);
  return m ? [m[1], m[2], m[3]].filter(Boolean).join(" ") : v;
}

// "+919810093311" -> "+91 98••••••11"
export function maskPhone(v: string) {
  const m = v.match(/^(\+?\d*?)(\d{2})\d{6}(\d{2})$/);
  return m ? `${m[1] ? m[1] + " " : ""}${m[2]}••••••${m[3]}` : v;
}

// "Aarav Sharma" -> "AS"
export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// "1000.00" -> "₹1,000"; paise only when there are some
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatCurrency = (amount: string | number) => inr.format(Number(amount));
