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
import { Client } from '@elastic/elasticsearch';
import { AlertOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { ElasticConn, ElasticIndexBrief, Health } from '../interfaces';
import OverviewStore from './overviewStore';

export interface IOverviewProp {
  config: ElasticConn;
  client: Client;
}

interface IOverviewState {
  totalDocs: number;
  totalSize: number;
}

export default class Overview extends React.Component<
  IOverviewProp,
  IOverviewState
> {
  columns: ColumnsType<ElasticIndexBrief> = [
    {
      title: '索引名称与别称',
      key: 'index',
      dataIndex: 'index',
      render: (index: string, rcd: ElasticIndexBrief) => {
        return (
          <>
            {index}
            {rcd.aliases &&
              rcd.aliases.map((a) => (
                <Tag color="processing" key={a}>
                  {a}
                </Tag>
              ))}
          </>
        );
      },
      defaultSortOrder: 'ascend',
      sorter: (p: ElasticIndexBrief, c: ElasticIndexBrief) => {
        return c.index.localeCompare(p.index);
      },
    },
    {
      title: '索引健康度',
      key: 'health',
      dataIndex: 'health',
      render: (h: string, rcd: ElasticIndexBrief) => {
        let healthColor: string;
        switch (h) {
          case 'yellow':
            healthColor = Health.yellow;
            break;
          case 'green':
            healthColor = Health.green;
            break;
          case 'red':
            healthColor = Health.red;
            break;
          default:
            healthColor = Health.yellow;
            break;
        }
        return (
          <Tag color={healthColor}>
            <AlertOutlined />
            {h}
          </Tag>
        );
      },
    },
    {
      title: '文档数量',
      key: 'docsCount',
      dataIndex: 'docsCount',
      render: (cnt: string, rcd: ElasticIndexBrief) => {
        return (
          <>
            {cnt} ({rcd.docsDeleted} deleted)
          </>
        );
      },
    },
    {
      title: '索引大小',
      key: 'storeSize',
      dataIndex: 'storeSize',
    },
  ];

  store: OverviewStore;

  constructor(props: IOverviewProp) {
    super(props);
    this.state = {
      totalSize: 0,
      totalDocs: 0,
    };

    this.store = new OverviewStore(props.client);
  }

  /**
   * 组件挂载后
   */
  async componentDidMount() {
    const { config } = this.props;
    const { host } = config;
    await this.store.getAllIndexBrief();
    await this.store.getInstanceInfo();
    const [stats] = await Promise.all([
      curl(resolve(host, '/_stats'), { method: 'GET', dataType: 'json' }),
    ]);
    const statsData: any = stats.data;

    const {
      total: {
        docs: { count },
        store: { size_in_bytes: storeSize },
      },
      // eslint-disable-next-line no-underscore-dangle
    } = statsData._all;
    this.setState({
      totalDocs: count,
      totalSize: storeSize,
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
    const { totalDocs, totalSize } = this.state;
    return (
      <>
        <Row gutter={16}>
          <Table
            style={{ width: '100%' }}
            title={this.titleFun}
            columns={this.columns}
            dataSource={this.store.indices}
            pagination={{ pageSize: 25 }}
          />
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Card title="Elastic 实例信息">
              <pre style={{ fontWeight: 'bold' }}>
                {JSON.stringify(this.store.info, null, 2)}
              </pre>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="总计">
              <Statistic title="总的文档数量" value={totalDocs} />
              <Statistic
                title="总的数据大小"
                value={`${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`}
              />
            </Card>
          </Col>
        </Row>
      </>
    );
  };
}
