param location string
param functionAppName string
param storageAccountName string
param appInsightsName string
param tableConnectionString string
param runtime string = 'node'

var storageKeys = listKeys(resourceId('Microsoft.Storage/storageAccounts', storageAccountName), '2023-01-01').keys
var storageKey = storageKeys[0].value
var azureWebJobsStorage = 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${functionAppName}-plan'
  location: location
  kind: 'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

resource app 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: azureWebJobsStorage
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: azureWebJobsStorage
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(replace(functionAppName, '-', ''))
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: runtime
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: insights.properties.InstrumentationKey
        }
        {
          name: 'SongsStorage__ConnectionString'
          value: tableConnectionString
        }
      ]
    }
  }
  dependsOn: [plan, insights]
}

output functionAppNameOut string = app.name
output functionAppHostname string = app.properties.defaultHostName
output appInsightsId string = insights.id
