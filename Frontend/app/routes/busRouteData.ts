import type { BusRouteConfig, RouteData, RouteStopCoord } from "./busRouteTypes";

function zipSchedule(stops: string[], times: string[]): RouteData["schedule"] {
  return stops.map((stopName, i) => ({
    time: times[i] ?? times[times.length - 1] ?? "07:00 AM",
    stopName,
  }));
}

function lineCoords(stops: string[], region: "vijayawada" | "guntur"): RouteStopCoord[] {
  const n = Math.max(stops.length - 1, 1);
  const bounds =
    region === "guntur"
      ? { lat0: 16.29, lng0: 80.42, lat1: 16.33, lng1: 80.46 }
      : { lat0: 16.48, lng0: 80.52, lat1: 16.52, lng1: 80.66 };
  return stops.map((name, i) => ({
    name,
    lat: bounds.lat0 + ((bounds.lat1 - bounds.lat0) * i) / n,
    lng: bounds.lng0 + ((bounds.lng1 - bounds.lng0) * i) / n,
  }));
}

const GPS_DEFAULT = "VV-11";

/** VV1 — full coordinates (same as original vv1.tsx) */
const vv1Data: RouteData = {
  title: "VV1",
  description: "currency nagar ↔ VIT-AP Campus",
  stops: [
    "currency nagar",
    "govt hospital",
    "varadhi",
    "HP petroleum",
    "undavalli centre",
    "undavalli caves",
    "VIT-AP Campus",
  ],
  schedule: [
    { time: "07:50 AM", stopName: "currency nagar" },
    { time: "07:53 AM", stopName: "govt hospital" },
    { time: "07:55 AM", stopName: "varadhi" },
    { time: "08:00 AM", stopName: "HP petroleum" },
    { time: "08:05 AM", stopName: "Undavalli centre" },
    { time: "08:08 AM", stopName: "Undavalli caves" },
    { time: "08:45 AM", stopName: "VIT-AP Campus" },
  ],
  occupancy: "Medium",
  busNumber: GPS_DEFAULT,
  stopsCoordinates: [
    { name: "currency nagar", lat: 16.5169, lng: 80.4992 },
    { name: "govt hospital", lat: 16.5157, lng: 80.6708 },
    { name: "varadhi", lat: 16.5009, lng: 80.6339 },
    { name: "HP pretroleum", lat: 16.4799, lng: 80.617 },
    { name: "Undavalli centre", lat: 16.4912, lng: 80.6015 },
    { name: "Undavalli caves", lat: 16.497, lng: 80.5815 },
    { name: "VIT-AP Campus", lat: 16.4969, lng: 80.4992 },
  ],
};

/** VV2 — same coordinates as original vv2.tsx */
const vv2Stops = [
  "Poranki Center",
  "Thumu Center",
  "Tadigadapa",
  "KCP Colony",
  "VR Siddartha",
  "Bharath Petrol Pump",
  "Kamayyathopu",
  "Time Hospital",
];
const vv2Data: RouteData = {
  title: "VV2 Bus Route",
  description: "Poranki Center ↔ Time Hospital",
  stops: vv2Stops,
  schedule: zipSchedule(vv2Stops, [
    "07:40 AM",
    "07:43 AM",
    "07:45 AM",
    "07:48 AM",
    "07:50 AM",
    "07:52 AM",
    "07:55 AM",
    "08:00 AM",
  ]),
  occupancy: "Medium",
  busNumber: GPS_DEFAULT,
  stopsCoordinates: [
    { name: "Poranki Center", lat: 16.5169, lng: 80.4992 },
    { name: "Thumu Center", lat: 16.505, lng: 80.633 },
    { name: "Tadigadapa", lat: 16.507, lng: 80.635 },
    { name: "KCP Colony", lat: 16.509, lng: 80.637 },
    { name: "VR Siddartha", lat: 16.511, lng: 80.639 },
    { name: "Bharath Petrol Pump", lat: 16.513, lng: 80.641 },
    { name: "Kamayyathopu", lat: 16.515, lng: 80.643 },
    { name: "Time Hospital", lat: 16.517, lng: 80.645 },
  ],
};

function vijayRoute(
  title: string,
  description: string,
  stops: string[],
  times: string[],
  busNumber: string = GPS_DEFAULT
): RouteData {
  return {
    title,
    description,
    stops,
    schedule: zipSchedule(stops, times),
    occupancy: "Medium",
    busNumber,
    stopsCoordinates: lineCoords(stops, "vijayawada"),
  };
}

function gunturRoute(
  title: string,
  description: string,
  stops: string[],
  times: string[],
  busNumber: string = GPS_DEFAULT
): RouteData {
  return {
    title,
    description,
    stops,
    schedule: zipSchedule(stops, times),
    occupancy: "Medium",
    busNumber,
    stopsCoordinates: lineCoords(stops, "guntur"),
  };
}

export const ROUTE_VV1: BusRouteConfig = { routeId: "vv1", gpsBusId: GPS_DEFAULT, routeData: vv1Data };
export const ROUTE_VV2: BusRouteConfig = { routeId: "vv2", gpsBusId: GPS_DEFAULT, routeData: vv2Data };

export const ROUTE_VV3: BusRouteConfig = {
  routeId: "vv3",
  gpsBusId: GPS_DEFAULT,
  routeData: vijayRoute(
    "VV3 Bus Route",
    "kamayyathopu center to screw bridge",
    [
      "kamayyathopu center",
      "pappula mill center",
      "ashok nagar",
      "time hospital",
      "auto nagar gate",
      "screw bridge",
    ],
    ["07:40 AM", "07:42 AM", "07:45 AM", "07:47 AM", "07:48 AM", "07:58 AM"]
  ),
};

export const ROUTE_VV4: BusRouteConfig = {
  routeId: "vv4",
  gpsBusId: GPS_DEFAULT,
  routeData: vijayRoute(
    "VV4 Bus Route",
    "time hospital to screw bridge",
    ["time hospital", "auto nagar gate", "patamata(high school road)", "P&T colony - NTR circle", "screw bridge"],
    ["07:45 AM", "07:46 AM", "07:48 AM", "07:50 AM", "08:00 AM"]
  ),
};

export const ROUTE_VV5: BusRouteConfig = {
  routeId: "vv5",
  gpsBusId: GPS_DEFAULT,
  routeData: vijayRoute(
    "VV5 Bus Route",
    "auto nagar gate to ramesh hospital",
    [
      "auto nagar gate",
      "high school road",
      " NTR circle",
      "eenadu",
      "benz circle(bajaj showroom)",
      "DV manor(sweet magic)",
      "ramesh hospital",
    ],
    ["07:35 AM", "07:37 AM", "07:40 AM", "07:42 AM", "07:44 AM", "07:50 AM", "07:52 AM"]
  ),
};

const vv6stops = [
  "patamata e seva",
  " NTR circle",
  "eenadu",
  "benz circle(bajaj showroom)",
  "DV manor(sweet magic)",
  "khandhari(MVR)",
  "PVP mall",
  "labbipet (venkateswara swamy)",
  "ramesh hospital",
  "balaji nagar",
  "varadhi",
];
export const ROUTE_VV6: BusRouteConfig = {
  routeId: "vv6",
  gpsBusId: GPS_DEFAULT,
  routeData: vijayRoute(
    "VV6 Bus Route",
    "patamata E seva to varadhi",
    vv6stops,
    [
      "07:30 AM",
      "07:32 AM",
      "07:35 AM",
      "07:37 AM",
      "07:40 AM",
      "07:44 AM",
      "07:50 AM",
      "07:52 AM",
      "07:55 AM",
      "08:00 AM",
    ]
  ),
};

export const ROUTE_VV7: BusRouteConfig = {
  routeId: "vv7",
  gpsBusId: GPS_DEFAULT,
  routeData: vijayRoute(
    "VV7 Bus Route",
    "gannavaram bus stand to enikepadu",
    ["gannavaram bus stand", "kesarapalli", "gudavalli", "nidamanuru", "enikepadu"],
    ["07:10 AM", "07:20 AM", "07:25 AM", "07:30 AM", "07:35 AM"]
  ),
};

export const ROUTE_VV8: BusRouteConfig = {
  routeId: "vv8",
  gpsBusId: GPS_DEFAULT,
  routeData: vijayRoute(
    "VV8 Bus Route",
    "enikepadu to currency nagar",
    ["enikepadu", "prasadampadu", "ramavarapadu ring", "currency nagar"],
    ["07:20 AM", "07:25 AM", "07:40 AM", "07:42 AM"]
  ),
};

const vv9stops = [
  "ramavarapadu ring- govt",
  "govt hospital",
  "novotel",
  "McDonalds",
  "maris stella college",
  " screw bridge",
  "balagi nagar",
  "varadhi bus stop",
];
export const ROUTE_VV9: BusRouteConfig = {
  routeId: "vv9",
  gpsBusId: GPS_DEFAULT,
  routeData: vijayRoute(
    "VV9 Bus Route",
    "ramavarapadu ring - govt to varadhi bus stop",
    vv9stops,
    ["07:40 AM", "07:40 AM", "07:42 AM", "07:45 AM", "07:52 AM", "07:55 AM", "07:59 AM", "08:00 AM"]
  ),
};

export const ROUTE_VV10: BusRouteConfig = {
  routeId: "vv10",
  gpsBusId: GPS_DEFAULT,
  routeData: vijayRoute(
    "VV10 Bus Route",
    "nunna center to debakotlu center",
    [
      "nunna center",
      "sub station",
      "kandrika petrol pump",
      "payakapuram",
      "prakash nagar",
      "pipula road",
      "singh nagar",
      "debakotlu center",
    ],
    ["07:30 AM", "07:40 AM", "07:45 AM", "07:50 AM", "07:52 AM", "07:55 AM", "07:58 AM", "08:00 AM"]
  ),
};

export const ROUTE_GV1: BusRouteConfig = {
  routeId: "gv1",
  gpsBusId: GPS_DEFAULT,
  routeData: gunturRoute(
    "GV 1 Bus Route",
    "lodge center to bus stand -guntur",
    ["lodge center", "arundalpeta", "sankar vilas", "naaz center", "market -guntur", "chandana bros", "bus stand -guntur"],
    ["07:20 AM", "07:23 AM", "07:30 AM", "07:35 AM", "07:40 AM", "07:42 AM", "07:45 AM"]
  ),
};

export const ROUTE_GV2: BusRouteConfig = {
  routeId: "gv2",
  gpsBusId: GPS_DEFAULT,
  routeData: gunturRoute(
    "GV 2 Bus Route",
    "brahmananda stadium to reliance petrol pump",
    [
      "brahmananda stadium",
      "RTC colony",
      "manipuram bridge",
      "badhra kali amma vari temple",
      "barath petrol pump",
      "HP petrol pump",
      "relaince mart",
      "vasavi cloth market",
      "mangal das nagar",
      "reliance petrol pump",
    ],
    ["07:20 AM", "07:25 AM", "07:30 AM", "07:35 AM", "07:40 AM", "07:45 AM", "07:45 AM", "07:50 AM", "07:55 AM", "08:00 AM"]
  ),
};

export const ROUTE_GV3: BusRouteConfig = {
  routeId: "gv3",
  gpsBusId: GPS_DEFAULT,
  routeData: gunturRoute(
    "GV 3 Bus Route",
    "hanumaiah company to nayer hostel center",
    ["hanumaiah colony", "rajendra nagar colony", "brundavan gardens", "sitaramaiah high school", "nayer hostel center"],
    ["07:20 AM", "07:20 AM", "07:22 AM", "07:25 AM", "07:28 AM"]
  ),
};

export const ROUTE_GV4: BusRouteConfig = {
  routeId: "gv4",
  gpsBusId: GPS_DEFAULT,
  routeData: gunturRoute(
    "GV 4 Bus Route",
    "baker's fun center to chillies",
    ["baker's fun center", "HDFC bank", "reliance mart", "hollywood-bollywood", "amaravathi road", "chillies"],
    ["07:30 AM", "07:32 AM", "07:35 AM", "07:37 AM", "07:40 AM", "07:45 AM"]
  ),
};

export const ROUTE_GV5: BusRouteConfig = {
  routeId: "gv5",
  gpsBusId: GPS_DEFAULT,
  routeData: gunturRoute(
    "GV 5 Bus Route",
    "SVN colony to Syamala nagar petrol bunk",
    ["SVN colony", "gujjanagundla", "hanumaiah company", "sthambala garuvu", "old RTO office", "Syamala nagar petrol bunk"],
    ["07:20 AM", "07:21 AM", "07:22 AM", "07:23 AM", "07:24 AM", "07:25 AM"]
  ),
};

export const ROUTE_GV6: BusRouteConfig = {
  routeId: "gv6",
  gpsBusId: GPS_DEFAULT,
  routeData: gunturRoute(
    "GV 6 Bus Route",
    "swamy theatre to auto nagar -guntur",
    ["swamy theatre", "TJPS college", "kankarakunta bridge", "market", "bus stand", "auto nagar - guntur"],
    ["07:26 AM", "07:27 AM", "07:38 AM", "07:32 AM", "07:42 AM", "07:45 AM"]
  ),
};

export const ROUTE_GV7: BusRouteConfig = {
  routeId: "gv7",
  gpsBusId: GPS_DEFAULT,
  routeData: gunturRoute(
    "GV 7 Bus Route",
    "palakuluru to SGV",
    [
      "palakaluru",
      "gujjana gundla current office",
      "gujjana gundla",
      "JKC college",
      "RTO office road",
      "chillies",
      "SGV",
    ],
    ["07:10 AM", "07:20 AM", "07:23 AM", "07:24 AM", "07:25 AM", "07:28 AM", "07:29 AM"]
  ),
};

export const ROUTE_GV8: BusRouteConfig = {
  routeId: "gv8",
  gpsBusId: GPS_DEFAULT,
  routeData: gunturRoute(
    "GV 8 Bus Route",
    "vidhya nagar to kalamandir",
    [
      "vidhya nagar",
      "saibaba temple road",
      "kottipadu library center",
      "gandhi statue center",
      "harihara temple",
      "kalamandir",
    ],
    ["07:25 AM", "07:30 AM", "07:31 AM", "07:32 AM", "07:33 AM", "07:34 AM"]
  ),
};

export const ROUTE_GV9: BusRouteConfig = {
  routeId: "gv9",
  gpsBusId: GPS_DEFAULT,
  routeData: gunturRoute(
    "GV 9 Bus Route",
    "vidhta nagar to chillies",
    [
      "vidhya nagar",
      "navabharath nagar",
      "JKC college",
      "new RTO office",
      "swarna bharath nagar",
      "chillies",
    ],
    ["07:30 AM", "07:31 AM", "07:31 AM", "07:37 AM", "07:38 AM", "07:42 AM"]
  ),
};

export const ROUTE_GV10: BusRouteConfig = {
  routeId: "gv10",
  gpsBusId: GPS_DEFAULT,
  routeData: gunturRoute(
    "GV 10 Bus Route",
    "inner ring road to reliance petrol pump",
    [
      "inner ring road",
      "vijaya digitals",
      "baristha",
      "ysr bomma",
      "sri chaitanya school",
      "reliance petrol pump",
    ],
    ["07:30 AM", "07:32 AM", "07:35 AM", "07:37 AM", "07:38 AM", "07:40 AM"]
  ),
};
