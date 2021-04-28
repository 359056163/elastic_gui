/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import { observer } from 'mobx-react';
import { Tabs } from 'antd';
import { IMainTabProp } from './interfaces';
import Overview from './tab_pages/overview';
import QueryIndex from './tab_pages/queryIndex';
import { AppStore } from './elastic.store';
import OverviewStore from './tab_pages/overviewStore';

const { TabPane } = Tabs;

// interface IMainTabsState {
//   // activeKey: string;
// }

interface IMainTabsProp {
  tabs: IMainTabProp[];
  store: AppStore;
}

@observer
export default class MainTabs extends React.Component<IMainTabsProp, any> {
  // constructor(prop: IMainTabsProp) {
  //   super(prop);
  //   const allkey = prop.store.tabs.map((v) => {
  //     return v.key;
  //   });
  //   this.state = {
  //     activeKey: allkey[0],
  //   };
  // }

  onTabEdit = (
    evt:
      | string
      | React.MouseEvent<Element, MouseEvent>
      | React.KeyboardEvent<Element>,
    action: string
  ) => {
    const { store } = this.props;
    if (action === 'remove') {
      store.removeTab(evt.toString());
    }
  };

  render() {
    const { store } = this.props;
    const { tabs, activeKey } = store;
    // const { activeKey } = this.state;
    return (
      <Tabs
        hideAdd
        activeKey={activeKey}
        type="editable-card"
        onEdit={this.onTabEdit}
      >
        {tabs.map((tab: IMainTabProp) => {
          const { connection, operation, key, client, index } = tab;
          const { alias } = connection;

          switch (operation) {
            case 'overview':
              return (
                <TabPane tab={`${alias}概览`} key={key} closable>
                  <Overview
                    config={connection}
                    client={client}
                    store={new OverviewStore(client)}
                  />
                </TabPane>
              );
            case 'query':
              return (
                <TabPane tab={`${alias}:${index}`} key={key} closable>
                  <QueryIndex client={client} index={index} />
                </TabPane>
              );
            default:
              return (
                <TabPane tab={`${alias}概览`} key={key} closable>
                  <QueryIndex client={client} index={index} />
                </TabPane>
              );
          }
        })}
      </Tabs>
    );
  }
}
