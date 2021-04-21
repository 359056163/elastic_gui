/* eslint-disable react/state-in-constructor */
import './App.global.css';
import url from 'url';
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { PlusCircleOutlined } from '@ant-design/icons';

import {
  Layout,
  Button,
  Modal,
  Form,
  Input,
  Menu,
  FormInstance,
  Tabs,
} from 'antd';
import { MenuInfo } from 'rc-menu/lib/interface';
import { ElasticConn, IMainTabProp } from './interfaces';
import { IAppProp, AppStore } from './elastic.store';
import MainTabs from './mainTabs';
import { MainMenu } from './mainMenu';
// import MainTabs from './mainTabs';

const { Sider, Content } = Layout;
const { ipcRenderer } = window.require('electron');

interface IAppState {
  isModalVisible: boolean;
}

@observer
export default class App extends Component<IAppProp, IAppState> {
  formRef = React.createRef<FormInstance>();

  constructor(props: IAppProp) {
    super(props);
    this.state = {
      isModalVisible: false,
    };
    // const { appStore } = props;
    // appStore.getSavedConnections();
  }

  // componentDidMount = () => {
  //   const { appStore } = this.props;
  //   appStore.getSavedConnections();
  //   console.log('componentDidMount');
  // };

  showModal = () => {
    this.setState({ isModalVisible: true });
  };

  handleOk = async (evt: React.MouseEvent<HTMLElement, MouseEvent>) => {
    this.setState({ isModalVisible: false });
    this.formRef.current?.submit();
  };

  handleFormFinish = (values: any) => {
    const { appStore } = this.props;
    appStore.addConnection(values);
    const { connections } = appStore;
    ipcRenderer.send('write-es-config', JSON.stringify(connections, null, 2));
  };

  handleCancel = () => {
    this.setState({ isModalVisible: false });
    this.formRef.current?.resetFields();
  };

  urlValidator = (rule: any, value: string) => {
    try {
      // eslint-disable-next-line no-new
      new url.URL(value);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(new Error('not valid uri'));
    }
  };

  render = () => {
    const { isModalVisible } = this.state;
    const { appStore } = this.props;
    const { connections: conns, tabs } = appStore;
    return (
      <>
        <Layout style={{ minHeight: '100%' }}>
          <Sider theme="dark" style={{ minWidth: '400px' }}>
            <MainMenu store={appStore} />
            <Button type="primary" shape="round" onClick={this.showModal}>
              <PlusCircleOutlined />
            </Button>
          </Sider>
          <Layout>
            <Content>
              <MainTabs tabs={tabs} store={appStore} />
            </Content>
          </Layout>
        </Layout>
        <Modal
          title="添加elastic配置"
          visible={isModalVisible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          mask
        >
          <Form
            name="addConnection"
            onFinish={this.handleFormFinish}
            onFinishFailed={this.handleFormFinish}
            ref={this.formRef}
          >
            <Form.Item
              label="别名"
              name="alies"
              rules={[
                {
                  required: true,
                  message: '必填',
                  max: 30,
                  min: 1,
                  whitespace: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="URI"
              name="host"
              rules={[
                {
                  required: true,
                  message: '必填,且必须是有效的url',
                  whitespace: true,
                  validator: this.urlValidator,
                },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="登录名" name="usename">
              <Input />
            </Form.Item>
            <Form.Item label="密   码" name="password">
              <Input.Password />
            </Form.Item>
          </Form>
        </Modal>
      </>
    );
  };
}
