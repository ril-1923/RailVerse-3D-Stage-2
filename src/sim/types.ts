export type TrainStatus =
  | 'At station'
  | 'Boarding'
  | 'Departing'
  | 'Running'
  | 'Approaching station'
  | 'Braking'
  | 'Stopped'
  | 'Delayed'
  | 'Emergency stop';

export type TrainKind =
  | 'Express'
  | 'Regional'
  | 'Metro'
  | 'Freight'
  | 'High-Speed'
  | 'Commuter';

export interface StationDef {
  id: string;
  name: string;
  /** Position on the main loop path, meters from origin */
  trackPos: number;
  /** Which side the platform sits on */
  platformSide: 1 | -1;
  color: string;
}

export interface PassengerJourney {
  id: number;
  originIndex: number;
  destIndex: number;
  state: 'toPlatform' | 'waiting' | 'onTrain' | 'arrived' | 'leaving';
  /** progress 0..1 of walking segment */
  walkT: number;
  /** target train id when boarding */
  trainId: number | null;
  waitTimer: number;
  /** unique instance index for rendering */
  seed: number;
}

export interface TrainDef {
  id: number;
  number: string;
  name: string;
  kind: TrainKind;
  color: string;
  accent: string;
  maxSpeed: number; // km/h
  carriages: number;
  route: number[]; // station indices in visiting order
}

export interface TrainState {
  id: number;
  def: TrainDef;
  /** meters along current route leg path */
  dist: number;
  /** current leg index into route (from route[i] to route[i+1]) */
  legIndex: number;
  direction: 1 | -1;
  speed: number; // km/h
  targetSpeed: number; // user-set cruise speed km/h
  status: TrainStatus;
  paused: boolean;
  started: boolean;
  reversing: boolean;
  reversingPending: boolean;
  doorOpen: boolean;
  boardingTimer: number;
  passengerCount: number;
  capacity: number;
  nextStationIndex: number; // station index within route array
  distToNextStation: number;
  etaSeconds: number;
  condition: number; // 0-100
  delaySeconds: number;
  wheelRotation: number;
  signalHold: boolean;
  emergency: boolean;
}

export interface SignalState {
  id: string;
  aspect: 'green' | 'yellow' | 'red';
  blockId: number;
  pos: number;
  side: 1 | -1;
  branch: 'main' | 'loop';
}

export interface Announcement {
  id: number;
  text: string;
  kind: 'arrival' | 'departure' | 'info' | 'warning';
  time: string;
}
