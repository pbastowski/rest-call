# RestCall annotations for angular2-now

This package exports `restConfig` (function) and `RestCall` (annotation), which you can use together with angular2-now to easily create methods that make calls to REST/Ajax data sources.

## Installation

    meteor add pbastowski:rest-call
    
## Usage

In the JavaScript (ES6) file where you define your bootstrap class or where you configure angular2now.options() do this:

```javascript
import {restConfig} from 'ng2nRestCall';

restConfig({
    baseUrl: 'http://jsonplaceholder.typicode.com/',
    spinner: {
        show: function () { document.body.style.background = 'yellow'; },
        hide: function () { document.body.style.background = ''; }
    },
    events:  {
        beforeCall: () => console.log('< BEFORE call'),
        afterCall:  () => console.log('> AFTER call'),
    }
});

```

> Note that `spinner` and `events` are optional and only shown above to demonstrate how to use them, should you want to.

Now, define some REST methods by annotating stub methods in a class, and then call them:

```javascript
import {RestCall} from 'ng2nRestCall';

class myComponent {

    constructor() {

        this.getUser(this.userid).then(data => {
            console.log('original user record:\n', data);

            // Update the user's name
            this.updateUser(1, {name: 'John Citizen'}).then(data => {
                console.log('udpated record:\n', data);
            });
        });
    }

    @RestCall('users/${user}')
    getUser() {
    }

    @RestCall('users/${user}', {method: 'PUT'})
    updateUser() {
    }

}
```

When the above class is instantiated, its constructor will make the calls to the getUser() and updateUser() methods.


## API

### `restConfig`( options ) - function

The `options` argument is an object that may contain the following attributes. These options can be overridden by using the options argument in the RestCall itself.

Attribute | Description
---------------|------------------------------------
baseUrl      | string = for example '/rest/'
method       | string = 'GET', 'PUT', 'POST', 'DELETE', 'UPDATE' are valid, 'GET' is default
jsonPrefix   | string = optional JSON vulnerability prefix to automatically remove from returned data
showError    | truthy = show the error dialog, falsy = don't show it
ignoreErrors | array  = error/status codes to pass through to the caller and not handle
errorHandler | string = angular service name or function to call when an $HTTP error occurs. There is a default handler already, so, it is not necessary to provide one.<br> `errorHandler` receives the following object as an argument: { `data`: {}, `api`: "", `method`: "", `payload`: {}, `options`: {}, `args`: {all the arguments passed to the method decorated with @RestCall} }
errorMessage | string = custom error message to display at the top of the error dialog's text
spinner      | object = exposes show() and hide() methods
events       | object = exposes beforeCall() and afterCall(), which will be called before and after the ajax call
headers      | object, custom XHR header, for example { 'Content-Type': 'application/x-www-form-urlencoded' }


### `@RestCall`( apiUrl, ?options) - decorator

Use it to annotate stub methods in your class. The stub method must follow this pattern:
 
```javascript
class myClass {
    getUser() {}
}
```

Name the stub method after the function that your REST call is expected to perform. The annotation will replace the stub with an actual function that will perform the call to the rest/ajax end-point and return a promise to the data (or error) returned.

#### `apiUrl` 
It is the url or the REST api that you actually want to call, such as "users/1". apiUrl may contain replaceable parameters like `${arg1}`, which will be replaced with actual values that you will pass in as an argument when you call the method iek this:

     getUser(1);

Multiple replaceable parameters can exist, such as `/member/${dept}/holiday/${holiday}`. 

    @RestCall('/member/${dept}/holiday/${holiday}')
    getMembersHoliday() {}

When calling the method, make sure to provide one argument per replaceable parameter.

    getMembersHoliday( 'john', 2 )

If using a 'PUT' or 'POST' method, the payload is passed in last, after all the arguments.

The method definition

    @RestCall('/member/${dept}/holiday/${holiday}', { method: 'PUT' })
    updateMemberHoliday() {}

And here is how to call it, passing a payload as an object

    updateMemberHoliday( 'john', 2, { startDate: '2016-01-01' })

#### `options`
`options` is optional. This argument allows you to override the global options defined with `restConfig`. It takes the same `options` argument as `restConfig`.

### Using a custom error handler 

There is a default error handler provided by this package, so, it is not necessary to provide a custom one. However, in most cases you'll want to provide your own global handler that manages errors the way you need to and displays messages in the way you find aesthetically pleasing. 

To that end, the `errorHandler` property of the `options` argument to `@RestCall` allows us to specify a custom global error handler, which will replace the default one provided with this package. `errorHandler` can be either a function or the name of a service.

When an `$http` error occurs, your error handler will be called with one argument injected, which contains the following properties:

Argument | Description
---------|------------
data | The response received by the $http call
api | The `apiUrl` you passed to @RestCall
method | The `method` you passed to @RestCall
payload | The data object you passed when you called the function annotated with @RestCall
options | The local `options` argument, or the global one if no local one was supplied
args | All the arguments passed to the method decorated with @RestCall. This includes the `payload` and also any query parameters that were interpolated in your `apiUrl`.
