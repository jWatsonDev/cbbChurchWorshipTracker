param namePrefix string
param location string = resourceGroup().location
@secure()
param jwtSecret string = 'change-me'
param jwtExpiresIn string = '15m'

var suffix = toLower(substring(uniqueString(resourceGroup().id), 0, 8))
var staticStorageName = toLower('${namePrefix}st${suffix}')
var functionAppName = toLower('${namePrefix}-func-${suffix}')
var appInsightsName = toLower('${namePrefix}-ai-${suffix}')

module staticStorage 'modules/storage.bicep' = {
  name: 'staticStorage'
  params: {
    location: location
    storageName: staticStorageName
    enableStaticWebsite: true
    indexDocument: 'index.html'
    errorDocument: '404.html'
    createTables: [ 'Songs' ]
  }
}

module functionApp 'modules/functionapp.bicep' = {
  name: 'functionApp'
  params: {
    location: location
    functionAppName: functionAppName
    storageAccountName: staticStorageName
    appInsightsName: appInsightsName
    tableConnectionString: staticStorage.outputs.connectionStringOut
    jwtSecret: jwtSecret
    jwtExpiresIn: jwtExpiresIn
    allowedOrigins: [
      'https://${staticStorageName}.z13.web.${environment().suffixes.storage}'
      'http://localhost:4200'
      'http://localhost:4280'
    ]
  }
}

output staticSiteUrl string = staticStorage.outputs.staticWebsiteUrl
output staticStorageConnection string = staticStorage.outputs.connectionStringOut
output tableStorageAccount string = staticStorage.outputs.storageAccountName
output functionAppUrl string = 'https://${functionApp.outputs.functionAppHostname}'
output functionAppName string = functionApp.outputs.functionAppNameOut
