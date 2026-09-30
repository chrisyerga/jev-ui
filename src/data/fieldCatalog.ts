export const INPUT_TYPES = {
  short_text: "A one-line free-text box, for names, titles, or short answers nobody could list in advance",
  long_text: "A multi-line free-text box, for comments, descriptions, or anything a sentence or more long",
  email: "An email address",
  phone: "A phone number",
  number: "A count or amount typed as a number",
  date: "A calendar date",
  toggle: "A single on/off switch or checkbox, for a yes-or-no agreement or preference",
  single: "Pick exactly one from a short list of fixed options",
  multi: "Tick any number from a list of fixed options",
  rating: "A 1-to-5 star rating",
} as const;

export type InputType = keyof typeof INPUT_TYPES;
export const INPUT_TYPE_LABELS: Record<InputType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  date: "Date",
  toggle: "Yes/no toggle",
  single: "Single choice",
  multi: "Multiple choice",
  rating: "Rating",
};

export interface OptionSet {
  /** What Jev reads when choosing an option set. */
  description: string;
  options: readonly string[];
}

export const OPTION_SETS = {
  clothing_sizes: { description: "Clothing sizes for a T-shirt, hoodie, or similar garment", options: ["XS", "S", "M", "L", "XL", "XXL"] },
  pizza_sizes: { description: "Pizza sizes", options: ['Small 10"', 'Medium 12"', 'Large 14"', 'Extra large 16"'] },
  truck_sizes: {
    description: "Moving truck sizes",
    options: ["10 ft (studio)", "15 ft (1–2 bedrooms)", "20 ft (2–3 bedrooms)", "26 ft (4+ bedrooms)"],
  },
  crusts: { description: "Pizza crust styles", options: ["Thin", "Classic", "Deep dish", "Stuffed"] },
  yes_no_maybe: { description: "An RSVP-style yes, no, or maybe", options: ["Yes", "No", "Maybe"] },
  guests: { description: "How many extra guests someone is bringing", options: ["Just me", "+1", "+2", "+3 or more"] },
  contact_method: { description: "How someone prefers to be contacted", options: ["Email", "Phone call", "Text message", "WhatsApp"] },
  shipping_speed: { description: "Shipping or delivery speed", options: ["Standard (5–7 days)", "Express (2–3 days)", "Overnight"] },
  seat: { description: "Seat preference on a plane, train, or bus", options: ["Window", "Aisle", "Middle", "No preference"] },
  dietary: {
    description: "Dietary needs or food restrictions",
    options: ["No restrictions", "Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Nut allergy"],
  },
  satisfaction: {
    description: "How satisfied someone is",
    options: ["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"],
  },
  weekdays: { description: "Days of the week", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
  time_of_day: { description: "A time of day or time window", options: ["Morning", "Afternoon", "Evening"] },
  referral: {
    description: "How someone heard about a company or product",
    options: ["Search engine", "Social media", "Friend or colleague", "Podcast", "Advertisement", "Other"],
  },
  employment_type: { description: "Type of employment for a job", options: ["Full-time", "Part-time", "Contract", "Internship"] },
  experience: { description: "Level of work experience or seniority", options: ["Entry level", "Mid level", "Senior", "Lead / manager"] },
  accommodation: { description: "Kind of place to stay while traveling", options: ["Hotel", "Apartment rental", "Hostel", "Campsite"] },
  travel_class: { description: "Cabin or ticket class for travel", options: ["Economy", "Premium economy", "Business", "First"] },
} as const satisfies Record<string, OptionSet>;

export type OptionSetId = keyof typeof OPTION_SETS;
export const OPTION_SET_IDS = Object.keys(OPTION_SETS) as OptionSetId[];

export const SANDBOX_CONTEXTS = {
  checkout: { name: "Checkout", description: "the checkout page of an online clothing store" },
  trip: { name: "Trip booking", description: "a flight and hotel booking form on a travel site" },
  pizza: { name: "Pizza order", description: "an online pizza delivery order form" },
  job: { name: "Job application", description: "an online job application form" },
  rsvp: { name: "Event RSVP", description: "an RSVP form for a friend's wedding" },
  moving: { name: "Moving truck", description: "a moving truck rental booking form" },
} as const;

export type SandboxContextId = keyof typeof SANDBOX_CONTEXTS;
export const SANDBOX_CONTEXT_IDS = Object.keys(SANDBOX_CONTEXTS) as SandboxContextId[];

export const SANDBOX_EXAMPLES: { label: string; context: SandboxContextId }[] = [
  { label: "Size", context: "pizza" },
  { label: "Size", context: "checkout" },
  { label: "Size", context: "moving" },
  { label: "Send me news and offers", context: "checkout" },
  { label: "Seat", context: "trip" },
  { label: "How did you hear about us?", context: "job" },
  { label: "Dietary needs", context: "rsvp" },
  { label: "Date of birth", context: "job" },
  { label: "Will you attend?", context: "rsvp" },
];
