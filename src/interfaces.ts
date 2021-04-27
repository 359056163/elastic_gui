import { Client } from '@elastic/elasticsearch';

export interface ElasticConn {
  alias: string;
  host: string;
  username?: string;
  password?: string;
}
export interface IMainTabProp {
  key: string;
  connection: ElasticConn;
  operation: string;
  client: Client;
  index: string;
}
export interface ElasticIndexBrief {
  docsCount: string;
  docsDeleted: string;
  health: string;
  index: string;
  pri: string;
  priStoreSize: string;
  rep: string;
  status: string;
  storeSize: string;
  uuid: string;
  aliases?: string[];
}
export enum Health {
  green = '#336600',
  yellow = '#FFCC00',
  red = '#FF0000',
}

export interface ElasticResult<T> {
  current: number;
  pageSize: number;
  total: number;
  data: T[];
}
