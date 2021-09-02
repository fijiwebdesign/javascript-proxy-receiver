import React, { useEffect, useState } from "react";
import ReactInspector from "react-inspector";
import MonacoEditorReact from "@monaco-editor/react";
import { Hook, Console, Decode } from 'console-feed';

const selfKey = Symbol('self')
const privateProp = new WeakMap()

class Entity {
  get _this() {
    return this;
  }
  
  // exposed for example only
  get privateProp() {
    // outside/proxy cannot access privateProp:WeakMap as it's in our closure scope only
    // and thus cannot access value otherwise
    // note we use this[selfKey] as this === Proxy
    // this[selfKey] cannot be modified
    return privateProp.get(this[selfKey])
  }
  // exposed for example only
  set privateProp(value) {
    privateProp.set(this[selfKey], value)
  }

  constructor() {
    this.uid = String(Math.random()).substr(2, 5);

    const self = this;

    this.isProxy = function () {
      return self !== this;
    };

    this.getSelf = function () {
      return self;
    };

    this.getThis = function () {
      return this;
    };
    
    // any variable in the constructor is private
    // we could create all our methods here within the closure
    // however to access privte properties in methods defined on the prototype (eg. get privateProp())
    // we need a non-writable/non-configurable reference to self
    Object.defineProperty(this, selfKey, {
      value: self,
      writable: false,
      configurable: false
    })
    
    // set private
    this.privateProp = 42
    
  }
  
  // uses private prop selfKey
  getPrivateSelf() {
    return this[selfKey]
  }
}

const instance = new Entity();

const testProxy = (proxy) => {
  try {
    return {
    instance: {
      instance,
      "getThis()": instance.getThis(),
      "getSelf()": instance.getSelf()
    },
    proxy: {
      instance: proxy,
      "getThis()": proxy.getThis(),
      "getSelf()": proxy.getSelf()
    },
    "proxy === instance": proxy === instance,
    "instance.getThis() === proxy.getThis()":
      instance.getThis() === proxy.getThis(),
    "instance.getSelf() === proxy.getSelf()":
      instance.getSelf() === proxy.getSelf(),
    "proxy.isProxy()": proxy.isProxy(),
    "instance.isProxy()": instance.isProxy(),
    "instance get _this === proxy get _this ": instance._this === proxy._this,
    "proxy.selfKey": proxy[selfKey],
    "instance.selfKey": instance[selfKey],
    "proxy.selfKey === instance.selfKey": proxy[selfKey] === instance[selfKey],
    "proxy.getPrivateSelf()": proxy.getPrivateSelf(),
    "instance.getPrivateSelf()": instance.getPrivateSelf(),
    "proxy.getPrivateSelf() === instance.getPrivateSelf()": proxy.getPrivateSelf() === instance.getPrivateSelf(),
      "instance.privateProp": instance.privateProp,
      "proxy.privateProp": proxy.privateProp,
  };
  } catch(e) {
    return e
  }
};

const proxy1Test = testProxy(
  new Proxy(instance, {
    get: (target, key, receiver) => {
      return Reflect.get(target, key, receiver);
    }
  })
);

const proxy2Test = testProxy(
  new Proxy(instance, {
    get: (target, key, receiver) => {
      const prop = Reflect.get(target, key, instance);
      return typeof prop === "function"
        ? (...args) => prop.apply(instance, args)
        : prop;
    }
  })
);

const code = Entity.prototype.constructor.toString()

const App = () => {

  const [logs, seLogs] = useState([])

  useEffect(() => {
    Hook(window.console, (log) => {
      seLogs([...logs, Decode(log)])
    })
  })

  console.log('render', { proxy1Test, proxy2Test })

  return (
    <div>
      <h1>Proxy detection</h1>
      <p>How to detect that a class instance (or any object) is proxied</p>
      <h2>First proxy does not alter receiver</h2>
      <ReactInspector data={proxy1Test} />
      <h2>Second proxy alters receiver and binds functions to instance</h2>
      <ReactInspector data={proxy2Test} />
      <h2>Conclusion</h2>
      <p>
        If you do not control the proxy, we can circumvent its receiver set to proxy via the below to achieve "private" properties.  
        
      </p>
      <Console logs={logs} variant="dark" />
      <div style={{ width: '50%'}}>
        <MonacoEditorReact
         height="90vh"
         defaultLanguage="javascript"
         defaultValue={code}
       />
        </div>
       
    </div>
  );
};

export default App;
