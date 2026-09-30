export type FormId = "checkout" | "trip";
export type FieldKind = "text" | "textarea" | "date" | "number" | "tel";

export interface FormField {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  /** Columns out of 6 on wide screens. */
  span: 2 | 3 | 4 | 6;
}

export type PresetTone = "clean" | "mistake" | "tricky";

export interface FormPreset {
  id: string;
  label: string;
  tone: PresetTone;
  /** What a careful human reviewer would notice, shown under the preset row. */
  note: string;
  values: (today: Date) => Record<string, string>;
}

export interface FormSpec {
  id: FormId;
  name: string;
  /** What Jev is told about the form it is reading. */
  context: string;
  fields: FormField[];
  presets: FormPreset[];
}

export function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function inDays(today: Date, n: number) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** A date in the next upcoming occurrence of `month` (0-based) that is at least a week away. */
function upcoming(today: Date, month: number, day: number) {
  const d = new Date(today.getFullYear(), month, day);
  if (d.getTime() - today.getTime() < 7 * 86_400_000) d.setFullYear(d.getFullYear() + 1);
  return isoDate(d);
}

const CHECKOUT_BLANK = {
  name: "",
  street: "",
  unit: "",
  city: "",
  region: "",
  postcode: "",
  country: "",
  phone: "",
  deliveryDate: "",
  notes: "",
  gift: "",
};

const CHECKOUT_CLEAN = (today: Date) => ({
  ...CHECKOUT_BLANK,
  name: "Maya Chen",
  street: "1427 Elm Street",
  city: "Austin",
  region: "TX",
  postcode: "78704",
  country: "United States",
  phone: "+1 512 555 0142",
  deliveryDate: inDays(today, 4),
  notes: "Side gate is unlocked, leave by the back door",
});

const CHECKOUT: FormSpec = {
  id: "checkout",
  name: "Checkout",
  context: "A shopper is filling in the shipping details at the checkout of an online store that ships worldwide.",
  fields: [
    { key: "name", label: "Full name", kind: "text", placeholder: "Maya Chen", span: 6 },
    { key: "street", label: "Street address", kind: "text", placeholder: "1427 Elm Street", span: 4 },
    { key: "unit", label: "Apt / unit", kind: "text", placeholder: "Apt 3", span: 2 },
    { key: "city", label: "City", kind: "text", placeholder: "Austin", span: 2 },
    { key: "region", label: "State / region", kind: "text", placeholder: "TX", span: 2 },
    { key: "postcode", label: "Postal code", kind: "text", placeholder: "78704", span: 2 },
    { key: "country", label: "Country", kind: "text", placeholder: "United States", span: 3 },
    { key: "phone", label: "Phone", kind: "tel", placeholder: "+1 512 555 0142", span: 3 },
    { key: "deliveryDate", label: "Delivery date", kind: "date", span: 3 },
    { key: "notes", label: "Delivery notes", kind: "textarea", placeholder: "Anything the courier should know", span: 6 },
    { key: "gift", label: "Gift message", kind: "textarea", placeholder: "Printed on the packing slip", span: 6 },
  ],
  presets: [
    { id: "clean", label: "Clean", tone: "clean", note: "A normal order. Nothing should be flagged.", values: CHECKOUT_CLEAN },
    {
      id: "postcode",
      label: "Wrong postcode",
      tone: "mistake",
      note: "90210 is Beverly Hills, not New York.",
      values: (t) => ({ ...CHECKOUT_CLEAN(t), street: "245 W 52nd Street", city: "New York", region: "NY", postcode: "90210", phone: "+1 212 555 0198" }),
    },
    {
      id: "phone",
      label: "Foreign phone",
      tone: "mistake",
      note: "A London phone number on an Austin delivery.",
      values: (t) => ({ ...CHECKOUT_CLEAN(t), phone: "+44 20 7946 0958" }),
    },
    {
      id: "porch",
      label: "Porch on the 30th floor",
      tone: "mistake",
      note: "High-rise apartments don't have porches.",
      values: (t) => ({
        ...CHECKOUT_CLEAN(t),
        street: "401 N Wabash Ave",
        unit: "Apt 14B, 30th floor",
        city: "Chicago",
        region: "IL",
        postcode: "60611",
        phone: "+1 312 555 0110",
        notes: "Leave it on the front porch by the steps",
      }),
    },
    {
      id: "birthday",
      label: "Late birthday gift",
      tone: "mistake",
      note: "The birthday is tomorrow; the delivery is in eight days.",
      values: (t) => ({ ...CHECKOUT_CLEAN(t), deliveryDate: inDays(t, 8), gift: "Happy birthday for tomorrow, Sam! Love, Maya" }),
    },
    {
      id: "paris",
      label: "Paris, Texas",
      tone: "tricky",
      note: "Looks like a mix-up, but Paris, TX 75460 is real. Nothing should be flagged.",
      values: (t) => ({ ...CHECKOUT_CLEAN(t), street: "118 Lamar Ave", city: "Paris", region: "TX", postcode: "75460", phone: "+1 903 555 0187" }),
    },
    {
      id: "moscow",
      label: "Moscow, Idaho",
      tone: "tricky",
      note: "Moscow, ID 83843 is a college town. Nothing should be flagged.",
      values: (t) => ({ ...CHECKOUT_CLEAN(t), street: "610 S Main St", city: "Moscow", region: "ID", postcode: "83843", phone: "+1 208 555 0133" }),
    },
  ],
};

const TRIP_CLEAN = (today: Date) => ({
  destination: "Lisbon, Portugal",
  depart: inDays(today, 30),
  return: inDays(today, 37),
  travelers: "2",
  activities: "Tram 28, pastéis de nata, a day trip to Sintra",
  packing: "Comfy walking shoes, a light jacket for the evenings",
  budget: "$3,000 total",
});

const TRIP: FormSpec = {
  id: "trip",
  name: "Trip booking",
  context: "A traveler is filling in a trip-planning form on a travel agency's website.",
  fields: [
    { key: "destination", label: "Destination", kind: "text", placeholder: "Lisbon, Portugal", span: 6 },
    { key: "depart", label: "Departure date", kind: "date", span: 2 },
    { key: "return", label: "Return date", kind: "date", span: 2 },
    { key: "travelers", label: "Number of travelers", kind: "number", placeholder: "2", span: 2 },
    { key: "activities", label: "Planned activities", kind: "textarea", placeholder: "What do you want to do there?", span: 6 },
    { key: "packing", label: "Packing notes", kind: "textarea", placeholder: "Anything special to bring", span: 6 },
    { key: "budget", label: "Budget", kind: "text", placeholder: "$3,000 total", span: 3 },
  ],
  presets: [
    { id: "clean", label: "Clean", tone: "clean", note: "A week in Lisbon. Nothing should be flagged.", values: TRIP_CLEAN },
    {
      id: "miami",
      label: "Skiing in Miami",
      tone: "mistake",
      note: "Miami in July has no snow.",
      values: (t) => ({
        ...TRIP_CLEAN(t),
        destination: "Miami, Florida",
        depart: upcoming(t, 6, 10),
        return: upcoming(t, 6, 17),
        activities: "Skiing and snowboarding every day",
        packing: "Ski jacket, thermals, goggles",
      }),
    },
    {
      id: "dates",
      label: "Back before leaving",
      tone: "mistake",
      note: "The return date is before the departure date.",
      values: (t) => ({ ...TRIP_CLEAN(t), depart: inDays(t, 40), return: inDays(t, 35) }),
    },
    {
      id: "solo",
      label: "Solo trip for four",
      tone: "mistake",
      note: "A solo trip, booked for four travelers.",
      values: (t) => ({ ...TRIP_CLEAN(t), travelers: "4", activities: "A solo trip to clear my head: long walks and journaling" }),
    },
    {
      id: "portillo",
      label: "Skiing in Chile in July",
      tone: "tricky",
      note: "July is peak ski season in the Andes. Nothing should be flagged.",
      values: (t) => ({
        ...TRIP_CLEAN(t),
        destination: "Portillo, Chile",
        depart: upcoming(t, 6, 10),
        return: upcoming(t, 6, 17),
        activities: "Skiing and snowboarding every day",
        packing: "Ski jacket, thermals, goggles",
        budget: "$6,000 total",
      }),
    },
    {
      id: "sydney",
      label: "Beach Christmas",
      tone: "tricky",
      note: "December is summer in Sydney. Nothing should be flagged.",
      values: (t) => ({
        ...TRIP_CLEAN(t),
        destination: "Sydney, Australia",
        depart: upcoming(t, 11, 20),
        return: upcoming(t, 11, 30),
        activities: "Christmas lunch on Bondi Beach, surfing lessons",
        packing: "Swimsuits, sunscreen, a Santa hat",
        budget: "$7,500 total",
      }),
    },
  ],
};

export const FORMS: Record<FormId, FormSpec> = { checkout: CHECKOUT, trip: TRIP };
export const FORM_IDS = Object.keys(FORMS) as FormId[];

export function blankValues(form: FormSpec) {
  return Object.fromEntries(form.fields.map((f) => [f.key, ""]));
}
