(function(){
  var defaultTemplateName = 'index';

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
    return [
      templateName,
      modelName
    ].join('-');
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
            console.warn(xhr, xhr.status, xhr.statusText);
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
            console.warn(xhr, xhr.status, xhr.statusText);
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

      console.log('install route');

      function getEl() {
        return (route.query.el && document.getElementById(route.query.el)) || options.el;
      }

      function render(view, ctx) {
        var el = getEl();

        if (!el) return console.error('No DOM element!');

        // skip if content has not changed
        view.checksum = checksum(view, templateName, modelName);
        if (el.hasAttribute('data-checksum') && el.getAttribute('data-checksum') === view.checksum) return console.log('not changed: no need to render');
        el.setAttribute('data-checksum', view.checksum);
        
        console.log('render view ' + templateName + '/' + modelName + ' into ' + el.id);

        // extend view
        view.urlRoot = Coup.urlRoot;
        templateName = templateName;
        view.query = ctx.params;

        el.innerHTML = Mustache.render(template(templateName), model.view(view), app.templates);
      }

      // list callback for page route
      return function(ctx) {
        console.log('call ' + route.from);
        console.log(ctx);

        fn(ctx, render)
      }
    }

    // install show function
    function installShow(app, route) {
      console.log('install show');

      return installRenderer(app, route, function(ctx, render) {
        var viewName = route.to.split('/', 3)[2];

        console.log('fetch doc');
        if (typeof options.loading === 'function') options.loading();

        Coup.couch.doc(ctx.params.id, {
          success: function(view) {
            console.log('render fetched doc');
            render(view, ctx);

            if (typeof options.complete === 'function') options.complete();
          }
        })
      });
    }

    // install list function
    function installList(app, route) {
      console.log('install list');

      return installRenderer(app, route, function(ctx, render) {
        var viewName = route.to.split('/', 3)[2];

        console.log('fetch view');
        if (typeof options.loading === 'function') options.loading();

        Coup.couch.view(viewName, route.query, ctx, {
          success: function(view) {
            console.log('render fetched view');
            if (typeof options.complete === 'function') options.complete();

            render(view, ctx);
          }
        })
      });
    }

    // install each apps rewrite rules
    for (var id in Coup.apps) {
      app = Coup.apps[id];

      console.log('init routing: ' + id);
      console.log(app);

      // install rewrites for app
      // if present
      if (app.rewrites) {
        app.rewrites.forEach(function(route) {
          var from = Coup.urlRoot + route.from.replace(/^\//, ''),
              fn;

          if (route.to.match('^_show/layout/')) {
            // install show route
            console.log('install show layout route: ' + from);
            console.log(route);

            page(from, installShow(app, route));
          } else if (route.to.match('^_list/layout/')) {
            // install list route
            console.log('install list layout route: ' + from);
            console.log(route);

            page(from, installList(app, route));
          }
        });
      }
    }

    // start routing
    console.log('start routing...');
    page();
  };


  // Expose `Coup`
  if ('undefined' == typeof module) {
    window.Coup = Coup;
  } else {
    module.exports = Coup;
  }
})();
