export type RouteStopCoord = { name: string; lat: number; lng: number };

export type RouteData = {
  title: string;
  description: string;
  stops: string[];
  schedule: { time: string; stopName: string }[];
  occupancy: string;
  busNumber: string;
  stopsCoordinates: RouteStopCoord[];
};

export type BusRouteConfig = {
  routeId: string;
  gpsBusId: string;
  routeData: RouteData;
};
