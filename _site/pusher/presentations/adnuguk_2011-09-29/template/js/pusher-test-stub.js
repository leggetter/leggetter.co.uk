/**
 * @namespace
 * Top-level namespace to stop namespace clutter.
 */
if(!window["pusherjs"]) {
  window["pusherjs"] = {};
}

/**
 * Ensures that a namespace exists.
 * @param {String} namespace The namespace to check for and create if required.
 *
 * @return {Object} The existing or new namespace.
 */
pusherjs.namespace = function(namespace) {
  var parts = namespace.split(".");
  var context = window;
  var nsPath = "";
  for(var i = 0, l = parts.length; i < l; ++i) {
    var name = parts[i];
    if(!context[name]) {
      context[name] = {};
      context[name].__namespace = name;      
    }
    nsPath += name + ".";
    context = context[name];
    if(!context.__namespace) {
      context.__namespace = nsPath.substring(0, nsPath.length-1); // trim off '.'
    }
  }
  return context;
};

/**
 * Provides a way of defining variables, functions and classes within a closure
 * and choosing how to exports them on to a namespace.
 *
 * Example:
 *
 * pusherjs.namespace("puserjs.util", function(exports) {
 * var MyClass = function() {
 *    // do stuff
 *  };
 * 
 *  var myOtherClass = function() {
 *  };
 * 
 *  exports.MyClass = MyClass;
 *  exports.Dave = myOtherClass;
 * };
 * 
 * var myClassInstance = new pusherjs.util.MyClass();
 * var daveInstance = new pusherjs.util.Dave();
 *
 * @param {String} namespace The namespace to be defined if it does not already exist.
 * @param {Function} definition The function to be called that defines the variables,
 *                  functions and classes to be exportsed and added to the namespace.
 */
pusherjs.define = function(namespace, definition) {
  var exports = {};
  definition(exports);

  var nsObject = pusherjs.namespace(namespace);
  for(var thingToexports in exports) {
    nsObject[thingToexports] = exports[thingToexports];
  }
};

/**
 * Extend the subsclass with the superclass
 *
 * @param {Object} subclass The subclass to be extended.
 * @param {Object} supercalss The object to extend the subclass with.
 */
pusherjs.extend = function(subclass, superclass){
    var firstInheritance = true;

    // see if the base classes prototype is currently empty
    for (var x in subclass.prototype) {
        firstInheritance = false;
        break;
    }

    if (firstInheritance) {
        // single inheritance
        var intermediateClass = new Function();

        // instead of inheriting directly from the super class and causing the constructor to be fired with zero
        // arguments, we use an intermediate class with the same prototype as the super class so that the object
        // constructor is avoided altogether
        intermediateClass.prototype = superclass.prototype;
        subclass["prototype"] = new intermediateClass(); // don't use fSubClass.prototype to keep jsdoc happy
    }
    else {
        // multiple inheritance
        for (x in superclass.prototype) {
            subclass.prototype[x] = superclass.prototype[x];
        }
    }
};

// TODO: consider moving this to a utility method
if (typeof Function.prototype.scopedTo === 'undefined') {
  Function.prototype.scopedTo = function(context, args) {
    var f = this;
    return function() {
      return f.apply(context, Array.prototype.slice.call(args || [])
        .concat(Array.prototype.slice.call(arguments)));
    };
  };
}
;(function() {
/* Abstract event binding
Example:

    var MyEventEmitter = function(){};
    MyEventEmitter.prototype = new Pusher.EventsDispatcher;

    var emitter = new MyEventEmitter();

    // Bind to single event
    emitter.bind('foo_event', function(data){ alert(data)} );

    // Bind to all
    emitter.bind_all(function(event_name, data){ alert(data) });

--------------------------------------------------------*/
  function EventsDispatcher() {
    this.callbacks = {};
    this.global_callbacks = [];
  }

  EventsDispatcher.prototype.bind = function(event_name, callback) {
    this.callbacks[event_name] = this.callbacks[event_name] || [];
    this.callbacks[event_name].push(callback);
    return this;// chainable
  };

  EventsDispatcher.prototype.emit = function(event_name, data) {
    this.dispatch_global_callbacks(event_name, data);
    this.dispatch(event_name, data);
    return this;
  };

  EventsDispatcher.prototype.bind_all = function(callback) {
    this.global_callbacks.push(callback);
    return this;
  };

  EventsDispatcher.prototype.dispatch = function(event_name, event_data) {
    var callbacks = this.callbacks[event_name];

    if (callbacks) {
      for (var i = 0; i < callbacks.length; i++) {
        callbacks[i](event_data);
      }
    } else {
      // Log is un-necessary in case of global channel or connection object
      if (!(this.global || this instanceof Pusher.Connection || this instanceof Pusher.Machine)) {
        Pusher.debug('No callbacks for ' + event_name, event_data);
      }
    }
  };

  EventsDispatcher.prototype.dispatch_global_callbacks = function(event_name, data) {
    for (var i = 0; i < this.global_callbacks.length; i++) {
      this.global_callbacks[i](event_name, data);
    }
  };

  EventsDispatcher.prototype.dispatch_with_all = function(event_name, data) {
    this.dispatch(event_name, data);
    this.dispatch_global_callbacks(event_name, data);
  };

  this.EventsDispatcher = EventsDispatcher; // pusherjs.EventsDispatcher
}).call(pusherjs.namespace("pusherjs"));

if(window["Pusher"]){ // backwards compatibility
  Pusher.EventsDispatcher = pusherjs.EventsDispatcher;
}

pusherjs.define("pusherjs.test.framework", function(exports) {
  
  /**
   * Stub Pusher object.
   */
  var Pusher = function(appKey, options) {
    Pusher.instances.push(this);
    
    this.connection = new Connection();
    
    this.test = new pusherjs.EventsDispatcher();
  
    this._channels = {};
  };

  /**
   * Gets the channel with the given channel name.
   * @param {String} The name identifying the channel to be retrieved.
   *
   * @return {pusherjs.test.framework.Channel} a stub channel object.
   */ 
  Pusher.prototype.channel = function(channelName) {
    return this._channels[channelName];
  };

  /**
   * Provides access to all Pusher instances.
   * @type Array
   */
  Pusher.instances = [];
  
  /** required for the Flash fallback */
  Pusher.ready = function() {};
  
  /**
   * @private 
   * Used internally by numerous Pusher components
   */
  Pusher.debug = function() {
    if (!Pusher.log) { return }
    var m = ["Pusher"]
    for (var i = 0; i < arguments.length; i++){
      if (typeof arguments[i] === "string") {
        m.push(arguments[i])
      } else {
        if (window['JSON'] == undefined) {
          m.push(arguments[i].toString());
        } else {
          m.push(JSON.stringify(arguments[i]))
        }
      }
    };
    Pusher.log(m.join(" : "))
  };
  
  // Used in event dispatacher
  
  /** @private */
  Pusher.Connection = function(){};
  
  /** @private */
  Pusher.Machine = function(){};

  /**
   * Accesses the first Pusher Stub instance and dispatches an event on a channel.
   *
   * @param {String} channelName The name of the channel the event should be triggered on.
   * @param {String} eventName the name of the even to be triggered on the channel
   * @param {String} eventData the data to be sent with the event.
   */
  Pusher.dispatch = function(channelName, eventName, eventData) {
    var instance = Pusher.instances[0];
    var channel = instance.channel(channelName);
    channel.dispatch(eventName, eventData);
  }

  /**
   * Subscribe to a channel.
   * @return {pusherjs.test.framework.Channel} A stub channel object.
   */
  Pusher.prototype.subscribe = function(channelName) {
    var channel = new Channel(channelName);
    this._channels[channelName] = channel;
    
    this._sendTestEvent('test:channel_subscribed', channel);
    
    return channel;
  };

  /**
   * Not implemented.
   */
  Pusher.prototype.unsubscribe = function(channelName) {
    throw "not implemented";
  }
  
  /** @private */
  Pusher.prototype._sendTestEvent = function(eventName, eventData) {
    var self = this;
    setTimeout(function() {
      self.test.dispatch(eventName, eventData);
    });
  };

  /**
   * A stub channel object.
   * @extends EventsDispatcher
   */
  var Channel = function(name) {
    pusherjs.EventsDispatcher.call(this);
  
    this.name = name;
  };
  pusherjs.extend(Channel, pusherjs.EventsDispatcher);
  
  var Connection = function() {
    pusherjs.EventsDispatcher.call(this);
    
    this.state = undefined;
  };
  pusherjs.extend(Connection, pusherjs.EventsDispatcher);

  /**
   * Stub object of the event object passed to the
   * pusher:subscription-succeeded event callback.
   * Represents a collection of members subscribed to a presence channel.
   */
  var Members = function() {
    this._members = {};
  
    /**
     * The number of members in the collection.
     *
     * @type Number
     */
    this.count = 0;
  };

  /**
   * Provides a way of adding members to the members collection.
   *
   * @param {Object} Object should have an 'id' and 'info' property as follows:
   *    {
   *      "id": "Unique_user_id",
   *      "info": {
   *        "any" : "thing" // any number of properties on this object
   *      }
   *    }
   *
   * @return The member object parameter that was passed in
   */
  Members.prototype.add = function(member) {
    this._members[member.id] = member;
    ++this.count;
    return member;
  };

  /**
   * Used to loop through the members within the collection.
   * @param {Function} callback A callback to be executed for each member found within
   *  the collection.
   */
  Members.prototype.each = function(callback) {
    for(var id in this._members) {
      callback(this._members[id]);
    }
  };
  
  exports.Pusher = Pusher;
  exports.Members = Members;
});

if(typeof Pusher !== "undefined" && window.ALLOW_PUSHER_OVERRIDE !== true) {
  throw "Attempt to override Pusher object but it already exists. To allow Pusher object override set ALLOW_PUSHER_OVERRIDE to 'true'";
}
Pusher = pusherjs.test.framework.Pusher;