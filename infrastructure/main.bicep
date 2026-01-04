param namePrefix string
param location string = resourceGroup().location
@secure()
param jwtSecret string = 'change-me'
param jwtExpiresIn string = '15m'
param imageTag string = 'latest'

var suffix = toLower(substring(uniqueString(resourceGroup().id), 0, 8))
var staticStorageName = toLower('${namePrefix}st${suffix}')
var acrName = toLower('${namePrefix}acr${suffix}')
var containerGroupName = toLower('${namePrefix}-api-${suffix}')
var dnsLabel = toLower('${namePrefix}-api-${suffix}')
var uiContainerGroupName = toLower('${namePrefix}-ui-${suffix}')
var uiDnsLabel = toLower('${namePrefix}-ui-${suffix}')

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

module acr 'modules/acr.bicep' = {
  name: 'acr'
  params: {
    location: location
    registryName: acrName
  }
}

module containerInstance 'modules/aci.bicep' = {
  name: 'containerInstance'
  params: {
    location: location
    containerGroupName: containerGroupName
    dnsNameLabel: dnsLabel
    acrName: acrName
    imageTag: imageTag
    tableConnectionString: staticStorage.outputs.connectionStringOut
    jwtSecret: jwtSecret
    jwtExpiresIn: jwtExpiresIn
  }
  dependsOn: [staticStorage, acr]
}

module uiContainerInstance 'modules/aci-ui.bicep' = {
  name: 'uiContainerInstance'
  params: {
    location: location
    containerGroupName: uiContainerGroupName
    dnsNameLabel: uiDnsLabel
    acrName: acrName
    imageTag: imageTag
  }
  dependsOn: [acr]
}

output staticSiteUrl string = staticStorage.outputs.staticWebsiteUrl
output staticStorageConnection string = staticStorage.outputs.connectionStringOut
output tableStorageAccount string = staticStorage.outputs.storageAccountName
output apiUrl string = 'http://${containerInstance.outputs.fqdn}:3000'
output uiUrl string = 'http://${uiContainerInstance.outputs.fqdn}'
output acrLoginServer string = acr.outputs.loginServer
output acrName string = acr.outputs.registryName
