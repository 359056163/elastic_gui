import { makeObservable, runInAction } from 'mobx';
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

  totalDocs = 0;

  totalSize = 0;

  deletedDocs = 0;

  segmentCount = 0;

  constructor(client: Client) {
    makeObservable(this, {
      client: false,
    });

    this.client = client;
    this.info = null;
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
    if (resp.statusCode === 200) {
      this.info = resp.body;
      return;
    }
    throw new Error(
      `HTTP CODE:${resp.statusCode}, msg:${JSON.stringify(resp.body)}`
    );
  };

  getInstanceStatus = async () => {
    const { client } = this;
    const resp = await client.indices.stats();
    if (resp.statusCode === 200) {
      const { body: data } = resp;
      const {
        _all: { total },
      } = data;
      runInAction(() => {
        this.totalDocs = total.docs.count;
        this.deletedDocs = total.docs.deleted;
        this.totalSize = total.store.size_in_bytes;
        this.segmentCount = total.segments.count;
      });
      return;
    }
    throw new Error(
      `HTTP CODE:${resp.statusCode}, msg:${JSON.stringify(resp.body)}`
    );
  };
}
