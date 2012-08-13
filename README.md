Coup.js
=======

Tiny script plays client side with CouchDB rewrites, lists and shows.

Look at [examples](coup.js/tree/master/examples).

API
---

### Coup(ddoc, options)

Register a coup app and start routing.
Equivalents to `Coup.app(ddoc).start(options)`.


### Coup.app(ddoc)

Register a coup app.


### Coup.start(options)

Start routing.


Limitations
-----------

* Views are not streamed, they are kept in RAM, so you have to limit the views.


License
-------

(The MIT License)

Copyright (c) 2012 Johannes J. Schmidt, TF <schmidt@netzmerk.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
