/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import { FormInstance } from 'antd/lib/form';
import {
  Form,
  Table,
  Row,
  Input,
  Select,
  Modal,
  Tag,
  TablePaginationConfig,
  Divider,
  message,
  Button,
  Collapse,
  Descriptions,
} from 'antd';
import { ApiResponse, Client } from '@elastic/elasticsearch';
import { ColumnsType } from 'antd/es/table';
import { Search } from '@elastic/elasticsearch/api/requestParams';
import { observer } from 'mobx-react';
import { SearchOutlined, AlertOutlined } from '@ant-design/icons';
import { ElasticIndexBrief, Health } from '../interfaces';

const { Option } = Select;
const { Panel } = Collapse;
export interface IQueryIndexProps {
  client: Client;
  index: string;
}
// interface SearchParam {
//   type: string;
//   query: {
//     must: any[];
//     must_not: any[];
//     should: any[];
//   };
// }

interface IQueryIndexState {
  types: string[];
  data: any[];
  columnsMap: Map<string, ColumnsType<any>>;
  paginationParam: TablePaginationConfig;
  dataLoading: boolean;
  searchParam: {
    selectedType?: string;
    query: string;
  };
  indexBrief: ElasticIndexBrief | null;
}

function getBrief(
  client: Client,
  index: string
): Promise<ElasticIndexBrief | null> {
  return client.cat
    .indices({
      format: 'json',
      index,
    })
    .then((resp: ApiResponse) => {
      const row = resp.body[0];
      if (resp.statusCode === 200) {
        if (row) {
          const info: ElasticIndexBrief = {
            docsCount: row['docs.count'],
            docsDeleted: row['docs.delete'],
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
    });
}

@observer
export default class QueryIndex extends React.Component<
  IQueryIndexProps,
  IQueryIndexState
> {
  formRef = React.createRef<FormInstance>();

  constructor(props: IQueryIndexProps) {
    super(props);
    this.state = {
      types: [],
      data: [],
      columnsMap: new Map(),
      paginationParam: {
        defaultCurrent: 1,
        current: 1,
        total: 10,
        pageSize: 100,
        defaultPageSize: 100,
        pageSizeOptions: ['100', '150', '200', '500'],
        responsive: true,
        showQuickJumper: true,
      },
      dataLoading: false,
      searchParam: {
        query: `{
          "bool": {
            "must": [
              {
                "match_all": {}
              }
            ]
          }
        }`,
      },
      indexBrief: null,
    };
  }

  componentDidMount = async () => {
    const { client, index } = this.props;
    const resp = await client.indices.get({ index });
    const brief = await getBrief(client, index);
    const { mappings } = resp.body[index];
    const types: string[] = [];
    const { columnsMap } = this.state;
    Object.keys(mappings).forEach((type: string) => {
      types.push(type);
      const mapping = mappings[type].properties;
      const columnsDefine: ColumnsType = Object.keys(mapping).map(
        (fieldName: string) => {
          return {
            key: fieldName,
            title: fieldName,
            dataIndex: fieldName,
            render: (txt: string | number) => {
              if (txt === undefined) {
                return <Tag color="default">none</Tag>;
              }
              if (txt === null) {
                return <Tag color="default">null</Tag>;
              }
              if (txt === '') {
                return <Tag color="default">空字符串</Tag>;
              }
              const str = txt.toString();
              if (str.length > 50) {
                return <>{`${str.substr(0, 50)}...`}</>;
              }
              return <>{str}</>;
            },
          };
        }
      );
      columnsMap.set(type, columnsDefine);
    });

    this.setState({
      searchParam: {
        selectedType: types[0],
        query: `{
          "bool": {
            "must": [
              {
                "match_all": {}
              }
            ]
          }
        }`,
      },
      types,
      columnsMap,
      indexBrief: brief,
    });
    this.formRef.current?.resetFields();
    await this.requestData();
  };

  private requestData = async () => {
    this.setState({
      dataLoading: true,
    });
    const { paginationParam, searchParam } = this.state;
    const { selectedType, query } = searchParam;
    let { current, pageSize } = paginationParam;
    if (current === undefined) {
      current = 1;
    }
    if (pageSize === undefined) {
      pageSize = 100;
    }
    let queryContext: any;
    try {
      queryContext = JSON.parse(query);
    } catch (e) {
      console.log('错误的json 格式：', query);
      message.error(e.message);
    }
    const { client, index } = this.props;
    const param: Search = {
      index,
      body: {
        query: queryContext,
      },
      from: (current - 1) * pageSize,
      size: pageSize,
      type: selectedType,
    };
    try {
      const dataResp = await client.search(param);
      const totalAmount = dataResp.body.hits.total;
      const data = dataResp.body.hits.hits.map((row: any) => {
        // eslint-disable-next-line no-underscore-dangle
        const r = row._source;
        // eslint-disable-next-line no-underscore-dangle
        r.key = row._id;
        return r;
      });

      this.setState({
        dataLoading: false,
        data,
        paginationParam: {
          total: totalAmount,
        },
      });
    } catch (e) {
      console.error(e);
      message.error(e.message);
    }
  };

  onRowClick = (rcd: any) => {
    const txt = JSON.stringify(rcd, null, 2);
    Modal.info({
      title: `数据详细:${rcd.key}`,
      content: <pre>{txt}</pre>,
      width: 780,
    });
  };

  onPageChange = async (page: number, pageSize: number) => {
    this.setState({
      paginationParam: {
        current: page,
        pageSize,
      },
    });
    await this.requestData();
  };

  onPageSizeChange = async (pageSize: number) => {
    this.setState({
      paginationParam: {
        pageSize,
      },
    });
    await this.requestData();
  };

  onSearchButtonClick = async () => {
    const values = await this.formRef.current?.validateFields();
    const { selectedType, query } = values;
    this.setState({
      searchParam: {
        selectedType,
        query,
      },
    });
    await this.requestData();
  };

  render = () => {
    const {
      data,
      columnsMap,
      types,
      paginationParam,
      dataLoading,
      searchParam,
      indexBrief,
    } = this.state;
    const { selectedType } = searchParam;
    const columns = selectedType ? columnsMap.get(selectedType) : [];
    const { index } = this.props;
    let healthColor: string;
    // console.log('healthColor:',healthColor);
    switch (indexBrief?.health) {
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
      <>
        <Collapse>
          <Panel header={`索引：${index}`} key="1">
            <Descriptions size="small">
              <Descriptions.Item label="Total Docs">
                {indexBrief?.docsCount}
                {indexBrief?.docsDeleted ? `(${indexBrief?.docsDeleted})` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Index Health">
                <Tag color={healthColor}>
                  <AlertOutlined />
                  {indexBrief?.health}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total Size">
                {indexBrief?.storeSize}
              </Descriptions.Item>
            </Descriptions>
          </Panel>
        </Collapse>
        <Divider />
        <Row>
          <Form layout="inline" initialValues={searchParam} ref={this.formRef}>
            <Form.Item label="当前类型" name="selectedType">
              <Select value={types[0] || selectedType}>
                {types.map((t) => {
                  return (
                    <Option key={t} value={t}>
                      {t}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Form.Item label="query" name="query" style={{ width: '600px' }}>
              <Input.TextArea autoSize />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                onClick={this.onSearchButtonClick}
                loading={dataLoading}
              >
                <SearchOutlined />
                检索
              </Button>
            </Form.Item>
          </Form>
        </Row>
        <Divider />
        <Row style={{ overflow: 'scroll', backgroundColor: '#ffffff' }}>
          <Table
            loading={dataLoading}
            bordered
            dataSource={data}
            columns={columns}
            pagination={paginationParam}
            onRow={(record) => {
              return {
                onClick: () => {
                  this.onRowClick(record);
                },
                onDoubleClick: () => {},
                onContextMenu: () => {},
                onMouseEnter: () => {},
                onMouseLeave: () => {},
              };
            }}
          />
        </Row>
      </>
    );
  };
}
