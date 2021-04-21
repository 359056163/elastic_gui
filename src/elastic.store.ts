import { makeAutoObservable, observable } from 'mobx';
import { URL } from 'url';
import { message } from 'antd';
import { Client, ClientOptions } from '@elastic/elasticsearch';
import { IMainTabProp, ElasticConn } from './interfaces';

const { ipcRenderer } = window.require('electron');

export interface IAppProp {
  appStore: AppStore;
}

export class AppStore {
  constructor() {
    makeAutoObservable(this, {
      clients: false,
    });
  }

  clients: Client[] = [];

  tabs: IMainTabProp[] = [];

  connections: ElasticConn[] = [];

  activeKey = '';

  getSavedConnections = async () => {
    ipcRenderer.send('read-es-config', 'ok');
    return new Promise((resolve) => {
      ipcRenderer.on('es-config-text', (_: any, txt: string) => {
        console.log('accept config text:', txt);
        this.parseConnections(txt, resolve);
      });
    });
  };

  parseConnections = (text: string, cb: (v: any) => void) => {
    if (text.length > 0) {
      try {
        this.connections = JSON.parse(text);
        console.log('parsed config text:', this.connections);
        cb(null);
      } catch (err) {
        message.error(err.message);
      }
    }
  };

  addConnection = (connection: ElasticConn) => {
    this.connections.push(connection);
  };

  addTab = (
    conn: ElasticConn,
    client: Client,
    operation: string,
    index: string
  ) => {
    const key = `Tab:${index}:${operation}`;
    if (
      this.tabs.find((t) => {
        return t.key === key;
      })
    ) {
      this.activeKey = key;
      return;
    }
    const prop: IMainTabProp = {
      key,
      connection: conn,
      client,
      operation,
      index,
    };
    this.tabs.push(prop);
    this.activeKey = prop.key;
  };

  removeTab = (key: string) => {
    const idx = this.tabs.findIndex((t) => {
      return t.key === key;
    });
    if (idx >= 0) {
      this.tabs.splice(idx, 1);
    }
  };
}
