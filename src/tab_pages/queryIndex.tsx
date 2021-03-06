/* eslint-disable react/prefer-stateless-function */
import React, { ReactNode } from 'react';
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
  Menu,
  Dropdown,
  Collapse,
  Space,
  Alert,
} from 'antd';
import { Client } from '@elastic/elasticsearch';
import { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  SettingOutlined,
  RadarChartOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  FormOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { observer } from 'mobx-react';
import { ElasticIndexBrief } from '../interfaces';
import QueryIndexStore from './queryIndexStore';
import { IndexBrief } from './indexBrief';
import { Updator } from './updator';

const { Option } = Select;
const { Panel } = Collapse;
export interface IQueryIndexProps {
  client: Client;
  index: string;
}

interface IQueryIndexState {
  types: string[];
  data: any[];
  columnsMap: Map<string, ColumnsType<any>>; // antd.table 不同type的表头字段集合
  paginationParam: TablePaginationConfig;
  dataLoading: boolean;
  searchParam: {
    selectedType?: string;
    query: string;
  };
  indexBrief: ElasticIndexBrief | null;
  selectedRcd?: any;
  selectedRcdText?: string;
  selectedRcdKeys: string[];
  updatorModalVisible: boolean;
}

@observer
export default class QueryIndex extends React.Component<
  IQueryIndexProps,
  IQueryIndexState
> {
  formRef = React.createRef<FormInstance>();

  store: QueryIndexStore;

  constructor(props: IQueryIndexProps) {
    super(props);
    const { client, index } = props;
    this.store = new QueryIndexStore(client, index);
    this.state = {
      updatorModalVisible: false,
      selectedRcdKeys: [],
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
    const indexInfo = await this.store.getIndexInfo();
    const brief = await this.store.getIndexBrief();
    const { mappings } = indexInfo;
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
    this.formRef.current?.resetFields(); // 重制表单是因为表单绑定数据改变了。
    await this.requestData();
  };

  // 切换dataloading 的状态
  private toggleLoading = (flag?: boolean) => {
    const { dataLoading } = this.state;
    this.setState({
      dataLoading: flag === undefined ? !dataLoading : flag,
    });
  };

  private requestData = async () => {
    this.toggleLoading(true);
    const { paginationParam, searchParam } = this.state;
    const { selectedType, query } = searchParam;
    let { current, pageSize } = paginationParam;
    if (current === undefined) {
      current = 1;
    }
    if (pageSize === undefined) {
      pageSize = 100;
    }
    if (!selectedType) {
      message.warning('没有选择要查询的类型！');
      return;
    }

    let queryContext: any;
    try {
      queryContext = JSON.parse(query);
    } catch (e) {
      console.error('错误的json 格式：', query);
      message.error(e.message);
    }

    try {
      const dataResult = await this.store.requestData(
        selectedType,
        current,
        pageSize,
        queryContext
      );

      this.setState({
        dataLoading: false,
        data: dataResult.data,
        paginationParam: {
          total: dataResult.total,
        },
      });
    } catch (e) {
      console.error(e);
      message.error(e.message);
    }
  };

  onRowClick = (rcd: any) => {
    this.setState({
      selectedRcd: rcd,
      selectedRcdText: JSON.stringify(rcd, null, 2),
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

  extraContext = (): ReactNode => {
    const { index } = this.props;
    return (
      <Space size="small">
        <RadarChartOutlined
          title="索引状态"
          onClick={async (evt: React.MouseEvent) => {
            evt.stopPropagation();
            const state = await this.store.getIndexState();
            Modal.info({
              title: `索引：${index} 的状态`,
              content: <pre>{JSON.stringify(state, null, 2)}</pre>,
              width: '500',
              closable: true,
            });
          }}
        />
        <SettingOutlined
          title="索引信息"
          onClick={async (evt: React.MouseEvent) => {
            evt.stopPropagation();
            const inf = await this.store.getIndexInfo();
            Modal.info({
              title: `索引：${index} 的信息`,
              content: <pre>{JSON.stringify(inf, null, 2)}</pre>,
              width: '500',
              closable: true,
            });
          }}
        />
      </Space>
    );
  };

  // 取消选中的记录，modal隐藏
  unselectedRecord = () => {
    this.setState({
      selectedRcd: undefined,
      selectedRcdText: undefined,
    });
  };

  // 删除单条记录
  deleteSelectedRcd = async () => {
    const {
      selectedRcd,
      searchParam: { selectedType },
    } = this.state;
    if (!selectedType) {
      message.warning('没有选择要查询的类型！');
      return;
    }
    if (selectedRcd && selectedRcd.key && selectedType) {
      this.toggleLoading();
      const { key } = selectedRcd;
      try {
        await this.store.deleteRecord(key, selectedType);
        this.unselectedRecord();
        await this.requestData();
      } catch (e) {
        message.error(e.message);
      } finally {
        this.toggleLoading(false);
      }
    }
  };

  // 修改单条记录
  modifyRcd = async () => {
    const {
      selectedRcd,
      selectedRcdText,
      searchParam: { selectedType },
    } = this.state;
    if (selectedRcd && selectedRcd.key && selectedType && selectedRcdText) {
      this.toggleLoading(true);
      const { key } = selectedRcd;
      let modifiedRcd = null;
      try {
        modifiedRcd = JSON.parse(selectedRcdText);
      } catch (e) {
        message.error('不是正确的json格式');
        return;
      }
      try {
        await this.store.updateRecord(key, selectedType, modifiedRcd);

        this.setState({
          selectedRcd: undefined,
          selectedRcdText: undefined,
        });

        await this.requestData();
      } catch (e) {
        message.error(e.message);
      } finally {
        this.toggleLoading(false);
      }
    }
  };

  modalFooter = (): ReactNode => {
    const { dataLoading } = this.state;
    return (
      <Space size="middle">
        <Button
          danger
          type="default"
          onClick={this.deleteSelectedRcd}
          loading={dataLoading}
        >
          <DeleteOutlined />
          删除
        </Button>
        <Button type="primary" loading={dataLoading} onClick={this.modifyRcd}>
          <FormOutlined />
          提交修改
        </Button>
        <Button
          type="default"
          onClick={this.unselectedRecord}
          loading={dataLoading}
        >
          <CloseCircleOutlined />
          关闭
        </Button>
      </Space>
    );
  };

  deleteAll = async () => {
    const { selectedRcdKeys, searchParam } = this.state;
    const { selectedType, query } = searchParam;
    if (!selectedType) {
      message.warning('没有选择要查询的类型！');
      return;
    }
    this.toggleLoading(true);
    if (selectedRcdKeys && selectedRcdKeys.length > 0) {
      await this.store.deleteBulk(selectedType, selectedRcdKeys);
    } else {
      let queryContext: any;
      try {
        queryContext = JSON.parse(query);
      } catch (e) {
        console.error('错误的json 格式：', query);
        message.error(e.message);
      }
      await this.store.deleteAllRecord(selectedType, queryContext);
    }

    await this.requestData();
  };

  updateAll = async (update: any) => {
    const { selectedRcdKeys, searchParam } = this.state;
    const { selectedType, query } = searchParam;
    if (!selectedType) {
      message.warning('没有选择要查询的类型！');
      return;
    }
    this.toggleLoading(true);
    if (selectedRcdKeys && selectedRcdKeys.length > 0) {
      await this.store.updateBulk(selectedType, selectedRcdKeys, update);
    } else {
      let queryContext: any;
      try {
        queryContext = JSON.parse(query);
      } catch (e) {
        console.error('错误的json 格式：', query);
        message.error(e.message);
      }
      await this.store.updateAllRecord(selectedType, queryContext, update);
    }

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
      selectedRcd,
      selectedRcdText,
      selectedRcdKeys,
      updatorModalVisible,
    } = this.state;
    const { selectedType } = searchParam;
    const columns = selectedType ? columnsMap.get(selectedType) : [];
    const { index } = this.props;
    let modalVisibal = false;
    if (selectedRcdText) {
      modalVisibal = true;
    }
    const fields: string[] = [];
    columns?.forEach((col: any) => {
      fields.push(col.key);
    });
    // todo 查询参数组件化
    return (
      <>
        <Collapse>
          <Panel header={`索引：${index}`} key="1" extra={this.extraContext()}>
            <IndexBrief brief={indexBrief} />
          </Panel>
        </Collapse>
        <Divider />
        <Row>
          <Form layout="inline" initialValues={searchParam} ref={this.formRef}>
            <Form.Item
              label="当前类型"
              name="selectedType"
              style={{ minWidth: '200px' }}
            >
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
              <Dropdown.Button
                type="primary"
                onClick={this.onSearchButtonClick}
                disabled={dataLoading}
                overlay={
                  <Menu>
                    <Menu.Item
                      onClick={() => {
                        this.deleteAll();
                      }}
                    >
                      <DeleteOutlined />
                      全部删除
                    </Menu.Item>
                    <Menu.Item
                      onClick={() => {
                        this.setState({
                          updatorModalVisible: true,
                        });
                      }}
                    >
                      <SaveOutlined />
                      全部更新
                    </Menu.Item>
                  </Menu>
                }
              >
                <SearchOutlined />
                检索
              </Dropdown.Button>
            </Form.Item>
          </Form>
        </Row>
        <Divider />
        {selectedRcdKeys && selectedRcdKeys.length > 0 ? (
          <Alert
            type="warning"
            message="全部删除与全部更新，将针对被选中的记录"
          />
        ) : (
          <></>
        )}
        <Row style={{ overflow: 'scroll', backgroundColor: '#ffffff' }}>
          <Table
            rowSelection={{
              onChange: (keys: React.Key[]) => {
                this.setState({
                  selectedRcdKeys: keys.map((k) => {
                    return k.toString();
                  }),
                });
              },
              selectedRowKeys: selectedRcdKeys,
            }}
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
        <Modal
          visible={modalVisibal}
          title={`数据详细:${selectedRcd && selectedRcd.key}`}
          footer={this.modalFooter()}
          width={700}
          closable
          onCancel={this.unselectedRecord}
        >
          <textarea
            style={{ width: '100%' }}
            rows={30}
            value={selectedRcdText}
            onChange={(evt: React.ChangeEvent<HTMLTextAreaElement>) => {
              this.setState({
                selectedRcdText: evt.target.value,
              });
            }}
          />
        </Modal>
        <Updator
          visible={updatorModalVisible}
          fields={fields}
          onOk={(updator: any) => {
            console.log(updator);
            this.setState({
              updatorModalVisible: false,
            });
            this.updateAll(updator);
          }}
          onCancel={() => {
            this.setState({
              updatorModalVisible: false,
            });
          }}
        />
      </>
    );
  };
}
