function(doc) {
  if (doc.date) {
    emit(doc.date, null);
  }
}
