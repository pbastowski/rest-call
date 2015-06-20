# RestCall annotations for angular2-now

This package adds the RestConfig and RestCall annotations, which you can use together with angular2-now.

### @RestConfig( options )

The options argument may contain the following attributes, whose defaults are shown below.

```javascript
{
    baseUrl:      '', // this is the base url that will get prefixed to each call
    jsonPrefix:   '', // this will get stripped out from the returned data - see JSON vulnerability
    showError:    1,  // truthy = show caught errors, such as 404, using alert(), falsy = don't show errors
    ignoreErrors: [], // push error numbers here, 401 or 403 or 404, which you don't want to be handled automatically 
    method:       'GET',
    spinner:      angular2now.options().spinner,
}
```


## Installation

    meteor add pbastowski:rest-service
    
## Usage

In your module where you define your bootstrap class do this:

```javascript
import {RectConfig, RestCall} from 'ng2nRestCall';

@RestConfig({
    baseUrl:  '/rest/',
    jsonPrefix: 'for(;;);'
})

class myApp {
    ...
}
```

Then, in another class, where you want to define some REST calls do this:

```javascript
import {RestCall} from 'ng2nRestCall';

class myComponent {

    constructor() {
        
        // Retrieve the user with ID 1
        this.getUser(1).then(user => { 
            this.user = user; 
            console.log('user: ', user); 
            
            // Update this user's name to 
            this.updateUser(1, {name: this.user.name + '***' });
        });
        
    }

    // Defines a stub that 
    @RestCall('users/${id}')
    getUsers () {}

    @RestCall('users/${id}', {method: 'PUT'})
    updateUser () {}

}
```

