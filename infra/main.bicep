// Zenetic Learning Hub: everything the app needs, deployed into one existing resource group.
// Resource-group scope on purpose: everything stays in the project's resource group.
targetScope = 'resourceGroup'

@description('azd environment name')
param environmentName string
param location string = resourceGroup().location
@description('Existing Foundry (AIServices) account in this resource group that serves Claude')
param foundryAccountName string
@description('Container image. azd fills this in after the first deploy; the placeholder listens on 8080 like the app.')
param webImage string
@description('0 = scale to zero when idle (cheapest). Set to 1 for demo day so the first click is instant.')
param minReplicas int = 0
@description('The deploying user (azd fills it in): may upload files to the videos container, e.g. the sample videos.')
param principalId string = ''
@secure()
@description('LiveAvatar API key for the video avatar in practice visits (from the azd env). Empty = avatar off, visits are typed.')
param liveAvatarApiKey string = ''
@description('"1" = LiveAvatar sandbox (free, stock avatar, 1-minute sessions); "0" = production (uses credits, needs liveAvatarAvatarId)')
param liveAvatarSandbox string = '1'
@description('LiveAvatar avatar ID used outside sandbox')
param liveAvatarAvatarId string = ''
@description('Longest avatar session in seconds outside sandbox (the LiveAvatar plan sets the ceiling)')
param liveAvatarMaxSeconds string = '900'
@description('Live video avatar provider: "liveavatar" (HeyGen, credits) or "azure" (Azure AI Speech on the Foundry resource, pay per use)')
param avatarProvider string = 'liveavatar'
@description('Azure stock avatar and voices (used when avatarProvider is "azure"; empty = the app defaults)')
param azureAvatarCharacter string = ''
param azureAvatarStyle string = ''
param azureAvatarVoiceEn string = ''
param azureAvatarVoiceEs string = ''
@description('"vasa-1" or "vasa-2" for a photo avatar (e.g. george with vasa-2); empty for full-length stock avatars')
param azureAvatarPhotoModel string = ''
@secure()
@description('Demo access code (keeps a public link from spending AI credits). Comes from the azd env, never from a file in git.')
param demoAccessCode string

var suffix = uniqueString(resourceGroup().id, environmentName)
var tags = {
  project: 'zenetic-elearning'
  owner: 'michael'
  env: 'prototype'
  'azd-env-name': environmentName
}

// Built-in role definition IDs
var acrPullRole = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var foundryUserRole = '53ca6127-db72-4b80-b1b0-d745d6d5456d'
var cosmosDataContributor = '00000000-0000-0000-0000-000000000002' // Cosmos DB Built-in Data Contributor (data plane)
var blobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'   // Storage Blob Data Contributor

// --- Identity the app runs as (no keys anywhere) ---
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-zenetic-elearning'
  location: location
  tags: tags
}

// --- Logs ---
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-zenetic-elearning'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// --- Container registry: azd builds the image here (remote build) ---
resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'crzenetic${suffix}'
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

resource registryPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, acrPullRole)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRole)
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// --- Cosmos DB serverless: the demo state document ---
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: 'cosmos-zenetic-${suffix}'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [ { locationName: location, failoverPriority: 0 } ]
    capabilities: [ { name: 'EnableServerless' } ]
    disableLocalAuth: true // Entra ID only, no account keys
    minimalTlsVersion: 'Tls12'
  }
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: 'learninghub'
  properties: { resource: { id: 'learninghub' } }
}

resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDb
  name: 'state'
  properties: {
    resource: {
      id: 'state'
      partitionKey: { paths: [ '/id' ], kind: 'Hash' }
    }
  }
}

resource cosmosAccess 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmos
  name: guid(cosmos.id, identity.id, cosmosDataContributor)
  properties: {
    roleDefinitionId: '${cosmos.id}/sqlRoleDefinitions/${cosmosDataContributor}'
    principalId: identity.properties.principalId
    scope: cosmos.id
  }
}

// --- Blob Storage: videos uploaded by creators (public read, like the Supabase bucket on Vercel) ---
// The browser uploads straight here with a 15-minute, create-only URL signed by the app's identity (no keys).
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'stzenetic${suffix}'
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    allowBlobPublicAccess: true   // only the "videos" container is public; nothing else is
    allowSharedKeyAccess: false   // Entra ID only
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: [ 'https://ca-zenetic-learninghub.${containerEnv.properties.defaultDomain}' ]
          allowedMethods: [ 'PUT', 'HEAD', 'GET', 'OPTIONS' ]
          allowedHeaders: [ '*' ]
          exposedHeaders: [ '*' ]
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource videos 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'videos'
  properties: { publicAccess: 'Blob' }   // read a file by its exact URL; listing is not allowed
}

resource storageAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, identity.id, blobDataContributor)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributor)
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageAccessDeployer 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(principalId)) {
  name: guid(storage.id, principalId, blobDataContributor)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributor)
    principalId: principalId
    principalType: 'User'
  }
}

// --- Let the app call Claude on the existing Foundry account ---
resource foundry 'Microsoft.CognitiveServices/accounts@2025-06-01' existing = {
  name: foundryAccountName
}

resource foundryAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, identity.id, foundryUserRole)
  scope: foundry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', foundryUserRole)
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// --- Container Apps ---
resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-zenetic-elearning'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-zenetic-learninghub'
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
      }
      registries: [ { server: registry.properties.loginServer, identity: identity.id } ]
      secrets: concat([ { name: 'demo-access-code', value: demoAccessCode } ],
        empty(liveAvatarApiKey) ? [] : [ { name: 'liveavatar-api-key', value: liveAvatarApiKey } ])
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: concat([
            { name: 'PORT', value: '8080' }
            { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
            { name: 'ANTHROPIC_FOUNDRY_RESOURCE', value: foundryAccountName }
            { name: 'COSMOS_ENDPOINT', value: cosmos.properties.documentEndpoint }
            { name: 'COSMOS_DATABASE', value: 'learninghub' }
            { name: 'COSMOS_CONTAINER', value: 'state' }
            { name: 'AZURE_STORAGE_ACCOUNT', value: storage.name }
            { name: 'SAMPLE_MEDIA_BASE', value: '${storage.properties.primaryEndpoints.blob}videos/samples' }
            { name: 'DEMO_ACCESS_CODE', secretRef: 'demo-access-code' }
            { name: 'LIVEAVATAR_SANDBOX', value: liveAvatarSandbox }
            { name: 'LIVEAVATAR_AVATAR_ID', value: liveAvatarAvatarId }
            { name: 'LIVEAVATAR_MAX_SECONDS', value: liveAvatarMaxSeconds }
            { name: 'AVATAR_PROVIDER', value: avatarProvider }
          ], empty(azureAvatarCharacter) ? [] : [ { name: 'AZURE_AVATAR_CHARACTER', value: azureAvatarCharacter } ],
          empty(azureAvatarStyle) ? [] : [ { name: 'AZURE_AVATAR_STYLE', value: azureAvatarStyle } ],
          empty(azureAvatarPhotoModel) ? [] : [ { name: 'AZURE_AVATAR_PHOTO_MODEL', value: azureAvatarPhotoModel } ], empty(azureAvatarVoiceEn) ? [] : [ { name: 'AZURE_AVATAR_VOICE_EN', value: azureAvatarVoiceEn } ],
          empty(azureAvatarVoiceEs) ? [] : [ { name: 'AZURE_AVATAR_VOICE_ES', value: azureAvatarVoiceEs } ], empty(liveAvatarApiKey) ? [] : [ { name: 'LIVEAVATAR_API_KEY', secretRef: 'liveavatar-api-key' } ])
        }
      ]
      scale: { minReplicas: minReplicas, maxReplicas: 1 }
    }
  }
  dependsOn: [ registryPull, cosmosAccess, foundryAccess, cosmosContainer, storageAccess, videos ]
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = registry.properties.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = registry.name
output SERVICE_WEB_NAME string = web.name
output SERVICE_WEB_URI string = 'https://${web.properties.configuration.ingress.fqdn}'
output COSMOS_ENDPOINT string = cosmos.properties.documentEndpoint
output AZURE_STORAGE_ACCOUNT string = storage.name
