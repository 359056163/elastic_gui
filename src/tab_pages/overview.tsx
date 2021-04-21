/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import { resolve } from 'url';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Modal,
  Button,
} from 'antd';
import { curl } from 'urllib';
import { ColumnsType } from 'antd/es/table';
import { ElasticConn } from '../interfaces';

export interface IOverviewProp {
  config: ElasticConn;
}

interface ElasticIndex {
  key: string;
  name: string;
  aliases: string[];
  docs: number;
  size: number;
  mapping: string;
}

interface ElasticID {
  name: string;
  cluster_name: string;
  cluster_uuid: string;
  version: string;
}

interface IOverviewState {
  instanceID?: ElasticID | null;
  indices?: ElasticIndex[];
  totalDocs: number;
  totalSize: number;
}

function parseIndices(statsIndices: any, clusterIndices: any): ElasticIndex[] {
  const indicesData: ElasticIndex[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const name of Object.keys(statsIndices)) {
    const indexInfo: any = statsIndices[name];
    const {
      total: {
        docs: { count },
        store: { size_in_bytes: storeSize },
      },
    } = indexInfo;
    indicesData.push({
      key: name,
      name,
      docs: count,
      size: storeSize,
      aliases: clusterIndices[name].aliases || [],
      mapping: JSON.stringify(clusterIndices[name].mappings, null, 2),
    });
  }
  return indicesData;
}

export default class Overview extends React.Component<
  IOverviewProp,
  IOverviewState
> {
  columns: ColumnsType<ElasticIndex> = [
    {
      title: '索引名称',
      key: 'name',
      dataIndex: 'name',
      render: (name: string, rcd: ElasticIndex) => {
        return (
          <>
            {name}
            {rcd.aliases.map((a) => (
              <Tag key={a}>{a}</Tag>
            ))}
          </>
        );
      },
      defaultSortOrder: 'ascend',
      sorter: (p: ElasticIndex, c: ElasticIndex) => {
        return c.name.localeCompare(p.name);
      },
    },
    {
      title: '文档数量',
      key: 'docs',
      dataIndex: 'docs',
    },
    {
      title: '索引大小',
      key: 'size',
      dataIndex: 'size',
    },
    {
      title: '索引映射',
      key: 'mapping',
      dataIndex: 'mapping',
      render: (mapping: string, rcd: ElasticIndex) => {
        return (
          <Space size="middle">
            <Button
              type="link"
              onClick={() => {
                this.openMapping(mapping, rcd.name);
              }}
            >
              查看映射
            </Button>
          </Space>
        );
      },
    },
  ];

  constructor(props: IOverviewProp) {
    super(props);
    this.state = {
      instanceID: {
        name: '',
        cluster_name: '',
        cluster_uuid: '',
        version: '',
      },
      indices: [],
      totalSize: 0,
      totalDocs: 0,
    };
  }

  async componentDidMount() {
    const { config } = this.props;
    const { host } = config;
    const [id, stats, cluster] = await Promise.all([
      curl(host, { method: 'GET', dataType: 'json' }),
      curl(resolve(host, '/_stats'), { method: 'GET', dataType: 'json' }),
      curl(resolve(host, '/_cluster/state'), {
        method: 'GET',
        dataType: 'json',
      }),
    ]);
    const idData: any = id.data;
    const statsData: any = stats.data;
    const clusterData: any = cluster.data;
    const idInfo: ElasticID = {
      name: idData.name,
      cluster_uuid: idData.cluster_uuid,
      cluster_name: idData.cluster_name,
      version: JSON.stringify(idData.version, null, 2),
    };

    const {
      total: {
        docs: { count },
        store: { size_in_bytes: storeSize },
      },
      // eslint-disable-next-line no-underscore-dangle
    } = statsData._all;
    const indicesData: ElasticIndex[] = parseIndices(
      statsData.indices,
      clusterData.metadata.indices
    );
    this.setState({
      instanceID: idInfo,
      totalDocs: count,
      totalSize: storeSize,
      indices: indicesData,
    });
  }

  openMapping = (mapping: string, name: string) => {
    Modal.info({
      title: name,
      content: <pre>{mapping}</pre>,
      mask: true,
      closable: true,
      width: 832,
    });
  };

  titleFun = () => {
    return '索引详细';
  };

  render = () => {
    const { instanceID, totalDocs, totalSize, indices } = this.state;
    return (
      <>
        <Row gutter={16}>
          <Table
            style={{ width: '100%' }}
            title={this.titleFun}
            columns={this.columns}
            dataSource={indices}
          />
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Card title="Elastic 实例信息">
              <p>
                <b>cluster_name：</b>
                {instanceID?.cluster_name}
              </p>
              <p>
                <b>cluster_uuid：</b>
                {instanceID?.cluster_uuid}
              </p>
              <p>
                <b>name：</b>
                {instanceID?.name}
              </p>
              <pre>
                <b>version:</b>
                {instanceID?.version}
              </pre>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="总计">
              <Statistic title="总的文档数量" value={totalDocs} />
              <Statistic
                title="总的数据大小"
                value={`${(totalSize / (1024 * 1024 * 1024)).toFixed(4)} GB`}
              />
            </Card>
          </Col>
        </Row>
      </>
    );
  };
}
