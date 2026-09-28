export type DemoGroup =
  | "Age"
  | "Gender"
  | "Household income"
  | "Education"
  | "Household"
  | "Occupation"
  | "Interest"
  | "Life event"
  | "Purchase behavior";

export interface DemoItem {
  id: string;
  group: DemoGroup;
  name: string;
  /** Text Jev sees for this candidate. */
  label: string;
  /** Rough share of US adults, 0-1, for the mock reach estimate. */
  share: number;
}

const SEGMENTS: Record<DemoGroup, [name: string, share: number][]> = {
  Age: [
    ["18-24", 0.12], ["25-34", 0.17], ["35-44", 0.16], ["45-54", 0.15], ["55-64", 0.16], ["65+", 0.22],
  ],
  Gender: [["Women", 0.51], ["Men", 0.49], ["Non-binary", 0.01]],
  "Household income": [
    ["Under $35k", 0.25], ["$35k-$75k", 0.28], ["$75k-$150k", 0.29], ["$150k-$250k", 0.12], ["$250k+", 0.06],
  ],
  Education: [
    ["High school", 0.27], ["Some college", 0.2], ["Bachelor's degree", 0.24], ["Graduate degree", 0.14],
    ["Currently in college", 0.07], ["Trade school / vocational", 0.05],
  ],
  Household: [
    ["Parents of infants", 0.04], ["Parents of toddlers", 0.05], ["Parents of school-age kids", 0.14],
    ["Parents of teens", 0.1], ["Empty nesters", 0.15], ["Single, no kids", 0.28], ["Married, no kids", 0.12],
    ["Homeowners", 0.64], ["Renters", 0.34], ["Pet owners (dogs)", 0.38], ["Pet owners (cats)", 0.25],
    ["Multigenerational household", 0.06], ["Military family", 0.02],
  ],
  Occupation: [
    ["Software engineers", 0.012], ["Nurses", 0.013], ["Physicians", 0.004], ["Teachers (K-12)", 0.016],
    ["College faculty", 0.006], ["Small business owners", 0.06], ["C-suite executives", 0.005],
    ["Middle managers", 0.04], ["Lawyers", 0.004], ["Accountants", 0.006], ["Real estate agents", 0.006],
    ["Construction trades", 0.03], ["Electricians and plumbers", 0.008], ["Truck drivers", 0.013],
    ["Farmers and ranchers", 0.009], ["Retail workers", 0.04], ["Restaurant and hospitality workers", 0.05],
    ["Gig and rideshare drivers", 0.02], ["Freelance creatives", 0.02], ["Designers", 0.006],
    ["Marketing professionals", 0.01], ["Sales representatives", 0.03], ["Scientists and researchers", 0.005],
    ["Police and firefighters", 0.006], ["Active-duty military", 0.005], ["Veterans", 0.07],
    ["Government employees", 0.08], ["Pilots and flight crew", 0.002], ["Pharmacists", 0.001],
    ["Social workers", 0.003], ["Mechanics", 0.006], ["Students", 0.08], ["Retirees", 0.2],
    ["Stay-at-home parents", 0.05], ["Remote workers", 0.15],
  ],
  Interest: [
    ["Running", 0.1], ["Yoga", 0.08], ["Weightlifting and gyms", 0.15], ["CrossFit", 0.02], ["Cycling", 0.06],
    ["Hiking and camping", 0.18], ["Skiing and snowboarding", 0.04], ["Surfing", 0.01], ["Golf", 0.09],
    ["Tennis and pickleball", 0.07], ["Fishing", 0.14], ["Hunting", 0.06], ["Boating", 0.05],
    ["Plant-based diet", 0.06], ["Keto and low-carb", 0.05], ["Organic and natural foods", 0.14],
    ["Cooking at home", 0.3], ["Craft beer", 0.08], ["Wine", 0.14], ["Coffee culture", 0.2],
    ["Fine dining", 0.06], ["Baking", 0.12], ["Gardening", 0.2], ["Home improvement / DIY", 0.22],
    ["Interior design", 0.1], ["Fashion", 0.15], ["Luxury goods", 0.04], ["Beauty and skincare", 0.2],
    ["Sustainable living", 0.1], ["Personal finance and investing", 0.14], ["Cryptocurrency", 0.05],
    ["Real estate investing", 0.04], ["Entrepreneurship", 0.07], ["Technology and gadgets", 0.18],
    ["PC and console gaming", 0.2], ["Mobile gaming", 0.3], ["Anime", 0.06], ["Comics", 0.05],
    ["Streaming TV", 0.6], ["Movies", 0.45], ["Podcasts", 0.3], ["Books and reading", 0.25],
    ["Country music", 0.15], ["Hip-hop", 0.18], ["Classical music", 0.05], ["Live concerts and festivals", 0.12],
    ["NFL football", 0.3], ["College football", 0.2], ["NBA basketball", 0.18], ["Soccer", 0.1],
    ["NASCAR", 0.06], ["Travel (international)", 0.12], ["Travel (road trips)", 0.2], ["Cruises", 0.05],
    ["Theme parks", 0.1], ["Photography", 0.08], ["Art and museums", 0.08], ["Crafts and DIY", 0.14],
    ["Parenting", 0.14], ["Pets", 0.4], ["Wellness and meditation", 0.1], ["Faith and spirituality", 0.25],
    ["Politics and news", 0.25], ["Volunteering", 0.08], ["Cars and auto enthusiasts", 0.1],
    ["Electric vehicles", 0.04], ["Motorcycles", 0.03], ["RV and van life", 0.02],
  ],
  "Life event": [
    ["Recently engaged", 0.01], ["Newlyweds", 0.015], ["Expecting a baby", 0.012], ["New parents", 0.015],
    ["Recently moved", 0.08], ["First-time homebuyer", 0.012], ["New job", 0.05], ["Recent graduate", 0.02],
    ["Starting college", 0.01], ["Approaching retirement", 0.04], ["Recently retired", 0.02],
    ["Recently divorced", 0.01], ["Kids leaving home", 0.02], ["Upcoming birthday", 0.03],
    ["Planning a wedding", 0.01], ["Started a business", 0.01],
  ],
  "Purchase behavior": [
    ["Organic grocery shoppers", 0.12], ["Plant-based milk buyers", 0.08], ["Meal kit subscribers", 0.03],
    ["Frequent online shoppers", 0.4], ["Bargain and coupon hunters", 0.25], ["Luxury shoppers", 0.04],
    ["Warehouse club members", 0.2], ["New car intenders", 0.05], ["Used car intenders", 0.07],
    ["Home buyers in market", 0.03], ["Home furnishings buyers", 0.08], ["Baby product buyers", 0.04],
    ["Pet supply buyers", 0.25], ["Premium pet food buyers", 0.08], ["Fitness equipment buyers", 0.05],
    ["Athleisure buyers", 0.15], ["Beauty product buyers", 0.25], ["Supplement and vitamin buyers", 0.2],
    ["Frequent travelers / business travel", 0.06], ["Vacation package buyers", 0.08],
    ["Streaming service subscribers", 0.7], ["Smart home device buyers", 0.12], ["Gamers (big spenders)", 0.04],
    ["Craft and hobby supply buyers", 0.1], ["Outdoor gear buyers", 0.1], ["Wine club members", 0.02],
    ["Charitable donors", 0.2], ["Financial planning service seekers", 0.05], ["Life insurance shoppers", 0.04],
    ["Medicare plan shoppers", 0.05], ["Student loan holders", 0.15], ["Credit card switchers", 0.06],
  ],
};

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const DEMO_GROUPS = Object.keys(SEGMENTS) as DemoGroup[];

export const DEMO_ITEMS: DemoItem[] = DEMO_GROUPS.flatMap((group) =>
  SEGMENTS[group].map(
    ([name, share]): DemoItem => ({
      id: `demo-${slug(group)}-${slug(name)}`,
      group,
      name,
      label: `${group}: ${name}`,
      share,
    }),
  ),
);

export const DEMO_BY_ID = new Map(DEMO_ITEMS.map((d) => [d.id, d]));
