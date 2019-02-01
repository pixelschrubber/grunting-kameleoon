# Grunting Kameleoon
Making use of the kameleoon REST API in order to build a local test stack with deployment to kameleoon. With this grunt taskrunner, you will be able to use the REST API of Kameleoon in order to automate your testworkflow.

## Installation:

1. Checkout this repository
2. npm install
3. grunt
4. Follow instructions

## Using the tasks

You will need to add your Kameleoon credentials within the kameleoon-configuration.json file first.

`grunt`
- Default task will print some fancy ascii art, provided by @Blubbie - also thanks for inspiration and ideas!

`grunt authentication`
- Create the authentication token, which is valid for 1 hour. If you repeat within that timeframe, no new token should be created
- The token will be saved into kameleoon-configuration automatically and used in the single tasks from there

`grunt listSites`
- Get all sites, which are configured in the account

`grunt setSite`
- Set a site for the current setup, this will be saved into kameleoon-configuration automatically

`grunt previewLocalTest`
- Almost finished. Start a local server, with content from scrapeLocalTest

`injectTestAssets`
- This task is being called by scrapeLocalTest in order to insert js and css for the local preview and generating the variations as static files

`deleteLocalTest`
- delete a local test, provide name as param

`deleteTest`
- delete a remote test, provide id as param

`updateTest`
- not finished yet, should be used to update an already deployed test

`experimentResults`
- not finished yet, should be used to get some basic stats

`grunt listLocalTests`
- This function will show all locally created tests (not the one, that are within the account)

`grunt createLocalTest`
- This function will create a new test from a template, which is in the folder /template/
- Option --name is mandatory, the name will be used to set up a new folder under the /template/ folder
- After setting up the test, one should set the URL and name for it within the configuration.json in the test folder

`grunt scrapeLocalTest`
- The URL provided in the configuration.json will be used to scrape the page, this will be saved under the /target/ folder, the name will match the testname again

`grunt deployTest`
- This method will deploy a locally created test to the kameleoon back-office. Within the task the method updateVariations will be called to set the css and js files from the local test

`grunt assignGoal`
- Provide a param name and at least one param goal

`grunt listGoals`
- Get a list of all goals associated to the selected site. grunt setSite must be called at least one time beforehand.
