export interface SearchResponse {
  docs: MapDetail[];
  //and more
}

export interface MapDetail {
  id: string,
  name: string,
  description: string,
  automapper: boolean,
  ranked: boolean,
  qualified: boolean,
  versions: MapVersion[],
  tags: string[]
}

export interface MapVersion {
  hash: string;
  key?: string;
  state: EMapState,
  previewURL: string
  //and more
}

export enum EMapState {
  Uploaded, Testplay, Published, Feedback, Scheduled
}
