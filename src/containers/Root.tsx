import {Provider} from 'react-redux';
import {Router} from 'wouter';

import {store} from '../store';
import Routes from '../Routes';

const routerBase =
  import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '');

export default () => (
  <Provider store={store}>
    <Router base={routerBase}>
      <Routes />
    </Router>
  </Provider>
);
