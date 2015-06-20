Package.describe({
  name: 'pbastowski:rest-service',
  version: '0.0.2',
  summary: 'RestCall annotations for angular2-now',
  git: '',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');
  api.use('pbastowski:angular-babel@0.1.5');
  api.use('pbastowski:angular2-now@0.2.8');
  api.addFiles('rest-service.es6.js', ['client']);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('rest-service.es6.js');
  api.addFiles('rest-service-tests.js');
});
