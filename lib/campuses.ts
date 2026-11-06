/**
 * The campuses offered on the enquiry form, fixed here so the page makes no API call.
 * The form sends `name`; the backend stores the matching campus's id. Names must match
 * schools.Campus: ids differ between staging and production, so `id` isn't sent.
 */
export const CAMPUSES = [
  { id: 1, name: "The Ardee School, NFC", address: "Yasho Bhawan, New Friends Colony, New Delhi, Delhi 110025" },
  { id: 2, name: "The Ardee School, Goa", address: "193, Bella Vista Vaddo, Sangolda, Bardez, Goa - 403511" },
  { id: 5, name: "Ardee Montessori House, Munirka", address: "14, A St, DDA Flats, Munirka, New Delhi, Delhi 110067" },
  { id: 6, name: "Ardee Montessori House, Noida", address: "3C, Lotus Boulevard, Sector 100, Noida, Uttar Pradesh 201301" },
] as const;
