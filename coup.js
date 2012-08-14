(function(){
  var defaultTemplateName = 'index';

  // console.log wrapper
  function log() {
    if (typeof window.console === 'object') {
      console.log.apply(window.console, Array.prototype.slice.call(arguments));
    }
  }

  // checksum toi check if a view needs to be rendered
  function checksum(view, templateName, modelName) {
    if (view._id && view._rev) {
      // docs
      return [
        view._id,
        view._rev,
        templateName,
        modelName
      ].join('-');
    }
    if (view.update_seq) {
      // views
      return [
        view.update_seq,
        templateName,
        modelName
      ].join('-');
    }
    return null;
  }

  // `Coup()`
  // is a shortcut for
  // Coup.app(myapp).start();
  function Coup(app, options) {
    Coup.app(app).start(options);
  }

  // `urlRoot` can be
  //   http://localhost:5984/ (eg. via vhost) or
  //   http://localhost:5984/mydb/_design/myapp/_rewrite/
  Coup.urlRoot = (function() {
    var rootExp = /\/_rewrite(\/.*)*$/,
        path = typeof window === 'object' && window.location && window.location.pathname;

    if (path && path.match(rootExp)) {
      path = path.replace(rootExp, '/_rewrite/');
    } else {
      path = '/';
    }

    return path;
  })();

  // `Coup.apiRoot`
  // Default is '/api'.
  // Add a rewrite rule:
  //   {
  //     "from": "api/*",
  //     "to": "*"
  //   }
  Coup.apiRoot = Coup.urlRoot + 'api/';

  
  // all apps are stored in Coup.apps
  Coup.apps = {};


  // commonjs
  // load modules from all all apps
  // TODO: currently overwriting in random order!
  Coup.require = (function(modules) {
    // memoized export objects
    var exportsObjects = {};
   
    // don't want outsider redefining "require" and don't want
    // to use arguments.callee so name the function here.
    var require = function(name) {
      var module = { exports: {} },
          exports = module.exports,
          source;

      if (exportsObjects.hasOwnProperty(name)) {
        return exportsObjects[name];
      }

      // get source
      try {
        // overwrite random ordered modules!
        for (var id in modules) {
          source = name.split('/').reduce(function(doc, part) {
            return doc[part];
          }, modules[id]);
          if (source) break;
        }
      } catch(e) {
        throw('failed to load module ' + name);
      }

      // memoize before executing module for cyclic dependencies
      exportsObjects[name] = exports;

      // eval module
      try {
        eval(source);
      } catch(e) {
        throw('error in module ' + name);
      }

      return module.exports;
    };
   
    return require;
  })(Coup.apps);


  // CouchDB adapter
  Coup.couch = {
    // Coup.couch.doc
    doc: function(id, options) {
      var xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status < 300) {
            options.success(JSON.parse(xhr.responseText))
          } else {
            log('Error fetching doc:');
            log(xhr, xhr.status, xhr.statusText);
          }
        }
      };
      
      xhr.open('GET', Coup.apiRoot + encodeURIComponent(id));
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(null);
    },

    // Coup.couch.view
    view: function(id, query, ctx, options) {
      var xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status < 300) {
            options.success(JSON.parse(xhr.responseText));
          } else {
            log('Error fetching view:');
            log(xhr, xhr.status, xhr.statusText);
          }
        }
      };

      var opts = [], opt;
      for(var key in query) {
        opt = query[key];

        if (typeof opt === 'object') {
          opts.push(encodeURIComponent(key) + '=' + JSON.stringify(opt));
        } else {
          opts.push(encodeURIComponent(key) + '=' + encodeURIComponent(opt));
        }
      }
      opts = opts.join('&');

      // inject params.id
      // FIXME: this is nasty, sorry folks
      opts = opts.replace(/:id/g, ctx.params.id);

      xhr.open('GET', Coup.apiRoot + 'ddoc/_view/' + id + '?' + opts);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(null);
    }
  };


  // `Coup.app()`
  // register an app
  Coup.app = function(app){
    if (typeof app !== 'object') throw('No app given.');
    if (typeof app._id !== 'string') throw('Every app needs an _id string property.');

    Coup.apps[app._id] = app;
  
    return Coup;
  };


  // `Coup.start()`
  // needs page.js and mustache.js available
  Coup.start = function(options){
    var app;

    options || (options = {});
    options.el || (options.el = 'app');
    options.el = document.getElementById(options.el);

    var getTemplate = function(templates) {
      return function(path) {
        return path.split('/').reduce(function(doc, name) { return doc[name]; }, templates);
      }
    };

    // install function
    function installRenderer(app, route, fn) {
      var templateName = (route.query && route.query.template) || defaultTemplateName,
          modelName = (route.query && route.query.model) || templateName,
          template = getTemplate(app.templates),
          model = Coup.require('models/' + modelName);

      function getEl() {
        return (route.query.el && document.getElementById(route.query.el)) || options.el;
      }

      function render(view, ctx) {
        var el = getEl();

        if (!el) return log('No DOM element found!');

        // skip if content has not changed
        view.checksum = checksum(view, templateName, modelName);
        if (el.hasAttribute('data-checksum') && el.getAttribute('data-checksum') === view.checksum) {
          log('not changed: no need to render');
        } else {
          el.setAttribute('data-checksum', view.checksum);
          
          log('render view ' + templateName + '/' + modelName + ' into ' + el.id);

          // extend view
          view.urlRoot = Coup.urlRoot;
          templateName = templateName;
          view.query = ctx.params;

          el.innerHTML = Mustache.render(template(templateName), model.view(view), app.templates);
        }

        if (typeof options.complete === 'function') options.complete();
      }

      // list callback for page route
      return function(ctx) {
        log('call route "' + route.from + '"');

        if (typeof options.loading === 'function') options.loading();

        fn(ctx, render)
      }
    }

    // install show function
    function installShow(app, route) {
      return installRenderer(app, route, function(ctx, render) {
        var viewName = route.to.split('/', 3)[2];

        log('fetch doc: ' + ctx.params.id);

        Coup.couch.doc(ctx.params.id, {
          success: function(view) {
            log('render fetched doc');
            render(view, ctx);
          }
        })
      });
    }

    // install list function
    function installList(app, route) {
      return installRenderer(app, route, function(ctx, render) {
        var viewName = route.to.split('/', 3)[2];

        log('fetch view: ' + viewName);

        Coup.couch.view(viewName, route.query, ctx, {
          success: function(view) {
            log('render fetched view');
            render(view, ctx);
          }
        })
      });
    }

    // install each apps rewrite rules
    for (var id in Coup.apps) {
      app = Coup.apps[id];

      // install rewrites for app
      // if present
      if (app.rewrites) {
        app.rewrites.forEach(function(route) {
          var from = Coup.urlRoot + route.from.replace(/^\//, ''),
              fn;

          if (route.to.match('^_show/layout/')) {
            // install show route
            page(from, installShow(app, route));
          } else if (route.to.match('^_list/layout/')) {
            // install list route
            page(from, installList(app, route));
          }
        });
      }
    }

    // start routing
    log('start routing...');
    page();
  };


  // Expose `Coup`
  if ('undefined' == typeof module) {
    window.Coup = Coup;
  } else {
    module.exports = Coup;
  }
})();
