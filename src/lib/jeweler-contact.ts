/** Public showroom numbers only; never substitute a user's private phone. */
export function contactLinks(phone?: string | null) {
  const compact = phone?.trim().replace(/[\s().-]/g, "");
  if (!compact || !/^\+?\d{7,15}$/.test(compact)) return null;
  const international = compact.startsWith("+") && /^[1-9]\d{7,14}$/.test(compact.slice(1));
  return { call: `tel:${compact}`, whatsapp: international ? `https://wa.me/${compact.slice(1)}` : null };
}

export function whatsappInquiry(base: string, title: string, url: string) {
  return `${base}?${new URLSearchParams({ text: `Hello, I'm interested in ${title}. Could you confirm availability and how to purchase it?\n${url}` })}`;
}
