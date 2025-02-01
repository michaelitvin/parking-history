import { ParkingEntry } from './dynamodb';

export type HeatmapData = {
  day: number;
  hour: number;
  value: number;
  count: number;
  total: number;
};

export type ParkingLotData = {
  heatmap: HeatmapData[];
  last_entry: ParkingEntry;
};

export type ParkingLotsData = {
  [url: string]: ParkingLotData;
}; 