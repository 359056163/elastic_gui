/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import { Client, ClientOptions, ApiResponse } from '@elastic/elasticsearch';
import { AlertOutlined } from '@ant-design/icons';
import { URL } from 'url';
import { Menu, Spin } from 'antd';
import { observer } from 'mobx-react';
import { AppStore } from './elastic.store';
import { ElasticConn, ElasticIndexBrief } from './interfaces';

const { Item, SubMenu } = Menu;
// import { Client } from '@elastic/elasticsearch';

export interface IMainMenuProp {
  store: AppStore;
}
interface SubMenuItemInfo {
  connection: ElasticConn;
  client: Client;
  indices: ElasticIndexBrief[];
}

export interface IMainMenuState {
  activeKey?: string;
  loading: boolean;
  items: SubMenuItemInfo[];
}

@observer
export class MainMenu extends React.Component<IMainMenuProp, IMainMenuState> {
  constructor(props: IMainMenuProp) {
    super(props);
    const { store } = props;
    const { connections } = store;
    const items: SubMenuItemInfo[] = connections.map((c) => {
      const esUrl: URL = new URL(c.host);
      if (c.username && c.password) {
        esUrl.username = c.username;
        esUrl.password = c.password;
      }
      const option: ClientOptions = {
        name: c.alias,
        node: {
          url: esUrl,
        },
      };
      const client = new Client(option);
      store.clients.push(client);

      return {
        connection: c,
        client,
        indices: [],
      };
    });
    this.state = {
      loading: false,
      items,
    };
  }

  onSubClick = async (info: SubMenuItemInfo, itemIndex: number) => {
    const { client } = info;
    this.setState({
      loading: true,
    });
    const resp: ApiResponse = await client.cat.indices({ format: 'json' });
    console.log(resp.body);
    const rawData: any[] = resp.body;
    const indices: ElasticIndexBrief[] = rawData
      .map((row: any) => {
        return {
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
      })
      .sort((p, c) => {
        return c.docsCount - p.docsCount;
      });

    const { items } = this.state;
    items[itemIndex].indices = indices;
    this.setState({
      loading: false,
      items,
    });
  };

  onIndexSelected = (item: SubMenuItemInfo, index: string) => {
    // console.log(client, index);
    const { store } = this.props;
    const { client, connection } = item;
    store.addTab(connection, client, 'query', index);
  };

  render = () => {
    // const { store } = this.props;
    const { loading, items } = this.state;
    return (
      <Spin spinning={loading}>
        <Menu mode="inline" theme="dark">
          {items.map((e: SubMenuItemInfo, index: number) => {
            const { alias, host } = e.connection;
            return (
              <SubMenu
                key={alias + host}
                title={alias}
                onTitleClick={async () => {
                  await this.onSubClick(e, index);
                }}
              >
                <Item key={`Item:${alias + host}:overview`}>节点概要</Item>
                {e.indices.map((idx) => {
                  return (
                    <Item
                      key={idx.index}
                      title={idx.index}
                      onClick={() => {
                        this.onIndexSelected(e, idx.index);
                      }}
                    >
                      {idx.index}
                    </Item>
                  );
                })}
              </SubMenu>
            );
          })}
        </Menu>
      </Spin>
    );
  };
}
