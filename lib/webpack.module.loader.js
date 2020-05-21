const serialize = require('./serialize');
const deserialize = (serializedJavascript) => {
  return eval('(' + serializedJavascript + ')');
}

function getComponent() {nextState, cb}

const getAsyncRoutes = (routes, config) => routes.map((route) =>  Object.assign({}, route, {
  childRoutes: transformRoutes(config, route.childRoutes),
  getComponent: `***(nextState, cb) =>  {
    require.ensure([], require => {
      const routeContainer = require('./${route.container}').default;`
      + ((config.store || route.store) ? `
      const routeStore = require('./${route.store || config.store}').default;
      if (routeStore.reducer) {
        injectReducer(store, { [routeStore.SCOPENAME]: routeStore.reducer }, routeStore.forceUpdate);
      }
      if (routeStore.sagas) {
        const sagaMiddleware = require('store/createStore').sagaMiddleware;
        routeStore.sagas.forEach((saga) => {
          if (!saga.hasRun) {
            saga.hasRun = true;
            sagaMiddleware.run(saga);
          }
        });
      }` : '')
      + (config.useReduxForm ? `const fmReducer = require('redux-form').reducer;injectReducer(store, { form: fmReducer });` : '')
      + `
      const resourceAuths = [];
      nextState.routes.map((r) => {
        if (r.auth && r.auth.resource) {
          const routeResourceAuths = r.auth.resource;
          routeResourceAuths.forEach(resourceAuth => {
            resourceAuths.push([resourceAuth[0], resourceAuth[1], nextState.params[resourceAuth[2]]])
          });
        }
      });
      let authPromise = Promise.resolve(true);
      if (resourceAuths.length) {
        const http = require('utils/http').default;
        const resourceConfig = require('modules/core/resourceConfig').default;
        authPromise = Promise.all(resourceAuths.map((resourceAuth) => {
          return window.store.dispatch(resourceConfig[resourceAuth[1]].service.actions.getById(resourceAuth[2])).then((data) => {
            return data.acl && data.acl.actions && data.acl.actions.indexOf(resourceAuth[0]) >= 0;;
          });
        })).then(cans => cans.every(can => can))
        .catch(error => {
          if (error.httpStatus === 404) {
            return '404';
          }
          return 'error';
        });
      }
      authPromise.then((can) => {
        if (can === '404') {
          const NotFound = require('modules/core/containers/NotFound').default;
          cb(null, NotFound);
        } else if (can === 'error') {
          const Error = require('modules/core/containers/Error').default;
          cb(null, Error);
        } else if (can) {
          cb(null, routeContainer);
        } else {
          const Forbidden = require('modules/core/containers/Forbidden').default;
          cb(null, Forbidden);
        }
      })
  })}***`
}));

const getSyncRoutes = (routes, config) => routes.map((route) =>  Object.assign({}, route, {
  childRoutes: transformRoutes(config, route.childRoutes),
  getComponent: `***(nextState, cb) =>  {
      const routeContainer = require('./${route.container}').default;`
      + (config.store ? `
      const routeStore = require('./${config.store}').default;
      if (routeStore.reducer) {
        injectReducer(store, { [routeStore.SCOPENAME]: routeStore.reducer });
      }
      if (routeStore.sagas) {
        const sagaMiddleware = require('store/createStore').sagaMiddleware;
        routeStore.sagas.forEach((saga) => {
          if (!saga.hasRun) {
            saga.hasRun = true;
            sagaMiddleware.run(saga);
          }
        });
      }` : '')
      + (config.useReduxForm ? `const fmReducer = require('redux-form').reducer;injectReducer(store, { form: fmReducer });` : '')
      + `cb(null, routeContainer);
  }***`
}));

const transformRoutes = (config, routes) => {
  if (!routes) {
    return undefined;
  }
  return  getAsyncRoutes(routes, config);
};

module.exports = function (source, map) {
  this.cacheable();
  const config = deserialize(source);
  const injectRoute = transformRoutes(config, config.routes);
  const result = ('export default  (store, injectReducer) => ' + serialize(injectRoute)).replace(/\"\*\*\*|\*\*\*\"|\\n/g, "");

  this.callback(null, result, map);
}
