import { makeAutoObservable } from 'mobx';
import { Client, ApiResponse } from '@elastic/elasticsearch';
import { Search } from '@elastic/elasticsearch/api/requestParams';
import { ElasticIndexBrief, ElasticResult } from '../interfaces';

// 只是单纯的将数据层的操作提取，界面状态仍旧维护在组建的state中。
export default class QueryIndexStore {
  client: Client;

  index: string;

  constructor(client: Client, index: string) {
    makeAutoObservable(this, {
      client: false,
      index: false,
    });
    this.client = client;
    this.index = index;
  }

  // 查询索引的简要信息
  public getIndexBrief = async (): Promise<ElasticIndexBrief | null> => {
    const { client, index } = this;
    const resp: ApiResponse = await client.cat.indices({
      format: 'json',
      index,
    });
    const row = resp.body[0];
    if (resp.statusCode === 200) {
      if (row) {
        const info: ElasticIndexBrief = {
          docsCount: row['docs.count'],
          docsDeleted: row['docs.deleted'],
          health: row.health,
          index: row.index,
          pri: row.pri,
          priStoreSize: row['pri.store.size'],
          rep: row.rep,
          status: row.status,
          storeSize: row['store.size'],
          uuid: row.uuid,
        };
        return info;
      }
      return null;
    }
    const err: Error = new Error(`HTTP STATUS:${resp.statusCode}
    HTTP BODY:${resp.body}`);
    throw err;
  };

  // 查询索引的信息,包括映射
  getIndexInfo = async (): Promise<any> => {
    const { client, index } = this;
    const resp = await client.indices.get({ index });
    if (resp && resp.statusCode === 200) {
      if (resp.body[index]) {
        return resp.body[index];
      }
      return null;
    }
    throw new Error(
      `http code: ${resp.statusCode}, err: ${JSON.stringify(resp.body)}`
    );
  };

  // 查询索引的状态，占用空间，文档数量 等
  getIndexState = async (): Promise<any> => {
    const { client, index } = this;
    const stateResp = await client.indices.stats({
      index,
    });
    return stateResp.body;
  };

  // 查询ES实例的详细
  getClusterInfo = async (): Promise<any> => {
    const { client, index } = this;
    const infoResp = await client.cluster.state({
      index,
      metric: 'metadata',
    });
    return infoResp.body;
  };

  updateRecord = async (id: string, type: string, modifiedRcd: any) => {
    const { client, index } = this;
    const resp = await client.update({
      id,
      index,
      type,
      body: {
        doc: modifiedRcd,
      },
    });

    if (resp && resp.statusCode === 200 && resp.body.result === 'updated') {
      return;
    }

    throw new Error(
      `http code: ${resp.statusCode}, err: ${JSON.stringify(resp.body)}`
    );
  };

  deleteRecord = async (id: string, type: string) => {
    const { client, index } = this;
    const resp = await client.delete({
      id,
      index,
      type,
    });
    if (resp && resp.statusCode === 200 && resp.body.result === 'deleted') {
      return;
    }
    throw new Error(
      `http code: ${resp.statusCode}, err: ${JSON.stringify(resp.body)}`
    );
  };

  requestData = async (
    type: string,
    current: number,
    pageSize: number,
    query: any
  ): Promise<ElasticResult<any>> => {
    const { client, index } = this;
    const param: Search = {
      index,
      body: {
        query,
      },
      from: (current - 1) * pageSize,
      size: pageSize,
      type,
    };
    const resp = await client.search(param);
    const totalAmount = resp.body.hits.total;
    const data: any[] = resp.body.hits.hits.map((row: any) => {
      // eslint-disable-next-line no-underscore-dangle
      const r = row._source;
      // eslint-disable-next-line no-underscore-dangle
      r.key = row._id;
      return r;
    });

    return {
      current,
      pageSize: data.length,
      total: totalAmount,
      data,
    };
  };

  // todo - 补齐这2个空白方法
  deleteAllRecord = async (type: string, query: any) => {
    const { client, index } = this;
    const resp = await client.deleteByQuery({
      index,
      type,
      body: {
        query,
      },
    });
    console.log(resp);
    if (resp && resp.statusCode === 200) {
      return;
    }
    throw new Error(
      `http code: ${resp.statusCode}, err: ${JSON.stringify(resp.body)}`
    );
  };

  deleteBulk = async (type: string, ids: string[]) => {
    if (ids.length <= 0) {
      return;
    }
    const { client, index } = this;
    const resp = await client.bulk({
      index,
      type,
      body: ids.map((id) => {
        return {
          delete: {
            _id: id,
          },
        };
      }),
    });

    if (resp && resp.statusCode === 200 && !resp.body.errors) {
      return;
    }
    const errors = resp.body.items.filter((item: any) => {
      return !(item.found && item.result === 'deleted');
    });
    if (errors.length > 0) {
      throw new Error(JSON.stringify(errors, null, 2));
    }
    throw new Error(
      `http code: ${resp.statusCode}, err: ${JSON.stringify(resp.body)}`
    );
  };

  updateAllRecord = async (type: string, query: any, partial: any) => {
    const { client, index } = this;
    const resp = await client.updateByQuery({
      index,
      type,
      body: {
        query,
        doc: partial,
      },
    });
    console.log(resp);
    if (resp && resp.statusCode === 200 && resp.body.result === 'updated') {
      return;
    }

    throw new Error(
      `http code: ${resp.statusCode}, err: ${JSON.stringify(resp.body)}`
    );
  };

  updateBulk = async (type: string, ids: string[], partial: any) => {
    if (ids.length <= 0) {
      return;
    }
    const { client, index } = this;
    const resp = await client.bulk({
      index,
      type,
      body: ids.map((id) => {
        return {
          update: {
            _id: id,
            body: {
              doc: partial,
            },
          },
        };
      }),
    });

    if (resp && resp.statusCode === 200 && !resp.body.errors) {
      return;
    }
    const errors = resp.body.items.filter((item: any) => {
      return !(item.found && item.result === 'updated');
    });
    if (errors.length > 0) {
      throw new Error(JSON.stringify(errors, null, 2));
    }
    throw new Error(
      `http code: ${resp.statusCode}, err: ${JSON.stringify(resp.body)}`
    );
  };
}
