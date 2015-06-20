var ng2nRestCall = function () {
    // Get $http and $log from angular
    var $http = angular.injector(['ng']).get('$http');
    var $q = angular.injector(['ng']).get('$q');
    var $log = angular.injector(['ng']).get('$log');

    /**
     * restConfig sets the global options for rest calls annotated with @RestCall.
     * These options can be overridden by using the options argument in the RestCall itself.
     *
     * - baseUrl        string = for example '/rest/'
     * - method         string = 'GET', 'PUT', 'POST', 'DELETE', 'UPDATE' are valid, 'GET' is default
     * - jsonPrefix     string = optional JSON vulnerability prefix to automatically remove from returned data
     * - showError      truthy = show the error dialog, falsy = don't show it
     * - ignoreErrors   array  = error/status codes to pass through to the caller and not handle
     * - errorHandler   string = angular service name or function to call when an $HTTP error occurs.
     *                  Receives the following object as an argument: { data: {}, api: "", method: "", payload: {}, options: {} }
     * - errorMessage   string = custom error message to display at the top of the error dialog's text
     * - spinner        object = exposes show() and hide() methods
     * - events         object = exposes beforeCall() and afterCall(), which will be called before and after the ajax call
     */

    var restOptions = {
        baseUrl:      '',
        method:       'GET',
        jsonPrefix:   '',
        showError:    1,
        ignoreErrors: [],
        errorHandler: '',
        errorMessage: '',
        spinner:      {show: angular.noop, hide: angular.noop},
        events:       {beforeCall: angular.noop, afterCall: angular.noop}
    };

    var currentModule = ("undefined" !== typeof angular2now) ? angular2now.options().currentModule : '';

    function restConfig(options) {
        angular.merge(restOptions, options);
    }

    function RestCall(apiTemplate, _options) {
        var options = angular.merge({}, restOptions, _options);
        var spinner = options.spinner || restOptions.spinner;
        var events = options.events || restOptions.events;

        return function (target, name, descriptor) {

            target[name] = function () {
                var api = apiTemplate;
                var REGEX = /\${(\w+)}/g;

                if (currentModule && typeof spinner === 'string') {
                    spinner = angular.injector(['ng', currentModule]).get(spinner);
                    options.spinner = spinner;
                }

                var args = Array.prototype.slice.call(arguments);

                // Get parameter names from apiTemplate
                var apiArgs = apiTemplate.match(REGEX) || [];

                // Interpolate the parameters in the apiTemplate
                apiArgs.forEach(function (name, index) {
                    api = api.replace(name, args[index]);
                });
                args.splice(0, apiArgs.length);

                spinner.show();

                events.beforeCall();  // Call optional events.beforeCall()

                // todo: should call Meteor after resolution of promise returned by beforeCall()
                // Call the restService
                var promise = restService(api, options.method, args[0], options);

                // Do post call tasks
                promise.finally(function () {
                    spinner.hide();

                    events.afterCall(); // Call optional events.afterCall()
                });

                return promise;

            };

            return target;
        };
    }

    function restService(api, method, args, _options) {
        var options = angular.merge({}, restOptions, _options);
        var that = this;

        //$log.log('restService: options: ', options);

        if (!checkParameters()) return;

        // Call the REST API
        var pr = $http({
            url:               options.baseUrl + api,
            data:              args,
            method:            method,
            transformResponse: function (data) {
                return stripJsonVulnerabilityPrefix(data, options.jsonPrefix);
            }
        }).then(success, errorHandler);

        return pr;

        function checkParameters() {
            if (!angular.isString(api))
                throw new Error('restService: api parameter empty');

            // UPPER CASE and trim method name, for doing comparisons
            method = (method || '').toUpperCase().trim();

            // Default method is GET.
            if (!method) method = 'GET';

            // Only GET, POST, DELETE, UPDATE and PUT are allowed
            if (!/^(GET|POST|DELETE|UPDATE|PUT)$/.test(method))
                return false;

            // All is good, parameter checks passed.
            return true;
        }

        function success(data) {
            return data.data;
        }

        // global API failure handler
        function errorHandler(data) {

            if (options.errorHandler) {

                // Get instance of errorHandler service, if errorHandler was a string
                if (currentModule && typeof options.errorHandler === 'string') {
                    var inj = angular.injector(['ng', currentModule]);
                    if (inj.has(options.errorHandler))
                        options.errorHandler = inj.get(options.errorHandler);
                }

                options.errorHandler({data: data, api: api, method: method, payload: args, options: options});
            }
            else {

                // Status code 400 is now actually a data validation error, so, no default messages for it any more.
                // Perhaps, one day it may be moved to the success side of the equation and passed in as an error object.
                // see: http://stackoverflow.com/questions/3290182/rest-http-status-codes-for-failed-validation-or-invalid-duplicate
                if (data.status !== 400) {

                    var er = 'An unexpected error was encountered. The details are below.\n\n';

                    // 404 = not found (ex: API method does not exist)
                    if (data.status === 404) er = 'Method ' + api + ' does not exist.\n\n';
                    // 403 = forbidden (ex: user already logged in, so, can't log in again)
                    if (data.status === 403) er = 'Method ' + api + ' is not allowed in this context.\n\n';
                    // 401 = authorization required (ex: logout when logged out already)
                    if (data.status === 401) er = 'Method ' + api + ' requires authorization.\n\n';

                    // log the error, showing the submitted data and the returned data
                    $log.warn('Error: ', method, api, '\n', args, '\n', data.data);

                    if (options.showError && !(options.ignoreErrors && options.ignoreErrors.indexOf(data.status) > -1)) {
                        // handle options.ignoreErrors array, if present
                        alert([
                            (options.errorMsg ? options.errorMsg + '\n' : ''),
                            er,
                            'Status code: ' + data.status + '\n\n',
                            (data.data ? JSON.stringify(data.data) : '')
                        ].join(''));
                    }
                }
            }

            // Reject using a new promise. Otherwise, if we just return data, it will come in through
            // the success side of the chain.
            return $q.reject(data);
        }

        function stripJsonVulnerabilityPrefix(data, jsonPrefix) {
            if (jsonPrefix && 'string' === typeof data) {
                // Remove the leading JSON vulnerability prefix
                if (data.indexOf(jsonPrefix) > -1)
                    data = angular.fromJson(data.slice(8));
            }
            return data;
        }
    }

    return {
        restConfig: restConfig,
        RestCall:   RestCall
    };

}();

// Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ng2nRestCall;
}

// AMD / RequireJS
else if (typeof define !== 'undefined' && define.amd) {
    define('ng2nRestCall', [], function () {
        return ng2nRestCall;
    });
}

// included directly
else {
    this.ng2nRestCall = ng2nRestCall;
}