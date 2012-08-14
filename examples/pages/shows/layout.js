function(doc, req) {
  return require('lib/coup.couch').show(this, doc, req);
}
