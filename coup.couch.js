(function(){
  var defaultLayoutName = 'layout',
      defaultTemplateName = 'index';

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

  // calculate url root from requested path, eg
  //   http://localhost:5984/ or
  //   http://localhost:5984/mydb/_design/myapp/_rewrite/
  function urlRoot(req) {
    // Note that req.requested_path is not present CouchDB 1.1 and below 
    // use 1.2 or virtual hosts!
    var path = req.requested_path || req.path;

    return path.indexOf('_rewrite') === -1 ? '/' : '/' + path.slice(0, path.indexOf('_rewrite') + 1).join('/') + '/';
  }

  // resolve template by path from ddoc.templates
  function getTemplate(ddoc, path) {
    return path.split('/').reduce(function(obj, name) { return obj[name]; }, ddoc.templates);
  }

  // render a view
  function CouchCoup(ddoc, view, req, fn) {
    var layoutName = req.query.layout || defaultLayoutName,
        templateName = req.query.template || defaultTemplateName,
        modelName = req.query.model || templateName,
        model = require('models/' + modelName),
        partials = JSON.parse(JSON.stringify(ddoc.templates)),
        mustache = require('lib/mustache');

    view || (view = {});

    // look at coup.js installRenderer.render
    view.urlRoot = urlRoot(req);
    view.checksum = checksum(view, templateName, modelName);
    view.templateName = templateName;
    view.query = req.query;

    // export exposed ddoc parts
    view.app = JSON.stringify({
      _id: ddoc._id,
      models: ddoc.models,
      rewrites: ddoc.rewrites,
      templates: ddoc.templates
    }).replace(/<\/script>/g, '<\\/script>');

    // bind template to yield
    partials.yield = getTemplate(ddoc, templateName);

    if (typeof fn === 'function') fn(view);

    // render
    return mustache.render(getTemplate(ddoc, layoutName), model.view(view), partials);
  };

  // render list function
  CouchCoup.list = function(ddoc, head, req) {
    start({
      "headers": {
        "Content-Type": "text/html"
      }
    });
    
    return CouchCoup(ddoc, head, req, function(view) {
      view.rows = [];

      // fetch rows
      while (row = getRow()) view.rows.push(row);
    });
  };

  // render show function
  CouchCoup.show = function(ddoc, doc, req) {
    return CouchCoup(ddoc, doc, req);
  };

  // Expose `CouchCoup`
  if ('undefined' == typeof module) {
    window.CouchCoup = CouchCoup;
  } else {
    module.exports = CouchCoup;
  }
})();
