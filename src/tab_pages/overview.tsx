/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Modal } from 'antd';
import { Client } from '@elastic/elasticsearch';
import { AlertOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { observer } from 'mobx-react';

import { ElasticConn, ElasticIndexBrief, Health } from '../interfaces';
import OverviewStore from './overviewStore';

export interface IOverviewProp {
  config: ElasticConn;
  client: Client;
  store: OverviewStore;
}

interface IOverviewState {
  totalDocs: number;
  totalSize: number;
}

@observer
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

  // store: OverviewStore;

  // constructor(props: IOverviewProp) {
  //   super(props);

  //   this.store = props.store;
  // }

  /**
   * 组件挂载后
   */
  async componentDidMount() {
    const { store } = this.props;
    await store.getAllIndexBrief();
    await store.getInstanceInfo();
    await store.getInstanceStatus();
    this.setState({});
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
    const { store } = this.props;
    return (
      <>
        <Row gutter={16}>
          <Table
            style={{ width: '100%' }}
            title={this.titleFun}
            columns={this.columns}
            dataSource={store.indices}
            pagination={{ pageSize: 25 }}
          />
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Card title="Elastic 实例信息">
              <pre style={{ fontWeight: 'bold' }}>
                {store.info ? JSON.stringify(store.info, null, 2) : 'null'}
              </pre>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="实例状态">
              <Statistic
                title="总的文档数量(删除的文档数)"
                value={`${store.totalDocs}(${store.deletedDocs})`}
              />
              <Statistic
                title="总的数据大小"
                value={`${(store.totalSize / (1024 * 1024 * 1024)).toFixed(
                  2
                )} GB`}
              />
              <Statistic title="segment数量" value={store.segmentCount} />
            </Card>
          </Col>
        </Row>
      </>
    );
  };
}
