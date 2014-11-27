var fs = require( 'fs' );
var yaml = require( 'js-yaml' );
var Promise = require('promise');
var mkpath = require('mkpath');

var fixConfig = {
  jekyllDir:__dirname + '/../../',
  inputDir: __dirname + '/../../_org_posts/',
  pluginDir: __dirname + '/plugins/',
  baseUrl: 'http://www.leggetter.co.uk',
  postDir: '_posts/', // relative to jekyllDir
  postEncoding: 'utf-8'
};

// Detect plugins to run
var plugins = [];
var pluginsToLoad = 0;
var pluginsLoaded = 0;

function loadPlugins() {

  fs.readdir( fixConfig.pluginDir, function( err, files ) {
    if( err ) {
      throw err;
    }

    console.log( 'Plugins:', files );
    pluginsToLoad = files.length;

    var pluginDefinition;
    files.forEach( function( pluginFile ) {
      if( pluginFile.indexOf( '_' ) === 0 ) {
        --pluginsToLoad;
      }
      else {
        pluginDefinition = require( fixConfig.pluginDir + pluginFile );
        plugins.push( new pluginDefinition() );
        ++pluginsLoaded;
      }
      console.log( 'Loaded %d of %d plugins', pluginsLoaded, pluginsToLoad );

      if( pluginsToLoad === pluginsLoaded ) {
        loadPosts();
      }
    } );

  } );

}

var filesToProcess = 0;
function loadPosts() {
  // Detect files to process

  // Loop each post
  fs.readdir( fixConfig.inputDir, function( err, files ) {
    if( err ) {
      throw err;
    }

    console.log( files );
    filesToProcess = files.length;

    files.forEach( loadFile );
  } );
}

var pendingPosts = [];

function loadFile( fileName ) {
  var fullFilePath = fixConfig.inputDir + fileName;
  fs.readFile( fullFilePath, { encoding: fixConfig.postEncoding }, function ( err, data ) {
    if (err) {
      throw err;
    }

    var post = {
      outputDir: fixConfig.postDir,
      fileName: fileName,
      config: null,
      content: null
    };

    var yamlPattern = /-{3}([\s\S]*?)-{3}([\s\S]*)/m;
    var match = yamlPattern.exec( data );
    var yamlMatch = match[ 1 ];
    // console.log( yamlMatch );
    post.config = yaml.safeLoad( yamlMatch );
    // console.log( post.config );

    post.content = match[ 2 ];
    console.log( post.content.substr( 0, 100 ) );

    pendingPosts.push( post );

    console.log( 'Loaded %d of %d posts', pendingPosts.length, filesToProcess );
    if ( pendingPosts.length == filesToProcess ) {
      processPending( pendingPosts.slice() );
    }

  } );
}

function processPending( posts ) {

  var total = pendingPosts.length;
  var current = ( total - posts.length );
  console.log( 'Processing %d of %d posts', current, total );

  if( posts.length === 0 ) {
    saveResults();
  }
  else {

    var post = posts.shift();
    var pluginExecutions = [];

    // Execute each plugin on the post
    plugins.forEach( function( plugin ) {

      pluginExecutions.push( executePlugin(
        plugin, fixConfig, post
      ) );

    } );

    Promise.all( pluginExecutions ).then( function() {
      // All plugins have executed, execute on the next post in the queue
      processPending( posts );
    } ).catch( function( e ) {
      console.error( e );
    } );

  }

}

function executePlugin( plugin, fixConfig, post ) {

  var promise = new Promise( function(fulfill, reject) {

    console.log( '---------------------------------------\n' );
    plugin.process( fixConfig, post, {
      success: function( post ) {
        console.log( 'success' );
        fulfill( post );
      },
      fail: function() {
        console.log( 'fail' );
        reject();
      }
    } );

  });

  return promise;
}

function saveResults() {
  pendingPosts.forEach( savePost );
}

function savePost( post ) {

  var fileText = '---\n';
  fileText += yaml.safeDump( post.config );
  fileText += '---\n';
  fileText += post.content;

  var outputDir = fixConfig.jekyllDir + post.outputDir;

  mkpath.sync( outputDir );

  var outputFilePath = outputDir + post.fileName;

  console.log( 'Saving', outputFilePath );
  fs.writeFile( outputFilePath, fileText, function (err) {
    if (err) {
      throw err;
    }
  } );

}

loadPlugins();
