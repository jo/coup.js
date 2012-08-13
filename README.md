Coup.js
=======

Tiny script plays client side with CouchDB rewrites, lists and shows.

With Couch.js you can build a web that

1. Render html server side on first request
2. Handle subsequent calls client side

This technique results in 

* fast pageload
* SEO friendly
* less bandwidth
* less CPU usage

Coup.js consists of a small client side and an even smaller server side library.

On *server side*, inside your _show_ or _list_ function, you `require("lib/coup.couch.js")`
and call `coup.show()` respectively `coup.list()`, which render the templates
based on query parameters, which you set in the rewrite rules.

On *client side* you include the `coup.js` script and call `Coup()`.
The rewrite rules gets parsed and handed over to [page.js](https://github.com/visionmedia/page.js).
Now the client takes control over the rendering of the page, fetching the views and docs
via ajax requests.


### rewrites

Define the route with a template:

    {
      "from": ":id",
      "to": "_show/layout/:id",
      "query": {
        "template": "page"
      }
    }

### models

Think of Coup.js models as of transform functions, which takes the json of a document
or a view as input and returns an object, which is used as a view in mustache:

    exports.view = function(doc) {
      doc.profile_image_url = '/' + encodeURIComponent(doc._id) + '/profile_image.jpg';

      return doc;
    };

### templates

The [mustache.js](https://github.com/janl/mustache.js) templates are stored inside the design document.

    <h2>{{title}}</h2>
    <img src="{{{profile_image_url}}}">


### shows and lists

Require `coup` and call it:

    function(doc, req) {
      return require('lib/coup').show(this, doc, req);
    }



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


Tests
-----

    mocha
    ..............
    ✔ 14 tests complete (12ms)


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
