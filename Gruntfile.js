module.exports = function(grunt) {
  var _, rest, mime, pathPrefix, errorCode, client, fse, file, path, scrape, stringify;
  rest = require('rest');
  mime = require('rest/interceptor/mime');
  defaultRequest = require('rest/interceptor/defaultRequest');
  pathPrefix = require('rest/interceptor/pathPrefix');
  errorCode = require('rest/interceptor/errorCode');
  fse = require("fs-extra");
  scrape = require('website-scraper');
  path = require('path');
  file = require("file");
  _ = require('lodash');
  stringify = require('js-stringify');

  //@todo: configure test, (optional) start local test, start and stop test, deploy test
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    kameleoonConfiguration: 'kameleoon-configuration.json',
    mode: "DEV",
    currentTest: "",
    currentVariation: "",
    apiEndPoint: "https://back-office.kameleoon.com/k-api/",
    testDataPath: "tests",
    targetDataPath: "",
    configuredTests: "",
  });

  // Authentication
  grunt.registerTask('authentication', 'Create new AB-Test', function () {
    var done = this.async();

    var credentials = grunt.config.get('kameleoonConfiguration')
    var auth = grunt.file.readJSON(credentials);
    var currentTime = new Date().getTime();
    var timeLimit = new Date(auth['timestamp']).getTime();

    if(currentTime >= timeLimit) {
      client = rest.wrap(pathPrefix, {prefix: grunt.config.get('apiEndPoint')})
      .wrap(mime, { mime: 'application/json' })
      .wrap(errorCode);
      client({method: 'POST', path: 'authorization', entity: auth}).then(function (response) {
        var timestamp = new Date().getTime();
        // Get token from response
        var token = JSON.parse(response.entity).result['token'];
        auth['token']= token;
        auth['timestamp'] = timestamp;
        grunt.file.write(credentials, JSON.stringify(auth, null, 2));
        grunt.log.ok('Authentication succeded: '+token);
        done();
      },
      // error handling
      function (response) {
        grunt.log.error('Authentication failed');
        grunt.log(response);
        done();
      });
    } else {
      grunt.log.ok('Authentication still valid: '+auth['token']);
    }
  });


  // List sites
  grunt.registerTask('listSites', 'List all sites in the account', function () {
    var done = this.async();
    var credentials = grunt.config.get('kameleoonConfiguration')
    var auth = grunt.file.readJSON(credentials);

    client = rest.wrap(pathPrefix, {prefix: grunt.config.get('apiEndPoint')})
    .wrap(mime, { mime: 'application/json'})
    .wrap(defaultRequest, { headers: { 'X-Auth-Key': auth['token'], 'X-Auth-Email': auth['username']} })
    .wrap(errorCode);

    client({method: 'GET', path: 'sites'}).then(function (response) {
      var sites = response.entity.result.sites || [];
      for (var i = 0; i < sites.length; i++) {
        console.log(sites[i]['id']);
        console.log(sites[i]['url']+'\n');
      }
      done();
    },
    // error handling
    function (response) {
      grunt.log.error('An error occured');
      grunt.log(response);
      done();
    });
    grunt.log.write('List Sites ...').ok();
  });

  // Set site
  grunt.registerTask('setSite', 'Set a site for this account', function () {
    var done = this.async();
    var credentials = grunt.config.get('kameleoonConfiguration')
    var auth = grunt.file.readJSON(credentials);

    if(grunt.option('site') !== undefined) {
      auth['siteCode'] = grunt.option('site');
      grunt.file.write(credentials, JSON.stringify(auth, null, 2));
    }

    grunt.log.write('Set Site ...').ok();
  });

  // Create a new Test
  grunt.registerTask('createLocalTest', 'Create new local AB-Test', function () {
    var done = this.async();
    if(grunt.option('name') !== undefined) {
      target = path.resolve('tests')+'/'+grunt.option('name');
      //@todo: check if folder already exists
      fse.copy(path.resolve('template/ab-000'), target, err => {
        if (err) return console.error(err)
        grunt.log.ok('Created '+grunt.option('name')+' Test');
        done();
      });
    } else {
      grunt.log.warn('Please defined name of test like --name=ab-081');
      done();
    }
  });

  grunt.registerTask('scrapeLocalTest', 'Scrape the URL of a locally created AB-Test', function() {
    var done = this.async();
    //@todo assert url, name, etc.
    if(grunt.option('name') !== undefined) {
      var testConfiguration = grunt.file.readJSON(path.resolve('tests/'+grunt.option('name')+'/configuration.json'));
      var options = {
        urls: [testConfiguration.url],
        directory: path.resolve('target/'+grunt.option('name')),
      };
      scrape(options).then((result) => {
        grunt.log.write('Scraped...').ok();
        done();
      }).catch((err) => {
        grunt.log.error(err);
        done();
      });
    } else {
      grunt.log.error("no name defined");

    }
    grunt.log.write('AB-Test configured ...').ok();
  });

  // List all local A/B Tests
  grunt.registerTask('listLocalTests', 'List all local AB-Tests', function () {
    // @todo: read metadata from folder
    var done = this.async();
    var amountOfTests = 0;
    var tests = [];

    file.walkSync(path.resolve('tests'), function(callback) {
      var reg = new RegExp('ab-\\d+$');
      if(reg.test(callback)) {
        var testName = path.parse(callback);
        grunt.log.write(testName.name+'\n');
        tests.push(testName.name);
        amountOfTests++;
      }
    });
    if(amountOfTests === 0) {
      grunt.log.write('Unfortunately there are no tests yet configured\n');
    } else {
      grunt.log.write(amountOfTests+' tests configured\n');
    }
    //@todo - do something with this :)
    grunt.config.set('configuredTests', tests);
  });


    // List all A/B Tests
    grunt.registerTask('listTests', 'List all AB-Tests for a site', function () {
      var done = this.async();
      var credentials = grunt.config.get('kameleoonConfiguration')
      var auth = grunt.file.readJSON(credentials);

      var amountOfTests = 0;
      var tests = [];
      var clientPath = 'sites/'+auth['siteCode']+'/experiments';

      client = rest.wrap(pathPrefix, {prefix: grunt.config.get('apiEndPoint')})
      .wrap(mime, { mime: 'application/json'})
      .wrap(defaultRequest, { headers: { 'X-Auth-Key': auth['token'], 'X-Auth-Email': auth['username']} })
      .wrap(errorCode);

      client({method: 'GET', path: clientPath}).then(function (response) {
        var result = response.entity.result.experiments;
        for (var i = 0; i < result.length; i++) {
          grunt.log.write(result[i].id+': ');
          grunt.log.write(result[i].name+'\n');
          amountOfTests++;
        }
        done();
      },
      // error handling
      function (response) {
        grunt.log.error('An error occured');
        grunt.log(response);
        done();
      });
    });


  // Preview local test
  grunt.registerTask('previewLocalTest', 'Preview local AB-Test', function () {
    // Start local server, show files from local file structure and scraped content

  });

  // Publish a previously created Test
  grunt.registerTask('deployTest', 'Deploy an AB-Test', function (name) {
    if(grunt.option('name') !== undefined) {
      // check consistency of variation and folder naming
      var testPath = path.resolve('tests/'+grunt.option('name')+'/configuration.json');
      var testConfiguration = grunt.file.readJSON(testPath);

      var done = this.async();
      var credentials = grunt.config.get('kameleoonConfiguration')
      var auth = grunt.file.readJSON(credentials);

      client = rest.wrap(pathPrefix, {prefix: grunt.config.get('apiEndPoint')})
      .wrap(mime, { mime: 'application/json'})
      .wrap(defaultRequest, { headers: { 'X-Auth-Key': auth['token'], 'X-Auth-Email': auth['username']} })
      .wrap(errorCode);

      if(auth['siteCode'] !== undefined) {
        var clientPath = 'sites/'+auth['siteCode']+'/experiments';
        var data = JSON.parse('{"name":"'+testConfiguration["name"]+'"}');
        client({method: 'POST', path: clientPath, entity: data}).then(function (response) {
          if(testConfiguration['id']) {
            grunt.log.write("Test has been created already. Try to update the test: "+testConfiguration['id']+"\n");
          } else {
            //@todo -update deviations here?
            //console.log(response.entity.result.deviations);
            testConfiguration['id'] = response.entity.result.id;
            testConfiguration['status'] = response.entity.result.status;
            grunt.file.write(testPath, JSON.stringify(testConfiguration, null, 2));
            grunt.log.write('Test deployed: '+testConfiguration['id']+' ').ok();
            grunt.task.run('updateVariations:'+grunt.option('name'));
            done();
          }
        },
        // error handling
        function (response) {
          grunt.log.error('An error occured');
          grunt.log(response);
          done();
        });
      } else {
        grunt.log.write('Please run setSite first').ok();
      }
      grunt.log.write('Deploy AB-Test ...').ok();
    }
  });


  // Update Variation of configured test
  grunt.registerTask('updateVariations', 'Update Variations of test', function () {
    var done = this.async();

    // updateVariations is being executed from deploy task, arguments must include testname
    if(arguments.length > 0) {
      var testID = arguments[0];
      //@todo: check consistency of variation and folder naming
      var testPath = path.resolve('tests/'+testID+'/configuration.json');
      var testConfiguration = grunt.file.readJSON(testPath);
      var credentials = grunt.config.get('kameleoonConfiguration')
      var auth = grunt.file.readJSON(credentials);

      client = rest.wrap(pathPrefix, {prefix: grunt.config.get('apiEndPoint')})
      .wrap(mime, { mime: 'application/json'})
      .wrap(defaultRequest, { headers: { 'X-Auth-Key': auth['token'], 'X-Auth-Email': auth['username']} })
      .wrap(errorCode);
      var clientPath = 'sites/'+auth['siteCode']+'/experiments/'+testConfiguration['id']+'/variations/';

      var target = path.resolve('tests')+'/'+testID;
      var variations = [];

      file.walkSync(target, function(callback) {
        var reg = new RegExp('variation-\\d+$');
        if(reg.test(callback)) {
          var testName = path.parse(callback);
          variations.push(testName.name);
        }
      });

      for (var i = 0; i < variations.length; i++) {
        var variation = path.resolve(target+"/"+variations[i]);
        var cssCode = path.resolve(target+"/"+variations[i]+"/variation.css");
        var jsCode = path.resolve(target+"/"+variations[i]+"/variation.js");
        var js = stringify(grunt.file.read(jsCode));
        var css = stringify(grunt.file.read(cssCode));
        //@todo: variation name
        var data = JSON.parse('{"name": "variation 1", "jsCode": '+js+', "cssCode": '+css+'}');
        client({method: 'POST', path: clientPath, entity: data}).then(function (response) {
          grunt.log.write('Variation created: '+response.entity.result.name+' '+response.entity.result.id+' ').ok();
          done();
        },
        function (response) {
          grunt.log.error('An error occured');
          grunt.log(response);
          done();
        });
      }
    }
  });

  // Get list of all Goals
  grunt.registerTask('listGoals', 'List of all Goals', function () {
    var done = this.async();
    var credentials = grunt.config.get('kameleoonConfiguration')
    var auth = grunt.file.readJSON(credentials);

    client = rest.wrap(pathPrefix, {prefix: grunt.config.get('apiEndPoint')})
    .wrap(mime, { mime: 'application/json'})
    .wrap(defaultRequest, { headers: { 'X-Auth-Key': auth['token'], 'X-Auth-Email': auth['username']} })
    .wrap(errorCode);

    var clientPath = 'sites/'+auth['siteCode']+'/goals';

    client({method: 'GET', path: clientPath}).then(function (response) {
      var goals = response.entity.result.goals || [];
      for (var i = 0; i < goals.length; i++) {
        grunt.log.write(goals[i]['id']+'; '+goals[i]['type']+'; '+goals[i]['name']+'\n');
      }
      done();
    },
    // error handling
    function (response) {
      grunt.log.error('An error occured');
      grunt.log(response);
      done();
    });
    grunt.log.write('List of all Goals ...').ok();
  });


  // Assign Goal to Test
  grunt.registerTask('assignGoal', 'Assign Goal to Test', function () {
    if(grunt.option('goal') !== undefined && grunt.option('name') !== undefined) {
      var done = this.async();
      //@todo: check consistency of variation and folder naming
      var testPath = path.resolve('tests/'+grunt.option('name')+'/configuration.json');
      var testConfiguration = grunt.file.readJSON(testPath);
      var credentials = grunt.config.get('kameleoonConfiguration')
      var auth = grunt.file.readJSON(credentials);

      client = rest.wrap(pathPrefix, {prefix: grunt.config.get('apiEndPoint')})
      .wrap(mime, { mime: 'application/json'})
      .wrap(defaultRequest, { headers: { 'X-Auth-Key': auth['token'], 'X-Auth-Email': auth['username']} })
      .wrap(errorCode);
      var clientPath = 'sites/'+auth['siteCode']+'/experiments/'+testConfiguration['id'];

      var data = JSON.parse('{"kameleoonTracking": true,"goals":["'+grunt.option('goal')+'"]}');
      client({method: 'PUT', path: clientPath, entity: data}).then(function (response) {
        if(response.entity.success) {
          grunt.log.write('Goal '+response.entity.result.goals+' was added to the test');
          // Add to array, if not present yet
          if(testConfiguration['goals'] !== undefined && testConfiguration['goals'].length >= 1) {
            console.log();
            if(!!testConfiguration['goals'].indexOf(response.entity.result.goals[0])) {
              testConfiguration['goals'] = _.union(testConfiguration['goals'], response.entity.result.goals);
            }
          } else {
            testConfiguration['goals'] = response.entity.result.goals;
          }
          grunt.file.write(testPath, JSON.stringify(testConfiguration, null, 2));
        } else {
          grunt.log.error('An error occured');
        }
        done();
      },
      function (response) {
        grunt.log.error('An error occured');
        grunt.log(response);
        done();
      });
    }
  });

  // Delete a local test
  grunt.registerTask('deleteLocalTest', 'Delete a local AB-Test', function () {
    if(grunt.option('name') !== undefined) {
      var folder = path.resolve('tests/'+grunt.option('name'));
      if(grunt.file.exists(folder)) {
        grunt.file.delete(folder);
        grunt.log.write(grunt.option('name')+' AB-Test deleted').ok();
      } else {
        grunt.log.error('The AB-Test by the name of '+grunt.option('name')+' does not seem to exist');
      }
    }
  });

  // Delete a remote test - it's permanent, be careful
  grunt.registerTask('deleteTest', 'Delete a remote AB-Test', function () {
    var done = this.async();
    var testID = grunt.option('id');
    if(testID !== undefined) {
      var credentials = grunt.config.get('kameleoonConfiguration')
      var auth = grunt.file.readJSON(credentials);

      if(auth['siteCode'] !== undefined) {
        var clientPath = 'sites/'+auth['siteCode']+'/experiments/'+testID;

        client = rest.wrap(pathPrefix, {prefix: grunt.config.get('apiEndPoint')})
        .wrap(mime, { mime: 'application/json'})
        .wrap(defaultRequest, { headers: { 'X-Auth-Key': auth['token'], 'X-Auth-Email': auth['username']} })
        .wrap(errorCode);

        client({method: 'DELETE', path: clientPath}).then(function (response) {
          if(response.entity.success) {
            grunt.log.write('Deleted AB-Test '+testID+' ').ok();
          }
          done();
        },
        // error handling
        function (response) {
          grunt.log.error('An error occured');
          grunt.log(response);
          done();
        });
      }
    } else {
      grunt.log.error('Please provide an ID, for the test that should be deleted');
    }
  });

  // Update Test
  grunt.registerTask('updateTest', ' Update AB-Test', function () {
    // Update from folder structure
    // Check if already online, if not -> createtest
    // maybe with flags? - Pause, Stop, Segment
    grunt.log.write('Update an AB-Test ...').ok();
  });

  // Experiment Results
  grunt.registerTask('experimentResults', 'Get result for an Experiment', function (testID) {
      var done = this.async();
      var testID = grunt.option('id');
      if(testID !== undefined) {
        var credentials = grunt.config.get('kameleoonConfiguration')
        var auth = grunt.file.readJSON(credentials);

        if(auth['siteCode'] !== undefined) {
          var interval = 'day';
          if(grunt.option('interval')) {
            interval = grunt.option('interval');
          }

          var clientPath = 'sites/'+auth['siteCode']+'/experiments/'+testID+'/result?interval='+interval;
          client = rest.wrap(pathPrefix, {prefix: grunt.config.get('apiEndPoint')})
          .wrap(mime, { mime: 'application/json'})
          .wrap(defaultRequest, { headers: { 'X-Auth-Key': auth['token'], 'X-Auth-Email': auth['username']} })
          .wrap(errorCode);

          client({method: 'GET', path: clientPath}).then(function (response) {
            //@todo: Get experiments results not finished
            // Some basic results, winner version
            console.log(response.entity);
            grunt.log.write('Get results for an experiment ...').ok();
            done();
          },
          // error handling
          function (response) {
            grunt.log.error('An error occured');
            grunt.log(response);
            done();
          });
        }
      } else {
        grunt.log.error('Please provide a test ID, for your results - maybe use grunt listTests before?');
      }
  });

  // Login to Kameleoon
  grunt.registerTask('default', 'Default', function() {
    var kameleoon = "";
    kameleoon += "                                                                      \n \
                                   .*///////////*.                                      \n \
                              .//////////////////////*                                  \n \
                    .///, .//////////////////////////////                               \n \
                  ,////////////////////////////////////////.                            \n \
                 *////////////// ,///// /////////////////////                           \n \
               //////////////*////// //*/////////*/////////////                         \n \
              //////////////////////*///*////// ////////////////                        \n \
              //////////////////////////      ,////  ////////////.                      \n \
              ///////////           ////   //////..       ////////*                     \n \
             *///////          .*/////*/////////////////////*. ////*                    \n \
               //         ,/////                     ///////////////                    \n \
                      *//                          ///     ///*///////,                 \n \
                   ./                             ///    ..  //    //////,              \n \
                 /                                //    /// ///    //* /////.           \n \
               /                                  ///    /////    .//    /////.         \n \
                                                   ///           *//       /////        \n \
                                                     ///*.   .,////          ////,      \n \
                                                       /////////               ////     \n \
                                                                                ////    \n \
                                                                                 ///    \n \
                                                                                 ///    \n \
                                                                                 //     \n \
                                                                                 //     \n \
                                                                                //      \n \
                                                                                //      \n \
                                                                               //       \n \
                                                                              ///       \n \
                                                                             //         \n \
                                                                            //          \n \
                                                                           /            \n \
                                                                          /             \n \
    ";
    grunt.log.write(kameleoon);
    grunt.log.write('Please choose one of the registered tasks: authentication, createTest, assignGoal, deleteTest, updateTest or experimentResults');
  });

};
