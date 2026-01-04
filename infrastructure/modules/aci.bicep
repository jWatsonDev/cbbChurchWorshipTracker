param location string
param containerGroupName string
param dnsNameLabel string
param acrName string
param imageTag string = 'latest'
@secure()
param tableConnectionString string
@secure()
param jwtSecret string
param jwtExpiresIn string = '15m'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

var acrPassword = acr.listCredentials().passwords[0].value

resource containerGroup 'Microsoft.ContainerInstance/containerGroups@2023-05-01' = {
  name: containerGroupName
  location: location
  properties: {
    containers: [
      {
        name: 'api'
        properties: {
          image: '${acr.properties.loginServer}/cbbchurch-api:${imageTag}'
          ports: [
            {
              port: 3000
              protocol: 'TCP'
            }
          ]
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 1
            }
          }
          environmentVariables: [
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'TABLE_CONN'
              secureValue: tableConnectionString
            }
            {
              name: 'JWT_SECRET'
              secureValue: jwtSecret
            }
            {
              name: 'JWT_EXPIRES_IN'
              value: jwtExpiresIn
            }
          ]
        }
      }
    ]
    osType: 'Linux'
    restartPolicy: 'Always'
    ipAddress: {
      type: 'Public'
      dnsNameLabel: dnsNameLabel
      ports: [
        {
          port: 3000
          protocol: 'TCP'
        }
      ]
    }
    imageRegistryCredentials: [
      {
        server: acr.properties.loginServer
        username: acr.listCredentials().username
        password: acrPassword
      }
    ]
  }
}

output fqdn string = containerGroup.properties.ipAddress.fqdn
output ipAddress string = containerGroup.properties.ipAddress.ip
