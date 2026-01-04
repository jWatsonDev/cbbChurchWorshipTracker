param location string
param storageName string
param enableStaticWebsite bool = true
param indexDocument string = 'index.html'
param errorDocument string = '404.html'
param createTables array = []

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
    supportsHttpsTrafficOnly: true
  }
}

resource blob 'Microsoft.Storage/storageAccounts/blobServices@2019-06-01' = {
  name: '${storage.name}/default'
  properties: {}
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-01-01' = {
  name: '${storage.name}/default'
}

resource tables 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-01-01' = [for t in createTables: {
  name: '${storage.name}/default/${t}'
  dependsOn: [tableService]
}]

var storageKeys = listKeys(storage.id, '2023-01-01').keys
var primaryKey = storageKeys[0].value
var connectionString = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${primaryKey};EndpointSuffix=${environment().suffixes.storage}'

output staticWebsiteUrl string = enableStaticWebsite ? storage.properties.primaryEndpoints.web : ''
output connectionStringOut string = connectionString
output storageAccountName string = storage.name
