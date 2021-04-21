import React from 'react';
import { render } from 'react-dom';
import App from './App';
import { AppStore } from './elastic.store';

(async function () {
  const appStore = new AppStore();
  await appStore.getSavedConnections();
  render(<App appStore={appStore} />, document.getElementById('root'));
})();
