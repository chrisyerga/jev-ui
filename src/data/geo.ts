export type GeoKind = "state" | "city";

export interface GeoItem {
  id: string;
  kind: GeoKind;
  name: string;
  stateCode: string;
  stateName: string;
  /** Text Jev sees for this candidate. */
  label: string;
  /** Rough adult population in thousands, for the mock reach estimate. */
  reachK: number;
}

const STATES: [code: string, name: string, adultsM: number][] = [
  ["AL", "Alabama", 3.9], ["AK", "Alaska", 0.55], ["AZ", "Arizona", 5.7], ["AR", "Arkansas", 2.3],
  ["CA", "California", 30.5], ["CO", "Colorado", 4.6], ["CT", "Connecticut", 2.9], ["DE", "Delaware", 0.8],
  ["DC", "District of Columbia", 0.55], ["FL", "Florida", 18.0], ["GA", "Georgia", 8.3], ["HI", "Hawaii", 1.1],
  ["ID", "Idaho", 1.4], ["IL", "Illinois", 9.8], ["IN", "Indiana", 5.2], ["IA", "Iowa", 2.4],
  ["KS", "Kansas", 2.2], ["KY", "Kentucky", 3.5], ["LA", "Louisiana", 3.5], ["ME", "Maine", 1.1],
  ["MD", "Maryland", 4.7], ["MA", "Massachusetts", 5.6], ["MI", "Michigan", 7.8], ["MN", "Minnesota", 4.4],
  ["MS", "Mississippi", 2.3], ["MO", "Missouri", 4.8], ["MT", "Montana", 0.9], ["NE", "Nebraska", 1.5],
  ["NV", "Nevada", 2.5], ["NH", "New Hampshire", 1.1], ["NJ", "New Jersey", 7.2], ["NM", "New Mexico", 1.7],
  ["NY", "New York", 15.5], ["NC", "North Carolina", 8.3], ["ND", "North Dakota", 0.6], ["OH", "Ohio", 9.1],
  ["OK", "Oklahoma", 3.0], ["OR", "Oregon", 3.4], ["PA", "Pennsylvania", 10.3], ["RI", "Rhode Island", 0.9],
  ["SC", "South Carolina", 4.1], ["SD", "South Dakota", 0.7], ["TN", "Tennessee", 5.5], ["TX", "Texas", 22.5],
  ["UT", "Utah", 2.5], ["VT", "Vermont", 0.5], ["VA", "Virginia", 6.7], ["WA", "Washington", 6.1],
  ["WV", "West Virginia", 1.4], ["WI", "Wisconsin", 4.6], ["WY", "Wyoming", 0.45],
];

const CITIES: Record<string, string[]> = {
  AL: ["Birmingham", "Huntsville", "Montgomery", "Mobile", "Tuscaloosa", "Gulf Shores"],
  AK: ["Anchorage", "Fairbanks", "Juneau"],
  AZ: ["Phoenix", "Tucson", "Mesa", "Scottsdale", "Tempe", "Flagstaff", "Sedona", "Chandler"],
  AR: ["Little Rock", "Fayetteville", "Bentonville", "Hot Springs"],
  CA: [
    "Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach",
    "Oakland", "Bakersfield", "Anaheim", "Irvine", "Santa Barbara", "Palo Alto", "Berkeley",
    "Malibu", "Santa Cruz", "Palm Springs", "Napa", "South Lake Tahoe", "Mammoth Lakes",
    "Riverside", "Pasadena", "Carmel-by-the-Sea",
  ],
  CO: ["Denver", "Colorado Springs", "Aurora", "Boulder", "Fort Collins", "Aspen", "Vail", "Breckenridge", "Telluride", "Steamboat Springs"],
  CT: ["Hartford", "New Haven", "Stamford", "Greenwich"],
  DE: ["Wilmington", "Dover", "Rehoboth Beach"],
  DC: ["Washington"],
  FL: [
    "Miami", "Orlando", "Tampa", "Jacksonville", "St. Petersburg", "Fort Lauderdale", "Tallahassee",
    "Gainesville", "Key West", "Naples", "Sarasota", "The Villages", "Boca Raton", "Pensacola",
    "Daytona Beach", "Miami Beach", "Fort Myers", "Destin",
  ],
  GA: ["Atlanta", "Savannah", "Augusta", "Athens", "Macon", "Columbus"],
  HI: ["Honolulu", "Hilo", "Kailua-Kona", "Lahaina"],
  ID: ["Boise", "Coeur d'Alene", "Sun Valley", "Idaho Falls"],
  IL: ["Chicago", "Aurora", "Naperville", "Springfield", "Peoria", "Champaign", "Evanston"],
  IN: ["Indianapolis", "Fort Wayne", "Bloomington", "South Bend", "Evansville"],
  IA: ["Des Moines", "Cedar Rapids", "Iowa City", "Davenport", "Ames"],
  KS: ["Wichita", "Overland Park", "Kansas City", "Topeka", "Lawrence"],
  KY: ["Louisville", "Lexington", "Bowling Green", "Covington"],
  LA: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Lake Charles"],
  ME: ["Portland", "Bangor", "Bar Harbor", "Kennebunkport"],
  MD: ["Baltimore", "Annapolis", "Bethesda", "Ocean City", "Frederick", "Silver Spring"],
  MA: ["Boston", "Cambridge", "Worcester", "Springfield", "Nantucket", "Provincetown", "Martha's Vineyard", "Salem"],
  MI: ["Detroit", "Grand Rapids", "Ann Arbor", "Lansing", "Flint", "Traverse City", "Kalamazoo", "Dearborn"],
  MN: ["Minneapolis", "St. Paul", "Rochester", "Duluth", "Bloomington"],
  MS: ["Jackson", "Gulfport", "Biloxi", "Oxford", "Hattiesburg"],
  MO: ["Kansas City", "St. Louis", "Springfield", "Columbia", "Branson"],
  MT: ["Billings", "Missoula", "Bozeman", "Whitefish", "Big Sky"],
  NE: ["Omaha", "Lincoln", "Grand Island"],
  NV: ["Las Vegas", "Henderson", "Reno", "Carson City", "Incline Village"],
  NH: ["Manchester", "Nashua", "Portsmouth", "Hanover", "North Conway"],
  NJ: ["Newark", "Jersey City", "Paterson", "Trenton", "Hoboken", "Atlantic City", "Princeton", "Cape May"],
  NM: ["Albuquerque", "Santa Fe", "Las Cruces", "Taos"],
  NY: [
    "New York City", "Buffalo", "Rochester", "Syracuse", "Albany", "Yonkers", "Ithaca",
    "The Hamptons", "Lake Placid", "Saratoga Springs", "White Plains", "Brooklyn",
  ],
  NC: ["Charlotte", "Raleigh", "Durham", "Greensboro", "Asheville", "Wilmington", "Chapel Hill", "Outer Banks", "Boone"],
  ND: ["Fargo", "Bismarck", "Grand Forks", "Williston"],
  OH: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Youngstown", "Athens"],
  OK: ["Oklahoma City", "Tulsa", "Norman", "Stillwater"],
  OR: ["Portland", "Eugene", "Salem", "Bend", "Ashland", "Cannon Beach", "Hood River"],
  PA: ["Philadelphia", "Pittsburgh", "Allentown", "Harrisburg", "Erie", "Scranton", "State College", "Lancaster", "Bethlehem"],
  RI: ["Providence", "Newport", "Warwick"],
  SC: ["Charleston", "Columbia", "Greenville", "Myrtle Beach", "Hilton Head Island"],
  SD: ["Sioux Falls", "Rapid City", "Deadwood"],
  TN: ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Gatlinburg", "Murfreesboro"],
  TX: [
    "Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Plano",
    "Corpus Christi", "Lubbock", "Laredo", "Galveston", "South Padre Island", "College Station",
    "Midland", "McAllen", "The Woodlands", "Marfa",
  ],
  UT: ["Salt Lake City", "Provo", "Ogden", "Park City", "St. George", "Moab"],
  VT: ["Burlington", "Montpelier", "Stowe", "Killington"],
  VA: ["Virginia Beach", "Norfolk", "Richmond", "Arlington", "Alexandria", "Charlottesville", "Blacksburg", "Williamsburg"],
  WA: ["Seattle", "Spokane", "Tacoma", "Bellevue", "Redmond", "Olympia", "Walla Walla", "Leavenworth"],
  WV: ["Charleston", "Morgantown", "Huntington"],
  WI: ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Wisconsin Dells"],
  WY: ["Cheyenne", "Casper", "Jackson", "Laramie", "Cody"],
};

const BIG_CITY_REACH_K: Record<string, number> = {
  "New York City": 6600, "Los Angeles": 3000, Chicago: 2100, Houston: 1750, Phoenix: 1250,
  Philadelphia: 1200, "San Antonio": 1100, "San Diego": 1080, Dallas: 1000, "San Jose": 760,
  Austin: 780, Jacksonville: 740, "Fort Worth": 700, Columbus: 700, Charlotte: 670,
  "San Francisco": 690, Indianapolis: 670, Seattle: 640, Denver: 580, Washington: 550,
  Boston: 540, Nashville: 540, "Las Vegas": 510, Detroit: 470, Brooklyn: 2000, Miami: 370,
};

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const GEO_ITEMS: GeoItem[] = [
  ...STATES.map(([code, name, adultsM]): GeoItem => ({
    id: `state-${code}`,
    kind: "state",
    name,
    stateCode: code,
    stateName: name,
    label: code === "DC" ? "District of Columbia (US federal district)" : `${name} (US state)`,
    reachK: Math.round(adultsM * 1000),
  })),
  ...STATES.flatMap(([code, stateName]) =>
    (CITIES[code] ?? []).map(
      (city): GeoItem => ({
        id: `city-${code}-${slug(city)}`,
        kind: "city",
        name: city,
        stateCode: code,
        stateName,
        label: `${city}, ${stateName}`,
        reachK: BIG_CITY_REACH_K[city] ?? 60,
      }),
    ),
  ),
];

export const GEO_BY_ID = new Map(GEO_ITEMS.map((g) => [g.id, g]));
