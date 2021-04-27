import { makeAutoObservable } from 'mobx';
import { Client, ApiResponse } from '@elastic/elasticsearch';
import { ElasticIndexBrief, ElasticResult } from '../interfaces';

export interface InstanceInfo {
  name: string;
  cluster_name: string;
  cluster_uuid: string;
  version: {
    build_date: string;
    build_hash: string;
    build_snapshot: boolean;
    lucene_version: string;
    number: string;
  };
}

export default class OverviewStore {
  client: Client;

  indices: ElasticIndexBrief[] = [];

  info: InstanceInfo | null;

  constructor(client: Client) {
    this.client = client;
    this.info = null;
    makeAutoObservable(this, {
      client: false,
    });
  }

  getAllIndexBrief = async () => {
    const { client } = this;
    const [briefResp, aliasResp] = await Promise.all([
      client.cat.indices({
        format: 'json',
      }),
      client.cat.aliases({
        format: 'json',
      }),
    ]);
    // console.log(briefResp, aliasResp);
    this.indices = briefResp.body.map((row: any) => {
      const { index } = row;
      const aliases = aliasResp.body
        .filter((aliasRow: any) => {
          return aliasRow.index === index;
        })
        .map((aliasRow: any) => aliasRow.alias);
      return {
        key: index,
        docsCount: row['docs.count'],
        docsDeleted: row['docs.deleted'],
        health: row.health,
        index,
        pri: row.pri,
        priStoreSize: row['pri.store.size'],
        rep: row.rep,
        status: row.status,
        storeSize: row['store.size'],
        uuid: row.uuid,
        aliases,
      };
    });
  };

  getInstanceInfo = async () => {
    const { client } = this;
    const resp = await client.info();
    const respC = await client.cat.count({ format: 'json' });
    console.log(respC);
    if (resp.statusCode === 200) {
      this.info = resp.body;
      return;
    }
    throw new Error(
      `HTTP CODE:${resp.statusCode}, msg:${JSON.stringify(resp.body)}`
    );
  };
}
