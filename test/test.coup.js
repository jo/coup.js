var assert = require("assert");
var coup = require("../coup.js");

describe("Coup", function() {
  describe("Coup()", function() {
    it("should be a function", function() {
      assert.equal('function', typeof coup);
    });
  });

  describe("urlRoot", function() {
    it("should be '/'", function() {
      assert.equal('/', coup.urlRoot);
    });
    // TODO: mock window.location and test full _rewrite path inclusion
  });

  describe("apiRoot", function() {
    it("should be '/api/'", function() {
      assert.equal('/api/', coup.apiRoot);
    });
  });

  describe("apps", function() {
    it("should be an object", function() {
      assert.equal('object', typeof coup.apps);
    });
  });

  describe("require", function() {
    var app = {
      _id: "myapp",
      models: {
        mymodel: "exports.do = function(doc) { doc.foo = 'bar'; return doc; }",
        othermodel: "exports.do = function(doc) { var model = require('models/mymodel'); return model.do(doc); }"
      }
    };

    it("should be a function", function() {
      assert.equal('function', typeof coup.require);
    });
    
    it("should resolve app.models.mymodel", function() {
      coup.app(app);

      var model = coup.require('models/mymodel');
      
      assert.equal('function', typeof model.do);
      assert.equal('bar', model.do({}).foo);
    });
    
    it("should deeply resolve app.models.othermodel", function() {
      coup.app(app);

      var model = coup.require('models/othermodel');
      
      assert.equal('function', typeof model.do);
      assert.equal('bar', model.do({}).foo);
    });
  });

  describe("Coup.couch", function() {
    it("should be an object", function() {
      assert.equal('object', typeof coup.couch);
    });

    describe("Coup.couch.doc", function() {
      it("should be a function", function() {
        assert.equal('function', typeof coup.couch.doc);
      });
    });

    describe("Coup.couch.view", function() {
      it("should be a function", function() {
        assert.equal('function', typeof coup.couch.view);
      });
    });
  });


  describe("app", function() {
    var app = { _id: 'myapp' };

    it("should be a function", function() {
      assert.equal('function', typeof coup.app);
    });
    it("should register app to apps", function() {
      coup.app(app);
      assert.equal(coup.apps.myapp, app);
    });
    it("should return coup", function() {
      coup.app(app);
      assert.equal(coup, coup.app(app));
    });
  });
  describe("start", function() {
    var app = { _id: 'myapp' };

    it("should be a function", function() {
      assert.equal('function', typeof coup.start);
    });
  });
});
