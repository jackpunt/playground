'use strict';

/* jasmine specs for controllers */

/* http://docs.angularjs.org/api/angular.mock.inject */

function make_project(key, subsecond) {
  return {
      'description': 'The project description',
      'key': key,
      'name': 'New project name',
      'orderby': 'test@example.com-2013-01-03T01:05:32.' + subsecond,
      'run_url': 'http://localhost:9200/?_mimic_project=' + key,
  };
}

describe('AlertController', function() {

  var scope, ctrl, Alert;

  beforeEach(module('playgroundApp.services'));

  beforeEach(inject(function($rootScope, _Alert_, $controller) {
    scope = $rootScope.$new();
    ctrl = $controller(AlertController, {$scope: scope});
    Alert = _Alert_;
  }));

  it('should always show safety alert', function() {
    expect(scope.alerts().length).toBe(1);
    expect(scope.alerts()[0].msg)
      .toMatch(/Your private source code and data are not safe here./);
  });

  it('should be able to remove an alert', function() {
    scope.closeAlert(0);
    expect(scope.alerts().length).toBe(0);
  });

});

describe('HeaderController', function() {

  var scope, $httpBackend, $location;

  beforeEach(inject(function($rootScope, $injector) {
    scope = $rootScope.$new();
    //$httpBackend = $injector.get('$httpBackend');
  }));

  beforeEach(inject(function(_$location_) {
    doInit();
    $location = _$location_;
  }));

  function doInit() {
    inject(function($controller) {
      $controller(HeaderController, {$scope: scope});
      flushDoSerial();
      //$httpBackend.flush();
    });
  }

  it('alreadyhome function should only return true for /playground/',
     function() {
       expect(typeof scope.alreadyhome).toEqual('function');

       $location.path('/');
       expect(scope.alreadyhome()).toBe(false);
       $location.path('/playground');
       expect(scope.alreadyhome()).toBe(false);
       $location.path('/playground/');
       expect(scope.alreadyhome()).toBe(true);
       $location.path('/playground/p/42/');
       expect(scope.alreadyhome()).toBe(false);
     });

});

describe('ProjectController', function() {

  var scope, $httpBackend;

  function make_file(filename, mime_type, contents, dirty) {
    var file = {
        'path': filename,
        'mime_type': mime_type,
    };
    if (contents) {
      file.contents = contents;
    }
    if (dirty != undefined) {
      file.dirty = dirty;
    }
    return file;
  }

  function make_files_response() {
    return [
        make_file('app.yaml', 'text/x-yaml'),
        make_file('favicon.ico', 'image/x-icon'),
        make_file('main.py', 'text/x-python'),
    ];
  }

  function make_files_data() {
    return {
        // Contents of first file fetched during controller initialization
        'app.yaml': make_file('app.yaml', 'text/x-yaml', 'one: two', false),
        'favicon.ico': make_file('favicon.ico', 'image/x-icon'),
        'main.py': make_file('main.py', 'text/x-python'),
    };
  }

  beforeEach(module(function($provide) {
    // TODO: DETERMINE truth of 'there has to be a better way'
    $provide.factory('$window', function() {
      var $window = {
        document: {},
        navigator: {},
      };
      return $window;
    });
  }));

  beforeEach(module('playgroundApp.services'));

  beforeEach(module('mocks.dialog'));

  beforeEach(inject(function($browser) {
    $browser.url('http://localhost:8080/playground/p/76/');
  }));

  beforeEach(inject(function($rootScope, $injector, $window) {
    scope = $rootScope.$new();

    // TODO: extract config into service and inject into parent and
    // child controllers
    scope.config = {
        'PLAYGROUND_USER_CONTENT_HOST': 'localhost:9100',
    };
    scope.projects = [
        make_project(76),
    ];

    $httpBackend = $injector.get('$httpBackend');

    // TODO: DETERMINE if there's a better way to test JavaScript
    // functions which are expected to exist thanks to script tags
    $window.CodeMirror = jasmine.createSpy('CodeMirror').andReturn(
      jasmine.createSpyObj(
        'CodeMirror',
        ['getWrapperElement', 'setValue', 'setOption', 'focus', 'on'])
    );

    $httpBackend
    .whenGET('//localhost:9100/_ah/mimic/dir?_mimic_project=76')
    .respond(make_files_response());

    $httpBackend
    .whenGET('//localhost:9100/_ah/mimic/file?_mimic_project=42&path=app.yaml')
    .respond('one: two');

    $httpBackend
    .whenGET('//localhost:9100/_ah/mimic/file?_mimic_project=76&path=app.yaml')
    .respond('one: two');
  }));

  beforeEach(inject(function($routeParams) {
    $routeParams.project_id = '76';
  }));

  afterEach(function() {
    flushDoSerial();
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });


  function doInit() {
    inject(function($controller) {
      $controller(ProjectController, {$scope: scope});
      flushDoSerial();
      $httpBackend.flush();
    });
  }


  describe('initialization', function() {

    // TODO: DETERMINE if there's a better way to ensure that
    // $routeParams is populated
    it('should set $scope.project to the project identified by ' +
       '$routeParams.project_id', inject(function($routeParams) {
      var project = make_project(76);
      scope.projects = [make_project(17), project, make_project(13)];
      expect(scope.projects[1]).toBe(project);
      expect(scope.project).toBeUndefined();
      doInit();
      expect(scope.project).toBe(project);
    }));

    it('should call $scope._list_files()',
       inject(function($controller, DoSerial) {
         spyOn(DoSerial, 'then').andCallThrough();
         expect(DoSerial.then).not.toHaveBeenCalled();
         doInit();
         expect(DoSerial.then).toHaveBeenCalledWith(scope._list_files);
       }));

    it('should call $scope._select_first_file()',
       inject(function($controller, DoSerial) {
         spyOn(DoSerial, 'then').andCallThrough();
         expect(DoSerial.then).not.toHaveBeenCalled();
         doInit();
         dump(scope);
         expect(DoSerial.then).toHaveBeenCalledWith(scope._select_first_file);
       }));

  });


  describe('runtime behavior', function() {

    beforeEach(function() {
      doInit();
    });

    describe('no_json_transform function', function() {

      it('should provide the identity transform', function() {
        var data = 'foo';
        expect(scope.no_json_transform(data)).toBe(data);
        expect(scope.no_json_transform(data)).toEqual('foo');
        data = '[1,2,3]';
        expect(scope.no_json_transform(data)).toBe(data);
        expect(scope.no_json_transform(data)).toEqual('[1,2,3]');
        data = undefined;
        expect(scope.no_json_transform(data)).toBe(undefined);
        data = null;
        expect(scope.no_json_transform(data)).toBe(null);
        data = Error('x');
        expect(scope.no_json_transform(data)).toEqual(Error('x'));
        expect(scope.no_json_transform(data)).toBe(data);
      });

    });


    describe('is_image_mime_type function', function() {

      it('should return true for "image/*" MIME types', function() {
        expect(scope.is_image_mime_type('image/png')).toBe(true);
        expect(scope.is_image_mime_type('image/gif')).toBe(true);
        expect(scope.is_image_mime_type('image')).toBe(false);
        expect(scope.is_image_mime_type('text/plain')).toBe(false);
        expect(scope.is_image_mime_type('text/png')).toBe(false);
        expect(scope.is_image_mime_type('application/octet-stream'))
          .toBe(false);
      });

    });


    describe('url_of function', function() {

      it('should return //localhost:9100/_ah/mimic/file?_mimic_project=' +
         ':project_id&path=:filename', inject(function($window) {
           var png = make_file('logo.png', 'image/png');
           // TODO: DETERMINE how to avoid localhost:9100
           expect(scope.url_of('file', {path: png.path}))
             .toEqual('//localhost:9100/_ah/mimic/file?_mimic_project=76' +
                      '&path=logo.png');
         }));

    });


    describe('image_url_of function', function() {

      it('should return emtpty string when no file is given', function() {
        expect(scope.image_url_of()).toEqual('');
        expect(scope.image_url_of(null)).toEqual('');
      });

      it('should return empty string for none "image/*" MIME types ',
         function() {
           expect(scope.image_url_of(make_file('filename', 'text/html')))
             .toEqual('');
         });

      it('should pass through to url_of() for "image/*" MIME types ',
         function() {
           var png = make_file('filename', 'image/png');
           var file_url = scope.url_of('file', {path: png.path});
           expect(scope.image_url_of(png)).toBe(file_url);
         });

    });


    describe('_get function', function() {

      it('should call success_cb when file has contents', function() {
        var success_cb = jasmine.createSpy();
        var file = make_file('app.yaml', 'text/x-yaml', 'version: 1');
        scope._get(file, success_cb);
        expect(success_cb).toHaveBeenCalledWith();
      });

      it('should call success_cb when file has no contents', function() {
        var success_cb = jasmine.createSpy();
        var file = make_file('app.yaml', 'text/x-yaml');
        expect(file.contents).toBeUndefined();
        expect(file.hasOwnProperty('contents')).toBe(false);
        $httpBackend.expectGET(scope.url_of('file', {path: file.path}))
          .respond('foo: bar');
        scope._get(file, success_cb);
        $httpBackend.flush();
        expect(file.contents).toEqual('foo: bar');
        expect(success_cb).toHaveBeenCalledWith();
      });

      it('should not overwrite file contents regardless of dirty flag',
         function() {
           var noop = function() {};
           var file = make_file('app.yaml', 'text/x-yaml', 'version: 1');
           scope._get(file, noop);
           expect(file.dirty).not.toBeDefined();
           expect(file.hasOwnProperty('dirty')).toBe(false);
           expect(file.contents).toEqual('version: 1');
           file.dirty = true;
           scope._get(file, noop);
           expect(file.contents).toEqual('version: 1');
           file.dirty = false;
           scope._get(file, noop);
           expect(file.contents).toEqual('version: 1');
         });

      it('should set file.dirty=false after fetching contents', function() {
        var success_cb = jasmine.createSpy();
        var file = make_file('app.yaml', 'text/x-yaml');
        expect(file.contents).toBeUndefined();
        expect(file.hasOwnProperty('contents')).toBe(false);
        expect(file.dirty).toBe(undefined);
        $httpBackend.expectGET(scope.url_of('file', {path: file.path}))
          .respond('version: bar');
        scope._get(file, success_cb);
        $httpBackend.flush();
        expect(file.contents).toEqual('version: bar');
        expect(file.dirty).toBe(false);
      });

      it('should HTTP GET missing file contents', function() {
        var success_cb = jasmine.createSpy();
        var file = make_file('app.yaml', 'text/x-yaml');
        $httpBackend.expectGET(scope.url_of('file', {path: file.path}))
          .respond('x: y');
        expect(file.contents).toBeUndefined();
        scope._get(file, success_cb);
        $httpBackend.flush();
        expect(file.contents).toEqual('x: y');
      });

    });


    describe('_list_files function', function() {

      function make_plain_file() {
        return make_file('foo.txt', 'text/plain');
      }

      it('should call //localhost:9100/_ah/mimic/dir?_mimic_project=' +
         ':project_id', function() {
           $httpBackend.verifyNoOutstandingRequest();
           $httpBackend.verifyNoOutstandingExpectation();
           expect(scope.files).toEqual(make_files_data());
           $httpBackend
             .expectGET('//localhost:9100/_ah/mimic/dir?_mimic_project=76')
             .respond([make_plain_file()]);
           scope.files = null;
           scope._list_files();
           $httpBackend.flush();
           expect(scope.files).toEqual({'foo.txt': make_plain_file()});
         });

    });

    describe('select_file function', function() {

      describe('with "image/*" MIME types', function() {

        function make_image_file() {
          return make_file('foo.png', 'image/png');
        }

        it('should set $scope.current_file', function() {
          scope.current_file = undefined;
          scope.select_file(make_image_file());
          expect(scope.current_file).toEqual(make_image_file());
        });

        it('should return undefined', function() {
          var result = scope.select_file(make_image_file());
          expect(result).toBeUndefined();
        });

      });

      describe('with MIME types other than "image/*"', function() {

        function make_text_file() {
          return make_file('app.yaml', 'text/x-yaml', 'version: 1');
        }

        it('should set $scope.current_file', function() {
          scope.current_file = undefined;
          scope.select_file(make_text_file());
          flushDoSerial();
          expect(scope.current_file).toEqual(make_text_file());
        });

      });

    });

    describe('_select_first_file function', function() {

      it('should call $scope.select_file(:first_file)', function() {
        doInit();
        scope.select_file = jasmine.createSpy();
        var expected_file = make_file('app.yaml', 'text/x-yaml', 'one: two',
                                      false);
        expect(scope.select_file).not.toHaveBeenCalled();
        scope._select_first_file();
        expect(scope.select_file).toHaveBeenCalledWith(expected_file);
      });

    });

    describe('dialog tests', function() {
      var dialogMock;

      beforeEach(inject(function($dialog) {
        doInit();
        dialogMock = $dialog;
      }));

      describe('prompt_new_file function', function() {
        it('should call $scope.insert_path(path)', function() {
          scope.insert_path = jasmine.createSpy();
          dialogMock.dialogShouldBeCalledWith({
            controller: 'NewFileController',
            templateUrl: '/playground/new_file_modal.html'
          });
          dialogMock.willCloseWith('test_file.py');
          scope.prompt_new_file();
          expect(scope.insert_path).toHaveBeenCalledWith('test_file.py');
        });
      });

    });

  });

});

describe('PageController', function() {

  var scope, $httpBackend;

  function doInit() {
    inject(function($controller) {
      $controller(PageController, {$scope: scope});
      flushDoSerial();
      $httpBackend.flush();
    });
  }

  beforeEach(module('mocks.dialog'));

  beforeEach(module('playgroundApp.services'));

  beforeEach(inject(function($rootScope, $injector) {
    scope = $rootScope.$new();
    $httpBackend = $injector.get('$httpBackend');

    $httpBackend
    .whenGET('/playground/getconfig')
    .respond({
        'PLAYGROUND_USER_CONTENT_HOST': 'localhost:9100',
        'email': 'user_q0inuf3vs5',
        'git_playground_url': 'http://code.google.com/p/cloud-playground/',
        'is_admin': false,
        'is_logged_in': false,
        'playground_namespace': '_playground',
    });

    $httpBackend
    .whenGET('/playground/getprojects')
    .respond([]);

    $httpBackend
    .whenGET('/playground/gettemplateprojects')
    .respond([make_project(89), make_project(91)]);
  }));


  describe('initialization', function() {

    afterEach(function() {
      flushDoSerial();
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });


    it('should, when instantiated, get configuration, then project data',
       function() {
         expect(scope.config).toBeUndefined();
         expect(scope.projects).toBeUndefined();
         $httpBackend.expectGET('/playground/getconfig');
         $httpBackend.expectGET('/playground/getprojects');
         doInit();
         expect(scope.config).toBeDefined();
         expect(scope.config.email).toBeDefined();
         expect(scope.config.playground_namespace).toBe('_playground');
         expect(scope.projects).toBeDefined();
         expect(scope.projects.length).toBe(0);
       });


    it('should get template projects', function() {
      expect(scope.template_projects).toBeUndefined();
      $httpBackend.expectGET('/playground/gettemplateprojects');
      doInit();
      expect(scope.template_projects).toBeDefined();
      expect(scope.template_projects.length).toBe(2);
      expect(scope.template_projects[0]).toEqual(make_project(89))
      expect(scope.template_projects[1]).toEqual(make_project(91))
    });

  });


  describe('runtion behavior', function() {

    beforeEach(function() {
      doInit();
    });

    describe('namespace function', function() {

      var routeParams;

      beforeEach(inject(function($routeParams) {
        scope.config = {};
        routeParams = $routeParams;
        routeParams.project_id = undefined;
      }));


      it('should have no default', function() {
        expect(scope.namespace()).toBeUndefined();
      });


      it('should use $routeParams project_id', function() {
        expect(scope.namespace()).toBeUndefined();
        routeParams.project_id = 'route_param';
        expect(scope.namespace()).toBe('route_param');
      });


      it('should use $scope.config.playground_namespace', function() {
        expect(scope.namespace()).toBeUndefined();
        scope.config.playground_namespace = 'pg_namespace';
        expect(scope.namespace()).toBe('pg_namespace');
      });


      it('should prefer $routeParams to $scope.config', function() {
        expect(scope.namespace()).toBeUndefined();
        routeParams.project_id = 'route_param';
        scope.config.playground_namespace = 'pg_namespace';
        expect(scope.namespace()).toBe('route_param');
      });

    });


    describe('link functions', function() {

      var WindowService;

      beforeEach(inject(function($routeParams, _WindowService_) {
        $routeParams.project_id = 'some_namespace';
        WindowService = _WindowService_;
        spyOn(WindowService, 'open');
      }));


      describe('datastore_admin function', function() {

        it('should open new window to /playground/datastore/some_namespace',
           function() {
             expect(WindowService.open).not.toHaveBeenCalled();
             scope.datastore_admin();
             expect(WindowService.open).toHaveBeenCalledWith(
               '/playground/datastore/some_namespace', '_blank');
           });

      });


      describe('memcache_admin function', function() {

        it('should open new window to /playground/memcache/some_namespace',
           function() {
             expect(WindowService.open).not.toHaveBeenCalled();
             scope.memcache_admin();
             expect(WindowService.open).toHaveBeenCalledWith(
               '/playground/memcache/some_namespace', '_blank');
           });

      });

    });

  });

  describe('big_red_button function', function() {

    var $httpBackend, WindowService;

    beforeEach(inject(function(_$httpBackend_, _WindowService_) {
      $httpBackend = _$httpBackend_;
      WindowService = _WindowService_;
      spyOn(WindowService, 'reload');
      doInit();
      $httpBackend.expectPOST('/playground/nuke').respond();
    }));

    afterEach(function() {
      flushDoSerial();
    });

    it('should post /playground/nuke', function() {
      scope.big_red_button();
      $httpBackend.flush();
      expect(WindowService.reload).toHaveBeenCalled();
    });

  });


  describe('select_project function', function() {

    var $location;

    beforeEach(inject(function(_$location_) {
      $location = _$location_;
      doInit();
      $httpBackend
      .when('POST', '/playground/p/15/touch')
      .respond(make_project(15, 2));
    }));


    it('should call /playground/p/:project_id/touch', function() {
      var project = make_project(15, 1);
      scope.projects = [make_project(14, 1), project, make_project(16, 1),
                        make_project(17, 1)];
      expect(scope.projects[1]).toEqual(make_project(15, 1));
      expect($location.path()).toEqual('');
      scope.select_project(project);
      flushDoSerial();
      $httpBackend.flush();
      expect(scope.projects[1]).not.toEqual(make_project(15, 1));
      expect(scope.projects[1]).toEqual(make_project(15, 2));
      expect($location.path()).toEqual('/playground/p/15');
    });

  });

  describe('delete_project function', function() {

    var $httpBackend, $location;
    var project_to_delete = make_project(1, 12);

    beforeEach(inject(function(_$httpBackend_, _$location_) {
      $httpBackend = _$httpBackend_;
      $location = _$location_;
      doInit();
      scope.projects = [project_to_delete, make_project(2, 13)];
      scope.project = project_to_delete;
      $httpBackend
      .expectPOST('/playground/p/1/delete')
      .respond();
    }));

    it('should delete the project', function() {
      expect(scope.project).toBe(project_to_delete);
      scope.delete_project(project_to_delete);
      expect(scope.projects.length).toBe(2);
      $httpBackend.flush();
      expect(scope.project).toBe(undefined);
      expect(scope.projects.length).toBe(1);
      expect($location.path()).toBe('/playground/');
    });

  });

  describe('dialog tests', function() {

    var dialogMock;

    beforeEach(inject(function($dialog) {
      doInit();
      dialogMock = $dialog;
    }));

    describe('prompt_delete_project function', function() {

      var mockProject = {'name': 'test_project'};
      var title = 'Confirm project deletion';
      var msg = 'Are you sure you want to delete project "' +
        mockProject.name + '"?';
      var btns = [{result: false, label: 'Cancel'},
        {result: true, label: 'DELETE PROJECT',
          cssClass: 'btn btn-danger'}];

      it('should call $scope.delete_project()', function() {
        scope.delete_project = jasmine.createSpy();
        dialogMock.messageBoxShouldBeCalledWith(title, msg, btns);
        dialogMock.willCloseWith(true);

        scope.prompt_delete_project(mockProject);
        expect(scope.delete_project).toHaveBeenCalledWith(mockProject);
      });

      it('shouldn\'t call $scope.delete_project()', function() {
        scope.delete_project = jasmine.createSpy();
        dialogMock.messageBoxShouldBeCalledWith(title, msg, btns);
        dialogMock.willCloseWith(false);

        scope.prompt_delete_project(mockProject);
        expect(scope.delete_project).not.toHaveBeenCalled();
      });

    });

  });

});


describe('MainController', function() {

  var scope, $httpBackend;

  beforeEach(module('playgroundApp.services'));

  beforeEach(module(function($provide) {
    $provide.factory('$window', function() {
      return {
        location: { replace: jasmine.createSpy() },
        navigator: {},
      };
    });
  }));

  beforeEach(inject(function($rootScope, $injector) {
    scope = $rootScope.$new();
    scope.set_loaded = jasmine.createSpy('set_loaded');
    scope.projects = [];
    scope.template_projects = [make_project(12)];
    $httpBackend = $injector.get('$httpBackend');

    $httpBackend
    .whenGET('/playground/getprojects')
    .respond([]);
  }));

  afterEach(function() {
    flushDoSerial();
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  function doInit() {
    inject(function($controller) {
      $controller(MainController, {$scope: scope});
      flushDoSerial();
      //$httpBackend.flush();
    });
  }


  describe('initialization', function() {

    it('should call $scope.set_loaded()', function() {
      doInit();
      expect(scope.set_loaded).toHaveBeenCalled();
    });

  });


  describe('runtime behavior', function() {

    var $location;

    beforeEach(inject(function(_$location_) {
      doInit();
      $location = _$location_;
    }));


    describe('login function', function() {

      it('should navigate to /playground/login', inject(function($window) {
        expect($window.location.replace).not.toHaveBeenCalled();
        scope.login();
        expect($window.location.replace)
          .toHaveBeenCalledWith('/playground/login');
        // TODO: expect(Browser.url()).toEqual(....)
      }));

    });


    describe('new_project function', function() {

      beforeEach(function() {
        $httpBackend
        .when('POST', '/playground/p/12/copy')
        .respond(make_project(42, 1));
      });

      it('should call /playground/p/12/copy', inject(function() {
        expect(scope.projects).toBeDefined();
        expect(scope.template_projects).toBeDefined();
        expect(scope.template_projects.length).toBeGreaterThan(0);
        $httpBackend.expectPOST('/playground/p/12/copy');
        scope.new_project(scope.template_projects[0]);
        flushDoSerial();
        $httpBackend.flush();
        expect(scope.projects.length).toBe(1);
        expect(scope.projects[0].key).toBe(42);
        expect(scope.projects[0].name).toBe('New project name');
      }));

    });

  });

});
