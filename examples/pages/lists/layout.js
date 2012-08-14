function(head, req) {
  return require('lib/coup.couch').list(this, head, req);
}
